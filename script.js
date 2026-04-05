// script.js - SPEED FIXED: Now 250 KM/H TOP SPEED + Faster Acceleration
let scene, camera, renderer;
let car, wheels = [], flame, spoiler;
let roadSegments = [];
let traffic = [];
let sideObjects = [];
let keys = {};
let mobile = { left: false, right: false, accel: false, brake: false, nitro: false };
let carSpeed = 0;
let nitroLevel = 100;
let isBoosting = false;
let distance = 0;
let gameRunning = false;
let paused = false;
let sensitivity = 1.2;
let graphicsQuality = 'medium';
let lastTime = 0;
let driftAmount = 0;

const ROAD_WIDTH = 32;
const SEGMENT_LENGTH = 65;
const MAX_SPEED = 250;          // ✅ UPDATED TO 250 KM/H AS REQUESTED
const ROAD_SEGMENTS_COUNT = 10;

function initThree() {
    const container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xaaccff, 80, 420);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xaaddff, 0x88bb66, 1.3);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffeeaa, 1.7);
    sun.position.set(80, 130, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xccddee, 0.8));

    const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 32), 
        new THREE.MeshBasicMaterial({ color: 0xaaccff, side: THREE.BackSide }));
    scene.add(sky);

    createCar();
    createRoad();
    createEnvironment();

    for (let i = 0; i < 9; i++) createTrafficCar(200 + i * 60);

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
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.05, 5.6);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0077cc, shininess: 140, specular: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.45;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.15, 2.9), 
        new THREE.MeshPhongMaterial({ color: 0x112233, transparent: true, opacity: 0.88 }));
    cabin.position.set(0, 2.25, -0.7);
    car.add(cabin);

    spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 1.1), 
        new THREE.MeshPhongMaterial({ color: 0x002244 }));
    spoiler.position.set(0, 2.8, -2.6);
    spoiler.rotation.x = 0.3;
    car.add(spoiler);

    wheels = [];
    const wheelPositions = [{x:-1.2,z:1.8}, {x:1.2,z:1.8}, {x:-1.2,z:-1.9}, {x:1.2,z:-1.9}];
    wheelPositions.forEach(pos => {
        const wheelGroup = new THREE.Group();
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 32), 
            new THREE.MeshPhongMaterial({ color: 0x111111 }));
        tire.rotation.z = Math.PI / 2;
        wheelGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 32), 
            new THREE.MeshPhongMaterial({ color: 0xcccccc }));
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);
        wheelGroup.position.set(pos.x, 0.75, pos.z);
        car.add(wheelGroup);
        wheels.push(wheelGroup);
    });

    flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.8, 8), 
        new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
    flame.position.set(0, 1.1, -3.6);
    flame.rotation.x = Math.PI;
    flame.visible = false;
    car.add(flame);

    scene.add(car);
    car.position.set(0, 0.1, 0);
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

        for (let lane = -1; lane <= 1; lane++) {
            for (let d = 0; d < 8; d++) {
                const dash = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.7, 5),
                    new THREE.MeshPhongMaterial({ color: 0xffff44, emissive: 0xffff44 })
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
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const frondMat = new THREE.MeshPhongMaterial({ color: 0x00aa44 });

    for (let i = 0; i < 22; i++) {
        const palm = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 4.5, 8), trunkMat);
        trunk.position.y = 2.25;
        palm.add(trunk);
        
        for (let k = 0; k < 7; k++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.2, 5), frondMat);
            frond.position.y = 5.2;
            frond.rotation.z = (k - 3) * 0.4;
            frond.rotation.x = Math.random() * 0.6 + 0.8;
            palm.add(frond);
        }
        
        palm.position.set(-18 + Math.random() * 3, 0, i * 24 - 120);
        palm.rotation.y = Math.random() * Math.PI;
        scene.add(palm);
        sideObjects.push(palm);

        const palmRight = palm.clone();
        palmRight.position.x = 18 - Math.random() * 3;
        scene.add(palmRight);
        sideObjects.push(palmRight);
    }

    const barrierMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    for (let i = 0; i < 14; i++) {
        const left = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 10), barrierMat);
        left.position.set(-16.8, 0.6, i * 38 - 140);
        scene.add(left);
        sideObjects.push(left);

        const right = left.clone();
        right.position.x = 16.8;
        scene.add(right);
        sideObjects.push(right);
    }
}

function createTrafficCar(zPos) {
    const npc = new THREE.Group();
    const colors = [0xaa5533, 0x777777, 0x99aa33, 0xcc6644, 0x555588];
    const col = colors[Math.floor(Math.random() * colors.length)];

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 4.8), 
        new THREE.MeshPhongMaterial({ color: col, shininess: 40 }));
    body.position.y = 1.25;
    npc.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 2.4), 
        new THREE.MeshPhongMaterial({ color: 0x222222 }));
    cabin.position.set(0, 2.05, -0.5);
    npc.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 24);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    [-1.1, 1.1].forEach(x => {
        [-1.6, 1.6].forEach(z => {
            const w = new THREE.Mesh(wheelGeo, wMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.65, z);
            npc.add(w);
        });
    });

    npc.position.set((Math.random() * 2 - 1) * 11, 0, zPos);
    npc.userData = { speed: 55 + Math.random() * 65, laneOffset: npc.position.x };
    scene.add(npc);
    traffic.push(npc);
}

function updatePhysics(delta) {
    let accel = 0;
    if (keys['w'] || keys['arrowup'] || mobile.accel) accel = 2.6;   // ✅ FASTER ACCELERATION
    if (keys['s'] || keys['arrowdown'] || mobile.brake) accel = -2.0;

    carSpeed += accel * 95 * delta;   // ✅ INCREASED FOR QUICKER REACH TO 250
    carSpeed *= 0.925;                // smoother feel
    carSpeed = Math.max(18, Math.min(MAX_SPEED, carSpeed));

    isBoosting = (keys['shift'] || mobile.nitro) && nitroLevel > 2;
    if (isBoosting) {
        carSpeed = Math.min(MAX_SPEED + 80, carSpeed + 145 * delta);
        nitroLevel = Math.max(0, nitroLevel - 55 * delta);
        flame.visible = true;
        flame.scale.set(1 + Math.random() * 0.3, 1.8, 1);
    } else {
        flame.visible = false;
        nitroLevel = Math.min(100, nitroLevel + 28 * delta);
    }

    let steer = 0;
    if (keys['a'] || keys['arrowleft'] || mobile.left) steer -= 1;
    if (keys['d'] || keys['arrowright'] || mobile.right) steer += 1;

    const speedFactor = Math.min(1, carSpeed / 140);
    const turnForce = steer * sensitivity * 12.5 * delta * (speedFactor + 0.8);

    driftAmount = Math.abs(steer) * speedFactor * (carSpeed > 130 ? 1.5 : 0.9);
    car.position.x += turnForce * (1 + driftAmount * 0.5);

    const edge = ROAD_WIDTH / 2 - 3;
    if (car.position.x < -edge) car.position.x = -edge + 0.3;
    if (car.position.x > edge) car.position.x = edge - 0.3;

    car.rotation.y = -turnForce * 0.24;
    car.rotation.z = -turnForce * 0.45;

    const spin = carSpeed * 0.095;
    wheels.forEach((wheel, i) => {
        wheel.children[0].rotation.x -= spin;
        if (i < 2) wheel.rotation.y = steer * 1.1;
    });

    car.position.y = Math.sin(Date.now() * 0.02) * (carSpeed / 220) * 0.2 + 0.1;
    distance += carSpeed * 0.34;
}

function updateWorld(delta) {
    const scroll = carSpeed * 0.23 * delta;

    roadSegments.forEach(seg => {
        seg.position.z -= scroll;
        if (seg.position.z < -300) seg.position.z += ROAD_SEGMENTS_COUNT * SEGMENT_LENGTH;
    });

    sideObjects.forEach(obj => {
        obj.position.z -= scroll * 0.96;
        if (obj.position.z < -240) obj.position.z += 460;
    });

    for (let i = traffic.length - 1; i >= 0; i--) {
        const t = traffic[i];
        const relSpeed = carSpeed - t.userData.speed;
        t.position.z -= (relSpeed * 0.22 + scroll);

        if (t.position.z < -70) {
            scene.remove(t);
            traffic.splice(i, 1);
            createTrafficCar(380 + Math.random() * 90);
            continue;
        }

        const dx = Math.abs(car.position.x - t.position.x);
        const dz = Math.abs(t.position.z);
        if (dx < 3.2 && dz < 5) {
            carSpeed = Math.max(38, carSpeed - 115);
            t.position.x += (car.position.x - t.position.x) * 2.4;
        }
    }

    if (traffic.length < 8) createTrafficCar(350 + Math.random() * 140);
}

function updateCamera() {
    const targetX = car.position.x * 0.7;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.16);
    camera.position.y = 9.8 + (carSpeed / MAX_SPEED) * 6;
    camera.position.z = -26;

    if (carSpeed > 185 || driftAmount > 1.2) {
        const shake = (carSpeed / MAX_SPEED) * 1.3;
        camera.position.x += (Math.random() - 0.5) * shake * 1.3;
        camera.position.y += (Math.random() - 0.5) * shake * 0.7;
    }

    camera.lookAt(car.position.x * 0.45, 3.8, 15);
}

function updateHUD() {
    document.getElementById('speed-value').textContent = String(Math.floor(carSpeed)).padStart(3, '0');
    document.getElementById('nitro-bar').style.width = nitroLevel + '%';
    document.getElementById('distance-value').textContent = Math.floor(distance);

    const driftEl = document.getElementById('drift-indicator');
    driftAmount > 1.1 ? driftEl.classList.add('show') : driftEl.classList.remove('show');

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

function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('hud').classList.remove('hidden');
    if (!scene) initThree();
    carSpeed = 65; nitroLevel = 100; distance = 0; car.position.set(0, 0.1, 0); car.rotation.set(0,0,0);
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
function setupMobileControls() {
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const accelBtn = document.getElementById('accel-btn');
    const brakeBtn = document.getElementById('brake-btn');
    const nitroBtn = document.getElementById('nitro-btn');
    const set = (btn, key, val) => {
        btn.addEventListener('touchstart', e => { e.preventDefault(); mobile[key] = val; });
        btn.addEventListener('touchend', e => { e.preventDefault(); mobile[key] = !val; });
    };
    set(leftBtn, 'left', true);
    set(rightBtn, 'right', true);
    set(accelBtn, 'accel', true);
    set(brakeBtn, 'brake', true);
    set(nitroBtn, 'nitro', true);
    if ('ontouchstart' in window) document.getElementById('mobile-controls').classList.remove('hidden');
}
window.addEventListener('keydown', e => { if (e.key === 'Escape' && gameRunning) paused ? resumeGame() : pauseGame(); });
window.onload = () => console.log('%c🚗 VELOCITY RUSH - 250 KM/H SPEED FIXED! (by Ayush Pandey JI)', 'color:#ffee88; font-size:15px');