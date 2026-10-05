import type { NPCState } from "../npc/NPCState";
import type { MissionRuntimeState } from "../missions/MissionSchema";

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
  id: "player";
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

export const CURRENT_GAME_STATE_VERSION = 1;

export function createInitialGameState(): GameState {
  return {
    version: CURRENT_GAME_STATE_VERSION,
    gameTime: 20 * 60,
    player: {
      id: "player",
      locationId: "black-mile",
      knownFacts: [],
      inventory: [],
      reputation: {}
    },
    npcs: {},
    missions: {
      active: [],
      completed: [],
      failed: [],
      objectiveProgress: {}
    },
    world: {
      locations: {
        "black-mile": {
          id: "black-mile",
          name: "Black Mile",
          tags: ["industrial", "night", "starting-area"]
        },
        garage: {
          id: "garage",
          name: "June's Garage",
          tags: ["safehouse", "mechanic"]
        }
      },
      activeEvents: []
    },
    rumors: {
      activeRumors: []
    },
    flags: {
      story_intro_started: true
    }
  };
}
