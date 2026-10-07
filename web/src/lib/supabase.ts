import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

// Klient przeglądarkowy. Publiczny klucz identyfikuje projekt; dostęp nadają Auth i RLS.
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured() || typeof window === "undefined") return null;
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim();
    if (key.startsWith("sb_secret_")) throw new Error("Chmura wymaga publicznego klucza Supabase, nie klucza serwerowego.");
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } });
  }
  return client;
}
