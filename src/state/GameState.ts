/**
 * BLACK MILE - Serializable Game State Contract
 * Phase 1 Lock
 */

import type { NPCState } from '../npc/NPCState';

export interface GameState {
  version: number;
  gameTime: number;
  player: PlayerState;
  npcs: Record<string, NPCState>;
  missions: MissionRuntimeState;
  world: WorldState;
  rumors: RumorNetworkState;
  flags: Record<string, boolean | number | string>;
}

export interface PlayerState {
  id: 'player';
  locationId: string;
  knownFacts: string[];
  inventory: string[];
  reputation: Record<string, number>;
}

export interface WorldState {
  locations: Record<string, LocationState>;
  activeEvents: string[];
}

export interface LocationState {
  id: string;
  name: string;
  tags: string[];
}

export interface RumorNetworkState {
  activeRumors: Rumor[];
}

export interface Rumor {
  id: string;
  content: string;
  originEventId: string;
  currentConfidence: number;
  mutationHistory: string[];
  knownBy: string[];
}

export interface MissionRuntimeState {
  active: string[];
  completed: string[];
  failed: string[];
  objectiveProgress: Record<string, Record<string, boolean>>;
}

export const CURRENT_GAME_STATE_VERSION = 1;
