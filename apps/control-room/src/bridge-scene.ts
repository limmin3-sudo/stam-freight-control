import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildBridgeInterior } from './bridge-interior';
import { batchBridgeMeshes } from './bridge-batching';
import stamLogo from '../../../assets/stam-logo-transparent.png';
import { CONSOLES, MAP_GUARD, guardTop, monitorSize, monitorEye, monitorFov, OVERVIEW, PARTNER_POSITIONS, canExplore, consolePath, operatorEye, samplePath, walkPath } from './bridge-layout';
import type { Point } from './bridge-layout';
import type { Station } from './navigation';

type Mode = 'overview' | 'travel' | 'seated' | 'explore';
export type StudyState = { mode: Mode; station: Station | null; failed?: boolean };

export function createBridgeScene(host: HTMLElement, onState: (state: StudyState) => void, onArt: (ready: boolean) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const fullPixelRatio = Math.min(devicePixelRatio, 1.5);
  let pixelRatio = fullPixelRatio, motionFrames = 0, artReported = false;
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  host.append(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '3D bridge viewport');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#02070d');
  const camera = new THREE.PerspectiveCamera(52, 1, .05, 160);
  camera.position.fromArray(OVERVIEW); camera.lookAt(0, 1.8, 0);
  scene.add(new THREE.HemisphereLight(0xc3e6ff, 0x101922, .3));
  const key = new THREE.DirectionalLight(0xffe1b2, 1.8); key.position.set(-7, 6.5, -6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 15, bottom: -12, near: 1, far: 40 }); key.shadow.bias = -.0002; key.shadow.normalBias = .025; key.shadow.radius = 3; scene.add(key);
  const fill = new THREE.DirectionalLight(0x92d9ff, .65); fill.position.set(0, 6, -20); scene.add(fill);
  const shell = new THREE.MeshStandardMaterial({ color: 0x233542, metalness: .72, roughness: .3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x172431, metalness: .2, roughness: .6 });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x89e6fa });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffc679 });
  const resources: THREE.Texture[] = [];
  const vec = (point: Point) => new THREE.Vector3(...point);
  function box(parent: THREE.Object3D, size: Point, at: Point, material: THREE.Material) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(.045, Math.min(...size) / 3)), material); mesh.position.fromArray(at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, at: Point, material: THREE.Material, segments = 48) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material); mesh.position.fromArray(at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function ring(parent: THREE.Object3D, radius: number, y: number, material: THREE.Material, thickness = .025) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 96), material); mesh.rotation.x = Math.PI / 2; mesh.position.y = y; parent.add(mesh); return mesh;
  }
  scene.userData.artReady = false;
  const interior = buildBridgeInterior(scene, renderer, invalidate, resources, onArt);
  const table = new THREE.Group(); table.userData.station = 'map'; scene.add(table);
  const tabletop = new THREE.Mesh(new THREE.CircleGeometry(2.95, 128), new THREE.MeshPhysicalMaterial({ color: '#153a4b', metalness: .5, roughness: .21, clearcoat: .8, transparent: true, opacity: .35, depthWrite: false }));
  tabletop.rotation.x = -Math.PI / 2; tabletop.position.y = 1.079; table.add(tabletop);
  for (const radius of [.55, 1.05, 1.6, 2.2]) ring(table, radius, 1.083, new THREE.MeshBasicMaterial({ color: '#67afc2', transparent: true, opacity: .25 }), .004);
  const crestTexture = new THREE.TextureLoader().load(stamLogo, () => invalidate()); crestTexture.colorSpace = THREE.SRGBColorSpace; resources.push(crestTexture);
  const crest = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), new THREE.MeshBasicMaterial({ map: crestTexture, transparent: true, depthWrite: false })); crest.position.set(0, .57, 3.29); table.add(crest);
  // A solid rear arch masks the console/operator from the entrance, not the hologram.
  const guardVertices: number[] = [], guardIndices: number[] = [], guardEdge: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = i / 64 * Math.PI, top = guardTop(angle);
    for (const [radius, y] of [[MAP_GUARD.innerRadius, MAP_GUARD.bottom], [MAP_GUARD.outerRadius, MAP_GUARD.bottom], [MAP_GUARD.outerRadius, top], [MAP_GUARD.innerRadius, top]]) {
      guardVertices.push(Math.cos(angle) * radius!, y!, -Math.sin(angle) * radius!);
    }
    guardEdge.push(new THREE.Vector3(Math.cos(angle) * MAP_GUARD.innerRadius, top + .012, -Math.sin(angle) * MAP_GUARD.innerRadius));
    if (i < 64) for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, b = i * 4 + (j + 1) % 4;
      guardIndices.push(a, b, b + 4, a, b + 4, a + 4);
    }
  }
  guardIndices.push(0, 3, 2, 0, 2, 1, 256, 257, 258, 256, 258, 259);
  const guardGeometry = new THREE.BufferGeometry();
  guardGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guardVertices, 3)); guardGeometry.setIndex(guardIndices); guardGeometry.computeVertexNormals();
  const guardMaterial = shell.clone(); guardMaterial.side = THREE.DoubleSide;
  const guard = new THREE.Mesh(guardGeometry, guardMaterial); guard.castShadow = guard.receiveShadow = true; table.add(guard);
  table.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(guardEdge), 96, .018, 6, false), cyan));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 16), gold); sun.position.y = 2.85; table.add(sun);
  const holoLight = new THREE.PointLight(0x8edcff, 7, 7); holoLight.position.y = 2.8; table.add(holoLight);
  function label(text: string) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96; const context = canvas.getContext('2d')!;
    context.font = '500 36px Oxanium, sans-serif'; context.textAlign = 'center'; context.fillStyle = '#d7f4ff'; context.fillText(text, 256, 50);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; resources.push(texture);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); sprite.scale.set(1.2, .225, 1); return sprite;
  }
  const gasCanvas = document.createElement('canvas'); gasCanvas.width = 512; gasCanvas.height = 256;
  const gasContext = gasCanvas.getContext('2d')!;
  for (let y = 0; y < 256; y++) {
    const band = Math.sin(y * .16) * 13 + Math.sin(y * .57) * 5;
    gasContext.fillStyle = `rgb(${210 + band},${184 + band},${163 + band})`; gasContext.fillRect(0, y, 512, 1);
  }
  const gasTexture = new THREE.CanvasTexture(gasCanvas); gasTexture.colorSpace = THREE.SRGBColorSpace; resources.push(gasTexture);
  const bodies = [
    { name: 'HURSTON', r: 1.05, angle: 1, size: .27, color: 0xad8058 },
    { name: 'CRUSADER', r: 1.65, angle: 3, size: .48, color: 0xe6bca1 },
    { name: 'ARCCORP', r: 2.2, angle: 4.9, size: .29, color: 0x957464 },
    { name: 'MICROTECH', r: 2.8, angle: .1, size: .34, color: 0xc6e3eb },
  ];
  for (const body of bodies) {
    ring(table, body.r, 2.85, new THREE.MeshBasicMaterial({ color: 0x5aa6bb, transparent: true, opacity: .5 }), .006);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(body.size, 48, 32), new THREE.MeshStandardMaterial({ color: body.name === 'MICROTECH' ? 0xffffff : body.color, map: body.name === 'CRUSADER' ? gasTexture : interior.planetTexture, roughness: .83, emissive: body.color, emissiveMap: body.name === 'CRUSADER' ? gasTexture : interior.planetTexture, emissiveIntensity: .15 }));
    mesh.position.set(Math.sin(body.angle) * body.r, 2.85, Math.cos(body.angle) * body.r); table.add(mesh);
    const text = label(body.name); text.position.copy(mesh.position).add(new THREE.Vector3(0, body.size + .18, 0)); table.add(text);
  }
  const stanton = label('STANTON'); stanton.scale.multiplyScalar(1.3); stanton.position.set(0, 3.65, 0); table.add(stanton);
  const uniform = new THREE.MeshStandardMaterial({ color: 0x233d52, roughness: .85 });
  const face = new THREE.MeshStandardMaterial({ color: 0xad9385, metalness: 0, roughness: .95 });
  function person(parent: THREE.Object3D, seated: boolean) {
    const human = new THREE.Group(); parent.add(human);
    const direction = seated ? -1 : 1, torsoY = seated ? 1.2 : 1.27, headY = seated ? 1.73 : 1.82;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .59, 16), uniform); torso.scale.z = .7; torso.position.y = torsoY; human.add(torso);
    box(human, [.28, .34, .045], [0, torsoY + .02, direction * .16], dark);
    box(human, [.09, .025, .015], [-.08, torsoY + .14, direction * .19], gold);
    cylinder(human, .055, .12, [0, headY - .2, 0], face, 12);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.135, 24, 20), face); head.scale.set(1, 1.32, .95); head.position.set(0, headY, 0); human.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark); hair.scale.set(1, 1.3, 1); hair.position.set(0, headY + .035, 0); human.add(hair);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.027, 10, 8), face); nose.position.set(0, headY - .015, direction * .125); human.add(nose);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.011, 8, 6), dark); eye.position.set(side * .045, headY + .025, direction * .115); human.add(eye);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.075, seated ? .3 : .68, 4, 12), uniform); leg.position.set(side * .13, seated ? .32 : .46, seated ? -.32 : 0); human.add(leg);
      if (seated) { const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .32, 4, 12), uniform); thigh.rotation.x = Math.PI / 2; thigh.position.set(side * .13, .64, -.16); human.add(thigh); }
      box(human, [.17, .12, .3], [side * .13, .075, seated ? -.39 : .08], dark);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .4, 4, 12), uniform); arm.position.set(side * .27, torsoY - .1, seated ? -.14 : 0); arm.rotation.x = seated ? -.9 : .04; arm.rotation.z = side * .08; human.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.057, 12, 10), face); hand.scale.y = 1.3; hand.position.set(side * .29, torsoY - (seated ? .27 : .35), seated ? -.34 : .015); human.add(hand);
    }
    return human;
  }
  for (const [index, point] of PARTNER_POSITIONS.entries()) { const group = new THREE.Group(); group.position.fromArray(point); group.rotation.y = index ? -.35 : .35; scene.add(group); person(group, false); }
  const operators = new Map<Station, THREE.Object3D>();
  for (const station of Object.keys(CONSOLES) as Station[]) {
    const { screen, yaw } = CONSOLES[station], console = new THREE.Group(); console.position.set(screen[0], 0, screen[2]); console.rotation.y = yaw; console.userData.station = station; scene.add(console);
    const [monitorWidth, monitorHeight] = monitorSize(station);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 576; const c = canvas.getContext('2d')!;
    c.fillStyle = '#071b2a'; c.fillRect(0, 0, 1024, 576); c.strokeStyle = '#28566a'; c.lineWidth = 1;
    for (let x = 0; x < 1024; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 576); c.stroke(); }
    for (let y = 0; y < 576; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
    c.fillStyle = '#d3f3fa'; c.font = '500 36px Oxanium, sans-serif'; c.fillText(station === 'map' ? 'STANTON / NAVIGATION' : station.toUpperCase() + ' / CONSOLE', 48, 65);
    c.font = '500 18px Oxanium, sans-serif'; c.fillStyle = '#7dacbc'; c.fillText('CAMERA & SPATIAL STUDY', 48, 100);
    if (station === 'map') { for (let i = 1; i <= 4; i++) { c.strokeStyle = '#75cadc'; c.beginPath(); c.ellipse(510, 340, i * 90, i * 38, -.15, 0, Math.PI * 2); c.stroke(); } c.fillStyle = '#f4c780'; c.beginPath(); c.arc(510, 340, 13, 0, Math.PI * 2); c.fill(); }
    else for (let i = 0; i < 4; i++) { c.strokeStyle = '#7dbbca'; c.strokeRect(48, 155 + i * 85, 910, 60); c.fillStyle = '#5f8da0'; c.fillRect(70, 175 + i * 85, 150 + i * 80, 5); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; resources.push(texture);
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(monitorWidth - .25, monitorHeight - .18), new THREE.MeshBasicMaterial({ map: texture })); screenMesh.position.set(0, screen[1], .09); console.add(screenMesh);
    const seat = new THREE.Group(); seat.position.set(0, 0, 1.8); console.add(seat);
    operators.set(station, person(seat, true));
  }
  batchBridgeMeshes(scene, new Set([guard]));
  let mode: Mode = 'overview', selected: Station | null = null, travel: { points: Point[]; elapsed: number; duration: number } | null = null;
  let docking = false;
  let yaw = 0, pitch = 0, raf = 0, last = 0, disposed = false, moved = false, press: { x: number; y: number } | null = null;
  const keys = new Set<string>(), targetCamera = new THREE.PerspectiveCamera(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = (next: Mode, station: Station | null, failed = false) => { mode = next; selected = station; onState({ mode, station, failed }); };
  const start = (points: Point[], station: Station | null) => {
    if (!points.length) { onState({ mode, station: selected, failed: true }); return; }
    docking = false;
    keys.clear(); last = performance.now(); motionFrames = 0;
    travel = { points, elapsed: 0, duration: reduced.matches ? 0 : station === 'map' ? 5200 : 3000 }; state('travel', station); invalidate();
  };
  const command = (station: Station) => start(consolePath(camera.position.toArray() as [number, number, number], station), station);
  const home = () => start(walkPath(camera.position.toArray() as [number, number, number], OVERVIEW), null);
  const explore = () => {
    travel = null; docking = false; keys.clear(); camera.position.y = 1.75;
    const rotation = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yaw = rotation.y; pitch = rotation.x;
    state('explore', null); renderer.domElement.focus({ preventScroll: true }); invalidate();
  };
  const resize = () => { const { width, height } = host.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); invalidate(); };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  function invalidate() { if (!disposed && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
  function frame(stamp: number) {
    raf = 0; const frameSeconds = (stamp - last) / 1000 || .016, dt = Math.min(.25, frameSeconds); last = stamp;
    const moving = !!(travel || docking || keys.size || press);
    // Avoid an unresponsive camera on integrated/software renderers. Restore
    // native still-frame quality as soon as movement settles.
    if (moving && motionFrames++ > 0 && frameSeconds > .05) {
      const next = Math.max(.45, pixelRatio * (frameSeconds > .12 ? .5 : .8));
      if (next !== pixelRatio) { pixelRatio = next; renderer.setPixelRatio(pixelRatio); }
    } else if (!moving) { motionFrames = 0; if (pixelRatio !== fullPixelRatio) { pixelRatio = fullPixelRatio; renderer.setPixelRatio(pixelRatio); } }
    interior.setEconomyMotion(moving && pixelRatio < .75);
    if (travel) {
      // Bound progress per rendered frame so a slow frame cannot skip the
      // half-circle and appear to cut through the central table.
      travel.elapsed += dt * 1000;
      const t = travel.duration ? Math.min(1, travel.elapsed / travel.duration) : 1;
      camera.position.fromArray(samplePath(travel.points, t * t * (3 - 2 * t)));
      const look = selected && t >= .85 ? vec(CONSOLES[selected].screen) : new THREE.Vector3(0, 1.9, 0);
      targetCamera.position.copy(camera.position); targetCamera.lookAt(look);
      if (reduced.matches) camera.quaternion.copy(targetCamera.quaternion); else camera.quaternion.slerp(targetCamera.quaternion, 1 - Math.exp(-dt * 5));
      if (t === 1 && (reduced.matches || camera.quaternion.angleTo(targetCamera.quaternion) < .008)) {
        travel = null;
        if (selected) docking = true; else state('overview', null);
      }
    }
    if (docking && selected) {
      const position = vec(monitorEye(selected));
      targetCamera.position.copy(position); targetCamera.lookAt(vec(CONSOLES[selected].screen));
      const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 9);
      camera.position.lerp(position, blend); camera.quaternion.slerp(targetCamera.quaternion, blend);
    }
    if (mode === 'explore') {
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const right = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const length = Math.hypot(forward, right) || 1, speed = (keys.has('ShiftLeft') ? 3.2 : 1.8) * Math.min(dt, .05) / length;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed, dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;
      const previous = camera.position.toArray() as [number, number, number];
      if (canExplore(camera.position.x + dx, camera.position.z, previous)) camera.position.x += dx;
      if (canExplore(camera.position.x, camera.position.z + dz, camera.position.toArray() as [number, number, number])) camera.position.z += dz;
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
    // Transfer into the occupied seat without rendering inside the operator's head.
    for (const [station, human] of operators) human.visible = camera.position.distanceTo(vec(operatorEye(station))) > .75;
    // Align to the screen normal and fit its bezel; responsive DOM takes over only once settled.
    const desiredFov = selected && (docking || mode === 'seated') ? monitorFov(selected, camera.aspect) : 52;
    const reframing = Math.abs(camera.fov - desiredFov) > .05;
    camera.fov = reduced.matches || !reframing ? desiredFov : THREE.MathUtils.damp(camera.fov, desiredFov, 8, dt);
    camera.updateProjectionMatrix();
    if (docking && selected && !reframing && camera.position.distanceTo(vec(monitorEye(selected))) < .005 && camera.quaternion.angleTo(targetCamera.quaternion) < .005) {
      camera.position.fromArray(monitorEye(selected)); camera.quaternion.copy(targetCamera.quaternion);
      docking = false; state('seated', selected);
      pixelRatio = fullPixelRatio; renderer.setPixelRatio(pixelRatio); interior.setEconomyMotion(false);
    }
    renderer.render(scene, camera);
    if (scene.userData.artReady && !artReported) { artReported = true; onArt(true); }
    renderer.domElement.dataset.mode = mode;
    renderer.domElement.dataset.artReady = String(scene.userData.artReady);
    renderer.domElement.dataset.modelLoaded = String(scene.userData.modelLoaded);
    renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
    renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    renderer.domElement.dataset.pixelRatio = String(pixelRatio);
    renderer.domElement.dataset.position = camera.position.toArray().map(value => value.toFixed(3)).join(',');
    renderer.domElement.dataset.direction = camera.getWorldDirection(new THREE.Vector3()).toArray().map(value => value.toFixed(3)).join(',');
    if (mode === 'overview') {
      const eye = operatorEye('map');
      const headTop = new THREE.Vector3(eye[0], 1.93, eye[2]);
      const towardHead = headTop.clone().sub(camera.position);
      const ray = new THREE.Raycaster(camera.position, towardHead.clone().normalize(), 0, towardHead.length());
      renderer.domElement.dataset.mapHeadOccluded = String(ray.intersectObject(guard).length > 0);
    }
    if (travel || docking || keys.size || reframing || moving && mode === 'overview') invalidate();
  }
  const pointerDown = (event: PointerEvent) => { renderer.domElement.focus({ preventScroll: true }); press = { x: event.clientX, y: event.clientY }; moved = false; renderer.domElement.setPointerCapture(event.pointerId); };
  const pointerMove = (event: PointerEvent) => {
    if (!press) return; const dx = event.clientX - press.x, dy = event.clientY - press.y; if (Math.hypot(dx, dy) > 2) moved = true;
    if (mode === 'explore') { yaw -= dx * .004; pitch = THREE.MathUtils.clamp(pitch - dy * .004, -1.2, 1.2); invalidate(); }
    press = { x: event.clientX, y: event.clientY };
  };
  const pointerUp = (event: PointerEvent) => {
    if (press && !moved) { const rect = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(scene.children, true)[0]; let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.station) object = object.parent;
      if (object?.userData.station) command(object.userData.station as Station);
    } press = null; invalidate();
  };
  const keyDown = (event: KeyboardEvent) => { if (mode !== 'explore' || event.target instanceof Element && event.target.closest('button,input,select,textarea,a')) return; if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|ShiftLeft)$/.test(event.code)) { event.preventDefault(); keys.add(event.code); invalidate(); } };
  const keyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const blur = () => { keys.clear(); press = null; };
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; blur(); } else { last = performance.now(); invalidate(); } };
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', blur);
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
  resize(); invalidate();
  return { command, home, explore, key(code: string, down: boolean) { if (down) keys.add(code); else keys.delete(code); invalidate(); }, dispose() {
    disposed = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(); scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } else if (object instanceof THREE.Sprite) materials.add(object.material); });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); resources.forEach(value => value.dispose()); interior.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); host.replaceChildren();
  } };
}
