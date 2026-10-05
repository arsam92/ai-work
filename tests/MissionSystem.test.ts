import { describe, expect, it } from "vitest";
import { EventBus } from "../src/core/EventBus";
import { GameStore } from "../src/state/GameStore";
import { createInitialGameState } from "../src/state/GameState";
import { MissionSystem } from "../src/missions/MissionSystem";

describe("MissionSystem", () => {
  it("starts and completes a talk-to mission", () => {
    const bus = new EventBus();
    const store = new GameStore(createInitialGameState(), bus);
    const missions = new MissionSystem(store, bus);

    missions.register({
      missionId: "test-mission",
      act: 1,
      title: "Test",
      description: "Test",
      prerequisites: {},
      objectives: [{
        objectiveId: "talk",
        type: "talk_to",
        target: "june",
        description: "Talk",
        optional: false
      }],
      onComplete: [{
        type: "set_flag",
        payload: { key: "test_complete", value: true }
      }]
    });

    expect(missions.start("test-mission")).toBe(true);
    bus.emit("dialogue.ended", { participants: ["player", "june"] });

    expect(store.getState().missions.completed).toContain("test-mission");
    expect(store.getState().flags.test_complete).toBe(true);
  });
});
