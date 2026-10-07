import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { geminiAvailability } from "@/lib/server/gemini";
import { ApiError, assertSameOrigin, errorResult, jsonResult, readJson, verifiedLocalBrowserRequest } from "@/lib/server/http";

export const runtime = "nodejs";

const inputSchema = z.object({ key: z.string().trim().min(20).max(200).regex(/^[a-zA-Z0-9_.-]+$/), freeTier: z.literal(true) });

export async function POST(request: Request): Promise<Response> {
  try {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new ApiError(404, "Konfiguracja przez aplikację jest dostępna tylko lokalnie w trybie deweloperskim.");
    assertSameOrigin(request);
    if (!verifiedLocalBrowserRequest(request)) {
      throw new ApiError(403, "Klucz można ustawić wyłącznie z lokalnej aplikacji na tym komputerze.");
    }
    const { key } = await readJson(request, inputSchema, 2048);
    const envPath = path.join(process.cwd(), ".env.local");
    let previous = "";
    try {
      const info = await fs.lstat(envPath);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 64_000) throw new ApiError(409, "Lokalny plik konfiguracji wymaga ręcznego sprawdzenia.");
      previous = await fs.readFile(envPath, "utf8");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    const lines = previous.split(/\r?\n/).filter((line) => !/^\s*(?:export\s+)?GEMINI_API_KEY\s*=/.test(line));
    if (!lines.some((line) => /^\s*GEMINI_MODEL\s*=/.test(line))) lines.push("GEMINI_MODEL=gemini-3.1-flash-lite");
    lines.push(`GEMINI_API_KEY=${key}`);
    const tempPath = `${envPath}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempPath, `${lines.filter((line, index) => line || index < lines.length - 1).join("\n")}\n`, { flag: "wx", mode: 0o600 });
      await fs.rename(tempPath, envPath);
    } finally {
      await fs.rm(tempPath, { force: true });
    }
    process.env.GEMINI_API_KEY = key;
    if (!process.env.GEMINI_MODEL) process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";
    const available = await geminiAvailability();
    return jsonResult({ success: true, available, message: available ? "Klucz zapisany lokalnie. Dostęp do Gemini został potwierdzony. Nie włączamy rozliczeń ani planu płatnego." : "Klucz zapisany lokalnie. Dostęp do modelu nie został potwierdzony. Sprawdź klucz i połączenie; do tego czasu działa rozmowa lokalna." });
  } catch (error) {
    return errorResult(error);
  }
}
