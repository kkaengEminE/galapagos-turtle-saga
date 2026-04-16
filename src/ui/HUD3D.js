// HUD3D.js – 3D Sprite-based tutorial checkboxes that float in world space
import * as THREE from 'three';

const CHECK_ITEMS = [
  { id: 'move', label: '☐ 이동 (방향키)', checked: false },
  { id: 'jump', label: '☐ 점프 (Space)', checked: false },
  { id: 'combat', label: '☐ 전투 (A/S/D)', checked: false },
];

export class HUD3D {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.sprites = [];
    this.group = new THREE.Group();
  }

  init(world) {
    // Position near the start area, visible to player
    this.group.position.set(3, 2.5, -1);
    this.scene.add(this.group);

    for (let i = 0; i < CHECK_ITEMS.length; i++) {
      const item = CHECK_ITEMS[i];
      const sprite = this._makeSprite(item.label, false);
      sprite.position.set(0, -i * 0.5, 0);
      sprite.userData = { ...item, index: i };
      this.group.add(sprite);
      this.sprites.push(sprite);
    }
  }

  _makeSprite(text, checked) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 64);
    ctx.fillStyle = checked ? 'rgba(40,120,60,0.8)' : 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = checked ? '#90ee90' : '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 16, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 0.4, 1);
    return sprite;
  }

  checkOff(id) {
    for (const sprite of this.sprites) {
      if (sprite.userData.id === id && !sprite.userData.checked) {
        sprite.userData.checked = true;
        // Update texture
        const newLabel = sprite.userData.label.replace('☐', '☑');
        sprite.userData.label = newLabel;
        const newSprite = this._makeSprite(newLabel, true);
        // Copy canvas to existing sprite
        sprite.material.map.dispose();
        sprite.material.map = newSprite.material.map;
        sprite.material.needsUpdate = true;
      }
    }
  }

  allChecked() {
    return this.sprites.every(s => s.userData.checked);
  }

  update(dt) {
    // Billboard: make sprites face camera
    if (this.group) {
      this.group.quaternion.copy(this.camera.quaternion);
    }
    // Gentle bob
    this.group.position.y = 2.5 + Math.sin(performance.now() * 0.002) * 0.1;
  }
}
