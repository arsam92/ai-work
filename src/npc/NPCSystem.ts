import type { EventBus } from "../core/EventBus";
import { Events } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { GameEffect } from "../core/Effects";
import type { NPCMemory, NPCState, Relationship } from "./NPCState";

export class NPCSystem {
  private readonly npcStates = new Map<string, NPCState>();

  constructor(private readonly store: GameStore, private readonly bus: EventBus) {
    this.bus.on<{ type: string; actors: string[]; location: string; payload?: Record<string, unknown> }>(Events.PLAYER_ACTION_OBSERVED, (event) => this.onPlayerAction(event));
    this.bus.on<{ npcId: string; effect: GameEffect }>("dialogue.effect", ({ npcId, effect }) => this.applyDialogueEffect(npcId, effect));
  }

  addNPC(state: NPCState): void {
    const copy = structuredClone(state);
    this.npcStates.set(copy.npcId, copy);
    this.syncNPC(copy);
  }

  getNPC(npcId: string): NPCState | null {
    const state = this.npcStates.get(npcId);
    return state ? structuredClone(state) : null;
  }

  recordMemory(npcId: string, memory: Omit<NPCMemory, "memoryId"> & { memoryId?: string }): void {
    const npc = this.npcStates.get(npcId);
    if (!npc) return;
    const entry: NPCMemory = { ...memory, memoryId: memory.memoryId ?? `${npcId}-${Date.now()}-${npc.memories.length}` };
    npc.memories.push(entry);
    if (npc.memories.length > 120) {
      npc.memories.sort((a, b) => (b.importance * b.confidence) - (a.importance * a.confidence));
      npc.memories.length = 120;
    }
    this.syncNPC(npc);
    this.bus.emit(Events.NPC_MEMORY_ADDED, { npcId, memory: structuredClone(entry) });
  }

  changeRelationship(npcId: string, targetId: string, delta: Partial<Relationship["dimensions"]>): void {
    const npc = this.npcStates.get(npcId);
    if (!npc) return;
    const relation = npc.relationships[targetId] ?? {
      targetId,
      dimensions: { trust: 0, fear: 0, respect: 0, anger: 0, loyalty: 0, affection: 0, suspicion: 0 },
      historySummary: "Relationship is developing.",
      lastSignificantEvent: null,
      relationshipType: "neutral"
    };
    for (const [key, value] of Object.entries(delta)) {
      if (typeof value !== "number") continue;
      const field = key as keyof Relationship["dimensions"];
      const current = relation.dimensions[field];
      const next = current + value;
      relation.dimensions[field] = ["trust", "respect", "loyalty", "affection"].includes(key)
        ? Math.max(-1, Math.min(1, next))
        : Math.max(0, Math.min(1, next));
    }
    relation.historySummary = this.summarizeRelationship(relation);
    npc.relationships[targetId] = relation;
    this.syncNPC(npc);
    this.bus.emit(Events.RELATIONSHIP_CHANGED, { npcId, targetId, relationship: structuredClone(relation) });
  }

  tick(seconds: number): void {
    for (const npc of this.npcStates.values()) {
      npc.lastUpdated += seconds;
      for (const memory of npc.memories) {
        if (memory.decay.type === "none") continue;
        memory.confidence = Math.max(memory.decay.minConfidence, memory.confidence - memory.decay.rate * (seconds / 3600));
      }
    }
    this.store.update((game) => {
      for (const [id, state] of this.npcStates) game.npcs[id] = structuredClone(state);
    });
  }

  private onPlayerAction(event: { type: string; actors: string[]; location: string; payload?: Record<string, unknown> }): void {
    for (const npc of this.npcStates.values()) {
      if (npc.routine.locationId !== event.location) continue;
      this.recordMemory(npc.npcId, {
        timestamp: this.store.getState().gameTime,
        eventType: event.type,
        subject: "player",
        description: typeof event.payload?.description === "string" ? event.payload.description : event.type,
        emotionalImpact: { emotion: "curiosity", intensity: 0.15 },
        confidence: 0.65,
        source: "direct_observation",
        importance: 0.35,
        relevanceTags: ["player", "observation"],
        decay: { type: "exponential", rate: 0.04, minConfidence: 0.15 },
        linkedMemories: []
      });
    }
  }

  private applyDialogueEffect(npcId: string, effect: GameEffect): void {
    if (effect.type === "change_relationship") {
      const targetId = String(effect.payload.targetId ?? "player");
      const delta = effect.payload.delta;
      if (delta && typeof delta === "object") this.changeRelationship(npcId, targetId, delta as Partial<Relationship["dimensions"]>);
    }
    if (effect.type === "add_memory") {
      const payload = effect.payload;
      this.recordMemory(npcId, {
        timestamp: this.store.getState().gameTime,
        eventType: String(payload.eventType ?? "DIALOGUE"),
        subject: String(payload.subject ?? "player"),
        description: String(payload.description ?? "Important conversation event"),
        emotionalImpact: { emotion: String(payload.emotion ?? "neutral"), intensity: Number(payload.intensity ?? 0.2) },
        confidence: Number(payload.confidence ?? 0.9),
        source: "conversation",
        importance: Number(payload.importance ?? 0.5),
        relevanceTags: Array.isArray(payload.relevanceTags) ? payload.relevanceTags.map(String) : ["dialogue"],
        decay: { type: "exponential", rate: 0.03, minConfidence: 0.2 },
        linkedMemories: []
      });
    }
  }

  private summarizeRelationship(relation: Relationship): string {
    const d = relation.dimensions;
    if (d.suspicion > 0.7) return "Highly suspicious.";
    if (d.trust > 0.65 && d.affection > 0.4) return "Strong trust and affection.";
    if (d.fear > 0.7) return "Feels unsafe around this person.";
    if (d.respect > 0.6) return "Strong respect.";
    if (d.anger > 0.65) return "Significant anger.";
    return "Mixed or developing relationship.";
  }

  private syncNPC(npc: NPCState): void {
    this.store.update((game) => { game.npcs[npc.npcId] = structuredClone(npc); });
  }
}