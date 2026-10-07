# Rozbudowa wiedzy behawiorystycznej

Wersja 0.2 zawiera 290 kart i 173 wpisy źródłowe; zakres opisuje [raport pokrycia](KNOWLEDGE_COVERAGE.md).
Obecna baza nie jest pełnym przeglądem literatury. „Gigantyczna wiedza”
powinna oznaczać szerokie pokrycie z kontrolą jakości i aktualizacji, zamiast samych gigabajtów PDF.
Priorytet: zachowanie i potrzeby psa/kota; potem pomiar, wideo i rozmowa.

## Macierz pokrycia

| Moduł | Pies | Kot | Przykład zapytania do katalogu |
|---|---|---|---|
| Komunikacja | Postawa, ruch, sygnały społeczne | Postawa, ogon, uszy, kontakt | canine/feline communication body posture |
| Uczenie | Wzmocnienia, generalizacja | Wzmocnienia, wybór, habituacja | dog/cat learning reinforcement welfare |
| Lęk i stres | Dźwięki, środowisko, separacja | Nowość, transport, napięcia | canine fear separation / feline stress environment |
| Relacje | Człowiek, psy, inne zwierzęta | Człowiek, koty, inne zwierzęta | dog human attachment / intercat tension |
| Zasoby | Jedzenie, odpoczynek, przestrzeń | Kuwety, kryjówki, wysokość | resource guarding dogs / feline environmental needs |
| Zabawa i ruch | Styl, odpoczynek, eksploracja | Łowiecki łańcuch, zabawa | canine play / feline predatory play |
| Eliminacja | Kontekst, historia zdrowia | Kuweta, znakowanie, zdrowie | canine house soiling / feline house soiling |
| Zdrowie i ból | Zmiana zachowania, ruch | Subtelna zmiana, twarz, aktywność | canine pain behavior / feline grimace validation |
| Rozwój i starzenie | Szczenię, dorastanie, senior | Kocię, dorastanie, senior | canine/feline aging cognitive behavior |
| Osobowość | Konstrukty i stabilność | Konstrukty i stabilność | canine personality repeatability / Feline Five Fe-BARQ |
| Metodologia | Bias opiekuna, okazje, obserwatorzy | Bias opiekuna, okazje, obserwatorzy | owner report observer agreement dog cat behavior |
| Wokalizacja | Akustyka i kontekst | Akustyka i kontekst | dog bark acoustic context / cat meow acoustic context |

Dalsze obszary: percepcja sensoryczna, wzbogacenie środowiska, odpoczynek, zachowania
powtarzalne, wielozwierzęce gospodarstwa, różnice między populacjami, leki jako czynnik kontekstu
(bez własnego poradnictwa farmakologicznego), rehabilitacja zachowania i warunki opieki.

## Pipeline redakcyjny

1. Wyszukać bibliografię w Europe PMC/Crossref lub połączonym narzędziu naukowym.
2. Deduplikować DOI/PMID. Metadane API są kandydatami; samo znalezienie nie potwierdza wniosku.
3. Sprawdzić publikację pierwotną, gatunek, próbę, projekt badania, rezultat i ograniczenia.
4. Sprawdzić wersję i prawa, korekty/wycofania, datę wytycznych. Licencja metadanych nie jest
   automatycznie licencją tekstu, tłumaczenia, obrazu, modelu lub danych.
5. Napisać krótką polską syntezę: obserwacja → hipotezy → czynniki zakłócające → bezpieczny krok.
6. Przegląd ekspercki. Dodać również sprzeczne wyniki i warunki, w których karta nie działa.
7. Zbudować indeks i przetestować cytowania, gatunek oraz przypadki braku wystarczających danych.

Nie pobieramy masowo chronionych książek ani całych skal. Pełne teksty otwarte można importować
w osobnym etapie po sprawdzeniu konkretnych praw. Zebrane źródła nie zostały ocenione przez
zewnętrznego eksperta. Źródło `primary_study` może być obserwacyjne i nie dowodzić przyczynowości.

## Standard karty i wsparcia

W 210 nowych kartach claims oddzielają source_finding i project_recommendation, z lokalizatorem,
źródłami i niepewnością. 80 starszych kart ma ogólne source_ids i wymaga przejścia na ten standard
po ponownej lekturze; nie dopisujemy precyzyjnych lokalizatorów z pamięci. Pole reviewed_at
opisuje przegląd redakcyjny, a review_status ujawnia brak przeglądu eksperta. clinical_reference
jest odniesieniem klinicznym, bez udawania badania eksperymentalnego. Poziomy dowodu nie są
punktami ani hierarchią liczbową. Dokumentacja narzędzia nie potwierdza psychologii zwierzęcia.

Moduł zdrowia ma [osobny kontrakt](HEALTH_SIGNALS.md). Przed uruchomieniem rozmów o zdrowiu
potrzebuje doboru kontekstu rozumiejącego opis, negację i czas, przeglądu lekarza oraz walidacji.
Liczba kart i testy indeksu nie zastępują tych etapów. Etogram i kwestionariusz są własnymi
prototypami badawczymi, bez progów klinicznych i norm cech osobowości.

## Aktualizacja

Przegląd jest ręczny, bez automatycznego harmonogramu. Priorytet nowych dowodów: nowe
wytyczne, korekty/wycofania, poważny błąd zgłoszony przez eksperta, nieznane zachowanie,
niewystarczające źródła odpowiedzi. Nie aktualizujemy profilu zwierzaka tylko dlatego, że
pojawiło się nowe badanie populacyjne. Karta i profil mają oddzielne wersje.
