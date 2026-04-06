let scene, camera, renderer;
let car, road;
let speed = 0;
let maxSpeed = 1.5;
let nitro = 100;
let keys = {};
let gameStarted = false;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("game"),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);

    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(amb);

    createRoad();
    loadMap();
    createCar();

    animate();
}

/* Road fallback */
function createRoad() {
    const geo = new THREE.PlaneGeometry(10, 500);
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);
}

/* GLB MAP */
function loadMap() {
    const loader = new THREE.GLTFLoader();

    loader.load("assets/map.glb",
        (gltf) => {
            const map = gltf.scene;
            map.scale.set(1,1,1);
            map.position.set(0,0,0);
            scene.add(map);
        },
        undefined,
        () => {
            console.log("Map failed, fallback road active");
        }
    );
}

/* CAR */
function createCar() {
    const geo = new THREE.BoxGeometry(1,0.5,2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    car = new THREE.Mesh(geo, mat);
    car.position.set(0,0.3,0);
    scene.add(car);
}

/* CONTROLS */
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

/* MOBILE */
document.getElementById("leftBtn").ontouchstart = () => keys["a"] = true;
document.getElementById("leftBtn").ontouchend = () => keys["a"] = false;

document.getElementById("rightBtn").ontouchstart = () => keys["d"] = true;
document.getElementById("rightBtn").ontouchend = () => keys["d"] = false;

document.getElementById("nitroBtn").ontouchstart = () => keys["shift"] = true;
document.getElementById("nitroBtn").ontouchend = () => keys["shift"] = false;

/* GAME UPDATE */
function updateCar() {
    if (!gameStarted) return;

    if (keys["w"] || keys["arrowup"]) speed += 0.02;
    if (keys["s"] || keys["arrowdown"]) speed -= 0.03;

    if (keys["shift"] && nitro > 0) {
        speed += 0.05;
        nitro -= 0.8;
    } else {
        nitro += 0.3;
    }

    nitro = Math.max(0, Math.min(100, nitro));
    speed = Math.max(0, Math.min(maxSpeed, speed));

    if (keys["a"] || keys["arrowleft"]) car.position.x -= 0.1;
    if (keys["d"] || keys["arrowright"]) car.position.x += 0.1;

    // Forward movement
    car.position.z -= speed;

    // Camera follow
    camera.position.z = car.position.z + 8;
    camera.position.x = car.position.x;
    camera.lookAt(car.position);
}

/* HUD */
function updateHUD() {
    document.getElementById("speed").innerText = Math.floor(speed * 120) + " KM/H";
    document.getElementById("nitroFill").style.width = nitro + "%";
}

/* LOOP */
function animate() {
    requestAnimationFrame(animate);

    updateCar();
    updateHUD();

    renderer.render(scene, camera);
}

/* START BUTTON FIX */
document.getElementById("playBtn").onclick = () => {
    gameStarted = true;
    document.getElementById("startScreen").style.display = "none";
};

/* RESIZE */
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});