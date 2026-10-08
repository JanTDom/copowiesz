export const LEGAL_VERSION = "2026-10-08.1";
export const operator = {
  name: "Multinewsroom Jan Domaniewski",
  address: "ul. Barcicka 44, 01-839 Warszawa",
  nip: "5252189241",
  regon: "147154574",
  email: "kontakt@copowiesz.pl",
};
export type LegalSection = { id: string; title: string; paragraphs: string[]; bullets?: string[] };
export const termsSections: LegalSection[] = [
  { id: "uslugodawca", title: "1. Usługodawca i kontakt", paragraphs: [
    "Serwis COPOWIESZ pod adresem copowiesz.pl prowadzi Multinewsroom Jan Domaniewski, przedsiębiorca prowadzący działalność gospodarczą, ul. Barcicka 44, 01-839 Warszawa, NIP 5252189241, REGON 147154574. Kontakt dotyczący usługi, danych, reklamacji i odstąpienia: kontakt@copowiesz.pl.",
    "Regulamin opisuje pilotażową wersję aplikacji oraz zasady przygotowanego procesu zakupu, gdy konkretna płatna oferta zostanie uruchomiona. Wersja dokumentu: 2026-10-08.1. COPOWIESZ jest przeznaczony dla pełnoletnich opiekunów psów i kotów.",
  ] },
  { id: "przedmiot", title: "2. Co oferuje COPOWIESZ", paragraphs: [
    "Aplikacja pozwala utworzyć profil psa lub kota, przejrzeć przekrojowy formularz, nagrać krótkie sceny według instrukcji, zapisać obserwacje i rozmawiać po polsku z cyfrową reprezentacją zwierzęcia. Udostępnia też bazę wiedzy z odsyłaczami do źródeł. Indywidualny profil wymaga przejrzenia 85 pytań i czterech kontekstów rzeczywistych nagrań. Odpowiedzi «nie wiem» pozostają brakiem informacji.",
    "Cyfrowa wypowiedź jest wyobrażoną narracją opartą na dostępnych danych, a nie wypowiedzią zwierzęcia ani odczytem jego myśli. Przykład Luny ma dane demonstracyjne. Aplikacja oznacza tryb odpowiedzi, źródła i ograniczenia. Własny formularz i interpretacje nie są zwalidowanym testem psychologicznym, biometrią ani modelem klinicznym.",
    "Moduł zdrowia ma charakter informacyjny. Nie rozpoznaje chorób i nie zaleca leków ani dawek. Nie należy odkładać konsultacji weterynaryjnej, aby uzupełnić profil lub nagrać objaw. Interakcję trzeba zakończyć, gdy zwierzę rezygnuje lub okazuje dyskomfort.",
  ] },
  { id: "wymagania", title: "3. Urządzenie i dostępne funkcje", paragraphs: [
    "Potrzebujesz współczesnej przeglądarki z obsługą JavaScript i lokalnego przechowywania IndexedDB. Kamera i mikrofon wymagają Twojego uprawnienia oraz bezpiecznego połączenia HTTPS. Jeśli nagrywanie w przeglądarce jest niedostępne, możesz wgrać film z telefonu. Nagranie w aplikacji trwa do 30 sekund; import obsługuje zgodne filmy WebM, MP4 lub MOV do 50 MiB i 60 sekund. Obsługa konkretnego kodeka zależy od urządzenia.",
    "Odczytywanie odpowiedzi i dyktowanie zależą od funkcji przeglądarki. Internet jest potrzebny do otwarcia serwisu i wysyłania wiadomości do serwera, zewnętrznej analizy lub synchronizacji. Nie obiecujemy działania całej aplikacji offline ani identycznych możliwości każdego telefonu.",
  ] },
  { id: "pilot", title: "4. Pilotaż, konto i modele", paragraphs: [
    "Obecny pilotaż nie pobiera opłaty za korzystanie z lokalnego profilu, formularza, nagrań, historii i wiedzy. Sprzedaż pakietów i rzeczywiste płatności Przelewy24 są wyłączone do czasu przygotowania oferty i konfiguracji. Samo utworzenie profilu lub użycie demonstracji nie powoduje obciążenia ani odnawiania abonamentu.",
    "Publiczna rozmowa i analiza Gemini zależą od konfiguracji zgodnej z warunkami Google, dostępnego modelu oraz uwierzytelnienia. Obecnie publiczny dostęp do Gemini nie jest uruchomiony. Aplikacja może zwrócić wyraźnie oznaczoną odpowiedź lokalną opartą na zapisach. Nie przedstawia jej jako wyniku Gemini. Nie zmienia automatycznie modelu ani nie aktywuje płatnego API.",
    "Dane domyślnie zapisują się w tej przeglądarce. Konto i ręczna synchronizacja Supabase są opcjonalnym, odrębnym przepływem. Rejestracja e-mail jest obecnie ograniczona przez konfigurację dostawy wiadomości, a konta gości są wyłączone. Pomoc opisuje rzeczywisty stan tych funkcji.",
  ] },
  { id: "obserwacje", title: "5. Twoje materiały i dobrostan", paragraphs: [
    "Dodawaj materiały, do których masz uprawnienia. Unikaj twarzy, rozmów i danych innych osób, zwłaszcza dzieci, dokumentów i adresów widocznych w kadrze. Nie przesyłaj informacji poufnych ani danych dotyczących zdrowia ludzi. Nie wykorzystuj formularza lub nagrań do wywoływania lęku, bólu, agresji albo pozbawiania zwierzęcia zasobów.",
    "Wynik modelu wymaga przeglądu. Dopiero Twoje świadome potwierdzenie zapisuje obserwację w historii jako relację opiekuna. Możesz poprawić lub usunąć wpis. Nie traktuj płynnego języka odpowiedzi jako potwierdzenia jej prawdziwości; korzystaj z «Skąd to wiesz?» i źródeł.",
  ] },
  { id: "zakup", title: "6. Zasady płatnej oferty po jej uruchomieniu", paragraphs: [
    "Przed zakupem wyświetlimy nazwę i opis pakietu, cenę brutto w PLN, okres dostępu, liczbę profili i limity rozmów oraz analiz. Zobaczysz warunki realizacji, regulamin, prywatność i informację o odstąpieniu. Oferowany okres nie będzie odnawiany automatycznie. Obecnie nie ma aktywnej płatnej oferty.",
    "Zamówienie wymaga zweryfikowanego konta e-mail, zaakceptowania właściwej wersji regulaminu oraz wyraźnego przycisku z obowiązkiem zapłaty. Kwota pochodzi z katalogu na serwerze. Przygotowana integracja przekierowuje do Przelewy24; samo przekierowanie z powrotem do aplikacji nie potwierdza zapłaty. Dostęp powstaje dopiero po weryfikacji transakcji przez operatora.",
    "Po uruchomieniu tego kanału operatorem płatności będzie PayPro S.A., ul. Pastelowa 8, 60-198 Poznań, KRS 0000347935, NIP 7792369887, REGON 301345068, działający pod marką Przelewy24. Dostępne metody będą wynikać z zatwierdzonego konta sprzedawcy. Obecnie żadne metody nie są prezentowane jako aktywne.",
    "Potwierdzenie zamówienia obejmie niezmienne warunki oferty i zaakceptowane dokumenty, możliwe do pobrania i zachowania. Przed uruchomieniem sprzedaży skonfigurujemy też dostarczanie potwierdzenia na trwałym nośniku. Awaria rejestracji lub nieudana płatność nie stanowi potwierdzenia zakupu.",
  ] },
  { id: "odstapienie", title: "7. Odstąpienie i zwrot", paragraphs: [
    "Dla przygotowywanej oferty przyjmujemy pełne 14 dni na odstąpienie od umowy, liczone od jej zawarcia. Rozpoczęcie rozmowy lub żądanie niezwłocznego dostępu nie odbiera tego prawa. Nie stosujemy w pilotażu checkboxa automatycznej utraty prawa po pierwszej wiadomości.",
    "Oświadczenie możesz wysłać na kontakt@copowiesz.pl albo pocztą na adres przedsiębiorcy. Podaj dane pozwalające odnaleźć umowę i jasną informację, że od niej odstępujesz. Wzór jest dostępny na stronie «Odstąpienie i reklamacje»; nie musisz używać formularza. Zwrot następuje do 14 dni od otrzymania oświadczenia, tą samą metodą, chyba że uzgodnisz inne bezkosztowe rozwiązanie. Przy tym modelu oferty deklarujemy zwrot pełnej ceny pakietu.",
  ] },
  { id: "reklamacje", title: "8. Zgłoszenia i reklamacje", paragraphs: [
    "Reklamację lub problem techniczny zgłoś na kontakt@copowiesz.pl. Opisz działanie, oczekiwany rezultat, datę i urządzenie. Przy zakupie podaj numer zamówienia. Nie przesyłaj haseł ani kluczy API. Odpowiemy konsumentowi na reklamację w ciągu 14 dni od jej otrzymania, na trwałym nośniku.",
    "Twoje ustawowe prawa dotyczące zgodności usługi cyfrowej z umową pozostają zachowane. Postanowienia pilotażu nie ograniczają praw konsumenta ani przedsiębiorcy, któremu przysługują prawa konsumenckie. Informacje o pozasądowym dochodzeniu roszczeń udostępnia UOKiK; pomoc można uzyskać również u miejskiego lub powiatowego rzecznika konsumentów.",
  ] },
  { id: "zakonczenie", title: "9. Zakończenie korzystania i prawa do treści", paragraphs: [
    "Możesz zakończyć korzystanie, pobrać kopię danych i usunąć lokalny profil w ustawieniach. Usunięcie lokalne nie usuwa osobnych kopii eksportu ani danych zapisanych wcześniej w chmurze. Opcja usunięcia chmurowego profilu jest osobna; żądanie usunięcia konta lub pozostałych danych wyślij na kontakt@copowiesz.pl.",
    "Prawa do materiałów przekazanych przez użytkownika pozostają przy uprawnionych osobach. Opracowania, nazwa, interfejs i identyfikacja COPOWIESZ podlegają właściwym prawom; źródła zewnętrzne mają własne licencje. Regulamin nie daje wyłączności na tekst wytworzony przez model. Nowa wersja warunków będzie oznaczona datą i nie zmieni zapisanego podsumowania wcześniejszego zamówienia.",
  ] },
];
export const privacySections: LegalSection[] = [
  { id: "administrator", title: "1. Administrator i zakres", paragraphs: [
    "Administratorem danych przetwarzanych w związku z COPOWIESZ jest Multinewsroom Jan Domaniewski, ul. Barcicka 44, 01-839 Warszawa, NIP 5252189241, REGON 147154574. Sprawy prywatności i praw do danych: kontakt@copowiesz.pl. Wersja informacji: 2026-10-08.1.",
    "Informacje o zwierzęciu mogą łączyć się z danymi opiekuna i jego otoczenia. Traktujemy te zapisy jako prywatne. Film może zawierać głos, twarz, adres lub inne informacje o człowieku; unikaj ich rejestrowania. Nie wymagamy takich danych do przygotowania profilu i nie tworzymy biometrii ludzi.",
  ] },
  { id: "lokalnie", title: "2. Co zapisuje się na urządzeniu", paragraphs: [
    "Profile, zdjęcia, odpowiedzi, notatki, historia rozmów i pliki nagrań są domyślnie przechowywane w IndexedDB tej przeglądarki. Samo dodanie zwierzaka nie tworzy kopii profilu w Supabase. Po zalogowaniu przeglądarka może przechowywać techniczne tokeny sesji potrzebne do uwierzytelnienia.",
    "Lokalny zapis nie oznacza braku transmisji. Po wysłaniu wiadomości wiadomość i wybrany kontekst profilu trafiają do serwera aplikacji. Odpowiedź lokalna jest przygotowywana przez serwer z tych danych. Przy aktywnym Gemini odpowiednia część kontekstu i historii trafia też do Google. Zdjęcie profilu i bajty zdjęć albumu są pomijane w kontekście rozmowy. Omówienie wybranej chwili przekazuje jej opis opiekuna oraz ewentualne odwołanie do klipu; nie jest automatyczną analizą filmu. Funkcje głosu w przeglądarce mogą korzystać z usług jej dostawcy.",
  ] },
  { id: "przeplywy", title: "3. Oddzielne przepływy, oddzielne decyzje", paragraphs: [
    "Rozmowa: przekazujesz wiadomość, gatunek, imię, zgłoszony wiek, wybrane relacje i fragment wcześniejszej rozmowy. To dane do odpowiedzi, a nie automatycznie potwierdzone fakty. W publicznym pilotażu dostęp do Gemini jest obecnie wyłączony do czasu spełnienia wymogów dostawcy; odpowiedź lokalna ma własne oznaczenie.",
    "Analiza filmu: zapis w przeglądarce następuje przed analizą. Wysłanie krótkiego filmu albo wybranych klatek do Google wymaga osobnego zaznaczenia zgody. Większy film może być reprezentowany przez kilka klatek bez dźwięku; aplikacja opisuje ten zakres. Bez tej decyzji działa sprawdzenie parametrów. Nie zaznaczamy zgody automatycznie. Album, podsumowanie tygodnia i karta zwierzaka powstają na urządzeniu. Karta pokazuje tylko świadomie wybrane niezdrowotne informacje; pobranie i udostępnienie pliku wymagają osobnego działania użytkownika. Aplikacja nie publikuje jej automatycznie.",
    "Chmura: po zalogowaniu i wybraniu «Zapisz profile w chmurze» profile i historia trafiają do prywatnego projektu Supabase. Wysłanie filmów jest osobną czynnością. Pobranie profilu nie pobiera automatycznie filmów ani zdjęć albumu. Bajty zdjęć albumu pozostają lokalne także po ręcznym zapisie opisów profilu w chmurze. Zalogowanie samo w sobie nie synchronizuje historii.",
    "Płatność: gdy sprzedaż zostanie uruchomiona, przekażemy Przelewy24 dane potrzebne do transakcji, w tym kwotę, opis i e-mail z potwierdzonego konta. Nie będziemy przechowywać numeru karty ani bankowych danych logowania. Zamówienie zachowa zaakceptowane wersje warunków i potwierdzenie transakcji.",
  ] },
  { id: "cele", title: "4. Cele i podstawy przetwarzania", paragraphs: [
    "Dane potrzebne do funkcji, którą wybierasz, przetwarzamy w celu wykonania usługi — art. 6 ust. 1 lit. b RODO. Dotyczy to obsługi rozmowy, konta, ręcznej synchronizacji i zamówienia. Dobrowolne przekazanie filmu do zewnętrznej analizy opiera się na Twojej zgodzie — art. 6 ust. 1 lit. a. Możesz jej nie udzielić i nadal zachować film lokalnie.",
    "Dane techniczne wykorzystujemy do bezpieczeństwa, ochrony przed nadużyciami i obsługi zgłoszeń — art. 6 ust. 1 lit. f. Naszym uzasadnionym interesem jest działający i bezpieczny serwis. Dane wymagane przepisami dotyczącymi rozliczeń przetwarzamy na podstawie obowiązku prawnego — art. 6 ust. 1 lit. c. Nie używamy profili do reklam behawioralnych ani sprzedaży danych.",
    "Podanie danych jest dobrowolne, ale bez informacji potrzebnych do konkretnej funkcji nie da się jej wykonać. Nie musisz znać każdej odpowiedzi o zwierzęciu. Brak danych jest widoczny. Wycofanie zgody nie zmienia zgodności wcześniejszego przetwarzania.",
  ] },
  { id: "dostawcy", title: "5. Dostawcy i przekazanie poza EOG", paragraphs: [
    "Vercel zapewnia hosting i wykonanie serwera. Supabase zapewnia opcjonalne uwierzytelnienie, bazę i prywatny magazyn; projekt COPOWIESZ ma region Frankfurt. Google dostarcza Gemini tylko wtedy, gdy wybrana funkcja i zgodna konfiguracja pozwalają na wywołanie. PayPro S.A. będzie obsługiwał uruchomione płatności jako dostawca z własną polityką prywatności.",
    "Wybrany region bazy nie gwarantuje przetwarzania wszystkich danych wyłącznie w Unii Europejskiej. Dostawcy mogą używać infrastruktury i podwykonawców poza EOG na zasadach opisanych w ich umowach powierzenia i mechanizmach transferu, w tym odpowiednich standardowych klauzulach umownych. Linki do dokumentów dostawców podajemy poniżej; informacje o stosowanych zabezpieczeniach można uzyskać u administratora.",
    "Aktualne warunki Google wymagają dla aplikacji dostępnych użytkownikom EOG projektu API z aktywnym rozliczaniem. Dla usług objętych zasadami Paid Services Google deklaruje, że nie używa przekazanych treści do ulepszania modeli. Google może przechowywać je przez ograniczony czas dla bezpieczeństwa. W EOG te zasady użycia danych dotyczą także bezpłatnej quota; nie należy utożsamiać nazwy planu z zasadami trenowania.",
  ] },
  { id: "retencja", title: "6. Przechowywanie i usuwanie", paragraphs: [
    "Lokalne dane pozostają do usunięcia przez Ciebie, wyczyszczenia przeglądarki lub działania jej mechanizmów zwalniania miejsca. Własne pobrane kopie pozostają poza kontrolą aplikacji. Pobieraj je świadomie i przechowuj bezpiecznie; eksport JSON zawiera opisy albumu i ewentualne zdjęcie profilowe, lecz nie zawiera plików zdjęć albumu, wideo ani klucza API. Zdjęcia albumu i filmy pobierasz osobno.",
    "Dane konta i dobrowolnie zapisane profile pozostają w chmurze przez czas korzystania z konta, do usunięcia profilu lub zakończenia konta. Nie ma automatycznej gwarancji bezterminowej archiwizacji. Kopie techniczne dostawców i dane wymagane do obrony roszczeń lub wykonania obowiązku prawnego mogą pozostać po usunięciu danych operacyjnych, przez okres uzasadniony tym celem i zasadami danego dostawcy.",
    "Zgłoszenia obsługujemy przez czas ich rozpatrywania i ewentualnego dochodzenia roszczeń. Po uruchomieniu sprzedaży dokumenty rozliczeniowe będą przechowywane przez okres wymagany prawem podatkowym. Nie zapisujemy treści profili ani nagrań w zamierzonej analityce reklamowej. Żądanie usunięcia pozostałych danych lub konta skieruj na kontakt@copowiesz.pl; wskaż dane pozwalające bezpiecznie ustalić Twoje uprawnienie.",
  ] },
  { id: "prawa", title: "7. Twoje prawa i kontakt z organem", paragraphs: [
    "Na warunkach RODO przysługują Ci dostęp, sprostowanie, usunięcie, ograniczenie przetwarzania, przenoszenie danych, sprzeciw wobec przetwarzania opartego na uzasadnionym interesie i wycofanie zgody. Zgłoszenie wyślij na kontakt@copowiesz.pl. Masz prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.",
    "Funkcje lokalnego eksportu, poprawiania i usuwania są w ustawieniach i historii. Wyniki AI nie służą decyzjom wywołującym skutki prawne wobec użytkownika. Nie tworzymy oceny człowieka ani profilu do zautomatyzowanego przyznawania lub odmowy praw.",
  ] },
  { id: "techniczne", title: "8. Pamięć przeglądarki i bezpieczeństwo", paragraphs: [
    "Aplikacja wykorzystuje niezbędną pamięć przeglądarki do zapisu profilu i sesji. Nie dodaliśmy pikseli reklamowych ani narzędzi śledzenia marketingowego. Hosting i uwierzytelnianie przetwarzają dane techniczne potrzebne do świadczenia i ochrony usługi. Nie stosujemy banera zgody do wymuszania nieobecnych funkcji reklamowych.",
    "Sekret API Google pozostaje po stronie serwera. Chmurowe profile mają kontrolę dostępu właściciela, a filmy prywatny magazyn. Żadne zabezpieczenie nie usuwa ryzyka dostępu osoby korzystającej z tego samego odblokowanego urządzenia. Wyloguj się na cudzym sprzęcie i nie przekazuj haseł ani kluczy w wiadomościach do pomocy.",
  ] },
];
export function legalPlainText(title: string, sections: LegalSection[]) {
  return `${title}\nWersja: ${LEGAL_VERSION}\n\n${sections.map(section => `${section.title}\n${section.paragraphs.join("\n\n")}`).join("\n\n")}`;
}
