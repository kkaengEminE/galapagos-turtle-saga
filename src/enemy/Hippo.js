// Hippo.js – Boss hippo with scale parameter + phase visuals
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Effects } from '../utils/Effects.js';

export class Hippo {
  constructor() {
    this.hp = 200; this.maxHp = 200; this.hitCount = 0;
    this.isAlive = true; this.isStunned = false; this.stunTimer = 0;
    this.isEating = false; // eating seaweed (interruptible)
    this.group = new THREE.Group(); this.body = null;
    this.eyes = []; this.mouth = null; this.legs = [];
    this.aura = null; this._scene = null;
    this.phase = 1; // 1, 2
    this.ultimateUsed = false;
  }

  create(scene, pos = { x: 0, y: 1, z: -63 }, scale = 5) {
    this._scene = scene;
    const S = scale;

    // Body
    const bodyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 * S, 16, 12),
      new THREE.MeshToonMaterial({ color: 0x8a7090 })
    );
    bodyMesh.scale.set(1.3, 0.85, 1); bodyMesh.position.y = 0.16 * S;
    this.group.add(bodyMesh);

    // Belly
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 * S, 14, 10),
      new THREE.MeshToonMaterial({ color: 0xc0a8c8 })
    );
    belly.scale.set(1.1, 0.6, 0.85); belly.position.set(0, 0.08 * S, 0.04 * S);
    this.group.add(belly);

    // Head
    const headG = new THREE.Group();
    headG.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.16 * S, 12, 10),
      new THREE.MeshToonMaterial({ color: 0x9a8098 })
    ));
    headG.children[0].scale.set(1.1, 0.9, 1);

    // Snout
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(0.11 * S, 10, 8),
      new THREE.MeshToonMaterial({ color: 0xc8a8d0 })
    );
    snout.scale.set(1.2, 0.7, 0.9); snout.position.set(0, -0.04 * S, 0.1 * S);
    headG.add(snout);

    // Nostrils
    for (const s of [-1, 1]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.02 * S), new THREE.MeshToonMaterial({ color: 0x4a3850 }));
      n.position.set(s * 0.04 * S, -0.02 * S, 0.18 * S);
      headG.add(n);
    }

    // Eyes
    for (const s of [-1, 1]) {
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ew.position.set(s * 0.08 * S, 0.04 * S, 0.11 * S);
      headG.add(ew);
      const ep = new THREE.Mesh(new THREE.SphereGeometry(0.018 * S), new THREE.MeshBasicMaterial({ color: 0xcc0000 }));
      ep.position.set(s * 0.08 * S, 0.04 * S, 0.13 * S);
      headG.add(ep);
      this.eyes.push(ep);
      // Brow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, 0.01 * S, 0.01 * S), new THREE.MeshToonMaterial({ color: 0x4a3850 }));
      brow.position.set(s * 0.08 * S, 0.07 * S, 0.12 * S);
      brow.rotation.z = s * -0.3;
      headG.add(brow);
    }

    // Mouth + teeth
    this.mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * S, 0.015 * S, 0.02 * S),
      new THREE.MeshToonMaterial({ color: 0x4a3850 })
    );
    this.mouth.position.set(0, -0.07 * S, 0.14 * S);
    headG.add(this.mouth);
    for (const s of [-1, 1]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.015 * S, 0.03 * S, 0.01 * S), new THREE.MeshToonMaterial({ color: 0xfffff0 }));
      tooth.position.set(s * 0.04 * S, -0.08 * S, 0.14 * S);
      headG.add(tooth);
    }

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 8, 6), new THREE.MeshToonMaterial({ color: 0x8a7090 }));
      ear.position.set(s * 0.12 * S, 0.1 * S, 0); ear.scale.y = 1.3;
      headG.add(ear);
    }

    headG.position.set(0, 0.26 * S, 0.14 * S);
    this.group.add(headG);
    this.headGroup = headG;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.05 * S, 0.06 * S, 0.14 * S, 8);
    const legMat = new THREE.MeshToonMaterial({ color: 0x7a6080 });
    for (const p of [[-0.14, 0.07, 0.1], [0.14, 0.07, 0.1], [-0.14, 0.07, -0.1], [0.14, 0.07, -0.1]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0] * S, p[1] * S, p[2] * S);
      this.group.add(leg); this.legs.push(leg);
    }

    // Aura (invisible, enabled in phase 2)
    const auraGeo = new THREE.SphereGeometry(0.3 * S, 16, 12);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0, side: THREE.BackSide });
    this.aura = new THREE.Mesh(auraGeo, auraMat);
    this.aura.position.y = 0.15 * S;
    this.group.add(this.aura);

    // Shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22 * S, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
    );
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -pos.y + 0.02;
    this.group.add(shadow);

    this.group.position.set(pos.x, pos.y, pos.z);
    this.mesh = this.group;
    scene.add(this.group);

    this.body = Physics.createBox(
      { x: 0.25 * S, y: 0.18 * S, z: 0.2 * S },
      pos, 0
    );
    return this;
  }

  receiveDamage(dmg = 40) {
    if (!this.isAlive) return;
    this.hp -= dmg; this.hitCount++;

    // Interrupt eating
    if (this.isEating) { this.isEating = false; this.isStunned = true; this.stunTimer = 0.5; }

    this._flash(0xff0000, 0.15);
    if (this._scene) {
      Effects.burst(this._scene, this.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xff4444, 15, 4, 0.2);
      Effects.damageNumber(this._scene, this.group.position.clone().add(new THREE.Vector3(0, 3.5, 0)), `-${dmg}`, 0xff4444);
      Effects.shake(0.4, 0.2);
    }

    // Knockback
    const origZ = this.group.position.z;
    this.group.position.z -= 0.3;
    setTimeout(() => { if (this.group) this.group.position.z = origZ; }, 150);

    // Phase check
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) this._enterPhase2();
    if (this.hp <= 0) { this.hp = 0; this.isAlive = false; }
  }

  _enterPhase2() {
    this.phase = 2;
    // Color shift to red
    this.group.traverse(c => {
      if (c.isMesh && c.material && c.material.color && c !== this.aura) {
        const col = c.material.color;
        col.r = Math.min(1, col.r + 0.3);
        col.g *= 0.7; col.b *= 0.7;
      }
    });
    // Enable aura
    if (this.aura) this.aura.material.opacity = 0.15;
    if (this._scene) Effects.burst(this._scene, this.group.position.clone(), 0xff2222, 20, 5, 0.2, 1);
  }

  healHp(amount = 10) {
    if (!this.isAlive) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    if (this._scene) Effects.sparkle(this._scene, this.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x52b788, 3);
  }

  _flash(color, dur) {
    const mats = [];
    this.group.traverse(c => {
      if (c.isMesh && c.material && c.material.color) {
        mats.push({ mat: c.material, orig: c.material.color.getHex() });
        c.material.color.setHex(color);
      }
    });
    setTimeout(() => mats.forEach(m => m.mat.color.setHex(m.orig)), dur * 1000);
  }

  createWaterSpitEffect(scene, targetPos) {
    const start = this.group.position.clone().add(new THREE.Vector3(0, 2, 1.5));
    const end = targetPos.clone(); end.y += 0.5;
    const mid = start.clone().lerp(end, 0.5); mid.y += 2;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, 0.1, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.8 })
    );
    scene.add(tube);
    Effects.burst(scene, end, 0x4cc9f0, 10, 3, 0.12, 0.5);
    setTimeout(() => scene.remove(tube), 400);
    if (this.mouth) { this.mouth.scale.y = 3; setTimeout(() => { if (this.mouth) this.mouth.scale.y = 1; }, 300); }
  }

  createWaterCannonEffect(scene) {
    // Big expanding water ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.5, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.5 })
    );
    ring.position.copy(this.group.position); ring.position.y = 0.5; ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    let t = 0;
    const anim = () => {
      t += 0.016; ring.scale.multiplyScalar(1.04); ring.material.opacity -= 0.008;
      if (t < 2) requestAnimationFrame(anim); else scene.remove(ring);
    };
    anim();

    // Column
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 4, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    col.position.copy(this.group.position); col.position.y = 3;
    scene.add(col);
    setTimeout(() => scene.remove(col), 2000);
  }

  update(dt) {
    if (!this.group) return;
    if (this.isStunned) { this.stunTimer -= dt; if (this.stunTimer <= 0) this.isStunned = false; }
    const t = performance.now() * 0.002;
    this.group.scale.y = 1 + Math.sin(t) * 0.02;
    for (const e of this.eyes) e.position.z += Math.sin(t * 3) * 0.001;
    if (this.aura && this.phase === 2) this.aura.material.opacity = 0.1 + Math.sin(t * 2) * 0.05;
  }

  destroy(scene) {
    if (this.mesh) scene.remove(this.mesh);
    if (this.body) Physics.removeBody(this.body);
  }
}
