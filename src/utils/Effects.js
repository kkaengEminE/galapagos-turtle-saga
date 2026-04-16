// Effects.js - Particle effects, camera shake, visual juice
import * as THREE from 'three';

const particles = [];
let cameraShakeIntensity = 0;
let cameraShakeDecay = 0;
const origCamPos = new THREE.Vector3();

export const Effects = {
  // Burst of colored particles at position
  burst(scene, position, color = 0xffff00, count = 12, speed = 3, size = 0.12, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.5), 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.6;
      const s = speed * (0.5 + Math.random() * 0.5);
      particles.push({
        mesh,
        scene,
        vx: Math.cos(angle) * Math.sin(upAngle) * s,
        vy: Math.cos(upAngle) * s + 1,
        vz: Math.sin(angle) * Math.sin(upAngle) * s,
        life,
        maxLife: life,
        gravity: -8,
      });
    }
  },

  // Star/sparkle effect
  sparkle(scene, position, color = 0xffd700, count = 6) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.OctahedronGeometry(0.08, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      scene.add(mesh);

      const angle = (i / count) * Math.PI * 2;
      particles.push({
        mesh,
        scene,
        vx: Math.cos(angle) * 2,
        vy: 2 + Math.random(),
        vz: Math.sin(angle) * 2,
        life: 0.5,
        maxLife: 0.5,
        gravity: -5,
        spin: true,
      });
    }
  },

  // Dust puff (jump landing, footsteps)
  dust(scene, position, count = 6) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc9b99a, transparent: true, opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y = 0.1;
      scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      particles.push({
        mesh,
        scene,
        vx: Math.cos(angle) * 1.5,
        vy: 0.5 + Math.random() * 0.5,
        vz: Math.sin(angle) * 1.5,
        life: 0.4,
        maxLife: 0.4,
        gravity: -1,
        scale: true,
      });
    }
  },

  // Damage number floating up
  damageNumber(scene, position, text, color = 0xff4444) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(text, 66, 34);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.position.y += 1;
    sprite.scale.set(1.5, 0.75, 1);
    scene.add(sprite);

    particles.push({
      mesh: sprite,
      scene,
      vx: 0, vy: 2, vz: 0,
      life: 1.0,
      maxLife: 1.0,
      gravity: 0,
    });
  },

  // Camera shake
  shake(intensity = 0.3, duration = 0.2) {
    cameraShakeIntensity = intensity;
    cameraShakeDecay = intensity / duration;
  },

  // Call every frame
  update(dt, camera) {
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        p.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) {
          if (p.mesh.material.map) p.mesh.material.map.dispose();
          p.mesh.material.dispose();
        }
        particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy += (p.gravity || 0) * dt;

      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;

      if (p.spin) {
        p.mesh.rotation.x += dt * 10;
        p.mesh.rotation.y += dt * 8;
      }
      if (p.scale) {
        const s = 1 + (1 - t) * 2;
        p.mesh.scale.set(s, s, s);
      }
    }

    // Camera shake
    if (cameraShakeIntensity > 0 && camera) {
      camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
      camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
      cameraShakeIntensity -= cameraShakeDecay * dt;
      if (cameraShakeIntensity < 0) cameraShakeIntensity = 0;
    }
  },

  clearAll(scene) {
    for (const p of particles) {
      p.scene.remove(p.mesh);
    }
    particles.length = 0;
    cameraShakeIntensity = 0;
  },
};
