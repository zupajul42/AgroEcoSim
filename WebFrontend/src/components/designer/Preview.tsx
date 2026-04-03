import { useEffect, useRef, useState } from "preact/hooks";
import state, { Frame, Point } from "../../pages/Designer/DesignerState";
import {
    AmbientLight,
    AxesHelper,
    Color,
    DoubleSide,
    GridHelper,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    PointLight,
    Scene,
    Shape,
    ShapeGeometry,
    WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const material = new MeshStandardMaterial({ color: 0xff0000, side: DoubleSide });
const mesh = new Mesh(new ShapeGeometry(), material);
const scene = new Scene();
const axes = new AxesHelper(100);
const grid = new GridHelper(100, 10);
scene.add(grid, axes);
scene.add(mesh);

camera.position.set(0, 300, 0);
camera.lookAt(0, 0, 0);

const ambientLight = new AmbientLight(0xffffff, 0.5);
const pointLight = new PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(mesh, ambientLight, pointLight);

export function Preview() {
    const [time, setTime] = useState<number>(0);
    const [frame, setFrame] = useState<Frame>();

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        refresh();
    }, [time, frame]);

    const refresh = () => {
        if (!frame) return;

        const active = frame.points.filter((_, i) => frame.active[i]);
        updateMesh(active);
    };

    useEffect(() => {
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current as HTMLCanvasElement,
            antialias: true,
            alpha: true,
        });
        //renderer.setPixelRatio(2);

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

        const controls = new OrbitControls(camera, renderer.domElement);

        let req: number;
        const render = () => {
            renderer.render(scene, camera);
            req = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(req);
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    useEffect(() => {
        const unTime = state.time.subscribe(setTime);
        const unFrame = state.frame.subscribe(setFrame);
        return () => {
            unTime();
            unFrame;
        };
    }, []);

    const updateMesh = (points: Point[]) => {
        const shape = new Shape();
        if (points.length < 2) return shape;
        shape.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
        shape.closePath();

        const old = mesh.geometry;
        mesh.geometry = new ShapeGeometry(shape);
        mesh.geometry.rotateX(Math.PI / 2);
        mesh.geometry.center();
        old.dispose();
    };

    return (
        <div ref={containerRef} class="editor-preview">
            <canvas id="preview" ref={canvasRef}></canvas>
        </div>
    );
}
