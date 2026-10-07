# Sprawdzenia wersji 0.2

Data: 2026-10-07. macOS, Python 3.14.3, biblioteka standardowa i SQLite FTS5.
Wyniki dotyczą plików, relacji, indeksu i pamięci. Nie mierzą skuteczności klinicznej.

## Wyniki

| Element | Potwierdzony wynik |
|---|---|
| Indeks | 290 kart i 173 wpisy źródłowe |
| Domeny | 210 behawiorystycznych, 40 metod, 40 zdrowia |
| Gatunki | 166 kart dostępnych dla psa, 162 dla kota; 38 wspólnych |
| Nowe twierdzenia | 420 claims w 210 kartach; 80 starszych kart oczekuje dokładniejszej redakcji |
| Kwestionariusz | 94 pytania, 12 sekcji, 85 możliwych pytań dla jednego gatunku; niezwalidowany |
| Etogram | 80 autorskich kodów: 69 wspólnych, 4 pies, 7 kot; niezwalidowany |
| Testy | 33/33 przeszło, z ResourceWarning ustawionym jako błąd |
| Przykłady wyszukiwania zdrowia | 11/11 autorskich zapytań odnajduje oczekiwaną kartę w pierwszych 3 wynikach |
| JSON | 44 pliki poprawnie parsowane |
| Lokalne linki | 76 sprawdzone, 0 brakujących plików |
| Manifest | 12 hashy zgodnych z dokładnymi bajtami wejść; manifest wewnątrz SQLite zgodny z plikiem |
| Referencje SQLite | PRAGMA foreign_key_check bez błędów |
| Bibliografia | 20 snapshotów API, 186 rekordów, 138 kandydatów po deduplikacji |
| Publiczny HF REST | 2 udane anonimowe GET, 4 rekordy metadanych; bez wag i danych |
| Prywatność przykładów | Demo syntetyczne, 0 realnych prywatnych baz SQLite w data/private |

Przykłady wyszukiwania to testy regresji indeksu i polskich wariantów słów. Nie są próbą
reprezentatywną, testem rozpoznawania chorób ani oceną skuteczności triażu. Demo zawiera
opisową pamięć syntetycznego kota; zwrócone karty i pamięć mają właściwy gatunek.
external_model_called=false i video_analyzed=false.

## Zakres testów

17 testów fundamentu: integralność i gatunki źródeł, typy danych, nieznane referencje,
duplikaty, wsparcie kategorii dowodu, hash odczytanej wersji, FTS i polskie znaki,
brak tworzenia pustej bazy przy błędzie ścieżki, kontekst i niewymyślanie cech,
rodzaj adnotacji, czas, izolacja pamięci, usuwanie kaskadowe i czyszczenie treści,
kontrakt kwestionariusza oraz brak abstraktów w automatycznych importach bibliograficznych.

7 testów wiedzy v2: relacje claims i podstawa twierdzeń, niediagnostyczny kontrakt zdrowia,
indeksowanie tekstu wyłącznie z claims, zgodność domyślnej domeny w SQL/manifeście,
liczniki domen, przykłady językowe/izolacja gatunków, niecałkowite limity,
brak zamiany słów funkcyjnych na terminy medyczne oraz kontrakt etogramu.

9 testów HF: dozwolone publiczne endpointy i GET, limit przed połączeniem, brak tokena
mimo zmiennej HF_TOKEN, brak paginacji i odczytów repozytoriów, selekcja metadanych,
licencje bez dopisywania uprawnień, odrzucanie prywatnych wpisów i zachowanie starszych snapshotów.

```bash
python3 -m copowiesz build-kb
python3 -W error::ResourceWarning -m unittest discover -s tests -v
python3 scripts/demo.py --output examples/context_cat_synthetic.json
python3 scripts/build_catalog.py
python3 scripts/audit_knowledge.py
```

## Niezależny przegląd i poprawki

Drugi agent odtworzył cztery usterki integracji v2: brak claims w indeksie, różne
domyślne domeny w SQL i manifeście, pominięcie 55 źródeł metod/zdrowia w katalogu
oraz dopuszczenie limitu bool/float. Poprawki mają testy i potwierdzone reprodukcje.
Oddzielny przegląd 40 kart zdrowia doprecyzował opis epizodu napadowego i kolejność
pomocy przy podejrzeniu przegrzania. To ocena redakcyjna, nie recenzja lekarza.

Audyt wykrył również problem potocznych zapytań. Dodano wybrane warianty i regresje
dla „zipie” oraz „siusiać”, ale nie rozwiązuje to semantycznego doboru wiedzy dla
dowolnej wypowiedzi. prepare_context nadal bierze wyniki leksykalne, a needs_human_review
jest flagą metadanych, bez oceny realnego pacjenta. To bramka przed wdrożeniem czatu zdrowotnego.

## Rzeczywisty zakres lektury i integracji

120 nowych wpisów opisuje zakres odczytu: 52 abstrakty, 47 zestawów wybranych sekcji,
14 publicznych opisów/fragmentów i 7 odczytów wytycznych. 53 starsze wpisy nie mają
tej informacji w ustrukturyzowanym polu. Status nowych źródeł to
editorial_screened_expert_pending; wszystkie mają retraction_check=not_checked.
Odczyt korekty VIDOPET nie stanowi kontroli całej bibliografii.

173 wpisy/URL mogą zawierać tę samą publikację pod różnymi stronami; nie są 173
niezależnymi badaniami. Pomocniczy algorytm DOI/tytułu wyodrębnia 170 kandydatów
tożsamości źródeł, ale nie rozstrzyga wersji i niezależności próby. 138 rekordów
bibliografii pozostaje kandydatami, poza opracowanymi wnioskami. Szczegóły w
[raporcie jakości](KNOWLEDGE_COVERAGE.md).

Consensus: udana próba na tier=free. Scite: zainstalowany, próba USER_NOT_LOGGED_IN,
aktualny dostęp MCP płatny/trial — nieużywany. HF: instalacja potwierdzona, natywny
konektor Tool not found; osobny publiczny klient REST przetestowany. Supabase: odczyt
listy projektów udany, brak wybranego COPOWIESZ. Nie zmieniono danych innej aplikacji.
Źródła warunków bezpłatności: [INTEGRATIONS.md](INTEGRATIONS.md).

Pierwsze publiczne odczyty sieciowe w sandboxie miały błąd DNS. Ograniczone odczyty
metadanych po zezwoleniu środowiska przeszły; nie było odrzucenia automatycznej oceny
uprawnień. Nie aktywowano płatnych usług, triali, zakupów ani zdalnego treningu.

## Granice

Brak nagrań i kwestionariuszy realnych zwierząt. Nie ma treningu, walidacji osobowości,
polskich norm, sprawdzonego detektora emocji, diagnozy obrazu, pilotażu klinicznego,
generowanego dialogu ani przetestowanej ochrony produkcyjnego LLM. Nie wykonano pełnego
niezależnego przeglądu kart przez lekarza i behawiorystę. Backend wielu właścicieli,
polityki chmurowe i mowa pozostają niewdrożone.
