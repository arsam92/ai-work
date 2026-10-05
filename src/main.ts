import "../styles/main.css";
import * as THREE from "three";
import { EventBus, Events } from "./core/EventBus";
import { Input } from "./core/Input";
import { GameLoop } from "./core/GameLoop";
import { createRenderer } from "./render/Renderer";
import { createWorld } from "./world/World";
import { CameraRig } from "./camera/CameraRig";
import { PlayerController } from "./player/PlayerController";
import { InteractionSystem } from "./interaction/InteractionSystem";
import { DialogueSystem } from "./dialogue/DialogueSystem";
import { NPCSystem } from "./npc/NPCSystem";
import { MissionSystem } from "./missions/MissionSystem";
import { BrowserSaveSystem } from "./save/SaveSystem";
import { AnimationController } from "./animation/AnimationController";
import { GameStore } from "./state/GameStore";
import { createInitialGameState } from "./state/GameState";
import type { NPCState } from "./npc/NPCState";
import type { DialogueDefinition } from "./dialogue/DialogueState";
import type { MissionDefinition } from "./missions/MissionSchema";
import juneNPC from "../data/npcs/june.json";
import juneDialogue from "../data/dialogue/june-intro.json";
import oldKeysMission from "../data/missions/02-old-keys.json";
import { GameUI } from "./ui/GameUI";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root was not found.");

const bus = new EventBus();
const store = new GameStore(createInitialGameState(), bus);
const saves = new BrowserSaveSystem();
const renderer = createRenderer(app);
const input = new Input(bus);
input.attach(renderer.renderer.domElement);

const world = createWorld(renderer.scene);
const cameraRig = new CameraRig(renderer.camera, bus);
const player = new PlayerController(bus, input.isDown.bind(input), cameraRig.getYaw.bind(cameraRig));
player.object.position.copy(world.spawn);
world.root.add(player.object);

const npcSystem = new NPCSystem(store, bus);
npcSystem.addNPC(juneNPC as NPCState);

const juneMesh = new THREE.Group();
juneMesh.name = "june";
const juneBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.48, 1.1, 0.34),
  new THREE.MeshLambertMaterial({ color: 0x694b3d })
);
juneBody.position.y = 0.95;
const juneHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 14, 12),
  new THREE.MeshLambertMaterial({ color: 0x997c66 })
);
juneHead.position.y = 1.75;
juneBody.castShadow = true;
juneHead.castShadow = true;
juneMesh.add(juneBody, juneHead);
juneMesh.position.set(2.4, 0, -43);
world.root.add(juneMesh);
const juneAnimation = new AnimationController(juneMesh);

const missionSystem = new MissionSystem(store, bus);
missionSystem.register(oldKeysMission as MissionDefinition);
missionSystem.start("old-keys");

const ui = new GameUI(
  app,
  store,
  bus,
  async () => {
    await saves.save("autosave", store.getState());
    bus.emit(Events.SAVE_REQUESTED, { slot: "autosave" });
  },
  async () => {
    try {
      const loaded = await saves.load("autosave");
      store.replace(loaded);
      bus.emit(Events.LOAD_COMPLETED, { slot: "autosave" });
    } catch (error) {
      console.warn(error);
    }
  }
);

const dialogue = new DialogueSystem(store, bus, ui);
ui.bindDialogueChoice((choiceId) => dialogue.choose(choiceId));

const interaction = new InteractionSystem(renderer.camera, player.object, bus);
interaction.register({
  id: "june",
  label: "TALK TO JUNE",
  position: juneMesh.position,
  activate: () => {
    if (!dialogue.isActive()) dialogue.start(juneDialogue as DialogueDefinition);
  }
});

const loop = new GameLoop();
let timeAccumulator = 0;
loop.add({
  update: (dt: number) => {
    if (!dialogue.isActive()) {
      player.update(dt);
      cameraRig.update(dt, player.object.position);
      interaction.update();
    }
    juneAnimation.update(dt);
    timeAccumulator += dt;
    if (timeAccumulator >= 0.25) {
      const slice = timeAccumulator;
      timeAccumulator = 0;
      store.update((state) => {
        state.gameTime += slice;
        state.player.locationId = "black-mile";
      });
      bus.emit(Events.GAME_TIME_TICK, slice);
      npcSystem.tick(slice);
    }
  }
});

bus.on(Events.MISSION_COMPLETED, () => {
  ui.refresh();
});

bus.on(Events.INTERACTION_AVAILABLE, (item) => {
  juneAnimation.setIntent(item && typeof item === "object" && "id" in item && item.id === "june" ? "nervous" : "idle");
});

cameraRig.update(0, player.object.position);
loop.start(() => renderer.renderer.render(renderer.scene, renderer.camera));