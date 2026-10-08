import { z } from "zod";
import type { Clip, PetRecord } from "../types";

const identifier = z.string().min(1).max(120).regex(/^[\p{L}\p{N}_.:-]+$/u);
const timestamp = z.string().min(1).max(60).refine((value) => Number.isFinite(Date.parse(value)));
const shortText = z.string().max(2000);

export const clipAnalysisSchema = z.object({
  source: z.enum(["technical", "ollama", "gemini"]),
  summary: z.string().min(1).max(2000),
  observations: z.array(z.string().min(1).max(1000)).max(12),
  limitations: z.array(z.string().min(1).max(1000)).max(12),
  needsReview: z.boolean(),
});

export const clipSchema: z.ZodType<Clip> = z.object({
  id: identifier, petId: identifier, taskId: identifier, createdAt: timestamp,
  durationSec: z.number().finite().min(0).max(300),
  width: z.number().int().min(0).max(16384),
  height: z.number().int().min(0).max(16384),
  mimeType: z.string().max(100).regex(/^video\/(?:webm|mp4|quicktime|ogg)(?:;[a-zA-Z0-9=., "'-]+)?$/),
  fileName: z.string().max(255),
  status: z.enum(["pending", "technical_only", "ai_reviewed", "stopped", "skipped"]),
  analysis: clipAnalysisSchema.optional().transform((value) => value ? { ...value, needsReview: true } : undefined),
});

const answerSchema = z.object({
  questionId: identifier,
  status: z.enum(["answered", "unknown", "not_applicable", "skipped"]),
  value: z.union([z.string().max(2000), z.number().finite(), z.array(z.string().max(200)).max(30)]).optional(),
  note: z.string().max(2000).optional(), updatedAt: timestamp,
});

/** Unknown fields (including incoming message mode/evidence and pet photo) are discarded. */
export const petRecordSchema: z.ZodType<PetRecord> = z.object({
  pet: z.object({
    id: identifier, name: z.string().trim().min(1).max(80), species: z.enum(["dog", "cat"]),
    ageMonths: z.number().int().min(0).max(600).optional(), createdAt: timestamp,
  }),
  answers: z.record(identifier, answerSchema)
    .refine((answers) => Object.keys(answers).length <= 120)
    .refine((answers) => Object.entries(answers).every(([key, answer]) => key === answer.questionId)),
  clips: z.array(clipSchema).max(200),
  memories: z.array(z.object({
    id: identifier, text: shortText, category: z.enum(["preference", "routine", "event", "health", "other"]),
    createdAt: timestamp, source: z.enum(["owner_report", "video_annotation"]), clipId: identifier.optional(),
  })).max(300),
  messages: z.array(z.object({
    id: identifier, role: z.enum(["user", "assistant"]), content: z.string().max(5000), createdAt: timestamp,
  })).max(40),
  isDemo: z.boolean().optional(),
}).refine((record) => record.clips.every((clip) => clip.petId === record.pet.id));

export const chatRequestSchema = z.object({
  record: petRecordSchema,
  message: z.string().trim().min(1).max(2000),
  situation: z.object({ description: z.string().trim().min(1).max(1500), context: z.string().trim().max(500).optional(), clipId: identifier.optional() }).strict().optional(),
}).superRefine(({record,situation},ctx) => {
  if (situation?.clipId && !record.clips.some(clip => clip.id === situation.clipId && clip.petId === record.pet.id
    && clip.durationSec > 0 && clip.width > 0 && clip.height > 0 && ["technical_only", "ai_reviewed"].includes(clip.status))) {
    ctx.addIssue({code:"custom",path:["situation","clipId"],message:"Sytuacja wymaga własnego gotowego nagrania."});
  }
});

const jpegFrame = z.string().max(240_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  .refine((value) => {
    const encoded = value.slice(value.indexOf(",") + 1);
    if (encoded.length % 4 !== 0) return false;
    const bytes = Buffer.from(encoded, "base64");
    return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  });

export const analyzeRequestSchema = z.object({
  record: petRecordSchema, clip: clipSchema,
  frames: z.array(jpegFrame).max(6).optional(),
  frameTimes: z.array(z.number().finite().min(0).max(300)).max(6).optional(),
  geminiConsent: z.boolean().optional(),
  videoData: z.string().max(2_800_000).regex(/^data:video\/(?:webm|mp4)(?:;codecs=[a-zA-Z0-9=., "'-]+)?;base64,[A-Za-z0-9+/]+={0,2}$/)
    .refine((value) => {
      const encoded = value.slice(value.indexOf(";base64,") + 8);
      if (encoded.length % 4 !== 0) return false;
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.byteLength < 12 || bytes.byteLength > 2_100_000) return false;
      return value.startsWith("data:video/webm")
        ? bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
        : bytes.subarray(4, 8).toString("ascii") === "ftyp";
    }).optional(),
}).refine(({ record, clip }) => clip.petId === record.pet.id)
  .refine(({ frames, frameTimes, clip }) => {
    if (frameTimes && frameTimes.length !== (frames?.length || 0)) return false;
    return !frameTimes || frameTimes.every((time, index) => time <= clip.durationSec && (!index || time >= frameTimes[index - 1]));
  });
