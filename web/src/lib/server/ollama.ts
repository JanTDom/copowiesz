import { readBoundedText } from "./http";

type ModelConfig = { baseUrl: string; model: string };

/** The first release only sends pet data to a local Ollama installation. */
export function getLocalModelConfig(kind: "chat" | "vision"): ModelConfig | null {
  if (process.env.VERCEL) return null;
  const model = (kind === "chat" ? process.env.OLLAMA_MODEL : process.env.OLLAMA_VISION_MODEL)?.trim();
  if (!model || model.length > 120 || !/^[a-zA-Z0-9._:/-]+$/.test(model)) return null;
  try {
    const url = new URL(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434");
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return null;
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/") return null;
    return { baseUrl: url.origin, model };
  } catch {
    return null;
  }
}

function sameModel(actual: string, configured: string): boolean {
  return actual === configured || (configured.indexOf(":") === -1 && actual === `${configured}:latest`);
}

export async function modelAvailability(): Promise<{ chat: boolean; vision: boolean }> {
  const chat = getLocalModelConfig("chat");
  const vision = getLocalModelConfig("vision");
  if (!chat && !vision) return { chat: false, vision: false };
  try {
    const response = await fetch(`${(chat || vision)!.baseUrl}/api/tags`, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(1250),
    });
    if (!response.ok) return { chat: false, vision: false };
    const payload: unknown = JSON.parse(await readBoundedText(response, 128_000));
    const models = typeof payload === "object" && payload !== null && "models" in payload && Array.isArray(payload.models)
      ? payload.models.flatMap((item: unknown) => {
          if (typeof item !== "object" || item === null) return [];
          const name = "name" in item ? item.name : "model" in item ? item.model : null;
          return typeof name === "string" ? [name] : [];
        }) : [];
    return {
      chat: !!chat && models.some((name) => sameModel(name, chat.model)),
      vision: !!vision && models.some((name) => sameModel(name, vision.model)),
    };
  } catch {
    return { chat: false, vision: false };
  }
}

export async function localChat(
  kind: "chat" | "vision",
  messages: { role: "system" | "user"; content: string; images?: string[] }[],
): Promise<unknown | null> {
  const config = getLocalModelConfig(kind);
  if (!config) return null;
  try {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(kind === "vision" ? 40_000 : 35_000),
      body: JSON.stringify({
        model: config.model, messages, stream: false, format: "json",
        options: { temperature: 0.2, num_predict: kind === "vision" ? 900 : 600 },
        keep_alive: "5m",
      }),
    });
    if (!response.ok) return null;
    const payload: unknown = JSON.parse(await readBoundedText(response, 64_000));
    if (typeof payload !== "object" || payload === null || !("message" in payload)) return null;
    const message = payload.message;
    if (typeof message !== "object" || message === null || !("content" in message) || typeof message.content !== "string") return null;
    return JSON.parse(message.content);
  } catch {
    return null;
  }
}
