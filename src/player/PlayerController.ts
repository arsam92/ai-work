import * as THREE from "three";
import type { EventBus } from "../core/EventBus";

export class PlayerController {
  readonly object = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly limbs: THREE.Object3D[] = [];
  private readonly velocity = new THREE.Vector3();
  private phase = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly isDown: (action: "forward" | "back" | "left" | "right" | "run") => boolean,
    private readonly getCameraYaw: () => number
  ) {
    this.object.name = "Elias";
    this.object.add(this.body);

    const coat = new THREE.MeshLambertMaterial({ color: 0x3a433d });
    const pants = new THREE.MeshLambertMaterial({ color: 0x191f1b });
    const skin = new THREE.MeshLambertMaterial({ color: 0x806e5e });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.32), coat);
    torso.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin);
    head.position.y = 1.82;

    const limb = (x: number, y: number, width: number, height: number, material: THREE.Material): THREE.Mesh => {
      const geometry = new THREE.BoxGeometry(width, height, width);
      geometry.translate(0, -height / 2, 0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0);
      return mesh;
    };

    const armL = limb(-0.31, 1.48, 0.12, 0.6, coat);
    const armR = limb(0.31, 1.48, 0.12, 0.6, coat);
    const legL = limb(-0.13, 0.9, 0.16, 0.95, pants);
    const legR = limb(0.13, 0.9, 0.16, 0.95, pants);

    [torso, head, armL, armR, legL, legR].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.body.add(mesh);
    });
    this.limbs.push(armL, armR, legL, legR);
  }

  update(dt: number): void {
    const yaw = this.getCameraYaw();
    const x = (this.isDown("right") ? 1 : 0) - (this.isDown("left") ? 1 : 0);
    const z = (this.isDown("back") ? 1 : 0) - (this.isDown("forward") ? 1 : 0);

    let mx = 0;
    let mz = 0;
    if (x !== 0 || z !== 0) {
      const length = Math.hypot(x, z);
      const ix = x / length;
      const iz = z / length;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = -fz;
      const rz = fx;
      mx = fx * iz + rx * ix;
      mz = fz * iz + rz * ix;
    }

    const speed = this.isDown("run") ? 6 : 3.15;
    const target = new THREE.Vector3(mx * speed, 0, mz * speed);
    const factor = 1 - Math.exp(-10 * dt);
    this.velocity.lerp(target, factor);

    this.object.position.x = THREE.MathUtils.clamp(this.object.position.x + this.velocity.x * dt, -5.4, 5.4);
    this.object.position.z = THREE.MathUtils.clamp(this.object.position.z + this.velocity.z * dt, -68, 68);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.15) {
      const targetHeading = Math.atan2(this.velocity.x, this.velocity.z);
      const difference = THREE.MathUtils.euclideanModulo(targetHeading - this.object.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.object.rotation.y += difference * factor;
    }

    this.phase += dt * (4 + horizontalSpeed * 1.2);
    const swing = Math.sin(this.phase) * Math.min(0.6, horizontalSpeed / 5);
    this.limbs[0].rotation.x = -swing;
    this.limbs[1].rotation.x = swing;
    this.limbs[2].rotation.x = swing;
    this.limbs[3].rotation.x = -swing;
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.045 * Math.min(1, horizontalSpeed / 3);

    this.bus.emit("player.moved", { position: this.object.position.clone(), speed: horizontalSpeed });
  }
}