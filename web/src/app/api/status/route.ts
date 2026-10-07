import { providerCaller } from "@/lib/server/access";
import { geminiAvailability, geminiPublicPolicyNotice, getGeminiConfig, isPublicGeminiAllowed } from "@/lib/server/gemini";
import { jsonResult } from "@/lib/server/http";
import { getLocalModelConfig, modelAvailability } from "@/lib/server/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const configured = !!getGeminiConfig();
  const publicAccessAllowed = isPublicGeminiAllowed();
  const policyNotice = publicAccessAllowed ? null : geminiPublicPolicyNotice;
  let mayProbe = publicAccessAllowed && !process.env.VERCEL;
  if (publicAccessAllowed && !mayProbe && request.headers.has("authorization")) {
    try { await providerCaller(request); mayProbe = true; } catch { /* No anonymous credential probes in deployment. */ }
  }
  const [chatAvailable, local] = await Promise.all([
    !publicAccessAllowed ? Promise.resolve(false) : mayProbe ? geminiAvailability() : Promise.resolve(null), modelAvailability(),
  ]);
  return jsonResult({
    chat: { provider: "gemini", configured, available: chatAvailable, mode: chatAvailable ? "gemini" : "grounded", authenticationRequired: !!process.env.VERCEL && publicAccessAllowed, publicAccessAllowed, policyNotice, quotaVerified: false },
    vision: { provider: configured ? "gemini" : "ollama", configured: configured || !!getLocalModelConfig("vision"), available: configured ? chatAvailable : local.vision, mode: chatAvailable || local.vision ? "vision" : "technical", consentRequired: true, publicAccessAllowed, policyNotice },
    storage: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) ? "supabase_prepared" : "local",
    deployment: process.env.VERCEL ? "vercel" : "local",
    setupAvailable: process.env.NODE_ENV !== "production" && !process.env.VERCEL,
    policyNotice,
    message: policyNotice || (chatAvailable ? "Gemini odpowiada na sprawdzenie dostępu do modelu. Limit wywołań zależy od konfiguracji projektu Google." : configured ? "Klucz jest ustawiony. Dostęp do modelu nie został potwierdzony; działa odpowiedź lokalna." : "Gemini nie jest podłączone; działa odpowiedź lokalna oparta na zapisach."),
  });
}
