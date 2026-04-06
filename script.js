let scene, camera, renderer;
let car, road;
let speed = 0;
let maxSpeed = 2;
let nitro = 100;
let keys = {};

init();

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 6);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);

    // Road fallback
    const geo = new THREE.PlaneGeometry(10, 200);
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    loadMap();
    createCar();

    animate();
}

function loadMap() {
    const loader = new THREE.GLTFLoader();
    loader.load("assets/map.glb",
        (gltf) => {
            let map = gltf.scene;
            map.scale.set(1,1,1);
            map.position.set(0,0,0);
            scene.add(map);
        },
        undefined,
        (err) => {
            console.warn("Map load failed, using fallback road");
        }
    );
}

function createCar() {
    const geo = new THREE.BoxGeometry(1,0.5,2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0066ff });
    car = new THREE.Mesh(geo, mat);
    car.position.y = 0.3;
    scene.add(car);
}

/* Controls */
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function updateCar() {
    if (keys["w"] || keys["arrowup"]) speed += 0.02;
    if (keys["s"] || keys["arrowdown"]) speed -= 0.03;

    if (keys["shift"] && nitro > 0) {
        speed += 0.05;
        nitro -= 0.5;
    } else {
        nitro += 0.2;
    }

    nitro = Math.max(0, Math.min(100, nitro));
    speed = Math.max(0, Math.min(maxSpeed, speed));

    if (keys["a"] || keys["arrowleft"]) car.position.x -= 0.1;
    if (keys["d"] || keys["arrowright"]) car.position.x += 0.1;

    car.position.z -= speed;

    // Camera follow
    camera.position.z = car.position.z + 6;
    camera.position.x = car.position.x;
    camera.lookAt(car.position);
}

function updateHUD() {
    document.getElementById("speed").innerText = Math.floor(speed * 100) + " KM/H";
    document.getElementById("nitroFill").style.width = nitro + "%";
}

function animate() {
    requestAnimationFrame(animate);

    updateCar();
    updateHUD();

    renderer.render(scene, camera);
}

/* Start Button */
document.getElementById("playBtn").onclick = () => {
    document.getElementById("startScreen").style.display = "none";
};

/* Resize */
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});