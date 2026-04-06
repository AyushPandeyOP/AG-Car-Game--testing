// SUPERX - Realistic Asphalt 8 Style (Regenerated)
let scene, camera, renderer, clock, gltfLoader;
let car, wheels = [];
let mapModel;
let velocity = 0, maxVelocity = 130;
let nitro = 100, nitroActive = false;
let steering = 0, touchSteering = 0;
let keys = {};
let gameState = 'splash';

function init() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x112233, 0.0028);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);

    // Realistic lighting (Asphalt style)
    scene.add(new THREE.HemisphereLight(0xaaccff, 0x334422, 1.1));
    const sun = new THREE.DirectionalLight(0xffeecc, 1.6);
    sun.position.set(120, 90, -80);
    sun.castShadow = true;
    scene.add(sun);

    // Load your real map
    gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load('assets/map.glb', (gltf) => {
        mapModel = gltf.scene;
        mapModel.scale.set(1.15, 1.15, 1.15);
        scene.add(mapModel);
        console.log('%c✅ Realistic Map loaded (assets/map.glb)', 'color:#00ffcc;font-weight:bold');
    });

    createRealisticBMWCar();
    setupControls();
    animate();
}

function createRealisticBMWCar() {
    car = new THREE.Group();

    // Main Body - Metallic Blue BMW M4
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x0066ff,
        specular: 0xffffff,
        shininess: 140,
        flatShading: false
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.9, 1.65, 8.2), bodyMat);
    body.position.y = 1.45;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Hood bulge
    const hood = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 3.8), bodyMat);
    hood.position.set(0, 2.1, 1.8);
    car.add(hood);

    // Cabin
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x112233, shininess: 100, transparent: true, opacity: 0.9 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.35, 4.1), cabinMat);
    cabin.position.set(0, 2.55, -1.1);
    car.add(cabin);

    // Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 1.4), bodyMat);
    spoiler.position.set(0, 2.35, -3.9);
    car.add(spoiler);

    // Wheels (more realistic)
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 40 });
    const positions = [[-1.95, 2.4], [1.95, 2.4], [-1.95, -2.8], [1.95, -2.8]];
    wheels = [];
    positions.forEach(p => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 40), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(p[0], 0.72, p[1]);
        wheel.castShadow = true;
        car.add(wheel);
        wheels.push(wheel);
    });

    car.position.set(0, 0, 0);
    scene.add(car);
}

function setupControls() {
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            gameState = 'playing';
        }, 1600);
    }, 3200);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameState === 'playing') {
        // Acceleration & Nitro
        if (keys['w'] || keys['ArrowUp']) velocity = Math.min(velocity + 58 * delta, maxVelocity);
        if (keys['s'] || keys['ArrowDown']) velocity = Math.max(velocity - 90 * delta, 0);

        if (keys['Shift'] && nitro > 0) {
            nitroActive = true;
            velocity = Math.min(velocity + 75 * delta, maxVelocity + 45);
            nitro = Math.max(0, nitro - 55 * delta);
        } else {
            nitroActive = false;
            nitro = Math.min(100, nitro + 28 * delta);
        }

        // Steering
        let kSteer = 0;
        if (keys['a'] || keys['ArrowLeft']) kSteer -= 1;
        if (keys['d'] || keys['ArrowRight']) kSteer += 1;
        steering = kSteer;

        const turn = steering * (9 + velocity * 0.14) * delta;
        car.position.x = Math.max(-11, Math.min(11, car.position.x + turn));

        car.rotation.y = steering * 0.22 * (velocity / maxVelocity);

        // Wheel rotation
        const roll = velocity * delta * 11;
        wheels.forEach((w, i) => {
            w.rotation.x -= roll;
            if (i < 2) w.rotation.y = steering * 0.8;
        });
    }

    renderer.render(scene, camera);
}

window.onload = init;