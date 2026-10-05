import { Events, type EventBus } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { GameEffect } from "../core/Effects";
import type { NPCState } from "../npc/NPCState";
import { decideSocialRequest, type SocialRequestDecision } from "../npc/NPCDecisionSystem";
import type { DialogueDefinition, DialogueState } from "./DialogueState";

export interface DialoguePresenter {
  show(title: string, text: string, choices: { id: string; text: string }[]): void;
  hide(): void;
}

export interface NPCDialogueProvider {
  getNPC(npcId: string): NPCState | null;
}

export interface DialogueHistoryEntry {
  conversationId: string;
  nodeId: string;
  speakerId: string;
  text: string;
  gameTime: number;
}

export class DialogueSystem {
  private active: DialogueState | null = null;
  private definition: DialogueDefinition | null = null;
  private currentNodeId: string | null = null;
  private readonly sessionHistory: DialogueHistoryEntry[] = [];
  private static readonly MAX_SESSION_HISTORY = 100;

  constructor(
    private readonly store: GameStore,
    private readonly bus: EventBus,
    private readonly presenter: DialoguePresenter,
    private readonly npcProvider?: NPCDialogueProvider
  ) {}

  start(definition: DialogueDefinition): void {
    this.definition = definition;
    this.currentNodeId = definition.startNodeId;
    this.sessionHistory.length = 0;
    this.active = {
      conversationId: definition.dialogueId,
      participants: ["player", definition.npcId],
      locationId: this.store.getState().player.locationId,
      startTime: this.store.getState().gameTime,
      moodAtStart: {},
      activeTopics: [],
      promises: [],
      liesDetected: 0,
      playerReputationInContext: {},
      canRefuse: true,
      willLie: false,
      willManipulate: false,
      exitConditions: []
    };
    this.bus.emit(Events.DIALOGUE_STARTED, this.active);
    this.showCurrentNode();
  }

  choose(choiceId: string): void {
    if (!this.definition || !this.currentNodeId || !this.active) return;

    const node = this.definition.nodes[this.currentNodeId];
    if (!node) {
      this.end();
      return;
    }

    const choice = node.choices.find((item) => item.id === choiceId);
    if (!choice) return;

    let nextNodeId = choice.nextNodeId;

    for (const effect of choice.effects ?? []) {
      const socialDecision = this.resolveSocialRequest(effect);
      if (socialDecision) {
        nextNodeId = this.selectSocialOutcome(effect, socialDecision, nextNodeId);
        this.emitRelationshipOutcome(effect, socialDecision);
        this.bus.emit(Events.DIALOGUE_EFFECT, {
          npcId: this.definition.npcId,
          effect,
          decision: socialDecision
        });
        continue;
      }

      this.applyLocalEffect(effect);
      this.bus.emit(Events.DIALOGUE_EFFECT, {
        npcId: this.definition.npcId,
        effect
      });
    }

    if (nextNodeId === null) {
      this.end();
      return;
    }

    this.currentNodeId = nextNodeId;
    this.showCurrentNode();
  }

  end(): void {
    if (!this.active) return;
    const finished = this.active;
    this.active = null;
    this.definition = null;
    this.currentNodeId = null;
    this.presenter.hide();
    this.bus.emit(Events.DIALOGUE_ENDED, finished);
  }

  isActive(): boolean {
    return this.active !== null;
  }

  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  getSessionHistory(): DialogueHistoryEntry[] {
    return structuredClone(this.sessionHistory);
  }

  private applyLocalEffect(effect: GameEffect): void {
    if (effect.type !== "set_flag") return;
    this.store.update((state) => {
      state.flags[effect.payload.key] = effect.payload.value;
    });
  }

  private showCurrentNode(): void {
    if (!this.definition || !this.currentNodeId) return;
    const node = this.definition.nodes[this.currentNodeId];
    if (!node) {
      this.end();
      return;
    }

    this.sessionHistory.push({
      conversationId: this.definition.dialogueId,
      nodeId: node.id,
      speakerId: node.speakerId,
      text: node.text,
      gameTime: this.store.getState().gameTime
    });
    if (this.sessionHistory.length > DialogueSystem.MAX_SESSION_HISTORY) {
      this.sessionHistory.shift();
    }

    this.presenter.show(
      node.speakerId === "player" ? "YOU" : node.speakerId,
      node.text,
      node.choices.map((choice) => ({ id: choice.id, text: choice.text }))
    );
  }

  private resolveSocialRequest(effect: GameEffect): SocialRequestDecision | null {
    if (effect.type !== "custom") return null;
    if (effect.payload.action !== "npc_social_request") return null;
    if (!this.definition || !this.npcProvider) {
      return {
        action: "decline",
        reason: "no_npc_decision_provider",
        targetId: "player",
        confidence: 0.5,
        animationIntent: "avoid_eye_contact"
      };
    }

    const npc = this.npcProvider.getNPC(this.definition.npcId);
    if (!npc) {
      return {
        action: "decline",
        reason: "npc_unavailable",
        targetId: "player",
        confidence: 0.99,
        animationIntent: "avoid_eye_contact"
      };
    }

    const number = (key: string, fallback: number): number => {
      const value = effect.payload[key];
      return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    };
    const stringValue = (key: string, fallback: string): string => {
      const value = effect.payload[key];
      return typeof value === "string" ? value : fallback;
    };

    return decideSocialRequest(npc, {
      request: stringValue("request", "social_request"),
      destination: stringValue("destination", "unknown"),
      timeCost: number("timeCost", 0.25),
      privacy: number("privacy", 0.5),
      danger: number("danger", 0),
      urgency: number("urgency", 0.25),
      socialPressure: number("socialPressure", 0.5)
    });
  }

  private selectSocialOutcome(
    effect: GameEffect,
    decision: SocialRequestDecision,
    fallback: string | null
  ): string | null {
    if (effect.type !== "custom") return fallback;
    const outcomes = effect.payload.outcomes;
    if (!outcomes || typeof outcomes !== "object") return fallback;
    const next = (outcomes as Record<string, unknown>)[decision.action];
    return typeof next === "string" ? next : fallback;
  }

  private emitRelationshipOutcome(effect: GameEffect, decision: SocialRequestDecision): void {
    if (effect.type !== "custom") return;
    const map = effect.payload.relationshipDeltaByOutcome;
    if (!map || typeof map !== "object") return;
    const delta = (map as Record<string, unknown>)[decision.action];
    if (!delta || typeof delta !== "object") return;

    const safeDelta: Record<string, unknown> = {};
    for (const key of ["trust", "fear", "respect", "anger", "loyalty", "affection", "suspicion"]) {
      const value = (delta as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) safeDelta[key] = value;
    }

    if (Object.keys(safeDelta).length === 0) return;
    const relationshipEffect: GameEffect = {
      type: "change_relationship",
      payload: {
        targetId: "player",
        delta: safeDelta
      }
    };
    this.bus.emit(Events.DIALOGUE_EFFECT, {
      npcId: this.definition?.npcId ?? "unknown",
      effect: relationshipEffect,
      decision
    });
  }
}
