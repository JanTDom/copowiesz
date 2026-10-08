export type Species = "dog" | "cat";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  ageMonths?: number;
  photo?: string;
  createdAt: string;
}

export interface Answer {
  questionId: string;
  status: "answered" | "unknown" | "not_applicable" | "skipped";
  value?: string | number | string[];
  note?: string;
  updatedAt: string;
}

export interface ClipAnalysis {
  source: "technical" | "gemini" | "ollama";
  summary: string;
  observations: string[];
  limitations: string[];
  needsReview: boolean;
}

export interface Clip {
  id: string;
  petId: string;
  taskId: string;
  createdAt: string;
  durationSec: number;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  status: "pending" | "technical_only" | "ai_reviewed" | "stopped" | "skipped";
  analysis?: ClipAnalysis;
}

export interface Memory {
  id: string;
  text: string;
  category: "preference" | "routine" | "event" | "health" | "other";
  createdAt: string;
  source: "owner_report" | "video_annotation";
  clipId?: string;
}

export interface Evidence {
  id: string;
  title: string;
  excerpt: string;
  url?: string;
  kind: "owner_report" | "knowledge" | "video";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  evidence?: Evidence[];
  mode?: "grounded" | "gemini" | "ollama" | "health" | "demo";
  provider?: "gemini" | "local" | "ollama";
  situation?: ConversationSituation;
}

export interface ConversationSituation {
  description: string;
  context?: string;
  clipId?: string;
}

export interface Moment {
  id: string;
  title: string;
  caption: string;
  occurredAt: string;
  createdAt: string;
  photoId?: string;
  clipId?: string;
}

export interface PetRecord {
  pet: Pet;
  answers: Record<string, Answer>;
  clips: Clip[];
  memories: Memory[];
  messages: Message[];
  isDemo?: boolean;
  moments?: Moment[];
  preferences?: { firstConversationCelebratedAt?: string };
}

export interface Workspace {
  schemaVersion: 1;
  pets: PetRecord[];
  activePetId: string | null;
}

export interface GuidedTask {
  id: string;
  title: string;
  description: string;
  species: Species[];
  instructions: string[];
  stopConditions: string[];
  requiresKnownCue?: boolean;
}

export interface QuestionSection {
  id: string;
  title: string;
  description: string;
}

export interface Question {
  id: string;
  section_id: string;
  species: Species[];
  prompt: string;
  type: "single_choice" | "multi_choice" | "free_text" | "number" | "frequency";
  required: boolean;
  recall_window_days: number | null;
  construct: string;
  notes: string;
  options?: { value: string; label: string }[];
}

export interface KnowledgeClaim {
  id: string;
  text: string;
  basis: "source_finding" | "project_recommendation";
  source_ids: string[];
  locator: string;
  uncertainty: string;
}

export interface KnowledgeCard {
  id: string;
  species: Species[];
  domain?: "behavior" | "methods" | "health";
  topic: string;
  title: string;
  observation: string;
  possible_interpretations: string[];
  confounders: string[];
  safe_next_steps: string[];
  escalation: string;
  evidence_level: string;
  source_ids: string[];
  limitations: string;
  tags: string[];
  not_diagnostic?: boolean;
  review_status?: string;
  claims?: KnowledgeClaim[];
}

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  year: number | string;
  kind: string;
  species: Species[];
  evidence_level: string;
  license_status: string;
  reviewed_at: string;
  notes: string;
  doi?: string;
  study_design?: string;
  population?: string;
  access_basis?: string;
  review_status?: string;
  retraction_check?: string;
}
