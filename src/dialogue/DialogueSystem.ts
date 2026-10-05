import type { EventBus } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { MissionEffect } from "../missions/MissionSchema";
import type { DialogueDefinition, DialogueState } from "./DialogueState";

export interface DialoguePresenter {
  show(title: string, text: string, choices: { id: string; text: string }[]): void;
  hide(): void;
}

export class DialogueSystem {
  private active: DialogueState | null = null;
  private definition: DialogueDefinition | null = null;
  private currentNodeId: string | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly bus: EventBus,
    private readonly presenter: DialoguePresenter
  ) {}

  start(definition: DialogueDefinition): void {
    this.definition = definition;
    this.currentNodeId = definition.startNodeId;
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
    this.bus.emit("dialogue.started", this.active);
    this.showCurrentNode();
  }

  choose(choiceId: string): void {
    if (!this.definition || !this.currentNodeId || !this.active) return;
    const node = this.definition.nodes[this.currentNodeId];
    if (!node) { this.end(); return; }
    const choice = node.choices.find((item) => item.id === choiceId);
    if (!choice) return;

    for (const effect of choice.effects ?? []) {
      this.bus.emit("dialogue.effect", { npcId: this.definition.npcId, effect });
    }

    if (choice.nextNodeId === null) { this.end(); return; }
    this.currentNodeId = choice.nextNodeId;
    this.showCurrentNode();
  }

  end(): void {
    if (!this.active) return;
    const finished = this.active;
    this.active = null;
    this.definition = null;
    this.currentNodeId = null;
    this.presenter.hide();
    this.bus.emit("dialogue.ended", finished);
  }

  isActive(): boolean { return this.active !== null; }

  private showCurrentNode(): void {
    if (!this.definition || !this.currentNodeId) return;
    const node = this.definition.nodes[this.currentNodeId];
    if (!node) { this.end(); return; }
    this.presenter.show(
      node.speakerId === "player" ? "YOU" : node.speakerId,
      node.text,
      node.choices.map((choice) => ({ id: choice.id, text: choice.text }))
    );
  }
}