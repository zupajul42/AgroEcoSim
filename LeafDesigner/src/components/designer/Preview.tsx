import { useEffect, useRef, useState } from "preact/hooks";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
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
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Leaf, LeafLayout, LeafLayoutType, Petiole } from "../../types/leaf";
import { exponentialHeightFogFactor } from "three/src/nodes/TSL.js";
import { state } from "../../pages/AppState";

interface PreviewProps {
  leaf: Leaf;
  width?: string;
  height?: string;
  controls?: boolean;
  showAxis?: boolean;
}

export function Preview({ leaf, width, height, controls, showAxis }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const threeRef = useRef<{
    scene: Scene;
    leaf?: InstancedMesh;
    petiole?: Mesh;
    petiolule?: InstancedMesh;
  } | null>(null);

  // One Time Three Setup:
  useEffect(() => {
    // Scene init
    const material = new MeshStandardMaterial({ color: 0xff0000, side: DoubleSide });

    threeRef.current = {
      scene: new Scene(),
      leaf: new InstancedMesh(new ShapeGeometry(), material, leaf.instances.length),
      petiole: new Mesh(new BoxGeometry(), material),
      petiolule: new InstancedMesh(new ShapeGeometry(), material, leaf.instances.length),
    };

    threeRef.current.scene.add(threeRef.current.petiole);
    threeRef.current.scene.add(threeRef.current.petiolule);
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
    if (!three) return;

    if (three.leaf.count !== leaf.instances.length) {
      three.scene.remove(three.leaf);
      three.scene.remove(three.petiolule);

      const mat = three.leaf.material;

      three.leaf.geometry.dispose();
      three.leaf.dispose();
      three.petiolule.geometry.dispose();
      three.petiolule.dispose();

      const newPetiolule = new InstancedMesh(new ShapeGeometry(), mat, leaf.instances.length);
      const newLeaf = new InstancedMesh(new ShapeGeometry(), mat, leaf.instances.length);

      three.scene.add(newPetiolule);
      threeRef.current.petiolule = newPetiolule;
      three.petiolule = newPetiolule;

      three.scene.add(newLeaf);
      threeRef.current.leaf = newLeaf;
      three.leaf = newLeaf;
    }

    const updateLeaf = () => {
      const f = 1;
      const petiole = leaf?.shape[0].petiolule ?? leaf?.petiole ?? { x: 0, y: 0 };
      // update leaf
      const shape = new Shape();

      const points = state.geoms.get(leaf.shape[0].geom).points;
      if (points.length < 2) return shape;
      shape.moveTo((points[0].x - petiole.x) * f, (points[0].y - petiole.y) * f);
      for (let i = 1; i < points.length; i++)
        shape.lineTo((points[i].x - petiole.x) * f, (points[i].y - petiole.y) * f);
      shape.closePath();

      const old = three.leaf.geometry;
      three.leaf.geometry = new ShapeGeometry(shape);
      old.dispose();
    };

    const updatePetiole = () => {
      // update petiole
      const old = three.petiole.geometry;
      const len = leaf.petiole.len || 1;
      const w = leaf.petiole.width || 1;
      const geom = new BoxGeometry(w, len, 0.1);
      geom.translate(0, len / 2, 0);
      three.petiole.geometry = geom;
      old.dispose();
    };

    const updatePetioluleGeometry = () => {
      const old = three.petiolule.geometry;
      const len = leaf.shape[0].petiolule?.len || 0.0;
      const w = leaf.shape[0].petiolule?.width || 0.0;
      const geom = new BoxGeometry(w, len, 0.08);
      geom.translate(0, len / 2, 0);
      three.petiolule.geometry = geom;
      old.dispose();
    };

    updateLeaf();
    updatePetiole();
    updatePetioluleGeometry();

    const globalAngle = -(leaf.petiole.angle / 180) * Math.PI;
    three.petiole.rotation.x = globalAngle;
    three.petiolule.rotation.x = globalAngle;
    three.leaf.rotation.x = globalAngle;

    const petioluleLength = leaf.shape[0].petiolule?.len;
    const localPetioluleAngle = -(leaf.shape[0].petiolule.angle / 180) * Math.PI;

    const dummyLeaf = new Object3D();
    const dummyPetiolule = new Object3D();

    leaf.instances.forEach((instance: any, index: number) => {
      const { position, rotation } = calculateLeafletTransform(index, leaf.instances.length, leaf.petiole, leaf.layout);
      const scale = instance.scale || 1.0;

      dummyPetiolule.position.set(position.x, position.y, position.z);
      dummyPetiolule.rotation.set(rotation.x, rotation.y, rotation.z);
      dummyPetiolule.scale.set(scale, scale, scale);
      dummyPetiolule.rotateX(localPetioluleAngle);
      dummyPetiolule.updateMatrix();
      three.petiolule.setMatrixAt(index, dummyPetiolule.matrix);

      dummyLeaf.position.set(position.x, position.y, position.z);
      dummyLeaf.rotation.set(rotation.x, rotation.y, rotation.z);
      dummyLeaf.scale.set(scale, scale, scale);
      dummyLeaf.rotateX(localPetioluleAngle);
      dummyLeaf.translateY(petioluleLength * scale);
      dummyLeaf.updateMatrix();
      three.leaf.setMatrixAt(index, dummyLeaf.matrix);
    });

    three.leaf.instanceMatrix.needsUpdate = true;
    three.petiolule.instanceMatrix.needsUpdate = true;
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
