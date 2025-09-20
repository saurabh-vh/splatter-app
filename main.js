import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Splatter } from 'splatter-three';
import GUI from 'lil-gui';

// create WebGL2 context -- required for Splatter
const options = {
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
};
const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl2', options);
if (!context) {
    alert('WebGL2 not supported in this browser');
    throw new Error('WebGL2 not supported');
}
document.body.appendChild(canvas);

// set up Three.js renderer
const renderer = new THREE.WebGLRenderer({ canvas, context });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// set up Splatter
const splatter = new Splatter(context, { splatId: '33k-cxw' });
splatter.setTransform(new THREE.Matrix4().makeRotationX(130 / 180 * Math.PI));

// set up scene
const scene = new THREE.Scene();

const grid = new THREE.GridHelper(10, 10);
grid.position.set(0, -1, 0);
scene.add(grid);

// lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff));

// camera and controls
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(3, 3, 3);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.rotateSpeed = 0.5;

// small marker ball for hitTest
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), ballMaterial);
scene.add(ball);

// set up a simple splat shader effect
splatter.addUniform('vec3', 'uWeights');
splatter.setShaderEffect(`
    float gray = dot(color, uWeights);
`);

// clipping demo
splatter.setClipTest(`
    if (length(position) + radius > 10.0) { return false; }
`);

// --- Tooltip setup ---
const tooltip = document.createElement('div');
tooltip.innerText = 'WASL Model';
tooltip.style.position = 'absolute';
tooltip.style.padding = '4px 8px';
tooltip.style.background = 'rgba(0,0,0,0.7)';
tooltip.style.color = 'white';
tooltip.style.borderRadius = '4px';
tooltip.style.pointerEvents = 'none';
tooltip.style.transform = 'translate(-50%, -100%)';
document.body.appendChild(tooltip);

// --- Load GLB ---
let model;
const loader = new GLTFLoader();
loader.load('./wasl.glb', (gltf) => {
    model = gltf.scene;

    // recenter model to origin
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);

    scene.add(model);

    // --- Setup lil-gui for controlling the model ---


    // --- Setup lil-gui for controlling the model ---
// const gui = new GUI();
// const modelFolder = gui.addFolder('GLB Transform');

// // --- POSITION ---
// // Individual axes
// const positionFolder = modelFolder.addFolder('Position');
// positionFolder.add(model.position, 'x', -10, 10, 0.01).name('X');
// positionFolder.add(model.position, 'y', -10, 10, 0.01).name('Y');
// positionFolder.add(model.position, 'z', -10, 10, 0.01).name('Z');
// // Collective control
// const position = { all: 0 };
// positionFolder.add(position, 'all', -10, 10, 0.01).name('All').onChange(v => {
//     model.position.set(v, v, v);
// });

// // --- ROTATION ---
// // Individual axes in degrees
// const rotation = { 
//     x: THREE.MathUtils.radToDeg(model.rotation.x),
//     y: THREE.MathUtils.radToDeg(model.rotation.y),
//     z: THREE.MathUtils.radToDeg(model.rotation.z),
//     all: 0
// };
// const rotationFolder = modelFolder.addFolder('Rotation');
// rotationFolder.add(rotation, 'x', -180, 180, 1).name('X').onChange(v => model.rotation.x = THREE.MathUtils.degToRad(v));
// rotationFolder.add(rotation, 'y', -180, 180, 1).name('Y').onChange(v => model.rotation.y = THREE.MathUtils.degToRad(v));
// rotationFolder.add(rotation, 'z', -180, 180, 1).name('Z').onChange(v => model.rotation.z = THREE.MathUtils.degToRad(v));
// // Collective rotation
// rotationFolder.add(rotation, 'all', -180, 180, 1).name('All').onChange(v => {
//     const rad = THREE.MathUtils.degToRad(v);
//     model.rotation.set(rad, rad, rad);
// });

// // --- SCALE ---
// // Individual axes
// const scaleFolder = modelFolder.addFolder('Scale');
// scaleFolder.add(model.scale, 'x', 0.01, 10, 0.01).name('X');
// scaleFolder.add(model.scale, 'y', 0.01, 10, 0.01).name('Y');
// scaleFolder.add(model.scale, 'z', 0.01, 10, 0.01).name('Z');
// // Collective scale
// const scale = { all: 1 };
// scaleFolder.add(scale, 'all', 0.01, 10, 0.01).name('All').onChange(v => {
//     model.scale.set(v, v, v);
// });

// modelFolder.open();
// positionFolder.open();
// rotationFolder.open();
// scaleFolder.open();



}, undefined, (error) => {
    console.error('Error loading GLB:', error);
});

// render scene (on demand)
function render(deltaTime) {
    frameRequested = false;

    renderer.render(scene, camera);
    splatter.setUniform('uWeights', [0.299, 0.587, 0.114]);
    splatter.render(camera, controls.target);

    // --- update tooltip above top of model ---
    if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const top = new THREE.Vector3();
        box.getCenter(top);
        top.y += box.getSize(new THREE.Vector3()).y / 2;

        top.project(camera);

        const x = (top.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-top.y * 0.5 + 0.5) * window.innerHeight;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.display = (top.z > 1 || top.z < -1) ? 'none' : 'block';
    }

    if (controls.update(deltaTime)) {
        update();
    };
}

// request redraw
let frameRequested = false;
function update() {
    if (!frameRequested) {
        requestAnimationFrame(render);
        frameRequested = true;
    }
}

// handle window resize
function resize() {
    const [width, height] = [window.innerWidth, window.innerHeight];
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    update();
}

// recenter on double-click
let lastTime = -1e3;
function onclick(event) {
    if (performance.now() - lastTime < 300) {
        const pt = splatter.hitTest(camera, [event.clientX, event.clientY]);
        if (pt) {
            controls.target.copy(pt);
            ball.position.copy(pt);
            update();
        }
    }
    lastTime = performance.now();
}

// watch splatter loading
function onloaded(totalLoaded, numDisplayed) {
    if (totalLoaded > splatter.totalSize / 2 || numDisplayed > 1e6) {
        document.getElementById('spinner').style.display = 'none';
    }
}

resize();
update();

window.addEventListener('resize', resize);
controls.addEventListener('change', update);
splatter.addEventListener('update', update);
splatter.addEventListener('loaded', onloaded);
canvas.addEventListener('pointerdown', onclick);
