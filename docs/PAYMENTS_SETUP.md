# Przelewy24 w COPOWIESZ — przygotowanie i granice wdrożenia

Stan na 7 października 2026: przygotowano backend REST Przelewy24, wersjonowane zamówienia,
kopię dokumentów do pobrania i wdrożono migrację bazy z testami 43/43 na PostgreSQL. **Nie skonfigurowano kluczy P24, nie wysłano
rzeczywistej rejestracji transakcji, nie pobrano pieniędzy i nie uruchomiono sprzedaży.**
Cena i zakres komercyjnego produktu wymagają decyzji operatora. Kod nie ma domyślnej ceny.
Dotychczasowy bezpłatny pilotaż pozostaje osobnym trybem.

Nowy checkout jest domyślnie wyłączony. Można przygotować test w sandboxie po konfiguracji
pełnej oferty, konta i bazy. Sprzedaż produkcyjna jest zablokowana w kodzie także przy
ustawieniu wszystkich flag środowiska: czat, analiza i tworzenie profili nie konsumują
jeszcze limitów z uprawnień. `paidAccessEnforced: false` w odpowiedziach API jawnie opisuje
ten stan. Nie wolno prezentować sandboxowego uprawnienia jako zakupu rzeczywistej usługi.

## Operator i źródła integracji

Operatorem wskazanym w publicznych dokumentach jest Multinewsroom Jan Domaniewski,
ul. Barcicka 44, 01-839 Warszawa, NIP 5252189241, REGON 147154574,
`kontakt@copowiesz.pl`. Dane mają wspólne źródło w `web/src/content/legal.ts`.
Sprawdzono je w dokumentach projektu KOD TALENTU i w publicznym wykazie Ministerstwa Finansów
dla dnia 2026-10-07. Nie potwierdzono działania skrzynki kontaktowej ani przypisania
domeny COPOWIESZ do rzeczywistego konta sprzedawcy P24.
[Publiczny wykaz MF](https://wl-api.mf.gov.pl/api/search/nip/5252189241?date=2026-10-07).

Integracja korzysta z oficjalnego REST API 1.0.18. Rejestracja używa
`POST /api/v1/transaction/register`, weryfikacja `PUT /api/v1/transaction/verify`.
Podpis SHA-384 powstaje z JSON o jawnej kolejności pól; znaki Unicode i ukośniki pozostają
nieucieczone. Podpis powiadomienia obejmuje także `originAmount`, metodę i opis transakcji.
Odpowiedź weryfikacji musi zawierać `responseCode: 0` i `data.status: "success"`.
[Dokumentacja P24](https://developers.przelewy24.pl/),
[pełny publiczny schemat OpenAPI](https://developers.przelewy24.pl/yaml/pl_documentation_1.0.yaml).

Z KOD TALENTU wykorzystano koncepcję serwerowej rejestracji, podpisu i niezależnego callbacku.
Nie przeniesiono kluczy, ceny produktu, kodów dostępu, dawnego odesłania do ODR ani utraty
prawa odstąpienia po pierwszej czynności. Nie modyfikowano tamtego projektu.

## Konfiguracja serwera

Zmienne należy ustawić wyłącznie po stronie serwera. Żaden klucz P24 ani prywatny klucz
Supabase nie może otrzymać prefiksu `NEXT_PUBLIC_`, trafić do przeglądarki, Git lub logów.
Nie umieszczono rzeczywistych wartości w przykładach.

| Zmienna | Wymaganie |
|---|---|
| `PAYMENTS_ENABLED` | Domyślnie brak/`false`; `true` dopuszcza wyłącznie kompletnie skonfigurowany sandbox |
| `P24_ENVIRONMENT` | `sandbox` domyślnie; `production` nie odblokowuje sprzedaży w tej wersji |
| `PAYMENTS_PUBLIC_BASE_URL` | Dokładny origin sklepu, np. `https://copowiesz.pl`; bez ścieżki, parametrów i danych logowania |
| `PAYMENTS_PRODUCT_ID` | Identyfikator 3–64 znaki, małe litery, cyfry i łącznik |
| `PAYMENTS_PRODUCT_TITLE` | Nazwa 5–100 znaków |
| `PAYMENTS_PRODUCT_DESCRIPTION` | Konkretny zakres usługi, 30–2000 znaków |
| `PAYMENTS_AMOUNT_CENTS` | Całkowita cena brutto w dodatnich całkowitych groszach, maks. 100 000 000; wymaga decyzji operatora |
| `PAYMENTS_DURATION_DAYS` | Okres 1–366 dni od potwierdzenia wpłaty; bez automatycznego odnowienia |
| `PAYMENTS_MAX_PETS` | Limit 1–20 profili |
| `PAYMENTS_CHAT_LIMIT` | Limit 1–100 000 odpowiedzi w całym okresie |
| `PAYMENTS_ANALYSIS_LIMIT` | Jawny limit 0–10 000 analiz w całym okresie; brak wartości jest błędem, zero wyłącza analizy w ofercie |
| `PAYMENTS_PRODUCT_VERSION` | Wersja produktu, maks. 64 znaki; zmienić przy zmianie zakresu |
| `P24_SANDBOX_MERCHANT_ID`, `P24_SANDBOX_POS_ID` | Identyfikatory testowego punktu P24, dodatnie liczby całkowite |
| `P24_SANDBOX_CRC`, `P24_SANDBOX_API_KEY` | Prywatne klucze sandboxa, uzyskane od operatora |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Istniejąca konfiguracja publiczna Auth i RLS; nie nadaje praw serwerowych |
| `SUPABASE_SECRET_KEY` | Prywatny `sb_secret_…` wyłącznie do obsługi zamówień na serwerze |
| `SUPABASE_SERVICE_ROLE_KEY` | Alternatywa dla starszego prywatnego JWT z rolą `service_role`; nie podawać klucza anon |

Przy lokalnym sandboxie dopuszczony jest origin HTTP pętli lokalnej. Callback P24 wymaga
adresu dostępnego dla operatora: `localhost` na komputerze nie jest takim adresem.
Host API P24 jest stały i zależy od środowiska; konfiguracja nie pozwala podmienić go na
arbitralny URL.

Dla przyszłej produkcji istnieją odrębne `P24_PRODUCTION_MERCHANT_ID`,
`P24_PRODUCTION_POS_ID`, `P24_PRODUCTION_CRC`, `P24_PRODUCTION_API_KEY` oraz deklaracje
`PAYMENTS_MERCHANT_DOMAIN_APPROVED=true` i `PAYMENTS_MODEL_SERVICE_APPROVED=true`.
**Żadna z tych zmiennych nie usuwa obecnej blokady produkcji.** Potrzebna jest uprzednia
implementacja i weryfikacja egzekwowania zakupionych limitów oraz dopuszczonych warunków
dostawcy modelu. Same flagi nie zmieniają planu rozliczeniowego ani umowy sprzedawcy.

Regulamin i polityka prywatności nie są tekstem podmienianym przez env. API korzysta z
`LEGAL_VERSION`, `termsSections`, `privacySections` i `legalPlainText` w wspólnym module
publicznych dokumentów. Zmiana produktu, pełnych dokumentów, operatora lub zasad odstąpienia
zmienia `offerVersion` — SHA-256 całej oferty. Klient musi odczytać i zaakceptować nową wersję.

## Kontrakt API dla interfejsu

Wszystkie ścieżki są pod `/api/payments`. Odpowiedzi nie zawierają kluczy ani tokenu sesji
Supabase. Zamówienia i dokumenty wymagają `Authorization: Bearer <sesja użytkownika>`.
Serwer potwierdza konto przez Supabase Auth; wymagany jest potwierdzony adres e-mail.
Konto anonimowe nie jest kupującym. Domyślny SMTP Supabase nadal ogranicza rejestrację osób
spoza zespołu; sprzedaż dla publicznych użytkowników wymaga sprawdzonej obsługi e-mail.

| Metoda i ścieżka | Działanie |
|---|---|
| `GET /config` | Publiczna aktualna oferta lub `product: null`; `enabled`, środowisko, wersje zgód, `offerVersion`, prosty komunikat dostępności |
| `POST /checkout` | Utworzenie lub odczyt próby z tym samym kluczem idempotencji; dokładny Origin sklepu i zweryfikowany użytkownik |
| `GET /orders/<UUID>` | Status wyłącznie własnego zamówienia, niezmienny produkt, cena, `receiptUrl`, hash dokumentu, ewidencja uprawnienia |
| `POST /orders/<UUID>/recover` | Ręczne odzyskanie rejestracji własnego istniejącego zamówienia; bearer, obowiązkowy Origin aplikacji i dokładnie JSON `{}`; bez nowych zgód i wywołania P24 |
| `GET /orders/<UUID>/receipt` | Pełny utrwalony dokument TXT do pobrania; właściciel i jego bearer, bez publicznego tokenu URL |
| `POST /webhook/sandbox` | Podpisane powiadomienie sandboxowe; niezależne `transaction/verify` przed zmianą stanu |
| `POST /webhook/production` | Przygotowana odrębna ścieżka do przyszłych potwierdzeń; brak skonfigurowanej sprzedaży produkcyjnej |

Typy `PublicPaymentConfig`, `CheckoutInput`, `PaymentOrder` i `PaymentEntitlement` znajdują
się w `web/src/lib/payments/contracts.ts`. Klient wysyła dokładnie:

```json
{
  "productId": "identyfikator-z-aktualnej-konfiguracji",
  "offerVersion": "sha256-z-aktualnej-konfiguracji",
  "termsVersion": "wersja-z-aktualnej-konfiguracji",
  "privacyVersion": "wersja-z-aktualnej-konfiguracji",
  "acceptTerms": true,
  "acknowledgePrivacy": true,
  "requestImmediateService": true,
  "confirmAdult": true,
  "idempotencyKey": "nowy-UUID-dla-tej-proby"
}
```

Przykład przedstawia nazwy pól, a jego zastępcze wartości nie przejdą walidacji. Klient nie
wysyła ceny, e-maila, zakresu ani URL powrotu. Dodatkowe pola, brak zgody i stara wersja są
odrzucane. Kwota w groszach pochodzi z konfiguracji serwera, e-mail z potwierdzonego Auth.

Odpowiedź checkout zawiera `orderId`, `status`, `environment`, `redirectUrl` lub `null`,
`receiptUrl`, `paidAccessEnforced: false`, `retryWithNewOrder` i `notice`. Kod 201 oznacza
nową zapisaną rejestrację, 200 ponowienie z istniejącym tokenem albo opłacone zamówienie,
202 oczekiwanie lub kontrolowany błąd przygotowania. Sam kod 200/201 nie potwierdza wpłaty.
Przekierowanie powrotne ma wyłącznie postać `/platnosci/wynik?orderId=<UUID>`.

Jeżeli wystąpi błąd rejestracji lub zapisu tokenu, serwer odczytuje stan ponownie. Zapisany
token odzyskuje bez ponownej rejestracji P24. Przy potwierdzonym `registration_failed`
zwraca `retryWithNewOrder: true` i pozwala jawnie zacząć nową próbę z nowym kluczem.
Próba pozostawiona jako `pending` bez tokenu przez ponad dwie minuty jest rozstrzygana
w ten sam sposób przy ponownym `POST /checkout`. GET status nie modyfikuje zamówienia.
Przy niedostępności bazy odpowiedź 503 zawiera `orderId`, `redirectUrl: null` i
`retryWithNewOrder: false`; klient powinien sprawdzić status i nie rozpoczynać automatycznie
kolejnego zakupu. Nie wolno po prostu ponawiać `transaction/register` dla starej sesji.

Ekran wyniku nie musi odtwarzać checkoutu. `GET /orders/<UUID>` zawiera
`canRecoverRegistration: true`, gdy istnieje zapisany token dla `pending` albo gdy `pending`
bez tokenu jest starsze niż dwie minuty. Nie udostępnia adresu bramki w tym odczycie.
Po świadomym kliknięciu klient wysyła `POST /orders/<UUID>/recover` z body `{}`.
Jeżeli token istnieje, odpowiedź 200 przywraca `redirectUrl` z właściwego środowiska.
Przy starym braku tokenu serwer oznacza nieudaną rejestrację i odczytuje ją ponownie.
Młoda próba pozostaje bez zmian z odpowiedzią 202; terminalny status jest tylko odczytywany.
Akcja nie tworzy zamówienia, nie wywołuje `transaction/register` ani `transaction/verify`
i działa przy wyłączonym checkout, bez obecnej oferty i kluczy P24. Oznaczenie błędu wymaga
prywatnego klucza bazy; samo odzyskanie już zapisanego tokenu używa odczytu właściciela.
Niedostępność bazy nie otwiera nowej próby: 503 zachowuje numer zamówienia i `retryWithNewOrder: false`.

## Własność, podpis i niezmienność

Zamówienie powstaje przed wywołaniem P24. Identyfikator sesji jest tym samym UUID co numer
zamówienia, a `(owner_id, idempotency_key)` jest unikalny. Baza szereguje tworzenie zamówień
i stosuje limity 5 prób na konto na godzinę, 20 na skrót IP na godzinę oraz 100 łącznie
w 24 godziny. Limity obowiązują wspólnie dla instancji serwera. Na Vercel skrót HMAC korzysta
z nagłówka IP dostarczanego przez platformę; poza Vercel dodatkowy limit jest wspólny.
Surowego IP nie zapisujemy w zamówieniu.

Callback nie ufa przekierowaniu ani użytkownikowi. Wymaga poprawnego podpisu SHA-384,
zgodnej sesji, sprzedawcy, punktu, obu kwot, waluty i środowiska. Następnie serwer wysyła
niezależne `transaction/verify`. Dopiero wynik sukcesu pozwala wywołać SQL RPC, które pod
blokadą wiersza zapisuje `paid` i jedno uprawnienie w tej samej transakcji. Powtórne poprawne
powiadomienie zwraca istniejący wynik. Ten sam zakup nie dodaje uprawnień drugi raz.
Opóźnione podpisane potwierdzenie może rozliczyć pierwotną nieudaną rejestrację, także gdy
nowe checkouty są wyłączone. Anulowane i zwrócone zamówienie nie otrzymuje nowego dostępu.

Tabele `copowiesz_payment_orders` i `copowiesz_payment_entitlements` mają jawne RLS
`auth.uid() = owner_id` dla odczytu. `authenticated` nie ma INSERT, UPDATE ani DELETE.
Mutacje wykonują wyłącznie funkcje z uprawnieniami `service_role`, `security invoker`,
pustym `search_path` i odebranym EXECUTE dla PUBLIC, anon i authenticated. Klucz obcy
wiąże uprawnienie z parą numer zamówienia/właściciel. Trigger blokuje zmianę zaakceptowanego
produktu, kwoty, właściciela, dokumentów oraz zapisanych identyfikatorów operatora.

Dokument TXT zawiera sprzedawcę, e-mail kupującego, cenę brutto, pełny czas i zakres, wersje,
wszystkie oświadczenia, pełny regulamin i politykę oraz odstąpienie i reklamacje. Baza
oblicza SHA-256; odczyt odmawia publikacji pliku o niezgodnym hashu. Pobranie ma
`Cache-Control: private, no-store`, `Content-Disposition: attachment` i `nosniff`.
Zmiana dzisiejszej ceny lub dokumentów nie nadpisuje kopii zaakceptowanej przy zamówieniu.
TXT jest dokumentem zamówienia, nie wystawioną fakturą. Status wpłaty jest odrębnym odczytem.

Możliwość zapisania pełnej kopii nie dowodzi, że została skutecznie doręczona kupującemu na
trwałym nośniku. Przed produkcją trzeba zapewnić i sprawdzić doręczenie potwierdzenia, np.
e-mail z niezmiennym załącznikiem, i dostęp po zakończeniu okresu usługi. Sam link do strony
lub pliku wymagającego aktywnego konta nie wystarcza do uznania tego procesu za zakończony.

## Testy i migracja

Migrację `supabase/migrations/20261007210342_copowiesz_payments.sql` utworzono przez
`supabase migration new copowiesz_payments`. Po przeglądzie zastosowano ją do istniejącego
projektu Supabase `mdcrccpfwztqovhipljw` pod nazwą `copowiesz_private_payment_orders`.
Nie zmieniała tabel profili i nagrań. Na przyszłych środowiskach nadal należy sprawdzić
schemat przed migracją, nie zastępować tabel innej aplikacji i nie udostępniać prywatnych
dokumentów roli anon.

```bash
cd web
node --import tsx --test tests/payments.test.ts
npm run typecheck
```

32 testy Node korzystają wyłącznie z syntetycznych danych i kontrolowanych odpowiedzi sieci.
Sprawdzają m.in. oficjalną kolejność podpisu, cenę serwera, wersje dokumentów, obce konto,
podpis bez weryfikacji, błędne kwoty/środowisko, powtórzenie callbacku, niepewny zapis tokenu,
odzyskanie po utraconej odpowiedzi, stary stan oczekiwania i pobranie dokumentu właściciela.
Osobna akcja odzyskania ma testy uprawnień/Origin, pustego strict body, świeżego oczekiwania,
trwałego błędu, zapisanej bramki bez kluczy P24 i bazy oraz niejednoznacznej awarii.
**Mocki nie potwierdzają działania RLS, blokad i atomowości rzeczywistego PostgreSQL.**

`supabase/tests/payments.test.sql` zawiera 43 asercje pgTAP: jawne granty/RLS, izolację
dwóch kont, odmowę RPC klientowi, niezmienność ceny i dokumentów, sumę kontrolną, skończony
zakres, idempotencję oraz zgodność właściciela. Tworzy syntetyczne konta i zamówienia wewnątrz
transakcji, kończy `finish()` i `ROLLBACK`. **Wykonano go na rzeczywistym chmurowym
PostgreSQL: 43/43 PASS, zero nieudanych asercji.** Po rollback osobno potwierdzono zero
syntetycznych kont, zamówień i uprawnień; security advisors zwrócił pustą listę ostrzeżeń.
Nie wywołano P24 i nie tworzono prawdziwych plików. Test można powtórzyć na kontrolowanym
lokalnym PostgreSQL albo po przejrzanej migracji w kolejnym projekcie Supabase. Ten wynik
jednej transakcji nie zastępuje testu współbieżności dwóch niezależnych sesji.

Przed sprzedażą potrzebne są także dwa równoległe callbacki dla jednej sesji, równoczesne
utworzenie tej samej próby i potwierdzenie, że błąd drugiej części transakcji cofa `paid`.
Sprawdzić rzeczywisty sandbox: powrót przed callbackiem, callback przed powrotem, duplikat,
anulowanie, brak powiadomienia, timeout i awarię zapisu. Nie raportować tych scenariuszy jako
przetestowanych wyłącznie na podstawie mocków.

## Warunki przed włączeniem sprzedaży

- Operator ustala rzeczywistą cenę brutto, okres, liczbę profili i skończone limity. Oferta
  opisuje faktycznie dostępną usługę, a regulamin otrzymuje nową zaakceptowaną wersję.
- Czat, analiza i dodawanie profili egzekwują uprawnienia oraz atomowo rezerwują i rozliczają
  użycie. Wygasły, cofnięty lub sandboxowy zapis nie daje produkcyjnego dostępu. Obecny kod
  płatności tylko ewidencjonuje zakup; nie zmienia zachowania bezpłatnych endpointów.
- P24 potwierdza domenę, właściwy punkt i aktywne metody. Logo, karty i informacje operatora
  muszą odpowiadać rzeczywistemu zakresowi umowy. Druga aplikacja może wymagać odrębnego
  punktu/subkonta; nie wolno zakładać, że działanie KOD TALENTU automatycznie obejmuje COPOWIESZ.
  [Wymogi weryfikacji sklepu](https://www.przelewy24.pl/centrum-pomocy/sprzedaje-z-przelewy24/weryfikacja-sklepu-internetowego/jakie-warunki-musze-spelnic-sklep-byl-zweryfikowany-pozytywnie),
  [drugi sklep i subkonto](https://www.przelewy24.pl/centrum-pomocy/sprzedaje-z-przelewy24/metody-platnosci-konto/zakladam-nowy-sklep-jak-moge-dodac-kolejne-konto-w-p24).
- Potwierdzić dopuszczoną publiczną usługę Gemini w EOG i jej warunki wieku/przetwarzania.
  Wymaganie bezpłatności użytkownika pozostaje w mocy; integracja P24 nie daje zgody na
  aktywowanie rozliczeń Google, nowego planu hostingu ani płatnej usługi e-mail.
  [Aktualne warunki Gemini API](https://ai.google.dev/gemini-api/terms).
- Potwierdzić konto kupującego, działanie SMTP i kontaktu, doręczenie niezmiennej kopii oraz
  formularz odstąpienia. Żądanie natychmiastowego rozpoczęcia usługi zachowuje pełne prawo
  odstąpienia i zwrotu przez 14 dni. Użycie pierwszego czatu nie odbiera tego prawa.
  Odpowiedź na reklamację i refund mają jawne terminy. Nie kopiować nieaktualnego linku ODR.
  [Ustawa o prawach konsumenta — art. 7a, 17, 21, 27, 38](https://api.sejm.gov.pl/eli/acts/DU/2024/1796/text.html).
- Obsługa zwrotu przez operatora i atomowego cofnięcia uprawnienia wymaga osobnego procesu.
  Nie przygotowano automatycznego refund API, fakturowania ani harmonogramu retencji.
  Finansowy FK `ON DELETE RESTRICT` świadomie nie usuwa dokumentów wraz z kontem; potrzebny
  jest ustalony zgodnie z obowiązkami plan retencji i obsługi usunięcia konta.
- Prowizje i ewentualna aktywacja P24 zależą od rzeczywistej umowy. Nie aktywowano konta
  ani nie poniesiono opłaty w tej pracy. Integracji sprzedawcy nie należy opisywać jako
  gwarantowanej usługi bez kosztów. [Oficjalna tabela opłat P24](https://www.przelewy24.pl/oferta/tabela-prowizji-i-oplat).

Obecna bezpieczna konfiguracja to `PAYMENTS_ENABLED=false`, brak ceny i brak prywatnych
kluczy P24. Publiczny interfejs może pokazywać opis planowanego zakupu i dokumenty, lecz nie
powinien deklarować aktywnych Przelewy24 ani obiecywać gotowej płatnej usługi.
