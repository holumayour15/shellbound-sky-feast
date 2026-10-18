// Save, settings and leaderboard persistence with defensive validation.
import { VERSION, SAVE_KEY, OLD_SAVE_KEYS, TALENTS, WEAPONS, stageIndex, BOARD_KEY, SETTINGS_KEY, LOOK, SLOTS, DEFAULT_LOOK, DIFFICULTY, QUEST, CHECKPOINTS, SHOP, FORGE, HEROES, STAGES, JOBS, heroine } from './config.mjs';

const isStr = v => typeof v === 'string';
const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
const strList = (v, max = 400) => Array.isArray(v) ? [...new Set(v.filter(isStr).map(s => s.slice(0, 24)))].slice(0, max) : [];
import { FISH, DISHES, BADGES } from './hobbies.mjs';
const ITEM_IDS = new Set([...SHOP.food, ...SHOP.groceries, ...SHOP.items, ...FISH, ...DISHES].map(i => i.id));

export function freeOwned() {
  const k = [];
  for (const slot of SLOTS) for (const it of LOOK[slot].items) if (it.cost === 0) k.push(slot + ':' + it.id);
  for (const h of HEROES) for (const [slot, id] of Object.entries(h.look)) k.push(slot + ':' + id); // each hero's own style
  return [...new Set(k)];
}

const TRAIT_TO_TALENT = { Brave: 'brave', Clever: 'clever', Musical: 'musical', Swift: 'swift' };
export const DEFAULT_LOOK_M = { ...HEROES.find(h => h.id === 'tobi').look };
export const defaultLookFor = g => ({ ...(g === 'm' ? DEFAULT_LOOK_M : DEFAULT_LOOK) });

// A new adventure: the player's own name, gender, talent, starting age and look.
export function freshSave(opts = {}) {
  if (typeof opts === 'string') opts = { name: heroine(opts).name, gender: heroine(opts).gender, look: heroine(opts).look }; // older call style
  const gender = opts.gender === 'm' ? 'm' : 'f';
  const stage = STAGES.some(st => st.id === opts.stage) ? opts.stage : 'child';
  return { v: VERSION, name: cleanName(opts.name || ''), gender, talent: TALENTS.some(t => t.id === opts.talent) ? opts.talent : 'brave',
    look: { ...defaultLookFor(gender), ...(opts.look || {}) }, owned: freeOwned(), bag: {}, upgrades: [],
    weapon: 'staff', weapons: ['none', 'staff'], cowries: 0, earned: STAGES.find(st => st.id === stage).earn, stage, grown: stage,
    job: null, jobsDone: 0, picked: [], threads: [], tales: [], dug: [], chests: [], errands: [],
    puzzles: [], quest: 'meet', feathers: 0, checkpoint: 0, elapsed: 0, deaths: 0, enemies: 0, raceBest: 0,
    startStage: stage, restarts: 0, lesson: null, papaFights: true,
    hobby: { fish: 0, cook: 0, bike: 0 }, catches: {}, cooked: 0, dishes: [], bike: null, bikeBest: 0, badges: [], waves: 0, daily: null, today: { day: 0 } };
}
export const cleanName = n => (isStr(n) ? n.replace(/[^\p{L}\p{N} '.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14) : '') || 'Shellbound';

export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v === 2) raw = { ...raw, v: 3, hero: 'amara', looks: { amara: raw.look }, earned: raw.cowries };
  if (raw.v === 3) { const h = heroine(raw.hero); raw = { ...raw, v: VERSION, name: h.name, gender: h.gender, talent: TRAIT_TO_TALENT[h.trait], look: raw.looks?.[h.id] || h.look }; } // played as a preset hero
  if (raw.v !== VERSION) return null;
  const earned = Math.round(num(raw.earned, 0, 1e6, 0));
  const stageIds = STAGES.filter(st => earned >= st.earn).map(st => st.id);
  const grown = stageIds.includes(raw.grown) ? raw.grown : stageIds.at(-1);
  const base = freshSave({ name: raw.name, gender: raw.gender, talent: raw.talent });
  const owned = new Set([...base.owned, ...strList(raw.owned).filter(k => { const [sl, id] = k.split(':'); return LOOK[sl]?.items.some(i => i.id === id); })]);
  const look = { ...base.look };
  if (raw.look && typeof raw.look === 'object') for (const slot of SLOTS) { const id = raw.look[slot]; if (isStr(id) && owned.has(slot + ':' + id)) look[slot] = id; }
  const bag = {};
  if (raw.bag && typeof raw.bag === 'object') for (const [k, v] of Object.entries(raw.bag)) if (ITEM_IDS.has(k)) { const n = Math.round(num(v, 0, 99, 0)); if (n) bag[k] = n; }
  const weapons = [...new Set(['none', 'staff', ...strList(raw.weapons, 10).filter(w => WEAPONS.some(x => x.id === w))])];
  const job = raw.job && typeof raw.job === 'object' && JOBS.some(j => j.id === raw.job.id) ? { id: raw.job.id } : null;
  const stage = stageIds.includes(raw.stage) && stageIndex(raw.stage) <= stageIndex(grown) ? raw.stage : 'child';
  return { ...base, look, owned: [...owned], bag, weapons, weapon: weapons.includes(raw.weapon) ? raw.weapon : 'staff',
    upgrades: strList(raw.upgrades, 20).filter(u => FORGE.some(f => f.id === u)),
    cowries: Math.round(num(raw.cowries, 0, 99999, 0)), earned, stage, grown, job, jobsDone: Math.round(num(raw.jobsDone, 0, 1e5, 0)),
    picked: strList(raw.picked), threads: strList(raw.threads, 5), tales: strList(raw.tales, 6),
    dug: strList(raw.dug, 20), chests: strList(raw.chests, 20), errands: strList(raw.errands, 20), puzzles: strList(raw.puzzles, 30),
    quest: QUEST.some(q => q.id === raw.quest) ? raw.quest : 'meet',
    feathers: Math.round(num(raw.feathers, 0, 3, 0)),
    checkpoint: Math.round(num(raw.checkpoint, 0, CHECKPOINTS.length - 1, 0)),
    elapsed: num(raw.elapsed, 0, 1e7, 0), deaths: Math.round(num(raw.deaths, 0, 1e5, 0)),
    enemies: Math.round(num(raw.enemies, 0, 1e5, 0)), raceBest: num(raw.raceBest, 0, 999, 0),
    startStage: STAGES.some(st => st.id === raw.startStage) ? raw.startStage : raw.startStage === undefined ? stage : 'child', restarts: Math.round(num(raw.restarts, 0, 1e5, 0)), lesson: null, papaFights: raw.papaFights !== false,
    hobby: Object.fromEntries(['fish', 'cook', 'bike'].map(k => [k, Math.round(num(raw.hobby?.[k], 0, 1e6, 0))])),
    catches: Object.fromEntries(FISH.map(f => [f.id, Math.round(num(raw.catches?.[f.id], 0, 1e5, 0))]).filter(([, n]) => n)),
    cooked: Math.round(num(raw.cooked, 0, 1e5, 0)), dishes: strList(raw.dishes, 10).filter(id => DISHES.some(d => d.id === id)),
    bike: ['red', 'gold'].includes(raw.bike) ? raw.bike : null, bikeBest: num(raw.bikeBest, 0, 999, 0),
    badges: strList(raw.badges, 30).filter(id => BADGES.some(b => b.id === id)), waves: Math.round(num(raw.waves, 0, 1e5, 0)),
    daily: raw.daily && Number.isFinite(raw.daily.day) ? { day: Math.round(raw.daily.day), streak: Math.round(num(raw.daily.streak, 0, 7, 1)) } : null,
    today: raw.today && Number.isFinite(raw.today.day) ? Object.fromEntries(Object.entries(raw.today).filter(([k, v]) => /^[a-zA-Z_]{1,20}$/.test(k) && Number.isFinite(v)).slice(0, 20).map(([k, v]) => [k, Math.round(num(v, 0, 1e6, 0))])) : { day: 0 } };
}

function store() { try { return globalThis.localStorage || null; } catch { return null; } }
export function read(key) { try { const s = store()?.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } }
export function write(key, value) { try { store()?.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }

export const loadGame = () => sanitize(read(SAVE_KEY)) || OLD_SAVE_KEYS.reduce((acc, k) => acc || sanitize(read(k)), null);
export const saveGame = s => write(SAVE_KEY, s);
export const clearGame = () => { try { store()?.removeItem(SAVE_KEY); } catch { /* storage unavailable */ } };

export const DEFAULT_SETTINGS = { quality: 'auto', music: 0.6, sfx: 0.8, sensitivity: 1, invertY: false, autoCam: true, reducedMotion: false, textSize: 1, subtitlesSlow: false, smartChat: false, photoFace: true };
export function loadSettings() {
  const r = read(SETTINGS_KEY) || {}, d = DEFAULT_SETTINGS;
  return { quality: ['auto', 'low', 'medium', 'high'].includes(r.quality) ? r.quality : d.quality,
    music: num(r.music, 0, 1, d.music), sfx: num(r.sfx, 0, 1, d.sfx), sensitivity: num(r.sensitivity, 0.3, 2.5, d.sensitivity),
    invertY: r.invertY === true, autoCam: r.autoCam !== false, reducedMotion: r.reducedMotion === true,
    textSize: num(r.textSize, 0.9, 1.4, d.textSize), subtitlesSlow: r.subtitlesSlow === true, smartChat: r.smartChat === true, photoFace: r.photoFace !== false };
}
export const saveSettings = s => write(SETTINGS_KEY, s);

export function loadBoard() {
  const r = read(BOARD_KEY);
  if (!Array.isArray(r)) return [];
  return r.filter(e => e && isStr(e.name) && Number.isFinite(e.score)).map(e => ({ name: e.name.slice(0, 14), score: Math.round(e.score),
    time: num(e.time, 0, 1e7, 0), grade: isStr(e.grade) ? e.grade.slice(0, 1) : 'D', hero: isStr(e.hero) ? e.hero.slice(0, 16) : '',
    difficulty: isStr(e.difficulty) ? e.difficulty.slice(0, 10) : '', date: isStr(e.date) ? e.date.slice(0, 10) : '' })).slice(0, 10);
}
export function addToBoard(entry) {
  const b = loadBoard(); b.push(entry); b.sort((a, c) => c.score - a.score || a.time - c.time);
  const top = b.slice(0, 10); write(BOARD_KEY, top); return top.indexOf(entry);
}

// Friends added by friend code (device-local), and the optional selfie thumbnail (never uploaded to other players).
export const FRIENDS_KEY = 'shellbound-friends-v1', SELFIE_KEY = 'shellbound-selfie-v1';
export function loadFriends() {
  const r = read(FRIENDS_KEY);
  return Array.isArray(r) ? r.filter(f => f && isStr(f.code) && /^[A-Z0-9]{6}$/.test(f.code)).map(f => ({ code: f.code, name: cleanName(f.name) })).slice(0, 50) : [];
}
export const saveFriends = list => write(FRIENDS_KEY, list.slice(0, 50));
export function loadSelfie() { const r = read(SELFIE_KEY); return isStr(r) && r.startsWith('data:image/') && r.length < 60000 ? r : null; }
export const saveSelfie = url => url ? write(SELFIE_KEY, url) : (() => { try { store()?.removeItem(SELFIE_KEY); } catch { /* storage unavailable */ } })();
