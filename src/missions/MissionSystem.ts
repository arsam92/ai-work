import type { EventBus } from "../core/EventBus";
import { Events } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { MissionDefinition, MissionEffect } from "./MissionSchema";

export class MissionSystem {
  private readonly definitions = new Map<string, MissionDefinition>();

  constructor(private readonly store: GameStore, private readonly bus: EventBus) {
    this.bus.on<{ participants: string[] }>(Events.DIALOGUE_ENDED, (payload) => {
      const npcId = payload.participants.find((id) => id !== "player");
      if (npcId) this.onDialogueEnded(npcId);
    });
  }

  register(definition: MissionDefinition): void {
    this.definitions.set(definition.missionId, structuredClone(definition));
  }

  start(missionId: string): boolean {
    const definition = this.definitions.get(missionId);
    if (!definition) return false;
    const state = this.store.getState();
    if (state.missions.active.includes(missionId) || state.missions.completed.includes(missionId)) return false;
    if (definition.prerequisites.missionsCompleted?.some((id) => !state.missions.completed.includes(id))) return false;

    this.store.update((game) => {
      game.missions.active.push(missionId);
      const progress: Record<string, boolean> = {};
      for (const objective of definition.objectives) progress[objective.objectiveId] = false;
      game.missions.objectiveProgress[missionId] = progress;
    });
    return true;
  }

  completeObjective(missionId: string, objectiveId: string): void {
    const definition = this.definitions.get(missionId);
    if (!definition) return;
    this.store.update((game) => {
      if (!game.missions.active.includes(missionId)) return;
      const progress = game.missions.objectiveProgress[missionId];
      if (!progress || !(objectiveId in progress)) return;
      progress[objectiveId] = true;
    });
    this.bus.emit(Events.MISSION_OBJECTIVE_UPDATED, { missionId, objectiveId });
    this.tryComplete(missionId);
  }

  isCompleted(missionId: string): boolean {
    return this.store.getState().missions.completed.includes(missionId);
  }

  getDefinition(missionId: string): MissionDefinition | null {
    const definition = this.definitions.get(missionId);
    return definition ? structuredClone(definition) : null;
  }

  private onDialogueEnded(npcId: string): void {
    for (const definition of this.definitions.values()) {
      if (!this.store.getState().missions.active.includes(definition.missionId)) continue;
      for (const objective of definition.objectives) {
        if (objective.type === "talk_to" && objective.target === npcId) this.completeObjective(definition.missionId, objective.objectiveId);
      }
    }
  }

  private tryComplete(missionId: string): void {
    const definition = this.definitions.get(missionId);
    if (!definition) return;
    const state = this.store.getState();
    const progress = state.missions.objectiveProgress[missionId];
    if (!progress) return;
    const complete = definition.objectives.filter((o) => !o.optional).every((o) => progress[o.objectiveId] === true);
    if (!complete) return;

    this.store.update((game) => {
      game.missions.active = game.missions.active.filter((id) => id !== missionId);
      if (!game.missions.completed.includes(missionId)) game.missions.completed.push(missionId);
      for (const effect of definition.onComplete) this.applyStateEffect(game, effect);
    });
    this.bus.emit(Events.MISSION_COMPLETED, { missionId });
  }

  private applyStateEffect(state: ReturnType<GameStore["getState"]>, effect: MissionEffect): void {
    if (effect.type === "set_flag") {
      const key = String(effect.payload.key ?? "");
      if (key) state.flags[key] = effect.payload.value as boolean | number | string;
    }
  }
}