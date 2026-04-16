// PlayerController.js – Input → Player action, with stun check
import { InputManager } from '../utils/InputManager.js';
import * as CANNON from 'cannon-es';

const MOVE_SPEED = 5;
const JUMP_FORCE = 6;
const DODGE_FORCE = 5;
const DODGE_IFRAME = 0.3; // invincibility frames during dodge

export class PlayerController {
  constructor(player) {
    this.player = player;
    this.enabled = true;
    this.canJump = true;
    this.canUseSkills = false;
    this.dodgeCooldown = 0;
  }

  enableSkills(val = true) { this.canUseSkills = val; }

  update(dt) {
    if (!this.enabled || !this.player.isAlive) return;
    // Stunned → ignore all input
    if (this.player.isStunned) return;

    const { keys } = InputManager;
    const body = this.player.body;
    if (!body) return;

    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    // Movement
    const vx = keys.move.x * MOVE_SPEED;
    const vz = keys.move.y * MOVE_SPEED;
    body.velocity.x = vx;
    body.velocity.z = vz;

    // Face direction
    if (vx !== 0 || vz !== 0) {
      this.player.group.rotation.y = Math.atan2(vx, vz);
    }

    // Jump
    if (keys.jump && this.player.onGround && this.canJump) {
      body.velocity.y = JUMP_FORCE;
      keys.jump = false;
    }

    // Dodge (Shift) – has i-frames for boss ultimate
    if (keys.shift && this.canUseSkills && this.dodgeCooldown <= 0) {
      const angle = this.player.group.rotation.y;
      body.velocity.x = -Math.sin(angle) * DODGE_FORCE;
      body.velocity.z = -Math.cos(angle) * DODGE_FORCE;
      this.dodgeCooldown = 0.6;
      // Brief invincibility
      this.player._damageCooldown = DODGE_IFRAME;
      keys.shift = false;
    }

    // Skills
    if (this.canUseSkills && keys.useSkill) {
      const skill = keys.useSkill;
      switch (skill) {
        case 'A': this.player.swing(); break;
        case 'S': this.player.hide(); break;
        case 'D':
          this.player.kick();
          const kickDir = new CANNON.Vec3(
            Math.sin(this.player.group.rotation.y) * 2.5,
            0,
            Math.cos(this.player.group.rotation.y) * 2.5
          );
          body.applyImpulse(kickDir);
          break;
      }
      keys.useSkill = null;
    }
  }
}
