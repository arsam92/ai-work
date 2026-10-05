import * as THREE from "three";

export interface WorldObjects {
  root: THREE.Group;
  spawn: THREE.Vector3;
  interactables: THREE.Object3D[];
}

export function createWorld(scene: THREE.Scene): WorldObjects {
  const root = new THREE.Group();
  root.name = "Veyra";
  scene.add(root);

  const hemi = new THREE.HemisphereLight(0x9bb5ff, 0x161b16, 1.15);
  root.add(hemi);

  const street = new THREE.DirectionalLight(0xa9c2ff, 1.15);
  street.position.set(20, 28, -8);
  street.castShadow = true;
  street.shadow.mapSize.set(1024, 1024);
  street.shadow.camera.near = 1;
  street.shadow.camera.far = 90;
  street.shadow.camera.left = -30;
  street.shadow.camera.right = 30;
  street.shadow.camera.top = 30;
  street.shadow.camera.bottom = -30;
  root.add(street);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshLambertMaterial({ color: 0x111611 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 140),
    new THREE.MeshLambertMaterial({ color: 0x1a1c20 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.receiveShadow = true;
  root.add(road);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xb0a889 });
  for (let z = -62; z <= 62; z += 9) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.03, z);
    root.add(stripe);
  }

  for (let i = -7; i <= 7; i += 2) {
    for (const side of [-1, 1]) {
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(5, 8 + ((i + 7) % 4), 7),
        new THREE.MeshLambertMaterial({ color: side > 0 ? 0x232a27 : 0x1d2420 })
      );
      building.position.set(side * 8.2, building.geometry.parameters.height / 2, i * 8);
      building.castShadow = true;
      building.receiveShadow = true;
      root.add(building);
    }
  }

  const lampMat = new THREE.MeshLambertMaterial({ color: 0x30322f });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xd9ce9b });
  for (let z = -60; z <= 60; z += 16) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.5, 8), lampMat);
      pole.position.set(side * 6.7, 2.25, z);
      pole.castShadow = true;
      root.add(pole);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glowMat);
      bulb.position.set(side * 6.7, 4.5, z);
      root.add(bulb);
    }
  }

  return {
    root,
    spawn: new THREE.Vector3(0, 0, -48),
    interactables: []
  };
}
