// script.js - FULLY UPDATED v4 (Ayush Pandey JI)
// ✅ NPC cars now move independently (even when player speed = 0)
// ✅ Player car starts at 0 speed → only accelerates when you press ACCEL / W
// ✅ Jungle environment added around road: trees 🌲, rocks 🪨, water 🌊
// ✅ Road remains perfect, everything outside road is jungle style
// ✅ Mobile now has ACCEL + BRAKE buttons

let scene, camera, renderer, clock;
let carGroup, wheelMeshes = [], flameMesh;
let roadSegments = [];
let trafficCars = [];
let keys = {};
let isLeftPressed = false;
let isRightPressed = false;
let isAccelPressed = false;
let isBrakePressed = false;
let isNitroPressed = false;
let currentSpeed = 0;
let nitroLevel = 100;
let distanceTraveled = 0;
let gameState = 'start';
let lastSpawnTime = 0;
let graphicsQuality = 'medium';
let sensitivity = 1.0;
let isMobile = false;

let audioContext, engineOscillator, engineGain, soundEnabled = true;
let nitroSoundTime = 0;

const ROAD_WIDTH = 22;
const SEGMENT_LENGTH = 65;
const NUM_SEGMENTS = 7;
const MAX_SPEED = 168;
const TURN_SPEED_BASE = 52;

// Create a simple tree for jungle
function createTree() {
    const group = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.55, 3.8, 8);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.9;
    group.add(trunk);
    // Foliage layers
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x00aa44 });
    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.2, 8), leafMat);
    foliage1.position.y = 4.8;
    group.add(foliage1);
    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.5, 8), leafMat);
    foliage2.position.y = 3.6;
    group.add(foliage2);
    const foliage3 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.8, 8), leafMat);
    foliage3.position.y = 2.6;
    group.add(foliage3);
    return group;
}

// Create a simple rock
function createRock() {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 10 });
    const main = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.8), rockMat);
    main.position.y = 0.8;
    main.rotation.set(0.3, 0.8, 0.4);
    group.add(main);
    const small = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.4), rockMat);
    small.position.set(1.2, 0.6, 0.8);
    small.rotation.set(1, 0.5, 0);
    group.add(small);
    return group;
}

// Core initialization
function initThree() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x88aaff, 12, 290);
    scene.background = new THREE.Color(0x88aaff);

    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 420);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.2));

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffeecc, 1.5);
    sun.position.set(30, 50, 20);
    scene.add(sun);

    // Audio
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        engineOscillator = audioContext.createOscillator();
        engineOscillator.type = 'sawtooth';
        engineOscillator.frequency.setValueAtTime(65, audioContext.currentTime);
        engineGain = audioContext.createGain();
        engineGain.gain.value = 0;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        engineOscillator.connect(filter).connect(engineGain).connect(audioContext.destination);
        engineOscillator.start();
    } catch(e) {}

    console.log('%c🚗 HIGHWAY RACER v4 - Jungle + Zero start + Moving NPCs', 'color:#00ddff; font-weight:bold');
}

function createPlayerCar() {
    carGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(4.2, 1.6, 9);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0066cc, shininess: 95, specular: 0x222222 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.35;
    carGroup.add(body);

    const cabinGeo = new THREE.BoxGeometry(3.1, 1.4, 4.8);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x112233, transparent: true, opacity: 0.85 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.55, -0.8);
    carGroup.add(cabin);

    const spoilerGeo = new THREE.BoxGeometry(3.8, 0.2, 1.2);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.set(0, 2.8, -4.1);
    spoiler.rotation.x = 0.2;
    carGroup.add(spoiler);

    wheelMeshes = [];
    const wheelGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.45, 32);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const positions = [{x:-2.05,z:3.1},{x:2.05,z:3.1},{x:-2.05,z:-3.1},{x:2.05,z:-3.1}];
    positions.forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p.x, 0.9, p.z);
        carGroup.add(w);
        wheelMeshes.push(w);
    });

    const flameGeo = new THREE.ConeGeometry(1.1, 4.5, 6);
    const flameMat = new THREE.MeshPhongMaterial({ color: 0xff2200, emissive: 0xff8800, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.rotation.x = Math.PI;
    flameMesh.position.set(0, 1.3, -5.8);
    flameMesh.visible = false;
    carGroup.add(flameMesh);

    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);
}

function createHighway() {
    roadSegments = [];
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const lineMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xddddff });
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x228822 });

    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const segment = new THREE.Group();

        // Main road
        const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH), roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.position.y = 0.05;
        segment.add(roadMesh);

        // Barriers
        const barrierMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const leftBarrier = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, SEGMENT_LENGTH), barrierMat);
        leftBarrier.position.set(-(ROAD_WIDTH / 2 + 0.6), 1.8, 0);
        segment.add(leftBarrier);
        const rightBarrier = leftBarrier.clone();
        rightBarrier.position.x = (ROAD_WIDTH / 2 + 0.6);
        segment.add(rightBarrier);

        // Lane markings
        const laneXs = [-ROAD_WIDTH * 0.33, 0, ROAD_WIDTH * 0.33];
        laneXs.forEach(x => {
            for (let d = 0; d < 9; d++) {
                const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 4.5), lineMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.12, -SEGMENT_LENGTH / 2 + d * 7.8);
                segment.add(dash);
            }
        });

        // === JUNGLE ENVIRONMENT (outside road) ===
        // Wider grass ground on both sides
        const sideWidth = 22;
        const leftGrass = new THREE.Mesh(new THREE.PlaneGeometry(sideWidth, SEGMENT_LENGTH), grassMat);
        leftGrass.rotation.x = -Math.PI / 2;
        leftGrass.position.set(-(ROAD_WIDTH / 2 + sideWidth / 2), 0.02, 0);
        segment.add(leftGrass);

        const rightGrass = leftGrass.clone();
        rightGrass.position.x *= -1;
        segment.add(rightGrass);

        // Trees on left side
        for (let t = 0; t < 4; t++) {
            const tree = createTree();
            tree.position.set(
                -(ROAD_WIDTH / 2 + 8 + Math.random() * 14),
                0,
                -SEGMENT_LENGTH / 2 + Math.random() * SEGMENT_LENGTH
            );
            segment.add(tree);
        }
        // Trees on right side
        for (let t = 0; t < 4; t++) {
            const tree = createTree();
            tree.position.set(
                (ROAD_WIDTH / 2 + 8 + Math.random() * 14),
                0,
                -SEGMENT_LENGTH / 2 + Math.random() * SEGMENT_LENGTH
            );
            segment.add(tree);
        }

        // Rocks
        for (let r = 0; r < 3; r++) {
            const rock = createRock();
            rock.position.set(
                -(ROAD_WIDTH / 2 + 6 + Math.random() * 18),
                0,
                -SEGMENT_LENGTH / 2 + Math.random() * SEGMENT_LENGTH
            );
            rock.scale.set(0.8 + Math.random(), 0.7 + Math.random() * 0.6, 0.8 + Math.random());
            segment.add(rock);
        }
        for (let r = 0; r < 3; r++) {
            const rock = createRock();
            rock.position.set(
                (ROAD_WIDTH / 2 + 6 + Math.random() * 18),
                0,
                -SEGMENT_LENGTH / 2 + Math.random() * SEGMENT_LENGTH
            );
            rock.scale.set(0.8 + Math.random(), 0.7 + Math.random() * 0.6, 0.8 + Math.random());
            segment.add(rock);
        }

        // Occasional water body (every 2nd segment)
        if (i % 2 === 0) {
            const waterMat = new THREE.MeshPhongMaterial({
                color: 0x0088ff,
                shininess: 90,
                transparent: true,
                opacity: 0.75
            });
            const water = new THREE.Mesh(new THREE.PlaneGeometry(14, SEGMENT_LENGTH * 0.7), waterMat);
            water.rotation.x = -Math.PI / 2;
            water.position.set(
                -(ROAD_WIDTH / 2 + 22),
                0.03,
                -SEGMENT_LENGTH / 4
            );
            segment.add(water);
        }

        // Position segment
        segment.position.z = i * SEGMENT_LENGTH - (NUM_SEGMENTS * SEGMENT_LENGTH * 0.28);
        scene.add(segment);
        roadSegments.push(segment);
    }
}

function spawnTrafficCar() {
    const group = new THREE.Group();
    const colors = [0xff2222, 0x22aa22, 0xdddd22, 0x2222ff, 0xff8800];
    const bodyMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)], shininess: 60 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 7.5), bodyMat);
    body.position.y = 1.2;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.1, 3.8), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    cabin.position.set(0, 2.35, -0.9);
    group.add(cabin);

    const lanes = [-7.5, 0, 7.5];
    group.position.x = lanes[Math.floor(Math.random() * 3)];
    group.position.z = 70 + Math.random() * 120;   // far ahead
    group.userData = { speed: 65 + Math.random() * 45, alive: true };  // NPC speed
    scene.add(group);
    trafficCars.push(group);
}

function updateHighway(delta) {
    const moveDist = currentSpeed * delta * 1.38;
    roadSegments.forEach(s => s.position.z -= moveDist);

    let minSeg = roadSegments[0];
    let maxZ = roadSegments[0].position.z;
    roadSegments.forEach(s => {
        if (s.position.z < minSeg.position.z) minSeg = s;
        if (s.position.z > maxZ) maxZ = s.position.z;
    });

    if (minSeg.position.z < -SEGMENT_LENGTH * 0.8) {
        minSeg.position.z = maxZ + SEGMENT_LENGTH - 0.1;
    }
}

function updateTraffic(delta) {
    const worldMove = currentSpeed * delta * 1.38;

    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        // NPC cars move at their own speed independently
        const relativeMove = (currentSpeed - car.userData.speed) * delta * 0.92 + worldMove;
        car.position.z -= relativeMove;

        if (car.position.z < -30) {
            scene.remove(car);
            trafficCars.splice(i, 1);
        }
    }

    if (Date.now() - lastSpawnTime > 1050 && trafficCars.length < 5) {
        spawnTrafficCar();
        lastSpawnTime = Date.now();
    }
}

function checkCollisions() {
    for (let i = 0; i < trafficCars.length; i++) {
        const t = trafficCars[i];
        const dx = Math.abs(carGroup.position.x - t.position.x);
        const dz = Math.abs(t.position.z);
        if (dx < 4.1 && dz < 7.2) {
            triggerCrash();
            return;
        }
    }
}

function playNitroSound() {
    if (!audioContext || !soundEnabled) return;
    const osc = audioContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, audioContext.currentTime);
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.6, audioContext.currentTime);
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, audioContext.currentTime);
    osc.connect(filter).connect(gain).connect(audioContext.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.9);
    osc.stop(audioContext.currentTime + 1);
}

function playCrashSound() {
    if (!audioContext || !soundEnabled) return;
    const bufferSize = Math.floor(audioContext.sampleRate * 1.2);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1800;
    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 1.2;
    noise.connect(noiseFilter).connect(noiseGain).connect(audioContext.destination);
    noise.start();
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.6);

    const boom = audioContext.createOscillator();
    boom.frequency.value = 120;
    const boomGain = audioContext.createGain();
    boomGain.gain.value = 0.9;
    boom.connect(boomGain).connect(audioContext.destination);
    boom.start();
    boomGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
    boom.stop(audioContext.currentTime + 1);
}

function updateEngineSound() {
    if (!engineOscillator || !soundEnabled) return;
    const pitch = 65 + (currentSpeed / MAX_SPEED) * 98;
    engineOscillator.frequency.setValueAtTime(pitch, audioContext.currentTime);
    const vol = Math.max(0, 0.08 + (currentSpeed / MAX_SPEED) * 0.32);
    engineGain.gain.value = vol;
}

function triggerCrash() {
    gameState = 'gameover';
    playCrashSound();
    document.getElementById('final-distance').innerHTML = Math.floor(distanceTraveled) + '<span class="unit"> km</span>';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    currentSpeed = 0;
    flameMesh.visible = false;
}

function updateGame(delta) {
    if (gameState !== 'playing') return;

    // Steering
    let steer = 0;
    if (keys['a'] || keys['arrowleft']) steer -= 1;
    if (keys['d'] || keys['arrowright']) steer += 1;
    if (isLeftPressed) steer += 1;
    if (isRightPressed) steer -= 1;

    const turnAmount = steer * TURN_SPEED_BASE * sensitivity * delta * (0.58 + currentSpeed / MAX_SPEED * 0.75);
    carGroup.position.x += turnAmount;
    carGroup.position.x = Math.max(-9.5, Math.min(9.5, carGroup.position.x));
    carGroup.rotation.y = steer * -0.115;

    // === SPEED LOGIC - STARTS AT 0, ONLY ACCELERATES WHEN YOU PRESS ACCEL ===
    let targetSpeed = MAX_SPEED;

    if (isNitroPressed && nitroLevel > 0) {
        targetSpeed = MAX_SPEED * 1.68;
        nitroLevel = Math.max(0, nitroLevel - 88 * delta);
        flameMesh.visible = true;
        flameMesh.scale.y = 1 + Math.sin(Date.now() * 0.022) * 0.35;
        if (Date.now() - nitroSoundTime > 650) {
            playNitroSound();
            nitroSoundTime = Date.now();
        }
    } else {
        flameMesh.visible = false;
        nitroLevel = Math.min(100, nitroLevel + 34 * delta);
    }

    if (keys['w'] || keys['arrowup'] || isAccelPressed) {
        currentSpeed = currentSpeed * 0.82 + targetSpeed * 0.18;   // strong acceleration
    } else if (keys['s'] || keys['arrowdown'] || isBrakePressed) {
        currentSpeed *= 0.65;
    } else {
        currentSpeed *= 0.92;   // natural coast down
    }

    currentSpeed = Math.max(0, Math.min(currentSpeed, targetSpeed + 18));

    // Wheels
    const roll = currentSpeed * delta * 0.14;
    wheelMeshes.forEach(w => w.rotation.x -= roll);
    if (wheelMeshes.length >= 2) {
        wheelMeshes[0].rotation.y = steer * 0.68;
        wheelMeshes[1].rotation.y = steer * 0.68;
    }

    updateHighway(delta);
    updateTraffic(delta);
    checkCollisions();
    distanceTraveled += (currentSpeed * delta) / 4.6;

    updateEngineSound();
    updateHUD();
}

function updateHUD() {
    document.getElementById('speed').textContent = Math.floor(currentSpeed);
    document.getElementById('nitro-fill').style.width = nitroLevel + '%';
    document.getElementById('distance').textContent = Math.floor(distanceTraveled);
}

function updateCamera() {
    const idealX = carGroup.position.x * 0.38;
    camera.position.x = camera.position.x * 0.86 + idealX * 0.14;
    camera.position.y = 8.2;
    camera.position.z = -29;
    camera.lookAt(carGroup.position.x * 0.45, 2.4, 22);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (gameState === 'playing') updateGame(delta);
    updateCamera();
    renderer.render(scene, camera);
}

function setupControls() {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'Escape' && gameState === 'playing') togglePause();
    });
    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mobile buttons
    document.getElementById('mobile-left').addEventListener('pointerdown', () => isLeftPressed = true);
    document.getElementById('mobile-left').addEventListener('pointerup', () => isLeftPressed = false);
    document.getElementById('mobile-left').addEventListener('pointerleave', () => isLeftPressed = false);

    document.getElementById('mobile-accel').addEventListener('pointerdown', () => isAccelPressed = true);
    document.getElementById('mobile-accel').addEventListener('pointerup', () => isAccelPressed = false);
    document.getElementById('mobile-accel').addEventListener('pointerleave', () => isAccelPressed = false);

    document.getElementById('mobile-brake').addEventListener('pointerdown', () => isBrakePressed = true);
    document.getElementById('mobile-brake').addEventListener('pointerup', () => isBrakePressed = false);
    document.getElementById('mobile-brake').addEventListener('pointerleave', () => isBrakePressed = false);

    document.getElementById('mobile-nitro').addEventListener('pointerdown', () => isNitroPressed = true);
    document.getElementById('mobile-nitro').addEventListener('pointerup', () => isNitroPressed = false);
    document.getElementById('mobile-nitro').addEventListener('pointerleave', () => isNitroPressed = false);

    document.getElementById('mobile-right').addEventListener('pointerdown', () => isRightPressed = true);
    document.getElementById('mobile-right').addEventListener('pointerup', () => isRightPressed = false);
    document.getElementById('mobile-right').addEventListener('pointerleave', () => isRightPressed = false);

    // UI buttons
    document.getElementById('play-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('exi