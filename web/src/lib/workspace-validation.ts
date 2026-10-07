import { z } from "zod";
import { getQuestions, guidedTasks, validateAnswer } from "./domain";
import type { PetRecord, Workspace } from "./types";

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).transform((value) => value.toLowerCase());
const timestamp = z.iso.datetime({ offset: true });
const identifier = z.string().min(1).max(200).regex(/^[\p{L}\p{N}_.:-]+$/u);
const demoMemoryIds = new Set(["demo-play", "demo-rest", "demo-walk"]);
const memoryIdentifier = z.union([uuid, z.enum(["demo-play", "demo-rest", "demo-walk"])]);

/** Nie otwieramy obcych adresów zdjęć podczas odtwarzania profilu. */
export function sanitizePetPhoto(input: unknown): string | undefined {
  if (typeof input !== "string" || input.length > 2_800_000) return undefined;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match || match[2].length % 4 !== 0) return undefined;
  try {
    const encoded = match[2];
    const byteLength = encoded.length / 4 * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
    if (byteLength > 2_000_000) return undefined;
    // Do kontroli typu wystarczą sygnatury: nie dekodujemy wszystkich zdjęć przy każdym zapisie czatu.
    const bytes = atob(encoded.slice(0, Math.min(32, encoded.length)));
    const ending = atob(encoded.slice(-8));
    const valid = match[1] === "jpeg" ? byteLength >= 4 && bytes.charCodeAt(0) === 0xff && bytes.charCodeAt(1) === 0xd8 && ending.charCodeAt(ending.length - 2) === 0xff && ending.charCodeAt(ending.length - 1) === 0xd9
      : match[1] === "png" ? bytes.startsWith("\x89PNG\r\n\x1a\n")
        : bytes.length >= 12 && bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    return valid ? input : undefined;
  } catch { return undefined; }
}

const photo = z.unknown().optional().transform(sanitizePetPhoto);
const answerSchema = z.object({
  questionId: z.string().regex(/^q\d{3}$/),
  status: z.enum(["answered", "unknown", "not_applicable", "skipped"]),
  value: z.union([z.string().max(2000), z.number().finite(), z.array(z.string().max(200)).max(30)]).optional(),
  note: z.string().max(2000).optional(),
  updatedAt: timestamp,
});

const analysisSchema = z.object({
  source: z.enum(["technical", "gemini", "ollama"]),
  summary: z.string().trim().min(1).max(2000),
  observations: z.array(z.string().trim().min(1).max(1000)).max(12),
  limitations: z.array(z.string().trim().min(1).max(1000)).max(12),
  needsReview: z.boolean().transform(() => true),
}).refine((analysis) => analysis.source !== "technical" || analysis.observations.length === 0, "Kontrola techniczna nie zawiera rozpoznanych zachowań.");

const taskIds = new Set(guidedTasks.map((task) => task.id));
const clipSchema = z.object({
  id: uuid, petId: uuid, taskId: z.string().refine((value) => taskIds.has(value)),
  createdAt: timestamp,
  durationSec: z.number().finite().min(0).max(300),
  width: z.number().int().min(0).max(16384), height: z.number().int().min(0).max(16384),
  mimeType: z.string().max(100).regex(/^video\/(webm|mp4|quicktime|ogg)(?:;[a-zA-Z0-9=., "'-]+)?$/i),
  fileName: z.string().max(255),
  status: z.enum(["pending", "technical_only", "ai_reviewed", "stopped", "skipped"]),
  analysis: analysisSchema.optional(),
});

const memorySchema = z.object({
  id: memoryIdentifier, text: z.string().trim().min(1).max(2000),
  category: z.enum(["preference", "routine", "event", "health", "other"]),
  createdAt: timestamp, source: z.enum(["owner_report", "video_annotation"]), clipId: uuid.optional(),
});

const evidenceUrl = z.string().max(2000).refine((value) => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
});
const evidenceSchema = z.object({
  id: identifier, title: z.string().trim().min(1).max(2000), excerpt: z.string().max(12000),
  url: evidenceUrl.optional(), kind: z.enum(["owner_report", "knowledge", "video"]),
});
const messageSchema = z.object({
  id: uuid, role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000), createdAt: timestamp,
  evidence: z.array(evidenceSchema).max(30).optional(),
  mode: z.enum(["grounded", "gemini", "ollama", "health", "demo"]).optional(),
  provider: z.enum(["gemini", "local", "ollama"]).optional(),
});

export const workspacePetRecordSchema: z.ZodType<PetRecord> = z.object({
  pet: z.object({
    id: uuid, name: z.string().trim().min(1).max(80), species: z.enum(["dog", "cat"]),
    ageMonths: z.number().int().min(0).max(600).optional(), photo, createdAt: timestamp,
  }),
  answers: z.record(z.string().regex(/^q\d{3}$/), answerSchema).refine((value) => Object.keys(value).length <= 94),
  clips: z.array(clipSchema).max(500), memories: z.array(memorySchema).max(1000), messages: z.array(messageSchema).max(2000),
  isDemo: z.boolean().optional(),
}).superRefine((record, ctx) => {
  const questions = new Map(getQuestions(record.pet.species).map((question) => [question.id, question]));
  for (const [key, answer] of Object.entries(record.answers)) {
    const question = questions.get(key);
    if (!question || key !== answer.questionId || !validateAnswer(question, answer)) ctx.addIssue({ code: "custom", path: ["answers", key], message: "Nieprawidłowa odpowiedź lub pytanie innego gatunku." });
    if (question?.construct === "species" && answer.status === "answered" && answer.value !== record.pet.species) ctx.addIssue({ code: "custom", path: ["answers", key, "value"], message: "Odpowiedź o gatunku jest sprzeczna z profilem zwierzaka." });
  }
  for (const [field, values] of [["clips", record.clips], ["memories", record.memories], ["messages", record.messages]] as const) {
    if (new Set(values.map((value) => value.id)).size !== values.length) ctx.addIssue({ code: "custom", path: [field], message: "Powtórzone identyfikatory zapisów." });
  }
  const clipIds = new Set(record.clips.map((clip) => clip.id));
  record.clips.forEach((clip, index) => {
    if (clip.petId !== record.pet.id) ctx.addIssue({ code: "custom", path: ["clips", index, "petId"], message: "Klip należy do innego profilu." });
  });
  record.memories.forEach((memory, index) => {
    if (demoMemoryIds.has(memory.id) && !record.isDemo) ctx.addIssue({ code: "custom", path: ["memories", index, "id"], message: "Identyfikator demonstracji w rzeczywistym profilu." });
    if (memory.source === "video_annotation" && (!memory.clipId || !clipIds.has(memory.clipId))) ctx.addIssue({ code: "custom", path: ["memories", index, "clipId"], message: "Adnotacja wymaga istniejącego klipu tego zwierzaka." });
    if (memory.clipId && !clipIds.has(memory.clipId)) ctx.addIssue({ code: "custom", path: ["memories", index, "clipId"], message: "Odwołanie do nieistniejącego klipu." });
  });
});

const workspaceSchema = z.object({ schemaVersion: z.literal(1), pets: z.array(workspacePetRecordSchema).max(30), activePetId: uuid.nullable().optional() }).superRefine((workspace, ctx) => {
  if (new Set(workspace.pets.map((record) => record.pet.id)).size !== workspace.pets.length) ctx.addIssue({ code: "custom", path: ["pets"], message: "Powtórzone profile." });
  const clipIds = workspace.pets.flatMap((record) => record.clips.map((clip) => clip.id));
  if (new Set(clipIds).size !== clipIds.length) ctx.addIssue({ code: "custom", path: ["pets"], message: "Ten sam klip występuje w kilku profilach." });
});

export function validatePetRecord(value: unknown): PetRecord {
  const parsed = workspacePetRecordSchema.safeParse(value);
  if (!parsed.success) throw new Error("Profil zawiera nieprawidłowe odpowiedzi, daty, nagrania lub zapisy pamięci. Nie zastępuj nim lokalnej kopii.");
  return parsed.data;
}

export function validateWorkspace(value: unknown): Workspace {
  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success) throw new Error("Nieprawidłowy plik COPOWIESZ: sprawdź wersję, identyfikatory i zawartość profili. Dane lokalne pozostają zapisane.");
  const workspace = parsed.data;
  const activePetId = workspace.pets.some((record) => record.pet.id === workspace.activePetId) ? workspace.activePetId! : workspace.pets[0]?.pet.id ?? null;
  return { schemaVersion: 1, pets: workspace.pets, activePetId };
}

/** Czysta walidacja odpowiedzi Data API, wspólna dla pobierania i testów bez konta. */
export function validateCloudWorkspace(rows: unknown, metadata: unknown): Workspace | null {
  const rowSchema = z.object({ id: uuid, schema_version: z.literal(1), payload: workspacePetRecordSchema });
  const metadataSchema = z.object({ schema_version: z.literal(1), active_pet_id: uuid.nullable() });
  const parsedRows = z.array(rowSchema).max(30).safeParse(rows ?? []);
  const parsedMetadata = metadata === null || metadata === undefined ? null : metadataSchema.safeParse(metadata);
  if (!parsedRows.success || (parsedMetadata && !parsedMetadata.success)) throw new Error("Chmurowe dane mają nieprawidłową lub nieobsługiwaną strukturę. Nie zastępuj nimi lokalnej kopii.");
  if (!parsedRows.data.length && !parsedMetadata) return null;
  const records = parsedRows.data.map((row) => {
    if (row.payload.pet.id !== row.id || row.payload.isDemo) throw new Error("Chmurowy profil ma nieprawidłową tożsamość lub zawiera demonstrację.");
    return row.payload;
  });
  return validateWorkspace({ schemaVersion: 1, pets: records, activePetId: parsedMetadata?.data?.active_pet_id ?? null });
}
