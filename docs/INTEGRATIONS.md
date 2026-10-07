# Integracje — stan potwierdzony

Stan sprawdzony 7 października 2026. Rozszerzenia Codex działają na poziomie konta/aplikacji;
nie są automatycznie zależnościami runtime projektu ani umową z dostawcą.

| Integracja | Stan | Rola w COPOWIESZ |
|---|---|---|
| Europe PMC | Adapter przygotowany, próba sieciowa udana | Bibliografia do ręcznego przeglądu, identyfikatory PubMed/PMC i DOI |
| Crossref | Adapter przygotowany, próba sieciowa udana | Bibliografia, DOI, deklaracje licencji i metadane wydawców |
| SQLite FTS5 | Działa lokalnie, testy zaliczone | Indeks kart z filtrem gatunku |
| Lokalna pamięć SQLite | Działa lokalnie, testy zaliczone | Obserwacje, profil opisowy, wersje, usuwanie powiązanych wierszy |
| Supabase | Rozszerzenie zainstalowane; dostęp do listy projektów potwierdzony | Kandydat na konta, PostgreSQL i prywatne pliki. Brak wybranego projektu COPOWIESZ |
| Consensus | Zainstalowany i połączony; wyszukiwanie Free przeszło | Bezpłatne wyszukiwanie literatury w limicie konta |
| Scite | Zainstalowany, niepołączony; wyłączony z użycia przy wymaganiu bezpłatności | Aktualny MCP wymaga płatnego planu lub triala |
| Hugging Face | Zainstalowany; natywny model_search: Tool not found. Publiczny REST przetestowany | Bezpłatny anonimowy katalog metadanych; bez wag, treningu i zdalnej inferencji |
| Model językowy / mowa | Prompt i kontrakt przygotowane; brak dostawcy runtime | Polska rozmowa i wyobrażony głos |
| Analiza wideo | Protokół i katalog przygotowane; brak działającego modelu | Opis i pomiar zachowań z późniejszą walidacją |

Podczas wyszukania projektów Supabase nie znaleziono nazwy COPOWIESZ. Nie podłączono projektu
innej aplikacji ani nie zmieniono jego danych. Wybór docelowego projektu pozostaje otwarty.
`.env.example` dokumentuje przyszłe zmienne; prototyp ich nie używa.

Instalacja Consensus, Scite i Hugging Face została potwierdzona przez użytkownika oraz bieżący odczyt
stanu rozszerzeń (`installed=true`, `ENABLED`). Komunikat o upływie czasu nie odzwierciedla
już stanu instalacji. Instalacja i działający dostęp do usługi są osobnymi stanami; nie
instalujemy ponownie rozszerzenia tylko z powodu wcześniejszego timeoutu.

## Wyłącznie bezpłatne funkcje

Consensus zwrócił poprawne wyniki wyszukiwania i oznaczenie tier=free. W odczycie próbnej
sesji było searches_used=1, searches_limit=30; użycie konta może odtąd się zmienić. Aktualna
oficjalna dokumentacja opisuje 30 miesięcznych wywołań współdzielonych z API/MCP.
Po wykorzystaniu limitu czekamy na odnowienie. Nie aktywujemy płatnego planu.
[Consensus w ChatGPT](https://help.consensus.app/en/articles/10059020-consensus-in-chatgpt),
[plany dostępu](https://help.consensus.app/en/articles/10087865-subscription-plans).

Próba Scite zakończyła się USER_NOT_LOGGED_IN. Aktualna strona MCP wymaga płatnego planu
lub okresu próbnego, a aktualizacja z października 2026 usuwa kredyty MCP dla bezpłatnych
kont. Nie uruchomiono triala ani płatnego dostępu. Dawne informacje o darmowych kredytach
nie są podstawą działania: [Scite MCP](https://scite.ai/mcp),
[aktualizacja warunków](https://scite.ai/blog/august-2026-release-notes).

Hugging Face ma bezpłatny publiczny katalog. Przygotowano anonimowego klienta GET w
scripts/fetch_hf_catalog.py; dwa rzeczywiste odczyty pobrały po 2 metadane. Bez tokenów,
kont, wag i przykładów danych. Deklaracje licencji pozostają niesprawdzone. Natywny konektor
zwrócił Tool not found, więc działający REST jest osobnym sposobem dostępu.
[Instrukcje i próby](HUGGING_FACE_FREE.md), [oficjalne Hub API](https://huggingface.co/docs/hub/en/api),
[zakres usług i ceny](https://huggingface.co/pricing).

Nie aktywujemy PRO, triali, GPU Jobs, Inference Endpoints, zdalnej inferencji, Spaces,
płatnego hostingu ani automatycznego dokupowania użycia. Bezpłatne lokalne moduły oraz
Europe PMC/Crossref pozostają dostępne niezależnie od limitów integracji.

## Podłączenie Supabase po wyborze projektu

Sprawdzić aktualną dokumentację, przygotować i zweryfikować schemat oraz dostęp per właściciel,
prywatny bucket nagrań, polityki członkostwa i krótkie podpisane linki. Klucze serwerowe mają
pozostać na backendzie. Nie otwierać prywatnych tabel lub filmów anonimowym klientom.
Wdrożyć usuwanie obejmujące pamięć, pliki i retencję kopii. Ten dokument nie zastępuje testów
autoryzacji; obecny prototyp nie jest jeszcze aplikacją wieloużytkownikową.

Dokumentacja: [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[prywatne pliki](https://supabase.com/docs/guides/storage/serving/downloads).
