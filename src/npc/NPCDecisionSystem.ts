import type { NPCState } from "./NPCState";

export type NPCAction =
  | "idle"
  | "work"
  | "approach"
  | "avoid"
  | "leave"
  | "call_for_help"
  | "investigate";

export type SocialRequestAction = "accept" | "decline" | "ask_why" | "counteroffer";

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

export interface SocialRequestContext {
  request: string;
  destination: string;
  timeCost: number;
  privacy: number;
  danger: number;
  urgency: number;
  socialPressure: number;
}

export interface SocialRequestDecision {
  action: SocialRequestAction;
  reason: string;
  targetId: string;
  confidence: number;
  animationIntent: string;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

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

export function decideSocialRequest(
  npc: NPCState,
  context: SocialRequestContext
): SocialRequestDecision {
  const relation = npc.relationships.player;
  const trust = clamp01(relation?.dimensions.trust ?? 0);
  const fear = clamp01(relation?.dimensions.fear ?? 0);
  const suspicion = clamp01(relation?.dimensions.suspicion ?? 0);
  const affection = clamp01(relation?.dimensions.affection ?? 0);
  const loyalty = clamp01(relation?.dimensions.loyalty ?? 0);

  const activeGoalPressure = npc.goals.reduce(
    (highest, goal) => goal.status === "active" ? Math.max(highest, clamp01(goal.priority)) : highest,
    0
  );

  const risk = clamp01(Math.max(context.danger, fear));
  const socialValue = clamp01(
    trust * 0.38 +
    affection * 0.18 +
    loyalty * 0.16 +
    context.urgency * 0.12 +
    context.socialPressure * 0.16
  );

  const cost = clamp01(context.timeCost * 0.55 + context.privacy * 0.2 + risk * 0.25);
  const confidenceBase = 0.55 + clamp01(npc.intelligenceLevel) * 0.35;

  if (risk >= 0.8) {
    return {
      action: "decline",
      reason: "immediate_safety_risk",
      targetId: "player",
      confidence: confidenceBase,
      animationIntent: "fearful"
    };
  }

  if (suspicion >= 0.68 && context.privacy >= 0.5) {
    return {
      action: "ask_why",
      reason: "high_suspicion_private_request",
      targetId: "player",
      confidence: confidenceBase,
      animationIntent: "avoid_eye_contact"
    };
  }

  if (activeGoalPressure >= 0.8 && context.timeCost >= 0.2 && socialValue < 0.62) {
    return {
      action: "counteroffer",
      reason: "protect_high_priority_goal",
      targetId: "player",
      confidence: confidenceBase,
      animationIntent: "nervous"
    };
  }

  if (socialValue >= 0.68 && cost <= 0.5 && suspicion < 0.55) {
    return {
      action: "accept",
      reason: "relationship_overcomes_cost",
      targetId: "player",
      confidence: confidenceBase,
      animationIntent: "idle"
    };
  }

  if (socialValue >= 0.5 && suspicion < 0.65) {
    return {
      action: "ask_why",
      reason: "needs_context_before_commitment",
      targetId: "player",
      confidence: confidenceBase,
      animationIntent: "nervous"
    };
  }

  return {
    action: "decline",
    reason: activeGoalPressure >= 0.65 ? "protect_current_priority" : "insufficient_trust",
    targetId: "player",
    confidence: confidenceBase,
    animationIntent: "avoid_eye_contact"
  };
}
