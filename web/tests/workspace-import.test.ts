import test from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord, createPetRecord, buildProfileFacts } from "../src/lib/domain";
import { parseWorkspace } from "../src/lib/local-store";
import { sanitizePetPhoto, validateCloudWorkspace, validateWorkspace } from "../src/lib/workspace-validation";
import type { Workspace } from "../src/lib/types";

const now = "2026-10-07T12:00:00.000Z";
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=";

function fixture(): Workspace {
  const record = createPetRecord({ name: "Luna", species: "cat", ageMonths: 36, photo: tinyPng });
  const clipId = crypto.randomUUID();
  record.answers.q012 = { questionId: "q012", status: "answered", value: 0, updatedAt: now };
  record.answers.q045 = { questionId: "q045", status: "unknown", updatedAt: now };
  record.clips.push({ id: clipId, petId: record.pet.id, taskId: "name", createdAt: now, durationSec: 15, width: 1280, height: 720, mimeType: "video/webm;codecs=vp8,opus", fileName: "synthetic.webm", status: "ai_reviewed", analysis: { source: "gemini", summary: "Opis modelu do sprawdzenia", observations: ["Widoczny zwrot głowy"], limitations: ["Jedna sytuacja, wynik niezweryfikowany"], needsReview: true } });
  record.memories.push({ id: crypto.randomUUID(), text: "Podczas tej zabawy wybrała wędkę", category: "preference", createdAt: now, source: "owner_report" });
  record.memories.push({ id: crypto.randomUUID(), text: "Na nagraniu widzę zwrot głowy", category: "event", createdAt: now, source: "video_annotation", clipId });
  record.messages.push({ id: crypto.randomUUID(), role: "assistant", content: "Korzystam z tego, co o mnie zapisujesz.", createdAt: now, mode: "grounded", provider: "local", evidence: [{ id: record.memories[0].id, title: "Relacja opiekuna", excerpt: record.memories[0].text, kind: "owner_report" }] });
  return { schemaVersion: 1, pets: [record], activePetId: record.pet.id };
}

function rejectsMutation(mutate: (value: Workspace) => void) {
  const value = fixture(); mutate(value);
  assert.throws(() => parseWorkspace(JSON.stringify(value)), /Nieprawidłowy plik COPOWIESZ/);
}

test("pełna kopia JSON zachowuje odpowiedzi, adnotację, cytowanie i poprawne zdjęcie", () => {
  const input = fixture();
  const restored = parseWorkspace(JSON.stringify(input));
  assert.equal(restored.pets[0].pet.photo, tinyPng);
  assert.equal(restored.pets[0].answers.q012.value, 0);
  assert.equal(restored.pets[0].answers.q045.status, "unknown");
  assert.equal(restored.pets[0].memories[1].clipId, restored.pets[0].clips[0].id);
  assert.equal(restored.pets[0].messages[0].evidence?.[0].kind, "owner_report");
  assert.equal(restored.pets[0].messages[0].provider, "local");
  assert(buildProfileFacts(restored.pets[0]).some((fact) => fact.id === "q012" && fact.excerpt === "0"));
  assert(!buildProfileFacts(restored.pets[0]).some((fact) => fact.id === "q045"));
});

test("niepoprawny JSON, struktura i nadmierny plik są odrzucane przed zastąpieniem danych", () => {
  assert.throws(() => parseWorkspace("{"), /Nieprawidłowy JSON/);
  for (const input of [null, [], "profil", { schemaVersion: 1, pets: null }, { ...fixture(), schemaVersion: 2 }]) assert.throws(() => parseWorkspace(JSON.stringify(input)));
  assert.throws(() => parseWorkspace("x".repeat(8_000_001)), /zbyt duży/);
  rejectsMutation((value) => { value.pets[0].answers = [] as never; });
});

test("nested null i błędne typy w pamięci, wiadomości, adnotacji i klipie nie trafiają do UI", () => {
  rejectsMutation((value) => { value.pets[0].memories[0] = null as never; });
  rejectsMutation((value) => { value.pets[0].messages[0].content = { text: "fałszywy obiekt" } as never; });
  rejectsMutation((value) => { value.pets[0].messages[0].evidence = [null as never]; });
  rejectsMutation((value) => { value.pets[0].clips[0].analysis!.observations = [null as never]; });
  rejectsMutation((value) => { value.pets[0].clips[0].width = "1280" as never; });
  rejectsMutation((value) => { value.pets[0].answers.q012 = null as never; });
});

test("odpowiedź musi należeć do znanego pytania właściwego gatunku i jego typu", () => {
  rejectsMutation((value) => { value.pets[0].answers.q999 = { questionId: "q999", status: "answered", value: "zmyślona cecha", updatedAt: now }; });
  rejectsMutation((value) => { value.pets[0].answers.q073 = { questionId: "q073", status: "unknown", updatedAt: now }; });
  rejectsMutation((value) => { value.pets[0].answers.q012.questionId = "q003"; });
  rejectsMutation((value) => { value.pets[0].answers.q012.value = "0"; });
  rejectsMutation((value) => { value.pets[0].answers.q012.value = 15; });
  rejectsMutation((value) => { value.pets[0].answers.q045.value = 0; });
  rejectsMutation((value) => { value.pets[0].answers.q001 = { questionId: "q001", status: "answered", value: "dog", updatedAt: now }; });
});

test("niewłaściwy wiek, puste imię, nieznany gatunek i data są odrzucane", () => {
  rejectsMutation((value) => { value.pets[0].pet.ageMonths = -1; });
  rejectsMutation((value) => { value.pets[0].pet.ageMonths = 601; });
  rejectsMutation((value) => { value.pets[0].pet.ageMonths = 3.5; });
  rejectsMutation((value) => { value.pets[0].pet.name = "   "; });
  rejectsMutation((value) => { value.pets[0].pet.species = "rabbit" as never; });
  rejectsMutation((value) => { value.pets[0].memories[0].createdAt = "2026-02-30T12:00:00Z"; });
  rejectsMutation((value) => { value.pets[0].pet.createdAt = "2026-10-07"; });
});

test("UUID i unikatowość profili, klipów, pamięci oraz wiadomości są sprawdzane", () => {
  rejectsMutation((value) => { value.pets[0].pet.id = "../../../cudzy-profil"; });
  rejectsMutation((value) => { value.pets.push(structuredClone(value.pets[0])); });
  rejectsMutation((value) => { value.pets[0].clips.push(structuredClone(value.pets[0].clips[0])); });
  rejectsMutation((value) => { value.pets[0].memories.push(structuredClone(value.pets[0].memories[0])); });
  rejectsMutation((value) => { value.pets[0].messages.push(structuredClone(value.pets[0].messages[0])); });
  rejectsMutation((value) => { value.pets[0].memories[0].id = "dowolny-nie-uuid"; });
});

test("klip nie może należeć do obcego profilu, a adnotacja wymaga własnego istniejącego klipu", () => {
  rejectsMutation((value) => { value.pets[0].clips[0].petId = crypto.randomUUID(); });
  rejectsMutation((value) => { value.pets[0].clips[0].taskId = "prowokuj_agresje"; });
  rejectsMutation((value) => { value.pets[0].memories[1].clipId = crypto.randomUUID(); });
  rejectsMutation((value) => { delete value.pets[0].memories[1].clipId; });
  rejectsMutation((value) => {
    const other = structuredClone(value.pets[0]); other.pet.id = crypto.randomUUID(); other.memories = []; other.messages = [];
    other.clips[0].petId = other.pet.id;
    value.pets.push(other);
  });
});

test("zdjęcie nie uruchamia zewnętrznego żądania; błędne MIME i udawane obrazy są usuwane", () => {
  for (const input of ["https://tracking.example/photo", "http://localhost/photo", "blob:foreign", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "data:image/jpeg;base64,PGh0bWw+PC9odG1sPg==", "data:image/png;base64,%%%%", null, 42]) {
    assert.equal(sanitizePetPhoto(input), undefined);
    const workspace = fixture(); workspace.pets[0].pet.photo = input as never;
    const restored = validateWorkspace(workspace);
    assert.equal(restored.pets[0].pet.photo, undefined);
    assert.equal(workspace.pets[0].pet.photo, input, "Walidacja nie zmienia wejścia");
  }
  assert.equal(sanitizePetPhoto(tinyPng), tinyPng);
});

test("archiwalne źródła zachowują HTTPS, a protokoły skryptów i dane logowania są odrzucane", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://example.org/source", "https://user:password@example.org/source", "nie jest adresem"]) rejectsMutation((value) => { value.pets[0].messages[0].evidence![0].url = url; });
  const value = fixture(); value.pets[0].messages[0].evidence![0].url = "https://example.org/archived-source";
  assert.equal(parseWorkspace(JSON.stringify(value)).pets[0].messages[0].evidence![0].url, "https://example.org/archived-source");
});

test("analiza modelu po imporcie pozostaje do przeglądu i nie trafia do osobistej pamięci", () => {
  const value = fixture(); value.pets[0].clips[0].analysis!.needsReview = false;
  const restored = parseWorkspace(JSON.stringify(value));
  assert.equal(restored.pets[0].clips[0].analysis?.needsReview, true);
  assert(!buildProfileFacts(restored.pets[0]).some((fact) => fact.excerpt === "Widoczny zwrot głowy"));
  rejectsMutation((workspace) => { workspace.pets[0].clips[0].analysis!.source = "technical"; });
});

test("demonstracja jest odtwarzalna, a jej specjalne identyfikatory nie przechodzą do rzeczywistego profilu", () => {
  for (const species of ["cat", "dog"] as const) {
    const record = createDemoRecord(species);
    const restored = parseWorkspace(JSON.stringify({ schemaVersion: 1, pets: [record], activePetId: record.pet.id }));
    assert.equal(restored.pets[0].isDemo, true);
    assert(restored.pets[0].memories.every((memory) => memory.id.startsWith("demo-")));
    record.isDemo = false;
    assert.throws(() => validateWorkspace({ schemaVersion: 1, pets: [record], activePetId: record.pet.id }));
  }
});

test("brak aktywnego profilu jest naprawiany bez mutowania danych i nieznane pola są usuwane", () => {
  const value = fixture(); value.activePetId = crypto.randomUUID();
  Object.assign(value, { GEMINI_API_KEY: "synthetic-should-not-persist" });
  Object.assign(value.pets[0].pet, { ownerName: "Niepotrzebne dane" });
  const restored = validateWorkspace(value);
  assert.equal(restored.activePetId, restored.pets[0].pet.id);
  assert.notEqual(value.activePetId, restored.activePetId);
  assert(!("GEMINI_API_KEY" in restored));
  assert(!("ownerName" in restored.pets[0].pet));
  assert.deepEqual(validateWorkspace({ schemaVersion: 1, pets: [], activePetId: null }), { schemaVersion: 1, pets: [], activePetId: null });
});

test("pobranie chmurowe stosuje tę samą walidację wszystkich zagnieżdżonych danych", () => {
  const value = fixture();
  const rows = [{ id: value.pets[0].pet.id, schema_version: 1, payload: value.pets[0] }];
  const metadata = { schema_version: 1, active_pet_id: value.activePetId };
  assert.equal(validateCloudWorkspace(rows, metadata)?.pets[0].pet.name, "Luna");
  assert.equal(validateCloudWorkspace([], null), null);
  const malformed = structuredClone(rows); malformed[0].payload.messages[0].evidence = [null as never];
  assert.throws(() => validateCloudWorkspace(malformed, metadata), /Chmurowe dane/);
  assert.throws(() => validateCloudWorkspace([{ ...rows[0], id: crypto.randomUUID() }], metadata), /tożsamość/);
  assert.throws(() => validateCloudWorkspace(rows, { schema_version: 2, active_pet_id: value.activePetId }), /Chmurowe dane/);
  assert.throws(() => validateCloudWorkspace([null], metadata), /Chmurowe dane/);
  assert.throws(() => validateCloudWorkspace({}, metadata), /Chmurowe dane/);
});

test("chmura nie przyjmuje demonstracji i nie ukrywa zduplikowanych profili", () => {
  const value = fixture();
  const row = { id: value.pets[0].pet.id, schema_version: 1, payload: value.pets[0] };
  assert.throws(() => validateCloudWorkspace([row, row], null));
  const demo = createDemoRecord("cat");
  assert.throws(() => validateCloudWorkspace([{ id: demo.pet.id, schema_version: 1, payload: demo }], null), /demonstrację/);
});
