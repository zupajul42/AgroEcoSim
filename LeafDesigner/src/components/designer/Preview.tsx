import { useEffect, useRef } from "preact/hooks";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  GridHelper,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  ShapeUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Leaf, LeafLayout, LeafShape, MeshData, Petiole } from "../../types/leaf";
import { state } from "../../pages/AppState";
import { generateVeinMesh } from "../../utils/veinGenerator";
import { applyMarginTeethToOutline, marginOutlineShaper } from "../../utils/marginTeeth";
import { resolveLodGeom, resolveLodScale } from "../../utils/lod";
import { resolveRandomValue } from "../../utils/random";
import { clamp01, size } from "../../utils/math";
import { vec3, mat4 } from "gl-matrix";

interface PreviewProps {
  leaf: Leaf;
  width?: string;
  height?: string;
  controls?: boolean;
  showAxis?: boolean;
  lod?: number;
  color?: string;
  wireframe?: boolean;
  flatShading?: boolean;
  lightAngle?: number;
  onMesh?: (mesh: MeshData) => void;
}

const EMPTY_MESH: MeshData = { position: [], index: [] };
const NO_STEM: Petiole = { len: 0, width: 0, x: 0, y: 0, angle: 0 };

const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4e7711";

/** Three.js view of a leaf; the camera re-fits whenever the mesh changes. */
export function Preview({
  leaf,
  width,
  height,
  controls,
  showAxis,
  lod = 0,
  color,
  wireframe,
  flatShading,
  lightAngle = 45,
  onMesh,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeRef = useRef<{
    scene: Scene;
    leaf: Mesh;
    light: DirectionalLight;
    camera: PerspectiveCamera;
    controls?: OrbitControls;
  } | null>(null);

  useEffect(() => {
    const material = new MeshLambertMaterial({ color: accentColor(), side: DoubleSide });
    material.color.multiplyScalar(0.5);
    const scene = new Scene();
    const leafMesh = new Mesh(new BoxGeometry(), material);
    scene.add(leafMesh);

    if (showAxis) {
      const axes = new AxesHelper(100);
      axes.translateY(0.01);
      scene.add(axes, new GridHelper(10));
    }

    const light = new DirectionalLight(0xffffff, 2.2);
    light.position.set(10, 10, 10);
    scene.add(new AmbientLight(0xffffff, 0.6), light);

    const container = containerRef.current!;
    const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 4, 10);
    const renderer = new WebGLRenderer({ canvas: canvasRef.current!, antialias: true, alpha: true });

    const resize = () => {
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        renderer.setSize(el.clientWidth, el.clientHeight, false);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      });
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let orbit: OrbitControls | undefined;
    if (controls) {
      orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
    }
    threeRef.current = { scene, leaf: leafMesh, light, camera, controls: orbit };

    let requestId: number;
    const render = () => {
      orbit?.update();
      renderer.render(scene, camera);
      requestId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(requestId);
      resizeObserver.disconnect();
      renderer.dispose();
      orbit?.dispose();
      threeRef.current = null;
    };
  }, []);

  const material = () => threeRef.current?.leaf.material as MeshLambertMaterial | undefined;

  useEffect(() => {
    const m = material();
    if (!m) return;
    m.color.set(color || accentColor());
    if (!color) m.color.multiplyScalar(0.5);
  }, [color]);

  useEffect(() => {
    const m = material();
    if (m) m.wireframe = !!wireframe;
  }, [wireframe]);

  useEffect(() => {
    const m = material();
    if (!m) return;
    m.flatShading = !!flatShading;
    m.needsUpdate = true;
  }, [flatShading]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    const rad = (lightAngle * Math.PI) / 180;
    const radius = 14.14; // horizontal distance of the original (10, 10, 10) light
    three.light.position.set(Math.cos(rad) * radius, 10, Math.sin(rad) * radius);
  }, [lightAngle]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;

    const mesh = generateMesh(leaf, lod);
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(new Float32Array(mesh.position), 3));
    geom.setIndex(mesh.index);
    geom.computeVertexNormals();
    three.leaf.geometry.dispose();
    three.leaf.geometry = geom;

    if (mesh.position.length > 0) {
      geom.computeBoundingBox();
      const center = new Vector3();
      const extent = new Vector3();
      geom.boundingBox!.getCenter(center);
      geom.boundingBox!.getSize(extent);
      const maxDim = Math.max(extent.x, extent.y, extent.z, 0.1);
      const fov = three.camera.fov * (Math.PI / 180);
      const distance = (maxDim / 2 / Math.tan(fov / 2)) * 1.3;
      three.camera.position.set(center.x, center.y, center.z + distance);
      three.camera.lookAt(center);
      if (three.controls) {
        three.controls.target.copy(center);
        three.controls.update();
      }
    }

    onMesh?.(mesh);
  }, [leaf, lod]);

  return (
    <div
      class="preview"
      ref={containerRef}
      style={{ position: "relative", width: width ?? "100%", height: height ?? "100%" }}
    >
      <canvas style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%" }} ref={canvasRef} />
    </div>
  );
}

// Where leaflet `index` of `count` sits on the petiole and how it is turned.
function leafletTransform(
  index: number,
  count: number,
  petiole: Petiole,
  layout: LeafLayout | undefined,
  seed: number,
) {
  const {
    type,
    arrangement,
    terminalLeaf,
    angle,
    distributionCurve = 1,
  } = layout ?? {
    type: "palmate",
    arrangement: "alternate",
    angle: 60,
    terminalLeaf: true,
  };
  const petioleLength = petiole.len ?? 100;
  const angleRad = (resolveRandomValue(angle, seed, "angle", type === "palmate" ? 0 : index, 0) * Math.PI) / 180;

  const position = new Vector3();
  let rotationZ = 0;

  if (type === "palmate") {
    position.set(0, petioleLength, 0);
    rotationZ = count === 1 ? 0 : -angleRad / 2 + (index / (count - 1)) * angleRad;
  } else if (type === "pinnate") {
    const hasTerminal = terminalLeaf && count % 2 !== 0;
    if (hasTerminal && index === count - 1) {
      position.set(0, petioleLength, 0);
    } else {
      const sideCount = hasTerminal ? count - 1 : count;
      const isLeft = index % 2 === 0;
      rotationZ = isLeft ? angleRad : -angleRad;
      position.x = ((petiole.width || 1) / 2) * (isLeft ? -1 : 1);

      // Leaflets spread over the top `distributionCurve` share of the petiole, ending at 95%.
      const maxH = 0.95;
      const minH = maxH - Math.max(0.02, Math.min(1, distributionCurve)) * maxH;
      const heightAt = (t: number) => minH + clamp01(t) * (maxH - minH);
      if (arrangement === "opposite") {
        const pairIndex = Math.floor(index / 2);
        const totalPairs = Math.ceil(sideCount / 2);
        position.y = petioleLength * heightAt(totalPairs > 1 ? pairIndex / (totalPairs - 1) : 0);
      } else {
        position.y = petioleLength * heightAt(sideCount > 1 ? index / (sideCount - 1) : 0);
      }
    }
  }

  return { position, rotationZ };
}

// An axis-aligned box from y = 0 to y = length, centered on x and z.
function boxMesh(width: number, length: number, height: number): MeshData {
  const hw = width / 2;
  const hh = height / 2;
  // Corners 0-3 on the front face (z = +hh), 4-7 on the back, each going around from bottom-left.
  const corners = [
    [-hw, 0],
    [hw, 0],
    [hw, length],
    [-hw, length],
  ];
  const position = [hh, -hh].flatMap((z) => corners.flatMap(([x, y]) => [x, y, z]));
  const index = [
    ...[0, 1, 2, 0, 2, 3], // front
    ...[4, 7, 6, 4, 6, 5], // back
    ...[7, 3, 2, 7, 2, 6], // top
    ...[4, 5, 1, 4, 1, 0], // bottom
    ...[5, 6, 2, 5, 2, 1], // right
    ...[4, 0, 3, 4, 3, 7], // left
  ];
  return { position, index };
}

export function geometryTriangleCount(geomId: string): number {
  return generateShapeMesh({ geom: [geomId], petiolule: NO_STEM }).index.length / 3;
}

// The blade of one shape at `lod`, scaled so its larger side is 1 with the base at the origin.
// With veins the blade is built over the vein tree, otherwise the outline is triangulated flat.
function generateShapeMesh(shape: LeafShape, lod = 0): MeshData {
  const geom = state.geoms.get(resolveLodGeom(shape?.geom, lod) ?? "");
  if (!geom || geom.points.length < 3) return EMPTY_MESH;
  const scale = Math.max(size(geom.points), 0.0001);
  const { veins, margin, marginToothSize: toothSize = 1, marginToothDepth: toothDepth = 1 } = geom;

  let mesh: MeshData;
  if (veins?.root && veins.root.children.length > 0) {
    mesh = generateVeinMesh(veins, {
      mirrorX: true,
      params: veins.params,
      shapeOutline: marginOutlineShaper(margin, toothSize, toothDepth, veins.params?.subdivisions),
    });
  } else {
    const outline = applyMarginTeethToOutline(geom.points, margin, toothSize, toothDepth).map(
      (p) => new Vector2(p.x, p.y),
    );
    mesh = {
      position: outline.flatMap((p) => [p.x, p.y, 0]),
      index: ShapeUtils.triangulateShape(outline, []).flat(),
    };
  }
  return { position: mesh.position.map((v) => v / scale), index: mesh.index };
}

/**
 * The whole leaf: an upright petiole, then every leaflet with its petiolule and blade. The petiole angle
 * tilts the leaflets away from the petiole at their attachment points; the petiole itself stays upright.
 */
export function generateMesh(leaf: Leaf, lod = 0): MeshData {
  if (!leaf) return EMPTY_MESH;

  const position: number[] = [];
  const index: number[] = [];
  const append = (mesh: MeshData, matrix: mat4) => {
    const offset = position.length / 3;
    const v = vec3.create();
    for (let i = 0; i < mesh.position.length; i += 3) {
      vec3.transformMat4(v, [mesh.position[i], mesh.position[i + 1], mesh.position[i + 2]], matrix);
      position.push(v[0], v[1], v[2]);
    }
    for (const i of mesh.index) index.push(i + offset);
  };

  const petioleLength = leaf.petiole?.len ?? 1;
  const petioleWidth = leaf.petiole?.width || 0.2;
  const petioleAngleRad = -((leaf.petiole?.angle || 0) / 180) * Math.PI;
  if (petioleLength > 0) append(boxMesh(petioleWidth, petioleLength, petioleWidth), mat4.create());

  const shape: LeafShape = leaf.shape?.[0] ?? { geom: ["def:obovate"], petiolule: NO_STEM };
  const petioluleLength = shape.petiolule?.len || 0;
  const petioluleAngleRad = -((shape.petiolule?.angle || 0) / 180) * Math.PI;
  const petioluleMesh =
    petioluleLength > 0 ? boxMesh(shape.petiolule.width || 0, petioluleLength, shape.petiolule.width || 0) : null;
  const bladeMesh = generateShapeMesh(shape, lod);
  const bladeScaleX = resolveLodScale(shape.scaleX, lod);
  const bladeScaleY = resolveLodScale(shape.scaleY, lod);

  const instances = leaf.instances?.length ? leaf.instances : [{ shape: 0, scale: 1 }];
  const seed = leaf.randomSeed ?? 0;
  instances.forEach((instance, i) => {
    const { position, rotationZ } = leafletTransform(i, instances.length, leaf.petiole, leaf.layout, seed);
    const scale = resolveRandomValue(instance.scale, seed, "instanceScale", i, 1) + (instance.scaleOffset ?? 0);
    const scaleX = resolveRandomValue(bladeScaleX, seed, "bladeScaleX", i, 1);
    const scaleY = resolveRandomValue(bladeScaleY, seed, "bladeScaleY", i, 1);

    const base = mat4.create();
    mat4.translate(base, base, [position.x, position.y, position.z]);
    mat4.rotateX(base, base, petioleAngleRad);
    mat4.rotateZ(base, base, rotationZ);
    mat4.scale(base, base, [scale, scale, scale]);
    mat4.rotateX(base, base, petioluleAngleRad);
    if (petioluleMesh) append(petioluleMesh, base);

    const blade = mat4.clone(base);
    mat4.translate(blade, blade, [0, petioluleLength, 0]);
    if (scaleX !== 1 || scaleY !== 1) mat4.scale(blade, blade, [scaleX, scaleY, 1]);
    append(bladeMesh, blade);
  });

  return { position, index };
}

/** Wavefront OBJ text of the mesh (1-based indices). */
export function meshToObjString(mesh: MeshData, objectName = "Leaf"): string {
  const lines = [`# Exported Leaf Mesh`, `o ${objectName}`];
  for (let i = 0; i < mesh.position.length; i += 3) {
    lines.push(
      `v ${mesh.position[i].toFixed(6)} ${mesh.position[i + 1].toFixed(6)} ${mesh.position[i + 2].toFixed(6)}`,
    );
  }
  for (let i = 0; i < mesh.index.length; i += 3) {
    lines.push(`f ${mesh.index[i] + 1} ${mesh.index[i + 1] + 1} ${mesh.index[i + 2] + 1}`);
  }
  return lines.join("\n");
}
