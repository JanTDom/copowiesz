# Zbiór literature

Importer: `scripts/fetch_literature.py`; dostawcy Europe PMC i Crossref. Klucz API nie jest
wymagany do podstawowego wyszukiwania metadanych. Opcjonalny email Crossref służy do kontaktu
z dostawcą; nie wpisuj fikcyjnego adresu. Limity i dostępność zależą od dostawcy.

Surowe snapshoty: `data/raw/api/literature/{provider}_{timestamp}_{query_hash}.json`.
To selekcja pól bibliograficznych z odpowiedzi, a nie pełny snapshot HTTP. Przechowujemy zapytanie,
czas pobrania, identyfikatory, tytuł, autorów, datę, linki i deklaracje licencji. Nie zachowujemy
abstraktów ani pełnych tekstów. Każdy plik jest nowy, a zastąpienie istniejącego zabronione.

Każdy rekord ma status kandydata. Przegląd gatunku, jakości, praw i wniosków pozostaje ręczny.
Przetworzony katalog: `data/processed/literature/catalog.json`; odtwarzanie:
`python3 scripts/build_catalog.py`. Deduplikacja używa DOI, potem PMID lub identyfikatora dostawcy.
Wyniki tematów i lista kandydatów: `docs/LITERATURE_CANDIDATES.md`.
Nie ma automatycznej transformacji do `behavior_knowledge`; opis procesu jest w
`docs/KNOWLEDGE_PLAN.md`. Importy mogą obejmować prace niepasujące do zapytania lub duplikaty.

Przykłady:

```bash
python3 scripts/fetch_literature.py 'canine behavior questionnaire' --provider europepmc --limit 20
python3 scripts/fetch_literature.py 'feline personality' --provider crossref --limit 20
python3 scripts/seed_bibliography.py --limit 10
python3 scripts/build_catalog.py
```

Dokumentacja dostawców: [Europe PMC REST](https://europepmc.org/RestfulWebService),
[Crossref API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/).
Wyniki faktycznych prób sieciowych są w `docs/VALIDATION.md`.
