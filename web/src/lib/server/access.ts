import { createHash } from "node:crypto";
import { ApiError, readBoundedText } from "./http";

export async function providerCaller(request: Request): Promise<string> {
  if (!process.env.VERCEL) return "local";
  const token = request.headers.get("authorization");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!token || !/^Bearer [a-zA-Z0-9_.-]{20,4096}$/.test(token)) {
    throw new ApiError(401, "Zaloguj się, aby korzystać z rozmowy Gemini w wersji online.");
  }
  if (!supabaseUrl || !publicKey) {
    throw new ApiError(503, "Logowanie w wersji online nie jest jeszcze skonfigurowane.");
  }
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("config");
    const response = await fetch(`${url.origin}/auth/v1/user`, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000),
      headers: { apikey: publicKey, Authorization: token },
    });
    if (!response.ok) throw new Error("auth");
    const data: unknown = JSON.parse(await readBoundedText(response, 128_000));
    if (typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "string") throw new Error("auth");
    return createHash("sha256").update(data.id).digest("hex");
  } catch {
    throw new ApiError(401, "Sesja wygasła. Zaloguj się ponownie.");
  }
}

// A local process guard, not a distributed billing limit. Production also requires authentication.
const calls = new Map<string, { minuteStart: number; count: number }>();
let daily = { day: "", count: 0 };

export function claimProviderCall(caller: string): void {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  for (const [key, value] of calls) {
    if (now - value.minuteStart > 60_000) calls.delete(key);
  }
  const current = calls.get(caller) ?? { minuteStart: now, count: 0 };
  if (current.count >= 20 || daily.count >= 300) {
    throw new ApiError(429, "Osiągnięto lokalny limit rozmów Gemini. Spróbuj później; nie przełączamy na płatny model.");
  }
  current.count += 1;
  daily.count += 1;
  calls.set(caller, current);
}
