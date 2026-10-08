# COPOWIESZ

**Porozmawiaj ze swoim psem lub kotem. Po polsku.** Aplikacja tworzy cyfrowy głos konkretnego
zwierzaka na podstawie odpowiedzi opiekuna, wspólnej historii i kierowanych nagrań. Rozmowa
jest głównym ekranem; przy każdej odpowiedzi można sprawdzić jej dostępną podstawę.

Stan na 8 października 2026: działa aplikacja Next.js w `web/`, rozmowa lokalna i adapter Gemini, nagrywanie
w przeglądarce, lokalna pamięć i wyszukiwarka wiedzy. Prywatna baza Supabase została wdrożona
w oddzielnej organizacji Free. Konfiguracja wdrożenia GitHub/Vercel i domeny `copowiesz.pl`
jest opisana w [dokumencie wdrożenia](docs/WEB_DEPLOYMENT.md), który rozróżnia konfigurację,
testy i rzeczywistą dostępność usług.

Cyfrowy głos jest oznaczoną, wyobrażoną wypowiedzią. Nie odczytuje myśli, nie przenosi
świadomości i nie tłumaczy dosłownie szczekania ani miauczenia. Płynna rozmowa oraz ukończenie
formularza nie potwierdzają naukowej trafności modelu osobowości.

## Co działa

| Element | Rzeczywisty stan |
|---|---|
| Rozmowa po polsku | Odpowiedź lokalna z zapisów i adapter Gemini `gemini-3.1-flash-lite`; publiczny Vercel blokuje model bez potwierdzenia operatora, z jawnym komunikatem |
| Przygotowanie profilu | Pełne 85 pytań w 11 obszarach dla wybranego gatunku; zapis każdego kroku, odrębne „nie wiem”, „nie dotyczy”, pominięcie i zero |
| Kierowane nagrania | Cztery spokojne konteksty: codzienność, znany głos i imię, znana zabawa, dobrowolny kontakt; instrukcje, przerwanie i pominięcie |
| Kamera i import | `MediaRecorder`, import WebM/MP4/MOV odtwarzalnego przez przeglądarkę, metadane, podgląd, pobieranie i lokalny zapis filmu |
| Analiza nagrania | Kontrola parametrów; Gemini wymaga osobnej zgody i dopuszczonej konfiguracji dostawcy, a wynik wymaga przeglądu |
| Pamięć | Jawne relacje opiekuna i potwierdzone adnotacje filmu; wyniki modelu pozostają osobno; lokalny eksport/import i usuwanie profilu |
| Wiedza | 290 autorskich polskich kart i 173 źródła; filtry gatunku, domeny i wyszukiwania; źródła, ograniczenia i bezpieczne kroki |
| Zdrowie | Informacje dla opiekuna poza fikcyjnym głosem; obserwowalne sygnały, przykładowe przyczyny i pilność konsultacji, bez diagnozy lub dawkowania |
| Osobista rozmowa | Finał po 85 pytaniach i czterech rzeczywistych kontekstach wideo; tematy z własnych zapisów, albumu i brakujących odpowiedzi |
| Rozmowa głosowa | Jawne dyktowanie z poprawą tekstu, polski lektor, tempo, opcjonalny odczyt i przerwanie; dostępność zależy od przeglądarki |
| Zrozum sytuację | Opis opiekuna i kontekst, lokalny podgląd własnego klipu; do czatu nie przesyła się filmu, klatek ani dźwięku |
| Wasza historia | Zapisy, prywatny album zdjęć i chwil oraz „Nasz tydzień” z podstawami, bez wymyślonych wydarzeń |
| Karta zwierzaka | Lokalny PNG 1080 × 1350 z logo, wybranym zdjęciem i do trzech jawnie wybranych potwierdzonych faktów; bez automatycznej publikacji |
| Supabase | Projekt `copowiesz` w organizacji Free, Frankfurt; trzy prywatne tabele, prywatny bucket, RLS właściciela i klucze obce |
| Fundament Python | Odtwarzalny indeks SQLite FTS5, pamięć opisowa, katalog źródeł, import metadanych Europe PMC/Crossref/Hugging Face |
| Sprawdzenia | 119 testów web i 33 Python, TypeScript i build; wcześniejsze 14 testów RLS i 43 płatności pgTAP; UI nowych funkcji z syntetycznymi danymi |

Przygotowanie materiału obejmuje przejrzenie wszystkich 85 pytań oraz zapis czterech
rzeczywistych krótkich klipów w wymaganych kontekstach. Przed tym aplikacja oznacza rozmowę
jako demonstrację profilu w przygotowaniu. „Nie wiem” jest poprawnym zapisem przeglądu pytania,
ale pozostaje brakiem wiedzy. Przerwane i pominięte nagrania nie zaliczają kontekstu. Można
przejść dalej i wrócić przy naturalnej okazji, bez powtarzania bodźca do uzyskania reakcji.

Model nie dopisuje automatycznie obserwacji do pamięci. Opiekun ogląda film, opisuje własną
obserwację i jawnie ją potwierdza. Dla małych zgodnych klipów Gemini otrzymuje wideo; większe
lub inne odtwarzalne formaty mogą być reprezentowane przez sześć wybranych klatek bez dźwięku.
Szczegóły i ograniczenia są widoczne przy wyniku. Nie jest to zwalidowany pomiar emocji,
czasu reakcji, choroby ani trwałych cech zwierzęcia.

## Uruchomienie aplikacji

Wymagany Node.js 24 i npm. Z katalogu projektu:

```bash
cd web
npm ci
npm run dev
```

Otwórz `http://127.0.0.1:3000`. Dane aplikacji i bajty nagrań domyślnie pozostają w IndexedDB
tej przeglądarki, podobnie jak zdjęcia albumu. Wyczyszczenie danych przeglądarki może je usunąć;
eksport profilu, pobranie filmów i pobranie zdjęć albumu są osobnymi operacjami. Ręczna
synchronizacja profilu w chmurze obejmuje opisy albumu, bez jego plików zdjęć.

Bez klucza API działają formularz, pamięć, wiedza, kontrola techniczna nagrań oraz ograniczone
odpowiedzi oparte na zapisach. Lokalnie można skonfigurować klucz Gemini
w ustawieniach lub serwerowym `web/.env.local`; wzór zmiennych jest w `web/.env.example`.
Klucz ma nazwę `GEMINI_API_KEY`, bez prefiksu `NEXT_PUBLIC_`. Nie trafia do Git ani pamięci
przeglądarki. Analiza wideo wymaga odrębnej zgody wysłania filmu lub klatek do Google.

W bieżącym kodzie publiczny Vercel nie wywołuje Gemini bez
`GEMINI_PUBLIC_BILLING_CONFIRMED=true`. Przy wyłączonej fladze nawet z kluczem i zalogowanym
kontem działa oznaczona odpowiedź lokalna oraz kontrola techniczna filmu. Nie ustawiono tej
flagi na true ani nie aktywowano rozliczeń. Po dopuszczeniu dostawcy wymagany pozostaje
token Supabase zweryfikowany na serwerze. Potwierdzanie email
pozostaje włączone. Domyślny SMTP Supabase obsługuje wyłącznie adresy członków zespołu;
rejestracja email dla innych użytkowników wymaga własnego SMTP. Konta anonimowe pozostają
wyłączone. Sama konfiguracja Supabase nie przesyła automatycznie lokalnych profili ani filmów.

Publiczne Gemini w EOG wymaga dopuszczonej konfiguracji rozliczeniowej; konto Free nie
wystarcza. Funkcje Gemini są przeznaczone dla osób 18+. W EOG obowiązuje wyjątek dotyczący
zasad przetwarzania danych. Szczegółowy zakres, źródło oraz stan wdrożenia blokady:
[WEB_DEPLOYMENT.md](docs/WEB_DEPLOYMENT.md#warunki-publicznego-gemini-i-blokada-w-kodzie).

## Sprawdzenia i granice walidacji

Z katalogu głównego:

```bash
python3 -m copowiesz build-kb
python3 -m unittest discover -s tests -v
node web/scripts/export-foundation.mjs --check
```

Z `web/`:

```bash
npm test
npm run typecheck
npm run build
```

Sprawdzono strukturę danych, rozdzielenie gatunków, brak fikcyjnych wspomnień w lokalnej
odpowiedzi, reguły API, import niepoprawnych profili, zapis i usuwanie pamięci. Chmurowe
14/14 pgTAP potwierdziło izolację dwóch właścicieli oraz polityki metadanych Storage; wszystkie
syntetyczne rekordy wycofano przez `ROLLBACK`. Security advisors nie zgłosił ostrzeżeń.

18 sprawdzeń interfejsu obejmowało pełny test, rzeczywisty `MediaRecorder` z syntetyczną kamerą,
przerwanie, import filmu, potwierdzenie adnotacji, odświeżenie i widoki 1440 × 1000 / 390 × 844.
Wykonano także po jednym wywołaniu Gemini dla syntetycznej rozmowy i filmu. Standardowy błąd
odmowy kamery sprawdzono kontrolowanym błędem; rzeczywista odmowa na telefonach, Safari/iPhone,
Chrome/Android, przejście w tło oraz transfer bajtów przez zalogowany Storage API nadal
wymagają odrębnej weryfikacji. Nowy przegląd obejmuje album po odświeżeniu, edycję, przeniesienie
chwili do rozmowy, osobiste tematy, renderowanie karty PNG i jej unieważnienie oraz panel
głosowy. Mikrofon na fizycznym urządzeniu, zapis PNG w systemie i natywne udostępnianie telefonu
pozostają do sprawdzenia. To sprawdzenia oprogramowania, a nie walidacja behawiorystyczna.

Wiedza obejmuje 106 kart psa, 104 kota, 40 metod i 40 sygnałów zdrowotnych. Kwestionariusz
źródłowy ma 94 pytania w 12 sekcjach: 76 wspólnych i po 9 specyficznych dla gatunku. Karty
zachowują źródła i ograniczenia; 80 starszych kart ma wsparcie tematu zamiast cytowania
każdego twierdzenia. Niezależny przegląd ekspercki kart, pytań i wyników modelu pozostaje
konieczny. [Pokrycie i luki wiedzy](docs/KNOWLEDGE_COVERAGE.md).

## Fundament Python

Python 3.11+ z SQLite FTS5 i biblioteka standardowa; ta część nie wymaga API ani dodatkowych
pakietów. Działa niezależnie od aplikacji webowej.

```bash
python3 -m copowiesz search "dotyk kontakt ból" --species cat --limit 3
python3 -m copowiesz search "Kot ma żółte oczy" --species cat --domain health --limit 3
python3 scripts/demo.py
python3 -m copowiesz add-pet moj_kot Luna --species cat
python3 -m copowiesz observe moj_kot --behavior "Odsuwa się od ręki" --context "Po krótkim kontakcie podczas odpoczynku"
python3 -m copowiesz profile moj_kot --save-version
python3 -m copowiesz prepare-context moj_kot "dotyk kontakt ból"
```

Pamięć CLI znajduje się w `data/private/pet_memory.sqlite3`. Jest osobna od IndexedDB aplikacji;
nie istnieje automatyczna synchronizacja tych dwóch magazynów. `prepare-context` przygotowuje
kontekst, bez wywołania LLM. Usuwanie: `python3 -m copowiesz delete-pet moj_kot`. Oddzielne
eksporty, pliki i kopie zapasowe wymagają własnego usunięcia. Wszystkie przykłady są syntetyczne.

## Bibliografia i bezpłatne integracje

```bash
python3 scripts/fetch_literature.py 'canine behavior questionnaire' --provider europepmc --limit 20
python3 scripts/fetch_literature.py 'feline personality' --provider crossref --limit 20
python3 scripts/build_catalog.py
python3 scripts/audit_knowledge.py
python3 scripts/fetch_hf_catalog.py VideoMAE --kind models --limit 2
```

Te komendy pobierają publiczne metadane i wysyłają wyłącznie zapytanie naukowe, bez prywatnej
historii zwierzaka. Import nie staje się automatycznie opracowaną wiedzą. Hugging Face służy
jako bezpłatny katalog; nie uruchamiamy GPU Jobs, płatnych Endpoints, PRO ani zdalnej inferencji.
Consensus Free ma limit dostawcy. Scite pozostaje nieużywany z powodu wymaganego płatnego
planu lub triala. [Stan katalogu Hugging Face](docs/HUGGING_FACE_FREE.md).

Użytkownik wymaga bezpłatnych funkcji. Nie aktywowano nowego planu płatnego, triala ani
automatycznego dokupowania. Supabase COPOWIESZ ma plan Free. Vercel skonfigurowano w istniejącym
zespole Pro użytkownika; **nie oznacza to gwarancji zerowego zużycia rozliczanego przez Vercel**.
Gemini nie potrafi zweryfikować planu rozliczeniowego klucza. Zachowując wymaganie Free,
publiczny dostęp do modelu pozostaje zablokowany; lokalnej konfiguracji nie usunięto.
Flaga potwierdzenia jest deklaracją operatora, nie automatycznym włączeniem rozliczeń.
Przy niedopuszczonej konfiguracji, błędzie lub limitach aplikacja
pokazuje oznaczoną odpowiedź lokalną, bez przełączania na płatny model. Szczegóły ograniczeń
są w [WEB_DEPLOYMENT.md](docs/WEB_DEPLOYMENT.md).

## Dokumentacja

- [Założenia produktu](docs/PRODUCT_BRIEF.md) i [dalsze etapy](docs/ROADMAP.md).
- [Uruchomienie i wdrożenie](docs/WEB_DEPLOYMENT.md), [styl aplikacji](docs/DESIGN_SYSTEM.md).
- [Rozmowa, album, tydzień i karta zwierzaka](docs/ENGAGEMENT_FEATURES.md).
- [Wiedza psa](docs/behavior/dog.md), [kota](docs/behavior/cat.md), [sygnały zdrowotne](docs/HEALTH_SIGNALS.md).
- [Źródła](docs/SOURCES.md), [bibliografia do przeglądu](docs/LITERATURE_CANDIDATES.md), [lektury](docs/papers/INDEX.md).
- [Kwestionariusz](docs/QUESTIONNAIRES.md), [protokół wideo](docs/VIDEO_PROTOCOL.md), [zadania kierowane](docs/GUIDED_VIDEO_TASKS.md).
- [Zasady pracy](AGENTS.md). Starsze dokumenty zbiorów opisują przede wszystkim fundament Python;
  bieżący stan interfejsu i integracji określają ten README i dokument wdrożenia.
