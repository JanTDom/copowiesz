# Pokrycie wiedzy i stan jakości

Audyt strukturalny z 7 października 2026. Nie ocenia trafności klinicznej ani kompletności nauki.

290 kart, 173 wpisy źródłowe, 173 różnych URL. Liczba wpisów nie jest liczbą niezależnych badań.

| Domena | Karty |
|---|---:|
| behavior | 210 |
| health | 40 |
| methods | 40 |

Dla psa dostępnych jest 166 kart, dla kota 162; 38 wspólnych kart występuje w obu wynikach.

210 kart ma 420 jawnych twierdzeń. 80 starszych kart zachowuje wsparcie na poziomie całej karty i wymaga dalszej redakcji.

## Zakres dostępu do źródeł

| Odczyt | Wpisy |
|---|---:|
| abstract | 52 |
| full_text_sections | 47 |
| legacy_not_structured | 53 |
| official_guideline | 7 |
| publisher_record | 14 |

Odczyt publisher_record w module zdrowia może oznaczać publiczny opis lub fragment w wyszukiwaniu. Nie deklaruje przeczytania pełnego rozdziału. reviewed_at jest datą redakcyjnego sprawdzenia, nie opinią lekarza.

## Luki wymagające dalszej pracy

- Brak niezależnego przeglądu wszystkich kart przez behawiorystę i lekarza weterynarii.
- Nie przeprowadzono kompletnego sprawdzenia korekt i retrakcji; jedna odczytana korekta VIDOPET nie jest audytem bibliografii.
- 80 kart pierwotnej wersji wymaga dokładniejszych cytowań na poziomie twierdzeń.
- Część źródeł odczytano jako abstrakt lub publiczny fragment; nie pełny artykuł/rozdział.
- Brak zwalidowanego polskiego kwestionariusza, norm osobowości i danych długoterminowych konkretnych zwierząt.
- Brak walidacji video, emocji, pilności medycznej i rzeczywistego dialogu.
- Wyszukiwanie leksykalne nie rozumie negacji, współwystępowania ani czasu objawu.
- Znalezienie repozytorium HF nie potwierdza licencji, gatunku, jakości ani wdrożenia modelu.

Dokładny raport z ID kart oczekujących i kandydatami do deduplikacji: [coverage_report.json](../data/processed/behavior_knowledge/coverage_report.json).

Odtwarzanie: `python3 scripts/audit_knowledge.py`. Raport nie importuje danych do prywatnej pamięci.
