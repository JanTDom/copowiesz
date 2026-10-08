import { buildProfileFacts, getQuestions, getReadiness, getTasks, validateAnswer } from "./domain";
import { isHealthQuestion } from "./knowledge";
import type { Evidence, PetRecord } from "./types";

export interface ConversationTopic { id: string; title: string; label: string; prompt: string; evidence?: Evidence[] }
export interface WeeklySummaryItem { id: string; title: string; text: string; createdAt: string; evidence: Evidence[]; kind: "memory" | "answer" | "moment" | "clip" }
export interface WeeklySummary { from: string; to: string; items: WeeklySummaryItem[]; emptyMessage: string; prompt: string }
export interface FirstConversation { ready: boolean; welcome: string; evidence: Evidence[]; prompt: string }

const shareQuestions = new Set(["q045", "q046", "q062", "q066", "q073", "q086"]);
const excludedQuestions = new Set(["q004", "q005", "q009", "q085", "q093", "q094"]);
function nonHealthFacts(record: PetRecord): Evidence[] {
  if (record.isDemo) return [];
  const questions = new Map(getQuestions(record.pet.species).map(question => [question.id, question]));
  const memories = new Map(record.memories.map(memory => [memory.id, memory]));
  return buildProfileFacts(record).filter(fact => {
    const question = questions.get(fact.id); const memory = memories.get(fact.id);
    if (question?.section_id === "health_context" || excludedQuestions.has(fact.id) || memory?.category === "health") return false;
    if (memory?.clipId && !record.clips.some(clip => clip.id === memory.clipId && clip.petId === record.pet.id && clip.durationSec > 0 && ["technical_only", "ai_reviewed"].includes(clip.status))) return false;
    return !isHealthQuestion(`${fact.title} ${fact.excerpt}`);
  });
}

/** Local suggestions, never invented preferences or a replacement for health guidance. */
export function getConversationTopics(record: PetRecord): ConversationTopic[] {
  const facts = nonHealthFacts(record);
  const dateById = new Map([...record.memories.map(memory => [memory.id, memory.createdAt] as const), ...Object.values(record.answers).map(answer => [answer.questionId, answer.updatedAt] as const)]);
  const short = (text: string) => text.length > 60 ? `${text.slice(0,57)}…` : text;
  const selected = getShareableFacts(record).sort((a,b) => Date.parse(dateById.get(b.id) ?? record.pet.createdAt) - Date.parse(dateById.get(a.id) ?? record.pet.createdAt)).slice(0, 2);
  const topics: ConversationTopic[] = selected.map(fact => ({ id: `recorded:${fact.id}`, title: `O zwyczaju: ${short(fact.excerpt)}`, label: `O zwyczaju: ${short(fact.excerpt)}`,
    prompt: `W moim profilu jest zapis opiekuna: „${fact.excerpt.slice(0, 600)}”. Co możemy o nim powiedzieć na podstawie dostępnych informacji, a czego jeszcze nie wiemy?`, evidence: [fact] }));
  if (!record.isDemo) {
    const event = [...record.memories].filter(memory => memory.category === "event" || memory.source === "video_annotation")
      .sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).find(memory => facts.some(fact => fact.id === memory.id));
    if (event) topics.push({id:`event:${event.id}`,title:`O zdarzeniu: ${short(event.text)}`,label:`O zdarzeniu: ${short(event.text)}`,
      prompt:`Opiekun zapisał zdarzenie: „${event.text.slice(0,600)}”. Omówmy sam opis i brakujące informacje, bez przypisywania pewnych emocji.`,evidence:facts.filter(fact=>fact.id===event.id)});
    const moment = [...(record.moments ?? [])].filter(value => !isHealthQuestion(`${value.title} ${value.caption}`)).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
    if (moment) topics.push({id:`moment:${moment.id}`,title:`O chwili: ${short(moment.title)}`,label:`O chwili: ${short(moment.title)}`,
      prompt:`Chcę porozmawiać o zapisanej chwili „${moment.title}”. Opis opiekuna: ${moment.caption.slice(0,600)}\nData zdarzenia podana przez opiekuna: ${new Date(moment.occurredAt).toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"})}. Pomóż oddzielić opis od przypuszczeń.`,
      evidence:[{id:moment.id,title:"Album — opis opiekuna",excerpt:`${moment.title}: ${moment.caption}`,kind:"owner_report"}]});
    const unknown = getQuestions(record.pet.species).find(question => shareQuestions.has(question.id) && record.answers[question.id]?.status === "unknown");
    if (unknown) topics.push({id:`missing:${unknown.id}`,title:`Dopowiedzmy: ${short(unknown.prompt)}`,label:`Dopowiedzmy: ${short(unknown.prompt)}`,
      prompt:`W teście nie znamy jeszcze odpowiedzi na pytanie: „${unknown.prompt}”. Pomóż opisać zwykłą naturalną sytuację, bez testowania i wymuszania reakcji.`,evidence:[]});
  }
  const generic = record.pet.species === "dog" ? [
    ["walk", "Nasz zwykły spacer", "Co wiemy z moich zapisów o zwykłych spacerach i węszeniu? Jeśli brakuje danych, pomóż mi opisać jedną spokojną sytuację."],
    ["play", "Zabawa po mojemu", "Co wiemy o mojej dobrowolnej zabawie i wybieranych aktywnościach? Oddziel zapis opiekuna od przypuszczeń."],
  ] : [
    ["rest", "Moje miejsca odpoczynku", "Co wiemy z moich zapisów o miejscach, które wybieram do odpoczynku? Nie wymyślaj preferencji, których nie zapisaliśmy."],
    ["play", "Zabawa po mojemu", "Co wiemy o mojej dobrowolnej zabawie ze znanymi zabawkami? Jeśli brakuje danych, zaproponuj pytanie o zwykłą sytuację."],
  ];
  const genericTopics:ConversationTopic[] = [...generic.map(([id,title,prompt]) => ({ id, title, label: title, prompt, evidence: facts.filter(fact => shareQuestions.has(fact.id)).slice(0, 2) })),
    { id: "contact", title: "Kontakt i przestrzeń", label: "Kontakt i przestrzeń", prompt: "Jak opisać mój dobrowolny kontakt i wybór dystansu na podstawie zapisów? Jakie informacje jeszcze warto dopisać?", evidence: [] },
    {id:"observation",title:"Jedna zwykła sytuacja",label:"Jedna zwykła sytuacja",prompt:"Pomóż mi opisać jedną spokojną codzienną sytuację: co było przed, co zrobił zwierzak i co było potem. Nie dopisuj zachowania za mnie.",evidence:[]},
    {id:"together",title:"Co możemy zrobić razem?",label:"Co możemy zrobić razem?",prompt:"Na podstawie zapisów zaproponuj dobrowolną znaną aktywność, a gdy brakuje informacji najpierw zapytaj. Zachowaj możliwość spokojnego odejścia i przerwy.",evidence:[]}];
  return [...topics,...genericTopics].slice(0,5).map(topic => record.isDemo ? {...topic,prompt:`Demonstracja profilu — ${topic.prompt}`} : topic);
}

/** User selects and previews these facts; no model analysis, medical material, or synthetic demo is shared. */
export function getShareableFacts(record: PetRecord): Evidence[] {
  return nonHealthFacts(record).filter(fact => shareQuestions.has(fact.id) || record.memories.some(memory => memory.id === fact.id
    && memory.source === "owner_report" && ["preference", "routine"].includes(memory.category)));
}

export function getFirstConversation(record: PetRecord): FirstConversation {
  const ready = !record.isDemo && getReadiness(record).ready;
  const evidence = nonHealthFacts(record).filter(fact => shareQuestions.has(fact.id) || record.memories.some(memory => memory.id === fact.id && ["preference", "routine"].includes(memory.category))).slice(0, 2);
  const prompt = record.pet.species === "dog" ? "Opowiedz o moich zapisanych zwyczajach spaceru, zabawy i odpoczynku. Wskaż, czego jeszcze nie wiemy." : "Opowiedz o moich zapisanych zwyczajach zabawy i odpoczynku. Wskaż, czego jeszcze nie wiemy.";
  const introduction = record.isDemo ? "To demonstracja z syntetycznym profilem. Dodaj własnego zwierzaka, aby przygotować osobistą rozmowę."
    : ready ? `Profil ${record.pet.name} ma przejrzany pełny test i cztery wymagane nagrania. Można rozpocząć rozmowę opartą na zebranych zapisach. Nie jest to naukowa walidacja osobowości.`
      : `Profil ${record.pet.name} jest w przygotowaniu. Przed osobistą rozmową pozostają pełny test i wymagane nagrania; rozmowa teraz korzysta z częściowych danych.`;
  return { ready, evidence, prompt, welcome: `${introduction}${evidence.length ? `\n\nOpiekun zapisał:\n${evidence.map(fact => `• ${fact.excerpt}`).join("\n")}` : "\n\nBrakuje jeszcze zapisanych niezdrowotnych preferencji i zwyczajów."}\n\nCyfrowy głos jest wyobrażoną wypowiedzią na podstawie danych, bez odczytywania myśli.` };
}

export function getWeeklySummary(record: PetRecord, now: Date = new Date()): WeeklySummary {
  const end = now.getTime();
  if (!Number.isFinite(end)) throw new Error("Nieprawidłowa data podsumowania.");
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const inWindow = (date: string) => Number.isFinite(Date.parse(date)) && Date.parse(date) >= start && Date.parse(date) <= end;
  const items: WeeklySummaryItem[] = [];
  const facts = new Map(nonHealthFacts(record).map(fact => [fact.id, fact]));
  if (!record.isDemo) {
    for (const memory of record.memories) {
      const fact = facts.get(memory.id);
      if (fact && inWindow(memory.createdAt)) items.push({ id: `memory:${memory.id}`, title: "Zapis opiekuna", text: memory.text, createdAt: memory.createdAt, evidence: [fact], kind: "memory" });
    }
    for (const question of getQuestions(record.pet.species)) {
      const answer = record.answers[question.id];
      if (!answer || !validateAnswer(question, answer) || !inWindow(answer.updatedAt) || question.section_id === "health_context" || excludedQuestions.has(question.id)) continue;
      const fact = facts.get(question.id);
      if (answer.status === "answered" && !fact) continue;
      const reviewText = answer.status === "unknown" ? "Nie wiem — pozostaje brak danych." : answer.status === "not_applicable" ? "Nie dotyczy lub brak naturalnej okazji." : "Pytanie pominięte; odpowiedzi nie zastąpiono domysłem.";
      const evidence = fact ?? { id: `${question.id}:review`, title: "Przegląd pytania — zapis opiekuna", excerpt: reviewText, kind: "owner_report" as const };
      items.push({ id: `answer:${question.id}`, title: "Aktualizacja odpowiedzi w teście", text: `${question.prompt}\n${evidence.excerpt}`, createdAt: answer.updatedAt, evidence: [evidence], kind: "answer" });
    }
    for (const moment of record.moments ?? []) {
      if (!inWindow(moment.createdAt) || isHealthQuestion(`${moment.title} ${moment.caption}`)) continue;
      const text = `${moment.title}${moment.caption ? ` — ${moment.caption}` : ""}\nData zdarzenia podana przez opiekuna: ${new Date(moment.occurredAt).toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"})}.`;
      items.push({ id: `moment:${moment.id}`, title: "Dodano chwilę do albumu", text, createdAt: moment.createdAt,
        evidence: [{ id: moment.id, title: "Album — zapis opiekuna", excerpt: text, kind: "owner_report" }], kind: "moment" });
    }
    for (const clip of record.clips) {
      if (!inWindow(clip.createdAt) || clip.petId !== record.pet.id || clip.durationSec <= 0 || !["technical_only", "ai_reviewed"].includes(clip.status)) continue;
      const task = getTasks(record.pet.species).find(value => value.id === clip.taskId);
      if (!task) continue;
      const text = `Dodano nagranie „${task.title}”. To zapis materiału, bez automatycznego potwierdzenia zachowania lub nastroju.`;
      items.push({ id: `clip:${clip.id}`, title: "Nowe nagranie", text, createdAt: clip.createdAt,
        evidence: [{ id: clip.id, title: "Metadane nagrania", excerpt: text, kind: "video" }], kind: "clip" });
    }
  }
  items.sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  return { from: new Date(start).toISOString(), to: now.toISOString(), items,
    emptyMessage: record.isDemo ? "Demonstracja nie podsumowuje prawdziwego tygodnia. Dodaj własnego zwierzaka." : "W ostatnich siedmiu dniach nie dodano tu zapisów do podsumowania. To nie mówi nic o zachowaniu ani samopoczuciu zwierzaka.",
    prompt: items.length ? "Przejrzyjmy ostatnio dodane niezdrowotne zapisy o moich zwyczajach. Co wiemy z relacji opiekuna, a jakie pytanie warto zadać dalej?" : "Pomóż mi opisać jedną zwykłą sytuację z ostatniego tygodnia, bez zgadywania zachowania ani nastroju." };
}
