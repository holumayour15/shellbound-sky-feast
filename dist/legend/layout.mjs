// Level layout as pure data. World rendering, physics and tests all read from here.
import { heightAt, canyonX, riverZ } from './terrain.mjs';

export const FIRE = { x: 0, z: -3 };
export const BAOBAB = { x: 0, y: 8, z: -278, r: 6, crown: 43 };
export const PALACE = { x: 0, y: 58, z: -396, r: 24 };
export const VILLAGE_BAOBAB = { x: -15, z: -10, r: 2.8 };
export const PLANKS = 16;

export const NPCS = {
  grandma:  { x: 2.6, z: -0.6, name: 'Grandma Adaeze', role: 'Storyteller' },
  weaver:   { x: -12.2, z: -7.6, name: 'Weaver Bird', role: 'Thread keeper' },
  tailor:   { x: 16.6, z: 3.9, name: 'Aunty Ngozi', role: 'Boutique' },
  mama:     { x: 16.4, z: -3.4, name: 'Mama Nkem', role: 'Food & groceries' },
  hornbill: { x: 16, z: -102, name: 'Hornbill', role: 'Race master' },
  eagle:    { x: -13, z: -262, name: 'Eagle', role: 'Sky guardian' },
};
export const START = { x: 0, z: 16 };
export const MIRROR = { x: -4.2, z: 17.5 };
export const FORGE_SPOT = { x: 13, z: 18 };
// Where Papa and the heroines' friends spend their time when they are not out adventuring.
export const PAPA_HOME = { x: 10.8, z: 15.2 };
export const FRIEND_HOMES = { amara: { x: -11, z: 23 }, hadassah: { x: -12, z: 4 }, tehilah: { x: 23.5, z: -31 }, tiara: { x: 9, z: 22 },
  tobi: { x: -18, z: 15 }, emeka: { x: -22, z: -12 }, dayo: { x: 22, z: 22 }, musa: { x: -7, z: 26 } };
// Hobby spots: the river jetty, the cooking pot and the bike stand.
export const JETTY = { x: -30, z: -55.5 };
export const COOK_POT = { x: 6, z: 7 };
export const BIKE_STAND = { x: 4.5, z: 22.5 };
export const VILLAGERS = [
  { id: 'chidi', x: -6, z: 9, name: 'Chidi', kind: 'man', lines: ['The Harmattan wind is strong this season. Hold on to your gele!', 'Grandma says the sky feast is fading. I can barely see it at night now.'] },
  { id: 'funke', x: 9, z: 14, name: 'Funke', kind: 'woman', lines: ['Have you seen Ngozi’s new wax prints? Pure fire.', 'Collect cowries and you can dress like a festival queen.'] },
  { id: 'kelechi', x: -20, z: -2, name: 'Little Kelechi', kind: 'kid', lines: ['Jump on beetles to flip them, then spin! Mama told me not to, but it looks fun.', 'In Story-time you can see the glowing paths. Spooky!'] },
];
// Side errands: find-and-return and delivery jobs that pay cowries.
export const ERRANDS = {
  ball: { giver: 'kelechi', item: { x: 14, z: -47.5 }, reward: 8, title: 'Find Kelechi’s football', ask: 'My football rolled away towards the river! Can you find it? I’ll give you my savings.', thanks: 'My ball! You’re the best. Here — 8 cowries!' },
  suya: { giver: 'funke', need: 'suya', reward: 14, unlock: 'acc:glasses', title: 'Bring Funke some suya', ask: 'I’ve been minding the stall all day and I’m starving. Bring me a stick of suya from Mama Nkem?', thanks: 'Ahh, still hot! Thank you. Take these cowries — and my spare round glasses. They suit you.' },
};

const hy = (x, z, add = 0) => heightAt(x, z) + add;

export function buildPlatforms() {
  const P = [];
  const add = p => { P.push({ layer: 'both', shape: 'cyl', ...p }); };
  // Village crates (golden thread on top) and Story-time spirit steps.
  const cb = hy(18, -12);
  add({ id: 'crate1', shape: 'box', x: 18, z: -12, w: 1.8, d: 1.8, top: cb + 1.2, kind: 'crate' });
  add({ id: 'crate3', shape: 'box', x: 16.2, z: -13.8, w: 1.6, d: 1.6, top: cb + 1.1, kind: 'crate' });
  add({ id: 'crate2', shape: 'box', x: 19.7, z: -13.9, w: 1.8, d: 1.8, top: cb + 2.4, kind: 'crate' });
  add({ id: 'sp1', x: -13, z: -26, r: 1.6, top: hy(-13, -26, 1.3), layer: 'story', kind: 'spirit' });
  add({ id: 'sp2', x: -17, z: -29.5, r: 1.5, top: hy(-13, -26, 2.7), layer: 'story', kind: 'spirit' });
  add({ id: 'sp3', x: -21.5, z: -32.5, r: 1.8, top: hy(-13, -26, 4.1), layer: 'story', kind: 'spirit' });
  // River stepping stones: the second gap needs Weaver's double jump.
  add({ id: 'stone1', x: 0.5, z: -56.6, r: 1.5, top: -0.5, kind: 'stone' });
  add({ id: 'stone2', x: -0.5, z: -67.8, r: 1.5, top: -0.5, kind: 'stone' });
  // Harmattan Canyon crossings.
  const p1x = canyonX(-187);
  add({ id: 'pillar', x: p1x, z: -187, r: 2.2, top: hy(canyonX(-178), -178, 0.6), layer: 'now', kind: 'ruin' });
  const bx = canyonX(-223.5);
  add({ id: 'bridge', shape: 'box', x: bx, z: -223.5, w: 4.8, d: 19, top: Math.max(hy(canyonX(-213), -213), hy(canyonX(-234), -234)) + 0.15, layer: 'story', kind: 'spirit' });
  // Sky Baobab spiral. The lowest three planks stay sealed until Eagle opens the way.
  for (let i = 0; i < PLANKS; i++) {
    const a = i * 0.62, r = 8.6;
    const layer = i % 5 === 3 ? 'story' : (i % 5 === 1 && i > 4) ? 'now' : 'both';
    add({ id: 'plank' + i, x: BAOBAB.x + Math.sin(a) * r, z: BAOBAB.z + Math.cos(a) * r, r: 1.95, top: 9.8 + i * 2.0, layer, kind: layer === 'story' ? 'spirit' : 'plank', angle: a, sealed: i < 3 });
  }
  for (const l of LIFTS) add({ id: l.id, x: l.x, z: l.z, r: 1.9, top: l.top, kind: 'pillarTop' });
  add({ id: 'crown', x: BAOBAB.x, z: BAOBAB.z, r: 9, top: BAOBAB.crown, kind: 'crown' });
  // Sky Road to the feast.
  add({ id: 'isle1', x: 0, z: -296, r: 4, top: 44.5, kind: 'isle' });
  add({ id: 'isle2', x: 6, z: -308, r: 3.6, top: 46, layer: 'story', kind: 'spirit' });
  add({ id: 'isle3', x: -2, z: -320, r: 3.4, top: 48, kind: 'isle' });
  add({ id: 'isle4', x: -4, z: -338, r: 4.2, top: 53, kind: 'isle' });
  add({ id: 'isle5', x: 5, z: -351, r: 3.6, top: 55, layer: 'story', kind: 'spirit' });
  add({ id: 'isle6', x: 0, z: -362, r: 3.2, top: 56, kind: 'isle', moving: { axis: 'x', amp: 5.5, speed: 0.7 } });
  add({ id: 'palace', x: PALACE.x, z: PALACE.z, r: PALACE.r, top: PALACE.y, kind: 'palace' });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, r = 16;
    add({ id: 'table' + i, shape: 'box', x: PALACE.x + Math.sin(a) * r, z: PALACE.z + Math.cos(a) * r, w: 6, d: 1.8, rot: a + Math.PI / 2, top: PALACE.y + 0.9, kind: 'table' });
  }
  return P;
}

export const UPDRAFTS = [{ x: -3, z: -329, r: 3, y0: 40, y1: 61 }, { x: 4, z: -357, r: 2.6, y0: 45, y1: 58 }];

export function buildWalls() {
  const W = [];
  for (const h of HUTS) W.push({ id: 'hut', x: h.x, z: h.z, r: 3.3, y0: -5, y1: 6 });
  W.push({ id: 'vbaobab', x: VILLAGE_BAOBAB.x, z: VILLAGE_BAOBAB.z, r: VILLAGE_BAOBAB.r, y0: -5, y1: 12 });
  W.push({ id: 'fire', x: FIRE.x, z: FIRE.z, r: 1.3, y0: -5, y1: 1.2 });
  W.push({ id: 'trunk', x: BAOBAB.x, z: BAOBAB.z, r: BAOBAB.r, y0: 0, y1: BAOBAB.crown - 0.4 });
  for (const l of LIFTS) W.push({ id: 'pillar', x: l.x, z: l.z, r: 1.7, y0: -50, y1: l.top - 0.4 });
  for (const c of COLUMNS) W.push({ id: 'column', x: c.x, z: c.z, r: 0.9, y0: PALACE.y - 1, y1: PALACE.y + 8 });
  return W;
}

export const HUTS = [];
for (let i = 0; i < 12; i++) {
  const a = i / 12 * Math.PI * 2 + 0.26;
  if (Math.sin(a) < -0.9 || Math.sin(a) > 0.92 || Math.abs(Math.cos(a) - 0.97) < 0.06) continue; // keep the roads and market clear
  const r = 28 + (i % 3) * 2.2;
  HUTS.push({ x: Math.cos(a) * r, z: Math.sin(a) * r + 2, rot: -a });
}

export const COLUMNS = [];
for (let i = 0; i < 14; i++) {
  const a = i / 14 * Math.PI * 2;
  if (Math.abs(a) < 0.3 || Math.abs(a - Math.PI * 2) < 0.3) continue; // south gate
  COLUMNS.push({ x: PALACE.x + Math.sin(a) * 21.5, z: PALACE.z + Math.cos(a) * 21.5 });
}

export const STALLS = [
  { x: 19, z: -3, cloth: 'ankara' }, { x: 19.5, z: 4.5, cloth: 'asooke', tailor: true },
  { x: 17.5, z: 12, cloth: 'kente' }, { x: 13, z: 18, cloth: 'bogolan' },
];

export const CHECKPOINT_MARKERS = null; // checkpoints live in config.mjs

export const THREADS = [
  { id: 't1', x: -26, z: 12, add: 1 },
  { id: 't2', x: 25, z: 18, add: 1 },
  { id: 't3', x: 19.7, z: -13.9, top: 'crate2', add: 0.9 },
  { id: 't4', x: -21.5, z: -32.5, top: 'sp3', add: 1, layer: 'story' },
  { id: 't5', x: 28, z: -41.5, add: 1.4, chest: 'drumchest' },
];

export const TALE_STONES = [
  { id: 'tale0', x: -8, z: 20 },
  { id: 'tale1', x: 12, z: -77 },
  { id: 'tale2', x: -27, z: -128, layer: 'story' },
  { id: 'tale3', x: canyonX(-206) - 7, z: -206 },
  { id: 'tale4', x: 15, z: -267 },
  { id: 'tale5', x: 5, z: -351, top: 'isle5', layer: 'story' },
];

export const KOLA = [
  { id: 'k1', x: -4, z: -30 }, { id: 'k2', x: 14, z: -88 }, { id: 'k3', x: -20, z: -118 }, { id: 'k4', x: canyonX(-170) + 4, z: -170 },
  { id: 'k5', x: canyonX(-240) - 3, z: -240 }, { id: 'k6', x: 0, z: -296, top: 'isle1' }, { id: 'k7', x: -4, z: -338, top: 'isle4' },
];

export const RINGS = [[10, -110, 2.6], [0, -121, 3.4], [-14, -127, 2.6], [-25, -114, 3.8], [-23, -98, 2.6], [-10, -88, 3.2], [4, -84, 2.6], [14, -92, 3.2]]
  .map(([x, z, h], i) => ({ id: 'ring' + i, x, z, y: heightAt(x, z) + h + 0.8, r: 2.4 }));

export const BEETLES = [[-10, -103, 6], [20, -126, 7], [-30, -140, 6], [8, -140, 5], [-6, -82, 5], [canyonX(-165), -165, 6], [canyonX(-205) + 3, -205, 6], [canyonX(-245), -245, 6], [8, -265, 7]]
  .map(([x, z, r], i) => ({ id: 'b' + i, x, z, r }));
export const DEVILS = [[canyonX(-160) - 4, -160], [canyonX(-176), -176], [canyonX(-200) + 4, -200], [canyonX(-238), -238]].map(([x, z], i) => ({ id: 'd' + i, x, z }));
export const HAWKS = [[canyonX(-170), -170], [canyonX(-240), -240], [6, -330]].map(([x, z], i) => ({ id: 'h' + i, x, z, quest: false }));
export const QUEST_HAWKS = [[-8, -262], [10, -258], [0, -270]].map(([x, z], i) => ({ id: 'qh' + i, x, z, quest: true }));

// Cowry trails. Order defines the stable save IDs.
export function buildCowries(platforms) {
  const C = [], byId = Object.fromEntries(platforms.map(p => [p.id, p]));
  const push = (x, z, y, layer = 'both') => C.push({ id: 'c' + C.length, x, z, y: y ?? heightAt(x, z) + 0.9, layer });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; push(Math.cos(a) * 8, Math.sin(a) * 8 - 3); }
  for (let i = 0; i < 9; i++) push(0, 4 - i * 5.5);
  push(18, -12, byId.crate1.top + 0.9); push(16.2, -13.8, byId.crate3.top + 0.9);
  for (const id of ['sp1', 'sp2']) push(byId[id].x, byId[id].z, byId[id].top + 0.9, 'story');
  push(0.5, -56.6, 0.6); push(0, -61.9, 2.6); push(-0.5, -67.8, 0.6);
  for (let i = 0; i < 12; i++) { const t = i / 11; push(t * 7, -76 - t * 66); }
  for (const r of RINGS) push(r.x, r.z, r.y);
  for (let i = 0; i < 14; i++) { const a = i * 2.4; push(Math.sin(a) * (20 + i * 2), -100 - Math.cos(a) * 18); }
  for (let i = 0; i < 16; i++) { const z = -156 - i * 6; if ((z < -179 && z > -195) || (z < -214 && z > -233)) continue; push(canyonX(z), z); }
  for (let i = 0; i < 4; i++) { const z = -183 - i * 2.8; push(canyonX(z), z, byId.pillar.top + 1.6 + Math.sin(i / 3 * Math.PI) * 1.2); }
  for (let i = 0; i < 4; i++) { const z = -217 - i * 4.5; push(canyonX(-223.5), z, byId.bridge.top + 0.9, 'story'); }
  for (let i = 0; i < 10; i++) { const a = (i / 9 - 0.5) * Math.PI * 1.2; push(BAOBAB.x + Math.sin(a) * 12, BAOBAB.z + Math.cos(a) * 12); }
  for (let i = 3; i < PLANKS; i++) { const p = byId['plank' + i]; push(p.x, p.z, p.top + 0.9, p.layer); }
  for (const id of ['isle1', 'isle2', 'isle3', 'isle4', 'isle5']) { const p = byId[id]; push(p.x + 1.2, p.z, p.top + 0.9, p.layer); push(p.x - 1.2, p.z, p.top + 0.9, p.layer); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; push(PALACE.x + Math.sin(a) * 10, PALACE.z + Math.cos(a) * 10, PALACE.y + 0.9); }
  return C;
}

// ---------------- Puzzles, treasure, enemies ----------------
// Drum riddle: the elder drum plays a rhythm; strike the four drum stones in the same order.
export const DRUM_CIRCLE = { x: 28, z: -36, r: 4.2 };
export const DRUM_STONES = [0, 1, 2, 3].map(i => { const a = i / 4 * Math.PI * 2 + Math.PI / 4; return { id: 'ds' + i, i, x: DRUM_CIRCLE.x + Math.sin(a) * DRUM_CIRCLE.r, z: DRUM_CIRCLE.z + Math.cos(a) * DRUM_CIRCLE.r, pitch: [196, 247, 294, 392][i], color: ['#d23a2b', '#f2c21b', '#2fa84f', '#2a6fdb'][i] }; });
export const DRUM_PATTERN = [0, 2, 1, 3, 2];
// Twin-plate gate across the canyon: Amara and Papa must stand on both plates at once.
export const GATE = { z: -162, x: canyonX(-162), half: 17, plates: [{ id: 'plateA', x: canyonX(-157) - 5, z: -157 }, { id: 'plateB', x: canyonX(-157) + 5, z: -157 }] };
// Tall pillars only reachable with a Papa lift; each holds a chest.
export const LIFTS = [{ id: 'lift0', x: -34, z: -92 }, { id: 'lift1', x: 30, z: -122 }, { id: 'lift2', x: canyonX(-238) + 8, z: -238 }]
  .map(l => ({ ...l, top: heightAt(l.x, l.z) + 5.6 }));
export const CHESTS = [
  { id: 'drumchest', x: 28, z: -41.5, coins: 10, note: 'golden thread' },
  { id: 'lift0', coins: 15, unlock: ['acc:stars', 'acc:chain'], name: ['Star clips', 'Gold chain'] },
  { id: 'lift1', coins: 20, unlock: 'shoes:glitter', name: 'Glitter sneakers' },
  { id: 'lift2', coins: 25, item: 'jollof' },
];
// Buried treasure, revealed by Mbe's sniff.
export const DIG_SPOTS = [
  { id: 'dig0', x: -36, z: -2, coins: 10, item: 'puffpuff' },
  { id: 'dig1', x: 34, z: 14, coins: 8, unlock: ['hair:gele', 'hair:filacap'], name: ['Festival gele', 'Festival fila'] },
  { id: 'dig2', x: -18, z: -88, coins: 15 },
  { id: 'dig3', x: 40, z: -110, coins: 10, unlock: 'face:glitter', name: 'Glitter stars' },
  { id: 'dig4', x: canyonX(-200) - 8, z: -200, coins: 15, item: 'suya' },
  { id: 'dig5', x: -16, z: -272, coins: 25 },
];
export const GREEDLINGS = [[-38, 8], [40, -20], [-25, -100], [20, -135], [canyonX(-210) + 4, -210], [canyonX(-244) - 5, -244]].map(([x, z], i) => ({ id: 'g' + i, x, z }));

export { riverZ };
