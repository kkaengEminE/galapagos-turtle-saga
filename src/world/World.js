// World.js – Single seamless map: Bridge → River → Combat Field → Boss Room
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Hippo } from '../enemy/Hippo.js';
import { Effects } from '../utils/Effects.js';

/*
  Map layout (Z axis = forward, negative Z = deeper into map):
  Z  0..-10   : Bridge area (tutorial 1: movement)
  Z -10..-25  : River area  (tutorial 2: jump)
  Z -25..-45  : Combat field (tutorial 3: fight seaweed)
  Z -45..-50  : Boss door gate
  Z -50..-70  : Boss arena
*/

const SEAWEED_SCALE = 2;   // seaweed:turtle = 2:1
const HIPPO_SCALE = 5;     // hippo:turtle = 5:1

export class World {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.walls = [];
    this.bridgeParts = [];
    this.seaweeds = [];       // { group, alive, body }
    this.hippo = null;
    this.bossDoor = null;
    this.bossDoorOpen = false;
    this.clouds = [];
    this.waterPlanes = [];
  }

  build() {
    this._buildBridge();
    this._buildRiver();
    this._buildCombatField();
    this._buildBossGate();
    this._buildBossArena();
    this._buildBoundaryWalls();
    this._buildClouds();
  }

  /* ═══════ ZONE 1: BRIDGE (z 0 to -12) ═══════ */
  _buildBridge() {
    // Start platform
    this._ground(0, 0, 0, 6, 0.4, 6, 0x5a8f4a);
    // Grass on start
    this._scatterGrass(0, 0.2, 0, 3, 3, 20);

    // Bridge going -Z
    for (let i = 0; i < 5; i++) {
      const z = -2.5 - i * 2;
      this._bridgePlank(0, 0.1, z);
    }

    // Rope rails
    this._rope(1.2, -2.5, -10.5);
    this._rope(-1.2, -2.5, -10.5);
  }

  _bridgePlank(x, y, z) {
    const group = new THREE.Group();
    const plankMat = new THREE.MeshToonMaterial({ color: 0xc4a35a });
    const plankDark = new THREE.MeshToonMaterial({ color: 0xa08040 });
    for (let p = 0; p < 3; p++) {
      const geo = new THREE.BoxGeometry(2, 0.1, 0.5);
      const m = new THREE.Mesh(geo, p % 2 === 0 ? plankMat : plankDark);
      m.position.set(0, 0, -0.5 + p * 0.5);
      group.add(m);
    }
    group.position.set(x, y, z);
    this.scene.add(group);
    this.objects.push(group);
    Physics.createBox({ x: 1.2, y: 0.1, z: 1 }, { x, y, z }, 0);
    this.bridgeParts.push({ group, origY: y, collapsed: false, z });
  }

  _rope(xSide, zStart, zEnd) {
    const ropeMat = new THREE.MeshToonMaterial({ color: 0x8b7355 });
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector3(xSide, 0.5 + Math.sin(t * Math.PI) * -0.15, zStart + (zEnd - zStart) * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 20, 0.025, 4, false);
    const rope = new THREE.Mesh(geo, ropeMat);
    this.scene.add(rope);
    this.objects.push(rope);
  }

  /* ═══════ ZONE 2: RIVER (z -12 to -28) ═══════ */
  _buildRiver() {
    // Landing platform
    this._ground(0, 0, -13, 4, 0.4, 3, 0x4a7c59);

    // Water
    const waterGeo = new THREE.PlaneGeometry(12, 12, 24, 24);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x2d8bc9, transparent: true, opacity: 0.65,
      shininess: 80, specular: 0x88bbff,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.8, -20);
    this.scene.add(water);
    this.objects.push(water);
    this.waterPlanes.push(water);

    // Stepping stones / platforms
    const stones = [
      { x: 0, y: 0.3, z: -16 },
      { x: 1.5, y: 0.6, z: -19 },
      { x: -1, y: 0.4, z: -22 },
      { x: 0.5, y: 0.5, z: -25 },
    ];
    for (const s of stones) {
      this._jumpPlatform(s.x, s.y, s.z);
    }

    // Floor under river (so player can't fall forever)
    Physics.createBox({ x: 6, y: 0.1, z: 8 }, { x: 0, y: -1.5, z: -20 }, 0);

    // Far bank
    this._ground(0, 0, -27, 6, 0.4, 3, 0x5a8f4a);
  }

  _jumpPlatform(x, y, z) {
    const geo = new THREE.CylinderGeometry(0.9, 0.8, 0.35, 12);
    const mat = new THREE.MeshToonMaterial({ color: 0x5a7a5a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.objects.push(mesh);
    Physics.createBox({ x: 0.9, y: 0.2, z: 0.9 }, { x, y, z }, 0);

    // Glowing crystal on top
    const cGeo = new THREE.OctahedronGeometry(0.18, 0);
    const cMat = new THREE.MeshBasicMaterial({ color: 0x44ddcc, transparent: true, opacity: 0.75 });
    const crystal = new THREE.Mesh(cGeo, cMat);
    crystal.position.set(x, y + 0.4, z);
    crystal.userData.spin = true;
    this.scene.add(crystal);
    this.objects.push(crystal);
  }

  /* ═══════ ZONE 3: COMBAT FIELD (z -28 to -45) ═══════ */
  _buildCombatField() {
    // Large grass field
    this._ground(0, 0, -36, 14, 0.4, 16, 0x6b8e4e);
    this._scatterGrass(0, 0.2, -36, 6, 7, 50);

    // Seaweed enemies (size = SEAWEED_SCALE)
    const swPositions = [
      { x: 2, z: -32 }, { x: -3, z: -34 },
      { x: 0, z: -37 }, { x: 4, z: -39 },
      { x: -2, z: -41 },
    ];
    for (const p of swPositions) {
      this._createSeaweed(p.x, 0.2, p.z);
    }

    // Torches
    for (const p of [[-6, -32], [6, -32], [-6, -42], [6, -42]]) {
      this._torch(p[0], 0, p[1]);
    }

    // Sign: instructions
    this._signSprite(0, 2.5, -29, 'A:공격  S:방어  D:발차기  Shift:회피');
  }

  _createSeaweed(x, y, z) {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshToonMaterial({ color: 0x1b4332 });
    const leafMat = new THREE.MeshToonMaterial({ color: 0x40916c });

    // 3 tall stalks (scaled by SEAWEED_SCALE)
    for (let i = 0; i < 4; i++) {
      const h = (0.6 + Math.random() * 0.5) * SEAWEED_SCALE;
      const geo = new THREE.CylinderGeometry(0.06 * SEAWEED_SCALE, 0.1 * SEAWEED_SCALE, h, 6);
      const stalk = new THREE.Mesh(geo, baseMat);
      stalk.position.set((Math.random() - 0.5) * 0.3 * SEAWEED_SCALE, h / 2, (Math.random() - 0.5) * 0.3 * SEAWEED_SCALE);
      stalk.rotation.z = (Math.random() - 0.5) * 0.3;
      group.add(stalk);
    }
    // Top leaf cluster
    const lGeo = new THREE.SphereGeometry(0.25 * SEAWEED_SCALE, 8, 6);
    const leaf = new THREE.Mesh(lGeo, leafMat);
    leaf.position.y = 0.9 * SEAWEED_SCALE;
    group.add(leaf);

    // Eyes (so it looks alive)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * SEAWEED_SCALE), eyeMat);
      eye.position.set(side * 0.12 * SEAWEED_SCALE, 0.85 * SEAWEED_SCALE, 0.2 * SEAWEED_SCALE);
      group.add(eye);
    }

    group.position.set(x, y, z);
    this.scene.add(group);
    this.objects.push(group);

    // Hitbox (static body)
    const body = Physics.createBox(
      { x: 0.3 * SEAWEED_SCALE, y: 0.5 * SEAWEED_SCALE, z: 0.3 * SEAWEED_SCALE },
      { x, y: y + 0.5 * SEAWEED_SCALE, z },
      0
    );
    body.collisionResponse = false; // sensor

    this.seaweeds.push({ group, alive: true, body, pos: new THREE.Vector3(x, y, z) });
  }

  checkSeaweedHit(player) {
    const pPos = player.group.position;
    const attackRange = 1.8;
    for (const sw of this.seaweeds) {
      if (!sw.alive) continue;
      const dist = pPos.distanceTo(sw.pos);
      if (dist < attackRange) {
        sw.alive = false;
        Effects.burst(this.scene, sw.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x52b788, 12, 3, 0.15);
        Effects.shake(0.2, 0.1);
        // Fade out
        let t = 0;
        const anim = () => {
          t += 0.02;
          sw.group.scale.multiplyScalar(0.95);
          sw.group.position.y -= 0.02;
          sw.group.children.forEach(c => {
            if (c.material) { c.material.transparent = true; c.material.opacity = 1 - t; }
          });
          if (t < 1) requestAnimationFrame(anim);
          else this.scene.remove(sw.group);
        };
        anim();
        Physics.removeBody(sw.body);
      }
    }
  }

  allSeaweedDead() {
    return this.seaweeds.length > 0 && this.seaweeds.every(s => !s.alive);
  }

  /* ═══════ BOSS GATE (z -45 to -50) ═══════ */
  _buildBossGate() {
    // Path
    this._ground(0, 0, -47, 4, 0.4, 6, 0x3a4a3a);

    // Gate frame (stone arch)
    const archMat = new THREE.MeshToonMaterial({ color: 0x4a4a5a });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.8), archMat);
    left.position.set(-2, 2.5, -50);
    this.scene.add(left); this.objects.push(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.8), archMat);
    right.position.set(2, 2.5, -50);
    this.scene.add(right); this.objects.push(right);
    const top = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 0.8), archMat);
    top.position.set(0, 5.2, -50);
    this.scene.add(top); this.objects.push(top);

    // Door (closed initially)
    const doorGeo = new THREE.BoxGeometry(3.8, 4.8, 0.3);
    const doorMat = new THREE.MeshToonMaterial({ color: 0x6b3a1f });
    this.bossDoor = new THREE.Mesh(doorGeo, doorMat);
    this.bossDoor.position.set(0, 2.5, -50);
    this.scene.add(this.bossDoor);
    this.objects.push(this.bossDoor);

    // Door collision (block until open)
    this.bossDoorBody = Physics.createBox({ x: 2, y: 3, z: 0.3 }, { x: 0, y: 2.5, z: -50 }, 0);
  }

  openBossDoor() {
    if (this.bossDoorOpen) return;
    this.bossDoorOpen = true;
    Physics.removeBody(this.bossDoorBody);
    // Animate door rising
    let t = 0;
    const anim = () => {
      t += 0.01;
      this.bossDoor.position.y = 2.5 + t * 6;
      this.bossDoor.material.transparent = true;
      this.bossDoor.material.opacity = 1 - t;
      if (t < 1) requestAnimationFrame(anim);
      else this.scene.remove(this.bossDoor);
    };
    anim();
  }

  /* ═══════ ZONE 4: BOSS ARENA (z -50 to -70) ═══════ */
  _buildBossArena() {
    // Dark arena floor
    const arenaGeo = new THREE.CylinderGeometry(12, 12, 0.5, 32);
    const arenaMat = new THREE.MeshToonMaterial({ color: 0x2a2a3a });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.set(0, -0.25, -60);
    this.scene.add(arena); this.objects.push(arena);
    Physics.createBox({ x: 12, y: 0.25, z: 12 }, { x: 0, y: -0.25, z: -60 }, 0);

    // Glowing rim
    const rimGeo = new THREE.TorusGeometry(12, 0.15, 8, 48);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x6644aa });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.05, -60);
    this.scene.add(rim); this.objects.push(rim);

    // Purple torches
    const angles = [0, 1, 2, 3, 4, 5].map(i => (i / 6) * Math.PI * 2);
    for (const a of angles) {
      this._torch(Math.cos(a) * 11, 0, -60 + Math.sin(a) * 11, 0x8844ff);
    }

    // Boss (hippo, scale = HIPPO_SCALE)
    this.hippo = new Hippo();
    this.hippo.create(this.scene, { x: 0, y: 1, z: -63 }, HIPPO_SCALE);

    // Arena walls
    Physics.createBox({ x: 0.5, y: 3, z: 12 }, { x: -12.5, y: 1, z: -60 }, 0);
    Physics.createBox({ x: 0.5, y: 3, z: 12 }, { x: 12.5, y: 1, z: -60 }, 0);
    Physics.createBox({ x: 12, y: 3, z: 0.5 }, { x: 0, y: 1, z: -72 }, 0);
  }

  /* ═══════ SHARED HELPERS ═══════ */
  _ground(x, y, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshToonMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    this.scene.add(mesh); this.objects.push(mesh);
    Physics.createBox({ x: w / 2, y: h / 2, z: d / 2 }, { x, y: y - h / 2, z }, 0);
  }

  _scatterGrass(cx, cy, cz, rx, rz, count) {
    const colors = [0x52b788, 0x74c69d, 0x40916c];
    for (let i = 0; i < count; i++) {
      const h = 0.15 + Math.random() * 0.2;
      const geo = new THREE.ConeGeometry(0.04, h, 4);
      const mat = new THREE.MeshToonMaterial({ color: colors[i % colors.length] });
      const blade = new THREE.Mesh(geo, mat);
      blade.position.set(
        cx + (Math.random() - 0.5) * rx * 2,
        cy + h / 2,
        cz + (Math.random() - 0.5) * rz * 2
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      this.scene.add(blade); this.objects.push(blade);
    }
  }

  _torch(x, y, z, flameColor = 0xff8c00) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.8, 6),
      new THREE.MeshToonMaterial({ color: 0x3a2a1a })
    );
    post.position.y = 0.9;
    g.add(post);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshBasicMaterial({ color: flameColor })
    );
    flame.position.y = 1.9;
    flame.scale.y = 1.5;
    flame.userData.flame = true;
    g.add(flame);
    g.add(new THREE.PointLight(flameColor, 0.6, 7));
    g.children[2].position.y = 1.9;
    g.position.set(x, y, z);
    this.scene.add(g); this.objects.push(g);
  }

  _signSprite(x, y, z, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(5, 0.8, 1);
    this.scene.add(sprite); this.objects.push(sprite);
  }

  _buildBoundaryWalls() {
    // Sides along entire map
    Physics.createBox({ x: 0.5, y: 3, z: 40 }, { x: -7.5, y: 1, z: -35 }, 0);
    Physics.createBox({ x: 0.5, y: 3, z: 40 }, { x: 7.5, y: 1, z: -35 }, 0);
    // Behind start
    Physics.createBox({ x: 8, y: 3, z: 0.5 }, { x: 0, y: 1, z: 4 }, 0);
  }

  _buildClouds() {
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 3 + Math.floor(Math.random() * 3); j++) {
        const r = 0.5 + Math.random() * 1;
        const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
        blob.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1);
        blob.scale.y = 0.5;
        g.add(blob);
      }
      g.position.set(
        (Math.random() - 0.5) * 50,
        10 + Math.random() * 5,
        -35 + (Math.random() - 0.5) * 60
      );
      g.userData.speed = 0.1 + Math.random() * 0.25;
      this.scene.add(g); this.objects.push(g);
      this.clouds.push(g);
    }
  }

  /* ═══════ UPDATE ═══════ */
  update(dt, player) {
    const t = performance.now() * 0.001;

    // Clouds
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 30) c.position.x = -30;
    }

    // Spinning crystals
    this.objects.forEach(o => { if (o.userData && o.userData.spin) o.rotation.y += dt * 2; });

    // Flame animation
    this.objects.forEach(o => {
      if (o.isGroup) o.traverse(c => {
        if (c.userData && c.userData.flame) {
          c.scale.y = 1.3 + Math.sin(t * 5 + c.id) * 0.4;
          c.scale.x = 1 + Math.sin(t * 6 + c.id) * 0.15;
        }
      });
    });

    // Water waves
    for (const w of this.waterPlanes) {
      const pos = w.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.5 + t * 2) * 0.12 + Math.cos(y * 0.3 + t * 1.5) * 0.08);
      }
      pos.needsUpdate = true;
    }

    // Bridge collapse behind player
    if (player && player.body) {
      const pz = player.body.position.z;
      for (const bp of this.bridgeParts) {
        if (!bp.collapsed && pz < bp.z - 2) {
          bp.collapsed = true;
          let el = 0;
          const startY = bp.group.position.y;
          const fall = () => {
            el += 0.016;
            if (el < 2) {
              bp.group.position.y = startY - el * 1.5;
              bp.group.rotation.x = el * 0.3;
              requestAnimationFrame(fall);
            }
          };
          fall();
        }
      }

      // Respawn if fallen into water
      if (player.body.position.y < -1) {
        // Find nearest safe z
        const pzz = player.body.position.z;
        if (pzz > -12) player.setPosition(0, 2, 0);       // back to start
        else if (pzz > -28) player.setPosition(0, 2, -13); // river bank
        else player.setPosition(0, 2, -28);                 // field start
      }
    }

    // Seaweed idle sway
    for (const sw of this.seaweeds) {
      if (sw.alive && sw.group) {
        sw.group.rotation.z = Math.sin(t * 1.5 + sw.pos.x) * 0.08;
      }
    }
  }
}
