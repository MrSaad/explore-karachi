// Progress lives in the browser (localStorage). Every access is guarded —
// private windows and blocked storage just mean progress isn't remembered.
const KEY = 'explore-karachi:v1';

const DEFAULTS = {
  outfit: null, // 'male' | 'female'
  discovered: [],
  player: null, // { x, z, heading, mode }
  rickshaw: null, // { x, z, heading }
  muted: false,
  seenHelp: false,
};

export class Save {
  constructor() {
    this.data = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      /* storage unavailable */
    }
  }

  get hasProgress() {
    return !!this.data.outfit;
  }

  set(patch) {
    Object.assign(this.data, patch);
    this.write();
  }

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  reset() {
    this.data = { ...DEFAULTS, muted: this.data.muted };
    this.write();
  }
}
