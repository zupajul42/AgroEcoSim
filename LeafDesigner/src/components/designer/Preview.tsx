import { useEffect, useRef, useState } from "preact/hooks";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  GridHelper,
  DirectionalLight,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
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
import { generateVeinMesh } from "../../utils/veinGenerator";
import { applyMarginTeethToOutline, marginOutlineShaper } from "../../utils/marginTeeth";
import { resolveLodGeom, resolveLodScale } from "../../utils/lod";
import { resolveRandomValue } from "../../utils/random";

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
  meshCallback?: (mesh: { position: number[]; index: number[] }) => {};
}

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
  meshCallback,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const threeRef = useRef<{
    scene: Scene;
    leaf?: Mesh;
    light?: DirectionalLight;
    camera?: PerspectiveCamera;
    controls?: OrbitControls;
  } | null>(null);

  // One Time Three Setup:
  useEffect(() => {
    // Read accent color from CSS
    const accentHex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4e7711";
    const accentInt = parseInt(accentHex.replace("#", ""), 16);

    // Scene init
    const material = new MeshLambertMaterial({ color: accentInt, side: DoubleSide });
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

    const ambientLight = new AmbientLight(0xffffff, 0.6);
    const dirLight = new DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(10, 10, 10);
    threeRef.current.light = dirLight;
    threeRef.current.scene.add(ambientLight, dirLight);

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

  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.leaf) return;
    const material = three.leaf.material as MeshLambertMaterial;
    if (color) {
      material.color.set(color);
    } else {
      const accentHex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4e7711";
      material.color.set(accentHex);
      material.color.multiplyScalar(0.5);
    }
  }, [color]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.leaf) return;
    (three.leaf.material as MeshLambertMaterial).wireframe = !!wireframe;
  }, [wireframe]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.leaf) return;
    const material = three.leaf.material as MeshLambertMaterial;
    material.flatShading = !!flatShading;
    material.needsUpdate = true;
  }, [flatShading]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.light) return;
    const rad = (lightAngle * Math.PI) / 180;
    const radius = 14.14; // matches the original fixed (10, 10, 10) light's horizontal distance
    three.light.position.set(Math.cos(rad) * radius, 10, Math.sin(rad) * radius);
  }, [lightAngle]);

  // On leaf change -> update the mesh
  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.leaf) return;

    const rawMesh = generateMesh(leaf, lod);

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(new Float32Array(rawMesh.position), 3));
    geom.setIndex(rawMesh.index);
    geom.computeVertexNormals();

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

function calculateLeafletTransform(
  index: number,
  count: number,
  petiole: Petiole,
  layout?: LeafLayout,
  seed = 0,
) {
  const { type, arrangement, terminalLeaf, angle, distributionCurve = 1 } = layout ?? {
    type: "palmate",
    arrangement: "alternate",
    angle: 60,
    terminalLeaf: true,
  };
  const petioleLength = petiole.len ?? 100; // allow 0 -> no stem
  const petioleWidth = petiole.width || 1;
  const petioleWidthHalf = petioleWidth / 2;
  const resolvedAngle = resolveRandomValue(angle, seed, "angle", type === "palmate" ? 0 : index, 0);
  const angleRad = (resolvedAngle * Math.PI) / 180;

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
    -hw, 0, hh, //0 front-bottom-left
    hw, 0, hh, //1 front-bottom-right
    hw, length, hh, //2 front-top-right
    -hw, length, hh, //3 front-top-left
    -hw, 0, -hh, //4 back-bottom-left
    hw, 0, -hh, //5 back-bottom-right
    hw, length, -hh, //6 back-top-right
    -hw, length, -hh, //7 back-top-left
  ];

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
  return generateShapeMesh({ geom: [geomId], petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 } }).index.length / 3;
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
  const toothSize = rawGeom?.marginToothSize ?? 1;
  const toothDepth = rawGeom?.marginToothDepth ?? 1;

  // when no veins are present, we can just use the raw "flat" geometry
  if (rawGeom && veins?.root && veins.root.children.length > 0) {
    const bounds = { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity } };
    for (const p of rawGeom.points) {
      if (p.x < bounds.x.min) bounds.x.min = p.x;
      if (p.x > bounds.x.max) bounds.x.max = p.x;
      if (p.y < bounds.y.min) bounds.y.min = p.y;
      if (p.y > bounds.y.max) bounds.y.max = p.y;
    }
    const scale = Math.max(bounds.x.max - bounds.x.min, bounds.y.max - bounds.y.min, 0.0001);

    const built = generateVeinMesh(veins, {
      mirrorX: true,
      params: veins.params,
      shapeOutline: marginOutlineShaper(marginType, toothSize, toothDepth, veins.params?.subdivisions),
    });

    return { position: built.position.map((v) => v / scale), index: built.index };
  }

  const toothedPoints = applyMarginTeethToOutline(rawPoints, marginType, toothSize, toothDepth);
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

  const petioleLength = leaf.petiole?.len ?? 1;
  const petioleWidth = leaf.petiole?.width || 0.2;

  if (petioleLength > 0) {
    const petioleMesh = generateBoxBuffer(petioleWidth, petioleLength, petioleWidth);
    const petioleMatrix = mat4.create();
    mergeSubMesh(petioleMesh, petioleMatrix);
  }

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

  const baseLeafShapeMesh = generateShapeMesh(mainShape as LeafShape, lod);
  const rawBladeScaleX = resolveLodScale((mainShape as LeafShape).scaleX, lod);
  const rawBladeScaleY = resolveLodScale((mainShape as LeafShape).scaleY, lod);

  const instances = leaf.instances && leaf.instances.length > 0 ? leaf.instances : [{ shape: 0, scale: 1 }];
  const seed = leaf.randomSeed ?? 0;

  instances.forEach((instance: any, index: number) => {
    const { position, rotation } = calculateLeafletTransform(
      index,
      instances.length,
      leaf.petiole,
      leaf.layout,
      seed,
    );
    const scale = resolveRandomValue(instance.scale, seed, "instanceScale", index, 1) + (instance.scaleOffset ?? 0);
    const bladeScaleX = resolveRandomValue(rawBladeScaleX, seed, "bladeScaleX", index, 1);
    const bladeScaleY = resolveRandomValue(rawBladeScaleY, seed, "bladeScaleY", index, 1);

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
    if (bladeScaleX !== 1 || bladeScaleY !== 1) mat4.scale(bladeMatrix, bladeMatrix, [bladeScaleX, bladeScaleY, 1]);
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
