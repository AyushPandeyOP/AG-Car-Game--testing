<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Highway Racer</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<div id="startScreen">
    <h1>HIGHWAY RACER</h1>
    <button id="playBtn">PLAY</button>
</div>

<div id="hud">
    <div id="speed">0 KM/H</div>
    <div id="nitroBar"><div id="nitroFill"></div></div>
</div>

<div id="mobileControls">
    <button id="leftBtn">◀</button>
    <button id="nitroBtn">⚡</button>
    <button id="rightBtn">▶</button>
</div>

<canvas id="game"></canvas>

<!-- ✅ IMPORTANT FIX -->
<script type="module">
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer;
let car, road;
let speed = 0;
let nitro = 100;
let keys = {};
let gameStarted = false;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);

    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);

    createRoad();
    createCar();
    loadMap();

    animate();
}

function createRoad() {
    const geo = new THREE.PlaneGeometry(10, 500);
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);
}

function loadMap() {
    const loader = new GLTFLoader();

    loader.load("assets/map.glb",
        (gltf) => {
            scene.add(gltf.scene);
        },
        undefined,
        (err) => {
            console.log("Map load error:", err);
        }
    );
}

function createCar() {
    const geo = new THREE.BoxGeometry(1,0.5,2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    car = new THREE.Mesh(geo, mat);
    car.position.y = 0.3;
    scene.add(car);
}

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

document.getElementById("playBtn").onclick = () => {
    gameStarted = true;
    document.getElementById("startScreen").style.display = "none";
};

function update() {
    if (!gameStarted) return;

    if (keys["w"]) speed += 0.02;
    if (keys["s"]) speed -= 0.03;

    if (keys["shift"] && nitro > 0) {
        speed += 0.05;
        nitro -= 1;
    } else {
        nitro += 0.3;
    }

    speed = Math.max(0, Math.min(1.5, speed));
    nitro = Math.max(0, Math.min(100, nitro));

    if (keys["a"]) car.position.x -= 0.1;
    if (keys["d"]) car.position.x += 0.1;

    car.position.z -= speed;

    camera.position.z = car.position.z + 8;
    camera.position.x = car.position.x;
    camera.lookAt(car.position);

    document.getElementById("speed").innerText = Math.floor(speed * 120) + " KM/H";
    document.getElementById("nitroFill").style.width = nitro + "%";
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
</script>

</body>
</html>