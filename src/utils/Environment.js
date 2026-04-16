// Environment.js - Shared scenic elements (sky, clouds, grass, water)
import * as THREE from 'three';

export const Environment = {
  // Gradient sky dome
  createSky(scene, topColor = 0x4a90d9, bottomColor = 0x87ceeb) {
    const skyGeo = new THREE.SphereGeometry(50, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(topColor) },
        bottomColor: { value: new THREE.Color(bottomColor) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    return sky;
  },

  // Fluffy clouds
  createClouds(scene, count = 8, yRange = [8, 14], spread = 30) {
    const clouds = [];
    const cloudMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const numBlobs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numBlobs; j++) {
        const r = 0.5 + Math.random() * 1.0;
        const geo = new THREE.SphereGeometry(r, 8, 6);
        const blob = new THREE.Mesh(geo, cloudMat);
        blob.position.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1
        );
        blob.scale.y = 0.6;
        group.add(blob);
      }
      group.position.set(
        (Math.random() - 0.5) * spread * 2,
        yRange[0] + Math.random() * (yRange[1] - yRange[0]),
        (Math.random() - 0.5) * spread
      );
      group.userData.speed = 0.1 + Math.random() * 0.3;
      group.userData.bound = spread;
      scene.add(group);
      clouds.push(group);
    }
    return clouds;
  },

  // Animated water plane with simple wave effect
  createWater(scene, width = 30, depth = 20, y = -0.5, color = 0x4cc9f0) {
    const geo = new THREE.PlaneGeometry(width, depth, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      specular: 0x88bbff,
    });
    const water = new THREE.Mesh(geo, mat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = y;
    scene.add(water);
    return water;
  },

  // Scatter grass tufts on ground
  createGrass(scene, area = { x: [-8, 8], z: [-4, 4] }, count = 40, y = 0) {
    const grassGroup = new THREE.Group();
    const colors = [0x52b788, 0x74c69d, 0x40916c, 0x2d6a4f];

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const height = 0.15 + Math.random() * 0.25;
      const geo = new THREE.ConeGeometry(0.04, height, 4);
      const mat = new THREE.MeshToonMaterial({ color });
      const blade = new THREE.Mesh(geo, mat);

      blade.position.set(
        area.x[0] + Math.random() * (area.x[1] - area.x[0]),
        y + height / 2,
        area.z[0] + Math.random() * (area.z[1] - area.z[0])
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      grassGroup.add(blade);
    }
    scene.add(grassGroup);
    return grassGroup;
  },

  // Floating flower decorations
  createFlowers(scene, positions, y = 0.1) {
    const flowers = [];
    const petalColors = [0xff6b6b, 0xffd93d, 0xc77dff, 0xff9e9e, 0x72efdd];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
      const stemMat = new THREE.MeshToonMaterial({ color: 0x40916c });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.15;
      group.add(stem);

      // Petals
      const petalColor = petalColors[Math.floor(Math.random() * petalColors.length)];
      for (let p = 0; p < 5; p++) {
        const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const pMat = new THREE.MeshToonMaterial({ color: petalColor });
        const petal = new THREE.Mesh(pGeo, pMat);
        const a = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.08, 0.32, Math.sin(a) * 0.08);
        petal.scale.y = 0.6;
        group.add(petal);
      }

      // Center
      const centerGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const centerMat = new THREE.MeshToonMaterial({ color: 0xffd93d });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 0.32;
      group.add(center);

      group.position.set(pos.x, y, pos.z);
      scene.add(group);
      flowers.push(group);
    }
    return flowers;
  },

  // Update clouds movement
  updateClouds(clouds, dt) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > cloud.userData.bound) {
        cloud.position.x = -cloud.userData.bound;
      }
    }
  },

  // Animate water waves
  updateWater(water, time) {
    if (!water || !water.geometry) return;
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.5 + time * 2) * 0.1 + Math.cos(y * 0.3 + time * 1.5) * 0.08);
    }
    pos.needsUpdate = true;
  },
};
