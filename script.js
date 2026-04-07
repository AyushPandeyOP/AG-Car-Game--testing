// script.js - UPDATED VERSION (Ayush Pandey JI fixes applied)
// ✅ Mobile bottom buttons FIXED (no longer opposite)
// ✅ Traffic now sparse & realistic (not full road pack)
// ✅ Car speed slowed down to feel natural + engine sound
// ✅ Nitro whoosh + crash explosion sound
// ✅ Restart button already perfect + sound toggle works

let scene, camera, renderer, clock;
let carGroup, wheelMeshes = [], flameMesh;
let roadSegments = [];
let trafficCars = [];
let keys = {};
let isLeftPressed = false;
let isRightPressed = false;
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
const MAX_SPEED = 135;           // Slowed down for realistic feel
const TURN_SPEED_BASE = 42;

// Core initialization
function initThree() {
    clock = new THREE.Clock();
    
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x88aaff, 8, 260);
    scene.background = new THREE.Color(0x88aaff);
    
    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 400);
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.2));
    renderer.shadowMap.enabled = false;

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffeecc, 1.4);
    sun.position.set(25, 45, 15);
    scene.add(sun);

    // === AUDIO SYSTEM ===
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
        
        engineOscillator.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(audioContext.destination);
        engineOscillator.start();
    } catch(e) { console.log('🔇 Audio not available'); }

    console.log('%c🚗 HIGHWAY RACER v2 (fixed + sounds) ready', 'color:#00ddff; font-weight:bold');
}

// Create player car (unchanged)
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

// Highway (unchanged)
function createHighway() {
    roadSegments = [];
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const lineMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xddddff });
    
    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const segment = new THREE.Group();
        const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH), roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.position.y = 0.05;
        segment.add(roadMesh);

        const barrierMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const leftB = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, SEGMENT_LENGTH), barrierMat);
        leftB.position.set(-(ROAD_WIDTH/2 + 0.6), 1.8, 0);
        segment.add(leftB);
        const rightB = leftB.clone();
        rightB.position.x *= -1;
        segment.add(rightB);

        const laneXs = [-ROAD_WIDTH*0.33, 0, ROAD_WIDTH*0.33];
        laneXs.forEach(x => {
            for (let d = 0; d < 9; d++) {
                const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 4.5), lineMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.12, -SEGMENT_LENGTH/2 + d*7.8);
                segment.add(dash);
            }
        });

        segment.position.z = i * SEGMENT_LENGTH - (NUM_SEGMENTS * SEGMENT_LENGTH * 0.5);
        scene.add(segment);
        roadSegments.push(segment);
    }
}

// Spawn traffic - now sparser
function spawnTrafficCar() {
    const group = new THREE.Group();
    const colors = [0xff2222, 0x22aa22, 0xdddd22, 0x2222ff, 0xff8800];
    const bodyMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random()*colors.length)], shininess: 60 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 7.5), bodyMat);
    body.position.y = 1.2;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.1, 3.8), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    cabin.position.set(0, 2.35, -0.9);
    group.add(cabin);

    const lanes = [-7.5, 0, 7.5];
    group.position.x = lanes[Math.floor(Math.random()*3)];
    group.position.z = 55 + Math.random() * 90;   // more spacing
    group.userData = { speed: 55 + Math.random() * 35, alive: true };
    
    scene.add(group);
    trafficCars.push(group);
}

function updateHighway(delta) {
    const moveDist = currentSpeed * delta * 1.35;
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
    const worldMove = currentSpeed * delta * 1.35;
    
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        const relativeMove = (currentSpeed - car.userData.speed) * delta * 0.9 + worldMove;
        car.position.z -= relativeMove;
        
        if (car.position.z < -25) {
            scene.remove(car);
            trafficCars.splice(i, 1);
        }
    }
    
    // Sparser traffic (not full road pack)
    if (Date.now() - lastSpawnTime > 1250 && trafficCars.length < 5) {
        spawnTrafficCar();
        lastSpawnTime = Date.now();
    }
}

function checkCollisions() {
    for (let i = 0; i < trafficCars.length; i++) {
        const t = trafficCars[i];
        const dx = Math.abs(carGroup.position.x - t.position.x);
        const dz = Math.abs(t.position.z);
        if (dx < 4.2 && dz < 6.8) {
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
    // Noise + boom
    const bufferSize = Math.floor(audioContext.sampleRate * 1.2);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * (1 - i/bufferSize);
    
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
    if (!engineOscillator || !soundEnabled) {
        if (engineGain) engineGain.gain.value = 0;
        return;
    }
    const pitch = 65 + (currentSpeed / MAX_SPEED) * 95;
    engineOscillator.frequency.setValueAtTime(pitch, audioContext.currentTime);
    const vol = 0.12 + (currentSpeed / MAX_SPEED) * 0.28;
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

// Main update
function updateGame(delta) {
    if (gameState !== 'playing') return;
    
    // Steering (keyboard normal + mobile FIXED - no longer opposite)
    let steer = 0;
    if (keys['a'] || keys['arrowleft']) steer -= 1;
    if (keys['d'] || keys['arrowright']) steer += 1;
    if (isLeftPressed) steer += 1;   // ← mobile inverted to fix opposite issue
    if (isRightPressed) steer -= 1;  // ← mobile inverted
    
    const turnAmount = steer * TURN_SPEED_BASE * sensitivity * delta * (0.6 + currentSpeed / MAX_SPEED);
    carGroup.position.x += turnAmount;
    carGroup.position.x = Math.max(-9.5, Math.min(9.5, carGroup.position.x));
    carGroup.rotation.y = steer * -0.18;
    
    // Speed & Nitro
    let targetSpeed = MAX_SPEED;
    let nitroActive = false;
    
    if (isNitroPressed && nitroLevel > 0) {
        targetSpeed = MAX_SPEED * 1.65;
        nitroLevel = Math.max(0, nitroLevel - 85 * delta);
        flameMesh.visible = true;
        flameMesh.scale.y = 1 + Math.sin(Date.now() * 0.02) * 0.3;
        nitroActive = true;
        
        // Nitro whoosh sound (throttled)
        if (Date.now() - nitroSoundTime > 700) {
            playNitroSound();
            nitroSoundTime = Date.now();
        }
    } else {
        flameMesh.visible = false;
        nitroLevel = Math.min(100, nitroLevel + 32 * delta);
    }
    
    // Acceleration feel (smooth & realistic)
    if (keys['w'] || keys['arrowup']) {
        currentSpeed = currentSpeed * 0.86 + targetSpeed * 0.14;
    } else if (keys['s'] || keys['arrowdown']) {
        currentSpeed *= 0.72;
    } else {
        currentSpeed = currentSpeed * 0.91 + targetSpeed * 0.09;
    }
    
    currentSpeed = Math.max(12, Math.min(currentSpeed, targetSpeed + 15));
    
    // Wheel animation
    const roll = currentSpeed * delta * 0.135;
    wheelMeshes.forEach(w => w.rotation.x -= roll);
    if (wheelMeshes.length >= 2) {
        wheelMeshes[0].rotation.y = steer * 0.65;
        wheelMeshes[1].rotation.y = steer * 0.65;
    }
    
    updateHighway(delta);
    updateTraffic(delta);
    checkCollisions();
    distanceTraveled += (currentSpeed * delta) / 4.8;
    
    updateEngineSound();
    updateHUD();
}

function updateHUD() {
    document.getElementById('speed').textContent = Math.floor(currentSpeed);
    document.getElementById('nitro-fill').style.width = nitroLevel + '%';
    document.getElementById('distance').textContent = Math.floor(distanceTraveled);
}

function updateCamera() {
    const idealX = carGroup.position.x * 0.4;
    camera.position.x = camera.position.x * 0.85 + idealX * 0.15;
    camera.position.y = 7.5;
    camera.position.z = -19;
    camera.lookAt(carGroup.position.x * 0.6, 2.2, 12);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (gameState === 'playing') updateGame(delta);
    updateCamera();
    renderer.render(scene, camera);
}

function setupControls() {
    window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'Escape' && gameState === 'playing') togglePause(); });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

    // Mobile controls (now fixed)
    const leftBtn = document.getElementById('mobile-left');
    const rightBtn = document.getElementById('mobile-right');
    const nitroBtn = document.getElementById('mobile-nitro');
    
    leftBtn.addEventListener('pointerdown', () => isLeftPressed = true);
    leftBtn.addEventListener('pointerup', () => isLeftPressed = false);
    leftBtn.addEventListener('pointerleave', () => isLeftPressed = false);
    
    rightBtn.addEventListener('pointerdown', () => isRightPressed = true);
    rightBtn.addEventListener('pointerup', () => isRightPressed = false);
    rightBtn.addEventListener('pointerleave', () => isRightPressed = false);
    
    nitroBtn.addEventListener('pointerdown', () => isNitroPressed = true);
    nitroBtn.addEventListener('pointerup', () => isNitroPressed = false);
    nitroBtn.addEventListener('pointerleave', () => isNitroPressed = false);

    // UI
    document.getElementById('play-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('exit-btn').addEventListener('click', exitToMenu);
    document.getElementById('close-settings').addEventListener('click', hideSettings);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('menu-btn').addEventListener('click', exitToMenu);

    // Settings
    document.getElementById('graphics-select').addEventListener('change', e => {
        graphicsQuality = e.target.value;
    });
    
    const sensSlider = document.getElementById('sensitivity');
    sensSlider.addEventListener('input', () => {
        sensitivity = parseFloat(sensSlider.value);
        document.getElementById('sensitivity-value').textContent = sensitivity.toFixed(1) + 'x';
    });

    // Sound toggle (now working)
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('change', () => {
        soundEnabled = soundToggle.checked;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 2;
    if (isMobile) document.getElementById('mobile-controls').classList.remove('hidden');
}

function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('hud').classList.remove('hidden');
    gameState = 'playing';
    resetGameVariables();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
    } else if (gameState === 'paused') resumeGame();
}

function resumeGame() {
    document.getElementById('pause-menu').classList.add('hidden');
    gameState = 'playing';
}

function showSettings() {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('settings-menu').classList.remove('hidden');
}

function hideSettings() {
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('pause-menu').classList.remove('hidden');
}

function exitToMenu() {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('start-screen').classList.add('active');
    gameState = 'start';
    resetGameVariables();
}

function restartGame() {
    document.getElementById('game-over').classList.add('hidden');
    resetGameVariables();
    gameState = 'playing';
    document.getElementById('hud').classList.remove('hidden');
}

function resetGameVariables() {
    currentSpeed = 38;
    nitroLevel = 100;
    distanceTraveled = 0;
    carGroup.position.x = 0;
    carGroup.rotation.y = 0;
    trafficCars.forEach(c => scene.remove(c));
    trafficCars = [];
    lastSpawnTime = Date.now();
    nitroSoundTime = 0;
    for (let i = 0; i < 4; i++) spawnTrafficCar();   // start with fewer cars
}

window.onload = function () {
    initThree();
    createPlayerCar();
    createHighway();
    setupControls();
    animate();
    
    console.log('%c✅ All fixes applied - Mobile fixed, traffic sparse, realistic speed + sounds!', 'color:#00ff88; font-weight:bold');
};