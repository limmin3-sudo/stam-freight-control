import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONSOLES, monitorSize } from '../src/bridge-layout.ts';

test('authored bridge keeps console anchors, bezels and chair geometry within the approved footprint', async () => {
  const file = await readFile(new URL('../src/assets/bridge/command-bridge.glb', import.meta.url));
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const { scene } = await new GLTFLoader().parseAsync(buffer, '');
  let triangles = 0, bakedMeshes = 0;
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
    if (object.geometry.getAttribute('color')) bakedMeshes++;
  });
  assert.ok(triangles < 180000, `Static room geometry budget: ${triangles}`);
  assert.ok(bakedMeshes > 20, 'Local contact shading must be present in the shipped asset');
  for (const station of ['mission', 'map', 'operations'] as const) {
    const group = scene.getObjectByName(`${station[0]!.toUpperCase()}${station.slice(1)}_console`);
    assert.ok(group, `Missing semantic console: ${station}`);
    assert.equal(group.userData.station, station);
    const { screen, yaw } = CONSOLES[station];
    assert.ok(Math.abs(group.position.x - screen[0]) < .001 && Math.abs(group.position.z - screen[2]) < .001);
    const facing = new Vector3(0, 0, 1).applyQuaternion(group.quaternion);
    assert.ok(facing.distanceTo(new Vector3(Math.sin(yaw), 0, Math.cos(yaw))) < .001);
    const local = group.clone(true); local.position.set(0, 0, 0); local.quaternion.identity(); local.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(local), [width, height] = monitorSize(station);
    assert.ok(bounds.min.x > -width / 2 - .2 && bounds.max.x < width / 2 + .2, `${station}: a shared mesh was duplicated or shifted while joining`);
    assert.ok(bounds.min.z > -1.3 && bounds.max.z < 2.5, `${station}: desk/seat must fit its approach space`);
    assert.ok(Math.abs(bounds.max.y - (screen[1] + height / 2)) < .08);
  }
});
