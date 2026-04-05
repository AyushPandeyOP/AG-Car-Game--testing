import * as THREE from 'three';

class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.chunkSize = 100; // Length of each road segment
        this.totalChunks = 6;  // How many segments to keep visible
        this.roadSpeed = 0;
        
        this.textureLoader = new THREE.TextureLoader();
        
        // Load Textures (Use high-quality asphalt maps)
        this.roadDiffuse = this.textureLoader.load('https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_diffuse.jpg'); // Placeholder: Replace with real asphalt.jpg
        this.roadDiffuse.wrapS = this.roadDiffuse.wrapT = THREE.RepeatWrapping;
        this.roadDiffuse.repeat.set(1, 10);

        this.init();
    }

    init() {
        // 1. Add High-End Skybox/Atmosphere
        this.scene.background = new THREE.Color(0x87ceeb); // Sky Blue
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.005); // Realistic depth fog

        // 2. Lighting (Sun)
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);

        // 3. Initial Chunks Spawn
        for (let i = 0; i < this.totalChunks; i++) {
            this.createChunk(i * -this.chunkSize);
        }
    }

    createChunk(zPosition) {
        const chunkGroup = new THREE.Group();

        // --- THE ROAD ---
        const roadGeo = new THREE.PlaneGeometry(25, this.chunkSize);
        const roadMat = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.6,
            metalness: 0.1,
            map: this.roadDiffuse
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        chunkGroup.add(road);

        // --- LANE MARKINGS (Glowing Yellow/White) ---
        const lineGeo = new THREE.PlaneGeometry(0.5, this.chunkSize);
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
        const leftLine = new THREE.Mesh(lineGeo, lineMat);
        leftLine.position.set(-12, 0.02, 0);
        leftLine.rotation.x = -Math.PI / 2;
        chunkGroup.add(leftLine);

        const rightLine = leftLine.clone();
        rightLine.position.x = 12;
        chunkGroup.add(rightLine);

        // --- SURROUNDINGS (Trees & Mountains) ---
        this.addScenery(chunkGroup);

        chunkGroup.position.z = zPosition;
        this.scene.add(chunkGroup);
        this.chunks.push(chunkGroup);
    }

    addScenery(group) {
        // Simple Trees (Low poly but high impact)
        for (let i = 0; i < 10; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = (20 + Math.random() * 30) * side;
            const z = (Math.random() - 0.5) * this.chunkSize;

            // Trunk
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.7, 4),
                new THREE.MeshStandardMaterial({ color: 0x4d2926 })
            );
            trunk.position.set(x, 2, z);
            trunk.castShadow = true;
            group.add(trunk);

            // Leaves
            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(3, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2d4c1e })
            );
            leaves.position.set(x, 7, z);
            leaves.castShadow = true;
            group.add(leaves);
        }

        // Distance Mountains (Far out)
        const mtGeo = new THREE.ConeGeometry(40, 60, 4);
        const mtMat = new THREE.MeshStandardMaterial({ color: 0x3d444d });
        const mountain = new THREE.Mesh(mtGeo, mtMat);
        mountain.position.set(150 * (Math.random() > 0.5 ? 1 : -1), 20, -20);
        group.add(mountain);
    }

    update(currentSpeed, delta) {
        // Move all chunks based on car speed
        const moveStep = currentSpeed * delta;
        
        this.chunks.forEach(chunk => {
            chunk.position.z += moveStep;
        });

        // Recycling Logic: If chunk is behind the camera, move it to the far front
        if (this.chunks[0].position.z > 50) {
            const lastChunk = this.chunks[this.chunks.length - 1];
            const recycledChunk = this.chunks.shift();
            
            recycledChunk.position.z = lastChunk.position.z - this.chunkSize;
            this.chunks.push(recycledChunk);
        }
    }
}

export { EnvironmentManager };
