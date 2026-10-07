# Zdrowie: zachowanie, wygląd i kontekst

Wersja 2 z 7 października 2026: 40 autorskich kart, 35 źródeł klinicznych, wytycznych,
informacji instytucji i jednej serii przypadków. Karty są w
[health_v2_cards.json](../data/raw/manual/behavior_knowledge/health_v2_cards.json),
a metadane i rzeczywisty zakres odczytu w
[health_v2_sources.json](../data/raw/manual/behavior_knowledge/health_v2_sources.json).

Moduł odpowiada na pytanie, jakie obserwacje mogą skłonić do sprawdzenia zdrowia.
Każda karta opisuje widoczny sygnał, przykładowe możliwe przyczyny, zakłócenia,
pytania do opiekuna, krok konsultacyjny i źródła. Przyczyny nie są uporządkowane według
prawdopodobieństwa. Pole not_diagnostic=true jest obowiązkowe.

## Zakres

| Obszar | Rodzaje obserwacji |
|---|---|
| Oddech i krążenie | Wysiłek oddechowy, kolor śluzówek, kaszel, oddech w spoczynku, zasłabnięcie |
| Jedzenie, masa i hormony | Zmiana apetytu, pragnienia, moczu, masy, aktywności i okrywy |
| Mocz | Bolesne parcie, brak widocznego strumienia, krew, zmiana ilości |
| Przewód pokarmowy | Wymioty, ulewanie, połykanie, kał, brzuch i okolica odbytu |
| Oczy, uszy i skóra | Mrużenie, zaczerwienienie, zmętnienie, potrząsanie głową, świąd, wyłysienia, guzki |
| Ruch i neurologia | Odciążanie kończyny, sztywność, niestabilność, niedowład i epizody napadowe |
| Narażenie | Upał/wysiłek oraz konkretne toksyczne produkty lub rośliny |

Sam wygląd nie potwierdza choroby. Prawidłowo wyglądający film nie wyklucza bólu,
choroby nerek, problemu hormonalnego lub innych zaburzeń. Zdrowie jest osobną warstwą
profilu: chwilowego spadku aktywności, wokalizacji lub wycofania nie zamieniamy automatycznie
w trwałą cechę charakteru.

## Pilność i użycie w produkcie

17 kart ma metadane urgent_veterinarian. To etykieta sytuacji opisanej w karcie, a nie
wynik oceny konkretnego zwierzęcia. Wyszukiwarka nie interpretuje negacji, nasilenia,
czasowego przebiegu ani współwystępowania objawów. Nie wolno budować automatycznego
triage wyłącznie przez sprawdzenie pierwszego wyniku lub słowa kluczowego. Brak wyniku
nie oznacza braku ryzyka; znalezienie karty pilnej nie potwierdza jej warunków.

Przygotowany prompt rozmowy ma jasno oddzielać opis opiekuna od interpretacji i
zasugerować konsultację na podstawie opisanej sytuacji. Karty nie zawierają dawek ani
leczenia farmakologicznego. Nagrania mają powstawać naturalnie; nie prowokujemy bólu,
trudności oddychania, napadu ani reakcji na toksynę. Pomoc nie powinna czekać na film.

## Dostęp, dowody i dalszy przegląd

clinical_reference oznacza autorskie źródło kliniczne lub oficjalny materiał edukacyjny;
nie udaje badania eksperymentalnego. primary_study może dotyczyć wybranej grupy
pacjentów i nie daje częstości w populacji. guideline jest wytyczną, w której siła dowodów
może różnić się między zaleceniami. Każde z 35 źródeł ma status
editorial_screened_expert_pending; pełny audyt korekt i retrakcji jest niewykonany.

Część materiałów odczytano jako publiczny opis lub indeksowany fragment. Zapis access_basis
ujawnia to ograniczenie. Nie importowano pełnych podręczników, obrazów chorób ani materiałów
chronionych. Prawa do późniejszych zdjęć i filmów trzeba oceniać osobno.

Przed zastosowaniem dla rzeczywistych pacjentów potrzebny jest niezależny przegląd lekarza,
sprawdzenie pytań i pilności, testy przypadków podobnych, ocena braków oraz walidacja
na danych klinicznych. Baza nie osiągnęła tego etapu.

## Wyszukiwanie lokalne

```bash
python3 -m copowiesz search "Kot ma żółte oczy" --species cat --domain health --limit 3
python3 -m copowiesz search "Mój kot nie może się wysikać" --species cat --domain health --limit 3
```

Jedenaście syntetycznych zapytań sprawdza odnajdywanie oczekiwanych kart w pierwszych
trzech wynikach. To test języka i indeksu, bez pomiaru czułości diagnozy lub pilności.
Zobacz [pokrycie i luki](KNOWLEDGE_COVERAGE.md) oraz [walidację](VALIDATION.md).
