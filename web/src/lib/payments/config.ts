// Server configuration. Never import this module into a client component.
import { createHash } from "node:crypto";
import { ApiError } from "../server/http";
import { environmentSchema, productSchema, type PaymentEnvironment, type PaymentProduct, type PublicPaymentConfig } from "./contracts";
import { LEGAL_VERSION, legalPlainText, operator, privacySections, termsSections } from "@/content/legal";
import { paymentDatabaseConfigured } from "./transport";

type Env = Record<string, string | undefined>;
export interface P24Config { environment: PaymentEnvironment; base: string; merchantId: number; posId: number; crc: string; apiKey: string }
export interface PaymentSettings {
  public: PublicPaymentConfig;
  baseUrl: string | null;
  termsText: string; privacyText: string; termsUrl: string; privacyUrl: string;
  blockers: string[];
}
export const seller = operator;
export const withdrawalText = `Możesz odstąpić od umowy w ciągu 14 dni od jej zawarcia, bez podawania przyczyny. Rozpoczęcie rozmowy ani analizy nie oznacza utraty tego prawa. Oświadczenie wyślij na ${seller.email} lub adres ${seller.address}, wskazując swoje imię i nazwisko, e-mail oraz numer zamówienia. Możesz użyć formularza: „Oświadczam, że odstępuję od umowy o usługę COPOWIESZ, zamówienie [numer], zawartej [data]. Imię i nazwisko: […], e-mail: […], data: […].” Podpis jest potrzebny tylko przy formularzu papierowym. Płatność zwracamy nie później niż w ciągu 14 dni od otrzymania oświadczenia, tą samą metodą, chyba że uzgodnisz inny bezpłatny sposób. W planowanej ofercie zachowujemy pełny zwrot w tym terminie. Reklamacje można składać na ten sam adres e-mail; odpowiedź przekazujemy na trwałym nośniku w ciągu 14 dni. Wersja testowa sandbox nie pobiera rzeczywistych opłat.`;

const integer = (value: string | undefined) => value && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : NaN;
function baseUrl(value: string | undefined, environment: PaymentEnvironment): string | null {
  try {
    const url = new URL(value || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(environment === "sandbox" && local && url.protocol === "http:")) return null;
    if (environment === "production" && local) return null;
    return url.origin;
  } catch { return null; }
}

export function p24BaseUrl(environment: PaymentEnvironment): string {
  return environment === "production" ? "https://secure.przelewy24.pl" : "https://sandbox.przelewy24.pl";
}
export function getP24Config(environment: PaymentEnvironment, env: Env = process.env): P24Config | null {
  const prefix = environment === "production" ? "P24_PRODUCTION_" : "P24_SANDBOX_";
  const merchantId = integer(env[`${prefix}MERCHANT_ID`]); const posId = integer(env[`${prefix}POS_ID`]);
  const crc = env[`${prefix}CRC`]?.trim(); const apiKey = env[`${prefix}API_KEY`]?.trim();
  if (!Number.isSafeInteger(merchantId) || merchantId < 1 || merchantId > 2_147_483_647 || !Number.isSafeInteger(posId) || posId < 1 || posId > 2_147_483_647
    || !crc || crc.length > 256 || !apiKey || apiKey.length > 512) return null;
  return { environment, merchantId, posId, crc, apiKey, base: p24BaseUrl(environment) };
}

export function getPaymentSettings(env: Env = process.env): PaymentSettings {
  const parsedEnvironment = environmentSchema.safeParse(env.P24_ENVIRONMENT ?? "sandbox");
  const environment = parsedEnvironment.success ? parsedEnvironment.data : "sandbox";
  const parsedProduct = productSchema.safeParse({
    id: env.PAYMENTS_PRODUCT_ID?.trim(), title: env.PAYMENTS_PRODUCT_TITLE?.trim(), description: env.PAYMENTS_PRODUCT_DESCRIPTION?.trim(),
    amountCents: integer(env.PAYMENTS_AMOUNT_CENTS), currency: "PLN", durationDays: integer(env.PAYMENTS_DURATION_DAYS),
    maxPets: integer(env.PAYMENTS_MAX_PETS), chatLimit: integer(env.PAYMENTS_CHAT_LIMIT), analysisLimit: integer(env.PAYMENTS_ANALYSIS_LIMIT),
    version: env.PAYMENTS_PRODUCT_VERSION?.trim(),
  });
  const product: PaymentProduct | null = parsedProduct.success ? parsedProduct.data : null;
  const base = baseUrl(env.PAYMENTS_PUBLIC_BASE_URL, environment);
  // The receipt and the public legal pages share one source. Env cannot silently replace accepted documents.
  const termsVersion = LEGAL_VERSION; const privacyVersion = LEGAL_VERSION;
  const termsText = legalPlainText("Regulamin COPOWIESZ", termsSections);
  const privacyText = legalPlainText("Polityka prywatności COPOWIESZ", privacySections);
  const blockers: string[] = [];
  if (env.PAYMENTS_ENABLED !== "true") blockers.push("Płatności są wyłączone.");
  if (!parsedEnvironment.success) blockers.push("Nieprawidłowe środowisko płatności.");
  if (!product) blockers.push("Nie ustalono pełnej oferty, ceny i limitów usługi.");
  if (!base) blockers.push("Nie ustawiono poprawnego adresu sklepu.");
  if (!termsVersion || termsVersion.length > 64 || !privacyVersion || privacyVersion.length > 64
    || termsText.length < 300 || termsText.length > 32_000 || privacyText.length < 200 || privacyText.length > 32_000) {
    blockers.push("Brakuje wersjonowanych, pełnych dokumentów umowy.");
  }
  if (!getP24Config(environment, env)) blockers.push("Przelewy24 nie ma konfiguracji dla tego środowiska.");
  if (!paymentDatabaseConfigured(env)) blockers.push("Baza zamówień i logowanie nie są skonfigurowane.");
  if (environment === "production") {
    if (env.PAYMENTS_MERCHANT_DOMAIN_APPROVED !== "true") blockers.push("Domena sklepu wymaga zatwierdzenia przez operatora płatności.");
    if (env.PAYMENTS_MODEL_SERVICE_APPROVED !== "true") blockers.push("Dostawca płatnej usługi AI wymaga potwierdzenia warunków i rozliczania.");
    // Current chat/video are a free pilot. An environment flag cannot pretend usage accounting is wired in.
    blockers.push("Zakupione limity nie są jeszcze egzekwowane przez pilotaż. Sprzedaż produkcyjna pozostaje zablokowana.");
  }
  const termsUrl = `${base ?? "https://copowiesz.pl"}/regulamin`;
  const privacyUrl = `${base ?? "https://copowiesz.pl"}/polityka-prywatnosci`;
  const offerVersion = product && termsVersion && privacyVersion && termsText && privacyText
    ? createHash("sha256").update(JSON.stringify({ product, termsVersion, privacyVersion, termsText, privacyText, withdrawalText, seller })).digest("hex") : null;
  return {
    public: { enabled: blockers.length === 0, environment, product, offerVersion,
      agreements: { termsVersion, privacyVersion, withdrawalDays: 14 }, paidAccessEnforced: false,
      notice: blockers.length ? "Płatne pakiety nie są jeszcze dostępne. Możesz korzystać z bezpłatnego pilotażu." : "Test Przelewy24 w sandboxie. Nie pobieramy prawdziwych opłat; zakup nie ogranicza bezpłatnego pilotażu." },
    baseUrl: base, termsText, privacyText, termsUrl, privacyUrl, blockers,
  };
}

export function requireCheckoutSettings(settings: PaymentSettings): asserts settings is PaymentSettings & { baseUrl: string; public: PublicPaymentConfig & { product: PaymentProduct; offerVersion: string } } {
  if (!settings.public.enabled || !settings.baseUrl || !settings.public.product || !settings.public.offerVersion) {
    throw new ApiError(503, "Zakup jest jeszcze niedostępny. Korzystaj z bezpłatnego pilotażu; żadna opłata nie została pobrana.");
  }
}
