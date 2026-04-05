// script.js - Complete High-End 3D Racing Game
let scene, camera, renderer;
let car, wheels = [], flame;
let roadSegments = [];
let traffic = [];
let keys = {};
let mobile = { left: false, right: false, accel: false, brake: false, nitro: false };
let carSpeed = 0;
let nitroLevel = 100;
let isBoosting = false;
let distance = 0;
let gameRunning = false;
let paused = false;
let sensitivity = 1.0;
let graphicsQuality = 'medium';
let lastTime = 0;

// Core game constants
const ROAD_WIDTH = 30;
const SEGMENT_LENGTH = 60;
const MAX_SPEED = 220;
const ROAD_SEGMENTS_COUNT = 9;

function initThree() {
    const container = document.getElementById('container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x112233, 80, 420);
    
    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer - high quality
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Lighting - sunset realistic
    const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x225522, 1.1);
    scene.add(hemiLight);
    
    const sunLight = new THREE.DirectionalLight(0xffaa77, 1.4);
    sunLight.position.set(80, 120, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);
    
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    
    // Sky
    const skyGeo = new THREE.SphereGeometry(900, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        color: 0x113366,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    
    // Create world
    createCar();
    createRoad();
    
    // Initial traffic
    for (let i = 0; i < 7; i++) {
        createTrafficCar(180 + i * 55);
    }
    
    // Input listeners
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    setupMobileControls();
    console.log('%c✅ VELOCITY RUSH initialized - AAA quality ready!', 'color:#00ffcc; font-size:14px');
}

function createCar() {
    car = new THREE.Group();
    
    // Main body - Metallic Blue BMW M4 style
    const bodyGeo = new THREE.BoxGeometry(2.3, 0.9, 5.2);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x0077cc,
        shininess: 130,
        specular: 0xdddddd,
        flatShading: false,
        emissive: 0x002244
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.4;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);
    
    // Cabin / windows
    const cabinGeo = new THREE.BoxGeometry(1.9, 1.1, 2.8);
    const cabinMat = new THREE.MeshPhongMaterial({
        color: 0x112233,
        shininess: 40,
        transparent: true,
        opacity: 0.85
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.1, -0.6);
    car.add(cabin);
    
    // Front hood detail
    const hoodGeo = new THREE.BoxGeometry(2.1, 0.3, 2);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 1.65, 1.4);
    car.add(hood);
    
    // Wheels
    wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.38, 32);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 20 });
    
    const wheelPositions = [
        { x: -1.15, z: 1.65 },  // FL
        { x: 1.15, z: 1.65 },   // FR
        { x: -1.15, z: -1.75 }, // RL
        { x: 1.15, z: -1.75 }   // RR
    ];
    
    wheelPositions.forEach((pos, i) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.7, pos.z);
        wheel.castShadow = true;
        car.add(wheel);
        wheels.push(wheel);
    });
    
    // Nitro flame effect
    const flameGeo = new THREE.ConeGeometry(0.28, 2.2, 6);
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 1.1, -3.4);
    flame.rotation.x = Math.PI;
    flame.visible = false;
    car.add(flame);
    
    scene.add(car);
    car.position.set(0, 0, 0);
}

function createRoad() {
    roadSegments = [];
    for (let i = 0; i < ROAD_SEGMENTS_COUNT; i++) {
        // Road base
        const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
        const roadMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            shininess: 8,
            specular: 0x222222
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.z = i * SEGMENT_LENGTH - (ROAD_SEGMENTS_COUNT * SEGMENT_LENGTH / 2);
        road.position.y = 0.05;
        road.receiveShadow = true;
        scene.add(road);
        roadSegments.push(road);
        
        // Lane markings (children so they move with road)
        for (let lane = -1; lane <= 1; lane++) {
            for (let d = 0; d < 7; d++) {
                const dashGeo = new THREE.PlaneGeometry(0.6, 4.5);
                const dashMat = new THREE.MeshPhongMaterial({
                    color: 0xffee66,
                    emissive: 0xffee66,
                    emissiveIntensity: 0.6
                });
                const dash = new THREE.Mesh(dashGeo, dashMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(lane * 8, 0.2, -SEGMENT_LENGTH / 2 + d * 9);
                road.add(dash);
            }
        }
        
        // Side curbs
        const curbMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, SEGMENT_LENGTH), curbMat);
        leftCurb.position.set(-ROAD_WIDTH / 2 - 0.6, 0.3, 0);
        road.add(leftCurb);
        const rightCurb = leftCurb.clone();
        rightCurb.position.x = ROAD_WIDTH / 2 + 0.6;
        road.add(rightCurb);
    }
}

function createTrafficCar(zPos) {
    const trafficCar = new THREE.Group();
    
    // Random color for variety
    const colors = [0xff2222, 0x22cc44, 0xffaa00, 0x8888ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const bodyGeo = new THREE.BoxGeometry(2.1, 0.85, 4.4);
    const bodyMat = new THREE.MeshPhongMaterial({ color: color, shininess: 70 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    trafficCar.add(body);
    
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.9, 2.1);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.0, -0.4);
    trafficCar.add(cabin);
    
    // Quick wheels
    const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [-1, 1].forEach(x => {
        [-1.4, 1.4].forEach(z => {
            const w = new THREE.Mesh(wGeo, wMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.6, z);
            trafficCar.add(w);
        });
    });
    
    trafficCar.position.set(
        (Math.random() * 2 - 1) * 10,
        0,
        zPos
    );
    
    trafficCar.userData = {
        speed: 45 + Math.random() * 95,
        laneOffset: trafficCar.position.x
    };
    
    scene.add(trafficCar);
    traffic.push(trafficCar);
}

function setupMobileControls() {
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const accelBtn = document.getElementById('accel-btn');
    const brakeBtn = document.getElementById('brake-btn');
    const nitroBtn = document.getElementById('nitro-btn');
    
    const set = (btn, key, val) => {
        btn.addEventListener('touchstart', e => { e.preventDefault(); mobile[key] = val; });
        btn.addEventListener('touchend', e => { e.preventDefault(); mobile[key] = !val; });
        btn.addEventListener('mouseleave', () => mobile[key] = false);
    };
    
    set(leftBtn, 'left', true);
    set(rightBtn, 'right', true);
    set(accelBtn, 'accel', true);
    set(brakeBtn, 'brake', true);
    set(nitroBtn, 'nitro', true);
    
    // Show mobile controls on touch devices
    if ('ontouchstart' in window) {
        document.getElementById('mobile-controls').classList.remove('hidden');
    }
}

function updatePhysics(delta) {
    // Acceleration / braking
    let accel = 0;
    if (keys['w'] || keys['arrowup'] || mobile.accel) accel = 1.8;
    if (keys['s'] || keys['arrowdown'] || mobile.brake) accel = -1.2;
    
    carSpeed += accel * 65 * delta;
    carSpeed *= 0.94; // drag
    carSpeed = Math.max(5, Math.min(MAX_SPEED, carSpeed));
    
    // Nitro
    isBoosting = (keys['shift'] || mobile.nitro) && nitroLevel > 0;
    if (isBoosting) {
        carSpeed = Math.min(MAX_SPEED + 65, carSpeed + 110 * delta);
        nitroLevel = Math.max(0, nitroLevel - 48 * delta);
        flame.visible = true;
        flame.scale.set(1, 1.6 + Math.random(), 1);
    } else {
        flame.visible = false;
        nitroLevel = Math.min(100, nitroLevel + 22 * delta);
    }
    
    // Steering (arcade drifting feel)
    let steer = 0;
    if (keys['a'] || keys['arrowleft'] || mobile.left) steer = -1;
    if (keys['d'] || keys['arrowright'] || mobile.right) steer = 1;
    
    const lateral = steer * sensitivity * 9.5 * delta * (carSpeed / 110 + 0.6);
    car.position.x += lateral;
    
    // Road clamp + drift roll
    car.position.x = Math.max(-13, Math.min(13, car.position.x));
    car.rotation.y = -lateral * 0.18;
    car.rotation.z = -lateral * 0.35;
    
    // Wheel spin
    const spinSpeed = carSpeed * 0.085;
    wheels.forEach((wheel, i) => {
        wheel.rotation.x -= spinSpeed;
        if (i < 2) wheel.rotation.y = steer * 0.8; // front wheels turn
    });
    
    // Distance
    distance += carSpeed * 0.28;
}

function updateWorld(delta) {
    const worldScroll = carSpeed * 0.18 * delta;
    
    // Scroll road segments
    roadSegments.forEach(seg => {
        seg.position.z -= worldScroll;
        if (seg.position.z < -280) {
            seg.position.z += ROAD_SEGMENTS_COUNT * SEGMENT_LENGTH;
        }
    });
    
    // Traffic
    for (let i = traffic.length - 1; i >= 0; i--) {
        const t = traffic[i];
        const relative = (carSpeed - t.userData.speed) * 0.18 * delta;
        t.position.z -= relative + worldScroll;
        
        // Respawn
        if (t.position.z < -60) {
            scene.remove(t);
            traffic.splice(i, 1);
            createTrafficCar(340 + Math.random() * 120);
            continue;
        }
        
        // Collision detection
        const dx = Math.abs(car.position.x - t.position.x);
        const dz = Math.abs(t.position.z); // car is at z = 0
        if (dx < 2.8 && dz < 4.5) {
            carSpeed = Math.max(20, carSpeed - 95);
            // Knock traffic aside
            t.position.x += (car.position.x - t.position.x) * 1.8;
            t.userData.speed = 30;
        }
    }
    
    // Keep traffic density
    if (traffic.length < 6) {
        createTrafficCar(320 + Math.random() * 150);
    }
}

function updateCamera() {
    const targetX = car.position.x * 0.65;
    
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.12);
    camera.position.y = 9 + (carSpeed / MAX_SPEED) * 5;
    camera.position.z = -24;
    
    // High-speed camera shake
    if (carSpeed > 165) {
        const shake = (carSpeed - 165) / 90;
        camera.position.x += (Math.random() - 0.5) * shake * 1.2;
        camera.position.y += (Math.random() - 0.5) * shake * 0.6;
    }
    
    camera.lookAt(car.position.x * 0.4, 3, 12);
}

function updateHUD() {
    // Speed
    const speedEl = document.getElementById('speed-value');
    speedEl.textContent = String(Math.floor(carSpeed)).padStart(3, '0');
    
    // Nitro
    document.getElementById('nitro-bar').style.width = nitroLevel + '%';
    
    // Distance
    document.getElementById('distance-value').textContent = Math.floor(distance);
    
    // Lane dot (visual feedback)
    const dot = document.getElementById('player-dot');
    const percent = ((car.position.x + 13) / 26) * 100;
    dot.style.left = percent + '%';
}

function gameLoop(timestamp) {
    if (!gameRunning || paused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    
    updatePhysics(delta);
    updateWorld(delta);
    updateCamera();
    updateHUD();
    
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('hud').classList.remove('hidden');
    
    if (!scene) initThree();
    
    // Reset values
    carSpeed = 45;
    nitroLevel = 100;
    distance = 0;
    car.position.x = 0;
    car.rotation.set(0, 0, 0);
    
    gameRunning = true;
    paused = false;
    lastTime = performance.now();
    
    gameLoop(lastTime);
}

function pauseGame() {
    paused = true;
    document.getElementById('pause-menu').classList.remove('hidden');
}

function resumeGame() {
    document.getElementById('pause-menu').classList.add('hidden');
    paused = false;
    lastTime = performance.now();
    gameLoop(lastTime);
}

function showSettings() {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('settings-menu').classList.remove('hidden');
}

function hideSettings() {
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('pause-menu').classList.remove('hidden');
}

function applySettings() {
    graphicsQuality = document.getElementById('graphics-select').value;
    sensitivity = parseFloat(document.getElementById('sensitivity-slider').value);
    document.getElementById('sensitivity-value').textContent = sensitivity.toFixed(1) + 'x';
    
    // Graphics quality adjustment
    if (graphicsQuality === 'low') {
        renderer.shadowMap.enabled = false;
    } else {
        renderer.shadowMap.enabled = true;
    }
}

function exitToMenu() {
    gameRunning = false;
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('start-screen').classList.add('active');
    
    // Clean up traffic for next session
    traffic.forEach(t => scene.remove(t));
    traffic = [];
}

function showAbout() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('about-screen').classList.add('active');
}

function hideAbout() {
    document.getElementById('about-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
}

// Keyboard pause support
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameRunning) {
        if (paused) resumeGame();
        else pauseGame();
    }
});

// Auto start initialization
window.onload = () => {
    console.log('%c🚗 VELOCITY RUSH by Ayush Pandey JI - Ready for GitHub Pages!', 'color:#00ffcc; font-family:monospace');
};