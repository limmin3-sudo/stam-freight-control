import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Batch only opaque, static siblings. Console/character groups retain their
// transforms, visibility and picking identity; transparent surfaces stay sorted.
export function batchBridgeMeshes(root: THREE.Object3D, excluded: Set<THREE.Object3D>) {
  const retired = new Set<THREE.BufferGeometry>();
  function visit(parent: THREE.Object3D) {
    for (const child of [...parent.children]) visit(child);
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (child.constructor !== THREE.Mesh || excluded.has(child)) continue;
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material) || mesh.material.transparent) continue;
      const key = [mesh.material.uuid, mesh.castShadow, mesh.receiveShadow, Object.keys(mesh.geometry.attributes).sort().join(',')].join('/');
      const batch = batches.get(key) ?? []; batch.push(mesh); batches.set(key, batch);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(mesh => {
        mesh.updateMatrix();
        return (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      if (!geometry) continue;
      const first = meshes[0]!, combined = new THREE.Mesh(geometry, first.material);
      combined.castShadow = first.castShadow; combined.receiveShadow = first.receiveShadow;
      for (const mesh of meshes) { retired.add(mesh.geometry); parent.remove(mesh); }
      parent.add(combined);
    }
  }
  visit(root);
  // Shared primitive geometry may still be used by an instanced/retained mesh.
  root.traverse(object => { if (object instanceof THREE.Mesh) retired.delete(object.geometry); });
  retired.forEach(geometry => geometry.dispose());
}
