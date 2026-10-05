import * as THREE from "three";

export interface RendererHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize(): void;
}

export function createRenderer(container: HTMLElement): RendererHandle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a09);
  scene.fog = new THREE.FogExp2(0x060a09, 0.018);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 4, 7);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const resize = (): void => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  window.addEventListener("resize", resize);
  resize();

  return { renderer, scene, camera, resize };
}
