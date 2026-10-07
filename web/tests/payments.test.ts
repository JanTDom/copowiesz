import test from "node:test";
import assert from "node:assert/strict";
import { LEGAL_VERSION } from "../src/content/legal";
import { getPaymentSettings, getP24Config } from "../src/lib/payments/config";
import { checkoutSchema, type PaymentOrder, type P24Notification } from "../src/lib/payments/contracts";
import { handleCheckout, handleOwnOrder, handleRecoverOrder, handleWebhook } from "../src/lib/payments/handlers";
import { notificationSign, registrationSign, validNotificationSign } from "../src/lib/payments/p24";
import { receiptHash, serviceSecret, type Fetcher } from "../src/lib/payments/transport";

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "33333333-3333-4333-8333-333333333333";
const sessionId = "22222222-2222-4222-8222-222222222222";
const entitlementId = "44444444-4444-4444-8444-444444444444";
const idempotencyKey = "55555555-5555-4555-8555-555555555555";
const base = "https://copowiesz.example";
const authorization = "Bearer synthetic.session.token-for-tests";

function configuredEnv() {
  return {
    PAYMENTS_ENABLED: "true", P24_ENVIRONMENT: "sandbox", PAYMENTS_PUBLIC_BASE_URL: base,
    PAYMENTS_PRODUCT_ID: "synthetic-test-package", PAYMENTS_PRODUCT_TITLE: "Syntetyczny pakiet testowy",
    PAYMENTS_PRODUCT_DESCRIPTION: "Syntetyczna oferta wyłącznie do testów: rozmowy i przegląd krótkich nagrań.",
    PAYMENTS_AMOUNT_CENTS: "1700", PAYMENTS_DURATION_DAYS: "7", PAYMENTS_MAX_PETS: "1",
    PAYMENTS_CHAT_LIMIT: "12", PAYMENTS_ANALYSIS_LIMIT: "2", PAYMENTS_PRODUCT_VERSION: "test-v1",
    P24_SANDBOX_MERCHANT_ID: "123", P24_SANDBOX_POS_ID: "123", P24_SANDBOX_CRC: "synthetic-crc", P24_SANDBOX_API_KEY: "synthetic-p24-api-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://synthetic-project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
    SUPABASE_SECRET_KEY: "sb_secret_synthetic012345678901234567890",
  };
}
function checkoutBody(env = configuredEnv()) {
  const config = getPaymentSettings(env).public;
  return { productId: config.product!.id, offerVersion: config.offerVersion!, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION,
    acceptTerms: true, acknowledgePrivacy: true, requestImmediateService: true, confirmAdult: true, idempotencyKey };
}
function purchaseRequest(body: unknown, origin = base, auth: string | null = authorization) {
  const headers: Record<string, string> = { "content-type": "application/json", origin, "sec-fetch-site": "same-origin" };
  if (auth) headers.authorization = auth;
  return new Request(`${base}/api/payments/checkout`, { method: "POST", headers, body: JSON.stringify(body) });
}
function callback(notification: P24Notification) {
  return new Request(`${base}/api/payments/webhook/sandbox`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(notification) });
}
function recoveryRequest(id: string, body: unknown = {}, origin: string | null = base, auth: string | null = authorization) {
  const headers: Record<string, string> = { "content-type": "application/json", "sec-fetch-site": "same-origin" };
  if (origin) headers.origin = origin;
  if (auth) headers.authorization = auth;
  return new Request(`${base}/api/payments/orders/${id}/recover`, { method: "POST", headers, body: JSON.stringify(body) });
}
function signedNotification(order: PaymentOrder, env = configuredEnv()): P24Notification {
  const values = { merchantId: 123, posId: 123, sessionId: order.session_id, amount: 1700, originAmount: 1700, currency: "PLN" as const, orderId: 456, methodId: 1, statement: "Zażółć / próba" };
  return { ...values, sign: notificationSign(values, env.P24_SANDBOX_CRC) };
}

function fixture(env = configuredEnv()) {
  const orders = new Map<string, PaymentOrder>();
  const requests: { url: string; method: string; body: Record<string, unknown> | null; headers: Headers }[] = [];
  const controls = { authOwner: ownerId, guest: false, unconfirmed: false, rateLimit: false, badVerify: false, badRegister: false,
    failTokenSave: false, lostTokenResponse: false, failRecovery: false };
  let completions = 0;
  const fetcher: Fetcher = async (input, init = {}) => {
    const url = new URL(String(input)); const method = init.method || "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;
    requests.push({ url: url.href, method, body, headers: new Headers(init.headers) });
    const json = (value: unknown, status = 200) => Promise.resolve(Response.json(value, { status }));
    if (url.pathname === "/auth/v1/user") {
      return json({ id: controls.authOwner, email: "synthetic-owner@example.com", is_anonymous: controls.guest,
        email_confirmed_at: controls.unconfirmed ? null : "2026-10-07T20:00:00.000Z" });
    }
    if (url.pathname.endsWith("/rpc/copowiesz_create_payment_order")) {
      if (controls.rateLimit) return json({ code: "P0001", message: "payment_rate_limit" }, 400);
      const proposed = body!.p_order as PaymentOrder;
      const old = [...orders.values()].find(order => order.owner_id === proposed.owner_id && order.idempotency_key === proposed.idempotency_key);
      if (old) return json([old]);
      const order = { ...proposed, receipt_sha256: receiptHash(proposed.receipt_text), status: "pending" as const, provider_token: null, p24_order_id: null, paid_at: null };
      orders.set(order.id, order); return json([order]);
    }
    if (url.pathname.endsWith("/api/v1/transaction/register")) {
      return controls.badRegister ? json({ data: { token: "../../evil" }, responseCode: 0 }) : json({ data: { token: "synthetic-p24-payment-token" }, responseCode: 0 });
    }
    if (url.pathname.endsWith("/rpc/copowiesz_register_payment_order")) {
      if (controls.failTokenSave) return json({ message: "synthetic_database_failure" }, 500);
      const order = orders.get(String(body!.p_order_id))!;
      order.provider_token = String(body!.p_provider_token);
      return controls.lostTokenResponse ? json({ message: "synthetic_response_lost_after_commit" }, 500) : json(null);
    }
    if (url.pathname.endsWith("/rpc/copowiesz_fail_payment_registration")) {
      if (controls.failRecovery) return json({ message: "synthetic_database_unavailable" }, 500);
      const order = orders.get(String(body!.p_order_id))!;
      if (order.status === "pending" && !order.provider_token) order.status = "registration_failed";
      return json(null);
    }
    if (url.pathname === "/rest/v1/copowiesz_payment_orders") {
      const order = [...orders.values()].find(item => `eq.${item.id}` === url.searchParams.get("id") || `eq.${item.session_id}` === url.searchParams.get("session_id"));
      return json(order ? [order] : []);
    }
    if (url.pathname.endsWith("/api/v1/transaction/verify")) {
      return controls.badVerify ? json({ data: { status: "failed" }, responseCode: 0 }) : json({ data: { status: "success" }, responseCode: 0 });
    }
    if (url.pathname.endsWith("/rpc/copowiesz_complete_p24_order")) {
      const order = orders.get(String(body!.p_order_id))!; const already = order.status === "paid";
      if (!already) { order.status = "paid"; order.p24_order_id = Number(body!.p_p24_order_id); order.paid_at = new Date().toISOString(); completions++; }
      return json({ already, orderId: order.id, entitlementId });
    }
    if (url.pathname === "/rest/v1/copowiesz_payment_entitlements") {
      const order = [...orders.values()].find(item => `eq.${item.id}` === url.searchParams.get("order_id"));
      return json(order?.status === "paid" ? [{ id: entitlementId, order_id: order.id, owner_id: order.owner_id, environment: order.environment, status: "active",
        starts_at: order.paid_at, ends_at: "2026-12-01T20:00:00.000Z", max_pets: 1, chat_limit: 12, analysis_limit: 2, chat_used: 0, analysis_used: 0 }] : []);
    }
    throw new Error(`Unexpected synthetic request: ${url.pathname}`);
  };
  const dependencies = { env, fetcher };
  async function buy() {
    const response = await handleCheckout(purchaseRequest(checkoutBody(env)), dependencies);
    assert.equal(response.status, 201);
    return [...orders.values()][0];
  }
  return { env, orders, requests, controls, dependencies, buy, completions: () => completions };
}

test("payments: default has no offer or checkout and no provider call", async () => {
  const config = getPaymentSettings({}).public;
  assert.equal(config.enabled, false); assert.equal(config.environment, "sandbox"); assert.equal(config.product, null); assert.equal(config.offerVersion, null);
  let called = false;
  const response = await handleCheckout(purchaseRequest({}), { env: {}, fetcher: async () => { called = true; throw new Error(); } });
  assert.equal(response.status, 503); assert.equal(called, false);
});

test("payments: production stays blocked even with all operator flags and keys", () => {
  const env = { ...configuredEnv(), P24_ENVIRONMENT: "production", PAYMENTS_MERCHANT_DOMAIN_APPROVED: "true", PAYMENTS_MODEL_SERVICE_APPROVED: "true",
    P24_PRODUCTION_MERCHANT_ID: "123", P24_PRODUCTION_POS_ID: "123", P24_PRODUCTION_CRC: "synthetic-prod-crc", P24_PRODUCTION_API_KEY: "synthetic-prod-key" };
  const settings = getPaymentSettings(env); const config = settings.public;
  assert.equal(config.enabled, false); assert.equal(config.paidAccessEnforced, false); assert.ok(settings.blockers.some(value => value.includes("egzekwowane")));
  assert.equal(config.notice, "Płatne pakiety nie są jeszcze dostępne. Możesz korzystać z bezpłatnego pilotażu.");
  assert.ok(!JSON.stringify(config).includes("synthetic-prod-crc")); assert.ok(!JSON.stringify(config).includes(env.SUPABASE_SECRET_KEY));
});

test("payments: missing duration/limits or zero chats cannot become an infinite offer", () => {
  for (const field of ["PAYMENTS_DURATION_DAYS", "PAYMENTS_MAX_PETS", "PAYMENTS_CHAT_LIMIT", "PAYMENTS_ANALYSIS_LIMIT"]) {
    const env = { ...configuredEnv(), [field]: "" }; assert.equal(getPaymentSettings(env).public.product, null);
  }
  assert.equal(getPaymentSettings({ ...configuredEnv(), PAYMENTS_CHAT_LIMIT: "0" }).public.product, null);
  assert.equal(getPaymentSettings({ ...configuredEnv(), PAYMENTS_ANALYSIS_LIMIT: "0" }).public.product!.analysisLimit, 0);
});

test("payments: offer checksum changes when the price or duration changes", () => {
  const first = getPaymentSettings(configuredEnv()).public;
  assert.notEqual(first.offerVersion, getPaymentSettings({ ...configuredEnv(), PAYMENTS_AMOUNT_CENTS: "1701" }).public.offerVersion);
  assert.notEqual(first.offerVersion, getPaymentSettings({ ...configuredEnv(), PAYMENTS_DURATION_DAYS: "8" }).public.offerVersion);
  assert.equal(first.agreements.termsVersion, LEGAL_VERSION);
});

test("payments: P24 golden checksums keep official field order and unescaped Unicode/slashes", () => {
  const config = getP24Config("sandbox", configuredEnv())!;
  assert.equal(registrationSign({ session_id: sessionId, amount_cents: 1700, currency: "PLN" }, config), "1f9eed56fba8462e5332dfad6f397b532f818a2746219bf361a100af472c2bb3552968edfc5e6a383017a1154ed7e7e2");
  const values = { merchantId: 123, posId: 123, sessionId, amount: 1700, originAmount: 1700, currency: "PLN" as const, orderId: 456, methodId: 1, statement: "Zażółć / próba" };
  const sign = notificationSign(values, config.crc);
  assert.equal(sign, "6da97b3027c6c35c7b1f6cbf334151d6a7f892614a2809ae56fcec7a1d2076af5a2f0f4cc67912b2815db5cce1774615");
  assert.equal(validNotificationSign({ ...values, sign }, config), true);
  assert.equal(validNotificationSign({ ...values, statement: "changed", sign }, config), false);
});

test("payments: private DB key cannot be a publishable or anonymous key", () => {
  assert.throws(() => serviceSecret({ ...configuredEnv(), SUPABASE_SECRET_KEY: "sb_publishable_public" }));
  assert.throws(() => serviceSecret({ ...configuredEnv(), SUPABASE_SECRET_KEY: "" }));
});

test("payments: strict input rejects client price/email and unchecked declarations", async () => {
  assert.equal(checkoutSchema.safeParse({ ...checkoutBody(), amountCents: 1 }).success, false);
  const f = fixture();
  for (const modified of [{ amountCents: 1 }, { email: "other@example.com" }, { acceptTerms: false }, { confirmAdult: false }]) {
    const response = await handleCheckout(purchaseRequest({ ...checkoutBody(), ...modified }), f.dependencies);
    assert.equal(response.status, 400);
  }
  assert.equal(f.requests.length, 0);
});

test("payments: checkout requires exact Origin and a server-verified confirmed non-guest account", async () => {
  const f = fixture();
  assert.equal((await handleCheckout(purchaseRequest(checkoutBody(), "https://foreign.example"), f.dependencies)).status, 403);
  assert.equal((await handleCheckout(purchaseRequest(checkoutBody(), base, null), f.dependencies)).status, 401);
  const missingOrigin = purchaseRequest(checkoutBody()); missingOrigin.headers.delete("origin");
  assert.equal((await handleCheckout(missingOrigin, f.dependencies)).status, 403);
  f.controls.guest = true;
  assert.equal((await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies)).status, 403);
  f.controls.guest = false; f.controls.unconfirmed = true;
  assert.equal((await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies)).status, 403);
  assert.equal(f.orders.size, 0);
});

test("payments: stale offer is rejected before payment/auth and a new order uses server cents", async () => {
  const f = fixture();
  assert.equal((await handleCheckout(purchaseRequest({ ...checkoutBody(), offerVersion: "a".repeat(64) }), f.dependencies)).status, 409);
  assert.equal(f.requests.length, 0);
  const order = await f.buy();
  const registered = f.requests.find(item => item.url.includes("/transaction/register"))!;
  assert.equal(registered.body!.amount, 1700); assert.equal(order.email, "synthetic-owner@example.com");
  assert.equal(registered.body!.urlReturn, `${base}/platnosci/wynik?orderId=${order.id}`);
  assert.equal(registered.body!.urlStatus, `${base}/api/payments/webhook/sandbox`);
  assert.equal(order.status, "pending"); assert.equal(f.completions(), 0);
});

test("payments: idempotent retry reuses payment and full immutable document", async () => {
  const f = fixture(); const order = await f.buy(); const original = order.receipt_text;
  const retry = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(retry.status, 200); assert.equal((await retry.json()).orderId, order.id);
  assert.equal(f.orders.size, 1); assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
  assert.equal(order.receipt_text, original); assert.match(original, /REGULAMIN — pełna utrwalona treść/); assert.match(original, /14 dni/);
  assert.ok(original.includes(LEGAL_VERSION)); assert.ok(!original.includes(f.env.P24_SANDBOX_API_KEY));
});

test("payments: an existing registration in progress does not register P24 twice", async () => {
  const f = fixture(); const order = await f.buy(); order.provider_token = null;
  const retry = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(retry.status, 202); assert.equal((await retry.json()).redirectUrl, null);
  assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
});

test("payments: database rate limit stops provider registration", async () => {
  const f = fixture(); f.controls.rateLimit = true;
  assert.equal((await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies)).status, 429);
  assert.equal(f.requests.some(item => item.url.includes("przelewy24.pl")), false);
});

test("payments: malformed provider redirect or failed token save cannot expose payment URL", async () => {
  const f = fixture(); f.controls.badRegister = true;
  const malformed = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(malformed.status, 202); assert.equal([...f.orders.values()][0].status, "registration_failed");
  const malformedBody = await malformed.json(); assert.equal(malformedBody.redirectUrl, null); assert.equal(malformedBody.retryWithNewOrder, true);
  const second = fixture(); second.controls.failTokenSave = true;
  const failedSave = await handleCheckout(purchaseRequest(checkoutBody()), second.dependencies);
  assert.equal(failedSave.status, 202); const failedBody = await failedSave.json();
  assert.equal(failedBody.status, "registration_failed"); assert.equal(failedBody.retryWithNewOrder, true);
  assert.equal(JSON.stringify(failedBody).includes("trnRequest"), false);
});

test("payments: durable failed registration offers a new order, never a second register for the old one", async () => {
  const f = fixture(); f.controls.failTokenSave = true;
  const failed = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  const failedBody = await failed.json(); assert.equal(failedBody.retryWithNewOrder, true);
  f.controls.failTokenSave = false;
  const sameAttempt = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal((await sameAttempt.json()).retryWithNewOrder, true);
  assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
  const newAttempt = await handleCheckout(purchaseRequest({ ...checkoutBody(), idempotencyKey: "66666666-6666-4666-8666-666666666666" }), f.dependencies);
  assert.equal(newAttempt.status, 201); assert.equal(f.orders.size, 2);
  assert.notEqual((await newAttempt.json()).orderId, failedBody.orderId);
});

test("payments: a lost response after committed token save recovers its tracked URL", async () => {
  const f = fixture(); f.controls.lostTokenResponse = true;
  const response = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.status, "pending"); assert.equal(body.retryWithNewOrder, false);
  assert.equal(body.redirectUrl, "https://sandbox.przelewy24.pl/trnRequest/synthetic-p24-payment-token");
  assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
});

test("payments: abandoned pending registration becomes a durable failure after two minutes on retry", async () => {
  const f = fixture(); const order = await f.buy(); order.provider_token = null;
  order.created_at = new Date(Date.now() - 121_000).toISOString();
  const response = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(response.status, 202); const body = await response.json();
  assert.equal(body.retryWithNewOrder, true); assert.equal(body.status, "registration_failed");
  assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
});

test("payments: unavailable recovery cannot offer a new payment or untracked URL", async () => {
  const f = fixture(); f.controls.failTokenSave = true; f.controls.failRecovery = true;
  const response = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal(response.status, 503); const body = await response.json();
  assert.ok(body.orderId); assert.equal(body.retryWithNewOrder, false); assert.equal(body.redirectUrl, null);
});

test("payments: late verified callback can still settle a failed registration; cancelled order never redirects", async () => {
  const f = fixture(); f.controls.failTokenSave = true;
  await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies); const order = [...f.orders.values()][0];
  assert.equal(order.status, "registration_failed");
  assert.equal((await handleWebhook(callback(signedNotification(order)), "sandbox", f.dependencies)).status, 200);
  assert.equal(f.completions(), 1);
  order.status = "cancelled"; order.provider_token = "synthetic-p24-payment-token";
  const response = await handleCheckout(purchaseRequest(checkoutBody()), f.dependencies);
  assert.equal((await response.json()).redirectUrl, null);
});

test("payments: owner recovery resolves old pending without any current offer or P24 keys", async () => {
  const f = fixture(); const order = await f.buy(); order.provider_token = null;
  order.created_at = new Date(Date.now() - 121_000).toISOString();
  for (const key of Object.keys(f.env)) if (key.startsWith("P24_") || key.startsWith("PAYMENTS_")) Reflect.deleteProperty(f.env, key);
  const before = f.requests.length;
  const response = await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies);
  assert.equal(response.status, 202); const body = await response.json();
  assert.equal(body.orderId, order.id); assert.equal(body.status, "registration_failed");
  assert.equal(body.retryWithNewOrder, true); assert.equal(body.redirectUrl, null);
  assert.equal(f.orders.size, 1); assert.equal(f.requests.slice(before).some(item => item.url.includes("przelewy24.pl")), false);
  assert.equal(f.requests.slice(before).some(item => item.url.includes("/copowiesz_create_payment_order")), false);
});

test("payments: owner recovery restores saved token without private DB or P24 keys", async () => {
  const f = fixture(); const order = await f.buy(); const before = f.requests.length;
  for (const key of Object.keys(f.env)) if (key.startsWith("P24_") || key.startsWith("PAYMENTS_") || key === "SUPABASE_SECRET_KEY") Reflect.deleteProperty(f.env, key);
  const response = await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies);
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.redirectUrl, "https://sandbox.przelewy24.pl/trnRequest/synthetic-p24-payment-token");
  assert.equal(body.retryWithNewOrder, false); assert.equal(body.status, "pending");
  assert.equal(f.requests.slice(before).every(item => item.method === "GET" && !item.url.includes("przelewy24.pl")), true);
});

test("payments: recovery leaves recent pending intact and GET exposes only action availability", async () => {
  const f = fixture(); const order = await f.buy(); order.provider_token = null;
  const before = f.requests.length;
  const response = await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies);
  assert.equal(response.status, 202); const body = await response.json();
  assert.equal(body.retryWithNewOrder, false); assert.equal(body.redirectUrl, null); assert.equal(order.status, "pending");
  assert.equal(f.requests.slice(before).every(item => item.method === "GET"), true);
  const get = () => handleOwnOrder(new Request(`${base}/api/payments/orders/${order.id}`, { headers: { authorization } }), order.id, false, f.dependencies);
  const recent = await (await get()).json(); assert.equal(recent.canRecoverRegistration, false); assert.equal("redirectUrl" in recent, false);
  order.created_at = new Date(Date.now() - 121_000).toISOString();
  assert.equal((await (await get()).json()).canRecoverRegistration, true);
  order.created_at = new Date().toISOString(); order.provider_token = "synthetic-p24-payment-token";
  assert.equal((await (await get()).json()).canRecoverRegistration, true);
});

test("payments: recovery requires same Origin, empty strict input, valid ID and confirmed owner", async () => {
  const f = fixture(); const order = await f.buy(); const before = f.requests.length;
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id, {}, "https://foreign.example"), order.id, f.dependencies)).status, 403);
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id, {}, null), order.id, f.dependencies)).status, 403);
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id, { amountCents: 1 }), order.id, f.dependencies)).status, 400);
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id), "not-an-id", f.dependencies)).status, 400);
  assert.equal(f.requests.length, before);
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id, {}, base, null), order.id, f.dependencies)).status, 401);
  f.controls.authOwner = otherId;
  assert.equal((await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies)).status, 404);
  assert.equal(f.requests.slice(before).every(item => item.method === "GET"), true);
});

test("payments: ambiguous recovery preserves order ID and never offers another payment", async () => {
  const f = fixture(); const order = await f.buy(); order.provider_token = null;
  order.created_at = new Date(Date.now() - 121_000).toISOString(); f.controls.failRecovery = true;
  const response = await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies);
  assert.equal(response.status, 503); const body = await response.json();
  assert.equal(body.orderId, order.id); assert.equal(body.retryWithNewOrder, false); assert.equal(body.redirectUrl, null);
  assert.equal(order.status, "pending"); assert.equal(f.requests.filter(item => item.url.includes("/transaction/register")).length, 1);
});

test("payments: recovery reads terminal status without mutation or redirect", async () => {
  const f = fixture(); const order = await f.buy(); order.status = "refunded";
  const before = f.requests.length;
  const response = await handleRecoverOrder(recoveryRequest(order.id), order.id, f.dependencies);
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.status, "refunded"); assert.equal(body.redirectUrl, null); assert.equal(body.retryWithNewOrder, false);
  assert.equal(f.requests.slice(before).every(item => item.method === "GET"), true);
});

test("payments: invalid signature cannot look up a session or grant access", async () => {
  const f = fixture(); const order = await f.buy(); const before = f.requests.length;
  const invalid = { ...signedNotification(order), sign: "a".repeat(96) };
  assert.equal((await handleWebhook(callback(invalid), "sandbox", f.dependencies)).status, 400);
  assert.equal(f.requests.length, before); assert.equal(f.completions(), 0);
});

test("payments: signed wrong amount, origin amount, merchant or environment still fail", async () => {
  const f = fixture(); const order = await f.buy();
  for (const fields of [{ amount: 1 }, { originAmount: 1 }, { merchantId: 124 }, { posId: 124 }]) {
    const values = { ...signedNotification(order), ...fields };
    values.sign = notificationSign(values, f.env.P24_SANDBOX_CRC);
    assert.equal((await handleWebhook(callback(values), "sandbox", f.dependencies)).status, 400);
  }
  order.environment = "production";
  assert.equal((await handleWebhook(callback(signedNotification(order)), "sandbox", f.dependencies)).status, 400);
  assert.equal(f.requests.some(item => item.url.includes("/transaction/verify")), false); assert.equal(f.completions(), 0);
});

test("payments: failed independent verify cannot mark an order paid", async () => {
  const f = fixture(); const order = await f.buy(); f.controls.badVerify = true;
  assert.equal((await handleWebhook(callback(signedNotification(order)), "sandbox", f.dependencies)).status, 502);
  assert.equal(order.status, "pending"); assert.equal(f.completions(), 0);
  assert.equal(f.requests.some(item => item.url.includes("/rpc/copowiesz_complete_p24_order")), false);
});

test("payments: signed callback then verify grants once; replay and changed provider order are handled", async () => {
  const f = fixture(); const order = await f.buy(); const notification = signedNotification(order);
  assert.equal((await handleWebhook(callback(notification), "sandbox", f.dependencies)).status, 200);
  assert.equal(order.status, "paid"); assert.equal(f.completions(), 1);
  const verifyAt = f.requests.findIndex(item => item.url.includes("/transaction/verify"));
  const completeAt = f.requests.findIndex(item => item.url.includes("/rpc/copowiesz_complete_p24_order"));
  assert.ok(verifyAt >= 0 && completeAt > verifyAt);
  const replay = await handleWebhook(callback(notification), "sandbox", f.dependencies);
  assert.equal(replay.status, 200); assert.equal((await replay.json()).already, true); assert.equal(f.completions(), 1);
  assert.equal(f.requests.filter(item => item.url.includes("/transaction/verify")).length, 1);
  const changed = { ...notification, orderId: 457 }; changed.sign = notificationSign(changed, f.env.P24_SANDBOX_CRC);
  assert.equal((await handleWebhook(callback(changed), "sandbox", f.dependencies)).status, 400);
});

test("payments: disabling new checkouts does not lose an existing signed confirmation", async () => {
  const f = fixture(); const order = await f.buy(); f.env.PAYMENTS_ENABLED = "false";
  assert.equal((await handleWebhook(callback(signedNotification(order)), "sandbox", f.dependencies)).status, 200);
  assert.equal(f.completions(), 1);
});

test("payments: a return URL/status query cannot grant access, and owner reads use the user's JWT", async () => {
  const f = fixture(); const order = await f.buy();
  const response = await handleOwnOrder(new Request(`${base}/api/payments/orders/${order.id}?status=paid`, { headers: { authorization } }), order.id, false, f.dependencies);
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.status, "pending"); assert.equal(result.entitlement, null); assert.equal(result.paidAccessEnforced, false); assert.equal(f.completions(), 0);
  const read = f.requests.find(item => item.url.includes("/rest/v1/copowiesz_payment_orders?id="))!;
  assert.equal(read.headers.get("authorization"), authorization);
  assert.equal(read.headers.get("apikey"), f.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
});

test("payments: receipt needs ownership and preserves accepted legal text/price after configuration changes", async () => {
  const f = fixture(); const order = await f.buy();
  const request = new Request(`${base}/api/payments/orders/${order.id}/receipt`, { headers: { authorization } });
  f.controls.authOwner = otherId;
  assert.equal((await handleOwnOrder(request, order.id, true, f.dependencies)).status, 404);
  f.controls.authOwner = ownerId; f.env.PAYMENTS_AMOUNT_CENTS = "9999";
  const receipt = await handleOwnOrder(request, order.id, true, f.dependencies);
  assert.equal(receipt.status, 200); assert.equal(receipt.headers.get("cache-control"), "private, no-store");
  assert.match(receipt.headers.get("content-disposition")!, /attachment/);
  const text = await receipt.text(); assert.equal(text, order.receipt_text); assert.match(text, /17\.00 PLN/); assert.match(text, /POLITYKA PRYWATNOŚCI — pełna/);
  assert.equal(receipt.headers.get("x-receipt-sha256"), receiptHash(text));
  order.receipt_text += "changed";
  assert.equal((await handleOwnOrder(request, order.id, true, f.dependencies)).status, 503);
});

test("payments: oversized and extra-field webhook is rejected before database access", async () => {
  const f = fixture(); const order = await f.buy(); const before = f.requests.length;
  const oversized = new Request(`${base}/api/payments/webhook/sandbox`, { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(9000) });
  assert.equal((await handleWebhook(oversized, "sandbox", f.dependencies)).status, 413);
  const extra = { ...signedNotification(order), ownerId: otherId };
  assert.equal((await handleWebhook(callback(extra), "sandbox", f.dependencies)).status, 400);
  assert.equal(f.requests.length, before);
});
