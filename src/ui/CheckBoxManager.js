// CheckBoxManager.js - Skill UI with dat.GUI
import { GUI } from 'dat.gui';

export class CheckBoxManager {
  constructor() {
    this.gui = null;
    this.skillPanel = null;
    this.params = {
      'A (무기 휘두르기)': false,
      'S (껍질 숨기)': false,
      'D (앞발 차기)': false,
      'Shift (회피)': false,
    };
    this.controllers = {};
  }

  init() {
    this.gui = new GUI({ autoPlace: false, width: 180 });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '10px';
    this.gui.domElement.style.right = '10px';
    this.gui.domElement.style.zIndex = '30';
    document.body.appendChild(this.gui.domElement);

    const folder = this.gui.addFolder('스킬 키');
    folder.open();

    this.controllers['A'] = folder.add(this.params, 'A (무기 휘두르기)').listen();
    this.controllers['S'] = folder.add(this.params, 'S (껍질 숨기)').listen();
    this.controllers['D'] = folder.add(this.params, 'D (앞발 차기)').listen();
    this.controllers['Shift'] = folder.add(this.params, 'Shift (회피)').listen();

    // Skill panel text
    this.skillPanel = document.createElement('div');
    this.skillPanel.style.cssText = `
      position: absolute; top: 160px; right: 10px;
      background: rgba(0,0,0,0.6); color: #f0e68c;
      padding: 6px 12px; border-radius: 6px;
      font-size: 14px; z-index: 30;
    `;
    document.body.appendChild(this.skillPanel);
    this.skillPanel.textContent = '';
  }

  setKey(key) {
    // Reset all
    this.params['A (무기 휘두르기)'] = false;
    this.params['S (껍질 숨기)'] = false;
    this.params['D (앞발 차기)'] = false;
    this.params['Shift (회피)'] = false;

    const k = key.toLowerCase();
    if (k === 'a') {
      this.params['A (무기 휘두르기)'] = true;
      this.skillPanel.textContent = '🗡️ 무기 휘두르기!';
    } else if (k === 's') {
      this.params['S (껍질 숨기)'] = true;
      this.skillPanel.textContent = '🛡️ 껍질 안에 숨기!';
    } else if (k === 'd') {
      this.params['D (앞발 차기)'] = true;
      this.skillPanel.textContent = '🦶 앞발 차기!';
    } else if (k === 'shift') {
      this.params['Shift (회피)'] = true;
      this.skillPanel.textContent = '💨 회피!';
    } else {
      this.skillPanel.textContent = '';
    }

    // Auto-clear after 0.5s
    clearTimeout(this._clearTimer);
    this._clearTimer = setTimeout(() => {
      this.params['A (무기 휘두르기)'] = false;
      this.params['S (껍질 숨기)'] = false;
      this.params['D (앞발 차기)'] = false;
      this.params['Shift (회피)'] = false;
      this.skillPanel.textContent = '';
    }, 500);
  }

  show() {
    if (this.gui) this.gui.domElement.style.display = '';
    if (this.skillPanel) this.skillPanel.style.display = '';
  }

  hide() {
    if (this.gui) this.gui.domElement.style.display = 'none';
    if (this.skillPanel) this.skillPanel.style.display = 'none';
  }

  destroy() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
    if (this.skillPanel && this.skillPanel.parentNode) {
      this.skillPanel.parentNode.removeChild(this.skillPanel);
    }
  }
}
