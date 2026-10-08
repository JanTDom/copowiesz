import { buildGroundedReply, getKnowledgeEvidence, isHealthQuestion, searchKnowledge, type GroundedReply } from "../knowledge";
import type { ConversationSituation, Evidence, PetRecord } from "../types";

/** The current description is an owner report, never a video interpretation or durable memory. */
export function buildSituationReply(record: PetRecord, message: string, situation: ConversationSituation): GroundedReply {
  const query = `${message}\n${situation.description}\n${situation.context ?? ""}`;
  const evidence: Evidence[] = [{
    id: "situation:owner", title: "Bieżąca sytuacja — opis opiekuna", kind: "owner_report",
    excerpt: `${situation.description}${situation.context ? ` Kontekst podany przez opiekuna: ${situation.context}` : ""} To relacja opiekuna, nie potwierdzony wynik obserwacji modelu.`,
  }];
  const clip = situation.clipId ? record.clips.find(item => item.id === situation.clipId) : undefined;
  if (clip) evidence.push({
    id: `situation:clip:${clip.id}`, title: "Nagranie wskazane przez opiekuna", kind: "video",
    excerpt: `${clip.fileName || "Zapisany klip"}; czas ${clip.durationSec.toFixed(1)} s. W tej rozmowie przekazano wyłącznie identyfikator i metadane. Nie otrzymano filmu, klatek ani dźwięku; nie wyciągamy wniosków z jego obrazu.`,
  });
  if (isHealthQuestion(query)) {
    const health = buildGroundedReply(record, query);
    return { ...health, evidence: [...evidence, ...health.evidence] };
  }
  const card = searchKnowledge(query, record.pet.species, "behavior", 1)[0];
  const reference = card
    ? `Wskazówka z wiedzy o ${record.pet.species === "dog" ? "psach" : "kotach"}, dobrana przez podobieństwo słów, a nie rozpoznanie przyczyny: ${card.safe_next_steps[0] ?? "Obserwuj z odległości, w której zwierzak może swobodnie odejść."} ${card.limitations}`
    : "Na teraz daj zwierzakowi możliwość odejścia i nie powtarzaj bodźca, żeby uzyskać określoną reakcję. Zwróć uwagę na to, co było przed zachowaniem i co zmieniło się potem.";
  if (card) evidence.push(...getKnowledgeEvidence(card));
  return {
    content: `Pomoc dla opiekuna — poza wyobrażonym głosem zwierzaka.\n\nOpisujesz: „${situation.description}”${situation.context ? `\nPodany kontekst: ${situation.context}` : ""}\n\nTo opis opiekuna. ${clip ? "Wskazany film pozostaje lokalnym odniesieniem; nie został przeanalizowany w tej rozmowie. " : ""}Nie znamy całego przebiegu, typowego zachowania ani przyczyny tej reakcji. Sam taki opis nie potwierdza emocji, trwałej cechy czy choroby.\n\n${reference}\n\nCo działo się bezpośrednio przed tym zachowaniem i czy zwierzak mógł swobodnie odejść?`,
    evidence, mode: "grounded",
  };
}
