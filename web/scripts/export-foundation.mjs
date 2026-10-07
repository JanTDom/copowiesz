import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Przetwarzanie tylko publicznego fundamentu. Nie czyta data/private ani nagrań.
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(webRoot, "..");
const output = resolve(webRoot, "src/data");
const sourceDir = resolve(projectRoot, "data/raw/manual/behavior_knowledge");
const questionnairePath = "data/raw/manual/questionnaires/owner_questionnaire_v1.json";
const inputFiles = (await readdir(sourceDir)).filter((file) => /_(cards|sources)\.json$/.test(file)).sort();
const cards = [];
const sources = [];
const hashes = {};
for (const file of inputFiles) {
  const bytes = await readFile(resolve(sourceDir, file));
  hashes[`data/raw/manual/behavior_knowledge/${file}`] = createHash("sha256").update(bytes).digest("hex");
  const records = JSON.parse(bytes);
  (file.endsWith("_cards.json") ? cards : sources).push(...records);
}
const questionnaireBytes = await readFile(resolve(projectRoot, questionnairePath));
const questionnaire = JSON.parse(questionnaireBytes);
hashes[questionnairePath] = createHash("sha256").update(questionnaireBytes).digest("hex");
for (const [name, records] of [["cards", cards], ["sources", sources], ["questions", questionnaire.questions]]) {
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error(`Duplicate ${name} ids`);
}
const sourceById = new Map(sources.map((source) => [source.id, source]));
for (const card of cards) {
  for (const sourceId of card.source_ids) {
    const source = sourceById.get(sourceId);
    if (!source || !card.species.every((species) => source.species.includes(species))) throw new Error(`Invalid source ${sourceId} on ${card.id}`);
  }
}
await mkdir(output, { recursive: true });
for (const [name, data] of [["questionnaire", questionnaire], ["knowledge-cards", cards], ["knowledge-sources", sources]]) {
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
}
await writeFile(resolve(output, "foundation-manifest.json"), JSON.stringify({
  formatVersion: 1,
  questionnaireVersion: questionnaire.version,
  cards: cards.length,
  sources: sources.length,
  questions: questionnaire.questions.length,
  questionsPerSpecies: Object.fromEntries(["dog", "cat"].map((species) => [species, questionnaire.questions.filter((question) => question.species.includes(species)).length])),
  inputSha256: hashes,
  limitations: "Autorski prototyp do przeglądu eksperckiego; brak klinicznej lub psychometrycznej walidacji. Pełne teksty źródeł nie są kopiowane.",
}, null, 2) + "\n");
console.log(`Wyeksportowano ${questionnaire.questions.length} pytań, ${cards.length} kart i ${sources.length} źródeł.`);
