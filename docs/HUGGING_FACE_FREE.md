# Hugging Face — bezpłatny publiczny katalog

Stan na 7 października 2026. Hugging Face jest w COPOWIESZ dopuszczony wyłącznie do
wyszukiwania publicznych metadanych modeli i zbiorów. Działa mały klient REST w
`scripts/fetch_hf_catalog.py`, napisany w bibliotece standardowej Python 3.11+.

| Element | Rzeczywisty stan |
|---|---|
| Natywny konektor w Codex | Instalacja zgłoszona jako `installed=true`; wywołanie `model_search` zwróciło `Tool not found`. Narzędzie nie działa w tej sesji. |
| Publiczny Hub REST API | Przygotowane i przetestowane: 2 udane anonimowe zapytania GET, po 2 rekordy. Nie wymagały konta ani tokena. |
| Zapis katalogu | Przetestowane: nowe wersjonowane snapshoty metadanych w `data/raw/api/huggingface/`. |
| Analiza wideo, uruchomienie modelu lub użycie zbioru | Niewdrożone; wpis w katalogu nie jest integracją modelu. |

Klient REST jest osobnym połączeniem z publicznym katalogiem. Nie naprawia natywnego
konektora, nie zmienia globalnej instalacji i nie korzysta z konta HF.

## Użycie

Komendy uruchamiaj z katalogu projektu. Zapytanie jest ogólną nazwą lub fragmentem nazwy
repozytorium; nie wpisuj danych opiekuna, zwierzęcia ani treści prywatnej pamięci.

```bash
python3 scripts/fetch_hf_catalog.py VideoMAE --kind models --limit 2
python3 scripts/fetch_hf_catalog.py animal --kind datasets --limit 2
```

Domyślny limit to 5, dozwolony zakres to 1–20. Jedno uruchomienie wysyła jedno GET do
`https://huggingface.co/api/models` albo `https://huggingface.co/api/datasets`.
Nie ma paginacji, ponawiania w pętli, pobierania plików ani kolejnych zapytań do
poszczególnych repozytoriów. Parametr `expand[]` ogranicza żądane właściwości; pełne
`cardData` służy jedynie do wybrania deklaracji licencji i nie jest zapisywane w całości.
`search` służy do szukania nazw repozytoriów, więc nie jest przeglądem literatury ani
oceną trafności naukowej. Semantykę parametrów opisuje
[oficjalna dokumentacja list modeli i datasetów](https://huggingface.co/docs/huggingface_hub/en/package_reference/hf_api).

Skrypt nie odczytuje `HF_TOKEN`, zapisanych poświadczeń, pamięci zwierzaka ani plików wideo.
Nie wysyła plików. Do żądania trafiają jedynie ogólne zapytanie, limit i nazwy pól
metadanych. Endpointy mają stałą listę dozwoloną; przekierowania są odrzucane.
Odpowiedź większa niż 2 MB jest odrzucana bez snapshotu.

## Dane i licencje

Snapshot jest selekcją metadanych odpowiedzi, a nie pełnym archiwum HTTP. Nowe zapytanie
tworzy nowy plik `{models|datasets}_{timestamp}_{query_hash}.json` i nie nadpisuje importów.
Wspólne pola obejmują dostawcę, zapytanie, limit, URL GET, czas UTC, liczbę rekordów oraz
informację o braku uwierzytelnienia. Rekord zachowuje identyfikator, stronę repozytorium,
autora, daty, liczbę pobrań/polubień, flagi `private`/`gated`, tagi, a dla modelu także
`pipeline_tag`. Liczby pobrań i polubień pochodzą z API; nie są oceną jakości lub dopasowania
do psa/kota. Rekord oznaczony `private=true` jest odrzucany.

Licencje to wyłącznie deklaracje z metadanych karty (`license`, `license_name`, `license_link`)
oraz tagów `license:*`. Każdy snapshot i rekord ma `license_status=not_verified`.
Brak deklaracji pozostaje brakiem danych, a `other` wymaga odrębnego sprawdzenia konkretnej
licencji. Skrypt nie otwiera linków licencyjnych ani nie orzeka o prawach do materiału.
Hugging Face opisuje deklarowanie licencji w metadanych repozytorium i potrzebę sprawdzania
praw do kodu/danych w [oficjalnej dokumentacji licencji](https://huggingface.co/docs/hub/en/repositories-licenses).

Nie zapisujemy treści kart README, konfiguracji modeli, wag, list plików, przykładów
datasetów, obrazów ani nagrań. Wszystkie wpisy pozostają kandydatami
`candidate_not_behavioral_evidence`. Nie trafiają do indeksu wiedzy behawiorystycznej,
kwestionariusza ani pamięci. Ręczny przegląd musi ustalić gatunek, zadanie, pochodzenie,
ograniczenia i prawa przed jakimkolwiek przyszłym użyciem modelu lub danych.

## Próby i ograniczenia

7 października 2026 wykonano następujące rzeczywiste próby bez konta i tokena:

| Próba | Wynik | Zapis |
|---|---|---|
| `models`, `VideoMAE`, limit 2 | 2 rekordy, powodzenie; czas 09:35:22 UTC | `data/raw/api/huggingface/models_20261007T093522025503Z_fcf06caa72.json` |
| `datasets`, `animal`, limit 2 | 2 rekordy, powodzenie; czas 09:35:30 UTC | `data/raw/api/huggingface/datasets_20261007T093530208629Z_ab91a82d14.json` |

Najpierw oba odczyty w sandboxie zakończyły się błędem DNS
`nodename nor servname provided, or not known`; nie powstały snapshoty błędu.
Te same małe publiczne odczyty po zezwoleniu środowiska zakończyły się powodzeniem.
Próba potwierdza dostęp do list metadanych w tym momencie, a nie stałą dostępność sieci.
Wyniki `animal` obejmują m.in. nazwę gry Animal Crossing, co pokazuje konieczność ręcznej
oceny trafności. Cztery rekordy z prób nie są rekomendacją do COPOWIESZ.

Dziewięć lokalnych testów sprawdza limit przed połączeniem, dozwolone endpointy,
brak zapytań per repozytorium, odrzucanie treści spoza listy pól, zachowanie niezweryfikowanych
licencji, brak domyślnej licencji, pomijanie prywatnych rekordów, brak nagłówka
uwierzytelnienia mimo obecności zmiennej `HF_TOKEN` i tworzenie nowych plików:

```bash
python3 -m unittest discover -s tests -p test_hf_catalog.py -v
```

Przy błędzie HTTP, sieci lub formatu skrypt kończy się kodem 1. Przy HTTP 429 należy
poczekać na odnowienie limitu i ponowić ręcznie później. Dokumentacja dostawcy rozróżnia
zapytania do Hub API od pobierania plików i przewiduje anonimowe limity per IP;
limity dla anonimowych i darmowych użytkowników mogą się zmieniać. Nie gwarantujemy
stałej liczby zapytań: [Hub Rate limits](https://huggingface.co/docs/hub/en/rate-limits).

Nie aktywuj PRO, triali, Jobs, Inference Endpoints, zdalnej inferencji, Spaces,
płatnego hostingu ani automatycznego dokupowania użycia. Po osiągnięciu ograniczeń
projekt pozostaje przy lokalnych zasobach i oczekuje na odnowienie darmowego dostępu.
Publiczny katalog REST jest opisany w
[oficjalnej dokumentacji Hub API](https://huggingface.co/docs/hub/en/api), która odsyła do
aktualnej specyfikacji OpenAPI. Nie instalujemy SDK ani dodatkowych pakietów do tego klienta.
