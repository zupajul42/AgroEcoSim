import { useEffect, useRef, useState } from "preact/hooks";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  GridHelper,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  ShapeUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Leaf, LeafLayout, LeafLayoutType, LeafShape, Petiole } from "../../types/leaf";
import { state } from "../../pages/AppState";
import { generateFoldedMeshOutline, veinTreeHasFold } from "../../utils/veinGenerator";
import { applyMarginTeethToFoldedOutline, applyMarginTeethToOutline } from "../../utils/marginTeeth";
import { resolveLodGeom, resolveLodScale } from "../../utils/lod";

import { vec3, mat4 } from "gl-matrix";

interface PreviewProps {
  leaf: Leaf;
  width?: string;
  height?: string;
  controls?: boolean;
  showAxis?: boolean;
  lod?: number;
  meshCallback?: (mesh: { position: number[]; index: number[] }) => {};
}

export function Preview({ leaf, width, height, controls, showAxis, lod = 0, meshCallback }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const threeRef = useRef<{
    scene: Scene;
    leaf?: Mesh;
    camera?: PerspectiveCamera;
    controls?: OrbitControls;
  } | null>(null);

  // One Time Three Setup:
  useEffect(() => {
    // Read accent color from CSS
    const accentHex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4e7711";
    const accentInt = parseInt(accentHex.replace("#", ""), 16);

    // Scene init
    const material = new MeshBasicMaterial({ color: accentInt, side: DoubleSide });
    material.color.multiplyScalar(0.5);

    threeRef.current = {
      scene: new Scene(),
      leaf: new Mesh(new BoxGeometry(), material),
    };

    threeRef.current.scene.add(threeRef.current.leaf);

    if (showAxis) {
      const axes = new AxesHelper(100);
      axes.translateY(0.01);
      const grid = new GridHelper(10);
      threeRef.current.scene.add(axes, grid);
    }

    const ambientLight = new AmbientLight(0xffffff, 0.5);
    const pointLight = new PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    threeRef.current.scene.add(ambientLight, pointLight);

    // Renderer init

    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 4, 10);
    threeRef.current.camera = camera;

    const renderer = new WebGLRenderer({
      canvas: canvasRef.current as HTMLCanvasElement,
      antialias: true,
      alpha: true,
    });
    //renderer.setPixelRatio(2);

    // Resize handling
    const handleResize = () => {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        renderer.setSize(container.clientWidth, container.clientHeight, false);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
      });
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current as HTMLDivElement);

    handleResize();

    let orbitCtrls: OrbitControls;
    if (controls) {
      orbitCtrls = new OrbitControls(camera, renderer.domElement);
      orbitCtrls.enableDamping = true;
    }
    threeRef.current.controls = orbitCtrls;

    let requestId: number;
    const render = () => {
      orbitCtrls?.update();
      renderer.render(threeRef.current.scene, camera);
      requestId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(requestId);
      resizeObserver.disconnect();
      renderer.dispose();
      orbitCtrls?.dispose();
      threeRef.current = null;
    };
  }, []);

  // On leaf change -> update the mesh
  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.leaf) return;

    const rawMesh = generateMesh(leaf, lod);

    const geom = new BufferGeometry();
    console.log(rawMesh.position);
    geom.setAttribute("position", new BufferAttribute(new Float32Array(rawMesh.position), 3));
    geom.setIndex(rawMesh.index);

    const oldGeom = three.leaf.geometry;
    three.leaf.geometry = geom;
    if (oldGeom) oldGeom.dispose();

    // Auto-fit camera to bounding box
    if (three.camera && rawMesh.position.length > 0) {
      geom.computeBoundingBox();
      const bb = geom.boundingBox;
      if (bb) {
        const center = new Vector3();
        bb.getCenter(center);
        const size = new Vector3();
        bb.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.1);
        const fov = three.camera.fov * (Math.PI / 180);
        const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.3;

        three.camera.position.set(center.x, center.y, center.z + dist);
        three.camera.lookAt(center);
        if (three.controls) {
          three.controls.target.copy(center);
          three.controls.update();
        }
      }
    }

    if (meshCallback) meshCallback(rawMesh);
  }, [leaf, lod]);

  return (
    <div
      class="preview"
      ref={containerRef}
      style={{ position: "relative", width: width ?? "100%", height: height ?? "100%" }}
    >
      <canvas
        style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%" }}
        ref={canvasRef}
      ></canvas>
    </div>
  );
}

function calculateLeafletTransform(index: number, count: number, petiole: Petiole, layout?: LeafLayout) {
  const { type, arrangement, terminalLeaf, angle, distributionCurve = 1 } = layout ?? {
    type: "palmate",
    arrangement: "alternate",
    angle: 60,
    terminalLeaf: true,
  };
  const petioleLength = petiole.len || 100;
  const petioleWidth = petiole.width || 1;
  const petioleWidthHalf = petioleWidth / 2;
  const angleRad = ((angle ?? 0) * Math.PI) / 180;

  const position = new Vector3();
  const rotation = new Vector3();

  if (type === "palmate") {
    position.set(0, petioleLength, 0);

    const startAngle = -angleRad / 2;
    const endAngle = angleRad / 2;

    let currentAngle: number;
    if (count === 1) currentAngle = 0;
    else currentAngle = startAngle + (index / (count - 1)) * (endAngle - startAngle);

    rotation.z = currentAngle;
  } else if (type === "pinnate") {
    const hasTerminal = terminalLeaf && count % 2 !== 0;

    if (hasTerminal && index === count - 1) {
      position.set(0, petioleLength, 0);
      rotation.z = 0;
    } else {
      const sideLeafletsCount = hasTerminal ? count - 1 : count;
      const isLeft = index % 2 === 0;
      const branchAngle = angleRad;
      rotation.z = isLeft ? branchAngle : -branchAngle;
      position.x = petioleWidthHalf * (isLeft ? -1 : 1);

      const maxH = 0.95;
      const minH = 0;
      const growthRange = Math.max(0.02, Math.min(1, distributionCurve));
      const rangeMinH = maxH - growthRange * (maxH - minH);
      const easeHeight = (t: number) => rangeMinH + Math.max(0, Math.min(1, t)) * (maxH - rangeMinH);

      if (arrangement === "opposite") {
        // True pairs: left/right sit at the same height, one pair per rung up the petiole.
        const pairIndex = Math.floor(index / 2);
        const totalPairs = Math.ceil(sideLeafletsCount / 2);
        const t = totalPairs > 1 ? pairIndex / (totalPairs - 1) : 0;
        position.y = petioleLength * easeHeight(t);
      } else {
        // True alternate: every leaflet gets its own rung, sides just alternate by index —
        // so only ONE side ever reaches the topmost rung closest to the terminal leaf,
        // instead of a left/right pair both crowding near it.
        const t = sideLeafletsCount > 1 ? index / (sideLeafletsCount - 1) : 0;
        position.y = petioleLength * easeHeight(t);
      }
    }
  }

  return { position, rotation };
}

function generateBoxBuffer(width: number, length: number, height: number = 0.08) {
  const hw = width / 2;
  const hh = height / 2;

  const position = [
    ...[-hw, 0, hh, hw, 0, hh, hw, length, hh, -hw, length, hh], // Front face
    ...[-hw, 0, -hh, -hw, length, -hh, hw, length, -hh, hw, 0, -hh], // Back face,
    ...[-hw, length, -hh, -hw, length, hh, hw, length, hh, hw, length, -hh], // Top face
    ...[-hw, 0, -hh, hw, 0, -hh, hw, 0, hh, -hw, 0, hh], // Bottom face
    ...[hw, 0, -hh, hw, length, -hh, hw, length, hh, hw, 0, hh], // Right face
    ...[-hw, 0, -hh, -hw, 0, hh, -hw, length, hh, -hw, length, -hh], // Left face
  ];

  const index = [
    ...[0, 1, 2, 0, 2, 3],
    ...[4, 5, 6, 4, 6, 7],
    ...[8, 9, 10, 8, 10, 11],
    ...[12, 13, 14, 12, 14, 15],
    ...[16, 17, 18, 16, 18, 19],
    ...[20, 21, 22, 20, 22, 23],
  ];

  return { position, index };
}

export function generateShapeMesh(shape: LeafShape, lod: number = 0) {
  const geomId = resolveLodGeom(shape?.geom, lod);
  if (!shape || !geomId) return { position: [], index: [] };
  const normalizedGeom = state.geoms.getNormalized(geomId);
  const rawPoints = normalizedGeom?.points;
  if (!rawPoints || rawPoints.length < 3) return { position: [], index: [] };

  const rawGeom = state.geoms.get(geomId);
  const veins = rawGeom?.veins;
  const marginType = rawGeom?.margin;

  if (rawGeom && veins?.root && veinTreeHasFold(veins.root)) {
    const bounds = { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity } };
    for (const p of rawGeom.points) {
      if (p.x < bounds.x.min) bounds.x.min = p.x;
      if (p.x > bounds.x.max) bounds.x.max = p.x;
      if (p.y < bounds.y.min) bounds.y.min = p.y;
      if (p.y > bounds.y.max) bounds.y.max = p.y;
    }
    const scale = Math.max(bounds.x.max - bounds.x.min, bounds.y.max - bounds.y.min, 0.0001);

    const folded = generateFoldedMeshOutline(veins, { mirrorX: true, params: veins.params }).map((p) => ({
      x: p.x / scale,
      y: p.y / scale,
      z: p.z / scale,
    }));
    const toothed = applyMarginTeethToFoldedOutline(folded, marginType);

    if (toothed.length >= 3) {
      const position: number[] = [0, 0, 0];
      toothed.forEach((p) => position.push(p.x, p.y, p.z));

      const index: number[] = [];
      const n = toothed.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        index.push(0, i + 1, j + 1);
      }

      return { position, index };
    }
  }

  const toothedPoints = applyMarginTeethToOutline(rawPoints, marginType);
  const adjusted = toothedPoints.map((p) => new Vector2(p.x, p.y));

  const faces = ShapeUtils.triangulateShape(adjusted, []);
  const position: number[] = [];
  const index: number[] = [];

  adjusted.forEach((pt) => position.push(pt.x, pt.y, 0));
  faces.forEach((face) => index.push(face[0], face[1], face[2]));

  return { position, index };
}

export function generateMesh(leaf: Leaf, lod: number = 0) {
  if (!leaf) return { position: [], index: [] };

  // generate buffers (TRIANGLES, indexed)

  const combinedPositions: number[] = [];
  const combinedIndices: number[] = [];
  let vertexOffset = 0;

  const mergeSubMesh = (meshData: { position: number[]; index: number[] }, transformMatrix: mat4) => {
    if (!meshData || !meshData.position || !meshData.index) return;
    const tempVec = vec3.create();

    for (let i = 0; i < meshData.position.length; i += 3) {
      vec3.set(tempVec, meshData.position[i], meshData.position[i + 1], meshData.position[i + 2]);
      vec3.transformMat4(tempVec, tempVec, transformMatrix);
      combinedPositions.push(tempVec[0], tempVec[1], tempVec[2]);
    }

    for (let i = 0; i < meshData.index.length; i++) combinedIndices.push(meshData.index[i] + vertexOffset);
    vertexOffset += meshData.position.length / 3;
  };

  // + petiole
  const petioleLength = leaf.petiole?.len || 1;
  const petioleWidth = leaf.petiole?.width || 0.2;
  const petioleMesh = generateBoxBuffer(petioleWidth, petioleLength, 0.1);

  const petioleMatrix = mat4.create();
  mergeSubMesh(petioleMesh, petioleMatrix);

  // + all leaflets on corrent postions (calculateLeafletTransform)
  const mainShape =
    leaf.shape && leaf.shape[0]
      ? leaf.shape[0]
      : { geom: ["def:obovate"], petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 } };
  const petioluleLength = mainShape.petiolule?.len || 0.0;
  const petioluleWidth = mainShape.petiolule?.width || 0.0;
  const localPetioluleAngleRad = -((mainShape.petiolule?.angle || 0) / 180) * Math.PI;

  //   + leaflet petiole
  const basePetioluleMesh = petioluleLength > 0 ? generateBoxBuffer(petioluleWidth, petioluleLength, 0.08) : null;

  //   + leaflet shape — stretched independently on x/y per LOD, so one geometry can stand
  //   in for several slightly different LODs instead of needing a near-duplicate each time.
  const baseLeafShapeMesh = generateShapeMesh(mainShape as LeafShape, lod);
  const bladeScaleX = resolveLodScale((mainShape as LeafShape).scaleX, lod);
  const bladeScaleY = resolveLodScale((mainShape as LeafShape).scaleY, lod);
  if (bladeScaleX !== 1 || bladeScaleY !== 1) {
    for (let i = 0; i < baseLeafShapeMesh.position.length; i += 3) {
      baseLeafShapeMesh.position[i] *= bladeScaleX;
      baseLeafShapeMesh.position[i + 1] *= bladeScaleY;
    }
  }

  const instances = leaf.instances && leaf.instances.length > 0 ? leaf.instances : [{ shape: 0, scale: 1 }];

  instances.forEach((instance: any, index: number) => {
    const { position, rotation } = calculateLeafletTransform(index, instances.length, leaf.petiole, leaf.layout);
    const scale = instance.scale || 1.0;

    const baseMatrix = mat4.create();
    mat4.translate(baseMatrix, baseMatrix, [position.x, position.y, position.z]);
    mat4.rotateZ(baseMatrix, baseMatrix, rotation.z);
    mat4.scale(baseMatrix, baseMatrix, [scale, scale, scale]);

    if (basePetioluleMesh) {
      const petioluleMatrix = mat4.clone(baseMatrix);
      mat4.rotateX(petioluleMatrix, petioluleMatrix, localPetioluleAngleRad);
      mergeSubMesh(basePetioluleMesh, petioluleMatrix);
    }

    const bladeMatrix = mat4.clone(baseMatrix);
    mat4.rotateX(bladeMatrix, bladeMatrix, localPetioluleAngleRad);
    mat4.translate(bladeMatrix, bladeMatrix, [0, petioluleLength, 0]);
    mergeSubMesh(baseLeafShapeMesh, bladeMatrix);
  });

  // + General rotations
  const globalAngleRad = -((leaf.petiole.angle || 0) / 180) * Math.PI;
  const globalMatrix = mat4.create();
  mat4.rotateX(globalMatrix, globalMatrix, globalAngleRad);

  const tempVec = vec3.create();
  for (let i = 0; i < combinedPositions.length; i += 3) {
    vec3.set(tempVec, combinedPositions[i], combinedPositions[i + 1], combinedPositions[i + 2]);
    vec3.transformMat4(tempVec, tempVec, globalMatrix);
    combinedPositions[i] = tempVec[0];
    combinedPositions[i + 1] = tempVec[1];
    combinedPositions[i + 2] = tempVec[2];
  }

  return {
    position: combinedPositions,
    index: combinedIndices,
  };
}

// simplyfied GEMINI:
export function meshToObjString(mesh: { position: number[]; index: number[] }, objectName: string = "Leaf"): string {
  const { position, index } = mesh;
  const lines: string[] = [];

  lines.push(`# Exported Leaf Mesh`);
  lines.push(`o ${objectName}`);

  for (let i = 0; i < position.length; i += 3) {
    const x = position[i].toFixed(6);
    const y = position[i + 1].toFixed(6);
    const z = position[i + 2].toFixed(6);
    lines.push(`v ${x} ${y} ${z}`);
  }

  for (let i = 0; i < index.length; i += 3) {
    const i1 = index[i] + 1;
    const i2 = index[i + 1] + 1;
    const i3 = index[i + 2] + 1;

    lines.push(`f ${i1} ${i2} ${i3}`);
  }

  return lines.join("\n");
}
