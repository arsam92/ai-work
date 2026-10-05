import { describe, expect, it } from "vitest";
import { EventBus, Events } from "../src/core/EventBus";
import { createInitialGameState } from "../src/state/GameState";
import { GameStore } from "../src/state/GameStore";
import { NPCSystem } from "../src/npc/NPCSystem";
import type { NPCState } from "../src/npc/NPCState";
import {
  DialogueSystem,
  flagEntryResolver,
  readDialogueLog,
  DIALOGUE_LOG_FLAG_KEY,
  DIALOGUE_LOG_MAX_ENTRIES,
  type DialoguePresenter,
  type DialogueShowMeta
} from "../src/dialogue/DialogueSystem";
import type { DialogueDefinition } from "../src/dialogue/DialogueState";

interface ShownCall {
  title: string;
  text: string;
  choices: { id: string; text: string }[];
  meta?: DialogueShowMeta;
}

class FakePresenter implements DialoguePresenter {
  readonly shown: ShownCall[] = [];
  hiddenCount = 0;

  show(title: string, text: string, choices: { id: string; text: string }[], meta?: DialogueShowMeta): void {
    this.shown.push({ title, text, choices, meta });
  }

  hide(): void {
    this.hiddenCount += 1;
  }
}

function makeNPC(overrides: Partial<NPCState> = {}): NPCState {
  return {
    npcId: "test",
    name: "Test",
    archetype: "civilian",
    personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5, traits: [] },
    currentMood: { primary: "anxious", intensity: 0.46, decayRate: 0.08 },
    goals: [],
    fears: [],
    secrets: [],
    memories: [],
    relationships: {},
    routine: { currentActivity: "idle", locationId: "garage", schedule: {} },
    trustThreshold: 0.5,
    suspicionThreshold: 0.5,
    intelligenceLevel: 0.5,
    lastUpdated: 0,
    ...overrides
  };
}

function makeDefinition(): DialogueDefinition {
  return {
    dialogueId: "test-dialogue",
    npcId: "test",
    startNodeId: "start",
    nodes: {
      start: {
        id: "start",
        speakerId: "test",
        text: "Hello, Elias.",
        tone: "guarded",
        animationIntent: "nervous",
        choices: [
          {
            id: "calm",
            text: "I need to talk.",
            nextNodeId: "second",
            effects: [{ type: "set_flag", payload: { key: "test_flag", value: true } }]
          },
          {
            id: "pressure",
            text: "What are you hiding?",
            nextNodeId: "second",
            effects: [{ type: "change_relationship", payload: { targetId: "player", delta: { suspicion: 0.2 } } }]
          }
        ]
      },
      second: {
        id: "second",
        speakerId: "test",
        text: "Then talk.",
        tone: "quiet",
        choices: [{ id: "bye", text: "Goodbye.", nextNodeId: null, effects: [] }]
      }
    }
  };
}

function setup(npcOverrides: Partial<NPCState> = {}) {
  const bus = new EventBus();
  const store = new GameStore(createInitialGameState(), bus);
  const npcSystem = new NPCSystem(store, bus);
  npcSystem.addNPC(makeNPC(npcOverrides));
  const presenter = new FakePresenter();
  const dialogue = new DialogueSystem(store, bus, presenter, npcSystem);
  return { bus, store, npcSystem, presenter, dialogue };
}

describe("DialogueSystem", () => {
  it("shows the entry node and populates NPC context", () => {
    const { dialogue, presenter, npcSystem } = setup();
    dialogue.start(makeDefinition());

    expect(presenter.shown[0].text).toBe("Hello, Elias.");
    expect(presenter.shown[0].meta?.animationIntent).toBe("nervous");
    expect(dialogue.getActiveDialogueState()?.moodAtStart.test).toEqual(
      npcSystem.getNPC("test")?.currentMood
    );
  });

  it("applies set_flag effects to the store", () => {
    const { dialogue, store } = setup();
    dialogue.start(makeDefinition());
    dialogue.choose("calm");
    expect(store.getState().flags.test_flag).toBe(true);
  });

  it("routes relationship changes through NPCSystem", () => {
    const { dialogue, npcSystem } = setup();
    dialogue.start(makeDefinition());
    dialogue.choose("pressure");
    expect(npcSystem.getNPC("test")?.relationships.player.dimensions.suspicion).toBe(0.2);
  });

  it("emits dialogue.effect and player.action.observed", () => {
    const { bus, dialogue } = setup();
    const effects: unknown[] = [];
    const observed: unknown[] = [];
    bus.on(Events.DIALOGUE_EFFECT, (payload) => effects.push(payload));
    bus.on(Events.PLAYER_ACTION_OBSERVED, (payload) => observed.push(payload));

    dialogue.start(makeDefinition());
    dialogue.choose("calm");

    expect(effects.length).toBeGreaterThan(0);
    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      type: "DIALOGUE_CHOICE",
      observedBy: ["test"]
    });
  });

  it("records a dialogue choice as an NPC memory even when routine location differs", () => {
    const { dialogue, npcSystem } = setup();
    dialogue.start(makeDefinition());
    dialogue.choose("calm");

    const memories = npcSystem.getNPC("test")?.memories ?? [];
    expect(memories.some((memory) => memory.eventType === "DIALOGUE_CHOICE")).toBe(true);
    expect(memories.find((memory) => memory.eventType === "DIALOGUE_CHOICE")?.source).toBe("conversation");
  });

  it("creates a pending DialoguePromise", () => {
    const { dialogue } = setup();
    const definition = makeDefinition();
    definition.nodes.start.choices.push({
      id: "promise",
      text: "I'll keep you out of this.",
      nextNodeId: "second",
      effects: [{
        type: "custom",
        payload: { action: "npc_promise", promiseId: "p1", content: "Keep June out of it." }
      }]
    });

    dialogue.start(definition);
    dialogue.choose("promise");

    expect(dialogue.getActiveDialogueState()?.promises[0]).toMatchObject({
      promiseId: "p1",
      status: "pending",
      madeBy: "player",
      madeTo: "test"
    });
  });

  it("uses a valid entry resolver and falls back for an invalid node", () => {
    const { bus, store, npcSystem } = setup();
    const definition = makeDefinition();

    const redirectedPresenter = new FakePresenter();
    const redirected = new DialogueSystem(store, bus, redirectedPresenter, npcSystem, () => "second");
    redirected.start(definition);
    expect(redirectedPresenter.shown[0].text).toBe("Then talk.");

    const fallbackPresenter = new FakePresenter();
    const fallback = new DialogueSystem(store, bus, fallbackPresenter, npcSystem, () => "missing");
    fallback.start(definition);
    expect(fallbackPresenter.shown[0].text).toBe("Hello, Elias.");
  });

  it("writes a capped persistent log containing NPC lines and player choices", () => {
    const { dialogue, store } = setup();
    dialogue.start(makeDefinition());
    dialogue.choose("calm");
    dialogue.choose("bye");

    const log = readDialogueLog(store.getState());
    expect(log).toHaveLength(3);
    expect(log[0]).toMatchObject({ convo: "test-dialogue", npc: "test", by: "test", node: "start" });
    expect(log[1]).toMatchObject({ by: "player", choice: "calm", text: "I need to talk." });
    expect(typeof store.getState().flags[DIALOGUE_LOG_FLAG_KEY]).toBe("string");
  });

  it("caps persistent history at the configured maximum", () => {
    const { dialogue, store } = setup();
    const definition: DialogueDefinition = {
      dialogueId: "loop",
      npcId: "test",
      startNodeId: "a",
      nodes: {
        a: { id: "a", speakerId: "test", text: "A.", tone: "neutral", choices: [{ id: "go", text: "Go.", nextNodeId: "b", effects: [] }] },
        b: { id: "b", speakerId: "test", text: "B.", tone: "neutral", choices: [{ id: "back", text: "Back.", nextNodeId: "a", effects: [] }] }
      }
    };
    dialogue.start(definition);
    for (let i = 0; i < 35; i += 1) dialogue.choose(i % 2 === 0 ? "go" : "back");
    expect(readDialogueLog(store.getState())).toHaveLength(DIALOGUE_LOG_MAX_ENTRIES);
  });

  it("caps session history at 100 entries", () => {
    const { dialogue } = setup();
    const definition: DialogueDefinition = {
      dialogueId: "loop",
      npcId: "test",
      startNodeId: "a",
      nodes: {
        a: { id: "a", speakerId: "test", text: "A.", tone: "neutral", choices: [{ id: "go", text: "Go.", nextNodeId: "b", effects: [] }] },
        b: { id: "b", speakerId: "test", text: "B.", tone: "neutral", choices: [{ id: "back", text: "Back.", nextNodeId: "a", effects: [] }] }
      }
    };
    dialogue.start(definition);
    for (let i = 0; i < 60; i += 1) dialogue.choose(i % 2 === 0 ? "go" : "back");
    const history = dialogue.getSessionHistory();
    expect(history).toHaveLength(100);
    expect(history.some((entry) => entry.speakerId === "player")).toBe(true);
  });

  it("ends cleanly and notifies listeners", () => {
    const { bus, dialogue, presenter } = setup();
    const ended: unknown[] = [];
    bus.on(Events.DIALOGUE_ENDED, (payload) => ended.push(payload));

    dialogue.start(makeDefinition());
    dialogue.choose("calm");
    dialogue.choose("bye");

    expect(dialogue.isActive()).toBe(false);
    expect(presenter.hiddenCount).toBe(1);
    expect(ended).toHaveLength(1);
  });

  it("ignores unknown choice ids", () => {
    const { dialogue, presenter } = setup();
    dialogue.start(makeDefinition());
    dialogue.choose("missing");
    expect(dialogue.getCurrentNodeId()).toBe("start");
    expect(presenter.shown).toHaveLength(1);
  });
});

describe("flagEntryResolver", () => {
  it("returns a valid flagged node", () => {
    const state = createInitialGameState();
    state.flags["dialogue.entry.test-dialogue"] = "second";
    expect(flagEntryResolver({ npc: null, state, definition: makeDefinition() })).toBe("second");
  });

  it("returns null when the flag is absent or invalid", () => {
    const state = createInitialGameState();
    expect(flagEntryResolver({ npc: null, state, definition: makeDefinition() })).toBeNull();
    state.flags["dialogue.entry.test-dialogue"] = 42;
    expect(flagEntryResolver({ npc: null, state, definition: makeDefinition() })).toBeNull();
  });
});
