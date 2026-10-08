# COPOWIESZ — kontekst projektu

Projekt pomaga polskojęzycznemu opiekunowi poznać indywidualne zachowanie psa lub kota,
a następnie rozmawiać z jego cyfrową reprezentacją. Pracuj po polsku w dokumentach i treści produktu.

Kluczowa funkcja wskazana przez użytkownika: rozmowa z WŁASNYM psem lub kotem. Rozmowa ma być
głównym ekranem aplikacji i podstawową wartością produktu. Wiedza, pytania, nagrania i historia
wspierają indywidualność rozmówcy; krótki start powinien prowadzić do pierwszej rozmowy,
przy czym użytkownik doprecyzował wymaganie pełnego przekrojowego testu oraz kierowanych
nagrań określonych reakcji. Są to wymagane części przygotowania osobistego profilu. Przed ich
ukończeniem można pokazać oznaczoną demonstrację, bez udawania gotowej personalizacji.
Etapować przygotowanie, zachować odpowiedzi „nie wiem” i bezpieczne przerwanie nagrania;
niemożliwe zadanie oznaczać jako brak danych, bez wymuszania reakcji.

## Zasady domeny

- Oddzielaj opis obserwacji, relację opiekuna, hipotezę, wynik modelu i decyzję eksperta.
- Nie deklaruj odczytywania myśli, przenoszenia świadomości ani dokładnego tłumaczenia szczekania/miauczenia.
- Osobno modeluj stabilne tendencje, przejściowy stan, zdrowie, kontekst i styl fikcyjnego głosu.
- Wiedza psa i kota wymaga filtrów gatunku. Rasa nie stanowi indywidualnej diagnozy ani osobowości.
- Wnioski wymagają źródła i ograniczeń. Nie wymyślaj cytowań, progów klinicznych ani procentów pewności.
- Preferuj badania pierwotne i aktualne wytyczne weterynaryjne. Przechowuj metadane i oryginalne syntezy;
  pełne teksty, narzędzia psychometryczne, dane i wagi modeli importuj zgodnie z ich konkretnymi prawami.
- Zbieraj spokojne naturalne zachowania. Nie projektuj zadań prowokujących lęk, ból lub agresję.

## Praca z plikami

- Zacznij od README.md, docs/PRODUCT_BRIEF.md i dokumentacji właściwego zbioru w docs/datasets/.
- Dane źródłowe: data/raw/. Przetworzone, odtwarzalne: data/processed/. Prywatna pamięć: data/private/.
- Nowa wersja surowych danych dostaje nowy plik; nie nadpisuj archiwalnych importów API.
- Sekrety i prawdziwe nagrania pozostają poza repozytorium; przykłady muszą być syntetyczne.
- Fundament Python używa Python 3.11+, SQLite FTS5 i biblioteki standardowej; nie wymaga API.
  Działająca aplikacja jest w `web/`: Next.js 16.4, React, TypeScript, Node.js 24 i npm.
  Klucz Gemini jest opcjonalny dla lokalnego formularza, pamięci, wiedzy i odpowiedzi z zapisów.
- Po zmianie schematów, pamięci lub wiedzy uruchom: python3 -m copowiesz build-kb
  oraz python3 -m unittest discover -s tests -v.
- Po zmianie aplikacji uruchom w `web/`: npm test, npm run typecheck i npm run build;
  dobieraj zakres do zmiany i nie powtarzaj zakończonych sprawdzeń bez nowego powodu.
  JSON fundamentu w `web/src/data/` jest generowany przez `web/scripts/export-foundation.mjs`;
  kontroluj odtwarzalność przez `--check`, nie edytuj wyeksportowanych danych ręcznie.
- Profile, odpowiedzi, rozmowy i bajty filmów aplikacji są domyślnie w IndexedDB. Prywatna
  pamięć SQLite CLI jest osobnym magazynem; nie zakładaj automatycznej synchronizacji.
  Import lokalny i odczyt chmurowy korzystają ze wspólnego sprawdzania zagnieżdżonych danych.
- Sprawdź źródła, relacje, rozdzielenie gatunków i możliwość usunięcia pamięci. Opisz rzeczywisty stan
  integracji: przygotowane / przetestowane / połączone / niewdrożone.

## Aktualny zakres

Użytkownik wymaga wyłącznie bezpłatnych funkcji. Consensus Free jest dostępny z limitem;
nie aktywuj planu płatnego. Scite jest zainstalowany, ale jego aktualny MCP wymaga planu
płatnego/triala — nie korzystaj z niego przy tym ograniczeniu. Hugging Face jest dopuszczony
wyłącznie jako bezpłatny publiczny katalog modeli/danych; nie uruchamiaj płatnych GPU Jobs,
Inference Endpoints, PRO, płatnego hostingu lub automatycznego dokupowania użycia.

Moduł zdrowia ma opisywać obserwowalne objawy, kilka możliwych przyczyn i pilność konsultacji,
ze źródłami weterynaryjnymi. Nie rozpoznawaj choroby z wyglądu, wideo lub kwestionariusza,
nie zalecaj leków/dawkowania i nie nadpisuj osobowości na podstawie choroby.

## Rzeczywisty stan aplikacji — 8 października 2026

- Działa interfejs z rozmową jako głównym ekranem, pełnym testem, nagraniami, historią,
  wiedzą i ustawieniami. Fundament zawiera 290 kart i 173 źródła. Kwestionariusz źródłowy
  ma 94 pytania / 12 sekcji; dany gatunek pokazuje 85 pytań w 11 obszarach.
- Przygotowanie wymaga przejrzenia 85 pytań oraz czterech rzeczywistych klipów: codzienność,
  znany głos/imię, znana zabawa i dobrowolny kontakt. „Nie wiem” jest poprawnym zapisem przeglądu,
  pozostając brakiem wiedzy. Przerwane/pominięte klipy nie zaliczają kontekstu. Gotowość
  opisuje pokrycie materiału, a nie naukową jakość lub procent osobowości.
- Rozszerzenia: osobisty finał przygotowania, tematy z własnych zapisów, „Nasz tydzień”, sesja
  głosowa, opis sytuacji z lokalnym podglądem klipu, prywatny album i karta PNG. IndexedDB v2
  zachowuje dotychczasowe dane i dodaje `photos`; JSON/chmura obejmują opisy albumu bez plików
  zdjęć. Czat nie przesyła bajtów filmu/zdjęć ani dźwięku. Udostępnianie karty jest jawne,
  bez wstępnie wybranych faktów. Szczegóły i granice: docs/ENGAGEMENT_FEATURES.md.
- Rozmowa używa Gemini `gemini-3.1-flash-lite`. Przy niepełnym profilu pozostaje oznaczoną
  demonstracją. Publiczny Vercel dopuszcza Gemini tylko gdy operator świadomie ustawi
  `GEMINI_PUBLIC_BILLING_CONFIRMED=true`; przy wymaganiu projektu Free pozostawić false.
  Flaga nie włącza ani nie weryfikuje rozliczeń. `getGeminiConfig` opisuje tylko klucz.
  Odpowiedź lokalna przy blokadzie, braku modelu lub limitach ma jawnego dostawcę `local`;
  nie oznaczaj jej jako Gemini. Głos i dyktowanie zależą od możliwości/uprawnień przeglądarki.
- Kamera/import zapisują film lokalnie. Gemini analizuje nagranie dopiero po odrębnej zgodzie
  wysłania filmu lub wybranych klatek do Google i po dopuszczeniu publicznego dostawcy.
  Zgoda filmu ani token konta nie omijają blokady. Wynik zawsze wymaga przeglądu; same klatki
  nie dowodzą ciągłego ruchu ani reakcji na dźwięk. Bez zgody działa kontrola parametrów.
  Obserwacja staje się relacją opiekuna dopiero po jego jawnym zapisie i potwierdzeniu.
- Nie wytrenowano własnego modelu osobowości, biometrów ani klinicznie zwalidowanego modelu
  interpretacji wideo. Karty, pytania i opisy modelu oczekują niezależnej oceny ekspertów.
- Supabase: organizacja COPOWIESZ Free `tzapzxvcpoixvhjyhvmw`, projekt `mdcrccpfwztqovhipljw`,
  Frankfurt. Wdrożono trzy tabele z RLS właściciela, złożone klucze obce i prywatny bucket.
  14/14 pgTAP na chmurze zakończono rollback syntetycznych danych; security advisors bez lints.
  Test metadanych nie potwierdza transferu i kasowania prawdziwych bajtów Storage API.
- Konta email zachowują potwierdzanie adresu; domyślny SMTP obsługuje tylko członków zespołu.
  Konta anonimowe pozostają wyłączone. Włączenie kont gości wymaga jawnej odrębnej zgody
  użytkownika na ten zakres uwierzytelniania; nie obchodzić odrzucenia kontroli uprawnień.
- Nie używaj kluczy `service_role`/`sb_secret_` w kliencie ani autoryzacji przez `user_metadata`.
  `GEMINI_API_KEY` jest wyłącznie serwerowy. Do publicznego API modelu wymagaj zweryfikowanego
  Supabase Bearer tokenu. Żadne lokalne profile/nagrania nie trafiają do chmury automatycznie.
- Vercel skonfigurowano w istniejącym zespole Pro użytkownika, bez aktywacji nowego planu.
  To nie jest gwarancja zerowych rozliczeń za zużycie. Nie aktywuj płatnych dodatków, triali,
  automatycznego dokupowania ani fallbacku do płatnego modelu. Gemini API nie potwierdza
  planu klucza. Warunki Gemini wymagają Paid Services dla publicznych użytkowników EOG,
  Szwajcarii i UK; funkcje Gemini są 18+. Zasady Paid Services dotyczą danych z EOG także
  przy darmowym limicie. Nie przenosić ogólnego opisu Free na dane EOG. Źródło i szczegóły:
  docs/WEB_DEPLOYMENT.md. Nie włączaj rozliczeń ani flagi true bez odrębnej autoryzacji.
- Gate ma działać także w niskich funkcjach generowania i dostępności. Gdy zablokowany,
  `/api/status` raportuje klucz jako configured, available=false, publicAccessAllowed=false
  i policyNotice, bez zapytania do Auth/Google nawet z Bearer. Chat zwraca 200 local;
  analiza z wyrażoną zgodą zwraca technical z informacją, że materiału nie wysłano.
- Zweryfikowano 119 testów web i 33 Python, TypeScript i build, wcześniejsze 14 testów RLS
  i 43 płatności pgTAP oraz UI z syntetycznymi danymi. Mikrofon na fizycznym urządzeniu,
  zapis PNG w systemie i natywne udostępnianie telefonu wymagają osobnego sprawdzenia.
  Nie deklaruj walidacji ekspertów ani testów na fizycznym telefonie.

Stan wdrożenia GitHub/Vercel/DNS i ograniczenia usług sprawdzaj w docs/WEB_DEPLOYMENT.md;
to dokument aktualizowany po poszczególnych etapach, nie obietnica dostępności.
Zobacz docs/ROADMAP.md przed rozszerzaniem zakresu oraz docs/DESIGN_SYSTEM.md przed zmianą wyglądu.
