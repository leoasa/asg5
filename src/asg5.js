import * as THREE from 'three';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';

function main() {

    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    const fov = 45;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.update();

    const scene = new THREE.Scene();

    // Setup skybox
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      './sky.jpg',
      () => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
      });
    

    const shadowTexture = loader.load('https://threejs.org/manual/examples/resources/images/roundshadow.png');
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
            shadowMesh.rotation.x = Math.PI * - .5;
            const shadowSize = sphereRadius * 6;
            shadowMesh.scale.set(shadowSize, shadowSize, shadowSize);
            base.add(shadowMesh);

            const sphereMat = new THREE.MeshPhongMaterial();
            sphereMat.color.setHSL(i / numSpheres, 1, .75);
            const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
            sphereMesh.position.set(0, sphereRadius + 2, 0);
            base.add(sphereMesh);

            sphereShadowBases.push({ base, sphereMesh, shadowMesh, y: sphereMesh.position.y });
        }
    }

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

    {
        const coneGeometry = new THREE.ConeGeometry(5, 15, 40);
        const coneMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
        coneMesh.position.set(0, 1, 0);
        scene.add(coneMesh);
    }

    {
		//White cube
        const cubeGeometry = new THREE.BoxGeometry(30, -20, 20);
        const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35 });
        const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cubeMesh.position.set(0, 0, 0);
        scene.add(cubeMesh);

		//Floor mat
		const cubeGeometry2 = new THREE.BoxGeometry(30, 0, 20);
        const cubeMesh2 = new THREE.Mesh(cubeGeometry2, cubeMaterial);
		cubeMesh2.position.set(0, 0, 0);
		scene.add(cubeMesh2)

    }

    function resizeRendererToDisplaySize(renderer) {

        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {

            renderer.setSize(width, height, false);

        }

        return needResize;

    }

    function render(time) {

        time *= 0.001; // convert to seconds

        resizeRendererToDisplaySize(renderer);

        {

            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();

        }

        sphereShadowBases.forEach((sphereShadowBase, ndx) => {

            const { base, sphereMesh, shadowMesh, y } = sphereShadowBase;

            const u = ndx / sphereShadowBases.length;

            const speed = time * .8;
            const angle = speed + u * Math.PI * 2 * (ndx % 1 ? 1 : -1);
            const radius = Math.sin(speed - ndx) * 10;
            base.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

            const yOff = Math.abs(Math.sin(time * 2 + ndx));
            sphereMesh.position.y = y + THREE.MathUtils.lerp(-1, 2, yOff);
            shadowMesh.material.opacity = THREE.MathUtils.lerp(1, .25, yOff);

        });

        renderer.render(scene, camera);

        requestAnimationFrame(render);

    }

    requestAnimationFrame(render);

}

main();
