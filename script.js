import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // UNCOMMENT TO LOAD REAL 3D MODEL

// ==========================================
// GAME STATE & VARIABLES
// ==========================================
let scene, camera, renderer, composer;
let car, road, environmentGroup, trafficGroup;
let gameState = 'menu'; // menu, playing, paused, gameover
let animationId;
let clock = new THREE.Clock();

// Physics & Gameplay Variables
let speed = 0;
let maxSpeed = 250;
let baseSpeed = 0;
let steering = 0;
let score = 0;
let nitroAmount = 100;
let isBoosting = false;

// Settings
let settings = {
    graphics: 'medium',
    sensitivity: 5
};

const keys = { w: false, a: false, s: false, d: false, shift: false, left: false, right: false };

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 50, 400);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 10);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 4. Post-Processing (Bloom for AAA feel)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 0.8;
    bloomPass.radius = 0.5;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffddaa, 2);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    scene.add(dirLight);

    // 6. Build World
    createEnvironment();
    createPlayerCar();
    
    trafficGroup = new THREE.Group();
    scene.add(trafficGroup);

    // 7. Event Listeners
    setupInputs();
    setupUI();
    window.addEventListener('resize', onWindowResize, false);

    // Start Loop
    render();
}

// ==========================================
// OBJECT CREATION
// ==========================================
function createEnvironment() {
    environmentGroup = new THREE.Group();
    scene.add(environmentGroup);

    // Road
    const roadGeo = new THREE.PlaneGeometry(30, 1000, 1, 10);
    const roadMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.8,
        metalness: 0.2
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -400;
    road.receiveShadow = true;
    environmentGroup.add(road);

    // Grid lines (fake movement effect)
    const gridHelper = new THREE.GridHelper(1000, 100, 0xffffff, 0xffffff);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    environmentGroup.add(gridHelper);

    // Scenery (Mountains/Trees boxes)
    for(let i=0; i<50; i++) {
        const h = Math.random() * 20 + 10;
        const geo = new THREE.BoxGeometry(10, h, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x001122 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 40 + 20);
        mesh.position.y = h / 2;
        mesh.position.z = -Math.random() * 800;
        environmentGroup.add(mesh);
    }
}

function createPlayerCar() {
    car = new THREE.Group();
    
    // --- HOW TO USE A REAL BMW M4 3D MODEL ---
    // 1. Uncomment the GLTFLoader import at the top.
    // 2. Download a free BMW M4 .glb file and place it in your project.
    // 3. Replace the code below with this snippet:
    /*
    const loader = new GLTFLoader();
    loader.load('path_to_your_bmw_m4.glb', function(gltf) {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.y = 0.5;
        // Apply metallic blue to materials
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                if(child.material.name === "CarBody") { // Adjust based on model
                    child.material = new THREE.MeshStandardMaterial({ color: 0x0044ff, metalness: 0.9, roughness: 0.1 });
                }
            }
        });
        car.add(model);
    });
    */

    // --- PROCEDURAL FALLBACK (Sleek Metallic Blue Box representing the BMW M4) ---
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.2, 5);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x0044ff, // Metallic Blue
        metalness: 0.9, 
        roughness: 0.1 
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    car.add(body);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const wheelPositions = [
        [-1.2, 0.4, 1.8], [1.2, 0.4, 1.8], // Front
        [-1.2, 0.4, -1.8], [1.2, 0.4, -1.8] // Rear
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(...pos);
        car.add(wheel);
    });

    scene.add(car);
}

function spawnTraffic() {
    if(Math.random() < 0.02) {
        const geo = new THREE.BoxGeometry(2, 1.5, 4.5);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        const enemy = new THREE.Mesh(geo, mat);
        
        // Random lane (-10 to 10)
        enemy.position.x = (Math.random() - 0.5) * 20;
        enemy.position.y = 0.75;
        enemy.position.z = -400; // Spawn far ahead
        enemy.castShadow = true;
        
        trafficGroup.add(enemy);
    }
}

// ==========================================
// GAME LOGIC & PHYSICS
// ==========================================
function updatePhysics(delta) {
    // Input mapping
    const accelerating = keys.w || keys.ArrowUp;
    const braking = keys.s || keys.ArrowDown;
    const turningLeft = keys.a || keys.ArrowLeft || keys.left;
    const turningRight = keys.d || keys.ArrowRight || keys.right;
    isBoosting = keys.shift && nitroAmount > 0;

    // Acceleration & Braking
    let targetMaxSpeed = isBoosting ? maxSpeed * 1.5 : maxSpeed;
    
    if (accelerating) {
        baseSpeed += 50 * delta;
    } else if (braking) {
        baseSpeed -= 100 * delta;
    } else {
        baseSpeed -= 20 * delta; // Friction
    }

    baseSpeed = Math.max(0, Math.min(baseSpeed, targetMaxSpeed));
    speed = baseSpeed;

    // Steering
    let turnSpeed = (settings.sensitivity * 5) * delta;
    if (speed > 10) {
        if (turningLeft) car.position.x -= turnSpeed * (speed / 100);
        if (turningRight) car.position.x += turnSpeed * (speed / 100);
    }

    // Keep car on road bounds
    car.position.x = Math.max(-13, Math.min(car.position.x, 13));

    // Car tilt (Drift effect)
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, (turningRight ? -0.1 : (turningLeft ? 0.1 : 0)), 0.1);

    // Nitro Logic
    if (isBoosting) {
        nitroAmount -= 20 * delta;
        camera.fov = THREE.MathUtils.lerp(camera.fov, 80, 0.1);
        if(settings.graphics === 'high') composer.passes[1].strength = 2.0; // Intensify bloom
    } else {
        nitroAmount = Math.min(100, nitroAmount + 2 * delta);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 0.1);
        if(settings.graphics === 'high') composer.passes[1].strength = 0.8;
    }
    camera.updateProjectionMatrix();

    // Move Environment (Creates endless illusion)
    let moveAmount = speed * delta;
    environmentGroup.children.forEach(child => {
        if (child.isMesh && child.geometry.type === "BoxGeometry") { // Scenery
            child.position.z += moveAmount;
            if (child.position.z > 20) {
                child.position.z = -800;
                child.position.x = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 40 + 20);
            }
        }
    });

    // Move grid texture effect
    if(environmentGroup.children[1]) {
        environmentGroup.children[1].position.z = (environmentGroup.children[1].position.z + moveAmount) % 10;
    }

    // Traffic Logic & Collision
    for(let i = trafficGroup.children.length - 1; i >= 0; i--) {
        let enemy = trafficGroup.children[i];
        enemy.position.z += moveAmount * 0.5; // Traffic moves slower than player
        
        // Collision Detection (AABB)
        let dx = car.position.x - enemy.position.x;
        let dz = car.position.z - enemy.position.z;
        if(Math.abs(dx) < 2.0 && Math.abs(dz) < 4.5) {
            triggerGameOver();
        }

        // Remove old traffic
        if(enemy.position.z > 20) {
            trafficGroup.remove(enemy);
            score += 100; // Points for passing
        }
    }

    // Camera follow (Slight delay/shake)
    let shake = speed > 200 ? (Math.random() - 0.5) * 0.1 : 0;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, car.position.x * 0.5 + shake, 0.1);
    camera.position.z = car.position.z + 10;
    camera.lookAt(car.position.x, car.position.y, car.position.z - 20);
}

// ==========================================
// MAIN LOOP
// ==========================================
function render() {
    animationId = requestAnimationFrame(render);
    
    const delta = clock.getDelta();

    if (gameState === 'playing') {
        updatePhysics(delta);
        spawnTraffic();
        updateUI();
    }

    // Render using composer if graphics are high (bloom), else standard renderer
    if (settings.graphics === 'high') {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// ==========================================
// UI & INPUT HANDLING
// ==========================================
function setupUI() {
    document.getElementById('btn-play').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        gameState = 'playing';
        clock.start();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
        gameState = 'paused';
        document.getElementById('pause-screen').classList.remove('hidden');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        document.getElementById('pause-screen').classList.add('hidden');
        gameState = 'playing';
        clock.start();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        location.reload(); // Quickest reset
    });

    // Settings
    document.getElementById('setting-graphics').addEventListener('change', (e) => {
        settings.graphics = e.target.value;
    });
    document.getElementById('setting-sens').addEventListener('input', (e) => {
        settings.sensitivity = parseInt(e.target.value);
    });

    // Mobile buttons
    const bindBtn = (id, key) => {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; keys.w = true; }); // Auto-accelerate on mobile turn
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; keys.w = false; });
        btn.addEventListener('mousedown', () => { keys[key] = true; keys.w = true; });
        btn.addEventListener('mouseup', () => { keys[key] = false; keys.w = false; });
    };
    bindBtn('btn-left', 'left');
    bindBtn('btn-right', 'right');
    bindBtn('btn-nitro-mob', 'shift');
}

function updateUI() {
    document.getElementById('speed-val').innerText = Math.floor(speed);
    document.getElementById('nitro-bar').style.width = nitroAmount + '%';
}

function triggerGameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').innerText = `Final Score: ${score}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function setupInputs() {
    window.addEventListener('keydown', (e) => {
        if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
        if(e.key === 'Shift') keys.shift = true;
        if(e.key === 'ArrowUp') keys.w = true;
        if(e.key === 'ArrowDown') keys.s = true;
        if(e.key === 'ArrowLeft') keys.a = true;
        if(e.key === 'ArrowRight') keys.d = true;
    });
    
    window.addEventListener('keyup', (e) => {
        if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
        if(e.key === 'Shift') keys.shift = false;
        if(e.key === 'ArrowUp') keys.w = false;
        if(e.key === 'ArrowDown') keys.s = false;
        if(e.key === 'ArrowLeft') keys.a = false;
        if(e.key === 'ArrowRight') keys.d = false;
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Start Game Engine
init();
