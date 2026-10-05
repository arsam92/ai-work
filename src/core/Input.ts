import type { EventBus } from "./EventBus";
import { Events } from "./EventBus";

type Action = "forward" | "back" | "left" | "right" | "run";

export class Input {
  private readonly keys = new Set<string>();
  private pointerLocked = false;

  constructor(private readonly bus: EventBus) {}

  attach(target: HTMLElement): void {
    const down = (event: KeyboardEvent): void => {
      this.keys.add(event.code);
      if (["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","KeyE"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === "KeyE" && !event.repeat) this.bus.emit(Events.INPUT_INTERACT);
    };

    const up = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => this.keys.clear());

    target.addEventListener("click", () => {
      if (document.pointerLockElement !== target) {
        void target.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === target;
      this.bus.emit(Events.INPUT_POINTERLOCK, this.pointerLocked);
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked) return;
      this.bus.emit(Events.INPUT_LOOK, { dx: event.movementX, dy: event.movementY });
    });

    target.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.bus.emit(Events.INPUT_WHEEL, event.deltaY);
    }, { passive: false });
  }

  isDown(action: Action): boolean {
    const map: Record<Action, string[]> = {
      forward: ["KeyW", "ArrowUp"],
      back: ["KeyS", "ArrowDown"],
      left: ["KeyA", "ArrowLeft"],
      right: ["KeyD", "ArrowRight"],
      run: ["ShiftLeft", "ShiftRight"]
    };
    return map[action].some((key) => this.keys.has(key));
  }
}
