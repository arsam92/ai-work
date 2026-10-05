import { describe, expect, it } from "vitest";
import { EventBus } from "../src/core/EventBus";
import { createInitialGameState, type GameState } from "../src/state/GameState";
import { GameStore } from "../src/state/GameStore";
import {
  DialogueSystem,
  readDialogueLog,
  DIALOGUE_LOG_FLAG_KEY,
  type DialoguePresenter
} from "../src/dialogue/DialogueSystem";
import type { DialogueDefinition } from "../src/dialogue/DialogueState";

class NullPresenter implements DialoguePresenter {
  show(): void {}
  hide(): void {}
}

function makeDefinition(): DialogueDefinition {
  return {
    dialogueId: "persist-test",
    npcId: "june",
    startNodeId: "start",
    nodes: {
      start: {
        id: "start",
        speakerId: "june",
        text: "Back again?",
        tone: "guarded",
        choices: [{ id: "talk", text: "I need to talk.", nextNodeId: "end", effects: [] }]
      },
      end: {
        id: "end",
        speakerId: "june",
        text: "Then talk.",
        tone: "quiet",
        choices: [{ id: "bye", text: "Goodbye.", nextNodeId: null, effects: [] }]
      }
    }
  };
}

function runConversation(store: GameStore): void {
  const bus = new EventBus();
  const dialogue = new DialogueSystem(store, bus, new NullPresenter());
  dialogue.start(makeDefinition());
  dialogue.choose("talk");
  dialogue.choose("bye");
}

describe("dialogue history persistence", () => {
  it("survives JSON stringify/parse", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    runConversation(store);

    const before = readDialogueLog(store.getState());
    const file = JSON.stringify({
      meta: { version: 1, timestamp: 0, playTime: 0, slotName: "autosave" },
      state: store.getState()
    });
    const restoredState = (JSON.parse(file) as { state: GameState }).state;

    expect(readDialogueLog(restoredState)).toEqual(before);
  });

  it("survives GameStore.replace", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    runConversation(store);

    const snapshot = JSON.parse(JSON.stringify(store.getState())) as GameState;
    const fresh = new GameStore(createInitialGameState(), bus);
    fresh.replace(snapshot);

    expect(readDialogueLog(fresh.getState())).toEqual(readDialogueLog(snapshot));
  });

  it("can append after restore", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    runConversation(store);

    const snapshot = JSON.parse(JSON.stringify(store.getState())) as GameState;
    const restored = new GameStore(snapshot, bus);
    const countBefore = readDialogueLog(restored.getState()).length;

    runConversation(restored);

    expect(readDialogueLog(restored.getState()).length).toBeGreaterThan(countBefore);
  });

  it("tolerates saves without a dialogue log", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    expect(DIALOGUE_LOG_FLAG_KEY in store.getState().flags).toBe(false);
    expect(readDialogueLog(store.getState())).toEqual([]);
    expect(() => runConversation(store)).not.toThrow();
  });

  it("recovers from corrupted log JSON", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    store.update((state) => {
      state.flags[DIALOGUE_LOG_FLAG_KEY] = "{{{not-json";
    });

    expect(() => runConversation(store)).not.toThrow();
    expect(readDialogueLog(store.getState()).length).toBeGreaterThan(0);
  });
});
