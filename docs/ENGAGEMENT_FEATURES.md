# Rozmowa, wspólna historia i karta zwierzaka

Stan kodu: 8 października 2026. Rozszerzenia korzystają z istniejącego lokalnego profilu,
testu i nagrań. Nie uruchamiają nowych usług, rozliczeń ani automatycznych powiadomień.
Stan publikacji i dostawców opisuje [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md).

## Pierwsza osobista rozmowa

Po przejrzeniu 85 pytań i zapisaniu czterech rzeczywistych, ukończonych klipów w wymaganych
kontekstach ekran rozmowy pokazuje osobiste powitanie. Zawiera imię, zdjęcie profilowe
i wybrane potwierdzone zapisy opiekuna wraz z ich podstawą. Przycisk rozpoczęcia zapisuje
powitanie lokalnie, oznacza ten etap jako obejrzany i przygotowuje pytanie do ręcznego wysłania.
Profil demonstracyjny i niepełny materiał nie odblokowują tego finału. Gotowość nadal oznacza
pokrycie materiału, bez oceny naukowej trafności osobowości.

## Tematy rozmowy

Propozycje tematów korzystają z własnych zapisów o preferencjach i rutynie, najnowszej chwili
z albumu, ostatniej obserwacji oraz pytania z odpowiedzią „nie wiem”. Dla pustego profilu
pozostają propozycje odpowiednie dla gatunku. Wybór tematu wypełnia edytowalną wiadomość;
nie wysyła jej automatycznie. Zapisów zdrowotnych nie przedstawiamy jako cech osobowości.

## Nasz tydzień

W „Waszej historii” są trzy zakładki: zapisy, album i „Nasz tydzień”. Zestawienie obejmuje
ostatnich siedem dni dodawania zapisów, adnotacji i chwil oraz aktualizowania odpowiedzi testu.
Edycja podpisu dawnej chwili nie przenosi jej do bieżącego tygodnia.
Data dodania wpisu nie stanowi dowodu daty samego zdarzenia. Każda pozycja ma podstawę;
nie powstają fikcyjne wydarzenia, wyniki nastroju ani procenty pewności. Widać najpierw
osiem pozycji, kolejne można rozwinąć. Pusty tydzień ma jawny komunikat i spokojną propozycję
obserwacji. Zdrowie pozostaje osobno. Wybrany temat tygodnia przygotowuje wiadomość w rozmowie.

## Rozmowa głosowa

Tryb głosowy oferuje jawne rozpoczęcie i zakończenie dyktowania, polski głos przeglądarki,
tempo i opcjonalny automatyczny odczyt nowych odpowiedzi. Tekst dyktowania można poprawić;
wysłanie zawsze wymaga działania użytkownika. Samo otwarcie panelu nie włącza mikrofonu.
Odczyt można przerwać; zmiana ekranu, przejście w tło oraz zamknięcie sesji zatrzymują głos.
Przerwanie lub wyłączenie automatycznego czytania obejmuje także odpowiedź, która nadejdzie później.

Głos i dyktowanie zależą od przeglądarki, systemu oraz uprawnień. Dostawca przeglądarki może
używać zewnętrznego rozpoznawania mowy; interfejs i prywatność wyjaśniają ten zakres.
To lektor tekstu, bez klonowania biologicznego głosu zwierzęcia. Fizyczny mikrofon, dyktowanie
na telefonach i natywne udostępnianie pliku wymagają dalszej weryfikacji na urządzeniach.

## Zrozum tę sytuację

W rozmowie opiekun podaje obserwowalne zachowanie i kontekst. Może powiązać istniejący,
ukończony klip własnego zwierzaka i obejrzeć go lokalnie. Do API czatu trafiają opis, kontekst
i odwołanie do klipu; bajty filmu, klatki, dźwięk oraz zdjęcia albumu są wykluczone z tego żądania.
Analiza wideo pozostaje osobnym działaniem wymagającym własnej zgody i dopuszczonego dostawcy.

Odpowiedź porządkuje relację opiekuna, dostępne podstawy, braki w kontekście i bezpieczny krok.
Nie udaje nowej obserwacji filmu. Sygnały zdrowotne otrzymują informacje dla opiekuna poza
wyobrażonym głosem zwierzaka. Opis sytuacji zapisuje się z rozmową, bez automatycznej zamiany
na potwierdzone wspomnienie. Limit żądania czatu wynosi 2 MiB; projekcja API ogranicza historię
i metadane, zachowując pełne odpowiedzi kwestionariusza oraz wskazany klip.

## Prywatny album

Chwila zawiera tytuł, podpis, datę, opcjonalne zdjęcie oraz odwołanie do istniejącego filmu.
Zdjęcia JPEG, PNG lub WebP do 5 MiB są przekształcane lokalnie do kopii JPEG o boku do 2400 px,
bez kopiowania oryginalnych metadanych. Pliki trafiają do osobnego magazynu `photos` w IndexedDB.
Wersja 2 bazy zachowuje istniejące profile i nagrania. Edycja chwili zmienia opis, datę i powiązanie
filmu; zachowuje przypisane zdjęcie. Usunięcie chwili usuwa jej zdjęcie, zachowując film w Nagraniach.
Usunięcie profilu czeka na usunięcie lokalnych plików zdjęć i nagrań; błąd pozwala ponowić działanie.

„Porozmawiaj o tej chwili” wypełnia opis sytuacji. Opiekun sprawdza i wysyła go samodzielnie.
Album nie przypisuje zdjęciu emocji ani cechy osobowości. Profile demonstracyjne są oznaczone
jako syntetyczne; własne zapisy należy tworzyć w swoim profilu.

Eksport JSON i ręczna synchronizacja profilu zawierają opisy oraz odnośniki albumu, bez plików
zdjęć. Zdjęcia i filmy pobiera się osobno. Import na innym urządzeniu pokazuje brak pliku,
bez podszywania się pod pełną kopię mediów. Zdjęcie profilowe w dawnym formacie może nadal
znajdować się w JSON. Wyczyszczenie danych przeglądarki usuwa dostęp do lokalnej pamięci.

## Karta zwierzaka

Z rozmowy lub historii można utworzyć kartę PNG 1080 × 1350 z logo i typografią projektu.
Użytkownik wybiera własne zdjęcie profilowe, zdjęcie z albumu albo nowy lokalny plik oraz
maksymalnie trzy potwierdzone zapisy o preferencjach lub rutynie. Żaden zapis nie jest zaznaczony
automatycznie. Karta zachowuje informację o podstawie, a przykład demonstracyjny oznaczenie
syntetycznych danych. Nie zawiera rozmów, zdrowia ani wyników modelu jako dowodów osobowości.

Podgląd i wygenerowanie pliku są osobnymi krokami. Zmiana zdjęcia lub faktów unieważnia poprzedni
plik. Pobranie i natywne udostępnianie wymagają osobnego działania użytkownika; aplikacja nie
publikuje karty w serwisach społecznościowych. Renderowanie PNG sprawdzono w przeglądarce;
zapis pliku w systemie i arkusz udostępniania telefonu wymagają osobnego sprawdzenia.

## Sprawdzenia

119 testów web obejmuje granice gotowości, brak danych demonstracyjnych, zakres tygodnia,
źródła tematów, wykluczenie zdrowia, sprawdzanie albumu i odwołań, projekcję bez surowych mediów,
prywatne klipy, odpowiedzi sytuacyjne, publiczną blokadę dostawcy oraz model karty i jej tekst.
Fundament Python przeszedł 33 testy; eksport wiedzy zachowuje 94 pytania, 290 kart i 173 źródła.
TypeScript i produkcyjny build sprawdzają połączoną aplikację.

Przegląd UI z syntetycznymi zapisami obejmuje zachowanie danych po odświeżeniu, dodanie zdjęcia
i podpisu do albumu, edycję, przeniesienie chwili do opisu sytuacji, osobiste tematy, kartę PNG,
jej unieważnienie po zmianie wyboru oraz panel głosowy z mikrofonem domyślnie wyłączonym.
To weryfikacja oprogramowania; wiedza, kwestionariusz i interpretacja wideo nie mają niezależnej
walidacji behawiorystycznej ani klinicznej.
