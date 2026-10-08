import test from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord, createPetRecord } from "../src/lib/domain";
import { buildShareCardModel, cardText, localPhotoSource, MAX_PHOTO_BYTES, renderShareCard, selectedCardFacts, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, shareCardFileName, validatePhotoFile, wrapCardText } from "../src/lib/share-card";
import type { Evidence } from "../src/lib/types";

const at = "2026-10-08T12:00:00.000Z";

test("karta domyślnie nie wybiera żadnej relacji, a nieznane identyfikatory nie ujawniają informacji", () => {
  const record = createPetRecord({ name: "Frania", species: "cat" });
  record.memories.push({ id: "private", text: "Wybiera miejsce przy oknie", category: "preference", source: "owner_report", createdAt: at });
  assert.deepEqual(buildShareCardModel(record, []).facts, []);
  assert.deepEqual(buildShareCardModel(record, ["unknown"]).facts, []);
  assert.equal(buildShareCardModel(record, ["private"]).facts[0]?.text, "Wybiera miejsce przy oknie");
});

test("eksport nie bierze danych zdrowotnych, surowej analizy modelu ani syntetycznych wspomnień demo", () => {
  const record = createPetRecord({ name: "Borys", species: "dog" });
  record.memories.push({ id: "healthy-category", text: "Zaplanowano leczenie", category: "health", source: "owner_report", createdAt: at });
  record.memories.push({ id: "health-in-preference", text: "Ma ból i wymiotuje", category: "preference", source: "owner_report", createdAt: at });
  record.clips.push({ id: "raw-model", petId: record.pet.id, taskId: "play", createdAt: at, durationSec: 12, width: 1280, height: 720, mimeType: "video/webm", fileName: "synthetic.webm", status: "ai_reviewed", analysis: { source: "gemini", summary: "Model dopisał wniosek", observations: ["Rzekome uczucie"], limitations: [], needsReview: true } });
  const model = buildShareCardModel(record, ["healthy-category", "health-in-preference", "raw-model"]);
  assert.deepEqual(model.facts, []);
  assert(!JSON.stringify(model).includes("wymiotuje"));
  const demo = createDemoRecord("cat");
  const card = buildShareCardModel(demo, demo.memories.map((item) => item.id));
  assert.equal(card.isDemo, true);
  assert.deepEqual(card.facts, []);
  assert.match(card.attribution, /dane syntetyczne/);
});

test("wybór zachowuje kolejność opiekuna, usuwa duplikaty i ogranicza kartę do trzech relacji", () => {
  const facts: Evidence[] = Array.from({ length: 5 }, (_, i) => ({ id: `fact-${i}`, title: "Relacja opiekuna", excerpt: `Zapis ${i}`, kind: "owner_report" }));
  facts.push({ id: "knowledge", title: "Wiedza ogólna", excerpt: "Nie opisuje tego zwierzaka", kind: "knowledge" });
  facts.push({ id: "video", title: "Metadane", excerpt: "Nie jest potwierdzoną obserwacją", kind: "video" });
  assert.deepEqual(selectedCardFacts(facts, ["knowledge", "video", "fact-4", "fact-4", "fact-2", "fact-1", "fact-0"]).map((item) => item.id), ["fact-4", "fact-2", "fact-1"]);
});

test("zdjęcia odrzucają SVG, puste pliki i przekroczenie limitu; lokalna karta odrzuca zdalne URL", async () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.doesNotThrow(() => validatePhotoFile({ size: MAX_PHOTO_BYTES, type }));
  assert.throws(() => validatePhotoFile({ size: 100, type: "image/svg+xml" }), /JPEG/);
  assert.throws(() => validatePhotoFile({ size: 0, type: "image/jpeg" }), /puste/);
  assert.throws(() => validatePhotoFile({ size: MAX_PHOTO_BYTES + 1, type: "image/png" }), /5 MiB/);
  assert.equal(localPhotoSource("https://example.com/private.jpg"), undefined);
  assert.equal(localPhotoSource("data:image/svg+xml;base64,PHN2Zz4="), undefined);
  assert.equal(localPhotoSource("javascript:alert(1)"), undefined);
  assert.equal(localPhotoSource("data:image/png;base64,aGVsbG8="), "data:image/png;base64,aGVsbG8=");
  assert.equal(localPhotoSource("blob:https://copowiesz.pl/own-photo"), "blob:https://copowiesz.pl/own-photo");
  const model = buildShareCardModel(createPetRecord({ name: "Kot", species: "cat" }), []);
  await assert.rejects(() => renderShareCard(model, "https://example.com/private.jpg"), /wyłącznie/);
});

test("teksty i nazwa pliku zachowują polski zapis bez sterujących znaków lub ścieżek", () => {
  assert.equal(cardText("  Żółw\n  i\u202ebiały kot  ", 100), "Żółw i biały kot");
  assert.equal(cardText("🐈🐕🐈🐕", 3), "🐈🐕…");
  assert.equal(shareCardFileName("../../Żółty kot/sekret"), "copowiesz-Żółty-kot-sekret.png");
  assert.equal(shareCardFileName("../"), "copowiesz-zwierzak.png");
});

test("układ PNG mieści słowa, długie ciągi i Unicode w określonej liczbie wierszy", () => {
  const measure = (value: string) => Array.from(value).length;
  assert.deepEqual(wrapCardText("Krótki polski opis", measure, 10, 3), ["Krótki", "polski", "opis"]);
  const long = wrapCardText("Bardzodługiwyraz 🐈🐈🐈 i koniec opisu", measure, 8, 2);
  assert.equal(long.length, 2);
  assert(long.every((line) => measure(line) <= 8));
  assert(long[1].endsWith("…"));
  assert.deepEqual(wrapCardText("", measure, 10, 2), []);
});

test("renderer generuje lokalny PNG z oznaczeniem pochodzenia i bez wybranych zdalnych zdjęć", async () => {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  const sources: string[] = []; const drawnText: string[] = [];
  const context = new Proxy({ measureText: (text: string) => ({ width: Array.from(text).length * 12 }), fillText: (text: string) => drawnText.push(text), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, property) => property in target ? target[property as keyof typeof target] : () => undefined, set: () => true });
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob) => void, type: string) => callback(new Blob(["synthetic-png-test"], { type })) };
  class LocalImage {
    naturalWidth = 1000; naturalHeight = 800;
    onload?: () => void;
    set src(value: string) { sources.push(value); queueMicrotask(() => this.onload?.()); }
  }
  try {
    Object.defineProperty(globalThis, "Image", { configurable: true, writable: true, value: LocalImage });
    Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: { createElement: () => canvas, fonts: { load: async () => [] } } });
    const record = createPetRecord({ name: "Łatka", species: "cat" });
    record.memories.push({ id: "selected", text: "Wybiera piłeczkę", category: "preference", source: "owner_report", createdAt: at });
    record.memories.push({ id: "private", text: "Niepublikowany zapis", category: "routine", source: "owner_report", createdAt: at });
    const blob = await renderShareCard(buildShareCardModel(record, ["selected"]), "data:image/png;base64,aGVsbG8=");
    assert.equal(blob.type, "image/png");
    assert.equal(canvas.width, SHARE_CARD_WIDTH); assert.equal(canvas.height, SHARE_CARD_HEIGHT);
    assert.deepEqual(sources, ["/brand/logo.png", "data:image/png;base64,aGVsbG8="]);
    assert(drawnText.includes("Łatka")); assert(drawnText.includes("Wybiera piłeczkę"));
    assert(drawnText.some((value) => value.includes("Z relacji opiekuna")));
    assert(!drawnText.some((value) => value.includes("Niepublikowany")));
    drawnText.length = 0;
    await renderShareCard(buildShareCardModel(createDemoRecord("dog"), []));
    assert(drawnText.includes("DEMONSTRACJA")); assert(drawnText.some((value) => value.includes("DANE SYNTETYCZNE")));
  } finally {
    if (originalImage === undefined) Reflect.deleteProperty(globalThis, "Image"); else Object.defineProperty(globalThis, "Image", { configurable: true, writable: true, value: originalImage });
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, "document"); else Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: originalDocument });
  }
});
