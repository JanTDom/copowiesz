import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, assertSameOrigin, errorResult, jsonResult, matchesRequestOrigin, readBoundedText, readJson } from "../server/http";
import { getP24Config, getPaymentSettings, requireCheckoutSettings, withdrawalText } from "./config";
import { agreementsSchema, checkoutSchema, environmentSchema, notificationSchema, type PaymentOrder } from "./contracts";
import { P24Client, assertNotificationOrder, paymentRedirectUrl, validNotificationSign } from "./p24";
import { buildOrderDocument } from "./receipt";
import { PaymentStore, assertPaymentOrigin, paymentCallerHash, receiptHash, requirePaymentUser, serviceSecret, type Fetcher, type NewOrder } from "./transport";

type Env = Record<string, string | undefined>;
export interface PaymentDependencies { env?: Env; fetcher?: Fetcher; now?: () => Date }
const idSchema = z.uuid();
function safeId(id: string): string {
  const result = idSchema.safeParse(id);
  if (!result.success) throw new ApiError(400, "Nieprawidłowy numer zamówienia.");
  return result.data;
}
function checkoutResponse(order: PaymentOrder, redirectUrl: string | null) {
  return { orderId: order.id, redirectUrl, status: order.status, receiptUrl: `/api/payments/orders/${order.id}/receipt`,
    environment: order.environment, paidAccessEnforced: false, retryWithNewOrder: order.status === "registration_failed",
    notice: order.status === "registration_failed"
      ? "Nie udało się przygotować płatności. Możesz rozpocząć nowe zamówienie; ta próba nie otworzyła bramki płatniczej."
      : order.status === "pending" && !redirectUrl ? "Sprawdzamy przygotowanie płatności. Odczekaj chwilę i sprawdź ponownie." : null };
}

function staleRegistration(order: PaymentOrder, now: Date): boolean {
  return order.status === "pending" && order.provider_token === null && now.getTime() - Date.parse(order.created_at) >= 120_000;
}
function registrationUnavailable(orderId: string): Response {
  return jsonResult({ error: "Nie udało się sprawdzić zapisu zamówienia. Sprawdź jego status przed rozpoczęciem następnej płatności.",
    orderId, retryWithNewOrder: false, redirectUrl: null }, 503);
}
async function recoverRegistration(store: PaymentStore, order: PaymentOrder): Promise<Response> {
  try {
    await store.registrationFailed(order.id);
    // A failed HTTP response may follow a committed token write. Read before offering a new attempt.
    const current = await store.bySession(order.session_id);
    if (!current || current.id !== order.id || current.owner_id !== order.owner_id) throw new Error();
    if (current.status === "paid") return jsonResult(checkoutResponse(current, null));
    if (current.status === "pending" && current.provider_token) return jsonResult(checkoutResponse(current, paymentRedirectUrl(current.environment, current.provider_token)));
    return jsonResult(checkoutResponse(current, null), 202);
  } catch {
    return registrationUnavailable(order.id);
  }
}

export async function handleCheckout(request: Request, dependencies: PaymentDependencies = {}): Promise<Response> {
  try {
    const env = dependencies.env ?? process.env; const fetcher = dependencies.fetcher ?? fetch;
    const settings = getPaymentSettings(env);
    requireCheckoutSettings(settings);
    assertPaymentOrigin(request, settings.baseUrl);
    const input = await readJson(request, checkoutSchema, 8192);
    const config = getP24Config(settings.public.environment, env)!;
    if (input.productId !== settings.public.product.id || input.offerVersion !== settings.public.offerVersion
      || input.termsVersion !== settings.public.agreements.termsVersion || input.privacyVersion !== settings.public.agreements.privacyVersion) {
      throw new ApiError(409, "Oferta lub dokumenty zmieniły się. Odczytaj aktualne podsumowanie i potwierdź je ponownie.");
    }
    const user = await requirePaymentUser(request, env, fetcher);
    const now = (dependencies.now ?? (() => new Date()))().toISOString();
    const agreements = agreementsSchema.parse({
      ...settings.public.agreements, termsText: settings.termsText, privacyText: settings.privacyText,
      termsUrl: settings.termsUrl, privacyUrl: settings.privacyUrl, withdrawalText, acceptedAt: now,
      acceptTerms: input.acceptTerms, acknowledgePrivacy: input.acknowledgePrivacy,
      requestImmediateService: input.requestImmediateService, confirmAdult: input.confirmAdult,
    });
    const id = randomUUID();
    const documentInput = {
      id, session_id: id, idempotency_key: input.idempotencyKey, owner_id: user.id, email: user.email,
      environment: config.environment, merchant_id: config.merchantId, pos_id: config.posId,
      amount_cents: settings.public.product.amountCents, currency: "PLN" as const,
      offer_version: settings.public.offerVersion, product_snapshot: settings.public.product,
      agreements_snapshot: agreements, created_at: now,
    };
    const proposed: NewOrder = { ...documentInput, receipt_text: buildOrderDocument(documentInput), caller_hash: paymentCallerHash(request, serviceSecret(env)) };
    const store = new PaymentStore(env, fetcher);
    const order = await store.create(proposed);
    const p24 = new P24Client(config, fetcher);
    if (order.status === "paid") return jsonResult(checkoutResponse(order, null));
    if (order.status === "pending" && order.provider_token) return jsonResult(checkoutResponse(order, p24.paymentUrl(order.provider_token)));
    // One creator registers a session. A concurrent/retried request never registers it twice.
    if (order.id !== proposed.id || order.status !== "pending") {
      // A crashed creator must not leave an unlimited pending state. Provider/network operations are bounded well below two minutes.
      if (staleRegistration(order, new Date(now))) return recoverRegistration(store, order);
      return jsonResult(checkoutResponse(order, null), 202);
    }
    let token: string;
    try { token = await p24.register(order, settings.baseUrl); }
    catch { return recoverRegistration(store, order); }
    // If saving the token fails, never send an untracked payment URL to the customer.
    try { await store.register(order.id, token); }
    catch { return recoverRegistration(store, order); }
    return jsonResult(checkoutResponse(order, p24.paymentUrl(token)), 201);
  } catch (error) { return errorResult(error); }
}

export async function handleWebhook(request: Request, environment: string, dependencies: PaymentDependencies = {}): Promise<Response> {
  try {
    const parsedEnvironment = environmentSchema.safeParse(environment);
    if (!parsedEnvironment.success) throw new ApiError(400, "Nieprawidłowe środowisko płatności.");
    const env = dependencies.env ?? process.env; const fetcher = dependencies.fetcher ?? fetch;
    const config = getP24Config(parsedEnvironment.data, env);
    // Disabling new checkouts must not discard confirmations of already registered orders.
    if (!config) throw new ApiError(503, "Potwierdzenia płatności wymagają konfiguracji operatora.");
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Powiadomienie wymaga JSON.");
    let body: unknown;
    try { body = JSON.parse(await readBoundedText(request, 8192)); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, "Nieprawidłowe powiadomienie."); }
    const parsed = notificationSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Nieprawidłowe powiadomienie.");
    if (!validNotificationSign(parsed.data, config)) throw new ApiError(400, "Podpis powiadomienia jest nieprawidłowy.");
    const store = new PaymentStore(env, fetcher);
    const order = await store.bySession(parsed.data.sessionId);
    if (!order) throw new ApiError(404, "Nie znaleziono zamówienia.");
    assertNotificationOrder(parsed.data, order, config);
    if (!["pending", "registration_failed", "paid"].includes(order.status)) throw new ApiError(409, "Zamówienie nie może otrzymać dostępu w tym stanie.");
    if (order.status !== "paid") await new P24Client(config, fetcher).verify(order, parsed.data.orderId);
    const completed = await store.complete(order, parsed.data.orderId);
    return jsonResult({ ok: true, already: completed.already });
  } catch (error) { return errorResult(error); }
}

export async function handleOwnOrder(request: Request, id: string, document = false, dependencies: PaymentDependencies = {}): Promise<Response> {
  try {
    safeId(id);
    const env = dependencies.env ?? process.env; const fetcher = dependencies.fetcher ?? fetch;
    const user = await requirePaymentUser(request, env, fetcher);
    const store = new PaymentStore(env, fetcher);
    const order = await store.ownOrder(id, user);
    if (!order) throw new ApiError(404, "Nie znaleziono zamówienia.");
    // Refuse damaged/rewritten snapshots instead of publishing a false durable document.
    if (receiptHash(order.receipt_text) !== order.receipt_sha256) throw new ApiError(503, "Dokument zamówienia wymaga sprawdzenia.");
    if (document) return new Response(order.receipt_text, { headers: {
      "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="copowiesz-zamowienie-${order.id}.txt"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Receipt-SHA256": order.receipt_sha256,
    } });
    const entitlement = await store.ownEntitlement(order.id, user);
    return jsonResult({
      orderId: order.id, status: order.status, environment: order.environment,
      amountCents: order.amount_cents, currency: order.currency, createdAt: order.created_at, paidAt: order.paid_at,
      product: order.product_snapshot, receiptUrl: `/api/payments/orders/${order.id}/receipt`, receiptSha256: order.receipt_sha256,
      entitlement, paidAccessEnforced: false, retryWithNewOrder: order.status === "registration_failed",
      canRecoverRegistration: order.status === "pending" && (order.provider_token !== null || staleRegistration(order, (dependencies.now ?? (() => new Date()))())),
      notice: order.status === "registration_failed" ? checkoutResponse(order, null).notice
        : order.environment === "sandbox" ? "Zamówienie testowe. Nie pobrano prawdziwej opłaty i nie uruchomiono płatnego dostępu." : "Potwierdzenie dotyczy zamówienia. Bieżący pilotaż nie egzekwuje płatnych limitów.",
    });
  } catch (error) { return errorResult(error); }
}

/** Reconcile an existing owner-authorized registration without current offer/P24 credentials or another provider registration. */
export async function handleRecoverOrder(request: Request, id: string, dependencies: PaymentDependencies = {}): Promise<Response> {
  let verifiedUser = false;
  try {
    safeId(id);
    const origin = request.headers.get("origin");
    if (!origin || !matchesRequestOrigin(request, origin) || new URL(origin).origin !== origin) {
      throw new ApiError(403, "Sprawdź zamówienie bezpośrednio w aplikacji COPOWIESZ.");
    }
    assertSameOrigin(request);
    await readJson(request, z.object({}).strict(), 1024);
    const env = dependencies.env ?? process.env; const fetcher = dependencies.fetcher ?? fetch;
    const user = await requirePaymentUser(request, env, fetcher);
    verifiedUser = true;
    const store = new PaymentStore(env, fetcher);
    const order = await store.ownOrder(id, user);
    if (!order) throw new ApiError(404, "Nie znaleziono zamówienia.");
    if (receiptHash(order.receipt_text) !== order.receipt_sha256) throw new ApiError(503, "Dokument zamówienia wymaga sprawdzenia.");
    if (order.status === "pending" && order.provider_token) {
      return jsonResult(checkoutResponse(order, paymentRedirectUrl(order.environment, order.provider_token)));
    }
    if (staleRegistration(order, (dependencies.now ?? (() => new Date()))())) return recoverRegistration(store, order);
    return jsonResult(checkoutResponse(order, null), order.status === "pending" ? 202 : 200);
  } catch (error) {
    if (verifiedUser && (!(error instanceof ApiError) || error.status >= 500)) return registrationUnavailable(id);
    return errorResult(error);
  }
}
