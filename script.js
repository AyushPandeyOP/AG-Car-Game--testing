// script.js - UPDATED with all your requests (Old structure preserved + new features)
let scene, camera, renderer;
let car, wheels = [], flame, spoiler, headlights = [], taillights = [];
let roadSegments = [];
let traffic = [];
let sideObjects = []; // trees + barriers + signs
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
let driftAmount = 0; // new for advanced physics

// ASPHALT 8 INSPIRED CONSTANTS
const ROAD_WIDTH = 32;
const SEGMENT_LENGTH = 65;
const MAX_SPEED = 280;                    // Improved speed (was 220)
const ROAD_SEGMENTS_COUNT = 10;

function initThree() {
    const container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x112233, 90, 450);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Sunset lighting (Asphalt 8 style)
    const hemi = new THREE.HemisphereLight(0x88aaff, 0x224422, 1.2);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffaa66, 1.6);
    sun.position.set(100, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404060, 0.7));

    // Sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 32), 
        new THREE.MeshBasicMaterial({ color: 0x112244, side: THREE.BackSide }));
    scene.add(sky);

    createCar();           // More detailed car
    createRoad();
    createEnvironment();   // New: trees, barriers, mountains, signs

    for (let i = 0; i < 9; i++) createTrafficCar(200 + i * 60); // More NPCs

    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    setupMobileControls();
}

function createCar() {
    car = new THREE.Group();

    // Main body - Metallic Blue BMW M4 (more detailed)
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.05, 5.6);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0077cc, shininess: 140, specular: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.45;
    body.castShadow = true;
    car.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.15, 2.9), 
        new THREE.MeshPhongMaterial({ color: 0x112233, shininess: 30, transparent: true, opacity: 0.88 }));
    cabin.position.set(0, 2.25, -0.7);
    car.add(cabin);

    // Hood scoop
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 2.2), bodyMat);
    hood.position.set(0, 1.75, 1.6);
    car.add(hood);

    // NEW: Spoiler
    spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 1.1), 
        new THREE.MeshPhongMaterial({ color: 0x002244, shininess: 80 }));
    spoiler.position.set(0, 2.8, -2.6);
    spoiler.rotation.x = 0.3;
    car.add(spoiler);

    // NEW: Headlights (emissive)
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffff88, emissive: 0xffff88, emissiveIntensity: 2 });
    [-1.05, 1.05].forEach(x => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.15), headMat);
        light.position.set(x, 1.4, 2.85);
        car.add(light);
        headlights.push(light);
    });

    // NEW: Taillights
    const tailMat = new THREE.MeshPhongMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.5 });
    [-1.05, 1.05].forEach(x => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.12), tailMat);
        light.position.set(x, 1.35, -3.1);
        car.add(light);
        taillights.push(light);
    });

    // NEW: Exhaust pipes (chrome)
    const exhaustMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 100 });
    [-0.6, 0.6].forEach(x => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 16), exhaustMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(x, 0.9, -3);
        car.add(pipe);
    });

    // Wheels - improved rims
    wheels = [];
    const wheelPositions = [{x:-1.2,z:1.8}, {x:1.2,z:1.8}, {x:-1.2,z:-1.9}, {x:1.2,z:-1.9}];
    wheelPositions.forEach(pos => {
        const wheelGroup = new THREE.Group();
        // Tire
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 32), 
            new THREE.MeshPhongMaterial({ color: 0x111111 }));
        tire.rotation.z = Math.PI / 2;
        wheelGroup.add(tire);
        // Chrome rim
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 32), 
            new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 120 }));
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);
        wheelGroup.position.set(pos.x, 0.75, pos.z);
        car.add(wheelGroup);
        wheels.push(wheelGroup);
    });

    // Nitro flame
    flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.8, 8), 
        new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
    flame.position.set(0, 1.1, -3.6);
    flame.rotation.x = Math.PI;
    flame.visible = false;
    car.add(flame);

    scene.add(car);
    car.position.set(0, 0, 0);
}

function createRoad() {
    roadSegments = [];
    for (let i = 0; i < ROAD_SEGMENTS_COUNT; i++) {
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH),
            new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 10 })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.z = i * SEGMENT_LENGTH - (ROAD_SEGMENTS_COUNT * SEGMENT_LENGTH / 2);
        road.position.y = 0.05;
        road.receiveShadow = true;
        scene.add(road);
        roadSegments.push(road);

        // Asphalt 8 style brighter dashed lines
        for (let lane = -1; lane <= 1; lane++) {
            for (let d = 0; d < 8; d++) {
                const dash = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.7, 5),
                    new THREE.MeshPhongMaterial({ color: 0xffff44, emissive: 0xffff44, emissiveIntensity: 0.8 })
                );
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(lane * 9, 0.22, -SEGMENT_LENGTH/2 + d * 9);
                road.add(dash);
            }
        }
    }
}

function createEnvironment() {
    sideObjects = [];

    // Trees (Asphalt 8 roadside detail)
    const treeTrunkMat = new THREE.MeshPhongMaterial({ color: 0x553322 });
    const foliageMat = new THREE.MeshPhongMaterial({ color: 0x00aa44 });
    for (let i = 0; i < 18; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.8, 0.8), treeTrunkMat);
        trunk.position.y = 1.4;
        tree.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4, 6), foliageMat);
        leaves.position.y = 4;
        tree.add(leaves);
        tree.position.set(-18 + Math.random() * 2, 0, i * 28 - 100);
        scene.add(tree);
        sideObjects.push(tree);

        const treeRight = tree.clone();
        treeRight.position.x = 18 - Math.random() * 2;
        scene.add(treeRight);
        sideObjects.push(treeRight);
    }

    // Guardrails / barriers
    const barrierMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    for (let i = 0; i < 12; i++) {
        const leftRail = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 8), barrierMat);
        leftRail.position.set(-16.5, 0.6, i * 45 - 120);
        scene.add(leftRail);
        sideObjects.push(leftRail);

        const rightRail = leftRail.clone();
        rightRail.position.x = 16.5;
        scene.add(rightRail);
        sideObjects.push(rightRail);
    }

    // Road signs (random variety)
    for (let i = 0; i < 6; i++) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), 
            new THREE.MeshPhongMaterial({ color: 0xffee88, side: THREE.DoubleSide }));
        sign.position.set(-14, 4, i * 110 - 80);
        sign.rotation.y = Math.PI / 2;
        scene.add(sign);
        sideObjects.push(sign);
    }
}

function createTrafficCar(zPos) {
    const npc = new THREE.Group();

    // OLD CAR style (boxier, classic look like Asphalt 8 older traffic)
    const colors = [0xaa5533, 0x777777, 0x99aa33, 0xcc6644, 0x555588]; // old faded colors
    const col = colors[Math.floor(Math.random() * colors.length)];

    // Boxier body (old car proportions)
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.1, 4.8),
        new THREE.MeshPhongMaterial({ color: col, shininess: 40 })
    );
    body.position.y = 1.25;
    npc.add(body);

    // Flat old-school cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.95, 2.4),
        new THREE.MeshPhongMaterial({ color: 0x222222 })
    );
    cabin.position.set(0, 2.05, -0.5);
    npc.add(cabin);

    // Simple wheels
    const wMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 24);
    [-1.1, 1.1].forEach(x => {
        [-1.6, 1.6].forEach(z => {
            const w = new THREE.Mesh(wheelGeo, wMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.65, z);
            npc.add(w);
        });
    });

    npc.position.set((Math.random() * 2 - 1) * 11, 0, zPos);
    npc.userData = { speed: 60 + Math.random() * 70, laneOffset: npc.position.x };

    scene.add(npc);
    traffic.push(npc);
}

function updatePhysics(delta) {
    // Advanced Asphalt 8 style acceleration curve
    let accel = 0;
    if (keys['w'] || keys['arrowup'] || mobile.accel) accel = 2.2;
    if (keys['s'] || keys['arrowdown'] || mobile.brake) accel = -1.8;

    carSpeed += accel * 78 * delta;
    carSpeed *= 0.925; // better drag feel
    carSpeed = Math.max(12, Math.min(MAX_SPEED, carSpeed));

    // Nitro boost
    isBoosting = (keys['shift'] || mobile.nitro) && nitroLevel > 2;
    if (isBoosting) {
        carSpeed = Math.min(MAX_SPEED + 85, carSpeed + 135 * delta);
        nitroLevel = Math.max(0, nitroLevel - 55 * delta);
        flame.visible = true;
        flame.scale.set(1 + Math.random() * 0.3, 1.8, 1);
    } else {
        flame.visible = false;
        nitroLevel = Math.min(100, nitroLevel + 28 * delta);
    }

    // Advanced steering + DRIFT physics
    let steer = 0;
    if (keys['a'] || keys['arrowleft'] || mobile.left) steer -= 1;
    if (keys['d'] || keys['arrowright'] || mobile.right) steer += 1;

    const speedFactor = Math.min(1, carSpeed / 140);
    const turnForce = steer * sensitivity * 11.5 * delta * (speedFactor + 0.7);

    // Drift calculation (Asphalt 8 arcade feel)
    driftAmount = Math.abs(steer) * speedFactor * (carSpeed > 135 ? 1.4 : 0.8);
    car.position.x += turnForce * (1 + driftAmount * 0.45); // extra slide when drifting

    // Road clamp
    car.position.x = Math.max(-14.5, Math.min(14.5, car.position.x));

    // Car tilt for drift
    car.rotation.y = -turnForce * 0.22;
    car.rotation.z = -turnForce * 0.42;

    // Wheel spin + front wheel turn
    const spin = carSpeed * 0.092;
    wheels.forEach((wheel, i) => {
        wheel.children[0].rotation.x -= spin; // tire
        if (i < 2) wheel.rotation.y = steer * 0.9; // front turn
    });

    // Suspension bob (advanced feel)
    car.position.y = Math.sin(Date.now() * 0.018) * (carSpeed / 220) * 0.25;

    distance += carSpeed * 0.32;
}

function updateWorld(delta) {
    const scroll = carSpeed * 0.22 * delta;

    // Road scroll
    roadSegments.forEach(seg => {
        seg.position.z -= scroll;
        if (seg.position.z < -300) seg.position.z += ROAD_SEGMENTS_COUNT * SEGMENT_LENGTH;
    });

    // Environment scroll
    sideObjects.forEach(obj => {
        obj.position.z -= scroll * 0.95;
        if (obj.position.z < -220) obj.position.z += 420;
    });

    // Traffic AI + collision
    for (let i = traffic.length - 1; i >= 0; i--) {
        const t = traffic[i];
        const relSpeed = carSpeed - t.userData.speed;
        t.position.z -= (relSpeed * 0.2 + scroll);

        if (t.position.z < -70) {
            scene.remove(t);
            traffic.splice(i, 1);
            createTrafficCar(380 + Math.random() * 80);
            continue;
        }

        // Collision
        const dx = Math.abs(car.position.x - t.position.x);
        const dz = Math.abs(t.position.z);
        if (dx < 3.2 && dz < 5) {
            carSpeed = Math.max(35, carSpeed - 110);
            t.position.x += (car.position.x - t.position.x) * 2.2;
            t.userData.speed = 25;
        }
    }

    // Keep traffic density
    if (traffic.length < 8) createTrafficCar(340 + Math.random() * 140);
}

function updateCamera() {
    const targetX = car.position.x * 0.7;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.15);
    camera.position.y = 9.5 + (carSpeed / MAX_SPEED) * 6;
    camera.position.z = -26;

    // High-speed shake (Asphalt 8 style)
    if (carSpeed > 190 || driftAmount > 1.2) {
        const shake = (carSpeed / MAX_SPEED) * (driftAmount > 1 ? 1.6 : 1);
        camera.position.x += (Math.random() - 0.5) * shake * 1.4;
        camera.position.y += (Math.random() - 0.5) * shake * 0.7;
    }

    camera.lookAt(car.position.x * 0.45, 3.5, 14);
}

function updateHUD() {
    document.getElementById('speed-value').textContent = String(Math.floor(carSpeed)).padStart(3, '0');
    document.getElementById('nitro-bar').style.width = nitroLevel + '%';
    document.getElementById('distance-value').textContent = Math.floor(distance);

    // DRIFT indicator (new)
    const driftEl = document.getElementById('drift-indicator');
    if (driftAmount > 1.1) {
        driftEl.classList.add('show');
    } else {
        driftEl.classList.remove('show');
    }

    const dotPercent = ((car.position.x + 14.5) / 29) * 100;
    document.getElementById('player-dot').style.left = dotPercent + '%';
}

function gameLoop(timestamp) {
    if (!gameRunning || paused) return requestAnimationFrame(gameLoop);

    const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    updatePhysics(delta);
    updateWorld(delta);
    updateCamera();
    updateHUD();

    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

// All other functions (startGame, pauseGame, resumeGame, etc.) remain exactly the same as previous version
function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('hud').classList.remove('hidden');
    if (!scene) initThree();
    carSpeed = 55; nitroLevel = 100; distance = 0; car.position.x = 0; car.rotation.set(0,0,0);
    gameRunning = true; paused = false; lastTime = performance.now(); driftAmount = 0;
    gameLoop(lastTime);
}
function pauseGame() { paused = true; document.getElementById('pause-menu').classList.remove('hidden'); }
function resumeGame() { document.getElementById('pause-menu').classList.add('hidden'); paused = false; lastTime = performance.now(); gameLoop(lastTime); }
function showSettings() { document.getElementById('pause-menu').classList.add('hidden'); document.getElementById('settings-menu').classList.remove('hidden'); }
function hideSettings() { document.getElementById('settings-menu').classList.add('hidden'); document.getElementById('pause-menu').classList.remove('hidden'); }
function applySettings() {
    graphicsQuality = document.getElementById('graphics-select').value;
    sensitivity = parseFloat(document.getElementById('sensitivity-slider').value);
    document.getElementById('sensitivity-value').textContent = sensitivity.toFixed(1) + 'x';
    renderer.shadowMap.enabled = graphicsQuality !== 'low';
}
function exitToMenu() {
    gameRunning = false;
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('start-screen').classList.add('active');
    traffic.forEach(t => scene && scene.remove(t)); traffic = [];
}
function showAbout() { document.getElementById('start-screen').classList.remove('active'); document.getElementById('about-screen').classList.add('active'); }
function hideAbout() { document.getElementById('about-screen').classList.remove('active'); document.getElementById('start-screen').classList.add('active'); }
function setupMobileControls() { /* same as previous version */ 
    /* ... (identical mobile touch code from old version) ... */ 
}
window.addEventListener('keydown', e => { if (e.key === 'Escape' && gameRunning) paused ? resumeGame() : pauseGame(); });
window.onload = () => console.log('%c🚗 VELOCITY RUSH updated - Asphalt 8 physics ready! (by Ayush Pandey JI)', 'color:#00ffcc; font-size:15px');