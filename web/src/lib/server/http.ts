import { z } from "zod";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function localDevelopmentRequest(request: Request): boolean {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return false;
  try {
    const target = new URL(request.url);
    if (!loopbackHosts.has(target.hostname)) return false;
    const host = request.headers.get("host");
    if (!host) return true;
    const actual = new URL(`${target.protocol}//${host}`);
    return loopbackHosts.has(actual.hostname) && actual.port === target.port && !actual.username && !actual.password;
  } catch { return false; }
}

export function matchesRequestOrigin(request: Request, source: string): boolean {
  try {
    const target = new URL(request.url); const incoming = new URL(source);
    if (incoming.username || incoming.password) return false;
    if (incoming.origin === target.origin) return true;
    // Next dev can canonicalize request.url to localhost even when the actual Host is 127.0.0.1.
    // Only loopback aliases on the identical protocol and port are interchangeable locally.
    return localDevelopmentRequest(request) && loopbackHosts.has(incoming.hostname)
      && incoming.protocol === target.protocol && incoming.port === target.port;
  } catch { return false; }
}

export function verifiedLocalBrowserRequest(request: Request): boolean {
  if (!localDevelopmentRequest(request)) return false;
  const origin = request.headers.get("origin");
  if (origin) return matchesRequestOrigin(request, origin);
  const referer = request.headers.get("referer");
  // Native embedded browsers can omit Origin. A verified local Referer remains required for setup.
  return !!referer && matchesRequestOrigin(request, referer);
}

/** Browser mutations must originate from this application. CLI calls have no Origin. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new ApiError(403, "Żądanie musi pochodzić z tej aplikacji.");
  }
  if (origin) {
    if (!matchesRequestOrigin(request, origin)) {
      throw new ApiError(403, "Żądanie musi pochodzić z tej aplikacji.");
    }
  } else if (localDevelopmentRequest(request) && request.headers.has("referer") && !matchesRequestOrigin(request, request.headers.get("referer")!)) {
    throw new ApiError(403, "Żądanie musi pochodzić z tej aplikacji.");
  }
}

export async function readBoundedText(response: Request | Response, maxBytes: number): Promise<string> {
  const announced = Number(response.headers.get("content-length"));
  if (Number.isFinite(announced) && announced > maxBytes) {
    throw new ApiError(413, "Materiał jest zbyt duży. Skróć wiadomość lub wybierz mniejsze klatki.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "Materiał jest zbyt duży. Skróć wiadomość lub wybierz mniejsze klatki.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes: number): Promise<T> {
  assertSameOrigin(request);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "Wyślij dane w formacie JSON.");
  }
  let input: unknown;
  try {
    input = JSON.parse(await readBoundedText(request, maxBytes));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Nie udało się odczytać danych. Sprawdź formularz i spróbuj ponownie.");
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, "Dane są niekompletne lub mają nieprawidłowy format.");
  }
  return parsed.data;
}

export function jsonResult(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function errorResult(error: unknown): Response {
  if (error instanceof ApiError) return jsonResult({ error: error.message }, error.status);
  // Never log or return private request bodies, environment values or model errors.
  return jsonResult({ error: "Nie udało się wykonać tej czynności. Spróbuj ponownie." }, 500);
}
