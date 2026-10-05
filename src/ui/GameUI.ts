import type { DialoguePresenter, DialogueShowMeta } from "../dialogue/DialogueSystem";
import { readDialogueLog } from "../dialogue/DialogueSystem";
import { Events, type EventBus } from "../core/EventBus";
import type { GameStore } from "../state/GameStore";

function formatGameClock(gameTimeSeconds: number): string {
  const total = Math.max(0, Math.floor(gameTimeSeconds));
  const hours = String(Math.floor(total / 3600) % 24).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export class GameUI implements DialoguePresenter {
  private readonly root: HTMLElement;
  private readonly prompt: HTMLDivElement;
  private readonly mission: HTMLDivElement;
  private readonly dialogue: HTMLDivElement;
  private readonly dialogueName: HTMLDivElement;
  private readonly dialogueText: HTMLDivElement;
  private readonly choices: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly history: HTMLDivElement;
  private readonly historyList: HTMLDivElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly loadButton: HTMLButtonElement;
  private typingTimer: number | null = null;
  private typingComplete = false;
  private pendingDialogueText = "";
  private selectedChoiceIndex = 0;
  private dialogueChoiceHandler: ((choiceId: string) => void) | null = null;
  private dialogueCancelHandler: (() => void) | null = null;
  private dialogueIntentHandler: ((intent: string) => void) | null = null;
  private missionStatusTimer: number | null = null;
  private choicesBound = false;

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
        <div id="prompt" class="prompt hidden"></div>
        <div id="dialogue" class="dialogue hidden" aria-live="polite">
          <div id="dialogue-name" class="dialogue-name"></div>
          <div id="dialogue-text" class="dialogue-text"></div>
          <div id="choices" class="choices"></div>
          <div class="dialogue-help">↑ ↓ SELECT · ENTER TALK · 1-9 QUICK SELECT · ESC EXIT</div>
        </div>
        <div id="history" class="history hidden">
          <div class="history-title">HISTORY — H TO CLOSE</div>
          <div id="history-list" class="history-list"></div>
        </div>
        <div class="save-row">
          <button id="history-toggle">HISTORY</button>
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
    this.history = this.root.querySelector("#history") as HTMLDivElement;
    this.historyList = this.root.querySelector("#history-list") as HTMLDivElement;
    this.saveButton = this.root.querySelector("#save") as HTMLButtonElement;
    this.loadButton = this.root.querySelector("#load") as HTMLButtonElement;

    this.saveButton.addEventListener("click", () => void onSave());
    this.loadButton.addEventListener("click", () => void onLoad());
    const historyToggle = this.root.querySelector("#history-toggle") as HTMLButtonElement;
    historyToggle.addEventListener("click", () => this.toggleHistory());

    this.bus.on<{ id: string; label: string } | null>(Events.INTERACTION_AVAILABLE, (item) => {
      this.prompt.textContent = item ? `[E] ${item.label}` : "";
      this.prompt.classList.toggle("hidden", !item);
    });

    this.bus.on<{ missionId: string }>(Events.MISSION_COMPLETED, ({ missionId }) => {
      this.status.textContent = `MISSION COMPLETE // ${missionId.toUpperCase()}`;
      if (this.missionStatusTimer !== null) window.clearTimeout(this.missionStatusTimer);
      this.missionStatusTimer = window.setTimeout(() => {
        this.missionStatusTimer = null;
        this.refreshMission();
      }, 2200);
    });

    this.bus.on(Events.MISSION_OBJECTIVE_UPDATED, () => this.refreshMission());

    this.bus.on<boolean>(Events.INPUT_POINTERLOCK, (locked) => {
      if (!this.dialogue.classList.contains("hidden")) return;
      this.status.textContent = locked
        ? "WASD MOVE · SHIFT RUN · E TALK · ESC RELEASE"
        : "WASD MOVE · SHIFT RUN · CLICK LOOK · E TALK";
    });

    this.dialogueText.addEventListener("click", () => {
      if (!this.typingComplete) this.finishTyping(this.choices.children.length > 0);
    });
    window.addEventListener("keydown", (event) => this.handleDialogueKey(event));

    this.refreshMission();
  }

  show(title: string, text: string, choices: { id: string; text: string }[], meta?: DialogueShowMeta): void {
    this.stopTyping();
    this.typingComplete = false;
    this.pendingDialogueText = text;
    this.selectedChoiceIndex = 0;
    this.dialogueName.textContent = title.replace(/-/g, " ").toUpperCase();
    this.dialogueText.textContent = "";
    this.choices.replaceChildren();

    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.textContent = `${index + 1}. ${choice.text}`;
      button.dataset.choiceId = choice.id;
      button.dataset.choiceIndex = String(index);
      button.disabled = true;
      this.choices.appendChild(button);
    });

    this.dialogue.classList.remove("hidden");
    this.prompt.textContent = "";
    this.prompt.classList.add("hidden");
    this.status.textContent = "DIALOGUE // READING...";

    if (meta?.animationIntent) this.dialogueIntentHandler?.(meta.animationIntent);
    if (document.pointerLockElement) document.exitPointerLock();

    if (this.prefersReducedMotion()) {
      this.finishTyping(choices.length > 0);
      return;
    }

    const chars = Array.from(text);
    let index = 0;
    this.typingTimer = window.setInterval(() => {
      if (index >= chars.length) {
        this.finishTyping(choices.length > 0);
        return;
      }
      this.dialogueText.textContent += chars[index];
      index += 1;
    }, 18);
  }

  hide(): void {
    this.stopTyping();
    this.pendingDialogueText = "";
    this.dialogue.classList.add("hidden");
    this.choices.replaceChildren();
    this.prompt.textContent = "";
    this.prompt.classList.add("hidden");
    this.dialogueIntentHandler?.("idle");
    this.refreshMission();
    this.status.textContent = "WASD MOVE · SHIFT RUN · CLICK LOOK · E TALK";
  }

  bindDialogueChoice(handler: (choiceId: string) => void): void {
    this.dialogueChoiceHandler = handler;
    if (this.choicesBound) return;
    this.choicesBound = true;
    this.choices.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (!this.typingComplete || target.disabled) return;
      const id = target.dataset.choiceId;
      if (id) this.dialogueChoiceHandler?.(id);
    });
  }

  bindDialogueCancel(handler: () => void): void {
    this.dialogueCancelHandler = handler;
  }

  bindDialogueIntent(handler: (intent: string) => void): void {
    this.dialogueIntentHandler = handler;
  }

  refresh(): void {
    this.refreshMission();
  }

  private handleDialogueKey(event: KeyboardEvent): void {
    if (event.code === "KeyH" && !event.repeat) {
      this.toggleHistory();
      return;
    }

    if (this.dialogue.classList.contains("hidden")) return;

    if (event.code === "Escape") {
      event.preventDefault();
      this.dialogueCancelHandler?.();
      return;
    }

    if (!this.typingComplete) {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        this.finishTyping(true);
      }
      return;
    }

    const buttons = Array.from(this.choices.querySelectorAll("button"));
    if (buttons.length === 0) return;

    if (event.code === "ArrowDown" || event.code === "ArrowRight") {
      event.preventDefault();
      this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % buttons.length;
      this.focusChoice(buttons);
      return;
    }

    if (event.code === "ArrowUp" || event.code === "ArrowLeft") {
      event.preventDefault();
      this.selectedChoiceIndex = (this.selectedChoiceIndex - 1 + buttons.length) % buttons.length;
      this.focusChoice(buttons);
      return;
    }

    if (event.code === "Enter") {
      event.preventDefault();
      const selected = buttons[this.selectedChoiceIndex];
      if (selected?.dataset.choiceId) this.dialogueChoiceHandler?.(selected.dataset.choiceId);
      return;
    }

    const match = event.code.match(/^Digit([1-9])$/);
    if (match) {
      const index = Number(match[1]) - 1;
      const selected = buttons[index];
      if (selected?.dataset.choiceId) {
        event.preventDefault();
        this.selectedChoiceIndex = index;
        this.dialogueChoiceHandler?.(selected.dataset.choiceId);
      }
    }
  }

  private toggleHistory(): void {
    this.history.classList.toggle("hidden");
    if (!this.history.classList.contains("hidden")) this.renderHistory();
  }

  private renderHistory(): void {
    const entries = readDialogueLog(this.store.getState());
    this.historyList.replaceChildren();

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "NO CONVERSATIONS RECORDED YET.";
      this.historyList.appendChild(empty);
      return;
    }

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      const row = document.createElement("div");
      row.className = "history-entry";

      const time = document.createElement("span");
      time.className = "history-time";
      time.textContent = formatGameClock(entry.t);

      const speaker = document.createElement("span");
      speaker.className = entry.by === "player" ? "history-speaker player" : "history-speaker";
      speaker.textContent = entry.by === "player" ? "YOU" : entry.npc.toUpperCase();

      const text = document.createElement("span");
      text.className = "history-text";
      text.textContent = entry.text;

      row.append(time, speaker, text);
      this.historyList.appendChild(row);
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private focusChoice(buttons: HTMLButtonElement[]): void {
    buttons.forEach((button, index) => {
      button.classList.toggle("selected", index === this.selectedChoiceIndex);
    });
    buttons[this.selectedChoiceIndex]?.focus();
  }

  private finishTyping(hasChoices: boolean): void {
    if (this.typingComplete) return;
    this.stopTyping();
    this.dialogueText.textContent = this.pendingDialogueText;
    this.typingComplete = true;

    const buttons = Array.from(this.choices.querySelectorAll("button"));
    buttons.forEach((button) => { button.disabled = false; });
    if (hasChoices) {
      this.status.textContent = "DIALOGUE // CHOOSE RESPONSE";
      this.focusChoice(buttons);
    } else {
      this.status.textContent = "DIALOGUE";
    }
  }

  private stopTyping(): void {
    if (this.typingTimer !== null) {
      window.clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
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
