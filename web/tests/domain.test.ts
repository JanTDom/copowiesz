import test from "node:test";
import assert from "node:assert/strict";
import { buildGroundedReply, buildProfileFacts, createDemoRecord, createPetRecord, getNextTask, getQuestions, getReadiness, getTasks, questions, sections, validateAnswer } from "../src/lib/domain";
import { getKnowledgeEvidence, knowledgeCards, knowledgeSources, searchKnowledge } from "../src/lib/knowledge";
import type { Answer, Clip, PetRecord } from "../src/lib/types";

const now = "2026-10-07T12:00:00.000Z";
function completedClip(record: PetRecord, taskId: string): Clip {
  return { id: `clip-${taskId}`, petId: record.pet.id, taskId, createdAt: now, durationSec: 12, width: 1280, height: 720, mimeType: "video/webm", fileName: "synthetic.webm", status: "technical_only", analysis: { source: "technical", summary: "Parametry przykładowego klipu", observations: [], limitations: ["Nie oceniono zachowania"], needsReview: true } };
}
function completeQuestions(record: PetRecord) {
  for (const question of getQuestions(record.pet.species)) record.answers[question.id] = { questionId: question.id, status: "unknown", updatedAt: now };
}

test("pełny fundament obejmuje 94 pytania, 12 sekcji i po 85 pytań każdego gatunku", () => {
  assert.equal(questions.length, 94);
  assert.equal(sections.length, 12);
  assert.equal(getQuestions("dog").length, 85);
  assert.equal(getQuestions("cat").length, 85);
  assert(!getQuestions("cat").some((question) => question.section_id === "dog_context"));
  assert(!getQuestions("dog").some((question) => question.section_id === "cat_context"));
});

test("290 kart ma istniejące źródła i zgodność gatunku; wyszukiwanie izoluje gatunki i domeny", () => {
  assert.equal(knowledgeCards.length, 290);
  assert.equal(knowledgeSources.length, 173);
  const sourceMap = new Map(knowledgeSources.map((source) => [source.id, source]));
  for (const card of knowledgeCards) {
    assert(card.source_ids.length > 0);
    for (const id of card.source_ids) {
      const source = sourceMap.get(id);
      assert(source, `${card.id}: ${id}`);
      assert(card.species.every((species) => source.species.includes(species)));
    }
    assert(getKnowledgeEvidence(card).every((evidence) => evidence.url?.startsWith("https://")));
  }
  const cat = searchKnowledge("kuweta mocz kot", "cat", "health");
  assert(cat.length > 0);
  assert(cat.every((card) => card.species.includes("cat") && card.domain === "health"));
  const dog = searchKnowledge("oddycha pysk oddech", "dog", "health");
  assert(dog.length > 0);
  assert(dog.every((card) => card.species.includes("dog")));
  assert(!dog.some((card) => card.id === "health_v2_cat_open_mouth"));
  assert(searchKnowledge("zabawa kontakt", "cat", "behavior").every((card) => (card.domain ?? "behavior") === "behavior"));
});

test("zero, nie wiem, nie dotyczy i pominięcie są różnymi stanami; nieprawidłowe wartości nie zaliczają pytania", () => {
  const question = questions.find((item) => item.id === "q012")!;
  const zero: Answer = { questionId: question.id, status: "answered", value: 0, updatedAt: now };
  const unknown: Answer = { questionId: question.id, status: "unknown", updatedAt: now };
  assert(validateAnswer(question, zero));
  assert(validateAnswer(question, unknown));
  assert(!validateAnswer(question, { ...unknown, value: 0 }));
  assert(!validateAnswer(question, { ...zero, value: Number.NaN }));
  assert(!validateAnswer(question, { ...zero, value: 15 }));
  assert(!validateAnswer(question, { ...zero, value: 3.5 }));
  const record = createPetRecord({ name: "Kot", species: "cat" });
  record.answers[question.id] = zero;
  assert.equal(getReadiness(record).answered, 1);
  assert(buildProfileFacts(record).some((fact) => fact.excerpt === "0"));
  record.answers[question.id] = unknown;
  assert.equal(getReadiness(record).answered, 1);
  assert.equal(buildProfileFacts(record).length, 0);
  assert(getReadiness(record).missing.some((entry) => entry.includes("Nieznane")));
});

test("specjalne opcje nie mogą udawać odpowiedzi ani łączyć się z innymi wyborami", () => {
  const single = questions.find((item) => item.id === "q001")!;
  assert(!validateAnswer(single, { questionId: single.id, status: "answered", value: "unknown", updatedAt: now }));
  const multi = questions.find((item) => item.type === "multi_choice" && item.options?.some((option) => option.value === "none_known"))!;
  const other = multi.options!.find((option) => !["none_known", "unknown", "not_applicable"].includes(option.value))!.value;
  assert(!validateAnswer(multi, { questionId: multi.id, status: "answered", value: ["none_known", other], updatedAt: now }));
});

test("gotowość wymaga całego gatunkowego testu i rzeczywistych czterech kontekstów klipów", () => {
  const record = createPetRecord({ name: "Pies", species: "dog" });
  completeQuestions(record);
  assert.equal(getReadiness(record).answered, 85);
  assert.equal(getReadiness(record).ready, false);
  record.clips = getTasks("dog").map((task) => completedClip(record, task.id));
  assert.equal(getReadiness(record).clips, 4);
  assert.equal(getReadiness(record).ready, true);
  assert(getReadiness(record).missing.some((item) => item.includes("technicz")));
  record.clips[0].status = "pending";
  assert.equal(getReadiness(record).ready, false);
  record.clips[0].status = "skipped";
  assert.equal(getReadiness(record).clips, 3);
  assert.equal(getReadiness(record).ready, false);
});

test("obcy klip, powtórzone klipy jednego kontekstu i puste nagranie nie wypełniają braków", () => {
  const record = createPetRecord({ name: "Kot", species: "cat" });
  completeQuestions(record);
  record.clips = Array.from({ length: 4 }, () => completedClip(record, "baseline"));
  assert.equal(getReadiness(record).clips, 1);
  const foreign = completedClip(record, "name");
  foreign.petId = "other-pet";
  record.clips.push(foreign);
  assert.equal(getReadiness(record).clips, 1);
  const empty = completedClip(record, "play");
  empty.durationSec = 0;
  record.clips.push(empty);
  assert.equal(getReadiness(record).clips, 1);
});

test("po przerwaniu lub pominięciu aplikacja proponuje inny kontekst bez wymuszania reakcji", () => {
  const record = createPetRecord({ name: "Kot", species: "cat" });
  assert.equal(getNextTask(record)?.id, "baseline");
  record.clips.push({ ...completedClip(record, "baseline"), status: "stopped" });
  assert.equal(getNextTask(record)?.id, "name");
  for (const task of getTasks("cat").slice(1)) record.clips.push({ ...completedClip(record, task.id), status: "skipped" });
  assert.equal(getNextTask(record), null);
  assert.equal(getReadiness(record).ready, false);
  assert.equal(getTasks("cat").some((task) => task.requiresKnownCue), false);
});

test("profil używa relacji opiekuna, zachowuje źródło i nie promuje surowych wyników modelu", () => {
  const record = createPetRecord({ name: "Kot", species: "cat" });
  record.memories.push({ id: "m1", text: "Wybiera wędkę", category: "preference", createdAt: now, source: "owner_report" });
  record.memories.push({ id: "m2", text: "Rzekoma obserwacja bez filmu", category: "event", createdAt: now, source: "video_annotation", clipId: "missing" });
  record.clips.push({ ...completedClip(record, "play"), status: "ai_reviewed", analysis: { source: "ollama", summary: "Wynik modelu", observations: ["Model przypuszcza agresję"], limitations: ["Niezweryfikowane"], needsReview: true } });
  const facts = buildProfileFacts(record);
  assert.equal(facts.length, 1);
  assert.equal(facts[0].kind, "owner_report");
  assert(!JSON.stringify(facts).includes("agresję"));
});

test("odpowiedź bez pamięci nie tworzy preferencji ani wspólnych wydarzeń", () => {
  const record = createPetRecord({ name: "Luna", species: "cat" });
  const reply = buildGroundedReply(record, "Pamiętasz nasze wakacje nad morzem?");
  assert.equal(reply.mode, "grounded");
  assert.equal(reply.evidence.length, 0);
  assert.match(reply.content, /nie mamy informacji/i);
  assert(!reply.content.includes("parapet"));
  assert(!reply.content.includes("wędk"));
});

test("osobista odpowiedź wskazuje własną pamięć i jej jawne pochodzenie", () => {
  const record = createPetRecord({ name: "Pies", species: "dog" });
  record.memories.push({ id: "walk", text: "Na spacerach wybiera dłuższe węszenie przy krzewach", category: "preference", createdAt: now, source: "owner_report" });
  const reply = buildGroundedReply(record, "Co lubisz na spacerze?");
  assert.equal(reply.evidence[0].id, "walk");
  assert.match(reply.content, /węszenie/);
  assert.match(reply.content, /częściowych informacji/);
});

test("zdrowie wychodzi z fikcyjnej roli, nie zaleca dawek i zachowuje źródła", () => {
  const record = createPetRecord({ name: "Luna", species: "cat" });
  const reply = buildGroundedReply(record, "Kot oddycha przez otwarty pysk w spoczynku");
  assert.equal(reply.mode, "health");
  assert.match(reply.content, /poza wyobrażonym głosem/);
  assert.match(reply.content, /nie zalecam leków ani dawek/);
  assert(reply.evidence.length > 0);
  assert(reply.evidence.every((evidence) => evidence.url?.startsWith("https://")));
});

test("demonstracja zawsze pozostaje oznaczona i nie udaje kompletnego profilu", () => {
  const demo = createDemoRecord("cat");
  assert.equal(demo.isDemo, true);
  assert.equal(getReadiness(demo).ready, false);
  const reply = buildGroundedReply(demo, "W co lubisz się bawić?");
  assert.equal(reply.mode, "demo");
  assert.match(reply.content, /dane syntetyczne/i);
});
