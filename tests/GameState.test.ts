import { describe, expect, it } from "vitest";
import { createInitialGameState, CURRENT_GAME_STATE_VERSION } from "../src/state/GameState";

describe("GameState", () => {
  it("creates a valid version 1 state", () => {
    const state = createInitialGameState();
    expect(state.version).toBe(CURRENT_GAME_STATE_VERSION);
    expect(state.player.id).toBe("player");
    expect(state.missions.active).toEqual([]);
    expect(state.npcs).toEqual({});
    expect(state.rumors.activeRumors).toEqual([]);
  });

  it("survives JSON serialization and deserialization", () => {
    const state = createInitialGameState();
    state.flags.example = "preserved";
    state.player.knownFacts.push("black-mile-is-wrong");

    const roundTrip = JSON.parse(JSON.stringify(state));
    expect(roundTrip).toEqual(state);
  });
});
