import questionnaire from "../data/questionnaire.json";
import type { Answer, Evidence, GuidedTask, Pet, PetRecord, Question, QuestionSection, Species } from "./types";

export const questions = questionnaire.questions as Question[];
export const sections = questionnaire.sections as QuestionSection[];
export const questionnaireVersion = questionnaire.version;
export const questionnaireInstructions = questionnaire.usage_instructions;
export { buildGroundedReply } from "./knowledge";

const stopConditions = [
  "Przerwij, jeśli zwierzak odchodzi, unika kontaktu lub nie chce uczestniczyć.",
  "Przerwij przy oznakach bólu, trudnego oddechu, lęku lub narastającego pobudzenia. W razie problemów zdrowotnych skontaktuj się z lekarzem weterynarii.",
  "Nie powtarzaj bodźca do skutku. Brak reakcji też jest obserwacją.",
];

export const guidedTasks: GuidedTask[] = [
  {
    id: "baseline", title: "Chwila codzienności", description: "Punkt odniesienia: spokojna, zwykła aktywność, bez wywoływania reakcji.", species: ["dog", "cat"],
    instructions: ["Wybierz znane miejsce i naturalną chwilę spokojnej aktywności. Nie budź zwierzaka.", "Ustaw telefon w pewnej odległości tak, by było widać całe ciało i drogę odejścia.", "Nagraj krótką chwilę bez mówienia, dotykania i zmiany otoczenia. Nie przenoś zwierzaka dla lepszego kadru."], stopConditions,
  },
  {
    id: "name", title: "Znany głos i imię", description: "Zapis widocznej reakcji na Twój zwykły głos; bez oceny rozumienia słów.", species: ["dog", "cat"],
    instructions: ["Poczekaj na zwykłą sytuację, gdy zwierzak czuwa spokojnie i może swobodnie odejść.", "Zacznij nagrywanie z widokiem całego ciała. Wypowiedz jego imię raz swoim normalnym głosem.", "Pozwól mu zareagować po swojemu. Nie podchodź za nim i nie wołaj ponownie, żeby uzyskać odpowiedź."], stopConditions,
  },
  {
    id: "play", title: "Zaproszenie do znanej zabawy", description: "Wybór udziału w już znanej zabawie, przerwy i odejście.", species: ["dog", "cat"],
    instructions: ["Wybierz zwykłą porę zabawy oraz znaną, bezpieczną zabawkę, z której zwierzak korzysta dobrowolnie.", "Zacznij nagrywanie i zaproponuj zabawę tak jak zazwyczaj. Zachowaj zwykłą odległość i możliwość odejścia.", "Pozwól zwierzakowi podjąć zabawę lub odmówić. Nie kieruj gryzienia na dłonie i nie używaj żywej ofiary. Jeżeli zabawa nie jest znana, pomiń zadanie."], stopConditions,
  },
  {
    id: "contact", title: "Dobrowolny kontakt", description: "Obserwacja inicjowania kontaktu i wyboru dystansu; bez próby tolerowania dotyku.", species: ["dog", "cat"],
    instructions: ["Usiądź spokojnie w miejscu, gdzie zwykle przebywasz. Zapewnij zwierzakowi wolną drogę odejścia.", "Ustaw telefon tak, by było widać Wasz dystans. Nie przytrzymuj, nie wyciągaj z kryjówki i nie zachęcaj smakołykiem.", "Nagraj chwilę naturalnego zachowania. Pozwól mu samemu podejść, pozostać w miejscu albo odejść."], stopConditions,
  },
  {
    id: "known_cue", title: "Znany spokojny sygnał", description: "Opcjonalnie: jeden sygnał, który zwierzak już zna i zwykle wykonuje komfortowo.", species: ["dog", "cat"], requiresKnownCue: true,
    instructions: ["Wykonaj wyłącznie, jeśli sygnał jest już dobrze znany i używany w zwykłej, dobrowolnej aktywności.", "Podczas nagrywania wypowiedz sygnał raz i zastosuj zwykłą nagrodę, bez jej odbierania.", "Nie wprowadzaj nowego zadania i nie oceniaj posłuszeństwa ani inteligencji. Jeśli sygnał nie jest znany, zadanie nie dotyczy."], stopConditions,
  },
];

export function getQuestions(species: Species): Question[] {
  return questions.filter((question) => question.species.includes(species));
}

// Cztery obowiązkowe konteksty; znany sygnał pozostaje zadaniem opcjonalnym.
export function getTasks(species: Species): GuidedTask[] {
  return guidedTasks.filter((task) => task.species.includes(species) && !task.requiresKnownCue);
}

export function validateAnswer(question: Question, answer: Answer): boolean {
  if (answer.questionId !== question.id || !["answered", "unknown", "not_applicable", "skipped"].includes(answer.status)) return false;
  if (answer.status !== "answered") return answer.value === undefined;
  const value = answer.value;
  if (question.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
    if (question.construct === "observed_days") return Number.isInteger(value) && value <= 14;
    if (question.construct === "cohabiting_animal_count") return Number.isInteger(value);
    if (question.construct === "reported_body_mass_kg") return value > 0;
    return true;
  }
  if (question.type === "free_text") return typeof value === "string" && value.trim().length > 0;
  const validOptions = new Set(question.options?.map((option) => option.value).filter((option) => option !== "unknown" && option !== "not_applicable"));
  if (question.type === "multi_choice") {
    if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length || !value.every((item) => validOptions.has(item))) return false;
    const exclusiveOptions = questionnaire.quality_policy.exclusive_options;
    return value.length === 1 || !value.some((item) => exclusiveOptions.includes(item));
  }
  return typeof value === "string" && validOptions.has(value);
}

function hasCompletedClip(record: PetRecord, taskId: string): boolean {
  return record.clips.some((clip) => clip.petId === record.pet.id && clip.taskId === taskId && clip.durationSec > 0 && ["technical_only", "ai_reviewed"].includes(clip.status));
}

export function getReadiness(record: PetRecord): { answered: number; total: number; clips: number; totalClips: number; ready: boolean; missing: string[] } {
  const applicable = getQuestions(record.pet.species);
  const reviewed = applicable.filter((question) => record.answers[question.id] && validateAnswer(question, record.answers[question.id]));
  const tasks = getTasks(record.pet.species);
  const completed = tasks.filter((task) => hasCompletedClip(record, task.id));
  const missing: string[] = [];
  if (reviewed.length < applicable.length) missing.push(`Do przejrzenia: ${applicable.length - reviewed.length} pytań.`);
  const unknown = reviewed.filter((question) => record.answers[question.id].status === "unknown").length;
  const skipped = reviewed.filter((question) => record.answers[question.id].status === "skipped").length;
  const notApplicable = reviewed.filter((question) => record.answers[question.id].status === "not_applicable").length;
  if (unknown) missing.push(`Nieznane odpowiedzi: ${unknown}. Pozostają brakami wiedzy.`);
  if (skipped) missing.push(`Pominięte odpowiedzi: ${skipped}. Nie są zastępowane domysłami.`);
  if (notApplicable) missing.push(`Nie dotyczy lub brak naturalnej okazji: ${notApplicable}.`);
  for (const task of tasks) {
    if (hasCompletedClip(record, task.id)) continue;
    const attempt = record.clips.findLast((clip) => clip.petId === record.pet.id && clip.taskId === task.id);
    const reason = attempt?.status === "stopped" ? "przerwane; nie powtarzaj dla wymuszenia reakcji" : attempt?.status === "skipped" ? "pominięte; brak danych" : attempt?.status === "pending" ? "oczekuje na sprawdzenie" : "brak nagrania";
    missing.push(`${task.title}: ${reason}.`);
  }
  if (record.clips.some((clip) => clip.status === "technical_only")) missing.push("Filmy mają kontrolę techniczną. Zachowanie nie zostało automatycznie rozpoznane.");
  if (record.clips.some((clip) => clip.analysis?.source === "ollama" || clip.analysis?.source === "gemini")) missing.push("Wyniki modelu wideo wymagają weryfikacji; pojedynczy klip nie potwierdza trwałej cechy.");
  return { answered: reviewed.length, total: applicable.length, clips: completed.length, totalClips: tasks.length, ready: reviewed.length === applicable.length && completed.length === tasks.length, missing };
}

export function getNextTask(record: PetRecord): GuidedTask | null {
  const tasks = getTasks(record.pet.species);
  // Po pominięciu/przerwaniu przechodzimy dalej, zamiast wymuszać kolejną próbę.
  return tasks.find((task) => !record.clips.some((clip) => clip.petId === record.pet.id && clip.taskId === task.id)) ?? null;
}

export function createPetRecord(input: Pick<Pet, "name" | "species"> & Partial<Pick<Pet, "ageMonths" | "photo">>): PetRecord {
  const createdAt = new Date().toISOString();
  const pet: Pet = { id: crypto.randomUUID(), name: input.name.trim(), species: input.species, createdAt };
  if (input.ageMonths !== undefined && Number.isFinite(input.ageMonths) && input.ageMonths >= 0) pet.ageMonths = input.ageMonths;
  if (input.photo) pet.photo = input.photo;
  return { pet, answers: {}, clips: [], memories: [], messages: [] };
}

function formatAnswer(question: Question, answer: Answer): string {
  if (Array.isArray(answer.value)) return answer.value.map((value) => question.options?.find((option) => option.value === value)?.label ?? value).join(", ");
  if (typeof answer.value === "number") return String(answer.value);
  return question.options?.find((option) => option.value === answer.value)?.label ?? String(answer.value ?? "");
}

export function buildProfileFacts(record: PetRecord): Evidence[] {
  const facts: Evidence[] = [];
  for (const memory of record.memories) {
    if (!memory.text.trim()) continue;
    // Adnotacja człowieka nie staje się samoczynnie wynikiem zweryfikowanego modelu.
    const annotation = memory.source === "video_annotation";
    if (annotation && (!memory.clipId || !record.clips.some((clip) => clip.id === memory.clipId && clip.petId === record.pet.id))) continue;
    facts.push({ id: memory.id, title: annotation ? "Adnotacja opiekuna do filmu" : "Relacja opiekuna", excerpt: memory.text, kind: annotation ? "video" : "owner_report" });
  }
  for (const question of getQuestions(record.pet.species)) {
    const answer = record.answers[question.id];
    if (!answer || answer.status !== "answered" || !validateAnswer(question, answer)) continue;
    facts.push({ id: question.id, title: question.prompt, excerpt: `${formatAnswer(question, answer)}${answer.note?.trim() ? ` — kontekst opiekuna: ${answer.note.trim()}` : ""}`, kind: "owner_report" });
  }
  return facts;
}

export function createDemoRecord(species: Species = "cat"): PetRecord {
  const record = createPetRecord({ name: species === "cat" ? "Luna" : "Borys", species, ageMonths: 36 });
  record.isDemo = true;
  const now = new Date().toISOString();
  record.memories = species === "cat" ? [
    { id: "demo-play", text: "W ostatnich dwóch tygodniach Luna najczęściej wybierała zabawę wędką; sama robiła przerwy.", category: "preference", createdAt: now, source: "owner_report" },
    { id: "demo-rest", text: "Luna w spokojne popołudnia wybierała do odpoczynku parapet w salonie.", category: "routine", createdAt: now, source: "owner_report" },
  ] : [
    { id: "demo-walk", text: "Borys na zwykłych spacerach często zatrzymywał się, aby węszyć. Opiekun pozwalał mu wybierać dostępne miejsca.", category: "preference", createdAt: now, source: "owner_report" },
    { id: "demo-rest", text: "Po spacerach Borys zwykle układał się na swoim posłaniu.", category: "routine", createdAt: now, source: "owner_report" },
  ];
  record.messages = [{ id: crypto.randomUUID(), role: "assistant", content: `To oznaczona demonstracja rozmowy z ${record.pet.name}. Wszystkie wspomnienia w tym przykładzie są syntetyczne. Dodaj własnego zwierzaka, aby rozpocząć jego test i kierowane nagrania.`, createdAt: now, mode: "demo" }];
  return record;
}
