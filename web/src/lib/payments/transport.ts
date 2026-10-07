// Server-only transports; no credentials are returned in API responses or logged.
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { ApiError, readBoundedText } from "../server/http";
import { orderSchema, entitlementSchema, type PaymentOrder, type PaymentEntitlement } from "./contracts";

export type Fetcher = typeof fetch;
type Env = Record<string, string | undefined>;
export interface PaymentUser { id: string; email: string; authorization: string }
export interface NewOrder extends Omit<PaymentOrder, "receipt_sha256" | "status" | "provider_token" | "p24_order_id" | "paid_at"> { caller_hash: string }

function supabaseConfig(env: Env) {
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !publicKey) throw new Error();
    return { url: url.origin, publicKey };
  } catch { throw new ApiError(503, "Logowanie i baza zamówień wymagają konfiguracji."); }
}
export function paymentDatabaseConfigured(env: Env = process.env): boolean {
  try { supabaseConfig(env); serviceSecret(env); return true; } catch { return false; }
}
export function serviceSecret(env: Env = process.env): string {
  const key = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)?.trim() || "";
  let legacyRole: unknown;
  try { legacyRole = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString()).role; } catch { /* opaque secret */ }
  if (!key || key === env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || key.length > 4096
    || (!/^sb_secret_[a-zA-Z0-9_-]{20,}$/.test(key) && legacyRole !== "service_role")) {
    throw new ApiError(503, "Serwerowa baza zamówień wymaga prywatnego klucza. Klucz publiczny nie wystarcza.");
  }
  return key;
}

async function jsonFetch(url: string, init: RequestInit, fetcher: Fetcher): Promise<{ response: Response; body: unknown }> {
  try {
    const response = await fetcher(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    const text = await readBoundedText(response, 400_000);
    return { response, body: text ? JSON.parse(text) as unknown : null };
  } catch { throw new ApiError(502, "Usługa płatności nie odpowiedziała poprawnie. Spróbuj później."); }
}

export async function requirePaymentUser(request: Request, env: Env = process.env, fetcher: Fetcher = fetch): Promise<PaymentUser> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer [a-zA-Z0-9_.-]{20,4096}$/.test(authorization)) throw new ApiError(401, "Zaloguj się na konto z potwierdzonym adresem e-mail, aby kupić usługę.");
  const config = supabaseConfig(env);
  let body: unknown;
  try {
    const result = await jsonFetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.publicKey, Authorization: authorization } }, fetcher);
    if (!result.response.ok) throw new Error();
    body = result.body;
  } catch { throw new ApiError(401, "Nie udało się potwierdzić sesji. Zaloguj się ponownie."); }
  const parsed = z.object({ id: z.uuid(), email: z.email().max(254), email_confirmed_at: z.iso.datetime({ offset: true }), is_anonymous: z.boolean().optional() }).safeParse(body);
  if (!parsed.success || parsed.data.is_anonymous === true) throw new ApiError(403, "Zakup wymaga konta z potwierdzonym e-mailem. Konto gościa nie służy do płatności.");
  return { id: parsed.data.id, email: parsed.data.email, authorization };
}

export function assertPaymentOrigin(request: Request, baseUrl: string): void {
  const source = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (!source || (site && site !== "same-origin" && site !== "none")) throw new ApiError(403, "Rozpocznij zakup bezpośrednio w aplikacji COPOWIESZ.");
  try {
    const origin = new URL(source);
    const target = new URL(request.url);
    const targetLocal = !process.env.VERCEL && process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
    const configured = new URL(baseUrl);
    const localAlias = targetLocal && ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname)
      && target.protocol === configured.protocol && target.port === configured.port;
    if (origin.username || origin.password || origin.origin !== baseUrl || (target.origin !== baseUrl && !localAlias)) throw new Error();
  } catch { throw new ApiError(403, "Rozpocznij zakup bezpośrednio w aplikacji COPOWIESZ."); }
}

export function paymentCallerHash(request: Request, secret: string): string {
  // Vercel supplies this header. Outside Vercel all callers share an additional local safety cap.
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim().slice(0, 128) || "unknown" : "local";
  return createHmac("sha256", secret).update(`copowiesz-checkout:${address}`).digest("hex");
}

export class PaymentStore {
  constructor(private readonly env: Env = process.env, private readonly fetcher: Fetcher = fetch) {}
  private async request(path: string, method: string, body?: unknown, user?: PaymentUser) {
    const config = supabaseConfig(this.env);
    const key = user ? config.publicKey : serviceSecret(this.env);
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    // Opaque secret keys authenticate at the gateway via apikey; user reads keep the user's JWT and RLS.
    if (user) headers.Authorization = user.authorization;
    else if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
    const result = await jsonFetch(`${config.url}/rest/v1/${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, this.fetcher);
    if (!result.response.ok) {
      const code = z.object({ code: z.string().optional(), message: z.string().optional() }).safeParse(result.body);
      if (code.success && code.data.message === "payment_rate_limit") throw new ApiError(429, "Osiągnięto limit prób zakupu. Spróbuj za godzinę.");
      if (code.success && ["payment_order_mismatch", "payment_idempotency_mismatch", "payment_state_conflict"].includes(code.data.message || "")) {
        throw new ApiError(409, "Zamówienie zmieniło stan lub warunki. Sprawdź jego status przed ponowną płatnością.");
      }
      throw new ApiError(503, "Nie można zapisać lub potwierdzić zamówienia. Spróbuj później.");
    }
    return result.body;
  }
  async create(order: NewOrder): Promise<PaymentOrder> {
    const result = z.array(orderSchema).length(1).safeParse(await this.request("rpc/copowiesz_create_payment_order", "POST", { p_order: order }));
    if (!result.success) throw new ApiError(503, "Baza zamówień zwróciła nieprawidłowe dane.");
    return result.data[0];
  }
  async register(id: string, token: string): Promise<void> {
    await this.request("rpc/copowiesz_register_payment_order", "POST", { p_order_id: id, p_provider_token: token });
  }
  async registrationFailed(id: string): Promise<void> {
    await this.request("rpc/copowiesz_fail_payment_registration", "POST", { p_order_id: id });
  }
  async ownOrder(id: string, user: PaymentUser): Promise<PaymentOrder | null> {
    const rows = z.array(orderSchema).safeParse(await this.request(`copowiesz_payment_orders?id=eq.${encodeURIComponent(id)}&select=*`, "GET", undefined, user));
    if (!rows.success) throw new ApiError(503, "Nie można odczytać zamówienia.");
    const order = rows.data[0] ?? null;
    if (order && order.owner_id !== user.id) throw new ApiError(404, "Nie znaleziono zamówienia.");
    return order;
  }
  async bySession(sessionId: string): Promise<PaymentOrder | null> {
    const rows = z.array(orderSchema).safeParse(await this.request(`copowiesz_payment_orders?session_id=eq.${encodeURIComponent(sessionId)}&select=*`, "GET"));
    if (!rows.success) throw new ApiError(503, "Nie można odczytać potwierdzenia płatności.");
    return rows.data[0] ?? null;
  }
  async ownEntitlement(orderId: string, user: PaymentUser): Promise<PaymentEntitlement | null> {
    const rows = z.array(entitlementSchema).safeParse(await this.request(`copowiesz_payment_entitlements?order_id=eq.${encodeURIComponent(orderId)}&select=*`, "GET", undefined, user));
    if (!rows.success) throw new ApiError(503, "Nie można odczytać zakupionego dostępu.");
    const entitlement = rows.data[0] ?? null;
    if (entitlement && entitlement.owner_id !== user.id) throw new ApiError(404, "Nie znaleziono dostępu.");
    return entitlement;
  }
  async complete(order: PaymentOrder, providerOrderId: number): Promise<{ already: boolean; orderId: string; entitlementId: string }> {
    const input = {
      p_order_id: order.id, p_session_id: order.session_id, p_p24_order_id: providerOrderId,
      p_amount_cents: order.amount_cents, p_currency: order.currency, p_environment: order.environment,
      p_merchant_id: order.merchant_id, p_pos_id: order.pos_id,
    };
    const parsed = z.object({ already: z.boolean(), orderId: z.uuid(), entitlementId: z.uuid() }).safeParse(await this.request("rpc/copowiesz_complete_p24_order", "POST", input));
    if (!parsed.success) throw new ApiError(503, "Nie udało się potwierdzić zakupionego dostępu.");
    return parsed.data;
  }
}

export function receiptHash(text: string): string { return createHash("sha256").update(text, "utf8").digest("hex"); }
