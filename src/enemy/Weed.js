// Weed.js - Seaweed/thorn enemy (static obstacle)
import * as THREE from 'three';
import { Physics } from '../physics.js';

export class Weed {
  constructor(x, y, z, type = 'seaweed') {
    this.type = type;
    this.alive = true;
    this.mesh = null;
    this.body = null;
    this.position = { x, y, z };
  }

  create(scene) {
    const group = new THREE.Group();

    if (this.type === 'seaweed') {
      // Seaweed - wavy green shapes
      const mat = new THREE.MeshToonMaterial({ color: 0x1b4332 });
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.CylinderGeometry(0.05, 0.08, 0.6 + Math.random() * 0.4, 6);
        const strand = new THREE.Mesh(geo, mat);
        strand.position.set(
          (Math.random() - 0.5) * 0.2,
          0.3 + i * 0.1,
          (Math.random() - 0.5) * 0.2
        );
        strand.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(strand);
      }
      // Top leaves
      const leafMat = new THREE.MeshToonMaterial({ color: 0x40916c });
      const leafGeo = new THREE.SphereGeometry(0.15, 8, 6);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 0.7;
      group.add(leaf);
    } else {
      // Thorn bush
      const mat = new THREE.MeshToonMaterial({ color: 0x5a3e1b });
      const bushGeo = new THREE.IcosahedronGeometry(0.3, 0);
      const bush = new THREE.Mesh(bushGeo, mat);
      bush.position.y = 0.3;
      group.add(bush);

      // Spikes
      const spikeMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
      for (let i = 0; i < 6; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.3, 0.3, Math.sin(angle) * 0.3);
        spike.rotation.z = -Math.cos(angle) * 0.5;
        spike.rotation.x = Math.sin(angle) * 0.5;
        group.add(spike);
      }
    }

    group.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh = group;
    scene.add(group);

    // Physics body (static sensor)
    this.body = Physics.createBox(
      { x: 0.2, y: 0.4, z: 0.2 },
      this.position,
      0 // static
    );
    this.body.collisionResponse = false; // sensor-like

    return this;
  }

  destroy(scene) {
    this.alive = false;
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.body) {
      Physics.removeBody(this.body);
      this.body = null;
    }
  }

  update(dt) {
    // Simple sway animation for seaweed
    if (this.mesh && this.type === 'seaweed') {
      this.mesh.rotation.z = Math.sin(performance.now() * 0.002) * 0.1;
    }
  }
}
