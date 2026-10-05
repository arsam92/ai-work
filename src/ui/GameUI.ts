import type { DialoguePresenter } from "../dialogue/DialogueSystem";
import type { EventBus } from "../core/EventBus";
import { Events } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";

export class GameUI implements DialoguePresenter {
  private readonly root: HTMLElement;
  private readonly prompt: HTMLDivElement;
  private readonly mission: HTMLDivElement;
  private readonly dialogue: HTMLDivElement;
  private readonly dialogueName: HTMLDivElement;
  private readonly dialogueText: HTMLDivElement;
  private readonly choices: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly loadButton: HTMLButtonElement;

  constructor(
    host: HTMLElement,
    private readonly store: GameStore,
    private readonly bus: EventBus,
    onSave: () => Promise<void>,
    onLoad: () => Promise<void>
  ) {
    this.root = host;
    this.root.innerHTML = `
      <div class="hud">
        <div class="brand">BLACK MILE</div>
        <div class="sub">VEYRA // NIGHT 01</div>
        <div id="mission" class="mission"></div>
        <div id="status" class="status">WASD MOVE · SHIFT RUN · CLICK LOOK · E TALK</div>
        <div id="prompt" class="prompt"></div>
        <div id="dialogue" class="dialogue hidden">
          <div id="dialogue-name" class="dialogue-name"></div>
          <div id="dialogue-text" class="dialogue-text"></div>
          <div id="choices" class="choices"></div>
        </div>
        <div class="save-row">
          <button id="save">SAVE</button>
          <button id="load">LOAD</button>
        </div>
      </div>
    `;
    this.prompt = this.root.querySelector("#prompt") as HTMLDivElement;
    this.mission = this.root.querySelector("#mission") as HTMLDivElement;
    this.dialogue = this.root.querySelector("#dialogue") as HTMLDivElement;
    this.dialogueName = this.root.querySelector("#dialogue-name") as HTMLDivElement;
    this.dialogueText = this.root.querySelector("#dialogue-text") as HTMLDivElement;
    this.choices = this.root.querySelector("#choices") as HTMLDivElement;
    this.status = this.root.querySelector("#status") as HTMLDivElement;
    this.saveButton = this.root.querySelector("#save") as HTMLButtonElement;
    this.loadButton = this.root.querySelector("#load") as HTMLButtonElement;

    this.saveButton.addEventListener("click", () => void onSave());
    this.loadButton.addEventListener("click", () => void onLoad());

    this.bus.on<{ id: string; label: string } | null>(Events.INTERACTION_AVAILABLE, (item) => {
      this.prompt.textContent = item ? `[E] ${item.label}` : "";
    });

    this.bus.on<{ missionId: string }>(Events.MISSION_COMPLETED, ({ missionId }) => {
      this.status.textContent = `MISSION COMPLETE // ${missionId.toUpperCase()}`;
      window.setTimeout(() => this.refreshMission(), 2200);
    });

    this.bus.on<boolean>("input.pointerlock", (locked) => {
      if (!this.dialogue.classList.contains("hidden")) return;
      this.status.textContent = locked
        ? "WASD MOVE · SHIFT RUN · E TALK · ESC RELEASE"
        : "WASD MOVE · SHIFT RUN · CLICK LOOK · E TALK";
    });

    this.refreshMission();
  }

  show(title: string, text: string, choices: { id: string; text: string }[]): void {
    this.dialogueName.textContent = title.replace(/-/g, " ").toUpperCase();
    this.dialogueText.textContent = text;
    this.choices.replaceChildren();

    for (const choice of choices) {
      const button = document.createElement("button");
      button.textContent = choice.text;
      button.dataset.choiceId = choice.id;
      this.choices.appendChild(button);
    }

    this.dialogue.classList.remove("hidden");
    this.prompt.textContent = "";
  }

  hide(): void {
    this.dialogue.classList.add("hidden");
    this.choices.replaceChildren();
    this.refreshMission();
  }

  bindDialogueChoice(handler: (choiceId: string) => void): void {
    this.choices.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const id = target.dataset.choiceId;
      if (id) handler(id);
    });
  }

  private refreshMission(): void {
    const state = this.store.getState();
    const active = state.missions.active[0];
    if (!active) {
      this.mission.textContent = "NO ACTIVE MISSION";
      return;
    }
    const progress = state.missions.objectiveProgress[active] ?? {};
    const done = Object.values(progress).filter(Boolean).length;
    const total = Object.keys(progress).length;
    this.mission.textContent = `MISSION // ${active.toUpperCase()}  [${done}/${total}]`;
  }
}
