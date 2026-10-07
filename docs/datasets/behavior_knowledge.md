# Zbiór behavior_knowledge

Źródło: ręcznie zebrane metadane publicznych wytycznych i publikacji oraz autorskie polskie
karty wiedzy. Przegląd źródeł: 2026-10-07. Nie zawiera pełnych książek, tekstów artykułów,
nagrań, wag modeli ani danych indywidualnych zwierząt.

Surowe wersje: `data/raw/manual/behavior_knowledge/*_sources.json` i `*_cards.json`.
Źródła są tablicami rekordów: id, title, url, publisher, year, kind, species, evidence_level,
license_status, reviewed_at, notes. Karty: id, species, topic, title, observation,
possible_interpretations, confounders, safe_next_steps, escalation, evidence_level,
source_ids, limitations, tags.

Wersja v2 dodaje źródłom doi, study_design, population, access_basis, review_status,
retraction_check. Karty mogą mieć domain=behavior/methods/health oraz claims z id, text,
basis=source_finding/project_recommendation, source_ids, locator i uncertainty. Twierdzenie
musi odwoływać się do źródła przypisanego karcie. Starsze 80 kart oczekuje redakcji twierdzeń.
clinical_reference odróżnia kliniczny przegląd/edukację od badania pierwotnego; review w kind
oznacza opublikowany przegląd. Nie są to oceny liczbowe siły dowodu.

Karty zdrowia wymagają domain=health, not_diagnostic=true, claims i konsultacji weterynaryjnej.
Możliwe przyczyny są przykładami, nie rankingiem diagnoz. Szczegóły: [HEALTH_SIGNALS.md](../HEALTH_SIGNALS.md).

Przetworzone: `data/processed/behavior_knowledge/knowledge.sqlite3` i manifest z SHA256
wejść, liczonymi z dokładnie tych bajtów, które zostały zaindeksowane. Manifest jest też w tabeli
`metadata` bazy. Odtwarzanie: `python3 -m copowiesz build-kb`. Ładowanie surowych danych:
`copowiesz.core.load_raw`; wyszukiwanie: `search_knowledge` z obowiązkowym gatunkiem.
Opcjonalny domain oddziela wiedzę medyczną i metody. Indeks obejmuje tekst claims i jawne
warianty polskich słów; pierwsze 24 unikatowe tokeny zapytania, maksymalnie 20 wyników.
Nie rozumie negacji i nie jest triage. Raport jakości: `python3 scripts/audit_knowledge.py`.

Walidacja sprawdza unikatowe ID, odniesienia do źródeł, zgodność gatunków, podstawowe pola,
adresy HTTPS, daty i listy. Nie jest recenzją merytoryczną, testem wiarygodności URL ani
przeglądem systematycznym. Brak karty oznacza brak pokrycia w tej wersji, nie brak znaczenia zachowania.

Karty są ostrożnymi syntezami; źródła nie licencjonują automatycznie komercyjnego wykorzystania
pełnych materiałów. Przed kolejną wersją zachować poprzednią i nadać jej identyfikator wydania.
Rzeczywiste liczby rekordów i wynik sprawdzeń znajdują się w `docs/VALIDATION.md` i manifeście.
