# Aplikacja webowa — lokalnie i wdrożenie

Stan konfiguracji: 7 października 2026. Aplikacja znajduje się w `web/`; publiczny fundament
Python i dane źródłowe pozostają w katalogu głównym. Supabase utworzono i przetestowano w chmurze
w oddzielnej organizacji Free; stan GitHub, Vercel i DNS należy potwierdzić w dalszych częściach
dokumentu po zakończeniu tych niezależnych etapów wdrożenia.

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

Publiczne wartości zapisano w lokalnym `web/.env.local`, zachowując istniejący serwerowy
klucz Gemini. W konfiguracji przyszłego środowiska wymagane są:

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

Przygotowano `.github/workflows/ci.yml`: Node.js 24, Python 3.13, `npm ci`, odtwarzalność eksportu,
testy domeny/API bez zewnętrznych kluczy, TypeScript i build, a także testy fundamentu Python.
Workflow ma tylko `contents: read`, nie publikuje aplikacji, nie stosuje migracji i nie wymaga
sekretów. Został przygotowany lokalnie; wykonanie na GitHub pozostaje niewdrożone.

Przy późniejszym zakładaniu repozytorium należy dodać kod, lockfile, publiczny fundament i
migracje. `web/.env.local`, pozostałe pliki `.env` z sekretami, `data/private`, prawdziwe nagrania,
`node_modules` oraz artefakty `.next` muszą pozostawać poza Git. Zdalnego repozytorium i push
nie wykonano w tym etapie.

## Vercel

Przyszły import repozytorium GitHub do Vercel powinien mieć **Root Directory: `web`**, framework
Next.js, Node.js 24 i build `npm run build`. Publiczne JSON fundamentu są już w `web/src/data`,
więc build nie wymaga dostępu do plików z nadrzędnego katalogu ani Pythona.

`GEMINI_API_KEY` trafia wyłącznie do serwerowych Environment Variables Vercel, a publiczne
Supabase URL/publishable key do wartości `NEXT_PUBLIC_`. W chmurze endpoint lokalnego zapisu
klucza powinien być niedostępny. Wywołanie płynnej rozmowy wymaga zalogowania i sprawdzonego
Bearer tokenu Supabase na serwerze. Same ograniczenia pamięci procesu nie zapewniają trwałych
limitów pomiędzy instancjami serverless; przed publicznym pilotażem trzeba wdrożyć limit per konto
i monitoring zużycia. Klucz i treści rozmów nie mogą trafiać do logów błędów.

Kamera wymaga HTTPS lub lokalnego bezpiecznego kontekstu. Po wdrożeniu należy sprawdzić Safari
na iPhone i Chrome na Androidzie, odmowę dostępu, przerwanie nagrywania, przejście aplikacji w
tło, błąd przesyłania i odzyskanie istniejącego klipu bez ponawiania reakcji.

Nie aktywowano planów płatnych, triali ani automatycznego dokupowania. Vercel Hobby jest
bezpłatny, ale dopuszcza **osobiste zastosowanie niekomercyjne**. Wymóg darmowego hostingu
nie pokrywa przyszłego pobierania opłat od klientów na tym planie. Supabase Free i Gemini Free
mają własne limity oraz warunki; ich dostępność należy sprawdzić dla wybranego projektu/modelu
przed wdrożeniem. [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Supabase Free](https://supabase.com/pricing), [Gemini API — ceny](https://ai.google.dev/gemini-api/docs/pricing).
