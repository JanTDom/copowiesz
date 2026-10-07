# Zbiór huggingface_catalog

Surowe snapshoty selekcji publicznych metadanych Hub REST API:
data/raw/api/huggingface/. Źródłem są anonimowe GET /api/models i /api/datasets.
Każdy import tworzy nowy plik; nie nadpisuje poprzednich odczytów. Nie zawiera wag,
przykładów danych, treści kart, prywatnej pamięci ani nagrań.

Prawa są jedynie deklaracjami z metadanych i tagów, zawsze license_status=not_verified.
Wpisy pozostają kandydatami, poza indeksem behawiorystycznym i poza profilem zwierzaka.
Wyszukiwanie po nazwie repozytorium nie potwierdza przydatności do psa lub kota.

Kontrakt, próbne snapshoty, limity, odtwarzanie i instrukcje:
[HUGGING_FACE_FREE.md](../HUGGING_FACE_FREE.md).
