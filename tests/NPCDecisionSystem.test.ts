import { describe, expect, it } from "vitest";
import { decideNPCAction, decideSocialRequest } from "../src/npc/NPCDecisionSystem";
import type { NPCState } from "../src/npc/NPCState";

function makeNPC(overrides: Partial<NPCState> = {}): NPCState {
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
    lastUpdated: 0,
    ...overrides
  };
}

function relation(dims: Partial<NPCState["relationships"]["player"]["dimensions"]>): NPCState["relationships"] {
  return {
    player: {
      targetId: "player",
      dimensions: { trust: 0, fear: 0, respect: 0, anger: 0, loyalty: 0, affection: 0, suspicion: 0, ...dims },
      historySummary: "",
      lastSignificantEvent: null,
      relationshipType: "neutral"
    }
  };
}

describe("decideSocialRequest", () => {
  it("declines when immediate safety is at risk", () => {
    const decision = decideSocialRequest(makeNPC({ relationships: relation({ fear: 0.9 }) }), {
      request: "help", destination: "garage", timeCost: 0.1, privacy: 0.2, danger: 0, urgency: 0.5, socialPressure: 0.5
    });
    expect(decision.action).toBe("decline");
    expect(decision.reason).toBe("immediate_safety_risk");
  });

  it("asks why when suspicion is high and the request is private", () => {
    const decision = decideSocialRequest(makeNPC({ relationships: relation({ suspicion: 0.75 }) }), {
      request: "help", destination: "garage", timeCost: 0.1, privacy: 0.6, danger: 0, urgency: 0.5, socialPressure: 0.5
    });
    expect(decision.action).toBe("ask_why");
  });

  it("counteroffers when a high-priority goal conflicts with the request", () => {
    const decision = decideSocialRequest(makeNPC({
      goals: [{ goalId: "g1", description: "Keep the garage open.", priority: 0.9, deadline: null, status: "active" }]
    }), {
      request: "help", destination: "yard", timeCost: 0.3, privacy: 0.3, danger: 0, urgency: 0.25, socialPressure: 0.5
    });
    expect(decision.action).toBe("counteroffer");
  });

  it("accepts when relationship value overcomes cost", () => {
    const decision = decideSocialRequest(makeNPC({ relationships: relation({ trust: 0.5, affection: 1, loyalty: 1 }) }), {
      request: "watch_garage", destination: "garage", timeCost: 0.1, privacy: 0.2, danger: 0, urgency: 0.8, socialPressure: 1
    });
    expect(decision.action).toBe("accept");
  });

  it("declines when trust is insufficient", () => {
    const decision = decideSocialRequest(makeNPC(), {
      request: "help", destination: "unknown", timeCost: 0.25, privacy: 0.5, danger: 0, urgency: 0.25, socialPressure: 0.5
    });
    expect(decision.action).toBe("decline");
  });

  it("is deterministic", () => {
    const npc = makeNPC({ relationships: relation({ trust: 0.5, affection: 1, loyalty: 1 }) });
    const context = { request: "x", destination: "y", timeCost: 0.1, privacy: 0.2, danger: 0, urgency: 0.8, socialPressure: 1 };
    expect(decideSocialRequest(npc, context)).toEqual(decideSocialRequest(npc, context));
  });
});

describe("decideNPCAction", () => {
  it("calls for help at extreme fear", () => {
    const npc = makeNPC({ relationships: relation({ fear: 0.9 }) });
    expect(decideNPCAction(npc, { playerVisible: true, playerDistance: 2, immediateDanger: 0, goalPressure: 0 }).action).toBe("call_for_help");
  });

  it("avoids up close and leaves at range when afraid", () => {
    const npc = makeNPC();
    expect(decideNPCAction(npc, { playerVisible: true, playerDistance: 2, immediateDanger: 0.7, goalPressure: 0 }).action).toBe("avoid");
    expect(decideNPCAction(npc, { playerVisible: true, playerDistance: 6, immediateDanger: 0.7, goalPressure: 0 }).action).toBe("leave");
  });

  it("approaches a trusted player", () => {
    const npc = makeNPC({ relationships: relation({ trust: 0.6 }) });
    expect(decideNPCAction(npc, { playerVisible: true, playerDistance: 3, immediateDanger: 0, goalPressure: 0 }).action).toBe("approach");
  });

  it("investigates under high goal pressure", () => {
    expect(decideNPCAction(makeNPC(), { playerVisible: false, playerDistance: 10, immediateDanger: 0, goalPressure: 0.8 }).action).toBe("investigate");
  });

  it("falls back to routine", () => {
    expect(decideNPCAction(makeNPC(), { playerVisible: false, playerDistance: 10, immediateDanger: 0, goalPressure: 0.2 }).action).toBe("work");
  });

  it("is deterministic", () => {
    const npc = makeNPC({ relationships: relation({ trust: 0.6 }) });
    const context = { playerVisible: true, playerDistance: 3, immediateDanger: 0, goalPressure: 0 };
    expect(decideNPCAction(npc, context)).toEqual(decideNPCAction(npc, context));
  });
});
