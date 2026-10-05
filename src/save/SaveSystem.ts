/**
 * BLACK MILE - Save / Load Contract + Versioning
 * Phase 1 Lock
 */

import type { GameState } from '../state/GameState';

export interface SaveFile {
  meta: {
    version: number;
    timestamp: number;
    playTime: number;
    slotName: string;
  };
  state: GameState;
}

export interface ISaveSystem {
  save(slot: string, state: GameState): Promise<void>;
  load(slot: string): Promise<GameState>;
  listSlots(): Promise<{ slot: string; meta: SaveFile['meta'] }[]>;
  migrate(oldState: any, fromVersion: number, toVersion: number): GameState;
}

export const CURRENT_SAVE_VERSION = 1;
