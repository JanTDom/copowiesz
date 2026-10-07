import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, readBoundedText } from "../server/http";
import { p24BaseUrl, type P24Config } from "./config";
import type { PaymentEnvironment, PaymentOrder, P24Notification } from "./contracts";
import type { Fetcher } from "./transport";

function sign(fields: Record<string, string | number>): string { return createHash("sha384").update(JSON.stringify(fields), "utf8").digest("hex"); }
export function paymentRedirectUrl(environment: PaymentEnvironment, token: string): string {
  if (!/^[a-zA-Z0-9_-]{10,200}$/.test(token)) throw new ApiError(503, "Nie można odczytać zapisu płatności.");
  return `${p24BaseUrl(environment)}/trnRequest/${token}`;
}
// Field order and Unicode/slash encoding follow P24 REST API 1.0.18.
export function registrationSign(order: Pick<PaymentOrder, "session_id" | "amount_cents" | "currency">, config: P24Config): string {
  return sign({ sessionId: order.session_id, merchantId: config.merchantId, amount: order.amount_cents, currency: order.currency, crc: config.crc });
}
export function verificationSign(order: Pick<PaymentOrder, "session_id" | "amount_cents" | "currency">, orderId: number, crc: string): string {
  return sign({ sessionId: order.session_id, orderId, amount: order.amount_cents, currency: order.currency, crc });
}
export function notificationSign(notification: Omit<P24Notification, "sign">, crc: string): string {
  return sign({ merchantId: notification.merchantId, posId: notification.posId, sessionId: notification.sessionId,
    amount: notification.amount, originAmount: notification.originAmount, currency: notification.currency,
    orderId: notification.orderId, methodId: notification.methodId, statement: notification.statement, crc });
}
export function validNotificationSign(notification: P24Notification, config: P24Config): boolean {
  const expected = Buffer.from(notificationSign(notification, config.crc), "hex");
  const actual = Buffer.from(notification.sign, "hex");
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}
export function assertNotificationOrder(notification: P24Notification, order: PaymentOrder, config: P24Config): void {
  if (notification.merchantId !== config.merchantId || notification.posId !== config.posId
    || notification.merchantId !== order.merchant_id || notification.posId !== order.pos_id
    || notification.sessionId !== order.session_id || notification.amount !== order.amount_cents
    || notification.originAmount !== order.amount_cents || notification.currency !== order.currency
    || order.environment !== config.environment || (order.p24_order_id !== null && order.p24_order_id !== notification.orderId)) {
    throw new ApiError(400, "Potwierdzenie płatności nie odpowiada zamówieniu.");
  }
}

export class P24Client {
  constructor(private readonly config: P24Config, private readonly fetcher: Fetcher = fetch) {}
  private async request(method: string, path: string, body: unknown): Promise<unknown> {
    try {
      const response = await this.fetcher(`${this.config.base}${path}`, { method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(9000),
        headers: { Authorization: `Basic ${Buffer.from(`${this.config.posId}:${this.config.apiKey}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result: unknown = JSON.parse(await readBoundedText(response, 20_000));
      if (!response.ok) throw new Error();
      return result;
    } catch { throw new ApiError(502, "Operator płatności nie potwierdził czynności. Sprawdź status zamówienia przed ponowną płatnością."); }
  }
  async register(order: PaymentOrder, baseUrl: string): Promise<string> {
    const result = await this.request("POST", "/api/v1/transaction/register", {
      merchantId: this.config.merchantId, posId: this.config.posId, sessionId: order.session_id,
      amount: order.amount_cents, currency: order.currency, description: order.product_snapshot.title,
      email: order.email, country: "PL", language: "pl", encoding: "UTF-8", waitForResult: true,
      urlReturn: `${baseUrl}/platnosci/wynik?orderId=${order.id}`,
      urlStatus: `${baseUrl}/api/payments/webhook/${order.environment}`,
      sign: registrationSign(order, this.config),
    });
    const parsed = z.object({ data: z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/) }), responseCode: z.literal(0) }).safeParse(result);
    if (!parsed.success) throw new ApiError(502, "Operator płatności zwrócił nieprawidłowe potwierdzenie.");
    return parsed.data.data.token;
  }
  async verify(order: PaymentOrder, orderId: number): Promise<void> {
    const result = await this.request("PUT", "/api/v1/transaction/verify", {
      merchantId: this.config.merchantId, posId: this.config.posId, sessionId: order.session_id,
      amount: order.amount_cents, currency: order.currency, orderId,
      sign: verificationSign(order, orderId, this.config.crc),
    });
    const parsed = z.object({ data: z.object({ status: z.literal("success") }), responseCode: z.literal(0) }).safeParse(result);
    if (!parsed.success) throw new ApiError(502, "Płatność oczekuje na potwierdzenie operatora. Dostęp nie został nadany.");
  }
  paymentUrl(token: string): string { return paymentRedirectUrl(this.config.environment, token); }
}
