import type { NPCState } from "../npc/NPCState";
import type { GameEffect } from "../core/Effects";
import type { AnimationIntent } from "../animation/AnimationController";

export interface DialogueState {
  conversationId: string;
  participants: string[];
  locationId: string;
  startTime: number;
  moodAtStart: Record<string, NPCState["currentMood"]>;
  activeTopics: string[];
  promises: DialoguePromise[];
  liesDetected: number;
  playerReputationInContext: Record<string, number>;
  canRefuse: boolean;
  willLie: boolean;
  willManipulate: boolean;
  exitConditions: string[];
}

export interface DialoguePromise {
  promiseId: string;
  content: string;
  deadline: number | null;
  status: "pending" | "fulfilled" | "broken";
  madeBy: string;
  madeTo: string;
}

export interface DialogueLine {
  speakerId: string;
  text: string;
  tone: string;
  animationIntent?: AnimationIntent;
  effects?: GameEffect[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
  effects?: GameEffect[];
}

export interface DialogueNode {
  id: string;
  speakerId: string;
  text: string;
  tone: string;
  animationIntent?: AnimationIntent;
  choices: DialogueChoice[];
}

export interface DialogueDefinition {
  dialogueId: string;
  npcId: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}
