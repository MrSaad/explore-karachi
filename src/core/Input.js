// Keyboard state + one-shot key presses. UI can "capture" input (e.g. when a
// text panel is focused) so movement doesn't fire behind it.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.down.clear());
  }

  isDown(...keys) {
    if (!this.enabled) return false;
    return keys.some((k) => this.down.has(k));
  }

  /** True once per physical key press. */
  wasPressed(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }

  /** Movement axes from WASD / arrows: x = right, y = up (screen space). */
  axes() {
    let x = 0,
      y = 0;
    if (this.isDown('w', 'arrowup')) y += 1;
    if (this.isDown('s', 'arrowdown')) y -= 1;
    if (this.isDown('d', 'arrowright')) x += 1;
    if (this.isDown('a', 'arrowleft')) x -= 1;
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
  }
}
