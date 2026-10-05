import type { NPCState } from "./NPCState";

export type NPCAction =
  | "idle"
  | "work"
  | "approach"
  | "avoid"
  | "leave"
  | "call_for_help"
  | "investigate";

export interface NPCDecisionContext {
  playerVisible: boolean;
  playerDistance: number;
  immediateDanger: number;
  goalPressure: number;
}

export interface NPCDecision {
  action: NPCAction;
  reason: string;
  targetId: string | null;
  confidence: number;
  animationIntent: string;
}

export function decideNPCAction(npc: NPCState, context: NPCDecisionContext): NPCDecision {
  const relation = npc.relationships.player;
  const trust = relation?.dimensions.trust ?? 0;
  const fear = Math.max(context.immediateDanger, relation?.dimensions.fear ?? 0);
  const suspicion = relation?.dimensions.suspicion ?? 0;

  if (fear >= 0.85) {
    return {
      action: "call_for_help",
      reason: "survival",
      targetId: "player",
      confidence: 0.95,
      animationIntent: "fearful"
    };
  }

  if (context.playerVisible && (fear >= 0.6 || suspicion >= Math.max(npc.suspicionThreshold, 0.65))) {
    return {
      action: context.playerDistance < 4 ? "avoid" : "leave",
      reason: fear >= suspicion ? "fear" : "suspicion",
      targetId: "player",
      confidence: 0.82,
      animationIntent: fear >= 0.6 ? "fearful" : "avoid_eye_contact"
    };
  }

  if (context.playerVisible && trust >= npc.trustThreshold && context.playerDistance < 5) {
    return {
      action: "approach",
      reason: "trusted_social_contact",
      targetId: "player",
      confidence: 0.78,
      animationIntent: "idle"
    };
  }

  if (context.goalPressure >= 0.7) {
    return {
      action: "investigate",
      reason: "high_priority_goal",
      targetId: null,
      confidence: 0.7,
      animationIntent: "idle"
    };
  }

  return {
    action: npc.routine.currentActivity ? "work" : "idle",
    reason: "routine",
    targetId: null,
    confidence: 0.55,
    animationIntent: "idle"
  };
}
