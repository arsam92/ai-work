import * as THREE from "three";
import type { EventBus } from "../core/EventBus";

export interface Interactable {
  id: string;
  label: string;
  position: THREE.Vector3;
  activate: () => void;
}

export class InteractionSystem {
  private readonly raycaster = new THREE.Raycaster();
  private readonly center = new THREE.Vector2(0, 0);
  private interactables: Interactable[] = [];
  private current: Interactable | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly player: THREE.Object3D,
    private readonly bus: EventBus
  ) {
    this.bus.on("input.interact", () => {
      if (this.current) {
        this.current.activate();
        this.bus.emit("interaction.used", { id: this.current.id });
      }
    });
  }

  register(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  update(): void {
    let nearest: Interactable | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const item of this.interactables) {
      const distance = item.position.distanceTo(this.player.position);
      if (distance < 3.2 && distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }

    if (nearest?.id !== this.current?.id) {
      this.current = nearest;
      this.bus.emit("interaction.available", nearest ? { id: nearest.id, label: nearest.label } : null);
    }
  }

  getCurrent(): Interactable | null {
    return this.current;
  }

  // Reserved for future object-based interaction. Keeping the probe here avoids
  // coupling the dialogue system to Three.js scene traversal.
  probe(objects: THREE.Object3D[]): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(objects, true);
    return hits[0]?.object ?? null;
  }
}
