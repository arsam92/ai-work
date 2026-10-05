import { Events, type EventBus } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { AnimationIntent } from "../animation/AnimationController";
import type { GameState } from "../state/GameState";
import type { GameEffect } from "../core/Effects";
import type { NPCState } from "../npc/NPCState";
import { decideSocialRequest, type SocialRequestContext, type SocialRequestDecision } from "../npc/NPCDecisionSystem";
import type { DialogueChoice, DialogueDefinition, DialoguePromise, DialogueState } from "./DialogueState";

export interface DialogueShowMeta {
  animationIntent?: AnimationIntent;
}

export interface DialoguePresenter {
  show(title: string, text: string, choices: { id: string; text: string }[], meta?: DialogueShowMeta): void;
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
  choiceId?: string;
}

export interface DialogueEntryContext {
  npc: NPCState | null;
  state: GameState;
  definition: DialogueDefinition;
}

export type DialogueEntryResolver = (context: DialogueEntryContext) => string | null;

export function flagEntryResolver(context: DialogueEntryContext): string | null {
  const value = context.state.flags[`dialogue.entry.${context.definition.dialogueId}`];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export const DIALOGUE_LOG_FLAG_KEY = "dialogue.log.v1";
export const DIALOGUE_LOG_MAX_ENTRIES = 60;
const DIALOGUE_LOG_EXCERPT_MAX = 160;
const SOCIAL_REQUEST_ACTION = "npc_social_request";
const PROMISE_ACTION = "npc_promise";

export interface PersistentDialogueEntry {
  t: number;
  convo: string;
  npc: string;
  by: string;
  node?: string;
  choice?: string;
  text: string;
}

function isPersistentDialogueEntry(value: unknown): value is PersistentDialogueEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.t === "number" &&
    Number.isFinite(entry.t) &&
    typeof entry.convo === "string" &&
    typeof entry.npc === "string" &&
    typeof entry.by === "string" &&
    typeof entry.text === "string"
  );
}

export function readDialogueLog(state: GameState): PersistentDialogueEntry[] {
  const raw = state.flags[DIALOGUE_LOG_FLAG_KEY];
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPersistentDialogueEntry) : [];
  } catch {
    return [];
  }
}

export class DialogueSystem {
  private active: DialogueState | null = null;
  private definition: DialogueDefinition | null = null;
  private currentNodeId: string | null = null;
  private pendingDecisionIntent: AnimationIntent | null = null;
  private readonly sessionHistory: DialogueHistoryEntry[] = [];
  private static readonly MAX_SESSION_HISTORY = 100;

  constructor(
    private readonly store: GameStore,
    private readonly bus: EventBus,
    private readonly presenter: DialoguePresenter,
    private readonly npcProvider?: NPCDialogueProvider,
    private readonly entryResolver?: DialogueEntryResolver
  ) {}

  start(definition: DialogueDefinition): void {
    this.definition = definition;
    this.currentNodeId = this.selectEntryNode(definition);
    this.sessionHistory.length = 0;
    this.pendingDecisionIntent = null;

    const npc = this.npcProvider?.getNPC(definition.npcId) ?? null;
    const game = this.store.getState();
    this.active = {
      conversationId: definition.dialogueId,
      participants: ["player", definition.npcId],
      locationId: game.player.locationId,
      startTime: game.gameTime,
      moodAtStart: npc ? { [npc.npcId]: structuredClone(npc.currentMood) } : {},
      activeTopics: [],
      promises: [],
      liesDetected: 0,
      playerReputationInContext: structuredClone(game.player.reputation),
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

    this.recordHistory(node.id, choice.id, "player", choice.text);
    this.appendLogEntry("player", choice.text, choice.id, node.id);

    for (const effect of choice.effects ?? []) {
      const socialDecision = this.resolveSocialRequest(effect);
      if (socialDecision) {
        nextNodeId = this.selectSocialOutcome(effect, socialDecision, nextNodeId);
        this.emitRelationshipOutcome(effect, socialDecision);
        this.pendingDecisionIntent = socialDecision.animationIntent;
        this.bus.emit(Events.DIALOGUE_EFFECT, {
          npcId: this.definition.npcId,
          effect,
          decision: socialDecision
        });
        continue;
      }

      if (this.recordPromise(effect)) {
        this.bus.emit(Events.DIALOGUE_EFFECT, {
          npcId: this.definition.npcId,
          effect
        });
        continue;
      }

      this.applyLocalEffect(effect);
      this.bus.emit(Events.DIALOGUE_EFFECT, {
        npcId: this.definition.npcId,
        effect
      });
    }

    this.emitChoiceObserved(node.id, choice);

    if (nextNodeId === null) {
      this.end();
      return;
    }

    this.currentNodeId = nextNodeId;
    this.showCurrentNode();
  }

  end(): void {
    if (!this.active) return;
    const finished = structuredClone(this.active);
    this.active = null;
    this.definition = null;
    this.currentNodeId = null;
    this.pendingDecisionIntent = null;
    this.presenter.hide();
    this.bus.emit(Events.DIALOGUE_ENDED, finished);
  }

  isActive(): boolean {
    return this.active !== null;
  }

  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  getActiveDialogueState(): DialogueState | null {
    return this.active ? structuredClone(this.active) : null;
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

  private recordPromise(effect: GameEffect): boolean {
    if (effect.type !== "custom" || effect.payload.action !== PROMISE_ACTION || !this.active || !this.definition) {
      return false;
    }

    const content = typeof effect.payload.content === "string" ? effect.payload.content : "A promise was made.";
    const promiseId = typeof effect.payload.promiseId === "string"
      ? effect.payload.promiseId
      : `${this.active.conversationId}-promise-${this.active.promises.length + 1}`;
    const deadline = typeof effect.payload.deadline === "number" && Number.isFinite(effect.payload.deadline)
      ? effect.payload.deadline
      : null;

    const promise: DialoguePromise = {
      promiseId,
      content,
      deadline,
      status: "pending",
      madeBy: "player",
      madeTo: this.definition.npcId
    };
    this.active.promises.push(promise);
    return true;
  }

  private emitChoiceObserved(nodeId: string, choice: DialogueChoice): void {
    if (!this.active || !this.definition) return;
    this.bus.emit(Events.PLAYER_ACTION_OBSERVED, {
      type: "DIALOGUE_CHOICE",
      actors: ["player"],
      observedBy: [this.definition.npcId],
      location: this.active.locationId,
      payload: {
        description: `Player said: "${choice.text}"`,
        conversationId: this.active.conversationId,
        nodeId,
        choiceId: choice.id
      }
    });
  }

  private selectEntryNode(definition: DialogueDefinition): string {
    if (!this.entryResolver) return definition.startNodeId;
    const candidate = this.entryResolver({
      npc: this.npcProvider?.getNPC(definition.npcId) ?? null,
      state: this.store.getState(),
      definition
    });
    return typeof candidate === "string" && definition.nodes[candidate]
      ? candidate
      : definition.startNodeId;
  }

  private recordHistory(nodeId: string, choiceId: string | null, speakerId: string, text: string): void {
    if (!this.active) return;
    this.sessionHistory.push({
      conversationId: this.active.conversationId,
      nodeId,
      speakerId,
      text,
      gameTime: this.store.getState().gameTime,
      choiceId: choiceId ?? undefined
    });
    if (this.sessionHistory.length > DialogueSystem.MAX_SESSION_HISTORY) this.sessionHistory.shift();
  }

  private appendLogEntry(by: string, text: string, choiceId?: string, nodeId?: string): void {
    if (!this.active || !this.definition) return;
    this.store.update((state) => {
      const log = readDialogueLog(state);
      const entry: PersistentDialogueEntry = {
        t: state.gameTime,
        convo: this.active?.conversationId ?? this.definition?.dialogueId ?? "unknown",
        npc: this.definition?.npcId ?? "unknown",
        by,
        text: text.length > DIALOGUE_LOG_EXCERPT_MAX ? `${text.slice(0, DIALOGUE_LOG_EXCERPT_MAX)}…` : text
      };
      if (choiceId) entry.choice = choiceId;
      if (nodeId) entry.node = nodeId;
      log.push(entry);
      while (log.length > DIALOGUE_LOG_MAX_ENTRIES) log.shift();
      state.flags[DIALOGUE_LOG_FLAG_KEY] = JSON.stringify(log);
    });
  }

  private showCurrentNode(): void {
    if (!this.definition || !this.currentNodeId) return;
    const node = this.definition.nodes[this.currentNodeId];
    if (!node) {
      this.end();
      return;
    }

    this.recordHistory(node.id, null, node.speakerId, node.text);
    this.appendLogEntry(node.speakerId, node.text, undefined, node.id);

    const intent = node.animationIntent ?? this.pendingDecisionIntent;
    this.pendingDecisionIntent = null;

    this.presenter.show(
      node.speakerId === "player" ? "YOU" : node.speakerId,
      node.text,
      node.choices.map((choice) => ({ id: choice.id, text: choice.text })),
      intent ? { animationIntent: intent } : undefined
    );
  }

  private resolveSocialRequest(effect: GameEffect): SocialRequestDecision | null {
    if (effect.type !== "custom" || effect.payload.action !== SOCIAL_REQUEST_ACTION) return null;
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

    const number = (key: keyof SocialRequestContext, fallback: number): number => {
      const value = effect.payload[key];
      return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    };
    const stringValue = (key: "request" | "destination", fallback: string): string => {
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

  private selectSocialOutcome(effect: GameEffect, decision: SocialRequestDecision, fallback: string | null): string | null {
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

    this.bus.emit(Events.DIALOGUE_EFFECT, {
      npcId: this.definition?.npcId ?? "unknown",
      effect: {
        type: "change_relationship",
        payload: { targetId: "player", delta: safeDelta }
      },
      decision
    });
  }
}
