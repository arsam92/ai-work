import type { GameState } from "../state/GameState";

export interface SaveFile {
  meta: { version: number; timestamp: number; playTime: number; slotName: string };
  state: GameState;
}

export interface ISaveSystem {
  save(slot: string, state: GameState): Promise<void>;
  load(slot: string): Promise<GameState>;
  listSlots(): Promise<{ slot: string; meta: SaveFile["meta"] }[]>;
  migrate(oldState: unknown, fromVersion: number, toVersion: number): GameState;
}

export const CURRENT_SAVE_VERSION = 1;

export class BrowserSaveSystem implements ISaveSystem {
  private storage(): Storage {
    if (typeof localStorage === "undefined") throw new Error("Save system requires a browser localStorage.");
    return localStorage;
  }

  private key(slot: string): string { return `black-mile.save.${slot}`; }

  async save(slot: string, state: GameState): Promise<void> {
    if (!slot.trim()) throw new Error("Save slot is required.");
    if (state.version !== CURRENT_SAVE_VERSION) throw new Error(`Unsupported save version: ${state.version}`);
    const snapshot = structuredClone(state);
    const file: SaveFile = {
      meta: { version: CURRENT_SAVE_VERSION, timestamp: Date.now(), playTime: snapshot.gameTime, slotName: slot },
      state: snapshot
    };
    this.storage().setItem(this.key(slot), JSON.stringify(file));
  }

  async load(slot: string): Promise<GameState> {
    const raw = this.storage().getItem(this.key(slot));
    if (!raw) throw new Error(`Save slot "${slot}" does not exist.`);
    let parsed: SaveFile;
    try { parsed = JSON.parse(raw) as SaveFile; }
    catch { throw new Error("Save data is corrupted."); }
    return this.migrate(parsed.state, parsed.meta.version, CURRENT_SAVE_VERSION);
  }

  async listSlots(): Promise<{ slot: string; meta: SaveFile["meta"] }[]> {
    const storage = this.storage();
    const slots: { slot: string; meta: SaveFile["meta"] }[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key?.startsWith("black-mile.save.")) continue;
      try {
        const data = JSON.parse(storage.getItem(key) ?? "") as SaveFile;
        slots.push({ slot: key.slice("black-mile.save.".length), meta: data.meta });
      } catch { /* ignore broken slots in the listing */ }
    }
    return slots.sort((a, b) => b.meta.timestamp - a.meta.timestamp);
  }

  migrate(oldState: unknown, fromVersion: number, toVersion: number): GameState {
    if (fromVersion !== toVersion) throw new Error(`No migration from v${fromVersion} to v${toVersion}.`);
    if (!oldState || typeof oldState !== "object") throw new Error("Invalid save state.");
    return structuredClone(oldState as GameState);
  }
}