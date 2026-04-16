// Player.js – Cute turtle (size ~1 unit) with stun system
import * as THREE from 'three';
import { Physics } from '../physics.js';
import { Effects } from '../utils/Effects.js';

const STUN_DURATION = 0.2; // seconds

export class Player {
  constructor() {
    this.hp = 5;
    this.maxHp = 5;
    this.isAlive = true;
    this.isHiding = false;   // S key guard
    this.isAttacking = false;
    this.attackTimer = 0;
    this.hideTimer = 0;
    this.isStunned = false;
    this.stunTimer = 0;
    this.mesh = null;
    this.body = null;
    this.group = new THREE.Group();
    this.weapon = null;
    this.legs = [];
    this.headGroup = null;
    this.shell = null;
    this.shadow = null;
    this.onGround = false;
    this.wasOnGround = true;
    this.state = 'idle';
    this._scene = null;
    this._damageCooldown = 0;
  }

  create(scene) {
    this._scene = scene;
    while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
    this.legs = [];

    // ── Shell ──
    const shellGroup = new THREE.Group();
    const shellGeo = new THREE.SphereGeometry(0.55, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const shellBase = new THREE.Mesh(shellGeo, new THREE.MeshToonMaterial({ color: 0x5a7d4a }));
    shellBase.scale.set(1.1, 0.65, 0.9);
    shellGroup.add(shellBase);

    // Shell patches
    const patchMat = new THREE.MeshToonMaterial({ color: 0x3d5a2e });
    for (const p of [[0, 0.3, 0], [-0.25, 0.22, 0.18], [0.25, 0.22, 0.18], [0, 0.18, -0.2]]) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), patchMat);
      patch.position.set(...p);
      patch.lookAt(0, 2, 0);
      shellGroup.add(patch);
    }

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.05, 8, 20),
      new THREE.MeshToonMaterial({ color: 0x8b7d3c })
    );
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.06; rim.scale.set(1.1, 0.9, 1);
    shellGroup.add(rim);
    shellGroup.position.y = 0.3;
    this.group.add(shellGroup);
    this.shell = shellGroup;

    // ── Belly ──
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      new THREE.MeshToonMaterial({ color: 0xd4c89a })
    );
    belly.scale.set(1.05, 0.4, 0.85); belly.position.y = 0.18;
    this.group.add(belly);

    // ── Head ──
    this.headGroup = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 14, 12),
      new THREE.MeshToonMaterial({ color: 0x7ab368 })
    );
    this.headGroup.add(head);

    // Cheeks
    const cheekMat = new THREE.MeshToonMaterial({ color: 0xf0a0a0, transparent: true, opacity: 0.5 });
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), cheekMat);
      c.position.set(s * 0.17, -0.04, 0.17);
      this.headGroup.add(c);
    }

    // Eyes
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      w.position.set(s * 0.11, 0.05, 0.2);
      this.headGroup.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
      p.position.set(s * 0.11, 0.05, 0.25);
      this.headGroup.add(p);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sh.position.set(s * 0.09, 0.07, 0.27);
      this.headGroup.add(sh);
    }

    // Smile
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.06, -0.08, 0.23), new THREE.Vector3(0, -0.11, 0.25), new THREE.Vector3(0.06, -0.08, 0.23)
    );
    this.headGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 8, 0.01, 4, false),
      new THREE.MeshBasicMaterial({ color: 0x3d2e1a })
    ));

    this.headGroup.position.set(0, 0.45, 0.42);
    this.group.add(this.headGroup);

    // ── Legs ──
    const legGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const legMat = new THREE.MeshToonMaterial({ color: 0x7ab368 });
    for (const p of [[-0.32, 0.08, 0.28], [0.32, 0.08, 0.28], [-0.32, 0.08, -0.24], [0.32, 0.08, -0.24]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(...p); leg.scale.set(1, 0.7, 1.2);
      this.group.add(leg); this.legs.push(leg);
    }

    // Tail
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.15, 4),
      new THREE.MeshToonMaterial({ color: 0x7ab368 })
    );
    tail.position.set(0, 0.18, -0.5); tail.rotation.x = 0.5;
    this.group.add(tail);

    // ── Weapon (stick+leaf) ──
    this.weapon = new THREE.Group();
    this.weapon.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.75, 6),
      new THREE.MeshToonMaterial({ color: 0x6b3a1f })
    ));
    this.weapon.children[0].position.y = 0.37;
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6),
        new THREE.MeshToonMaterial({ color: [0x52b788, 0x40916c, 0x74c69d][i] })
      );
      l.position.set(Math.cos(i * 2.1) * 0.06, 0.75 + i * 0.04, Math.sin(i * 2.1) * 0.06);
      l.scale.y = 0.6;
      this.weapon.add(l);
    }
    this.weapon.position.set(0.4, 0.22, 0.2); this.weapon.rotation.z = -0.4;
    this.group.add(this.weapon);

    // Shadow
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.02;
    this.group.add(this.shadow);

    this.mesh = this.group;
    scene.add(this.group);

    // Physics (size ≈ 1 unit)
    this.body = Physics.createBox({ x: 0.4, y: 0.35, z: 0.4 }, { x: 0, y: 1, z: 0 }, 1);
    this.body.linearDamping = 0.5;
    this.body.angularDamping = 1.0;
    this.body.fixedRotation = true;
    return this;
  }

  takeDamage(amount = 1) {
    if (this.isHiding || !this.isAlive || this._damageCooldown > 0) return;
    if (this.isHiding) return; // guard = 0 damage (EARS rule)
    this.hp -= amount;
    this._damageCooldown = 0.5;

    // Stun (0.2s)
    this.isStunned = true;
    this.stunTimer = STUN_DURATION;

    this._flashColor(0xff0000, 0.15);
    if (this._scene) {
      Effects.burst(this._scene, this.group.position, 0xff4444, 8, 2, 0.08, 0.4);
      Effects.shake(0.3, 0.15);
    }
    if (this.hp <= 0) { this.hp = 0; this.isAlive = false; }
  }

  heal(amount = 1) { this.hp = Math.min(this.hp + amount, this.maxHp); }

  swing() {
    if (this.isAttacking || this.isStunned || this.isHiding) return;
    this.isAttacking = true; this.attackTimer = 0.35; this.state = 'attacking';
    if (this._scene) Effects.sparkle(this._scene, this.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xffd700, 4);
  }

  kick() {
    if (this.isAttacking || this.isStunned || this.isHiding) return;
    this.isAttacking = true; this.attackTimer = 0.3; this.state = 'attacking';
    if (this._scene) Effects.burst(this._scene, this.group.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xff9944, 5, 2, 0.05, 0.3);
  }

  hide() {
    if (this.isHiding || this.isStunned) return;
    this.isHiding = true; this.hideTimer = 0.8; this.state = 'defending';
    this.group.scale.set(1.1, 0.35, 1.1);
    if (this.headGroup) this.headGroup.visible = false;
    this.legs.forEach(l => l.visible = false);
    if (this.weapon) this.weapon.visible = false;
    if (this._scene) Effects.dust(this._scene, this.group.position);
  }

  _flashColor(color, dur) {
    const mats = [];
    this.group.traverse(c => {
      if (c.isMesh && c.material && c.material.color) {
        mats.push({ mat: c.material, orig: c.material.color.getHex() });
        c.material.color.setHex(color);
      }
    });
    setTimeout(() => mats.forEach(m => m.mat.color.setHex(m.orig)), dur * 1000);
  }

  update(dt) {
    if (!this.body || !this.mesh) return;
    this._damageCooldown = Math.max(0, this._damageCooldown - dt);

    // Stun
    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.isStunned = false;
    }

    this.group.position.copy(this.body.position);

    // Landing dust
    if (!this.wasOnGround && this.onGround && this._scene) Effects.dust(this._scene, this.group.position);
    this.wasOnGround = this.onGround;

    // Attack anim
    if (this.isAttacking && this.weapon) {
      this.attackTimer -= dt;
      const t = this.attackTimer / 0.35;
      this.weapon.rotation.z = -0.4 + Math.sin((1 - t) * Math.PI) * -1.5;
      if (this.attackTimer <= 0) {
        this.isAttacking = false; this.weapon.rotation.z = -0.4; this.state = 'idle';
      }
    }

    // Hide anim
    if (this.isHiding) {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) {
        this.isHiding = false; this.group.scale.set(1, 1, 1);
        if (this.headGroup) this.headGroup.visible = true;
        this.legs.forEach(l => l.visible = true);
        if (this.weapon) this.weapon.visible = true;
        this.state = 'idle';
      }
    }

    // Idle bob
    if (this.state === 'idle' && this.onGround) {
      this.group.position.y += Math.sin(performance.now() * 0.003) * 0.015;
    }

    // Legs
    const speed = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.z);
    if (speed > 0.5 && this.legs.length > 0) {
      const tm = performance.now() * 0.012;
      this.legs[0].position.y = 0.08 + Math.sin(tm) * 0.05;
      this.legs[1].position.y = 0.08 + Math.cos(tm) * 0.05;
      this.legs[2].position.y = 0.08 + Math.cos(tm) * 0.05;
      this.legs[3].position.y = 0.08 + Math.sin(tm) * 0.05;
    }

    if (!this.isAttacking && this.weapon) this.weapon.rotation.z = -0.4 + Math.sin(performance.now() * 0.002) * 0.08;
    this.onGround = this.body.position.y < 1.1;
    if (this.shadow) this.shadow.position.y = -this.group.position.y + 0.02;
  }

  setPosition(x, y, z) {
    if (this.body) { this.body.position.set(x, y, z); this.body.velocity.set(0, 0, 0); }
    if (this.group) this.group.position.set(x, y, z);
  }

  resetState() {
    this.hp = this.maxHp; this.isAlive = true; this.isHiding = false;
    this.isAttacking = false; this.isStunned = false; this.stunTimer = 0;
    this.state = 'idle'; this._damageCooldown = 0;
    this.group.scale.set(1, 1, 1);
    if (this.headGroup) this.headGroup.visible = true;
    this.legs.forEach(l => l.visible = true);
    if (this.weapon) { this.weapon.visible = true; this.weapon.rotation.z = -0.4; }
  }
}
