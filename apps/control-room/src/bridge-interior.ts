import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import planetSurface from './assets/planet-surface.png';
import bridgeModel from './assets/bridge/command-bridge.glb?url';

// Dispose a late asset response without attaching anything to a closed renderer.
function releaseModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
}

/** Editable Blender architecture, separate from camera/collision and live UI. */
export function buildBridgeInterior(scene: THREE.Scene, renderer: THREE.WebGLRenderer, invalidate: () => void, resources: THREE.Texture[], onArt: (ready: boolean) => void) {
  let active = true, textureReady = false, modelReady = false, failed = false;
  const ready = () => {
    if (!active || failed) return;
    scene.userData.artReady = textureReady && modelReady;
    invalidate();
  };
  const error = () => { if (active) { failed = true; onArt(false); } };
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .03);
  scene.environment = environment.texture; scene.environmentIntensity = .42;
  environmentScene.dispose(); pmrem.dispose();

  // Subtle reflected room over the actual bevelled deck plates. No mirror floor
  // or bloom pass; keep the panel joints and rough metal readable.
  const reflector = new Reflector(new THREE.PlaneGeometry(25.3, 24.5), { textureWidth: 512, textureHeight: 256, color: 0x607582, clipBias: .003 });
  const reflectionMaterial = reflector.material as THREE.ShaderMaterial;
  reflectionMaterial.fragmentShader = reflectionMaterial.fragmentShader.replace('vec4( blendOverlay( base.rgb, color ), 1.0 )', 'vec4( blendOverlay( base.rgb, color ), 0.18 )');
  reflectionMaterial.transparent = true; reflectionMaterial.depthWrite = false;
  reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, -.002, 1.2); scene.add(reflector);

  // Deterministic microstructure maps are material data, not painted room detail.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!, rough = context.createImageData(256, 256);
  const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = 256;
  const normalContext = normalCanvas.getContext('2d')!, normals = normalContext.createImageData(256, 256);
  let seed = 517;
  for (let i = 0; i < 256 * 256; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed >>> 24) / 255, value = 190 + noise * 45;
    rough.data.set([value, value, value, 255], i * 4);
    normals.data.set([127 + (noise - .5) * 5, 127 + Math.sin(i / 256) * 2, 255, 255], i * 4);
  }
  context.putImageData(rough, 0, 0); normalContext.putImageData(normals, 0, 0);
  const roughness = new THREE.CanvasTexture(canvas), microNormal = new THREE.CanvasTexture(normalCanvas);
  for (const texture of [roughness, microNormal]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(12, 12); resources.push(texture); }

  new GLTFLoader().load(bridgeModel, gltf => {
    if (!active) { releaseModel(gltf.scene); return; }
    gltf.scene.name = 'STAM authored bridge';
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      object.receiveShadow = true;
      object.castShadow = !materials.every(material => /light|deck|marking/i.test(material.name));
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        if (material.metalness > .4) { material.roughnessMap = roughness; material.normalMap = microNormal; material.normalScale.set(.18, .18); }
        if (/recess/.test(material.name)) material.envMapIntensity = .3;
      }
    });
    scene.add(gltf.scene); modelReady = true; scene.userData.modelLoaded = true;
    renderer.shadowMap.needsUpdate = true; ready();
  }, undefined, error);

  // A real sphere and Fresnel atmosphere outside the observation window.
  // This is an art planet; the navigation data is not inferred from its surface.
  const planetMaterial = new THREE.MeshStandardMaterial({ color: '#b9cbd7', roughness: 1, metalness: 0, envMapIntensity: .1, emissive: '#243d50', emissiveIntensity: .1 });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(23, 96, 64), planetMaterial);
  planet.position.set(-11, 6, -57); planet.rotation.set(.15, 1.8, -.28); scene.add(planet);
  const planetTexture = new THREE.TextureLoader().load(planetSurface, () => { textureReady = true; ready(); }, undefined, error);
  planetTexture.colorSpace = THREE.SRGBColorSpace; planetTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  planetMaterial.map = planetMaterial.emissiveMap = planetTexture; resources.push(planetTexture);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(23.12, 80, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 n; varying vec3 v; void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.); gl_FragColor=vec4(.18,.58,.95,rim*.45);}',
  }));
  atmosphere.position.copy(planet.position); scene.add(atmosphere);
  const starPositions: number[] = [];
  for (let i = 0; i < 1100; i++) { const angle = i * 2.39996; starPositions.push(Math.cos(angle) * (30 + i % 31), 3 + Math.sin(angle) * 40, -80 - i % 35); }
  const stars = new THREE.BufferGeometry(); stars.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ size: .065, color: '#bdd6e5', sizeAttenuation: true })));

  // Warm downlights and restrained blue window fill give depth to the model.
  for (const z of [-3, 6]) { const light = new THREE.PointLight('#ffdbaf', 65, 17, 2); light.position.set(0, 6.8, z); scene.add(light); }
  const windowLight = new THREE.PointLight('#8bbdda', 55, 25, 2); windowLight.position.set(-5, 5, -9); scene.add(windowLight);
  return {
    planetTexture,
    setEconomyMotion(enabled: boolean) { reflector.visible = !enabled; },
    dispose() { active = false; reflector.dispose(); environment.dispose(); scene.environment = null; },
  };
}
