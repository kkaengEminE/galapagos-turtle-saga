// Tutorial1.js - Bridge crossing with lush scenery
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Environment } from '../utils/Environment.js';

export class Tutorial1 {
  constructor(scene, player, hud) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.completed = false;
    this.bridgeParts = [];
    this.objects = [];
    this.wallBodies = [];
    this.clouds = [];
    this.water = null;
    this.envObjects = [];
  }

  init() {
    this.hud.setStage('튜토리얼 1: 이동');
    this.hud.setInstruction('방향키(←→↑↓)로 다리를 건너세요!');

    // Sky
    this.envObjects.push(Environment.createSky(this.scene, 0x3a7bd5, 0xb5d4f0));

    // Clouds
    this.clouds = Environment.createClouds(this.scene, 10, [6, 12], 25);
    this.envObjects.push(...this.clouds);

    // Water below
    this.water = Environment.createWater(this.scene, 40, 30, -1.5, 0x2d8bc9);
    this.envObjects.push(this.water);

    // Start island (large, grassy)
    this._createIsland(-4, 0, 0, 4, 5, 0x5a8f4a);
    // End island
    this._createIsland(12, 0, 0, 4, 5, 0x5a8f4a);

    // Bridge sections (wooden planks with ropes)
    for (let i = 0; i < 7; i++) {
      this._createBridgePart(i);
    }

    // Grass on islands
    this.envObjects.push(Environment.createGrass(this.scene, { x: [-6.5, -1.5], z: [-2, 2] }, 30, 0.25));
    this.envObjects.push(Environment.createGrass(this.scene, { x: [10, 14], z: [-2, 2] }, 30, 0.25));

    // Flowers
    const flowerPos = [
      { x: -5, z: 1.5 }, { x: -3, z: -1.5 }, { x: -5.5, z: -0.5 },
      { x: 11, z: 1 }, { x: 13, z: -1 }, { x: 12, z: 2 },
    ];
    this.envObjects.push(...Environment.createFlowers(this.scene, flowerPos, 0.25));

    // Trees on islands
    this._createTree(-6, 0.25, 1.5);
    this._createTree(-6, 0.25, -1.5);
    this._createTree(14, 0.25, 1);
    this._createTree(14, 0.25, -1.5);

    // Rope rails along bridge
    this._createRopeRails();

    // Invisible boundary walls
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 5 }, { x: -7, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 5 }, { x: 15, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 12, y: 3, z: 0.5 }, { x: 4, y: 1, z: 3 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 12, y: 3, z: 0.5 }, { x: 4, y: 1, z: -3 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 12, y: 0.1, z: 5 }, { x: 4, y: -0.5, z: 0 }, 0));

    // Place player
    this.player.setPosition(-4, 1.5, 0);
  }

  _createIsland(x, y, z, w, d, color) {
    // Top grass layer
    const topGeo = new THREE.BoxGeometry(w, 0.3, d);
    const topMat = new THREE.MeshToonMaterial({ color });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(x, y + 0.15, z);
    this.scene.add(top);
    this.objects.push(top);

    // Dirt layer underneath
    const dirtGeo = new THREE.BoxGeometry(w - 0.2, 0.8, d - 0.2);
    const dirtMat = new THREE.MeshToonMaterial({ color: 0x8b6914 });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.position.set(x, y - 0.4, z);
    this.scene.add(dirt);
    this.objects.push(dirt);

    // Rock base
    const rockGeo = new THREE.DodecahedronGeometry(1.8, 0);
    const rockMat = new THREE.MeshToonMaterial({ color: 0x7a7a7a });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, y - 1.5, z);
    rock.scale.set(w / 3.5, 0.5, d / 3.5);
    this.scene.add(rock);
    this.objects.push(rock);

    Physics.createBox({ x: w / 2, y: 0.25, z: d / 2 }, { x, y: y + 0.1, z }, 0);
  }

  _createBridgePart(index) {
    const x = -1.5 + index * 2;
    const group = new THREE.Group();

    // Wooden planks
    const plankMat = new THREE.MeshToonMaterial({ color: 0xc4a35a });
    const plankDarkMat = new THREE.MeshToonMaterial({ color: 0xa08040 });
    for (let p = 0; p < 4; p++) {
      const geo = new THREE.BoxGeometry(1.7, 0.08, 0.35);
      const mat = p % 2 === 0 ? plankMat : plankDarkMat;
      const plank = new THREE.Mesh(geo, mat);
      plank.position.set(0, 0, -0.6 + p * 0.4);
      plank.rotation.y = (Math.random() - 0.5) * 0.02;
      group.add(plank);
    }

    // Rope side connectors
    const ropeMat = new THREE.MeshToonMaterial({ color: 0x8b7355 });
    for (const zSide of [-0.8, 0.8]) {
      const ropeGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 4);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.rotation.z = Math.PI / 2;
      rope.position.set(0, 0.15, zSide);
      group.add(rope);
    }

    group.position.set(x, 0.15, 0);
    this.scene.add(group);
    this.objects.push(group);

    const body = Physics.createBox({ x: 0.9, y: 0.1, z: 0.9 }, { x, y: 0.15, z: 0 }, 0);
    this.bridgeParts.push({ group, body, collapsed: false, x });
  }

  _createRopeRails() {
    // Long ropes along bridge sides
    const ropeMat = new THREE.MeshToonMaterial({ color: 0x8b7355 });
    for (const zSide of [-0.9, 0.9]) {
      // Posts at each end
      for (const xPos of [-2, 12]) {
        const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6);
        const post = new THREE.Mesh(postGeo, ropeMat);
        post.position.set(xPos, 0.6, zSide);
        this.scene.add(post);
        this.objects.push(post);
      }

      // Catenary rope curve
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, 0.8, zSide),
        new THREE.Vector3(2, 0.6, zSide),
        new THREE.Vector3(5, 0.55, zSide),
        new THREE.Vector3(8, 0.6, zSide),
        new THREE.Vector3(12, 0.8, zSide),
      ]);
      const ropeGeo = new THREE.TubeGeometry(curve, 20, 0.02, 4, false);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      this.scene.add(rope);
      this.objects.push(rope);
    }
  }

  _createTree(x, y, z) {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6);
    const trunkMat = new THREE.MeshToonMaterial({ color: 0x6b3a1f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4;
    group.add(trunk);

    // Layered crown
    const crownColors = [0x2d6a4f, 0x40916c, 0x52b788];
    for (let i = 0; i < 3; i++) {
      const r = 0.5 - i * 0.12;
      const geo = new THREE.SphereGeometry(r, 8, 6);
      const mat = new THREE.MeshToonMaterial({ color: crownColors[i] });
      const crown = new THREE.Mesh(geo, mat);
      crown.position.y = 0.9 + i * 0.3;
      crown.scale.y = 0.7;
      group.add(crown);
    }

    group.position.set(x, y, z);
    this.scene.add(group);
    this.objects.push(group);
  }

  update(dt) {
    if (this.completed) return;

    Environment.updateClouds(this.clouds, dt);
    if (this.water) Environment.updateWater(this.water, performance.now() * 0.001);

    const px = this.player.body.position.x;

    // Bridge collapse visual (behind player)
    for (const part of this.bridgeParts) {
      if (!part.collapsed && px > part.x + 2.5) {
        part.collapsed = true;
        this._collapsePart(part);
      }
    }

    if (px > 10.5) {
      this.completed = true;
      this.hud.setInstruction('✅ 다리를 건넜습니다! [F] 다음 단계');
    }
  }

  _collapsePart(part) {
    let elapsed = 0;
    const startY = part.group.position.y;
    const animate = () => {
      elapsed += 0.016;
      if (elapsed < 2) {
        part.group.position.y = startY - elapsed * 1.5;
        part.group.rotation.z = elapsed * 0.4;
        part.group.rotation.x = elapsed * 0.2;
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  cleanup() {
    this.objects.forEach(obj => this.scene.remove(obj));
    this.envObjects.forEach(obj => this.scene.remove(obj));
    this.objects = [];
    this.envObjects = [];
    this.bridgeParts = [];
    this.wallBodies.forEach(b => Physics.removeBody(b));
    this.wallBodies = [];
  }
}
