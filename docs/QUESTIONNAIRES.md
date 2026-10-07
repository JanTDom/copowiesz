# Autorski kwestionariusz COPOWIESZ: pies i kot

Wersja 1.0.0 · język polski · stan: **niezwalidowany prototyp badawczy** · przygotowano 2026-10-07.

Formularz opisuje zachowanie jednego zwierzęcia w jego zwykłym otoczeniu oraz jakość dostępnych obserwacji. Ma przygotować materiał do rozmów po polsku, opartych na rzeczywistych zdarzeniach i preferencjach. Nie potwierdza przeniesienia osobowości, świadomości ani pamięci zwierzęcia do komputera. Odpowiedzi w głosie zwierzaka będą twórczą reprezentacją opartą na profilu, a nie jego wypowiedzią lub odczytem myśli.

Źródło formularza: [owner_questionnaire_v1.json](../data/raw/manual/questionnaires/owner_questionnaire_v1.json). Protokół uzupełniającej obserwacji: [VIDEO_PROTOCOL.md](VIDEO_PROTOCOL.md).

## Co zawiera formularz

Zestaw zawiera **94 autorskie pytania: 76 wspólnych, 9 wyłącznie dla psa i 9 wyłącznie dla kota**. Opiekun jednego gatunku otrzymuje 85 pytań; każde można pominąć. Są to nowe polskie pozycje napisane do tego projektu. Nie są kopiami ani tłumaczeniami C-BARQ, Fe-BARQ, Feline Five czy innych istniejących narzędzi. Układ sekcji i nazwy `construct` są roboczymi obszarami dokumentacji, bez ustalonej struktury czynnikowej.

| Etap | Sekcje i identyfikatory | Liczba pozycji w zestawie | Cel |
|---|---|---:|---|
| 1 | Historia q001–q010, jakość obserwacji q011–q019, zdrowie q020–q029 | 29 | Ustalenie, o kim i w jakich warunkach można coś powiedzieć |
| 2 | Otoczenie q030–q039, odpoczynek q040–q046, kontakt q047–q054, komunikacja q055–q061, uczenie q062–q067, zwykłe zdarzenia q068–q072 | 43 | Zebranie obserwacji w konkretnym kontekście |
| 3 | Pies q073–q081 albo kot q082–q090; przykłady i przegląd q091–q094 | 22 w zestawie / 13 na zwierzę | Uzupełnienie gatunkowe i sprawdzenie dowodów |

Czas wypełnienia należy dopiero zmierzyć w pilotażu. Interfejs powinien umożliwiać zapis po każdej sekcji, powrót do formularza oraz zakończenie bez odpowiedzi na wszystkie pytania. Nie traktować ukończenia formularza jako warunku pomocy w sprawie dobrostanu.

## Instrukcja dla opiekuna

1. Wybierz jedno zwierzę i okres ostatnich 14 dni. Przykładowo dla formularza kończonego 2026-10-07 okno dat to 2026-09-24–2026-10-07 włącznie, strefa Europe/Warsaw. Zapisz daty; po zmianie okna nie łącz obserwacji bez oznaczenia.
2. Odpowiadaj na podstawie sytuacji, które wystąpiły naturalnie. Nie organizuj prób tolerancji dotyku, hałasu, obcych ludzi, spotkań zwierząt, odbierania zasobów ani pozostawiania zwierzęcia samego.
3. Pytania o częstość dotyczą **zaobserwowanych okazji**. „Nigdy” oznacza: była okazja, ale nie widziałem danego zachowania. Gdy okazji nie było, wybierz „nie dotyczy”. Gdy nie widziałeś sytuacji lub nie pamiętasz, wybierz „nie wiem”.
4. Opisuj ruch, dźwięk i przebieg zdarzenia. Na przykład „po odkurzaczu odszedł do drugiego pokoju” jest obserwacją; „bał się odkurzacza” jest hipotezą. Hipotezę można zapisać oddzielnie.
5. Nie zgaduj, żeby uzupełnić formularz. Dla pola liczbowego i tekstowego „nie wiem”, „nie dotyczy” oraz „pomiń” muszą być osobnymi działaniami interfejsu. Nie wpisuj zera zamiast braku wiedzy.
6. W metadanych odpowiedzi zaznacz, czy korzystasz z własnej obserwacji, nagrania, dziennika, cudzej relacji czy ogólnego wspomnienia. Nie podawaj danych osób, adresów lub numerów dokumentów.

Pytania historyczne mają `recall_window_days: null`. Dotyczą wiedzy o historii i aktualnych danych opisowych, a nie zachowania z ostatnich 14 dni. Odpowiedzi opierające się na szacunku, cudzej relacji lub wcześniejszym okresie powinny być jawnie oznaczone.

## Zapisywanie odpowiedzi i słabej wiarygodności

Sam plik zawiera pytania i opis kontraktu odpowiedzi. Nie zawiera danych rzeczywistych opiekunów, aplikacji do wypełniania, wyników walidacji ani automatycznego interpretatora. Implementacja musi rozróżnić `answered`, `unknown`, `not_applicable` i `skipped` oraz przechować źródło przy każdej odpowiedzi. `unknown` i `not_applicable` nie mogą wchodzić do średniej, sumy ani kodu zera. W pytaniach wielokrotnego wyboru opcje „brak”, „nie wiem” i „nie dotyczy” są wyłączne; należy odrzucić ich połączenie z inną odpowiedzią.

| Ograniczenie | Flaga lub metadane | Jak wpływa na późniejszy opis |
|---|---|---|
| Niewiele wspólnych dni lub tylko jeden kontekst | `limited_observation`, `low_context_coverage` | Opis ograniczony do obserwowanej sytuacji; bez szerokiej cechy |
| Relacja innego człowieka | `second_hand` i źródło | Zapis „opiekun relacjonuje”; bez udawania własnej obserwacji |
| Ogólne wrażenie bez przykładów | `general_impression` | Powstrzymanie się od mocnego wniosku; propozycja zwykłego dziennika |
| Wspomnienie spoza okresu | `outside_recall_window` | Oddzielny zapis historyczny, bez mieszania z bieżącym oknem |
| Zmiana domu, rutyny, zdrowia lub leczenia | `recent_home_change`, `reported_health_context`, `treatment_context` | Kontekst możliwego wpływu, bez przypisania pewnej przyczyny |
| Mało okazji | `few_observed_opportunities` i liczba lub `null` | Ujawnienie ograniczonej liczby zdarzeń |
| Różnica między opiekunami | `observer_disagreement` | Zachowanie obu odpowiedzi wraz z kontekstem, bez wyboru większością |
| Fragmentaryczne nagranie | `video_visibility_limit`, `missing_context` | Brak wniosku o niewidocznym sygnale lub przyczynie |
| Szacowany wiek lub masa | `estimated_age`, `estimated_body_mass` | Wyłącznie niepewne metadane, bez stereotypu rasowego |

Nie ma zwalidowanego progu liczby dni, pytań czy nagrań, który gwarantuje wiarygodny profil. Flagi nie są procentową oceną prawdomówności opiekuna. Rozbieżność może wynikać z różnych sytuacji i ekspozycji, a nie z błędu jednej osoby. Samoocena pewności nie zastępuje oceny zgodności z obserwacją.

## Zasady tworzenia profilu i rozmowy

Obowiązuje `descriptive_only_no_clinical_cutoffs`. W tej wersji nie wolno wyliczać diagnozy, kategorii „agresywny/lękliwy”, wyniku inteligencji, procentu „przeniesionej osobowości”, rankingu posłuszeństwa lub norm rasy. Nie wolno nazywać sum sekcji zwalidowanymi skalami. Pytania o zdrowie przechowują zgłoszony kontekst; formularz nie rozpoznaje chorób i nie ocenia pilności na podstawie wyniku.

Można sporządzić opis wraz z okresem, źródłami, przykładami i ograniczeniami: „W tym okresie opiekun odnotował, że Mewa wybierała osłonięte miejsca odpoczynku, gdy odwiedzali dom goście. Brakuje podobnych obserwacji w spokojne dni”. W rozmowie po polsku odpowiedź dotycząca przyczyny powinna rozróżniać fakt, interpretację i niewiedzę. Nie dopowiadać wspomnień ani relacji, których profil nie zawiera. Nagła zmiana zachowania nie staje się automatycznie zmianą osobowości.

## Podstawy naukowe i krótkie notatki z lektury

Poniższe źródła wykorzystano do wyboru obszarów i planu oceny. Ich walidacja **nie przechodzi** na pytania COPOWIESZ. Notatki są syntezą abstraktów, metod dostępnych w treści i ograniczeń; nie zastępują pełnej oceny artykułów przed badaniem.

- **Hsu i Serpell (2003), C-BARQ.** Badano rzetelność i trafność kwestionariusza reakcji psów w zwykłych sytuacjach; narzędzie dotyczy głównie zachowań problemowych. [Publikacja, DOI 10.2460/javma.2003.223.1293](https://pubmed.ncbi.nlm.nih.gov/14621216/); [opis narzędzia University of Pennsylvania](https://vetapps.vet.upenn.edu/cbarq/about.cfm).
- **Duffy, de Moura i Serpell (2017), Fe-BARQ.** Badano wymiary zachowania kotów oraz ich rzetelność i trafność; nie wszystkie czynniki uzyskały jednakowe wyniki. [Publikacja, DOI 10.1016/j.beproc.2017.02.010](https://pubmed.ncbi.nlm.nih.gov/28232232/).
- **Mikkola i współautorzy (2021).** Sprawdzano strukturę, spójność, powtarzalność, zgodność oceniających oraz trafność kwestionariusza kotów; uwzględniono zachowanie, historię i zdrowie. [Reliability and Validity of Seven Feline Behavior and Personality Traits, DOI 10.3390/ani11071991](https://pmc.ncbi.nlm.nih.gov/articles/PMC8300181/).
- **Litchfield i współautorzy (2017), Feline Five.** Badano pięć wymiarów ocen osobowości kotów; ograniczeniem były reprezentatywność próby i brak czasu znajomości zwierzęcia. [Publikacja, DOI 10.1371/journal.pone.0183455](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0183455).
- **Fratkin i współautorzy (2013).** Metaanaliza wykazała umiarkowaną stabilność cech psów; znaczenie miały wiek, odstęp pomiarów i podobieństwo metod. [Personality Consistency in Dogs, DOI 10.1371/journal.pone.0054907](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0054907).
- **Wan, Bolger i Champagne (2012).** Interpretacja lęku na filmach z psami zależała od doświadczenia uczestników; punktem odniesienia była ocena ekspertów. [Publikacja, DOI 10.1371/journal.pone.0051775](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0051775).

Dostęp do witryny, artykułu lub publicznego formularza nie oznacza prawa do odtworzenia pytań, algorytmu albo cudzych danych w komercyjnym produkcie. Jeśli projekt później potrzebuje licencjonowanego C-BARQ/Fe-BARQ lub danych Penn, trzeba ustalić odpowiednie prawa i warunki ze źródłem. Ta wersja nie importuje ich pozycji ani bazy odpowiedzi.

## Plan walidacji przed mocniejszymi wnioskami

1. **Treść i zrozumiałość.** Niezależna ocena polskich pozycji przez lekarza weterynarii zajmującego się zachowaniem, specjalistę psów, specjalistę kotów i badacza pomiaru. Wywiady poznawcze z opiekunami: czy rozumieją okres, „okazję”, brak wiedzy i obserwację. Zmiany wymagają wersjonowania.
2. **Pilotaż wykonalności.** Sprawdzenie czasu, rezygnacji, braków, dostępności kontekstów i obciążenia formularzem. Rekrutacja celowo obejmująca różny wiek, zdrowie, otoczenie i poziom doświadczenia opiekunów. Próba wygodna nie staje się normą populacyjną.
3. **Rzetelność i źródła rozbieżności.** Powtórzenie tego samego zestawu dotyczącego tego samego okna po krótkiej, wcześniej ustalonej przerwie sprawdza powtarzalność odpowiedzi. Kolejne 14-dniowe okno bada zmianę i stabilność zachowania, więc tych analiz nie wolno mylić. Dwaj opiekunowie odpowiadają niezależnie, z odnotowaną ekspozycją.
4. **Porównanie z obserwacją.** Dwóch przeszkolonych oceniających, bez dostępu do właścicielskich etykiet, opisuje te same dobrowolne klipy według etogramu. Sprawdzić zgodność, braki widoczności i niezgodność kontekstu. To porównanie źródeł, bez ogłoszenia pełnej „prawdy o emocji”.
5. **Trafność oraz struktura.** Z góry określić hipotezy; dla rozważanych skal użyć analizy czynnikowej, odpowiednich miar rzetelności i walidacji na oddzielnej próbie. Spójność wewnętrzna nie dotyczy automatycznie list faktów, historii lub preferencji. Trafność zbieżną/różnicową oceniać z uzyskanymi zgodami i uprawnieniami do narzędzi porównawczych.
6. **Oddzielne gatunki i polski kontekst.** Sprawdzić, czy treść działa osobno u psów i kotów; nie wymuszać wspólnego modelu. Badać wpływ zdrowia, wieku, otoczenia, źródła odpowiedzi i opiekuna. Nie stosować stereotypu rasy do uzupełnienia braków.
7. **Plan i raport.** Przed zbieraniem próby zapisać protokół, hipotezy, kryteria wykluczenia, analizę braków oraz uzasadnienie liczebności. Raportować niepewność i wyniki negatywne. Brak obecnie liczebności gwarantującej walidację, norm, progów klinicznych lub akceptacji eksperckiej tej wersji.

Dopiero po tych etapach można rozważyć wybrane zwalidowane wskaźniki opisowe. Diagnoza kliniczna i porady terapeutyczne wymagają odrębnego zakresu i dowodów; nie są rezultatem tego formularza.
