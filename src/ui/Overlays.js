// Small UI bits: toasts, the controls/help panel, and the fast-travel fader.
export class Toasts {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'toasts';
    root.appendChild(this.el);
  }

  show(html, ms = 3200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    this.el.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }
}

export class Help {
  constructor(root) {
    this.root = root;
    this.el = null;
  }

  get isOpen() {
    return !!this.el;
  }

  open() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <div class="panel help-panel">
        <button class="close-btn" type="button" aria-label="Close">✕</button>
        <h2>How to explore</h2>
        <div class="keys">
          <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><div>Walk around (or arrow keys). Hold <kbd>Shift</kbd> to run.</div>
          <div><kbd>F</kbd></div><div>Get in or out of your rickshaw</div>
          <div><kbd>R</kbd></div><div>Call your rickshaw to you</div>
          <div><kbd>H</kbd></div><div>Honk the horn (essential Karachi etiquette)</div>
          <div><kbd>Space</kbd></div><div>Read about the nearby place (or click its floating icon)</div>
          <div><kbd>Q</kbd><kbd>E</kbd></div><div>Rotate the camera · mouse wheel to zoom</div>
          <div><kbd>M</kbd></div><div>Open the map: click anywhere to fast-travel</div>
          <div><kbd>P</kbd></div><div>Open your passport of collected stamps</div>
          <div><kbd>Esc</kbd></div><div>Close any panel</div>
        </div>
        <p>When you get close to a landmark, street or neighbourhood, a glowing icon pops up. Open it to read its story and add a stamp to your passport. There are stamps to collect all over the city, from the old port to the beaches of Defence.</p>
        <div style="text-align:right"><button class="btn" type="button" data-act="ok">Let's go</button></div>
      </div>`;
    this.root.appendChild(this.el);
    const close = () => this.close();
    this.el.querySelector('.close-btn').addEventListener('click', close);
    this.el.querySelector('[data-act=ok]').addEventListener('click', close);
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) close();
    });
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
  }
}

export class Fader {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'fader';
    root.appendChild(this.el);
  }

  async cover(fn) {
    this.el.classList.add('on');
    await new Promise((r) => setTimeout(r, 380));
    await fn();
    await new Promise((r) => setTimeout(r, 120));
    this.el.classList.remove('on');
  }
}
