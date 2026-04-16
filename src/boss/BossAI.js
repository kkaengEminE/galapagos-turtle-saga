// BossAI.js – State machine: Phase1 → Phase2 (50%) → Ultimate (10%, 1 time)
// Phase2: color+aura+30% attack speed. Ultimate: water cannon, dodgeable with Shift.
import * as THREE from 'three';
import { Effects } from '../utils/Effects.js';

const BASE_COOLDOWN = 2.5;       // seconds between attacks in phase 1
const PHASE2_COOLDOWN_MULT = 0.7; // 30% faster
const ULTIMATE_HP_THRESHOLD = 0.10;
const HITS_TO_WIN = 5;

export class BossAI {
  constructor(hippo, player, scene) {
    this.hippo = hippo;
    this.player = player;
    this.scene = scene;
    this.lastAttackTime = 0;
    this.waterCannonActive = false;
    this.waterCannonTimer = 0;
    this.moveTimer = 0;
    this.onVictory = null;
    this.onPlayerHit = null;
    this._victoryFired = false;
  }

  get isDefeated() { return this.hippo.hitCount >= HITS_TO_WIN || !this.hippo.isAlive; }

  _cooldown() {
    return this.hippo.phase === 2 ? BASE_COOLDOWN * PHASE2_COOLDOWN_MULT : BASE_COOLDOWN;
  }

  update(dt) {
    if (!this.hippo.isAlive || this._victoryFired) return;
    if (this.hippo.isStunned) return; // boss stunned = skip

    const now = performance.now() / 1000;
    const hpRatio = this.hippo.hp / this.hippo.maxHp;

    // ── Check player attack → hitbox ──
    this._checkPlayerAttack();

    // ── Victory ──
    if (this.isDefeated) {
      if (!this._victoryFired) { this._victoryFired = true; if (this.onVictory) this.onVictory(); }
      return;
    }

    // ── Ultimate at 10% HP (one-time) ──
    if (hpRatio <= ULTIMATE_HP_THRESHOLD && !this.hippo.ultimateUsed) {
      this.hippo.ultimateUsed = true;
      this._fireUltimate();
      return;
    }

    // ── Water cannon active ──
    if (this.waterCannonActive) {
      this.waterCannonTimer -= dt;
      // Damage player if in range and NOT dodging (i-frames)
      const dist = this.player.group.position.distanceTo(this.hippo.group.position);
      if (dist < 6 && this.player._damageCooldown <= 0 && !this.player.isHiding) {
        this.player.takeDamage(2);
        if (this.onPlayerHit) this.onPlayerHit();
      }
      if (this.waterCannonTimer <= 0) this.waterCannonActive = false;
      return;
    }

    // ── Normal attacks ──
    if (now - this.lastAttackTime > this._cooldown()) {
      this._attack();
      this.lastAttackTime = now;
    }

    // ── Movement (sway) ──
    this.moveTimer += dt;
    const swayMult = this.hippo.phase === 2 ? 1.5 : 1;
    this.hippo.group.position.x += Math.sin(this.moveTimer * swayMult) * dt * 0.4;
  }

  _attack() {
    const roll = Math.random();
    if (roll < 0.6) {
      // Water spit at player
      this.hippo.createWaterSpitEffect(this.scene, this.player.group.position.clone());
      // Boss heals a little from water attack
      this.hippo.healHp(5);
    } else {
      // Eat seaweed heal (interruptible)
      this.hippo.isEating = true;
      this.hippo.healHp(15);
      setTimeout(() => { this.hippo.isEating = false; }, 1000);
    }
  }

  _fireUltimate() {
    this.waterCannonActive = true;
    this.waterCannonTimer = 2.0;
    this.hippo.createWaterCannonEffect(this.scene);
    Effects.shake(0.6, 0.4);
  }

  _checkPlayerAttack() {
    if (!this.player.isAlive || !this.hippo.isAlive) return;
    if (!this.player.isAttacking) return;

    // Hitbox: check distance + angle (player must be roughly facing boss)
    const dist = this.player.group.position.distanceTo(this.hippo.group.position);
    if (dist > 3.5) return;

    // Direction check (player forward vs boss direction)
    const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.group.quaternion);
    const toTarget = this.hippo.group.position.clone().sub(this.player.group.position).normalize();
    const dot = playerFwd.dot(toTarget);
    if (dot < 0.3) return; // must be roughly facing

    this.hippo.receiveDamage(40);
    this.player.isAttacking = false;

    // Stun boss briefly
    this.hippo.isStunned = true;
    this.hippo.stunTimer = 0.3;

    if (this.isDefeated && !this._victoryFired) {
      this._victoryFired = true;
      if (this.onVictory) this.onVictory();
    }
  }

  cleanup() {}
}
