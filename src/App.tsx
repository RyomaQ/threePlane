import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import "./App.css";

function App() {
  const mountRef = useRef<HTMLDivElement>(null);

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

    // Keep soft ambient light
    //scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    camera.position.z = 3;

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

    window.addEventListener("mousemove", onMouseMove);
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  const fetchFlightData = async () => {
    const apiKey = "VoLm55mkAHC8IhNaFLLmaGDjeG1HOkXt";
    try {
      const response = await fetch(
        "https://aeroapi.flightaware.com/aeroapi/flights/search/count",
        {
          method: "GET",
          headers: { "x-apikey": apiKey },
          //mode: "no-cors",
        }
      );
      if (response.status === 200) {
        const data = await response.json();
        console.log("Flight Data:", data);
      } else {
        console.error(
          "Error fetching flight data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching flight data:", error);
    }
  };

  fetchFlightData().then((data: any) => {
    console.log("Flight data fetched successfully", data);
  });

  return (
    <div className="App">
      <div ref={mountRef} id="canva" />
      <div className="overlay">
        <h1>EARTH</h1>
        <div className="text-content-list">
          <div className="text-content-item">
            <h2>Currently</h2>
            <p>10 308 planes flying</p>
          </div>
          <div className="text-content-item">
            <h2>LATEST TAKEOFF</h2>
            <p>Budapest to Rio de Janeiro</p>
          </div>
          <div className="text-content-item">
            <h2>LATEST Landing</h2>
            <p>Budapest to Rio de Janeiro</p>
          </div>
          <div className="text-content-item">
            <h2>CO2 Emission Today</h2>
            <p>3 900 tonnes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
