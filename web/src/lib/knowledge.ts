import cardsData from "../data/knowledge-cards.json";
import sourcesData from "../data/knowledge-sources.json";
import { buildProfileFacts, getReadiness } from "./domain";
import type { Evidence, KnowledgeCard, KnowledgeSource, Message, PetRecord, Species } from "./types";

export const knowledgeCards = cardsData as KnowledgeCard[];
export const knowledgeSources = sourcesData as KnowledgeSource[];
const sourceById = new Map(knowledgeSources.map((source) => [source.id, source]));
type Domain = "behavior" | "methods" | "health";

const stopWords = new Set("a aby ale albo bo by czy dla do gdy i jak jaki jaka jakie jest juz kiedy lub ma moze moga mozna moj moja moje na nie o od oraz po przy sie to w we z ze pies psa psu kot kota koty ty twoj twoja twoje czego dlaczego co mi mnie ciebie ci lubisz lubi lubie najchetniej najbardziej zwykle".split(" "));
const termGroups: Record<string, string> = {
  zoltaczka: "zolty zolta zolte zoltawe zoltymi zoltych zoltawy zolknie",
  mocz: "moczu moczem sika sikac sikanie sikania wysikac siusiac siusia siusianie",
  oddech: "oddychanie oddychac oddycha zipie zipac",
  wymioty: "wymiotuje wymiotowac wymiotowanie wymiotowania wymiotami rzyga",
  ucho: "ucha uszy uszu uchu uszach uchem", oko: "oczy oczach oka okiem oku oczami",
  glowa: "glowe glowa glowy glowie", szyja: "szyje szyi", pysk: "pyskiem pyska pysku",
  otwarty: "otwartym otwarte otwarta otwartymi", brzuch: "brzucha brzuchem brzuchu",
  lapa: "lapy lapami lape lapie lap", zabawa: "zabawy zabawie zabawe zabawami bawi bawic bawisz zabawka zabawki zabawke",
  sen: "snu snie spi spanie spac spaniem odpoczynek odpoczynku odpoczywac odpoczywasz odpoczywa",
  wech: "weszy weszenie weszyc wacha wachanie wachac wechu spacer spacerze spacery spacerach",
  bol: "bolu bolem boli bolesny bolesne bolesna", kontakt: "dotyk dotyku dotykanie glaskanie glaszcze glaskac",
};
const aliases = new Map(Object.entries(termGroups).flatMap(([canonical, variants]) => variants.split(" ").map((variant) => [variant, canonical] as const)));

export function fold(text: string): string {
  return text.toLocaleLowerCase("pl").replaceAll("ł", "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokens(text: string): string[] {
  const words = fold(text).match(/[a-z0-9]+/g) ?? [];
  return [...new Set(words.flatMap((word) => [word, aliases.get(word) ?? word]).filter((word) => word.length > 1 && !stopWords.has(word)))].slice(0, 24);
}

const indexedCards = knowledgeCards.map((card) => ({ card, titleTokens: new Set(tokens(`${card.title} ${card.tags.join(" ")}`)), bodyTokens: new Set(tokens(`${card.observation} ${card.possible_interpretations.join(" ")} ${card.safe_next_steps.join(" ")} ${card.claims?.map((claim) => claim.text).join(" ") ?? ""}`)) }));

export function searchKnowledge(query: string, species: Species, domain?: Domain, limit = 5): KnowledgeCard[] {
  if (species !== "dog" && species !== "cat") return [];
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  return indexedCards
    .filter(({ card }) => card.species.includes(species) && (!domain || (card.domain ?? "behavior") === domain))
    .map(({ card, titleTokens, bodyTokens }) => ({ card, score: queryTokens.reduce((sum, token) => sum + (titleTokens.has(token) ? 3 : 0) + (bodyTokens.has(token) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, Math.max(0, Math.min(20, limit)))
    .map(({ card }) => card);
}

export function getKnowledgeEvidence(card: KnowledgeCard): Evidence[] {
  return card.source_ids.flatMap((id) => {
    const source = sourceById.get(id);
    if (!source) return [];
    const claims = card.claims?.filter((claim) => claim.source_ids.includes(id));
    return [{ id: `${card.id}:${id}`, title: source.title, url: source.url, kind: "knowledge" as const, excerpt: `${card.title}. ${claims?.length ? claims.map((claim) => `${claim.text} Ograniczenie: ${claim.uncertainty}`).join(" ") : card.observation} Ograniczenie karty: ${card.limitations} Status: ${card.review_status ?? "karta oczekuje przeglądu eksperckiego"}.` }];
  });
}

// Routing językowy do ostrożnej informacji, nie algorytm rozpoznawania chorób.
export function isHealthQuestion(message: string): boolean {
  return /\b(bol\w*|chorob\w*|chory|chora|choruje|zdrow\w*|wymiot\w*|rzyga|dusz\w*|oddych\w*|oddech\w*|krw\w*|sinaw\w*|lek\w*|dawk\w*|biegun\w*|drgawk\w*|omdla\w*|zatruc\w*|truciz\w*|weterynar\w*|zolte|zolty|zolta|dzi\w*sla|kuweta|mocz\w*|sika\w*|wysik\w*)\b/.test(fold(message)) || /nie (je|pije|moze wstac|moze oddac|moze sie wysikac)/.test(fold(message));
}

export interface GroundedReply { content: string; evidence: Evidence[]; mode: NonNullable<Message["mode"]> }

function healthReply(record: PetRecord, message: string): GroundedReply {
  const cards = searchKnowledge(message, record.pet.species, "health", 2);
  const evidence = cards.flatMap(getKnowledgeEvidence);
  if (!cards.length) return {
    content: "Informacja dla opiekuna: z samej wiadomości, wyglądu lub filmu nie można rozpoznać choroby. Jeśli obserwujesz nową lub niepokojącą zmianę, skontaktuj się z lekarzem weterynarii i opisz, od kiedy trwa oraz czym różni się od zwykłego zachowania. Przy trudnościach z oddychaniem, utracie przytomności lub nagłym ciężkim pogorszeniu nie opóźniaj pomocy nagrywaniem. Nie dobieram leków ani dawek.", evidence, mode: "health",
  };
  const descriptions = cards.map((card) => `${card.title}: ${card.safe_next_steps.join(" ")} ${card.limitations}`).join("\n\n");
  return {
    content: `Informacja dla opiekuna — poza wyobrażonym głosem zwierzaka.\n\nPoniższe karty zostały dobrane przez dopasowanie słów; nie potwierdzają, że opisany objaw występuje ani co go powoduje. Jeśli obserwujesz taki objaw:\n\n${descriptions}\n\nWymagane jest badanie weterynaryjne. Nie rozpoznaję choroby z rozmowy lub filmu i nie zalecam leków ani dawek.`, evidence, mode: "health",
  };
}

function matchingFacts(record: PetRecord, query: string): Evidence[] {
  const queryTokens = tokens(query);
  return buildProfileFacts(record)
    // Nie używamy zgłoszonych problemów zdrowotnych jako „osobowości”.
    .filter((fact) => !record.memories.some((memory) => memory.id === fact.id && memory.category === "health"))
    .filter((fact) => !/^q0(2[0-9]|9[34])$/.test(fact.id))
    .map((fact) => { const factTokens = new Set(tokens(`${fact.title} ${fact.excerpt}`)); return { fact, score: queryTokens.reduce((sum, token) => sum + (factTokens.has(token) ? 1 : 0), 0) }; })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ fact }) => fact);
}

export function buildGroundedReply(record: PetRecord, message: string): GroundedReply {
  if (isHealthQuestion(message)) return healthReply(record, message);
  const facts = matchingFacts(record, message);
  const mode = record.isDemo ? "demo" : "grounded";
  const partial = !record.isDemo && !getReadiness(record).ready;
  const context = record.isDemo ? "Demonstracja — dane syntetyczne. " : partial ? "Rozmowa na podstawie częściowych informacji. " : "";
  if (facts.length) {
    const quotes = facts.map((fact) => `„${fact.excerpt}”`).join("\n");
    return { content: `${context}Jako cyfrowa reprezentacja ${record.pet.name} mogę oprzeć odpowiedź na tym, co o mnie zapisujesz:\n\n${quotes}\n\nTo relacja lub adnotacja opiekuna, a nie odczyt moich myśli. Czy nadal pasuje do Twoich ostatnich obserwacji? Możesz poprawić wspomnienie.`, evidence: facts, mode };
  }
  const general = searchKnowledge(message, record.pet.species, "behavior", 1);
  const card = general[0];
  if (card) return {
    content: `${context}Jeszcze nie mamy zapisu, który pozwala odpowiedzieć o mnie osobiście. Wiedza o ${record.pet.species === "dog" ? "psach" : "kotach"} podpowiada bezpieczny następny krok: ${card.safe_next_steps.join(" ")}\n\n${card.limitations}\n\nOpisz jedną zwykłą sytuację: co było przed, co zrobił zwierzak i co wydarzyło się potem. Dopiero taką relację można dodać do mojej pamięci.`, evidence: getKnowledgeEvidence(card), mode,
  };
  return {
    content: `${context}Jeszcze nie mamy informacji, żeby odpowiedzieć na to w imieniu ${record.pet.name}. Nie chcę wymyślać naszych wspomnień ani moich preferencji.\n\nCo ostatnio udało Ci się zauważyć? Zapisz konkretną sytuację w mojej pamięci albo przejdź do następnego pytania i spokojnego nagrania.`, evidence: [], mode,
  };
}
