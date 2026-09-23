import { Camera, Scene, Vector2, WebGLRenderer } from "three";

// The app's one WebGL context. Every Preview renders its scene here and copies the image onto
// its own 2D canvas, so any number of previews (the library cards) can be on screen at once
// without hitting the browser's limit on WebGL contexts.
let renderer: WebGLRenderer | null = null;
const currentSize = new Vector2();

function sharedRenderer(): WebGLRenderer {
  if (!renderer) {
    renderer = new WebGLRenderer({ canvas: document.createElement("canvas"), antialias: true, alpha: true });
  }
  return renderer;
}

/** Renders `scene` at the display size of `target` and draws the result onto it. */
export function renderTo(target: HTMLCanvasElement, scene: Scene, camera: Camera) {
  const width = target.clientWidth;
  const height = target.clientHeight;
  if (width === 0 || height === 0) return;

  const gl = sharedRenderer();
  gl.getSize(currentSize);
  if (currentSize.x !== width || currentSize.y !== height) gl.setSize(width, height, false);
  gl.render(scene, camera);

  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(gl.domElement, 0, 0);
}
