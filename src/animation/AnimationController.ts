import * as THREE from "three";

export type AnimationIntent =
  | "idle"
  | "walk"
  | "run"
  | "nervous"
  | "avoid_eye_contact"
  | "angry"
  | "fearful"
  | "step_back";

export class AnimationController {
  private time = 0;
  private intent: AnimationIntent = "idle";

  constructor(private readonly character: THREE.Object3D) {}

  setIntent(intent: AnimationIntent): void {
    this.intent = intent;
  }

  update(dt: number): void {
    this.time += dt;
    const movement = this.intent === "walk" ? 0.018 : this.intent === "run" ? 0.032 : 0.006;
    const nervous = this.intent === "nervous" || this.intent === "fearful";
    this.character.rotation.z = Math.sin(this.time * (nervous ? 9 : 3)) * movement;
    this.character.position.y = Math.abs(Math.sin(this.time * (nervous ? 6 : 2.5))) * (this.intent === "idle" ? 0.005 : 0.018);
  }
}
