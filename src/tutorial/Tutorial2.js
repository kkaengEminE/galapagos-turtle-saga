// Tutorial2.js - Jump tutorial with underwater cave theme
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Weed } from '../enemy/Weed.js';
import { Environment } from '../utils/Environment.js';

export class Tutorial2 {
  constructor(scene, player, hud) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.completed = false;
    this.weeds = [];
    this.objects = [];
    this.wallBodies = [];
    this.envObjects = [];
    this.groundBody = null;
    this.jumpCount = 0;
    this.requiredJumps = 3;
    this.bubbles = [];
    this.crystals = [];
  }

  init() {
    this.hud.setStage('튜토리얼 2: 점프');
    this.hud.setInstruction('Space바로 점프! 플랫폼을 건너세요 (0/3)');

    // Dark underwater sky
    this.envObjects.push(Environment.createSky(this.scene, 0x0a2a4a, 0x1a5276));

    // Ground (ocean floor)
    const groundGeo = new THREE.BoxGeometry(30, 0.5, 10);
    const groundMat = new THREE.MeshToonMaterial({ color: 0x1a3a2a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(10, -0.25, 0);
    this.scene.add(ground);
    this.objects.push(ground);
    this.groundBody = Physics.createBox({ x: 15, y: 0.25, z: 5 }, { x: 10, y: -0.25, z: 0 }, 0);

    // Sand patches on ground
    const sandMat = new THREE.MeshToonMaterial({ color: 0x3d5a40 });
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.CircleGeometry(0.5 + Math.random() * 0.8, 8);
      const sand = new THREE.Mesh(geo, sandMat);
      sand.rotation.x = -Math.PI / 2;
      sand.position.set(Math.random() * 22 - 1, 0.02, (Math.random() - 0.5) * 6);
      this.scene.add(sand);
      this.objects.push(sand);
    }

    // Glowing crystal platforms to jump on
    this._createCrystalPlatform(4, 0.8, 0, 0x2d9da8);
    this._createCrystalPlatform(8, 1.2, -0.5, 0x3daaaa);
    this._createCrystalPlatform(12, 0.8, 0.5, 0x2d9da8);
    this._createCrystalPlatform(16, 1.3, 0, 0x3daaaa);
    this._createCrystalPlatform(20, 0.6, 0, 0x45b5a0);

    // Weeds as obstacles
    const weedPositions = [
      { x: 6, z: 0 }, { x: 10, z: -0.5 }, { x: 10, z: 0.5 },
      { x: 14, z: 0 }, { x: 18, z: 0 },
    ];
    for (const pos of weedPositions) {
      const weed = new Weed(pos.x, 0, pos.z, 'seaweed');
      weed.create(this.scene);
      this.weeds.push(weed);
    }

    // Bubbles (animated)
    this._createBubbles(25);

    // Light beams from above
    this._createLightBeams();

    // Coral decorations
    this._createCorals();

    // Boundary walls
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 6 }, { x: -2, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 6 }, { x: 23, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 15, y: 3, z: 0.5 }, { x: 10, y: 1, z: 4.5 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 15, y: 3, z: 0.5 }, { x: 10, y: 1, z: -4.5 }, 0));

    // Water overlay (subtle)
    const waterGeo = new THREE.PlaneGeometry(30, 10);
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x4cc9f0, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(10, 3, 0);
    this.scene.add(water);
    this.objects.push(water);

    this.player.setPosition(0, 1.5, 0);
    this._prevOnGround = true;
  }

  _createCrystalPlatform(x, y, z, color) {
    const group = new THREE.Group();

    // Main platform
    const platGeo = new THREE.CylinderGeometry(1.2, 1.0, 0.3, 8);
    const platMat = new THREE.MeshToonMaterial({ color: 0x2a5a5a });
    const plat = new THREE.Mesh(platGeo, platMat);
    group.add(plat);

    // Glowing crystal on top
    const crystalGeo = new THREE.OctahedronGeometry(0.25, 0);
    const crystalMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 0.35;
    group.add(crystal);
    this.crystals.push(crystal);

    // Glow ring
    const glowGeo = new THREE.RingGeometry(0.8, 1.2, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.16;
    group.add(glow);

    group.position.set(x, y, z);
    this.scene.add(group);
    this.objects.push(group);

    Physics.createBox({ x: 1.2, y: 0.15, z: 1.2 }, { x, y, z }, 0);
  }

  _createBubbles(count) {
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xaaffff, transparent: true, opacity: 0.35,
    });
    for (let i = 0; i < count; i++) {
      const size = 0.04 + Math.random() * 0.1;
      const geo = new THREE.SphereGeometry(size, 8, 8);
      const bubble = new THREE.Mesh(geo, bubbleMat.clone());
      bubble.position.set(
        Math.random() * 24 - 2,
        Math.random() * 4,
        (Math.random() - 0.5) * 8
      );
      bubble.userData.baseY = bubble.position.y;
      bubble.userData.speed = 0.3 + Math.random() * 0.7;
      bubble.userData.wobble = Math.random() * Math.PI * 2;
      this.scene.add(bubble);
      this.objects.push(bubble);
      this.bubbles.push(bubble);
    }
  }

  _createLightBeams() {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.CylinderGeometry(0.3, 1.5, 10, 8, 1, true);
      const beam = new THREE.Mesh(geo, beamMat);
      beam.position.set(3 + i * 5, 5, (Math.random() - 0.5) * 4);
      beam.rotation.z = (Math.random() - 0.5) * 0.2;
      this.scene.add(beam);
      this.objects.push(beam);
    }
  }

  _createCorals() {
    const coralColors = [0xff6b6b, 0xffa07a, 0xdda0dd, 0xf0e68c];
    for (let i = 0; i < 10; i++) {
      const color = coralColors[Math.floor(Math.random() * coralColors.length)];
      const geo = new THREE.ConeGeometry(0.15 + Math.random() * 0.15, 0.4 + Math.random() * 0.4, 5 + Math.floor(Math.random() * 3));
      const mat = new THREE.MeshToonMaterial({ color });
      const coral = new THREE.Mesh(geo, mat);
      coral.position.set(
        Math.random() * 22 - 1,
        0.15 + Math.random() * 0.1,
        (Math.random() - 0.5) * 7
      );
      this.scene.add(coral);
      this.objects.push(coral);
    }
  }

  update(dt) {
    if (this.completed) return;

    // Animate bubbles
    const t = performance.now() * 0.001;
    for (const b of this.bubbles) {
      b.position.y = b.userData.baseY + Math.sin(t * b.userData.speed + b.userData.wobble) * 0.5;
      b.position.x += Math.sin(t * 0.5 + b.userData.wobble) * dt * 0.1;
    }

    // Rotate crystals
    for (const c of this.crystals) {
      c.rotation.y += dt * 2;
      c.position.y = 0.35 + Math.sin(t * 2 + c.id) * 0.05;
    }

    // Update weeds
    this.weeds.forEach(w => w.update(dt));

    // Detect jump
    if (this._prevOnGround && !this.player.onGround) {
      this.jumpCount++;
      this.hud.setInstruction(`Space바로 점프! (${Math.min(this.jumpCount, this.requiredJumps)}/${this.requiredJumps})`);
    }
    this._prevOnGround = this.player.onGround;

    // Weed collision
    const playerPos = this.player.group.position;
    for (const weed of this.weeds) {
      if (weed.alive && weed.mesh) {
        const dist = playerPos.distanceTo(weed.mesh.position);
        if (dist < 1.0) {
          weed.destroy(this.scene);
        }
      }
    }

    // Completion
    if (this.player.body.position.x > 19 && this.jumpCount >= this.requiredJumps) {
      this.completed = true;
      this.hud.setInstruction('✅ 점프 마스터! [F] 다음 단계');
    }
  }

  cleanup() {
    this.objects.forEach(obj => this.scene.remove(obj));
    this.envObjects.forEach(obj => this.scene.remove(obj));
    this.weeds.forEach(w => w.destroy(this.scene));
    this.objects = [];
    this.envObjects = [];
    this.weeds = [];
    this.bubbles = [];
    this.crystals = [];
    this.wallBodies.forEach(b => Physics.removeBody(b));
    this.wallBodies = [];
    if (this.groundBody) Physics.removeBody(this.groundBody);
  }
}
