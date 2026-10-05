export type EventHandler<T = unknown> = (payload: T) => void;

export interface IEventBus {
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  emit<T = unknown>(event: string, payload?: T): void;
  off(event: string, handler: EventHandler): void;
  clear(): void;
}

export const Events = {
  PLAYER_ACTION_OBSERVED: "player.action.observed",
  NPC_MEMORY_ADDED: "npc.memory.added",
  RELATIONSHIP_CHANGED: "npc.relationship.changed",
  DIALOGUE_STARTED: "dialogue.started",
  DIALOGUE_ENDED: "dialogue.ended",
  MISSION_OBJECTIVE_UPDATED: "mission.objective.updated",
  MISSION_COMPLETED: "mission.completed",
  RUMOR_STARTED: "rumor.started",
  RUMOR_MUTATED: "rumor.mutated",
  WORLD_FLAG_CHANGED: "world.flag.changed",
  GAME_TIME_TICK: "time.tick",
  SAVE_REQUESTED: "save.requested",
  LOAD_COMPLETED: "load.completed",
  INTERACTION_AVAILABLE: "interaction.available",
  INTERACTION_USED: "interaction.used",
  PLAYER_MOVED: "player.moved",
} as const;

export type EventName = typeof Events[keyof typeof Events];

export class EventBus implements IEventBus {
  private readonly listeners = new Map<string, Set<EventHandler<unknown>>>();
  private readonly onceWrappers = new Map<string, Map<EventHandler<unknown>, EventHandler<unknown>>>();

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const listener = handler as EventHandler<unknown>;
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => this.off(event, handler as EventHandler);
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const original = handler as EventHandler<unknown>;
    const wrapper: EventHandler<unknown> = (payload) => {
      this.off(event, original);
      this.onceWrappers.get(event)?.delete(original);
      original(payload);
    };
    let wrappers = this.onceWrappers.get(event);
    if (!wrappers) {
      wrappers = new Map();
      this.onceWrappers.set(event, wrappers);
    }
    wrappers.set(original, wrapper);
    this.on(event, wrapper);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    [...set].forEach((handler) => handler(payload as unknown));
  }

  off(event: string, handler: EventHandler): void {
    const set = this.listeners.get(event);
    const listener = handler as EventHandler<unknown>;
    if (set?.delete(listener) && set.size === 0) this.listeners.delete(event);

    const wrapper = this.onceWrappers.get(event)?.get(listener);
    if (wrapper) {
      this.listeners.get(event)?.delete(wrapper);
      this.onceWrappers.get(event)?.delete(listener);
    }

    const wrappers = this.onceWrappers.get(event);
    if (wrappers?.size === 0) this.onceWrappers.delete(event);
  }

  clear(): void {
    this.listeners.clear();
    this.onceWrappers.clear();
  }
}
