import { useEffect, useRef, useState } from "preact/hooks";
import state, { Frame, Point } from "../../pages/Designer/DesignerState";
import {
    AmbientLight,
    AxesHelper,
    BoxGeometry,
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
const leaf = new Mesh(new ShapeGeometry(), material);
const petiole = new Mesh(new BoxGeometry(), material);
const scene = new Scene();
petiole.add(leaf);
scene.add(petiole);

const axes = new AxesHelper(100);
axes.translateY(0.01);
const grid = new GridHelper(10);
scene.add(axes, grid);

camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

const ambientLight = new AmbientLight(0xffffff, 0.5);
const pointLight = new PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(ambientLight, pointLight);

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

        setFrame(state.frame.value);

        return () => {
            unTime();
            unFrame();
        };
    }, []);

    const updateMesh = (points: Point[]) => {
        console.log(points);

        const updateLeaf = () => {
            const factor = 30;
            const petiole = frame!.petiole;
            // update leaf
            const shape = new Shape();
            if (points.length < 2) return shape;
            shape.moveTo((points[0][0] - petiole.base[0]) / factor, -(points[0][1] - petiole.base[1]) / factor);
            for (let i = 1; i < points.length; i++)
                shape.lineTo((points[i][0] - petiole.base[0]) / factor, -(points[i][1] - petiole.base[1]) / factor);
            shape.closePath();

            const old = leaf.geometry;
            leaf.geometry = new ShapeGeometry(shape);
            old.dispose();
        };

        const updatePetiole = () => {
            // update petiole
            const old = petiole.geometry;
            petiole.geometry = new BoxGeometry(0.2, frame!.petiole.length || 1, 0.1);
            old.dispose();
        };

        updateLeaf();
        updatePetiole();

        petiole.rotation.x = -(frame!.petiole.trunkAngle / 180) * Math.PI;
        leaf.rotation.x = -(frame!.petiole.leafAngle / 180) * Math.PI;
        leaf.position.set(0, (frame!.petiole.length || 1) / 2, 0);
    };

    return (
        <div ref={containerRef} class="editor-preview">
            <canvas id="preview" ref={canvasRef}></canvas>
        </div>
    );
}
