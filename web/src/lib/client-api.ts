import { getSupabase } from "./supabase";
import type { PetRecord } from "./types";

export async function apiFetch(path: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const client = getSupabase();
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(65000) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? data.message ?? "Nie udało się wykonać tej operacji. Spróbuj ponownie.");
  return data;
}

export function apiRecord(record: PetRecord): PetRecord {
  return { ...record, pet: { ...record.pet, photo: undefined }, messages: record.messages.slice(-30).map(message=>({...message,content:message.content.slice(0,5000)})), memories: record.memories.slice(-100) };
}
