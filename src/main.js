import './styles/main.css';
import { Game } from './core/Game.js';
import { OUTFITS } from './entities/Character.js';
import { Places } from './systems/Places.js';
import { Save } from './systems/Save.js';
import { AudioSystem } from './systems/Audio.js';
import { StartScreen } from './ui/StartScreen.js';
import { Hud } from './ui/Hud.js';
import { InfoCard } from './ui/InfoCard.js';
import { MapView } from './ui/MapView.js';
import { Passport } from './ui/Passport.js';
import { Toasts, Help, Fader } from './ui/Overlays.js';
import { DISTRICTS, AREAS, BUILDING_STYLES } from './world/layout.js';

const ui = document.getElementById('ui');
const save = new Save();
const audio = new AudioSystem();
audio.muted = save.data.muted;

const start = new StartScreen(ui);
const game = new Game(document.getElementById('game'));
window.__game = game; // handy for debugging in the console

// ---------------------------------------------------------------- loading
start.progress('Fetching stories from the server…', 0.05);
let data;
try {
  data = await (await fetch('/api/places')).json();
} catch (err) {
  start.progress('Could not reach the server. Is `npm run dev` running?');
  throw err;
}
const { places, categories } = data;

const steps = [0.2, 0.35, 0.5, 0.65, 0.8];
let stepIdx = 0;
const onProgress = (label) => start.progress(label, steps[Math.min(stepIdx++, steps.length - 1)]);
await game.buildWorld(onProgress);
await game.buildCity(places, onProgress);
start.progress('Ready!', 1);

const placeSys = new Places({
  places,
  categories,
  landmarks: game.landmarks,
  camera: game.camera,
  container: ui,
  discovered: save.data.discovered,
});

// ---------------------------------------------------------------- choose explorer
const choice = await start.choose({
  hasProgress: save.hasProgress,
  outfit: save.data.outfit,
  count: placeSys.count,
  total: placeSys.total,
});
audio.init();
if (choice.fresh) {
  save.reset();
  placeSys.reset();
}
save.set({ outfit: choice.outfit });
game.createPlayer(OUTFITS[choice.outfit]);
const player = game.player;

// restore position
if (!choice.fresh && save.data.player) {
  const p = save.data.player;
  if (save.data.rickshaw) {
    const r = save.data.rickshaw;
    player.rickshaw.position.set(r.x, 0, r.z);
    player.rickshaw.heading = r.heading;
    player.rickshaw.root.rotation.y = r.heading;
  }
  if (p.mode === 'drive' && save.data.rickshaw) {
    player.character.root.position.copy(player.rickshaw.position);
    player.enter();
  } else {
    player.placeAt(p.x, p.z, p.heading);
  }
  game.iso.snapTo(player.position);
}

// ---------------------------------------------------------------- UI
const hud = new Hud(ui, { categories });
const card = new InfoCard(ui, { categories });
const map = new MapView(ui, { categories, places });
const passport = new Passport(ui, { categories, places });
const toasts = new Toasts(ui);
const help = new Help(ui);
const fader = new Fader(ui);

hud.setProgress(placeSys.count, placeSys.total);
hud.setSound(!audio.muted);

const anyOverlay = () => map.isOpen || passport.isOpen || help.isOpen;

placeSys.addEventListener('discover', (e) => {
  const { place } = e.detail;
  const cat = categories[place.category];
  save.set({ discovered: [...placeSys.discovered] });
  hud.setProgress(placeSys.count, placeSys.total);
  audio.chime();
  toasts.show(
    `<span class="seal" style="background:${cat.color}">${cat.icon}</span><div>Stamp collected: ${place.name}<small>${placeSys.count} of ${placeSys.total} · ${cat.label}</small></div>`,
  );
  if (placeSys.count === placeSys.total) {
    setTimeout(
      () =>
        toasts.show(
          '🎉 <div>Shabash! Every stamp collected.<small>You have seen all of our miniature Karachi.</small></div>',
          6000,
        ),
      1200,
    );
  }
});
placeSys.addEventListener('open', (e) => {
  audio.click();
  card.open(e.detail.place, { first: e.detail.first });
});

const openMap = (highlight = null) => {
  passport.close();
  card.close();
  map.open({
    entries: game.landmarks.list,
    discovered: placeSys.discovered,
    player: {
      x: player.position.x,
      z: player.position.z,
      heading: player.mode === 'drive' ? player.rickshaw.heading : player.heading,
    },
    highlight,
  });
};
const openPassport = () => {
  map.close();
  card.close();
  passport.open(placeSys.discovered);
};

hud.addEventListener('action', (e) => {
  audio.init();
  audio.click();
  const act = e.detail;
  if (act === 'map') map.isOpen ? map.close() : openMap();
  if (act === 'passport') passport.isOpen ? passport.close() : openPassport();
  if (act === 'help') help.isOpen ? help.close() : help.open();
  if (act === 'sound') {
    audio.setMuted(!audio.muted);
    hud.setSound(!audio.muted);
    save.set({ muted: audio.muted });
  }
});

passport.addEventListener('read', (e) => {
  passport.close();
  placeSys.open(e.detail.id);
});
passport.addEventListener('locate', (e) => openMap(e.detail.id));

// ---------------------------------------------------------------- fast travel
let traveling = false;
async function travelTo(x, z, place) {
  if (traveling) return;
  const r = player.mode === 'drive' ? player.rickshaw.radius : player.radius;
  const land = game.terrain.nearestLand(x, z, 18);
  if (!land) {
    toasts.show("🌊 <div>That's the Arabian Sea!<small>Pick a spot on land to travel to.</small></div>");
    return;
  }
  traveling = true;
  map.close();
  audio.whoosh();
  await fader.cover(() => {
    // arrive just outside the place's buildings, on the side facing the camera
    const target = place ? [land[0] + 4, land[1] + 10] : land;
    const spot = game.collision.findFree(target[0], target[1], r + 0.4, 80) || land;
    player.placeAt(spot[0], spot[1], Math.PI);
    game.iso.snapTo(player.position);
    if (player.mode === 'walk' && player.distanceToRickshaw() > 300) {
      // leave a friendly note: the rickshaw can always be called
    }
  });
  traveling = false;
  const area = areaAt(player.position.x, player.position.z);
  toasts.show(`📍 <div>Welcome to ${place ? place.name : area ? area.name : 'Karachi'}</div>`, 2200);
  persist();
}
map.addEventListener('travel', (e) => travelTo(e.detail.x, e.detail.z, e.detail.place));

// ---------------------------------------------------------------- helpers
function areaAt(x, z) {
  let best = null,
    bestK = 1;
  for (const a of AREAS) {
    const k = Math.hypot(x - a.center[0], z - a.center[1]) / a.r;
    if (k < bestK) {
      bestK = k;
      best = a;
    }
  }
  if (best) return best;
  bestK = 1.25;
  for (const d of DISTRICTS) {
    const k = Math.hypot(x - d.center[0], z - d.center[1]) / d.r;
    if (k < bestK) {
      bestK = k;
      best = d;
    }
  }
  return best;
}

function nearSeaAmount(x, z) {
  const t = game.terrain;
  let water = 0;
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    if (!t.isLand(x + Math.cos(a) * 30, z + Math.sin(a) * 30)) water++;
  }
  return water / N;
}

function persist() {
  const p = player.position;
  save.set({
    player: {
      x: p.x,
      z: p.z,
      heading: player.mode === 'drive' ? player.rickshaw.heading : player.heading,
      mode: player.mode,
    },
    rickshaw: { x: player.rickshaw.position.x, z: player.rickshaw.position.z, heading: player.rickshaw.heading },
  });
}
window.addEventListener('beforeunload', persist);

// ---------------------------------------------------------------- per-frame
let saveTimer = 0;
let miniTimer = 0;
let soundTimer = 0;
let nearSea = 0;
let density = 0;
const input = game.input;

window.addEventListener('keydown', () => audio.init());

game.start((dt) => {
  const overlay = anyOverlay();
  input.enabled = !overlay && !traveling;

  // --- keys
  if (input.wasPressed('escape')) {
    if (help.isOpen) help.close();
    else if (map.isOpen) map.close();
    else if (passport.isOpen) passport.close();
    else card.close();
  }
  if (input.wasPressed('m')) map.isOpen ? map.close() : openMap();
  if (input.wasPressed('p')) passport.isOpen ? passport.close() : openPassport();
  if (input.wasPressed('?', '/')) help.isOpen ? help.close() : help.open();

  if (!overlay && !traveling) {
    if (input.wasPressed('q')) game.iso.rotate(-1);
    if (input.wasPressed('e')) game.iso.rotate(1);
    if (input.wasPressed('f')) {
      if (player.mode === 'walk') {
        if (player.enter()) audio.click();
        else if (player.distanceToRickshaw() > 4.5)
          toasts.show('🛺 <div>Your rickshaw is too far away<small>Press R to call it over.</small></div>', 2500);
      } else if (!player.exit()) {
        toasts.show('🛑 <div>Slow down first!</div>', 1500);
      }
    }
    if (input.wasPressed('r')) {
      if (player.mode === 'walk') {
        player.callRickshaw();
        audio.playerHorn();
        toasts.show('🛺 <div>Rickshaw!<small>Your ride pulls up beside you.</small></div>', 2000);
      }
    }
    if (input.wasPressed('h')) audio.playerHorn();
    if (input.wasPressed(' ') && placeSys.nearest) placeSys.open(placeSys.nearest.place.id);
  }

  // --- simulation
  const basis = game.iso.groundBasis();
  const res = player.update(dt, input, basis);
  if (res.stepped) audio.step();
  if (res.hit) audio.bump();
  game.ambient.update(dt, game.time, player.position, audio);
  game.iso.target.copy(player.position);
  game.iso.extraZoom = player.mode === 'drive' ? 1.4 : 1;

  // --- places + HUD
  const p = player.position;
  placeSys.update(p, game.container.clientWidth, game.container.clientHeight);
  const area = areaAt(p.x, p.z);
  hud.setArea(area ? area.name : 'Karachi', area ? area.urdu : 'کراچی');
  miniTimer -= dt;
  if (miniTimer <= 0) {
    miniTimer = 1 / 30;
    hud.drawMinimap({
      x: p.x,
      z: p.z,
      heading: player.mode === 'drive' ? player.rickshaw.heading : player.heading,
      rickshaw: player.rickshaw.position,
      driving: player.mode === 'drive',
      entries: game.landmarks.list,
      discovered: placeSys.discovered,
    });
  }

  const tips = [];
  if (placeSys.nearest) tips.push({ keys: ['Space'], text: `Read about ${placeSys.nearest.place.name}` });
  if (player.mode === 'walk') {
    if (player.canEnter()) tips.push({ keys: ['F'], text: 'Get in the rickshaw' });
    else if (player.distanceToRickshaw() > 40) tips.push({ keys: ['R'], text: 'Call your rickshaw' });
  } else {
    tips.push({ keys: ['F'], text: 'Get out' }, { keys: ['H'], text: 'Honk' });
  }
  hud.setPrompts(overlay ? [] : tips);

  // --- sound (sea/density sampled a few times a second)
  soundTimer -= dt;
  if (soundTimer <= 0) {
    soundTimer = 0.4;
    nearSea = nearSeaAmount(p.x, p.z);
    const style = area?.style ? BUILDING_STYLES[area.style] : null;
    density = style ? Math.min(1, style.density * (area.style === 'villas' || area.style === 'huts' ? 0.5 : 1)) : 0.2;
  }
  audio.update(dt, {
    driving: player.mode === 'drive',
    speed: Math.min(1, Math.abs(player.rickshaw.speed) / player.rickshaw.boostSpeed),
    nearSea,
    density,
  });

  saveTimer += dt;
  if (saveTimer > 5) {
    saveTimer = 0;
    persist();
  }
});

if (!save.data.seenHelp) {
  help.open();
  save.set({ seenHelp: true });
}
setTimeout(() => {
  toasts.show(
    '👋 <div>Khush aamdeed! Welcome to Karachi<small>Empress Market is just nearby. Walk up to it and press Space.</small></div>',
    5000,
  );
}, 600);
