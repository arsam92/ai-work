import { describe, expect, it } from "vitest";
import { EventBus } from "../src/core/EventBus";
import { createInitialGameState } from "../src/state/GameState";
import { GameStore } from "../src/state/GameStore";

describe("GameStore", () => {
  it("clones initial state and publishes updates", () => {
    const bus = new EventBus();
    const events: unknown[] = [];
    bus.on("state.changed", (state) => events.push(state));

    const original = createInitialGameState();
    const store = new GameStore(original, bus);

    store.update((state) => {
      state.player.knownFacts.push("test-fact");
    });

    expect(store.getState().player.knownFacts).toEqual(["test-fact"]);
    expect(original.player.knownFacts).toEqual([]);
    expect(events).toHaveLength(1);
  });
});
