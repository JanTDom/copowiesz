# Aplikacja webowa — lokalnie i wdrożenie

Stan konfiguracji: 8 października 2026. Aplikacja działa publicznie pod
[copowiesz.pl](https://copowiesz.pl) i [copowiesz.vercel.app](https://copowiesz.vercel.app).
Kod jest w repozytorium GitHub, pierwszy workflow CI zakończył się powodzeniem, a Vercel
publikuje gałąź `main`. Supabase utworzono i przetestowano w oddzielnej organizacji Free.
Aplikacja znajduje się w `web/`; publiczny fundament Python i dane źródłowe pozostają w
katalogu głównym. Publiczna rejestracja nadal wymaga własnego SMTP; poniżej opisano zakres
rzeczywistych sprawdzeń i pozostałe ograniczenia.

## Rozmowa i wspólna historia

Kod rozszerzono o osobisty finał po przygotowaniu profilu, tematy z zapisów, „Nasz tydzień”,
sesję głosową, opis sytuacji z odwołaniem do klipu, prywatny album oraz kartę PNG.
[Dokładny zakres](ENGAGEMENT_FEATURES.md). Migracja IndexedDB do wersji 2 zachowuje profile
i nagrania, dodając lokalny magazyn zdjęć. Album w JSON zawiera opisy i odnośniki; bajty zdjęć
nie synchronizują się w Supabase. Istniejący prywatny JSON profilu obsługuje nowe pola, bez
nowych tabel i zmian Auth lub RLS. Nie zmieniono flagi publicznego Gemini ani zakresu rozliczeń.

## Uzupełnienie serwisu i płatności

Nowa wersja dodaje hero „Porozmawiaj ze swoim zwierzakiem!”, rozbudowane podstawy projektu
pod `/jak-to-dziala`, przeszukiwalną pomoc, dane Multinewsroom, kontakt, regulamin, prywatność
oraz pobieralny wzór odstąpienia. Stopka używa `kontakt@copowiesz.pl` i copyright Multinewsroom.
Publiczne metadane, sitemap i robots wskazują kanoniczne `https://copowiesz.pl`.

Przygotowano serwerowy checkout Przelewy24, prywatne zamówienia z utrwalonym pełnym tekstem
dokumentów i weryfikacją podpisu oraz niezależnego potwierdzenia operatora. Nie uruchomiono
sprzedaży i nie pobrano pieniędzy. Cena, zakres oferty i klucze sprzedawcy nie są ustawione;
produkcja pozostaje zablokowana także z samymi flagami, dopóki aplikacja nie egzekwuje
zakupionych limitów. [Konfiguracja i pozostałe warunki](PAYMENTS_SETUP.md).

Migracja płatności została zastosowana w istniejącym projekcie Free. Testy na rzeczywistym
PostgreSQL: 43/43 asercje pgTAP, pełny ROLLBACK i potwierdzone zero syntetycznych kont,
zamówień oraz uprawnień po teście. Security advisors nie zgłosił ostrzeżeń. Ten test jednej
transakcji nie zastępuje dwóch równoległych sesji ani prawdziwego sandboxa P24.

Końcowa weryfikacja kodu obejmuje 119/119 testów web, w tym 32 płatności, 33/33 Python,
TypeScript, produkcyjny build Next i zgodność eksportu wiedzy. Osobny przegląd odtworzył
odzyskanie zamówienia po niepewnej awarii bazy, bez drugiej rejestracji u operatora.

W tej wersji publiczny `/api/status` podaje `publicAccessAllowed=false`, a odpowiedzi czatu
używają `provider=local`; analiza pozostaje techniczna. Film ani klatki nie trafiają do
Google, gdy publiczna bramka jest zamknięta. Lokalny serwer może nadal korzystać z klucza
Gemini. Blokada wynika z poniżej opisanych warunków publicznej usługi w EOG, a nie z błędu
klucza. Wcześniejsze wyniki produkcyjne opisano w dalszej części jako historyczne.

## Uruchomienie lokalne

Wymagany Node.js 24 oraz npm. Biblioteka Supabase nie wspiera już Node.js 20; wersja 24 jest
również używana w przygotowanym CI. [Zmiana wsparcia Node.js](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20).

```bash
cd web
npm ci
npm run dev
```

Otwórz `http://127.0.0.1:3000`. Aplikacja domyślnie zapisuje profile i nagrania na tym urządzeniu
w IndexedDB; ich dostępność zależy od przeglądarki, profilu przeglądarki i czyszczenia danych.
Chmura jest opcjonalna i nie zostaje aktywowana samym uruchomieniem aplikacji.

Do rozmowy Gemini służy serwerowy `GEMINI_API_KEY` i model `GEMINI_MODEL`, domyślnie
`gemini-3.1-flash-lite`. Lokalny ekran ustawień może zapisać klucz do wyłączonego z Git pliku
`web/.env.local` przez lokalne API konfiguracji. Klucz nie może mieć prefiksu `NEXT_PUBLIC_`.
Po zmianie konfiguracji serwera należy sprawdzić stan połączenia i w razie potrzeby uruchomić
ponownie lokalny serwer. Nie zapisuj klucza w kodzie, Git, treści profilu ani pamięci przeglądarki.

Gemini otrzymuje wiadomość i wybrany kontekst profilu przy korzystaniu z tej rozmowy. Analiza
filmu w Gemini wymaga odrębnej jawnej zgody przekazania nagrania/klatek. Wynik modelu pozostaje
niezweryfikowany i wymaga przeglądu; nie staje się automatycznie własną pamięcią ani diagnozą.
Bez modelu aplikacja udostępnia oznaczoną odpowiedź opartą na zapisach oraz kontrolę techniczną
klipów. Opcjonalny lokalny model wideo Ollama nie jest instalowany ani pobierany automatycznie.

## Warunki publicznego Gemini i blokada w kodzie

Warunki Google obowiązujące od 23 marca 2026 wymagają **Paid Services** dla publicznych
klientów API udostępnianych w EOG, Szwajcarii i UK. Dla Gemini API oznacza to projekt Cloud
z aktywnym kontem rozliczeniowym. Sam klucz Free lub sesja Supabase nie wystarczają.
Gemini API jest przeznaczone dla osób 18+; nie należy kierować tych funkcji do osób młodszych.
Zasady przetwarzania danych Paid Services dotyczą EOG/CH/UK również przy darmowych usługach
i limitach. Nie wolno automatycznie przypisywać tym danym ogólnych zasad Unpaid Services.
[Gemini API Additional Terms: Use Restrictions oraz How Google Uses Your Data](https://ai.google.dev/gemini-api/terms).

Wymaganie użytkownika pozostaje Free: **nie aktywujemy Cloud Billing, płatnego planu ani
automatycznego dokupowania**. Bieżący kod dodaje blokadę publicznych wywołań na Vercel:

```dotenv
GEMINI_PUBLIC_BILLING_CONFIRMED=false
```

Wartość pusta, brak zmiennej lub jakakolwiek wartość inna niż dokładne `true` blokuje dostawcę
na Vercel. Flaga jest odrębną deklaracją operatora; nie weryfikuje planu Google i nie włącza
rozliczeń. Ustawienie jej na true wymaga wcześniejszego spełnienia warunków i odrębnej
autoryzacji użytkownika na zakres rozliczeniowy. Przykład konfiguracji pozostaje false.
Lokalne uruchomienie bez `VERCEL` zachowuje adapter Gemini i konfigurację własnego klucza.

`getGeminiConfig` nadal raportuje skonfigurowany klucz, a `isPublicGeminiAllowed` osobno
określa dopuszczenie dostawcy. Zablokowany `/api/status` zwraca `configured=true` przy kluczu,
`available=false`, `publicAccessAllowed=false` i `policyNotice`, bez sprawdzania Auth ani
Google — także z tokenem Bearer. Rozmowa zwraca HTTP 200 z `provider=local` i wyjaśnieniem.
Analiza po zgodzie zwraca `source=technical` i informację, że filmu/klatek nie wysłano.
Niskie funkcje generowania oraz kontroli dostępności mają tę samą blokadę, również przed
odczytem zapamiętanego wyniku dostępności. Konta i zgoda filmu nie omijają warunku.

Pierwotną zmianę sprawdzono lokalnie w 55 testach web oraz przez TypeScript. Regresje nie używają
realnych kluczy ani płatnych wywołań; dotychczasowe testy autoryzacji mają syntetyczne jawne
potwierdzenie w swoich fixture. Późniejsza publikacja i odczyt publicznego `/api/status`
potwierdziły blokadę na domenie: `publicAccessAllowed=false`; czat zwraca `provider=local`.
Nowe rozszerzenia zachowują tę blokadę i nie zmieniają produkcyjnych zmiennych środowiska.
Poniższe wcześniejsze wyniki produkcji należy odczytywać jako historyczne.

## Sprawdzenia

Z katalogu głównego:

```bash
python3 -m copowiesz build-kb
python3 -m unittest discover -s tests -v
node web/scripts/export-foundation.mjs
```

Z `web/`:

```bash
node --import tsx --test tests/*.test.ts
npm run typecheck
npm run build
```

Eksport obejmuje wszystkie 94 pytania, 290 kart i 173 źródła wraz z metadanymi. Dla jednego
gatunku dostępnych jest 85 pytań. Manifest zapisuje SHA256 surowych plików. Zmiana wygenerowanych
JSON wymaga ponownego eksportu; eksport nie czyta `data/private` ani prawdziwych nagrań.

## Chmura Supabase — wdrożona w planie Free

Przygotowano klienta przeglądarkowego `web/src/lib/supabase.ts`, funkcje kont i jawnej synchronizacji
w `cloud.ts`, konfigurację lokalnego stosu oraz migrację w `supabase/migrations/`. Migrację
`copowiesz_private_profiles` zastosowano 7 października 2026 w nowym projekcie
[copowiesz](https://supabase.com/dashboard/project/mdcrccpfwztqovhipljw), region Frankfurt
`eu-central-1`, identyfikator `mdcrccpfwztqovhipljw`. Projekt należy do oddzielnej organizacji
COPOWIESZ `tzapzxvcpoixvhjyhvmw`. MCP potwierdził plan `free`, koszt utworzenia projektu
**0 USD miesięcznie**, a stan projektu `ACTIVE_HEALTHY`. Istniejąca organizacja Pro i jej
projekty pozostały bez zmian. Nie używamy `service_role` ani klucza `sb_secret_`.

Publiczne wartości zapisano w lokalnym `web/.env.local` oraz produkcyjnych zmiennych Vercel,
zachowując istniejący serwerowy klucz Gemini. W konfiguracji środowiska wymagane są:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://mdcrccpfwztqovhipljw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PUBLICZNY_KLUCZ_PROJEKTU
```

Zmienne `NEXT_PUBLIC_` są widoczne w przeglądarce. Mają zawierać wyłącznie publiczny URL i klucz
publishable; bezpieczeństwo danych zapewniają uwierzytelnienie i polityki RLS. Biblioteka
`@supabase/supabase-js` jest przypięta do konkretnej wersji w `web/package.json` i lockfile.
[Publiczne i sekretne klucze Supabase](https://supabase.com/docs/guides/api/api-keys).

Schema:

- `copowiesz_pets`: prywatny JSON `PetRecord`, wersja schematu i rewizja zmiany.
- `copowiesz_workspaces`: ustawienie aktywnego zwierzaka danego konta.
- `copowiesz_clip_assets`: metadane prywatnego filmu, rozmiar, MIME i dokładna ścieżka.
- Prywatny bucket `copowiesz-clips`: ścieżka `owner_uuid/pet_uuid/clip_uuid.webm`, `.mp4` albo `.mov`.

Każda tabela ma RLS i dostęp tylko dla `authenticated` z warunkiem `auth.uid() = owner_id`.
Złożone klucze obce uniemożliwiają przypięcie aktywnego profilu albo metadanych klipu do cudzego
zwierzaka. Zapis pliku wymaga metadanych klipu należących do konta. Odczyt wymaga właściciela
prefiksu i profilu. Pliki nie są publiczne; podgląd otrzymuje podpisany URL na 60 sekund.
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[dostęp do Storage](https://supabase.com/docs/guides/storage/security/access-control).

Najpierw zapisuje się profil, następnie opcjonalnie przekazuje wybrany film. Limit przyjęty w
kodzie i buckecie to 50 MiB na klip, format WebM/MP4/MOV. Nie jest to gwarancja pozostania w
limicie darmowego konta: sumaryczne zużycie Storage i transferu trzeba kontrolować.

Synchronizacja jest jawna. `pushWorkspace` zapisuje lokalne rzeczywiste profile; nie przesyła
demonstracji i nie usuwa automatycznie profili nieobecnych na urządzeniu. `pullWorkspace`
pobiera chmurową kopię. Przed zastąpieniem lokalnej wersji interfejs powinien pozwolić zachować
eksport. Obecny mechanizm używa ostatniego zapisu; równoczesne edytowanie na wielu urządzeniach
nie ma automatycznego rozwiązywania konfliktów.

`deleteCloudPet` najpierw usuwa bajty filmów przez Storage API, potem metadane i profil. Ręczne
`DELETE` w SQL nie usuwa bajtów Storage; bezpośrednio nie należy też usuwać wierszy `storage.objects`.
Usunięcie kopii lokalnej i chmurowej to odrębne działania. Eksporty i kopie zapasowe mają własny
cykl usuwania. [Własność i schemat Storage](https://supabase.com/docs/guides/storage/schema/design).

Lokalny Supabase wymaga Docker. Plik migracji utworzono poleceniem CLI `migration new`;
`config.toml` powstał przez CLI `init`. Na hoście tej pracy nie znaleziono Docker ani `psql`.
Dlatego migrację wykonano przez oficjalny Supabase MCP na rzeczywistym nowym projekcie
chmurowym. Inspekcja przed migracją potwierdziła brak tabel/funkcji publicznych, kont Auth
i bucketów, co wykluczyło nadpisanie danych innej aplikacji.

Test `supabase/tests/ownership.test.sql` przeszedł **14/14 pgTAP** na chmurowym PostgreSQL:
odczyt własnego profilu, odmowa cudzego odczytu/zapisu/zmiany właściciela, odmowa cudzej
aktualizacji/usunięcia, poprawna własna aktualizacja i rewizja, klucze obce właściciela,
odmowa uploadu w cudzym prefiksie oraz prywatny odczyt metadanych Storage. Test użył dwóch
syntetycznych kont `example.invalid` w jednej transakcji z `ROLLBACK`. Następny odczyt
potwierdził `auth_users=0`, `pets=0`, `clip_assets=0`, `storage_objects=0`.

Wbudowana ochrona Supabase blokuje surowy `DELETE storage.objects`; ten przypadek jest
osobno sprawdzany. Test SQL tworzy wyłącznie tymczasowe metadane i **nie potwierdza uploadu,
podglądu ani usunięcia rzeczywistych bajtów przez Storage API**. Te operacje nadal wymagają
testu zalogowanego klienta. Security advisors po migracji zwrócił `lints=[]`; performance
zwrócił jedynie INFO o dotąd nieużywanym indeksie świeżego `copowiesz_workspaces_active_pet`.
[Wyjaśnienie unused_index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Po dostępności Docker należy sprawdzić aktualne `supabase start --help`, uruchomić lokalny stos,
zastosować migrację lokalnie, uruchomić przygotowany test `supabase/tests/ownership.test.sql`
przez lokalny runner SQL/pgTAP oraz sprawdzić upload, podgląd i usunięcie prawdziwych testowych
plików przez Storage API. Przed udostępnieniem danych w chmurze konieczne jest przejście testu
dwóch kont: cudzy odczyt, zapis, zmiana właściciela, upload i usuwanie muszą być odrzucane.

Przejrzano aktualny changelog Supabase oraz dokumentację Auth, RLS i Storage. Kod nie używa
deprecated `auth.role()`, autoryzacji przez `user_metadata`, widoków ani `SECURITY DEFINER`.
Projekt zachowuje potwierdzenie e-mail (`mailer_autoconfirm=false`), rejestrację email/hasło
i wyłączone konta anonimowe, co potwierdzono przez publiczny endpoint Auth settings.
W Dashboard zapisano Site URL `https://copowiesz.pl` oraz cztery dokładne Redirect URLs:
`https://copowiesz.pl`, `https://www.copowiesz.pl`, `http://localhost:3000`,
`http://127.0.0.1:3000`. Nie dodawano szerokich wildcardów.

**Publiczna rejestracja wymaga konfiguracji własnego SMTP.** Domyślny serwer Supabase wysyła
wyłącznie do adresów członków zespołu projektu i ma restrykcyjne limity. Nie skonfigurowano
nowego płatnego dostawcy poczty i nie wyłączono potwierdzania adresów jako obejścia.
[Oficjalne ograniczenia i konfiguracja SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
[Konfiguracja logowania](https://supabase.com/docs/guides/auth/passwords),
[zmiana szablonów Free](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## GitHub i CI

Kod opublikowano w istniejącym publicznym repozytorium [JanTDom/copowiesz](https://github.com/JanTDom/copowiesz)
7 października 2026. Pierwszy push `main` ma SHA
`1a4b29174b0e80faf3b75303527c78a4fb32e2ff`. Zawiera aplikację, lockfile, publiczny fundament
i migrację. `web/.env.local`, pliki z sekretami, `data/private`, prawdziwe nagrania,
`node_modules`, artefakty `.next` i lokalne metadane `.vercel` pozostają poza Git.

Aktywny `.github/workflows/ci.yml` dodano w commicie
`f88f3aedc48e34594480079a5d39a4ff1d41ef83`. Workflow używa Node.js 24 i Python 3.13; sprawdza
`npm ci`, odtwarzalność eksportu, testy domeny/API bez zewnętrznych kluczy, TypeScript, build
i testy fundamentu Python. Ma tylko `contents: read`, nie publikuje aplikacji, nie stosuje
migracji i nie wymaga sekretów. Szablon `.github/ci.yml.example` pozostaje materiałem
pomocniczym; wykonuje się plik w `workflows/`.

[Pierwsze wykonanie CI](https://github.com/JanTDom/copowiesz/actions/runs/37682918902)
zakończyło się `success`; obie prace `foundation` i `web` oraz wszystkie ich kroki przeszły.
Git integration Vercel publikuje `main` niezależnie od tego workflow. Nie skonfigurowano
Deployment Checks blokujących publikację do czasu zakończenia CI.

## Vercel

Projekt [macieto/copowiesz](https://vercel.com/macieto/copowiesz) ma identyfikator
`prj_o5OfN1Ww2JrCJD25fDFhURlAZq6V` i należy do istniejącego zespołu `macieto`
`team_ac4C9KaiZW4ZFT9tQGusAJEv`. Zespół miał już aktywny plan **Pro**. Nie zmieniono planu,
nie dodano płatnych miejsc, dodatków ani nowej integracji rozliczeniowej. Projekt nie jest
wdrożeniem Hobby; wykorzystanie istniejącego Pro nie gwarantuje braku opłat za przekroczenie
jego przydziałów. Nie zmieniano limitów wydatków ani zasobów innych projektów.

Potwierdzono **Root Directory: `web`**, framework Next.js, Node.js `24.x` i build
`npm run build`. Maszyna budowania ma `buildMachineSelection=fixed`, `buildMachineType=basic`
i wyłączoną elastyczną współbieżność. Funkcje działają w `fra1`, blisko Supabase Frankfurt,
z limitem 60 sekund. Publiczne JSON fundamentu są w `web/src/data`, więc build nie wymaga
Pythona ani plików poza katalogiem `web`.

GitHub `JanTDom/copowiesz` jest połączony z projektem, a gałąź produkcyjna to `main`.
Pierwsze wdrożenie SHA `1a4b29174b0e80faf3b75303527c78a4fb32e2ff` otrzymało stan `READY`.
Następne, obejmujące dodanie CI, również ma `READY`: SHA
`f88f3aedc48e34594480079a5d39a4ff1d41ef83`, deployment
`dpl_GvM7mPWRP91vMYyhEuV3N9JkYfS9`, adres
`https://copowiesz-9c1sjfo9n-macieto.vercel.app`. Indywidualne adresy deploymentów zachowują
standardową ochronę logowaniem Vercel. Publiczne aliasy produkcyjne to
[copowiesz.pl](https://copowiesz.pl) i [copowiesz.vercel.app](https://copowiesz.vercel.app).

W środowisku **production** ustawiono `GEMINI_API_KEY` jako `sensitive`, model
`gemini-3.1-flash-lite` oraz publiczne URL/publishable key Supabase. Sekretny klucz przeniesiono
przez stdin; nie umieszczano wartości w argumentach procesu, logach, Git ani klienckim kodzie aplikacji.
Nie kopiowano klucza do środowiska preview. Serwer uwierzytelnia Bearer token w Supabase
z użyciem publishable key; starszy anon key ma jedynie zgodny fallback konfiguracji.

We wcześniejszym wdrożeniu, przed dodaniem blokady publicznego dostawcy, rzeczywisty `GET`
metadanych modelu Gemini zwrócił HTTP 200 z skonfigurowanym kluczem.
To potwierdza dostęp do modelu, nie dostępność darmowego limitu generowania. Anonimowy
`/api/status` w produkcji celowo nie sprawdza klucza u Google: raportuje `configured=true`,
`available=null`, `authenticationRequired=true` i `quotaVerified=false`. Rozmowa i analiza
Gemini wymagają zweryfikowanej sesji Supabase. Analiza filmu wymaga dodatkowej jawnej zgody
na przekazanie nagrania/klatek. Odpowiedź zdrowotna i kontrola techniczna bez zgody pozostają
lokalne. Nie włączono zdalnego modelu Ollama.

### Domeny i DNS

Domeny `copowiesz.pl` oraz `www.copowiesz.pl` przypisano do tego projektu. Preferowane wartości
odczytano z API konfiguracji domen z jawnym `projectIdOrName`; nie zakładano wspólnego adresu
Vercel. W strefie nazwa.pl zapisano:

| Nazwa | Typ | Wartość |
|---|---|---|
| `@` | A | `216.150.1.1` |
| `@` | A | `216.150.16.1` |
| `www` | CNAME | `a08db410f7d96a03.vercel-dns-016.com.` |

Zachowano nameservery `ns1.nazwa.pl`, `ns2.nazwa.pl`, `ns3.nazwa.pl`, rekord MX z priorytetem 10,
adres hosta pocztowego `85.128.144.44` oraz rekordy SPF i DMARC poczty. Vercel potwierdził
`misconfigured=false` dla obu domen, `configuredBy=A` dla głównej i `configuredBy=CNAME` dla `www`. Żądanie HTTPS do `copowiesz.pl` zwróciło aplikację i HTTP 200 przy standardowej
weryfikacji certyfikatu. HTTPS `www` zwraca 308 do `https://copowiesz.pl/`.
[Dokumentacja konfiguracji domen](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Ręczna strefa zachowuje publiczny klucz DKIM i DMARC z polityką `quarantine`. Zmiana strony
wymagała skierowania MX na `mail.copowiesz.pl` z dotychczasowym adresem serwera oraz zastąpienia
mechanizmu `a` w SPF jawnym adresem tego serwera, aby nie autoryzować serwerów Vercel do poczty.
Nazwa.pl informuje, że przejście do ręcznej strefy wyłącza jej automatyczne zarządzanie
DKIM/DMARC i może usuwać dawny zarządzany klucz po 14 dniach. Dostawy i podpisywania poczty
nie testowano; własny SMTP wymaga osobnej weryfikacji.

### Sprawdzenia produkcji i pozostały zakres

Przed dodaniem opisanej wyżej blokady na rzeczywistej produkcji sprawdzono syntetyczne,
nieutrwalane payloady. `/api/status` zwracał
HTTP 200 i `setupAvailable=false`; zwykły czat i analiza Gemini bez Bearer tokenu zwracają 401;
żądanie z obcym Origin zwraca 403; `/api/setup` zwraca 404. Moduł zdrowia zwraca 200 z
`provider=local`, a analiza bez zgody modelu zwraca 200 z `source=technical` i
`needsReview=true`. Powtórzono żądania POST pod własną domeną, potwierdzając poprawne
sprawdzenie pochodzenia. Lokalnie przeszło 50/50 testów web, TypeScript i produkcyjny build.

Te kontrole nie potwierdzają jeszcze pełnej rozmowy zalogowanego klienta na produkcji ani
realnego filmu z telefonu. Publiczna rejestracja zachowuje opisane wyżej ograniczenie SMTP.
Same ograniczenia pamięci procesu nie zapewniają trwałych limitów pomiędzy instancjami
serverless; przed publicznym pilotażem trzeba wdrożyć limit per konto i monitoring zużycia.
Klucz i treści rozmów nie mogą trafiać do logów błędów.

Kamera wymaga HTTPS lub lokalnego bezpiecznego kontekstu. Po wdrożeniu należy sprawdzić Safari
na iPhone i Chrome na Androidzie, odmowę dostępu, przerwanie nagrywania, przejście aplikacji w
tło, błąd przesyłania i odzyskanie istniejącego klipu bez ponawiania reakcji.

Nie aktywowano nowych planów płatnych, triali ani automatycznego dokupowania. Obecne wdrożenie
korzysta z istniejącego Vercel Pro; Supabase jest Free. Dostępny limit Gemini nie stanowi
zgody na jego publiczne użycie w EOG. Przy wymaganiu Free publiczny dostęp do modelu
pozostaje wyłączony.
Gdyby projekt przenoszono do Hobby, ten plan dopuszcza **osobiste zastosowanie niekomercyjne**,
co nie pokrywa przyszłego pobierania opłat od klientów. Limity i warunki dostawców obowiązują
niezależnie od konfiguracji aplikacji. [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Supabase Free](https://supabase.com/pricing), [Gemini API — ceny](https://ai.google.dev/gemini-api/docs/pricing).
