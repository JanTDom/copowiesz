import { z } from "zod";
import { readBoundedText } from "./http";

const defaultModel = "gemini-3.1-flash-lite";
// A credential describes configuration, not permission for public use or billing status.
export function getGeminiConfig(): { model: string; apiKey: string } | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || defaultModel;
  if (!apiKey || !/^[a-zA-Z0-9_.-]{20,200}$/.test(apiKey) || model !== defaultModel) return null;
  return { model, apiKey };
}

export const geminiPublicPolicyNotice = "Publiczny dostęp do Gemini jest wyłączony. Wymaga zgodnej z warunkami Google konfiguracji rozliczeniowej potwierdzonej przez administratora. Sam klucz ani konto użytkownika nie wystarczają. Działa odpowiedź lokalna i kontrola techniczna nagrań.";

// This explicit operator attestation never enables billing or verifies the Google project.
export function isPublicGeminiAllowed(): boolean {
  return !process.env.VERCEL || process.env.GEMINI_PUBLIC_BILLING_CONFIRMED === "true";
}

let cachedAvailability: { until: number; fingerprint: string; available: boolean } | null = null;

export async function geminiAvailability(): Promise<boolean> {
  if (!isPublicGeminiAllowed()) return false;
  const config = getGeminiConfig();
  if (!config) return false;
  const fingerprint = `${config.model}:${config.apiKey}`;
  if (cachedAvailability?.fingerprint === fingerprint && cachedAvailability.until > Date.now()) return cachedAvailability.available;
  let available = false;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}`, {
      headers: { "x-goog-api-key": config.apiKey }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const payload: unknown = JSON.parse(await readBoundedText(response, 64_000));
      available = typeof payload === "object" && payload !== null && "name" in payload && payload.name === `models/${config.model}`;
    }
  } catch { /* Availability is measured, never inferred from the presence of a key. */ }
  cachedAvailability = { fingerprint, available, until: Date.now() + 30_000 };
  return available;
}

export const generatedReplySchema = z.object({
  content: z.string().trim().min(10).max(4000),
  evidenceIds: z.array(z.string().max(160)).max(12),
});

export type GeminiResult = { reply: z.infer<typeof generatedReplySchema> | null; reason?: "missing_config" | "quota" | "unavailable" | "invalid_output" | "public_policy_blocked" };

export async function generateGeminiJson(system: string, parts: unknown[], responseSchema: unknown, vision = false): Promise<{ output: unknown | null; reason?: GeminiResult["reason"] }> {
  if (!isPublicGeminiAllowed()) return { output: null, reason: "public_policy_blocked" };
  const config = getGeminiConfig();
  if (!config) return { output: null, reason: "missing_config" };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(vision ? 40_000 : 35_000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.25, maxOutputTokens: vision ? 1800 : 1200, responseMimeType: "application/json", responseSchema,
        },
      }),
    });
    if (!response.ok) return { output: null, reason: response.status === 429 ? "quota" : "unavailable" };
    const payload: unknown = JSON.parse(await readBoundedText(response, 128_000));
    if (typeof payload !== "object" || payload === null || !("candidates" in payload) || !Array.isArray(payload.candidates)) return { output: null, reason: "invalid_output" };
    const candidate = payload.candidates[0];
    if (!candidate || candidate.finishReason !== "STOP" || !Array.isArray(candidate.content?.parts)) return { output: null, reason: "invalid_output" };
    const text = candidate.content.parts.flatMap((part: { text?: unknown; thought?: boolean }) => typeof part.text === "string" && !part.thought ? [part.text] : []).join("");
    return { output: JSON.parse(text) };
  } catch {
    return { output: null, reason: "unavailable" };
  }
}

export async function generateGeminiReply(system: string, context: unknown): Promise<GeminiResult> {
  const generated = await generateGeminiJson(system, [{ text: JSON.stringify(context) }], {
    type: "OBJECT", properties: { content: { type: "STRING" }, evidenceIds: { type: "ARRAY", items: { type: "STRING" } } },
    required: ["content", "evidenceIds"],
  });
  if (!generated.output) return { reply: null, reason: generated.reason };
  const parsed = generatedReplySchema.safeParse(generated.output);
  return parsed.success ? { reply: parsed.data } : { reply: null, reason: "invalid_output" };
}
