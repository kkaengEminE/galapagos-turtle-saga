// HUD.js - Polished HP bars, stage display, instruction overlay
export class HUD {
  constructor() {
    this.container = null;
    this.playerHpFill = null;
    this.playerHpText = null;
    this.bossHpContainer = null;
    this.bossHpFill = null;
    this.bossHpText = null;
    this.stageLabel = null;
    this.instructionLabel = null;
  }

  init() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute; top: 12px; left: 12px;
      z-index: 30; pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Stage label
    this.stageLabel = document.createElement('div');
    this.stageLabel.style.cssText = `
      color: #f0e68c; font-size: 15px; font-weight: bold;
      margin-bottom: 10px;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
      letter-spacing: 0.5px;
    `;
    this.container.appendChild(this.stageLabel);

    // Player HP
    this._createHpRow(
      this.container,
      '🐢',
      { barWidth: 160, height: 12, gradientFrom: '#52b788', gradientTo: '#95d5b2' },
      (fill, text) => { this.playerHpFill = fill; this.playerHpText = text; }
    );

    // Boss HP (hidden by default)
    this.bossHpContainer = document.createElement('div');
    this.bossHpContainer.style.cssText = 'display: none; margin-top: 6px;';
    this.container.appendChild(this.bossHpContainer);

    this._createHpRow(
      this.bossHpContainer,
      '🦛',
      { barWidth: 220, height: 14, gradientFrom: '#cc2244', gradientTo: '#ff6b6b' },
      (fill, text) => { this.bossHpFill = fill; this.bossHpText = text; }
    );

    // Instruction label (bottom center, bigger & clearer)
    this.instructionLabel = document.createElement('div');
    this.instructionLabel.style.cssText = `
      position: absolute; bottom: 36px; left: 50%;
      transform: translateX(-50%);
      color: #fff; font-size: 17px; text-align: center;
      font-weight: 600; letter-spacing: 0.3px;
      text-shadow: 0 2px 6px rgba(0,0,0,0.9);
      z-index: 30; pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.4));
      padding: 10px 28px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(4px);
      max-width: 90vw;
      white-space: nowrap;
    `;
    document.body.appendChild(this.instructionLabel);
  }

  _createHpRow(parent, icon, opts, cb) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 6px;';

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '16px';
    row.appendChild(iconEl);

    const bar = document.createElement('div');
    bar.style.cssText = `
      width: ${opts.barWidth}px; height: ${opts.height}px;
      background: rgba(0,0,0,0.5);
      border-radius: ${opts.height}px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 100%; height: 100%;
      background: linear-gradient(90deg, ${opts.gradientFrom}, ${opts.gradientTo});
      border-radius: ${opts.height}px;
      transition: width 0.3s ease;
      box-shadow: 0 0 6px ${opts.gradientFrom}55;
    `;
    bar.appendChild(fill);
    row.appendChild(bar);

    const text = document.createElement('span');
    text.style.cssText = 'color: #ccc; font-size: 11px; min-width: 40px;';
    text.textContent = '';
    row.appendChild(text);

    parent.appendChild(row);
    cb(fill, text);
  }

  setStage(name) {
    if (this.stageLabel) this.stageLabel.textContent = name;
  }

  setInstruction(text) {
    if (this.instructionLabel) {
      this.instructionLabel.textContent = text;
      this.instructionLabel.style.display = text ? '' : 'none';
    }
  }

  updatePlayerHp(current, max) {
    if (this.playerHpFill) {
      const pct = Math.max(0, (current / max) * 100);
      this.playerHpFill.style.width = pct + '%';
    }
    if (this.playerHpText) {
      this.playerHpText.textContent = `${Math.max(0, current)}/${max}`;
    }
  }

  showBossHp(show = true) {
    if (this.bossHpContainer) {
      this.bossHpContainer.style.display = show ? '' : 'none';
    }
  }

  updateBossHp(current, max) {
    if (this.bossHpFill) {
      const pct = Math.max(0, (current / max) * 100);
      this.bossHpFill.style.width = pct + '%';
    }
    if (this.bossHpText) {
      this.bossHpText.textContent = `${Math.max(0, Math.round(current))}/${max}`;
    }
  }

  show() {
    if (this.container) this.container.style.display = '';
    if (this.instructionLabel) this.instructionLabel.style.display = '';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
    if (this.instructionLabel) this.instructionLabel.style.display = 'none';
  }

  destroy() {
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    if (this.instructionLabel && this.instructionLabel.parentNode) this.instructionLabel.parentNode.removeChild(this.instructionLabel);
  }
}
