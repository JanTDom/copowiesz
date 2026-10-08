# Stan realizacji i dalsze etapy

Stan na 8 października 2026. Rozmowa z własnym psem lub kotem jest główną funkcją działającej
aplikacji Next.js w `web/`. Test, filmy, pamięć i wiedza wspierają indywidualność rozmówcy.
Stan publikacji GitHub/Vercel/DNS opisuje [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md).

## Zrealizowane — fundament i pierwsza aplikacja

- 290 autorskich polskich kart i 173 źródła, filtrowane osobno dla psa i kota oraz zachowania,
  metod i zdrowia. Fundament Python ma odtwarzalny indeks SQLite FTS5 i lokalną pamięć opisową.
- Pełny kwestionariusz w interfejsie: 85 pytań i 11 obszarów dla wybranego gatunku; źródłowo
  94 pytania / 12 sekcji. Każdy krok jest zapisywany; „nie wiem”, „nie dotyczy”, pominięcie
  i odpowiedź zerowa pozostają różnymi stanami.
- Cztery kierowane konteksty wideo: codzienność, znany głos i imię, znana zabawa, dobrowolny
  kontakt. Kamera, import, rzeczywiste metadane, lokalny podgląd i pobranie klipu; bezpieczne
  przerwanie oraz pominięcie bez zaliczenia kontekstu i bez wymuszania reakcji.
- Rozmowa po polsku przez Gemini `gemini-3.1-flash-lite`, z podstawą odpowiedzi, etykietą
  dostawcy i oznaczeniem demonstracji podczas przygotowania. Przy braku modelu/limitach
  dostępna jest jawna odpowiedź lokalna oparta na zapisach.
- Analiza wideo Gemini po odrębnej zgodzie: opis modelu pozostaje niezweryfikowany, a klatki
  nie są traktowane jak ciągły film z dźwiękiem. Bez zgody działa kontrola parametrów.
- Jawna pamięć relacji opiekuna i potwierdzonych adnotacji z odnośnikiem do klipu. Lokalny
  eksport/import ze sprawdzaniem struktury, usuwanie profili i bajtów lokalnych nagrań.
- Supabase w oddzielnej organizacji COPOWIESZ Free, Frankfurt, z prywatnymi profilami,
  kluczami obcymi właściciela i prywatnym Storage. RLS przetestowane na chmurowym PostgreSQL.
- Siedem rozszerzeń rozmowy i historii: osobisty finał przygotowania, tematy z zapisów,
  „Nasz tydzień”, sesja głosowa, opis sytuacji z odwołaniem do klipu, prywatny album oraz
  karta PNG. [Zakres, prywatność i granice sprawdzeń](ENGAGEMENT_FEATURES.md).

Materiał jest gotowy do rozmowy o pełnym zakresie profilu po przejrzeniu 85 pytań i zapisaniu
czterech rzeczywistych klipów. Pozostałe braki, relacje opiekuna i wyniki modelu nadal wymagają
ostrożnego traktowania. Licznik gotowości opisuje pokrycie materiału, nie naukową jakość profilu.
Wersja ta nie wylicza osobowości ani nie diagnozuje chorób.

Sprawdzenia: **119 testów web + 33 Python, TypeScript i build; wcześniejsze 14/14 RLS
i 43/43 płatności pgTAP na Supabase**. Pierwszy etap obejmował 18 sprawdzeń interfejsu
z syntetycznymi materiałami. Interfejs sprawdzono na 1440 × 1000
oraz 390 × 844; wykonano po jednym rzeczywistym wywołaniu Gemini dla syntetycznej rozmowy
i filmu. Testy oprogramowania nie zastępują niezależnej oceny behawiorystycznej i klinicznej.

## Przed udostępnieniem szerszemu pilotażowi

Domena i publiczny deployment działają; nowe wydania nadal wymagają sprawdzenia po publikacji.
Publiczna rejestracja email wymaga
własnego SMTP; domyślna poczta Supabase obsługuje wyłącznie członków zespołu. Potwierdzanie
email pozostaje włączone, a konta anonimowe wyłączone. Włączenie kont gości wymaga osobnej
jawnej zgody na ten zakres uwierzytelniania; nie obchodzić odmowy kontroli uprawnień.

Sprawdzić prawdziwy upload, podpisany podgląd i usuwanie bajtów przez Storage API z dwóch
zalogowanych kont. Obecny test pgTAP potwierdza RLS i metadane, bez transmisji prawdziwych
filmów. Przetestować Chrome/Android i Safari/iPhone: zgodę/odmowę kamery, mikrofon, przejście
w tło, przerwanie, import formatów telefonu, błąd sieci i odzyskanie istniejącego klipu.
Standardowy `NotAllowedError` w dotychczasowym QA był kontrolowanym błędem; rzeczywista
odmowa na fizycznym telefonie nadal pozostaje do sprawdzenia.

Obecna synchronizacja jest jawna i używa ostatniego zapisu. Dodać rozwiązanie konfliktów
wielu urządzeń, historię korekt oraz świadomy cykl usuwania profilu, filmów, eksportów i kopii.
Doprecyzować wersjonowanie zgód i retencję przed zbieraniem materiałów pilotażu.

Zachować ograniczenie bezpłatności. Supabase COPOWIESZ ma plan Free; Vercel używa istniejącego
zespołu Pro bez aktywacji nowego planu. Sprawdzić zużycie i warunki rozliczeń, nie utożsamiać
istniejącej subskrypcji z gwarancją braku opłat za transfer lub funkcje. Model Gemini nie
potwierdza planu klucza. Potrzebne są trwałe limity per konto i monitoring; licznik pojedynczego
procesu nie zapewnia wspólnego limitu wielu instancji serverless. Nie aktywować płatnego modelu,
triala ani automatycznego dokupowania po wyczerpaniu Free.

## Następny etap — niezależny przegląd wiedzy i pytań

Przejrzeć karty z lekarzem weterynarii zajmującym się zachowaniem oraz specjalistami psów
i kotów. Poszerzać pokrycie według [KNOWLEDGE_PLAN.md](KNOWLEDGE_PLAN.md). Dla każdej syntezy
wersjonować status przeglądu, konflikty dowodów i termin ponownej oceny. Zweryfikować prawa
konkretnych materiałów, danych i modeli przed szerszym lub komercyjnym użyciem.

Sprawdzić trafność pytań, polskie konstrukty, powtarzalność odpowiedzi oraz obciążenie opiekuna.
Autorski kwestionariusz nie zawiera pozycji C-BARQ/Fe-BARQ i nie jest zamiennikiem zwalidowanego
narzędzia psychometrycznego. Dopuszczenie karty lub pytania do pilotażu powinno mieć jawny
przegląd merytoryczny, a nie tylko poprawną strukturę JSON.

## Następny etap — walidacja analizy nagrań

Sprawdzić wykonalność bezpiecznych zadań osobno dla psa i kota. Opracować etogram, instrukcję
adnotacji i zgodność ekspertów. Zbierać spokojne naturalne zachowania za świadomą zgodą;
bez prowokowania bólu, lęku lub agresji.

Obecny opis Gemini jest wyjściem modelu wymagającym oceny. Nie ma własnego wytrenowanego
modelu biometrów ani zwalidowanych detektorów emocji i osobowości. Zaczynać od widocznych
czynności; metryki i kryteria odrzucania materiału ustalić z ekspertami przed badaniem.
Podział train/validation/test grupować po zwierzęciu i gospodarstwie. Ocenić inne kamery,
budowę ciała, sierść, wiek, światło, zasłonięcia i błędy wynikające z próbkowania klipów.

## Następny etap — profil i jakość rozmowy

Osobno dla gatunków zbadać powtarzalność, rzetelność między oceniającymi oraz trafność
zbieżną/różnicową tendencji. Wersjonować hipotezy, przy brakach zwracać „nie wiemy”. Zdrowie,
przejściowy stan i trwałe tendencje wymagają osobnych oznaczeń.

Rozbudować niezależne testy rozmowy: fikcyjne wspomnienia, brakujące lub niepoparte cytowania,
fałszywa pewność, pomyłki gatunku, zmiany zdrowia, korekty opiekuna i materiał bez zwierzęcia.
Ocenić możliwą do sprawdzenia podstawę odpowiedzi oraz sposób oznaczenia wyobrażonego głosu.

## Pilotaż użyteczności

Sprawdzić, czy opiekun lepiej opisuje zachowanie, rozumie ograniczenia i niepewność, wybiera
bezpieczne działania i przekazuje przydatną historię ekspertowi. Mierzyć błędy i obciążenie
formularzem, możliwość przerwania, użyteczność pamięci oraz jakość rozmowy; sam czas spędzony
w aplikacji nie stanowi dowodu poprawności interpretacji.
