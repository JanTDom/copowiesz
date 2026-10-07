# Pies — rozszerzenie behawiorystyczne v2

Przegląd redakcyjny: **2026-10-07**. Rozszerzenie dodaje **33 nowe publikacje pierwotne i 66 nowych kart** do początkowego fundamentu. Nie nadpisuje wcześniejszego zbioru. Źródła dotyczą rzeczywistych badań, a zapisane treści są krótkimi własnymi syntezami.

## Zakres

| Obszar | Liczba nowych kart |
| --- | ---: |
| Węch i bodźce zapachowe | 10 |
| Głos, dźwięki i brzmienie wskazówek | 6 |
| Szczenię, socjalizacja i adolescencja | 10 |
| Sen i odpoczynek | 4 |
| Retencja i interferencja uczenia | 2 |
| Etogram i wzajemność zabawy | 6 |
| Dotyk, obsługa i gabinet | 6 |
| Zasoby i manipulacja | 2 |
| Hałas, przebieg reakcji i wsparcie | 6 |
| Etapy transportu | 2 |
| Konteksty lękowe i frustracyjne rozłąki | 2 |
| Zachowania powtarzalne | 2 |
| Aktywność i zmysły seniora | 2 |
| Pies i kot w jednym domu | 2 |
| Sprawczość i preferencje nagród | 2 |
| Powtarzalność i wpływ nowości | 2 |

Każda karta dotyczy psa. Tylko źródło interakcji psa i kota obejmuje oba gatunki; jego psie karty zachowują filtr `dog`. Źródła metodologiczne z innych modułów nie są tutaj duplikowane.

## Co dokładnie zapisano

[Źródła](../../data/raw/manual/behavior_knowledge/dog_expansion_v2_sources.json) mają DOI lub jawne `null`, projekt badania, populację, zakres dostępu i status kontroli. **17** rekordów opiera się na abstrakcie, **16** na przeczytanych publicznych fragmentach metod, wyników lub dyskusji. Publiczny dostęp nie jest deklaracją prawa do przechowywania pełnego tekstu. Nie pobierano pełnych publikacji, kwestionariuszy ani danych do repozytorium.

[Karty](../../data/raw/manual/behavior_knowledge/dog_expansion_v2_cards.json) rozdzielają syntetyczną sytuację obserwacyjną, możliwą interpretację, czynniki zakłócające i działanie. Każda zawiera jedno krótkie twierdzenie `source_finding` oraz oddzielne `project_recommendation`, z odsyłaczem do źródła, lokalizatorem i niepewnością. Lokalizator wskazuje część pracy, a nie wymyśloną stronę czy numer tabeli. Zalecenie projektowe nie jest przedstawiane jako interwencja sprawdzona w cytowanym badaniu.

[Notatki z lektury](../papers/summaries/dog_expansion_v2.md) mają poniżej 30 słów metod i ograniczeń na publikację. Przy przygotowaniu policzono łącznie tytuły, opisy metod/populacji, notatki oraz teksty dwóch kart z ich twierdzeniami: maksymalnie **166 słów na źródło**. Dodatkowa dokumentacja opisuje sposób korzystania ze zbioru, bez nowych streszczeń poszczególnych prac.

## Ograniczenia dowodów

Status każdego nowego źródła to `editorial_screened_expert_pending`. To przegląd redakcyjny, bez podpisanej akceptacji lekarza lub behawiorysty. Wszystkie rekordy mają `retraction_check=not_checked`: nie wykonano kompletnej kontroli retrakcji i korekt. Takie rekordy wymagają ponownego sprawdzenia przed użyciem klinicznym lub publikowaniem kategorycznych wniosków.

Próby obejmują między innymi wytrenowane psy, beagle, programy psów asystujących oraz samodzielnie zgłaszających się opiekunów. Ankiety mogą zawierać błąd pamięci, selekcji i ocen obserwatora. Związki przekrojowe nie rozstrzygają kierunku przyczynowości. Rekordy `noise_progression_2019` i `noise_treatment_2020` analizują tę samą ankietę; dwie publikacje nie stanowią niezależnej replikacji.

Wyniki EEG, fMRI i fizjologii są wiedzą o mechanizmach i ograniczeniach obserwacji. Prototyp nie oblicza tych pomiarów z filmu. Materiał nie ustanawia progów klinicznych, polskich norm osobowości, procentów pewności ani diagnoz emocji czy chorób.

## Następna walidacja

Potrzebne są: niezależny przegląd merytoryczny twierdzeń, kontrola korekt i retrakcji, sprawdzenie przenoszenia wyników między populacjami, polskie badania interpretacji przez opiekunów i pomiar zgodności obserwatorów. Brakuje zwłaszcza szerokich domowych danych o jakości snu, samodzielnym wyborze aktywności, podróży samochodem, nastoletnich psach różnych populacji oraz bezpiecznych długotrwałych interakcjach psa z kotem.

Nie należy odtwarzać prowokacyjnych protokołów badawczych. Zbieranie danych ma obejmować naturalne spokojne sytuacje, możliwość odejścia oraz różnicowanie zdrowotne zmian zachowania. Zbiór przygotowuje przyszłe zastosowania; nie dostarcza modelu analizy wideo ani gotowego rozmówcy.
