/**
 * BLACK MILE - Dialogue State Schema
 * Phase 1 Lock
 */

import type { NPCState } from '../npc/NPCState';
import type { MissionEffect } from '../missions/MissionSchema';

export interface DialogueState {
  conversationId: string;
  participants: string[];
  locationId: string;
  startTime: number;
  moodAtStart: Record<string, NPCState['currentMood']>;
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
  status: 'pending' | 'fulfilled' | 'broken';
  madeBy: string;
  madeTo: string;
}

export interface DialogueLine {
  speakerId: string;
  text: string;
  tone: string;
  animationIntent?: string;
  effects?: MissionEffect[];
}
