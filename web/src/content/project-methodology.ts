export interface MethodologySource {
  label: string;
  href: string;
}

export interface MethodologySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  sources?: MethodologySource[];
}

export const methodologyIntro: { eyebrow: string; title: string; lead: string } = {
  eyebrow: "Podstawy projektu",
  title: "Własny zwierzak. Wspólna historia. Rozmowa, która ma podstawę.",
  lead: "Codziennie próbujemy zrozumieć swoich psich i kocich przyjaciół. COPOWIESZ daje tej ciekawości formę rozmowy po polsku: z cyfrową reprezentacją Twojego zwierzaka, opartą na Twoich odpowiedziach, spokojnych nagraniach i zapisanych obserwacjach. Poniżej wyjaśniamy, jak przygotowujemy osobisty profil, z jakiej wiedzy korzystamy i gdzie kończą się możliwości obecnej wersji.",
};

export const projectMetrics: { value: string; label: string; description: string }[] = [
  { value: "85", label: "pytań o Twojego zwierzaka", description: "Przekrojowy formularz dla wybranego gatunku. Każde pytanie można przejrzeć bez zgadywania odpowiedzi." },
  { value: "11", label: "obszarów poznawania", description: "Od historii i środowiska po kontakt, komunikację, codzienne reakcje oraz informacje właściwe dla psa lub kota." },
  { value: "4", label: "konteksty nagrań", description: "Codzienność, znany głos i imię, znana zabawa oraz dobrowolny kontakt. Zwierzak sam wybiera swoją reakcję." },
  { value: "290", label: "autorskich kart wiedzy", description: "Polskie opracowania zachowania, metod obserwacji i sygnałów zdrowotnych. Każde zachowuje źródła oraz ograniczenia." },
  { value: "173", label: "wpisy źródłowe", description: "Publikacje, wytyczne i oficjalne materiały. To liczba rekordów bibliografii, a nie niezależnych badań potwierdzających produkt." },
  { value: "2", label: "gatunki w pierwszej wersji", description: "Pies i kot mają właściwe dla siebie pytania i wiedzę. Profil pozostaje osobny dla każdego zwierzęcia." },
];

export const methodologySections: MethodologySection[] = [
  {
    id: "rozmowa-z-wlasnym-zwierzakiem",
    title: "Rozmowa zaczyna się od tego, co Was łączy",
    paragraphs: [
      "Chcesz zapytać, dlaczego Twój pies wybiera akurat tę zabawkę? Zastanawiasz się, w jakich chwilach Twój kot szuka bliskości, a kiedy woli odpocząć sam? Głównym doświadczeniem COPOWIESZ jest rozmowa po polsku o konkretnym zwierzęciu i Waszej wspólnej codzienności.",
      "Imię i zdjęcie pomagają rozpoznać profil. Jego indywidualność budują odpowiedzi opiekuna, przykłady zachowania, nagrania oraz historia, którą świadomie zapisujesz. Dzięki temu rozmowa może odwołać się do rzeczywiście zgłoszonej ulubionej zabawki lub rutyny, zamiast przypisywać wszystkim psom i kotom te same upodobania.",
      "Cyfrowy rozmówca może mówić w pierwszej osobie, ale jego głos jest wyobrażoną reprezentacją. Przygotowujemy sposób opowiadania o zwierzęciu na podstawie dostępnego materiału. Nie posiadamy dostępu do jego myśli ani metody przeniesienia świadomości. Naszym celem jest ułatwienie uważnego poznawania, zadawania lepszych pytań i sprawdzania własnych przypuszczeń.",
    ],
    bullets: [
      "Osobny profil dla konkretnego psa lub kota.",
      "Wspólne zdarzenia pochodzą z tego, co zapiszesz lub potwierdzisz.",
      "Przed zakończeniem przygotowania rozmowa pozostaje oznaczoną demonstracją.",
    ],
  },
  {
    id: "podstawy-behawiorystyczne",
    title: "Zachowanie oglądamy w jego otoczeniu",
    paragraphs: [
      "Fundament projektu obejmuje etologię, czyli obserwację zachowania zwierząt, oraz wiedzę o uczeniu, komunikacji, potrzebach środowiskowych i dobrostanie. W praktyce pytamy: co wydarzyło się przed reakcją, co dokładnie zrobił zwierzak, kto był obok i co nastąpiło potem.",
      "Zamiast zaczynać od etykiety «jest uparty», prosimy o opis sytuacji. Czy sygnał był wcześniej znany? Czy zwierzę zajmowało się czymś innym? Czy miało możliwość odejścia? Taki zapis daje materiał do rozważenia kilku wyjaśnień i pomaga uniknąć przypisania stałej cechy na podstawie jednego zdarzenia.",
      "Nasze zasady prowadzenia obserwacji są autorską adaptacją wiedzy do aplikacji. Zadania wykorzystują znane, spokojne aktywności i wybór zwierzęcia. Nie organizujemy prób wytrzymałości, straszenia, odbierania jedzenia ani celowej separacji. Dobrostan jest warunkiem zbierania materiału i ma pierwszeństwo przed ukończeniem zadania.",
    ],
    sources: [
      { label: "AVSAB: stanowisko o humanitarnym szkoleniu psów, 2021", href: "https://avsab.org/wp-content/uploads/2021/08/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf" },
      { label: "AAFP/ISFM: zasady przyjaznej interakcji weterynaryjnej z kotem, 2022", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10845437/" },
    ],
  },
  {
    id: "indywidualnosc-psa-i-kota",
    title: "Ten pies i ten kot mają własną historię",
    paragraphs: [
      "Wiedzę o psach i kotach rozdzielamy według gatunku. Nie przenosimy wyniku badania kota na psa tylko dlatego, że oba zwierzęta mieszkają z człowiekiem. Wspólne zasady obserwacji mogą dotyczyć obu gatunków, ale konkretne interpretacje muszą mieć właściwą podstawę.",
      "W profilu uwzględniamy etap życia, otoczenie, doświadczenia, zwykłe aktywności i zgłoszony stan zdrowia. Rasa lub wygląd nie wypełniają brakujących odpowiedzi. Nawet przy podobnym wyglądzie dwa zwierzęta mogą mieć inne rutyny i preferencje; opis własnego pupila wymaga własnych przykładów.",
      "Osobno traktujemy powtarzający się zwyczaj, reakcję w konkretnej chwili, kontekst zdrowotny oraz styl cyfrowej wypowiedzi. Zmiana tonu narracji nie jest zmianą osobowości. Spadek aktywności nie staje się automatycznie nowym charakterem zwierzęcia.",
    ],
    sources: [
      { label: "Morrill i współautorzy: badanie genomiki psów i stereotypów rasowych, 2022", href: "https://pubmed.ncbi.nlm.nih.gov/35482869/" },
      { label: "Mikkola i współautorzy: badanie cech zachowania kotów, 2021", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8300181/" },
    ],
  },
  {
    id: "przekrojowy-test-opiekuna",
    title: "85 pytań, które porządkują codzienne obserwacje",
    paragraphs: [
      "Pełne przygotowanie osobistego profilu obejmuje przekrojowy test opiekuna. Dla psa albo kota aplikacja pokazuje 85 pytań w 11 obszarach. Możesz przechodzić przez nie etapami, zapisywać odpowiedzi i wracać w dogodnym momencie. Pytamy zarówno o zwyczaje, jak i warunki, w których zostały zaobserwowane.",
      "Formularz obejmuje historię, jakość obserwacji, zgłoszony kontekst zdrowia, otoczenie, odpoczynek, kontakt, komunikację, uczenie, zwykłe zdarzenia, część gatunkową oraz przykłady do przeglądu. Pytania o bieżące zachowanie zwykle odnoszą się do ostatnich 14 dni. Informacje historyczne mają odrębny zakres.",
      "«Nie wiem», «nie dotyczy» i pominięcie są jawnymi odpowiedziami o stanie wiedzy. Nie zamieniamy ich w zero lub fakt o zwierzęciu. Nasze pytania są autorskie i nie są zwalidowanym polskim odpowiednikiem C-BARQ czy Fe-BARQ. Te odrębne narzędzia stanowią punkt odniesienia w literaturze; ich walidacja nie przechodzi na COPOWIESZ.",
    ],
    bullets: [
      "Znaczenie ma konkretny przykład i naturalna okazja do obserwacji.",
      "Odpowiedzi o zdrowiu zachowujemy jako zgłoszony kontekst.",
      "Ukończenie przeglądu pytań opisuje zakres materiału, nie wynik osobowości.",
    ],
    sources: [
      { label: "Hsu i Serpell: rozwój i walidacja C-BARQ, 2003", href: "https://pubmed.ncbi.nlm.nih.gov/14621216/" },
      { label: "Duffy i współautorzy: rozwój i ocena Fe-BARQ, 2017", href: "https://pubmed.ncbi.nlm.nih.gov/28232232/" },
    ],
  },
  {
    id: "kierowane-nagrania",
    title: "Cztery spokojne konteksty, jasne instrukcje",
    paragraphs: [
      "Drugim wymaganym filarem przygotowania są rzeczywiste krótkie nagrania. Aplikacja prowadzi przez cztery konteksty: chwilę codzienności, znany głos i imię, zaproszenie do znanej zabawy oraz dobrowolny kontakt. Dostajesz instrukcję, co powiedzieć lub zrobić w zwykłej sytuacji, jak ustawić telefon i kiedy przerwać.",
      "Przy imieniu opiekun mówi raz swoim normalnym głosem. Przy kontakcie spokojnie siada i pozwala zwierzęciu wybrać dystans. Zabawa wykorzystuje znaną bezpieczną zabawkę w zwykłej rutynie. Kierujemy sposobem dokumentowania, pozostawiając zwierzęciu wybór udziału i reakcji.",
      "Brak widocznej reakcji jest częścią obserwacji, jeśli pozwala na to kadr i kontekst. Niewidoczna głowa pozostaje niewidoczna. Przerwany lub pominięty klip nie zalicza danego kontekstu przygotowania. Możesz wrócić przy naturalnej okazji; nie trzeba wołać ponownie, budzić ani wyciągać zwierzęcia z kryjówki, aby osiągnąć postęp.",
    ],
    bullets: [
      "Nagrywaj zwierzę w znanym miejscu i zapewnij drogę odejścia.",
      "Zakończ interakcję, gdy zwierzę rezygnuje lub pojawiają się niepokojące oznaki.",
      "Reakcję na Twój głos odróżniamy od reakcji na dźwięk odtwarzany przez aplikację.",
      "Nie nagrywaj ponownie objawu, jeśli film mógłby opóźnić potrzebną pomoc.",
    ],
  },
  {
    id: "czytanie-sygnalow",
    title: "Najpierw widoczny fakt, potem możliwe wyjaśnienie",
    paragraphs: [
      "«Odwrócił głowę i odszedł» opisuje widoczne zachowanie. «Nie chciał już kontaktu» jest interpretacją. «Zawsze woli być sam» to jeszcze szerszy wniosek, wymagający innych przykładów. W COPOWIESZ te poziomy mają pozostać rozdzielone.",
      "Interesuje nas przebieg zdarzenia: pozycja, ruch, dystans, dźwięki, dostępne otoczenie oraz sekwencja przed i po reakcji. Zestaw sygnałów pomaga uporządkować opis. Ani pojedyncze ułożenie ucha, ani płynne wyjaśnienie modelu nie potwierdzają wewnętrznej emocji.",
      "Fundament zawiera autorski katalog 80 obserwowalnych zachowań do dalszego rozwijania sposobu opisu. Ten katalog nie jest zwalidowaną skalą emocji. W obecnej aplikacji nie deklarujemy automatycznego, sprawdzonego kodowania wszystkich tych zachowań ani pomiaru osobowości z filmu.",
    ],
    sources: [
      { label: "DogFACS: opis obserwacyjnego kodowania ruchów twarzy psa", href: "https://animalfacs.github.io/AnimalFACS/DogFACS" },
      { label: "CatFACS: publikacja o rozwoju narzędzia dla kota, 2017", href: "https://www.sciencedirect.com/science/article/pii/S0168159117300102" },
    ],
  },
  {
    id: "pamiec-i-potwierdzenie",
    title: "Pamięć, nad którą masz kontrolę",
    paragraphs: [
      "Osobista rozmowa potrzebuje osobistej pamięci: wybranej zabawki, miejsca odpoczynku, zwyczaju na spacerze czy zdarzenia, które chcesz zachować. Wpis może pochodzić z Twojej relacji lub z adnotacji do konkretnego filmu. Odpowiedzi z formularza są przechowywane osobno od tych wspomnień.",
      "Model może zaproponować opis nagrania, ale nie zapisuje go samoczynnie jako potwierdzonej obserwacji. Oglądasz film, wpisujesz własny opis i jawnie go potwierdzasz. Zatwierdzenie oznacza Twoją relację lub adnotację; nie stanowi decyzji behawiorysty albo lekarza.",
      "Możesz zmienić odpowiedź w teście, usunąć błędne wspomnienie i dodać poprawne. Pamięć ma wspierać pytanie «Czy nadal to do niego pasuje?». Liczba wpisów informuje o liczbie zapisów; bez informacji o czasie i okazjach nie jest częstością zachowania w życiu zwierzęcia.",
    ],
    bullets: [
      "Relacja opiekuna, adnotacja filmu i propozycja modelu mają odrębne znaczenie.",
      "Ważna odpowiedź może wskazać dostępne zapisy i wykorzystaną wiedzę.",
      "Brak materiału powinien prowadzić do pytania, nie do wymyślonego wspomnienia.",
    ],
  },
  {
    id: "zrodla-i-jakosc",
    title: "Sprawdzalna wiedza, jawny zakres opracowania",
    paragraphs: [
      "Obecny fundament obejmuje 290 autorskich polskich kart: 210 dotyczących zachowania, 40 metod obserwacji i 40 sygnałów zdrowotnych. Bibliografia ma 173 wpisy źródłowe. Są w niej badania pierwotne, wytyczne, oficjalne materiały edukacyjne i dokumentacja narzędzi. Powiązane rekordy mogą odnosić się do tej samej publikacji, dlatego nie nazywamy tej liczby liczbą niezależnych badań.",
      "Karta zachowuje opis sytuacji, możliwe interpretacje, czynniki zakłócające, proponowany krok, źródła i ograniczenia. W nowszej części zbioru osobno oznaczamy ustalenie źródłowe oraz własną rekomendację projektu. 80 starszych kart nadal ma wsparcie tematu zamiast dokładnego cytowania każdego twierdzenia i oczekuje dalszej redakcji.",
      "Zakres lektury bywa różny: abstrakt, wybrane części pełnego tekstu lub oficjalny materiał. Pełny przegląd ekspercki i audyt korekt całej bibliografii pozostają do wykonania. Cytowany autor lub instytucja nie jest przez samą obecność publikacji partnerem projektu. Opracowana wiedza pomaga stawiać pytania; nie potwierdza automatycznie konkretnej odpowiedzi o Twoim zwierzęciu.",
    ],
    sources: [
      { label: "VIDOPET: odrębne badanie pomiaru cech psów, 2018", href: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0195448" },
      { label: "ARRIVE 2.0: wytyczne raportowania badań na zwierzętach, 2020", href: "https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000410" },
    ],
  },
  {
    id: "zdrowie-poza-rola",
    title: "Gdy chodzi o zdrowie, mówimy wprost do opiekuna",
    paragraphs: [
      "Zmiana zachowania może być ważną informacją o samopoczuciu. W profilu zachowujemy zgłoszony kontekst zdrowia, a informacje dotyczące objawów przedstawiamy poza wyobrażonym głosem zwierzaka. Ten obszar ma pomóc uporządkować to, co zauważasz, i przygotować opis do konsultacji.",
      "Karty zdrowia opisują obserwowalne sygnały, przykładowe możliwe przyczyny i kierunek kontaktu z lekarzem. Lista przyczyn nie jest rozpoznaniem ani rankingiem prawdopodobieństwa. Film, formularz i rozmowa nie zastępują badania; nie dobieramy leków ani dawek.",
      "Wyszukanie karty nie ocenia realnego pacjenta, a brak pasującego wyniku nie wyklucza zagrożenia. Przy trudnościach z oddychaniem, utracie przytomności lub nagłym ciężkim pogorszeniu pomoc nie powinna czekać na nagranie ani odpowiedź aplikacji. Nowego niepokojącego zachowania nie zamieniamy w cechę do zabawnej narracji.",
    ],
    sources: [
      { label: "Cornell Feline Health Center: duszność u kota", href: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/dyspnea-difficulty-breathing" },
    ],
  },
  {
    id: "rola-modelu-i-wideo",
    title: "AI pomaga opowiadać i porządkować materiał",
    paragraphs: [
      "Generowanie wypowiedzi po polsku korzysta z informacji o wybranym zwierzęciu i dobranej wiedzy. Gdy zewnętrzny model nie jest dostępny, aplikacja może pokazać oznaczoną odpowiedź lokalną opartą na zapisach. Te tryby mają różny zakres i jawnie wskazujemy dostawcę odpowiedzi.",
      "Analiza obrazu przez model jest propozycją opisu wymagającą przeglądu. Zależnie od materiału dostawca może otrzymać cały zgodny klip albo wybrane klatki. Same klatki nie pokazują ciągłego ruchu ani reakcji na dźwięk. Bez zgody na wysłanie działa kontrola parametrów nagrania; nie jest to rozpoznanie zachowania.",
      "Dostęp do zewnętrznej AI zależy od prawidłowej konfiguracji, limitów i warunków dostawcy. Nie obiecujemy bezpłatnego publicznego dostępu do Gemini w Polsce. Nie wytrenowaliśmy własnego modelu osobowości, biometrii ani klinicznie zwalidowanego modelu interpretacji wideo. Płynny język odpowiedzi nie jest miarą prawdziwości opisu.",
    ],
    sources: [
      { label: "Google: aktualne dodatkowe warunki Gemini API", href: "https://ai.google.dev/gemini-api/terms" },
      { label: "NIST: profil ryzyka generatywnej AI, 2024", href: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf" },
    ],
  },
  {
    id: "prywatnosc-i-zgody",
    title: "Nagrania i historia pozostają świadomą decyzją",
    paragraphs: [
      "Domyślny zapis aplikacji obejmuje lokalne dane tej przeglądarki: profil, odpowiedzi, rozmowę i pliki filmów. Obsługa rozmowy przekazuje wiadomość i kontekst do serwera aplikacji; przy użyciu zewnętrznego modelu wybrane informacje o zwierzaku i fragment historii trafiają także do dostawcy. Lokalny zapis nie oznacza rozmowy bez przesyłania danych.",
      "Zezwolenie na użycie kamery nie jest zgodą na wysłanie filmu do zewnętrznego modelu. Analiza filmu lub wybranych klatek przez Google wymaga odrębnej decyzji widocznej przy tej operacji. To inny przepływ niż treść i kontekst używane podczas rozmowy.",
      "Masz do dyspozycji eksport i import profilu, pobranie filmów oraz usunięcie profilu z lokalnej aplikacji. Eksport profilu i pobranie nagrań są osobnymi operacjami. Usunięcie w aplikacji nie usuwa kopii, które samodzielnie zapisałeś poza nią, ani nie zastępuje zasad przechowywania danych u zewnętrznego dostawcy.",
      "Nagrywaj własnego zwierzaka i możliwie mały fragment otoczenia. Unikaj danych osób, dokumentów, adresów i prywatnych rozmów. Korzystaj wyłącznie z materiału, do którego masz odpowiednie uprawnienia, uwzględniając osoby widoczne lub słyszalne na filmie. Zasady przetwarzania przez dostawcę zależą od wybranej usługi i obowiązujących warunków.",
    ],
    bullets: [
      "Oddzielne decyzje o kamerze, wysłaniu filmu do AI i użyciu funkcji chmurowych.",
      "Wynik modelu pozostaje odrębny od potwierdzonego wpisu w pamięci.",
      "Eksportuj ważne zapisy przed wyczyszczeniem danych przeglądarki.",
    ],
    sources: [
      { label: "Google: warunki użycia i przetwarzania materiału w Gemini API", href: "https://ai.google.dev/gemini-api/terms" },
    ],
  },
  {
    id: "rozwoj-i-walidacja",
    title: "Rozwijamy projekt wraz z jego dowodami",
    paragraphs: [
      "Działa aplikacja z rozmową, formularzem, nagraniami, pamięcią i wiedzą. Sprawdzenia oprogramowania obejmują między innymi strukturę danych, rozdzielenie gatunków, zapis, usuwanie i przebieg przygotowania z danymi syntetycznymi. To potwierdza określone działanie programu; nie jest naukową walidacją osobowości zwierząt.",
      "Kolejny etap wymaga niezależnej oceny treści przez specjalistów, sprawdzenia zrozumiałości pytań, zgodności obserwatorów, powtarzalności oraz testów w rzeczywistych polskich domach. Osobno trzeba ocenić jakość opisu filmu i zgodność rozmowy z materiałem. Dłuższy test lub większa bibliografia same nie zastępują tych badań.",
      "Możesz poznawać swojego zwierzaka dalej: dopisywać codzienne obserwacje, wracać do odpowiedzi i sprawdzać przykłady, które nie pasują do dotychczasowego obrazu. COPOWIESZ ma wspierać tę uważność. Obecna wersja jest rozwijanym prototypem z jawnymi ograniczeniami, bez certyfikatu skuteczności i bez gwarancji poznania wszystkiego o zwierzęciu.",
    ],
  },
];

export const methodologyFaqs: { question: string; answer: string }[] = [
  { question: "Czy naprawdę rozmawiam ze swoim zwierzakiem?", answer: "Rozmawiasz po polsku z jego cyfrową reprezentacją. Wypowiedzi mogą korzystać z odpowiedzi, wspólnej historii i potwierdzonych obserwacji konkretnego zwierzęcia. To wyobrażony głos oparty na materiale, bez dostępu do myśli pupila." },
  { question: "Po co pełny test i cztery nagrania?", answer: "Dwa filary pozwalają zebrać opis codzienności oraz przykłady z konkretnych sytuacji. W tej wersji przygotowanie obejmuje przegląd 85 pytań i cztery rzeczywiste klipy w wymaganych kontekstach. Gotowość wskazuje pokrycie materiału; nie oznacza zwalidowanego wyniku osobowości." },
  { question: "Czy muszę wypełnić wszystko za jednym razem?", answer: "Możesz przygotowywać profil etapami i wracać do zapisanych odpowiedzi. Nagrania wykonuj przy naturalnej okazji, gdy zwierzę spokojnie czuwa i ma możliwość odejścia. Przed ukończeniem przygotowania rozmowa jest oznaczona jako demonstracja." },
  { question: "Co zrobić, jeśli nie znam odpowiedzi?", answer: "Wybierz «nie wiem», «nie dotyczy» lub pomiń pytanie. Aplikacja zachowuje ten stan i nie zastępuje go zerem ani domysłem. Przejrzenie pytania pozwala uporządkować przygotowanie, ale nieznana odpowiedź pozostaje brakiem wiedzy." },
  { question: "A jeśli zwierzak nie zareaguje na imię?", answer: "Zapisz brak widocznej reakcji wraz z warunkami nagrania. Nie wołaj ponownie do skutku i nie dopisuj interpretacji o upartości lub więzi. Taki klip może dokumentować kontekst; niewidoczne części ciała i brak dźwięku trzeba uwzględnić jako ograniczenia." },
  { question: "Czy można przerwać lub pominąć nagranie?", answer: "Tak. Komfort zwierzęcia ma pierwszeństwo. Przerwane i pominięte klipy pozostają zapisanymi brakami i nie zaliczają wymaganego kontekstu. Aplikacja pozwala przejść dalej; wróć przy naturalnej okazji, bez wymuszania reakcji." },
  { question: "Czy mój pies albo kot musi umieć komendy?", answer: "Cztery wymagane konteksty nie wymagają nauki nowych komend. Obejmują zwykłą aktywność, imię, znaną zabawę i dobrowolny kontakt. Zadanie dotyczące już znanego spokojnego sygnału jest opcjonalne." },
  { question: "Czy reakcja na głos aplikacji jest tym samym co reakcja na mnie?", answer: "To inne warunki. W podstawowym zadaniu imię wypowiada opiekun własnym głosem. Odtwarzanie mowy przez urządzenie wymaga osobnego kontekstu i nie potwierdza rozumienia zdania ani reakcji na głos właściciela." },
  { question: "Czy test jest naukowo zwalidowany?", answer: "Autorski formularz COPOWIESZ jest niezwalidowanym prototypem. Publikacje o C-BARQ, Fe-BARQ i innych narzędziach pomagają określić zagadnienia oraz plan badań, ale nie potwierdzają rzetelności naszych pytań, instrukcji wideo ani całego produktu." },
  { question: "Czy aplikacja tłumaczy szczekanie i miauczenie?", answer: "Może uwzględniać opis wokalizacji i sytuacji, w której wystąpiła. Nie deklarujemy słownika przekładającego każdy dźwięk na polskie zdanie. Wypowiedź cyfrowej reprezentacji nie jest dosłownym tłumaczeniem sygnału zwierzęcia." },
  { question: "Czy film pozwala rozpoznać chorobę?", answer: "Film może pomóc opisać widoczny sygnał do konsultacji, ale nie ustala przyczyny. Informacje zdrowotne kierujemy do opiekuna poza wyobrażonym głosem. Potrzebne badanie i pomoc nie powinny czekać na analizę aplikacji; nie zalecamy leków ani dawek." },
  { question: "Czy wynik AI od razu staje się wspomnieniem?", answer: "Nie. Propozycja modelu wymaga przeglądu. Wpis do pamięci powstaje po Twoim jawnym zapisie i potwierdzeniu obserwacji. Pozostaje adnotacją lub relacją opiekuna, a nie automatyczną decyzją eksperta." },
  { question: "Jak poprawić informację o zwierzaku?", answer: "Odpowiedzi możesz zmienić w teście. Błędne wspomnienie usuń i dodaj właściwy zapis z kontekstem. Nową zmianę warto odnotować, zamiast traktować starszy opis jako niezmienną prawdę." },
  { question: "Czy nagranie automatycznie trafia do Google?", answer: "Nagranie jest domyślnie zapisane lokalnie w przeglądarce. Wysłanie filmu lub wybranych klatek do Google wymaga odrębnej zgody. Bez niej dostępna jest kontrola parametrów nagrania, która nie rozpoznaje zachowania." },
  { question: "Jakie dane są potrzebne do odpowiedzi w rozmowie?", answer: "Wiadomość i kontekst profilu są przekazywane do serwera aplikacji. Przy rozmowie z zewnętrzną AI dostawca otrzymuje także wybrane informacje o zwierzaku oraz fragment historii potrzebny do wygenerowania wypowiedzi. Filmy mają osobną ścieżkę wysłania i zgodę." },
  { question: "Czy mogę pobrać i usunąć moje dane?", answer: "Aplikacja ma eksport i import profilu, pobieranie filmów oraz lokalne usuwanie profilu. Filmy pobiera się osobno od eksportu profilu. Samodzielnie zapisane kopie i dane przekazane dostawcy mają odrębny zakres przechowywania i usuwania." },
  { question: "Czy zewnętrzna AI jest zawsze dostępna i bezpłatna?", answer: "Jej dostęp zależy od zgodnej z warunkami konfiguracji oraz limitów dostawcy. Nie gwarantujemy bezpłatnej publicznej rozmowy Gemini w Polsce. Przy braku modelu może działać jawnie oznaczona, ograniczona odpowiedź lokalna na podstawie zapisów." },
  { question: "Czy można poznać wszystko o zwierzaku?", answer: "Możesz stopniowo poznawać więcej zwyczajów, preferencji i kontekstów jego reakcji. Każdy profil ma jednak granice: nieznane zdarzenia, niewidoczne sygnały i niepewne interpretacje. Naszym celem jest pomagać w uważnej relacji i rozmowie, zachowując te granice." },
];
