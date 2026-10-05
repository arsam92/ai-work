import * as THREE from "three";
import type { EventBus } from "../core/EventBus";

export class CameraRig {
  private yaw = 0;
  private pitch = 0.28;
  private distance = 6.5;
  private readonly target = new THREE.Vector3();
  private initialized = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly bus: EventBus
  ) {
    this.bus.on<{ dx: number; dy: number }>("input.look", (delta) => {
      this.yaw -= delta.dx * 0.0023;
      this.pitch = THREE.MathUtils.clamp(this.pitch + delta.dy * 0.0018, -0.2, 1.05);
    });
    this.bus.on<number>("input.wheel", (delta) => {
      this.distance = THREE.MathUtils.clamp(this.distance + delta * 0.004, 3.5, 11);
    });
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    const smoothing = 1 - Math.exp(-8 * dt);
    if (!this.initialized) {
      this.target.copy(playerPosition);
      this.initialized = true;
    } else {
      this.target.lerp(playerPosition, smoothing);
    }

    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.distance,
      Math.max(0.55, this.target.y + 1.6 + sp * this.distance),
      this.target.z + Math.cos(this.yaw) * cp * this.distance
    );
    this.camera.lookAt(this.target.x, this.target.y + 1.35, this.target.z);
  }

  getYaw(): number {
    return this.yaw;
  }
}
