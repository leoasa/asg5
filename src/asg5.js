import * as THREE from 'three';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { Water } from 'https://threejs.org/examples/jsm/objects/Water.js';
import { Sky } from 'https://threejs.org/examples/jsm/objects/Sky.js';
import { OBJLoader } from 'https://threejs.org/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'https://threejs.org/examples/jsm/loaders/MTLLoader.js';

let camera, scene, renderer, water, sun, jetski;

function main() {
    const canvas = document.querySelector('#c');
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;

    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight; // the canvas aspect ratio
    const near = 0.1;
    const far = 10000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(30, 30, 100);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 10, 0);
    controls.update();

    scene = new THREE.Scene();

    // Sky
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 0, // Set elevation to 0 for a horizon sun
        azimuth: 180
    };

    sun = new THREE.Vector3();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();

    let renderTarget;

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        if (water) {
            water.material.uniforms['sunDirection'].value.copy(sun).normalize();
        }

        if (renderTarget !== undefined) renderTarget.dispose();

        sceneEnv.add(sky);
        renderTarget = pmremGenerator.fromScene(sceneEnv);
        scene.add(sky);

        scene.environment = renderTarget.texture;
    }

    // Water
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xE7E41F, // Sun color set here
            waterColor: 0x71BD92,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    updateSun();

    const shadowTexture = new THREE.TextureLoader().load('https://threejs.org/manual/examples/resources/images/roundshadow.png');
    const sphereShadowBases = [];
    {
        const sphereRadius = 1;
        const sphereWidthDivisions = 32;
        const sphereHeightDivisions = 16;
        const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivisions, sphereHeightDivisions);

        const planeSize = 1;
        const shadowGeo = new THREE.PlaneGeometry(planeSize, planeSize);

        const numSpheres = 20;
        for (let i = 0; i < numSpheres; ++i) {

            const base = new THREE.Object3D();
            scene.add(base);

            const shadowMat = new THREE.MeshBasicMaterial({
                map: shadowTexture,
                transparent: true,
                depthWrite: false,
            });
            const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
            shadowMesh.position.y = 0.001;
            shadowMesh.rotation.x = Math.PI * -0.5;
            const shadowSize = sphereRadius * 6;
            shadowMesh.scale.set(shadowSize, shadowSize, shadowSize);
            base.add(shadowMesh);

            const sphereMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 1,
                roughness: 0.1, // More reflective
                transmission: 0, // Less transmission for more reflection
                thickness: 0.5, // Add thickness to get a better refraction effect
                envMap: renderTarget ? renderTarget.texture : null,
            });
            const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
            sphereMesh.position.set(
                Math.random() * 100 - 50, // Random x position
                sphereRadius + 2, 
                Math.random() * 100 - 50  // Random z position
            );
            base.add(sphereMesh);

            sphereShadowBases.push({ base, sphereMesh, shadowMesh, y: sphereMesh.position.y });
        }
    }

    // Lighting
    {
        const skyColor = 0xB1E1FF;
        const groundColor = 0xB97A20;
        const intensity = 2.95;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    {
        const color = 0xFFFFFF;
        const intensity = 2.5;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 10, 5);
        light.target.position.set(-5, 0, 0);
        scene.add(light);
        scene.add(light.target);
    }

    {
        const intensity = 1.5;
        const light = new THREE.PointLight(0xFFFFFF, intensity);
        light.position.set(camera.position.x, camera.position.y, camera.position.z);
        scene.add(light);
    }

    function render(time) {
        time *= 0.001; // convert to seconds
        sphereShadowBases.forEach((sphereShadowBase, ndx) => {
            const { base, sphereMesh, shadowMesh, y } = sphereShadowBase;
            const u = ndx / sphereShadowBases.length;
            const speed = time * 0.8;
            const angle = speed + u * Math.PI * 2 * (ndx % 1 ? 1 : -1);
            const radius = Math.sin(speed - ndx) * 10;
            base.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            const yOff = Math.abs(Math.sin(time * 2 + ndx));
            sphereMesh.position.y = y + THREE.MathUtils.lerp(-1, 2, yOff);
            shadowMesh.material.opacity = THREE.MathUtils.lerp(1, 0.25, yOff);

            // Update shadow position
            shadowMesh.position.x = sphereMesh.position.x;
            shadowMesh.position.z = sphereMesh.position.z;
        });

        water.material.uniforms['time'].value += 1.0 / 60.0;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    // Load the jetski OBJ and MTL
    const mtlLoader = new MTLLoader();
    mtlLoader.load('./jetski.mtl', function (materials) {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('./jetski.obj', function (object) {
            object.scale.set(10, 10, 10); // Adjust the scale if necessary
            object.position.set(0, 0, 0); // Adjust the position if necessary
            object.rotation.y = -Math.PI / 2; // Rotate 90 degrees to the left
            jetski = object;
            scene.add(jetski);
        });
    });

    // Key controls
    function onDocumentKeyDown(event) {
        if (!jetski) return;

        const keyCode = event.which;
        const moveDistance = 5;
        const rotateAngle = Math.PI / 16;

        switch (keyCode) {
            case 39: // Right arrow
                jetski.translateZ(-moveDistance);
                break;
            case 37: // Left arrow
                jetski.translateZ(moveDistance);
                break;
            case 81: // Q - rotate left
                jetski.rotateY(rotateAngle);
                break;
            case 69: // E - rotate right
                jetski.rotateY(-rotateAngle);
                break;
            case 38: // Up arrow
                jetski.translateX(-moveDistance);
                break;

            case 40: // Left arrow
                jetski.translateX(moveDistance);
                break;
        }
    }

    document.addEventListener('keydown', onDocumentKeyDown, false);
}

window.addEventListener('resize', () => {
    const canvas = document.querySelector('#c');
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

main();
