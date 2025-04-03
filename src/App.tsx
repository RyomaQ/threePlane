import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import "./App.css";

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentPlanes, setCurrentPlanes] = useState(
    Math.floor(Math.random() * 5001) + 10000
  );

  const getRandomPlaneCount = (current: number) => {
    const change = Math.floor(Math.random() * 11) - 5;
    return Math.max(10000, Math.min(15000, current + change));
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mountRef.current) {
      mountRef.current.innerHTML = "";
      mountRef.current.appendChild(renderer.domElement);
    }

    const textureLoader = new THREE.TextureLoader();

    // Load both the texture and bump map
    const earthTexture = textureLoader.load("earth-texture.jpg");
    const bumpMap = textureLoader.load("earth-bump-map.jpg"); // Your black and white bump map

    // Create a higher resolution sphere for better bump mapping
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64); // Increased resolution

    // Create material with bump mapping
    const sphereMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpMap,
      bumpScale: 0.05, // Adjust this value to control the depth of the relief
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = -0.2; // Move the Earth slightly down
    scene.add(sphere);

    const glowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00d9ff) },
        viewVector: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormView = normalize(viewVector - (modelViewMatrix * vec4(position, 1.0)).xyz);
          intensity = pow(0.5 - dot(vNormal, vNormView), 10.);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor, intensity * 0.3);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);

    const loader = new OBJLoader();
    let airplane: THREE.Object3D | null = null;

    loader.load(
      "/airplane/toy_personal_use_airplane.obj",
      (obj: THREE.Group) => {
        airplane = obj;
        airplane.scale.set(0.0005, 0.0005, 0.0005);
        scene.add(airplane);
      },
      undefined,
      (error: Error) => console.error("Error loading airplane model:", error)
    );

    let airplanePosition = 0;

    // Add stronger directional light to better show the bump mapping
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(6, 3, 2);
    scene.add(light);

    // Add space background (star field)
    var stars = new Array(0);
    for (var i = 0; i < 10000; i++) {
      let x = THREE.MathUtils.randFloatSpread(2000);
      let y = THREE.MathUtils.randFloatSpread(2000);
      let z = THREE.MathUtils.randFloatSpread(2000);
      stars.push(x, y, z);
    }
    var starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(stars, 3)
    );
    var starsMaterial = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.5, // Smaller size for stars
      sizeAttenuation: true, // Enable size attenuation for proper scaling
      transparent: true,
      opacity: 0.8, // Initial opacity
    });
    var starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    const starPositions = starsGeometry.attributes.position.array;

    // Keep soft ambient light
    //scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    camera.position.z = 3;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const createExplosion = (position: THREE.Vector3) => {
      const particleCount = 200;
      const particles = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color = new THREE.Color();
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Set initial positions near the explosion point
        particles[i3] = position.x + (Math.random() - 0.5) * 0.2;
        particles[i3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
        particles[i3 + 2] = position.z + (Math.random() - 0.5) * 0.2;

        // Set random velocities for outward movement
        velocities[i3] = (Math.random() - 0.5) * 0.1;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

        // Set gradient colors (red to yellow)
        color.setHSL(0.1 + Math.random() * 0.1, 1, 0.5);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }

      const explosionGeometry = new THREE.BufferGeometry();
      explosionGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(particles, 3)
      );
      explosionGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );

      const explosionMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 1,
      });

      const explosion = new THREE.Points(explosionGeometry, explosionMaterial);
      scene.add(explosion);

      let opacity = 1;
      const animateExplosion = () => {
        const positions = explosionGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;

          // Update positions based on velocities
          positions[i3] += velocities[i3];
          positions[i3 + 1] += velocities[i3 + 1];
          positions[i3 + 2] += velocities[i3 + 2];
        }

        // Gradually reduce opacity and size
        opacity -= 0.02;
        explosionMaterial.opacity = opacity;
        explosionMaterial.size *= 0.98;

        explosionGeometry.attributes.position.needsUpdate = true;

        if (opacity <= 0) {
          scene.remove(explosion);
          explosionGeometry.dispose();
          explosionMaterial.dispose();
        } else {
          requestAnimationFrame(animateExplosion);
        }
      };
      animateExplosion();
    };

    const targetPosition = { x: 0, y: 0 };
    const animation = () => {
      sphere.position.x += (targetPosition.x - sphere.position.x) * 0.05;
      sphere.position.y += (targetPosition.y - sphere.position.y) * 0.05;
      sphere.rotation.y += 0.005;
      glowMesh.position.copy(sphere.position);

      if (airplane) {
        airplanePosition += 0.005;
        airplane.position.set(
          sphere.position.x + Math.cos(airplanePosition) * 1.5,
          sphere.position.y,
          sphere.position.z + Math.sin(airplanePosition) * 1.5
        );
        airplane.lookAt(sphere.position);
        airplane.rotateY(Math.PI / 2);
      }

      // Update star positions to create movement
      for (let i = 0; i < starPositions.length; i += 3) {
        starPositions[i + 2] += 0.5; // Move stars along the z-axis
        if (starPositions[i + 2] > 1000) {
          starPositions[i + 2] = -1000; // Reset position when out of view
        }
      }
      starsGeometry.attributes.position.needsUpdate = true;

      // Add twinkling effect by varying size and opacity
      starsMaterial.size = 0.5 + Math.sin(Date.now() * 0.002) * 0.2; // Vary size
      starsMaterial.opacity = 0.9 + Math.sin(Date.now() * 0.003) * 0.1; // Vary opacity

      // Update the viewVector uniform for the glow effect to follow the camera
      if (glowMaterial.uniforms) {
        glowMaterial.uniforms.viewVector.value = camera.position;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animation);
    };
    animation();

    const onMouseMove = (event: MouseEvent) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      targetPosition.x = mouseX * 0.2;
      targetPosition.y = mouseY * 0.2;
    };

    const onClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        createExplosion(point);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", onClick);
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlanes((prev) => getRandomPlaneCount(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <div ref={mountRef} id="canva" />
      <div className="overlay">
        <h1>EARTH</h1>
        <div className="text-content-list">
          <div className="text-content-item">
            <h2>Currently</h2>
            <p>
              {currentPlanes.toLocaleString("en-US").replace(/,/g, " ")} planes
              flying
            </p>
          </div>
          <div className="text-content-item">
            <h2>CO2 Emission</h2>
            <p>
              {Math.round(currentPlanes * 9.48)
                .toLocaleString("en-US")
                .replace(/,/g, " ")}{" "}
              tons CO₂/h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
