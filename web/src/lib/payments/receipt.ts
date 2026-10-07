import type { NewOrder } from "./transport";
import { seller } from "./config";

export function buildOrderDocument(order: Omit<NewOrder, "receipt_text" | "caller_hash">): string {
  const product = order.product_snapshot; const agreements = order.agreements_snapshot;
  return [
    "COPOWIESZ — utrwalone warunki zamówienia", order.environment === "sandbox" ? "SANDBOX: dokument testowy, bez prawdziwej płatności i umowy odpłatnej." : "Potwierdzenie warunków zamówienia; potwierdzenie opłacenia stanowi osobny stan zamówienia.",
    `Numer zamówienia: ${order.id}`, `Data złożenia: ${order.created_at}`, `Kupujący: ${order.email}`,
    `Sprzedawca: ${seller.name}`, `Adres: ${seller.address}`, `NIP: ${seller.nip}; REGON: ${seller.regon}`, `Kontakt: ${seller.email}`,
    `Produkt: ${product.title} (${product.id}); wersja ${product.version}`, `Opis: ${product.description}`,
    `Całkowita cena brutto: ${(product.amountCents / 100).toFixed(2)} PLN; bez dodatkowej opłaty za płatność.`,
    `Czas dostępu: ${product.durationDays} dni od potwierdzenia wpłaty. Bez automatycznego odnowienia.`,
    `Zakres: maksymalnie ${product.maxPets} profili; ${product.chatLimit} odpowiedzi czatu; ${product.analysisLimit} analiz nagrań w całym okresie dostępu.`,
    "Obecny bezpłatny pilotaż nie egzekwuje zakupionych limitów. Ten dokument nie oznacza, że płatna usługa produkcyjna została uruchomiona.",
    "Dostęp nadawany po niezależnym potwierdzeniu transakcji przez operatora. Powrót z bramki płatności nie potwierdza zapłaty.",
    `Zamówienie opłacane przez Przelewy24 / PayPro S.A. w środowisku ${order.environment}.`,
    `Wersja oferty (SHA-256): ${order.offer_version}`, `Oświadczenia kupującego zapisane: ${agreements.acceptedAt}`,
    "Akceptuję regulamin. Potwierdzam zapoznanie się z polityką prywatności. Żądam rozpoczęcia usługi po potwierdzeniu wpłaty przed upływem 14 dni i zachowuję prawo odstąpienia w tym terminie. Potwierdzam pełnoletniość.",
    "", "ODSTĄPIENIE I REKLAMACJE", agreements.withdrawalText,
    "", `REGULAMIN — pełna utrwalona treść, wersja ${agreements.termsVersion}`, `Adres publikacji w chwili zamówienia: ${agreements.termsUrl}`, agreements.termsText,
    "", `POLITYKA PRYWATNOŚCI — pełna utrwalona treść, wersja ${agreements.privacyVersion}`, `Adres publikacji w chwili zamówienia: ${agreements.privacyUrl}`, agreements.privacyText,
  ].join("\n");
}
