import { describe, expect, it } from "vitest";
import { EventBus, Events } from "../src/core/EventBus";
import { createInitialGameState } from "../src/state/GameState";
import { GameStore } from "../src/state/GameStore";
import { NPCSystem } from "../src/npc/NPCSystem";

function makeNPC() {
  return {
    npcId: "test",
    name: "Test",
    archetype: "civilian",
    personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5, traits: [] },
    currentMood: { primary: "calm", intensity: 0.2, decayRate: 0.1 },
    goals: [],
    fears: [],
    secrets: [],
    memories: [],
    relationships: {},
    routine: { currentActivity: "idle", locationId: "black-mile", schedule: {} },
    trustThreshold: 0.5,
    suspicionThreshold: 0.5,
    intelligenceLevel: 0.5,
    lastUpdated: 0
  };
}

describe("NPCSystem", () => {
  it("records memory and clamps relationships", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    const npcs = new NPCSystem(store, bus);
    npcs.addNPC(makeNPC());

    npcs.changeRelationship("test", "player", { trust: 2, suspicion: -2 });
    npcs.recordMemory("test", {
      timestamp: 1,
      eventType: "PLAYER_HELPED",
      subject: "player",
      description: "Player helped.",
      emotionalImpact: { emotion: "gratitude", intensity: 0.7 },
      confidence: 1,
      source: "direct_observation",
      importance: 0.8,
      relevanceTags: ["player"],
      decay: { type: "none", rate: 0, minConfidence: 1 },
      linkedMemories: []
    });

    const npc = store.getState().npcs.test;
    expect(npc.relationships.player.dimensions.trust).toBe(1);
    expect(npc.relationships.player.dimensions.suspicion).toBe(0);
    expect(npc.memories).toHaveLength(1);
  });

  it("rehydrates its cache after load.completed", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    const npcs = new NPCSystem(store, bus);
    npcs.addNPC(makeNPC());

    const loaded = structuredClone(store.getState());
    loaded.npcs.test.relationships = {
      player: {
        targetId: "player",
        dimensions: { trust: -0.4, fear: 0, respect: 0, anger: 0.6, loyalty: 0, affection: 0, suspicion: 0.8 },
        historySummary: "Loaded state.",
        lastSignificantEvent: "load-test",
        relationshipType: "friend"
      }
    };
    store.replace(loaded);
    bus.emit(Events.LOAD_COMPLETED, { slot: "autosave" });

    npcs.tick(1);

    const npc = store.getState().npcs.test;
    expect(npc.relationships.player.dimensions.trust).toBe(-0.4);
    expect(npc.relationships.player.dimensions.suspicion).toBe(0.8);
    expect(npc.relationships.player.historySummary).toBe("Loaded state.");
  });
});
