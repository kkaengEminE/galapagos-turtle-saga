// Tutorial3.js - Skill tutorial arena
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Weed } from '../enemy/Weed.js';
import { Environment } from '../utils/Environment.js';
import { Effects } from '../utils/Effects.js';

export class Tutorial3 {
  constructor(scene, player, hud, checkBoxMgr) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.checkBoxMgr = checkBoxMgr;
    this.completed = false;
    this.objects = [];
    this.targets = [];
    this.wallBodies = [];
    this.envObjects = [];
    this.clouds = [];
    this.groundBody = null;
    this.skillsUsed = { A: false, S: false, D: false };
  }

  init() {
    this.hud.setStage('튜토리얼 3: 스킬');
    this.hud.setInstruction('A키를 눌러 무기를 휘둘러 보세요!');
    this.checkBoxMgr.show();

    // Sky
    this.envObjects.push(Environment.createSky(this.scene, 0xd4763a, 0xf0c27f));
    this.clouds = Environment.createClouds(this.scene, 6, [8, 12], 20);
    this.envObjects.push(...this.clouds);

    // Arena ground (circular arena feel)
    const groundGeo = new THREE.CylinderGeometry(8, 8, 0.4, 32);
    const groundMat = new THREE.MeshToonMaterial({ color: 0x6b8e4e });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.2, 0);
    this.scene.add(ground);
    this.objects.push(ground);
    this.groundBody = Physics.createBox({ x: 8, y: 0.25, z: 8 }, { x: 0, y: -0.2, z: 0 }, 0);

    // Arena border ring
    const ringGeo = new THREE.TorusGeometry(8, 0.2, 8, 32);
    const ringMat = new THREE.MeshToonMaterial({ color: 0x8b6914 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    this.scene.add(ring);
    this.objects.push(ring);

    // Grass
    this.envObjects.push(Environment.createGrass(this.scene, { x: [-6, 6], z: [-6, 6] }, 60, 0));

    // Training dummies (3 wooden targets)
    this._createTarget(3, 0, 0, 'A');
    this._createTarget(-2, 0, 3, 'S');
    this._createTarget(-2, 0, -3, 'D');

    // Torches around arena
    this._createTorches();

    // Skill instruction banners
    this._createBanner(-6, 2, 0, 'A: 무기 휘두르기 🗡️', 0xffd700);
    this._createBanner(-6, 2, -3, 'S: 껍질 숨기 🛡️', 0x52b788);
    this._createBanner(-6, 2, 3, 'D: 앞발 차기 🦶', 0xff6b6b);

    // Boundary walls
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 9 }, { x: -9, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 0.5, y: 3, z: 9 }, { x: 9, y: 1, z: 0 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 9, y: 3, z: 0.5 }, { x: 0, y: 1, z: 9 }, 0));
    this.wallBodies.push(Physics.createBox({ x: 9, y: 3, z: 0.5 }, { x: 0, y: 1, z: -9 }, 0));

    this.player.setPosition(0, 1, 0);
  }

  _createTarget(x, y, z, label) {
    const group = new THREE.Group();

    // Post
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6);
    const postMat = new THREE.MeshToonMaterial({ color: 0x6b3a1f });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 0.6;
    group.add(post);

    // Target board (circular)
    const boardGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16);
    const boardMat = new THREE.MeshToonMaterial({ color: 0xc4a35a });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 1.3;
    group.add(board);

    // Target rings
    const ringColors = [0xff4444, 0xffffff, 0xff4444];
    for (let i = 0; i < 3; i++) {
      const rGeo = new THREE.RingGeometry(i * 0.13, (i + 1) * 0.13, 16);
      const rMat = new THREE.MeshBasicMaterial({ color: ringColors[i], side: THREE.DoubleSide });
      const r = new THREE.Mesh(rGeo, rMat);
      r.position.set(0, 1.34, 0);
      r.rotation.x = -Math.PI / 2;
      group.add(r);
    }

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 128, 48);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(labelMat);
    sprite.position.y = 2;
    sprite.scale.set(1.2, 0.5, 1);
    group.add(sprite);

    group.position.set(x, y, z);
    group.userData.label = label;
    group.userData.alive = true;
    this.scene.add(group);
    this.objects.push(group);
    this.targets.push(group);
  }

  _createTorches() {
    const positions = [
      [6, 0, 5], [-6, 0, 5], [6, 0, -5], [-6, 0, -5],
    ];
    for (const p of positions) {
      const group = new THREE.Group();

      const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6);
      const postMat = new THREE.MeshToonMaterial({ color: 0x4a3420 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.75;
      group.add(post);

      // Flame (animated in update)
      const flameGeo = new THREE.SphereGeometry(0.15, 8, 6);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.6;
      flame.scale.y = 1.5;
      flame.userData.isFlame = true;
      group.add(flame);

      // Point light for glow
      const light = new THREE.PointLight(0xff8c00, 0.5, 5);
      light.position.y = 1.6;
      group.add(light);

      group.position.set(...p);
      this.scene.add(group);
      this.objects.push(group);
    }
  }

  _createBanner(x, y, z, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 320, 64);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(3, 0.6, 1);
    this.scene.add(sprite);
    this.objects.push(sprite);
  }

  update(dt) {
    if (this.completed) return;

    Environment.updateClouds(this.clouds, dt);

    // Animate flames
    const t = performance.now() * 0.005;
    this.objects.forEach(obj => {
      if (obj.isGroup) {
        obj.traverse(child => {
          if (child.userData && child.userData.isFlame) {
            child.scale.y = 1.3 + Math.sin(t + child.id) * 0.4;
            child.scale.x = 0.9 + Math.sin(t * 1.3 + child.id) * 0.2;
          }
        });
      }
    });

    // Skill checks
    if (!this.skillsUsed.A && this.player.isAttacking) {
      this.skillsUsed.A = true;
      this._hitTarget('A');
      this.hud.setInstruction('✅ 무기 휘두르기! 이제 S키로 숨어보세요!');
    }

    if (!this.skillsUsed.S && this.skillsUsed.A && this.player.isHiding) {
      this.skillsUsed.S = true;
      this._hitTarget('S');
      this.hud.setInstruction('✅ 껍질 숨기! 이제 D키로 차기!');
    }

    if (!this.skillsUsed.D && this.skillsUsed.S && this.player.isAttacking) {
      this.skillsUsed.D = true;
      this._hitTarget('D');
      this.hud.setInstruction('✅ 모든 스킬 마스터! [F] 보스 전투로');
      this.completed = true;
    }
  }

  _hitTarget(label) {
    for (const target of this.targets) {
      if (target.userData.label === label && target.userData.alive) {
        target.userData.alive = false;
        Effects.burst(this.scene, target.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd700, 15, 4);
        Effects.shake(0.2, 0.15);
        // Animate target falling
        let elapsed = 0;
        const animate = () => {
          elapsed += 0.016;
          if (elapsed < 1) {
            target.rotation.z = elapsed * 2;
            target.position.y -= elapsed * 0.1;
            target.children.forEach(c => {
              if (c.material) { c.material.transparent = true; c.material.opacity = 1 - elapsed; }
            });
            requestAnimationFrame(animate);
          } else {
            this.scene.remove(target);
          }
        };
        animate();
        break;
      }
    }
  }

  cleanup() {
    this.objects.forEach(obj => this.scene.remove(obj));
    this.envObjects.forEach(obj => this.scene.remove(obj));
    this.objects = [];
    this.envObjects = [];
    this.targets = [];
    this.wallBodies.forEach(b => Physics.removeBody(b));
    this.wallBodies = [];
    if (this.groundBody) Physics.removeBody(this.groundBody);
  }
}
