import { z } from "zod";

export const environmentSchema = z.enum(["sandbox", "production"]);
export type PaymentEnvironment = z.infer<typeof environmentSchema>;
const positiveInt = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const productSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
  title: z.string().min(5).max(100),
  description: z.string().min(30).max(2000),
  amountCents: positiveInt.max(100_000_000), currency: z.literal("PLN"),
  durationDays: positiveInt.max(366), maxPets: positiveInt.max(20),
  chatLimit: positiveInt.max(100_000), analysisLimit: z.number().int().min(0).max(10_000),
  version: z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/),
}).strict();
export type PaymentProduct = z.infer<typeof productSchema>;

export const checkoutSchema = z.object({
  productId: productSchema.shape.id,
  offerVersion: z.string().regex(/^[a-f0-9]{64}$/),
  termsVersion: z.string().min(1).max(64), privacyVersion: z.string().min(1).max(64),
  acceptTerms: z.literal(true), acknowledgePrivacy: z.literal(true),
  requestImmediateService: z.literal(true), confirmAdult: z.literal(true),
  idempotencyKey: z.uuid(),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const agreementsSchema = z.object({
  termsVersion: z.string().min(1).max(64), privacyVersion: z.string().min(1).max(64),
  termsText: z.string().min(300).max(32_000), privacyText: z.string().min(200).max(32_000),
  termsUrl: z.url(), privacyUrl: z.url(),
  withdrawalText: z.string().min(100).max(4000), withdrawalDays: z.literal(14),
  acceptedAt: z.iso.datetime(), acceptTerms: z.literal(true), acknowledgePrivacy: z.literal(true),
  requestImmediateService: z.literal(true), confirmAdult: z.literal(true),
}).strict();
export type OrderAgreements = z.infer<typeof agreementsSchema>;

export const orderSchema = z.object({
  id: z.uuid(), owner_id: z.uuid(), session_id: z.uuid(), idempotency_key: z.uuid(),
  environment: environmentSchema, merchant_id: positiveInt, pos_id: positiveInt,
  email: z.email().max(254), amount_cents: positiveInt, currency: z.literal("PLN"),
  offer_version: z.string().regex(/^[a-f0-9]{64}$/),
  product_snapshot: productSchema, agreements_snapshot: agreementsSchema,
  receipt_text: z.string().min(300).max(90_000), receipt_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["pending", "paid", "registration_failed", "cancelled", "refunded"]),
  provider_token: z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/).nullable(),
  p24_order_id: positiveInt.nullable(), created_at: z.iso.datetime({ offset: true }),
  paid_at: z.iso.datetime({ offset: true }).nullable(),
}).strip();
export type PaymentOrder = z.infer<typeof orderSchema>;
export const entitlementSchema = z.object({
  id: z.uuid(), order_id: z.uuid(), owner_id: z.uuid(), environment: environmentSchema,
  status: z.enum(["active", "revoked"]), starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }), max_pets: positiveInt,
  chat_limit: positiveInt, analysis_limit: z.number().int().nonnegative(),
  chat_used: z.number().int().nonnegative(), analysis_used: z.number().int().nonnegative(),
}).strip();
export type PaymentEntitlement = z.infer<typeof entitlementSchema>;

export const notificationSchema = z.object({
  merchantId: positiveInt, posId: positiveInt, sessionId: z.uuid(),
  amount: positiveInt.max(100_000_000), originAmount: positiveInt.max(100_000_000),
  currency: z.literal("PLN"), orderId: positiveInt,
  methodId: z.number().int().nonnegative().max(100_000),
  statement: z.string().max(1024), sign: z.string().regex(/^[a-fA-F0-9]{96}$/),
}).strict();
export type P24Notification = z.infer<typeof notificationSchema>;

export interface PublicPaymentConfig {
  enabled: boolean;
  environment: PaymentEnvironment;
  product: PaymentProduct | null;
  offerVersion: string | null;
  agreements: { termsVersion: string | null; privacyVersion: string | null; withdrawalDays: 14 };
  paidAccessEnforced: false;
  notice: string;
}
