// script.js - Complete 3D Car Racing Game with OPTIMIZED Mobile Touch Controls
let scene, camera, renderer;
let car, wheels = [];
let road, roadTexture;
let scenery = [];
let traffic = [];
let keys = {};
let velocity = 0;
let maxVelocity = 110;
let acceleration = 45;
let brakePower = 80;
let nitro = 100;
let nitroActive = false;
let steering = 0;
let turnSensitivity = 1.2;
let distanceTraveled = 0;
let score = 0;
let gameState = 'start'; // start, playing, paused, gameover
let clock;
let lastTime = 0;
let graphicsQuality = 'high';
let isMobile = false;

// NEW: Optimized mobile touch variables
let touchSteering = 0;        // -1.0 (full left) to +1.0 (full right) - ANALOG

const ROAD_WIDTH = 24;
const LANE_WIDTH = 8;
const CAR_WIDTH = 3.8;
const CAR_LENGTH = 7.5;

function initThree() {
    clock = new THREE.Clock();
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x112233, 0.0035);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
    
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = graphicsQuality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // LIGHTING
    const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x223311, 0.9);
    scene.add(hemiLight);
    
    const sunLight = new THREE.DirectionalLight(0xffeecc, 1.2);
    sunLight.position.set(80, 120, -60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
    scene.add(sunLight);
    
    scene.background = new THREE.Color(0x112233);
    
    createRoad();
    createCar();
    createScenery();
    
    window.addEventListener('resize', onResize);
}

function createRoad() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, 60, canvas.height);
    ctx.fillRect(canvas.width - 60, 0, 60, canvas.height);
    
    ctx.fillStyle = '#eeeeee';
    const dash = 110;
    const gap = 55;
    for (let y = -dash; y < canvas.height + dash; y += dash + gap) {
        ctx.fillRect(68, y, 18, dash);
        ctx.fillRect(canvas.width / 2 - 9, y, 18, dash);
        ctx.fillRect(canvas.width - 86, y, 18, dash);
    }
    
    roadTexture = new THREE.CanvasTexture(canvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1.8, 12);
    
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 800);
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture, side: THREE.DoubleSide });
    
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.1;
    road.receiveShadow = true;
    scene.add(road);
}

function createCar() {
    car = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(CAR_WIDTH, 1.8, CAR_LENGTH);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x0066ff,
        specular: 0xaaaaaa,
        shininess: 120
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.4;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);
    
    const cabinGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.75, 1.4, CAR_LENGTH * 0.55);
    const cabinMat = new THREE.MeshPhongMaterial({
        color: 0x112233,
        specular: 0xdddddd,
        shininess: 80,
        transparent: true,
        opacity: 0.85
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.4, -0.8);
    car.add(cabin);
    
    const spoilerGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.9, 0.2, 1.8);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.set(0, 2.1, -3.6);
    car.add(spoiler);
    
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 32);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111, specular: 0x222222, shininess: 30 });
    
    const positions = [
        { x: -2.1, z: 2.4 },
        { x: 2.1, z: 2.4 },
        { x: -2.1, z: -2.6 },
        { x: 2.1, z: -2.6 }
    ];
    
    wheels = [];
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.6, pos.z);
        wheel.castShadow = true;
        car.add(wheel);
        wheels.push(wheel);
    });
    
    car.frontWheels = [wheels[0], wheels[1]];
    car.position.set(0, 0, 0);
    scene.add(car);
}

function createScenery() {
    for (let i = 0; i < 22; i++) {
        const tree = createTree();
        tree.position.set(-14 + Math.random() * 4, 0, -120 + i * 38 + Math.random() * 12);
        scene.add(tree);
        scenery.push(tree);
        
        const tree2 = createTree();
        tree2.position.set(14 - Math.random() * 4, 0, -120 + i * 38 + Math.random() * 12);
        scene.add(tree2);
        scenery.push(tree2);
    }
    
    for (let i = 0; i < 8; i++) {
        const mountainGeo = new THREE.ConeGeometry(18 + Math.random() * 12, 45, 5);
        const mountainMat = new THREE.MeshLambertMaterial({ color: 0x334455, flatShading: true });
        const mountain = new THREE.Mesh(mountainGeo, mountainMat);
        mountain.position.set((i % 2 === 0 ? -55 : 55) + (Math.random() * 20 - 10), 10, -200 + i * 60);
        mountain.rotation.y = Math.random() * Math.PI;
        scene.add(mountain);
        scenery.push(mountain);
    }
}

function createTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 3.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    group.add(trunk);
    
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x00bb44 });
    for (let i = 0; i < 3; i++) {
        const foliage = new THREE.Mesh(
            new THREE.ConeGeometry(2.8 - i * 0.6, 3.2, 6),
            foliageMat
        );
        foliage.position.y = 3 + i * 1.8;
        foliage.castShadow = true;
        group.add(foliage);
    }
    return group;
}

function createTrafficCar() {
    const group = new THREE.Group();
    const colors = [0xff2222, 0x22cc22, 0xffaa00, 0x4444ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 1.6, 7),
        new THREE.MeshPhongMaterial({ color: color, shininess: 40 })
    );
    body.position.y = 1.2;
    body.castShadow = true;
    group.add(body);
    
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.1, 3.2),
        new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 60 })
    );
    cabin.position.set(0, 2.1, -0.8);
    group.add(cabin);
    
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24);
    const wPositions = [{x:-1.8,z:2.4},{x:1.8,z:2.4},{x:-1.8,z:-2.4},{x:1.8,z:-2.4}];
    wPositions.forEach(p => {
        const w = new THREE.Mesh(wGeo, wMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p.x, 0.6, p.z);
        group.add(w);
    });
    
    group.userData = { speed: 35 + Math.random() * 35, lane: Math.floor(Math.random() * 3) - 1 };
    group.position.set(group.userData.lane * LANE_WIDTH, 0, 120 + Math.random() * 80);
    
    scene.add(group);
    return group;
}

function updateCar(delta) {
    // === ACCELERATION / BRAKING (Keyboard + Mobile Pedals) ===
    if (keys['w'] || keys['ArrowUp']) {
        velocity = Math.min(velocity + acceleration * delta, maxVelocity);
    }
    if (keys['s'] || keys['ArrowDown']) {
        velocity = Math.max(velocity - brakePower * delta * 1.8, 0);
    }
    
    // === NITRO (Keyboard + Mobile) ===
    if ((keys['Shift'] || keys['shift']) && nitro > 0) {
        nitroActive = true;
        velocity = Math.min(velocity + 65 * delta, maxVelocity + 45);
        nitro = Math.max(0, nitro - 48 * delta);
    } else {
        nitroActive = false;
        nitro = Math.min(100, nitro + 22 * delta);
    }
    
    // === STEERING - OPTIMIZED FOR MOBILE ===
    let keyboardSteer = 0;
    if (keys['a'] || keys['ArrowLeft']) keyboardSteer -= 1;
    if (keys['d'] || keys['ArrowRight']) keyboardSteer += 1;
    
    if (isMobile && Math.abs(touchSteering) > 0.08) {
        // Use ANALOG joystick value for buttery-smooth steering on mobile
        steering = touchSteering;
    } else {
        // Fallback to keyboard (works on desktop + any mobile with keyboard)
        steering = keyboardSteer;
    }
    
    steering *= turnSensitivity;
    
    // Apply steering to car position
    const turnAmount = steering * (8 + velocity * 0.12) * delta;
    car.position.x = Math.max(-ROAD_WIDTH / 2 + CAR_WIDTH / 2 + 1, 
                  Math.min(ROAD_WIDTH / 2 - CAR_WIDTH / 2 - 1, car.position.x + turnAmount));
    
    // Visual drift & lean
    car.rotation.y = steering * 0.18 * (velocity / maxVelocity);
    
    // Wheel rolling + front wheel turn
    const rollSpeed = velocity * delta * 9.5;
    wheels.forEach((wheel, i) => {
        wheel.rotation.x -= rollSpeed;
        if (i < 2) wheel.rotation.y = steering * 0.7;
    });
    
    // Nitro flame
    if (nitroActive && !car.flame) createFlame();
    else if (!nitroActive && car.flame) {
        car.remove(car.flame);
        car.flame = null;
    }
    if (car.flame) {
        car.flame.scale.setScalar(0.9 + Math.random() * 0.4);
        car.flame.material.opacity = 0.7 + Math.random() * 0.3;
    }
}

function createFlame() {
    const flameGeo = new THREE.ConeGeometry(0.8, 3.2, 6);
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 1.1, -4.1);
    car.add(flame);
    car.flame = flame;
}

function updateTraffic(delta) {
    for (let i = traffic.length - 1; i >= 0; i--) {
        const t = traffic[i];
        const relativeSpeed = velocity - t.userData.speed;
        t.position.z -= relativeSpeed * delta * 1.8;
        
        if (t.position.z < -60) {
            scene.remove(t);
            traffic.splice(i, 1);
            continue;
        }
        
        const dx = Math.abs(car.position.x - t.position.x);
        const dz = Math.abs(car.position.z - t.position.z);
        if (dx < (CAR_WIDTH + 3.6) / 2 && dz < (CAR_LENGTH + 7) / 2) {
            triggerGameOver();
            return;
        }
    }
    
    if (traffic.length < 9 && Math.random() < 0.035) {
        traffic.push(createTrafficCar());
    }
}

function updateScenery(delta) {
    const moveSpeed = velocity * delta * 1.1;
    for (let i = scenery.length - 1; i >= 0; i--) {
        const obj = scenery[i];
        obj.position.z -= moveSpeed;
        if (obj.position.z < -220) obj.position.z += 520;
    }
    if (roadTexture) roadTexture.offset.y -= (velocity * delta * 0.018);
}

function updateCamera() {
    const targetX = car.position.x * 0.4;
    const idealPos = new THREE.Vector3(targetX, 9 + velocity * 0.018, -19);
    camera.position.lerp(idealPos, 0.12);
    camera.lookAt(car.position.x * 0.3, 2.5, 8);
}

function updateHUD() {
    const displaySpeed = Math.floor(Math.max(0, velocity * 2.8));
    document.getElementById('speed-value').textContent = String(displaySpeed).padStart(3, '0');
    
    document.getElementById('nitro-fill').style.width = `${nitro}%`;
    
    distanceTraveled += velocity * 0.018;
    const km = (distanceTraveled / 100).toFixed(1);
    document.getElementById('distance').textContent = `${km} km`;
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    if (gameState === 'playing') {
        updateCar(delta);
        updateTraffic(delta);
        updateScenery(delta);
        updateCamera();
        updateHUD();
        score = Math.floor(distanceTraveled * 1.4);
    }
    
    renderer.render(scene, camera);
}

function triggerGameOver() {
    gameState = 'gameover';
    document.getElementById('hud').classList.remove('active');
    const gameOver = document.getElementById('game-over-screen');
    gameOver.style.display = 'flex';
    document.getElementById('final-distance').textContent = `DISTANCE: ${(distanceTraveled / 100).toFixed(1)} km`;
    document.getElementById('final-score').textContent = `SCORE: ${Math.floor(score)}`;
    velocity = 0;
}

function resetGame() {
    velocity = 0;
    distanceTraveled = 0;
    score = 0;
    nitro = 100;
    car.position.x = 0;
    car.rotation.y = 0;
    touchSteering = 0;
    traffic.forEach(t => scene.remove(t));
    traffic = [];
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('settings-menu').style.display = 'none';
}

function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('hud').classList.add('active');
    resetGame();
    for (let i = 0; i < 5; i++) {
        const t = createTrafficCar();
        t.position.z = 80 + i * 45;
        traffic.push(t);
    }
}

function onResize() {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ====================== OPTIMIZED MOBILE TOUCH CONTROLS ======================
function setupMobileControls() {
    const container = document.getElementById('joystick-container');
    const knob = document.getElementById('joystick-knob');
    let activeTouchId = null;
    let centerX = 0;
    let centerY = 0;
    const maxRadius = 58;
    
    function moveKnob(clientX, clientY) {
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const clampedDist = Math.min(distance, maxRadius);
        const finalX = Math.cos(angle) * clampedDist;
        const finalY = Math.sin(angle) * clampedDist;
        
        knob.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
        
        // Steering uses ONLY horizontal axis (perfect for racing)
        touchSteering = finalX / maxRadius;
    }
    
    // Joystick touch handlers
    container.addEventListener('touchstart', e => {
        if (activeTouchId !== null) return;
        e.preventDefault();
        
        const rect = container.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
        
        activeTouchId = e.changedTouches[0].identifier;
        moveKnob(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    });
    
    window.addEventListener('touchmove', e => {
        if (activeTouchId === null) return;
        for (let touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                e.preventDefault();
                moveKnob(touch.clientX, touch.clientY);
                return;
            }
        }
    });
    
    window.addEventListener('touchend', e => {
        if (activeTouchId === null) return;
        for (let touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                activeTouchId = null;
                knob.style.transition = 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)';
                knob.style.transform = 'translate(-50%, -50%)';
                setTimeout(() => { knob.style.transition = 'none'; }, 200);
                touchSteering = 0;
                return;
            }
        }
    });
    
    // === PEDAL BUTTONS (large, responsive) ===
    const accelBtn = document.getElementById('mobile-accel');
    const brakeBtn = document.getElementById('mobile-brake');
    const nitroBtn = document.getElementById('mobile-nitro');
    
    const bindButton = (btn, key) => {
        btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
        btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
        btn.addEventListener('touchcancel', e => { e.preventDefault(); keys[key] = false; });
    };
    
    bindButton(accelBtn, 'w');
    bindButton(brakeBtn, 's');
    bindButton(nitroBtn, 'Shift');
}

function setupControls() {
    // Keyboard
    window.addEventListener('keydown', e => { keys[e.key] = true; });
    window.addEventListener('keyup', e => { keys[e.key] = false; });
    
    // Improved mobile detection
    isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window && navigator.maxTouchPoints > 1);
    
    if (isMobile) {
        document.getElementById('mobile-controls').style.display = 'flex';
        setupMobileControls();
    }
    
    // UI Buttons
    document.getElementById('play-btn').addEventListener('click', startGame);
    
    document.getElementById('resume-btn').addEventListener('click', () => {
        gameState = 'playing';
        document.getElementById('pause-menu').style.display = 'none';
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('settings-menu').style.display = 'flex';
    });
    
    document.getElementById('quit-btn').addEventListener('click', () => {
        gameState = 'start';
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('hud').classList.remove('active');
        resetGame();
    });
    
    document.getElementById('back-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-menu').style.display = 'none';
        if (gameState === 'paused') document.getElementById('pause-menu').style.display = 'flex';
    });
    
    const sensSlider = document.getElementById('sensitivity-slider');
    sensSlider.addEventListener('input', () => {
        turnSensitivity = parseFloat(sensSlider.value);
        document.getElementById('sensitivity-value').textContent = turnSensitivity.toFixed(1) + 'x';
    });
    
    document.getElementById('graphics-select').addEventListener('change', e => {
        graphicsQuality = e.target.value;
        if (renderer) renderer.shadowMap.enabled = graphicsQuality !== 'low';
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
        resetGame();
        startGame();
    });
    
    document.getElementById('menu-btn').addEventListener('click', () => {
        gameState = 'start';
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('hud').classList.remove('active');
    });
}

// ====================== START ======================
initThree();
setupControls(