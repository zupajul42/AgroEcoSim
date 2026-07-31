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
  MeshStandardMaterial,
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
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Leaf, LeafLayout, LeafLayoutType, LeafShape, Petiole } from "../../types/leaf";
import { exponentialHeightFogFactor } from "three/src/nodes/TSL.js";
import { state } from "../../pages/AppState";

import { vec3, mat4 } from "gl-matrix";

interface PreviewProps {
  leaf: Leaf;
  width?: string;
  height?: string;
  controls?: boolean;
  showAxis?: boolean;
  meshCallback?: (mesh: { position: number[]; index: number[] }) => {};
}

export function Preview({ leaf, width, height, controls, showAxis, meshCallback }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const threeRef = useRef<{
    scene: Scene;
    leaf?: Mesh;
  } | null>(null);

  // One Time Three Setup:
  useEffect(() => {
    // Scene init
    const material = new MeshStandardMaterial({ color: 0xff0000, side: DoubleSide });

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

    const rawMesh = generateMesh(leaf);

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(new Float32Array(rawMesh.position), 3));
    geom.setIndex(rawMesh.index);

    const oldGeom = three.leaf.geometry;
    three.leaf.geometry = geom;
    if (oldGeom) oldGeom.dispose();

    if (meshCallback) meshCallback(rawMesh);
  }, [leaf]);

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
  const { type, arrangement, terminalLeaf, angle } = layout ?? {
    type: "palmate",
    arrangement: "alternate",
    angle: 60,
    terminalLeaf: true,
  };
  const petioleLength = petiole.len || 100;
  const petioleWidth = petiole.width || 1;
  const petioleWidthHalf = petioleWidth / 2;
  const angleRad = (angle * Math.PI) / 180;

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
      const pairIndex = Math.floor(index / 2); // 0, 0, 1, 1, 2, 2...
      const totalPairs = Math.ceil(sideLeafletsCount / 2);

      const isLeft = index % 2 === 0;
      const heightFactor = 0.2 + (pairIndex / totalPairs) * 0.7;

      position.y = petioleLength * heightFactor;

      if (arrangement === "opposite") {
        position.x = petioleWidthHalf * (isLeft ? -1 : 1);
      } else if (arrangement === "alternate") {
        if (!isLeft) position.y += ((petioleLength * 0.7) / totalPairs) * 0.5;
        position.x = petioleWidthHalf * (isLeft ? -1 : 1);
      }
      const branchAngle = angleRad;
      rotation.z = isLeft ? branchAngle : -branchAngle;
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

export function generateShapeMesh(shape: LeafShape, petioleOffset: { x: number; y: number }) {
  const rawPoints = state.geoms.getNormalized(shape.geom).points;
  if (!rawPoints || rawPoints.length < 3) return { position: [], index: [] };

  const adjusted = rawPoints
    .map((p) => ({
      x: p.x - petioleOffset.x,
      y: p.y - petioleOffset.y,
    }))
    .map((p) => new Vector2(p.x, p.y));

  const faces = ShapeUtils.triangulateShape(adjusted, []);
  const position: number[] = [];
  const index: number[] = [];

  adjusted.forEach((pt) => position.push(pt.x, pt.y, 0));
  faces.forEach((face) => index.push(face[0], face[1], face[2]));

  return { position, index };
}

export function generateMesh(leaf: Leaf) {
  // generate buffers (TRIANGLES, indexed)

  const combinedPositions: number[] = [];
  const combinedIndices: number[] = [];
  let vertexOffset = 0;

  const mergeSubMesh = (meshData: { position: number[]; index: number[] }, transformMatrix: mat4) => {
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
  const petioleLength = leaf.petiole.len || 1;
  const petioleWidth = leaf.petiole.width || 1;
  const petioleMesh = generateBoxBuffer(petioleWidth, petioleLength, 0.1);

  const petioleMatrix = mat4.create();
  mergeSubMesh(petioleMesh, petioleMatrix);

  // + all leaflets on corrent postions (calculateLeafletTransform)
  const petioluleLength = leaf.shape[0].petiolule?.len || 0.0;
  const petioluleWidth = leaf.shape[0].petiolule?.width || 0.0;
  const localPetioluleAngleRad = -((leaf.shape[0].petiolule?.angle || 0) / 180) * Math.PI;

  //   + leaflet petiole
  const basePetioluleMesh = petioluleLength > 0 ? generateBoxBuffer(petioluleWidth, petioluleLength, 0.08) : null;

  //   + leaflet shape
  const petioleOffset = leaf?.shape[0].petiolule ?? leaf?.petiole ?? { x: 0, y: 0 };
  const baseLeafShapeMesh = generateShapeMesh(leaf.shape[0], petioleOffset);

  leaf.instances.forEach((instance: any, index: number) => {
    const { position, rotation } = calculateLeafletTransform(index, leaf.instances.length, leaf.petiole, leaf.layout);
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
