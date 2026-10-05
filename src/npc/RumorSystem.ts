import type { EventBus } from "../core/EventBus";
import { Events } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";
import type { Rumor } from "../state/GameState";

export class RumorSystem {
  constructor(
    private readonly store: GameStore,
    private readonly bus: EventBus
  ) {}

  start(content: string, originEventId: string, originNpcId: string, confidence = 0.8): string {
    const id = `rumor-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const rumor: Rumor = {
      id,
      content,
      originEventId,
      currentConfidence: Math.max(0, Math.min(1, confidence)),
      mutationHistory: [],
      knownBy: [originNpcId]
    };

    this.store.update((state) => {
      state.rumors.activeRumors.push(rumor);
    });
    this.bus.emit(Events.RUMOR_STARTED, rumor);
    return id;
  }

  spread(rumorId: string, fromNpcId: string, toNpcId: string, mutation?: string): boolean {
    let changed = false;

    this.store.update((state) => {
      const rumor = state.rumors.activeRumors.find((item) => item.id === rumorId);
      if (!rumor || rumor.knownBy.includes(toNpcId)) return;

      if (!rumor.knownBy.includes(fromNpcId)) return;

      rumor.currentConfidence *= mutation ? 0.85 : 0.94;
      rumor.currentConfidence = Math.max(0.05, rumor.currentConfidence);

      if (mutation) {
        rumor.content = mutation;
        rumor.mutationHistory.push(mutation);
      }

      rumor.knownBy.push(toNpcId);
      changed = true;
    });

    if (changed) {
      const rumor = this.store.getState().rumors.activeRumors.find((item) => item.id === rumorId);
      if (rumor) this.bus.emit(mutation ? Events.RUMOR_MUTATED : Events.RUMOR_STARTED, rumor);
    }

    return changed;
  }
}
