/**
 * BLACK MILE - Core Event Bus Contract
 * Phase 1 Lock
 */

export type EventHandler<T = unknown> = (payload: T) => void;

export interface IEventBus {
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  emit<T = unknown>(event: string, payload?: T): void;
  off(event: string, handler: EventHandler): void;
  clear(): void;
}

export const Events = {
  PLAYER_ACTION_OBSERVED: 'player.action.observed',
  NPC_MEMORY_ADDED: 'npc.memory.added',
  RELATIONSHIP_CHANGED: 'npc.relationship.changed',
  DIALOGUE_STARTED: 'dialogue.started',
  DIALOGUE_ENDED: 'dialogue.ended',
  MISSION_OBJECTIVE_UPDATED: 'mission.objective.updated',
  MISSION_COMPLETED: 'mission.completed',
  RUMOR_STARTED: 'rumor.started',
  RUMOR_MUTATED: 'rumor.mutated',
  WORLD_FLAG_CHANGED: 'world.flag.changed',
  GAME_TIME_TICK: 'time.tick',
  SAVE_REQUESTED: 'save.requested',
  LOAD_COMPLETED: 'load.completed',
} as const;

export type EventName = typeof Events[keyof typeof Events];
