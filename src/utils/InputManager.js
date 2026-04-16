// InputManager.js - Keyboard input handling
const keys = {
  move: { x: 0, y: 0 },
  jump: false,
  shift: false,
  useSkill: null,
  restart: false,
  nextStage: false,
};

const pressed = new Set();

function onKeyDown(e) {
  if (pressed.has(e.code)) return;
  pressed.add(e.code);

  switch (e.code) {
    case 'ArrowLeft':  keys.move.x = -1; break;
    case 'ArrowRight': keys.move.x = 1;  break;
    case 'ArrowUp':    keys.move.y = -1; break;
    case 'ArrowDown':  keys.move.y = 1;  break;
    case 'Space':      keys.jump = true;  break;
    case 'ShiftLeft':
    case 'ShiftRight': keys.shift = true; break;
    case 'KeyA':       keys.useSkill = 'A'; break;
    case 'KeyS':       keys.useSkill = 'S'; break;
    case 'KeyD':       keys.useSkill = 'D'; break;
    case 'KeyR':       keys.restart = true; break;
    case 'KeyF':       keys.nextStage = true; break;
  }
}

function onKeyUp(e) {
  pressed.delete(e.code);

  switch (e.code) {
    case 'ArrowLeft':  if (keys.move.x === -1) keys.move.x = 0; break;
    case 'ArrowRight': if (keys.move.x === 1)  keys.move.x = 0; break;
    case 'ArrowUp':    if (keys.move.y === -1) keys.move.y = 0; break;
    case 'ArrowDown':  if (keys.move.y === 1)  keys.move.y = 0; break;
    case 'Space':      keys.jump = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': keys.shift = false; break;
    case 'KeyA':
    case 'KeyS':
    case 'KeyD':       if (!pressed.has('KeyA') && !pressed.has('KeyS') && !pressed.has('KeyD')) keys.useSkill = null; break;
    case 'KeyR':       keys.restart = false; break;
    case 'KeyF':       keys.nextStage = false; break;
  }
}

export const InputManager = {
  keys,
  init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  },
  destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  },
  consumeJump() {
    const val = keys.jump;
    keys.jump = false;
    return val;
  },
  consumeSkill() {
    const val = keys.useSkill;
    keys.useSkill = null;
    return val;
  },
  reset() {
    keys.move.x = 0;
    keys.move.y = 0;
    keys.jump = false;
    keys.shift = false;
    keys.useSkill = null;
    keys.restart = false;
    keys.nextStage = false;
    pressed.clear();
  },
};
