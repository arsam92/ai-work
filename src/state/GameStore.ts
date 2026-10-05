import type { EventBus } from "../core/EventBus";
import type { GameState } from "./GameState";

export type StateListener = (state: GameState) => void;

export class GameStore {
  private state: GameState;
  private readonly listeners = new Set<StateListener>();
  private readonly bus?: EventBus;

  constructor(initialState: GameState, bus?: EventBus) {
    this.state = structuredClone(initialState);
    this.bus = bus;
  }

  getState(): GameState {
    return this.state;
  }

  replace(nextState: GameState): void {
    this.state = structuredClone(nextState);
    this.notify();
  }

  update(mutator: (state: GameState) => void): void {
    const draft = structuredClone(this.state);
    mutator(draft);
    this.state = draft;
    this.notify();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
    this.bus?.emit("state.changed", this.state);
  }
}
