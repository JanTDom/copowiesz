import { getSupabase } from "./supabase";
import { getTasks } from "./domain";
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

export function apiRecord(record: PetRecord, linkedClipId?: string): PetRecord {
  // Explicit projection: local album, celebration, history situations and all photo bytes stay on device.
  // Keep full owner facts; only the older context is omitted, never rewritten as a shorter fact.
  const memories = record.memories.slice(-60);
  const ownClips = record.clips.filter(clip => clip.petId === record.pet.id);
  const byId = new Map(ownClips.map(clip => [clip.id, clip]));
  const chosen = new Set<string>();
  const keep = (id: string | undefined) => { if (id && byId.has(id) && chosen.size < 200) chosen.add(id); };
  keep(linkedClipId);
  for (const memory of memories) keep(memory.clipId);
  const newest = [...ownClips].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const task of getTasks(record.pet.species)) keep(newest.find(clip => clip.taskId === task.id
    && clip.durationSec > 0 && clip.width > 0 && clip.height > 0 && ["technical_only", "ai_reviewed"].includes(clip.status))?.id);
  for (const clip of newest) keep(clip.id);
  return { pet: { id: record.pet.id, name: record.pet.name, species: record.pet.species, ageMonths: record.pet.ageMonths, createdAt: record.pet.createdAt },
    answers: Object.fromEntries(Object.entries(record.answers).map(([id, answer]) => [id, { questionId: answer.questionId, status: answer.status, value: answer.value, note: answer.note, updatedAt: answer.updatedAt }])),
    clips: ownClips.filter(clip => chosen.has(clip.id)).map(clip => ({ id: clip.id, petId: clip.petId, taskId: clip.taskId, createdAt: clip.createdAt, durationSec: clip.durationSec,
      width: clip.width, height: clip.height, mimeType: clip.mimeType, fileName: clip.fileName, status: clip.status })),
    memories: memories.map(memory => ({id:memory.id,text:memory.text,category:memory.category,createdAt:memory.createdAt,source:memory.source,clipId:memory.clipId})), isDemo: record.isDemo,
    messages: record.messages.slice(-6).map(message => ({id:message.id,role:message.role,content:message.content.slice(0,1500),createdAt:message.createdAt})) };
}
