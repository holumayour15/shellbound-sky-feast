// Shellbound: Amara and the Sky Feast — game loop, input, camera, companions, quests, shops and UI.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/EffectComposer.js';
import { RenderPass } from 'three/addons/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/ShaderPass.js';
import { OutputPass } from 'three/addons/OutputPass.js';
import { TUNING as T, DIFFICULTY, LOOK, SLOTS, SHOP, FORGE, GROCERY_LIST, QUEST, TALES, TALE_NOTE, CHECKPOINTS, HEROES, heroine, fitsGender, STAGES, stageFor, stageIndex, TIERS, WEAPONS, weaponOf, TALENTS, JOBS, questIndex, modifiers, lookItem, shopItem, score, grade } from './config.mjs';
import { heightAt, WATER_Y } from './terrain.mjs';
import { createPlayer, stepPlayer, knockback, surfaceBelow } from './physics.mjs';
import { buildWorld } from './world.mjs';
import { createEnemies, createBoss } from './enemies.mjs';
import { createAudio } from './audio.mjs';
import { makeBird } from './models.mjs';
import { makeHeroine } from './humans.mjs';
import { createPapa, createFriend, createMbe } from './companions.mjs';
import { reply as chatReply, classify, moderate, smartPrompt, PERSONAS, bestFriendFor } from './chat.mjs';
import * as L from './layout.mjs';
import * as TX from './textures.mjs';
import { freshSave, freeOwned, cleanName, defaultLookFor, loadGame, saveGame, loadSettings, saveSettings, loadBoard, addToBoard, loadFriends, saveFriends, loadSelfie, saveSelfie } from './save.mjs';
import { createSocial } from './social.mjs';
import { readSelfie, matchPrompt, cleanMatch, faceCanvas } from './selfie.mjs';
import { FISH, fishOf, DISHES, dishOf, RECIPES, recipeUse, quality, HOBBIES, levelOf, nextLevelXp, LEVEL_XP, rollFish, reelZone, reelHits, BIKE_GATES, bikeReward, BIKE_PAR, BADGES, newBadges, dayNumber, dailyGift, challengesFor } from './hobbies.mjs';
import { buildHobbyWorld, makeBike } from './hobbyworld.mjs';

const $ = id => document.getElementById(id);
// Yield to the browser between loading steps; the timeout keeps loading going in background tabs.
const wait = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 60); });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrapA = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isTouch = matchMedia('(pointer: coarse)').matches;
const textCache = new Map();
const setText = (el, v) => { if (textCache.get(el) !== v) { textCache.set(el, v); el.textContent = v; } };

// ---------------- Renderer ----------------
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 unavailable');
} catch (e) { $('loading').hidden = true; $('error').hidden = false; throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1800);
camera.position.set(30, 16, 40);

let settings = loadSettings();
document.documentElement.style.setProperty('--ts', settings.textSize);
const audio = createAudio();
audio.setVolumes(settings.music, settings.sfx);

const TIPS = ['Tip: Fish at the river jetty, cook at the village pot and race bikes round the village for prizes.', 'Tip: Come back every day for a bigger daily gift and three new challenges.', 'Tip: Your age sets the challenge — adults face the toughest monsters with gold weapons.', 'Tip: Add real friends with their friend code in the Friends chat, then invite them to your game.', 'Tip: Press Q to slip between Now and Story-time.', 'Tip: Talk to Papa (E) and he can lift you onto tall pillars.', 'Tip: Press G and Mbe will sniff out buried treasure.', 'Tip: Greedlings steal cowries — spin or throw Mbe to get them back.', 'Tip: Food from Mama Nkem heals you. Press H to snack.'];
$('loadTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

let W, enemies, boss, composer, bloom, grade_, amara, papa, mbe, diff, mods, S;
const friends = {}; let lastCow = 0, helperCd = { papa: 0 }, friendOnline = {}, friendRollT = 0;
let mode = 'loading', prevMode = 'play';
const P = createPlayer();
let maxHearts = 4, hearts = 4, weave = 0, layer = 'now', weaveCd = 0, drumCd = 0, sniffCd = 0, time = 0, lastNow = performance.now(), frameDt = 0.016;
let race = { on: false, idx: 0, t: 0, practice: false }, shake = 0, hurtFx = 0, ripple = 0, autoSaveT = 0, comboT = 0, combo = 0;
let dancing = false, bossWall = null, celebrate = null, toastT = 0, frameTimes = [], qualityLocked = false, liftedT = 0, lastC = -9, throwFlag = false;
const buffs = { zobo: 0, chinchin: 0 };
const env = { heightAt, platforms: [], walls: [], updrafts: L.UPDRAFTS, abilities: {}, mods: {} };
const cam = { yaw: 0, pitch: 0.32, dist: 8, tx: 0, ty: 2, tz: 12, manualT: 0, x: 30, y: 16, z: 40 };

async function boot() {
  const steps = [
    ['Raising the village…', () => { W = buildWorld(renderer); }],
    ['Waking the creatures…', () => { enemies = createEnemies(W.scene, DIFFICULTY.story); boss = createBoss(W.scene, DIFFICULTY.story); }],
    ['Tuning the talking drums…', setupComposer],
    ['Calling Papa and the village friends…', setupScene],
    ['Warming the shaders…', async () => { try { await Promise.race([renderer.compileAsync(W.scene, camera), new Promise(r => setTimeout(r, 6000))]); } catch { renderer.compile(W.scene, camera); } }],
  ];
  for (let i = 0; i < steps.length; i++) {
    document.querySelector('.load-title').textContent = steps[i][0];
    await wait(); await steps[i][1](); $('loadBar').style.width = `${(i + 1) / steps.length * 100}%`;
  }
  applyQuality();
  addEventListener('resize', onResize); onResize();
  bindUI(); bindInput();
  await wait();
  $('loading').hidden = true;
  showTitle();
  requestAnimationFrame(frame);
}

// ---------------- Post-processing ----------------
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uRipple: { value: 0 }, uWeave: { value: 0 }, uHurt: { value: 0 }, uAspect: { value: 1 }, uVig: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uRipple, uWeave, uHurt, uAspect, uVig; varying vec2 vUv;
    void main(){
      vec2 uv = vUv; vec2 c = uv - .5; c.x *= uAspect; float d = length(c);
      float band = uRipple > 0.001 ? exp(-pow((d - uRipple * 1.3) * 10., 2.)) * (1. - uRipple) : 0.;
      uv += normalize(c + 1e-5) * band * .035 * vec2(1. / uAspect, 1.);
      float ca = .0012 + band * .012 + uHurt * .006;
      vec3 col = vec3(texture2D(tDiffuse, uv + vec2(ca, 0.)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ca, 0.)).b);
      col = mix(col, col * vec3(.88, .93, 1.12) + vec3(.002, .0, .012), uWeave * .8);
      float vig = smoothstep(.45, 1.05, d);
      col *= 1. - vig * uVig;
      col = mix(col, vec3(.5, .02, .05) * (col + .25), vig * uHurt * .85);
      col += vec3(.35, .75, 1.) * band * .5;
      gl_FragColor = vec4(col, 1.);
    }`,
};
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(W.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.92);
  composer.addPass(bloom);
  grade_ = new ShaderPass(GradeShader); composer.addPass(grade_);
  composer.addPass(new OutputPass());
}
function qualityLevel() { return settings.quality === 'auto' ? (isTouch ? 'low' : 'medium') : settings.quality; }
function applyQuality() {
  const q = qualityLevel();
  const pr = q === 'low' ? Math.min(devicePixelRatio, 1) : q === 'medium' ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  const shadows = q !== 'low', size = q === 'high' ? 2048 : 1024;
  if (renderer.shadowMap.enabled !== shadows || W.light.sun.shadow.mapSize.x !== size) {
    renderer.shadowMap.enabled = shadows; W.light.sun.castShadow = shadows;
    W.light.sun.shadow.mapSize.set(size, size); W.light.sun.shadow.map?.dispose(); W.light.sun.shadow.map = null;
    W.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
  }
  bloom.enabled = q !== 'low';
  W.setGrassDensity(q === 'low' ? 0.35 : q === 'medium' ? 0.7 : 1);
  onResize();
}
function onResize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.fov = w < h ? 72 : 58; camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer?.setSize(w, h);
  if (grade_) grade_.uniforms.uAspect.value = w / h;
}

// ---------------- Scene extras and effects ----------------
let beacon, feastGlow, fx = [], shocks = [], gateWalls = [], HW;
const FXN = 180;
function setupScene() {
  beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 90, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd35a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  beacon.visible = false; W.scene.add(beacon);
  feastGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot('255,214,120'), color: '#ffd27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.8 }));
  feastGlow.position.set(L.PALACE.x, L.PALACE.y + 70, L.PALACE.z); feastGlow.scale.set(70, 70, 1); W.scene.add(feastGlow);
  const dot = TX.softDot();
  for (let i = 0; i < FXN; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false; W.scene.add(s); fx.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 0.4, g: 9 });
  }
  const G = L.GATE, gy = heightAt(G.x, G.z);
  for (let x = G.x - G.half; x <= G.x + G.half; x += 1.1) gateWalls.push({ id: 'gate', x, z: G.z, r: 0.85, y0: -60, y1: gy + 9 });
  S = freshSave(); diff = DIFFICULTY.story;
  HW = buildHobbyWorld(W);
  papa = createPapa(W.scene, L.PAPA_HOME); mbe = createMbe(W.scene);
  for (const h of HEROES) { const home = L.FRIEND_HOMES[h.id]; friends[h.id] = createFriend(W.scene, h, home); friends[h.id].place(home.x, home.z, heightAt(home.x, home.z)); }
  rollFriends(true);
  rebuildAmara(); refreshFriends(); mods = modifiers(S.look, S.upgrades, S.talent, S.stage);
}
let fxi = 0;
function sparks(x, y, z, color = '#ffd35a', n = 14, speed = 6, size = 0.45, life = 0.7, g = 9) {
  for (let k = 0; k < n; k++) {
    const f = fx[fxi = (fxi + 1) % FXN];
    f.s.position.set(x, y, z); f.s.material.color.set(color); f.s.visible = true;
    const a = Math.random() * 6.28, e = Math.random() * 1.2 - 0.2;
    f.vx = Math.cos(a) * Math.cos(e) * speed * (0.4 + Math.random()); f.vz = Math.sin(a) * Math.cos(e) * speed * (0.4 + Math.random()); f.vy = Math.sin(e) * speed + speed * 0.4;
    f.life = f.max = life * (0.6 + Math.random() * 0.6); f.size = size; f.g = g;
  }
}
function shock(x, y, z, color = '#9af6e0', maxR = 7, dur = 0.5) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); W.scene.add(mesh); shocks.push({ mesh, t: 0, dur, maxR });
}
function updateFx(dt) {
  for (const f of fx) {
    if (f.life <= 0) continue;
    f.life -= dt; if (f.life <= 0) { f.s.visible = false; continue; }
    f.vy -= f.g * dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt;
    const k = f.life / f.max; f.s.scale.setScalar(f.size * (0.4 + k)); f.s.material.opacity = k;
  }
  for (const s of shocks) {
    s.t += dt; const k = s.t / s.dur; s.mesh.scale.setScalar(0.5 + k * s.maxR); s.mesh.material.opacity = 1 - k;
    if (k >= 1) { W.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.done = true; }
  }
  shocks = shocks.filter(s => !s.done);
}

// The selfie as a face texture (built once per photo, only when the player has switched photo face on).
let faceTex = null, faceFor = null;
function photoFace() {
  if (!selfieUrl || settings.photoFace === false) return null;
  if (faceFor !== selfieUrl) {
    faceFor = selfieUrl; faceTex?.dispose();
    faceTex = new THREE.CanvasTexture(faceCanvas(selfieUrl, () => { faceTex.needsUpdate = true; }));
    faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  }
  return faceTex;
}
function rebuildAmara() {
  const pos = amara ? amara.root.position.clone() : new THREE.Vector3(P.x, P.y, P.z), rot = amara ? amara.root.rotation.y : 0, vis = amara ? amara.root.visible : true;
  if (amara) W.scene.remove(amara.root);
  amara = makeHeroine(S.look, S.stage, S.gender, weaponLook(), photoFace());
  amara.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  amara.root.position.copy(pos); amara.root.rotation.y = rot; amara.root.visible = vis;
  W.scene.add(amara.root);
  mbe.attach(amara.gear.mbeSlot);
}
// Age decides the challenge and the weapon tier; the equipped weapon decides the attack.
const stageDef = () => STAGES[stageIndex(S?.stage || 'child')];
const stageDiffKey = () => stageDef().diff;
const tier = () => TIERS[stageDef().tier];
const strong = () => stageIndex(stageId()) >= 2; // youth and adult fight alone
const weapon = () => weaponOf(S.weapon);
const weaponLook = () => ({ id: S.weapon, color: tier().color });
const weaponName = () => S.weapon === 'none' ? 'Bare hands' : `${tier().name} ${weapon().name.toLowerCase()}`;
const weaponDmg = () => Math.max(1, Math.round(weapon().dmg * tier().mul * (S.upgrades.includes('staff1') && weapon().kind === 'spin' ? 1.2 : 1)));
const heroColor = () => S?.gender === 'm' ? '#d8553a' : '#e8687a';
function applyDifficulty() {
  diff = DIFFICULTY[stageDiffKey()]; enemies.setDifficulty(diff);
}
function refreshMods() {
  mods = modifiers(S.look, S.upgrades, S.talent, S.stage);
  maxHearts = diff.hearts + mods.hearts; hearts = Math.min(hearts, maxHearts);
  renderHearts();
}

// ---------------- Speakers and dialogue (with choices) ----------------
const SPEAK = {
  grandma: { name: 'Grandma Adaeze', role: 'Storyteller', col: '#7b2d8b', letter: 'A', pitch: 300 },
  papa: { name: 'Papa Ike', role: 'Blacksmith', col: '#3a2a1a', letter: 'I', pitch: 150 },
  mbe: { name: 'Mbe', role: 'Trickster tortoise', col: '#6b5532', letter: 'M', pitch: 330 },
  weaver: { name: 'Weaver Bird', role: 'Thread keeper', col: '#d9a20c', letter: 'W', pitch: 980 },
  tailor: { name: 'Aunty Ngozi', role: 'Boutique', col: '#1f8a70', letter: 'N', pitch: 430 },
  mama: { name: 'Mama Nkem', role: 'Food & groceries', col: '#c0563a', letter: 'N', pitch: 380 },
  hornbill: { name: 'Hornbill', role: 'Race master', col: '#2b2b2b', letter: 'H', pitch: 230 },
  eagle: { name: 'Eagle', role: 'Sky guardian', col: '#6b4423', letter: 'E', pitch: 170 },
  shade: { name: 'Mbe’s Shadow', role: 'All-of-You', col: '#3b1a6a', letter: '?', pitch: 95 },
  stone: { name: 'Tale Stone', role: 'Memory', col: '#8a6a2a', letter: '✦', pitch: 520 },
};
const speaker = who => who === 'amara' ? { name: S.name, role: 'You', col: heroColor(), letter: S.name[0], pitch: S.gender === 'm' ? 330 : 560, photo: selfieUrl } : FRIEND_SPEAK[who] ? FRIEND_SPEAK[who]() : (typeof who === 'object' ? who : SPEAK[who]);
const FRIEND_SPEAK = Object.fromEntries(HEROES.map(h => [h.id, () => ({ name: h.name, role: friendOnline[h.id] ? 'Village friend · online' : 'Village friend · offline', col: h.color, letter: h.name[0], pitch: h.gender === 'm' ? 380 : 600 })]));
const isBoy = () => S?.gender === 'm';
const GENDER_SWAPS = [[/\bmy daughter\b/gi, 'my son'], [/\bdaughter\b/gi, 'son'], [/\bbig girl\b/gi, 'big boy'], [/\blittle girl\b/gi, 'little boy'], [/\bmy girl\b/gi, 'my boy'],
  [/\bher outfit\b/gi, 'his outfit'], [/\band her Papa\b/gi, 'and his Papa'], [/\bmy little girl\b/gi, 'my little boy'], [/\bshe is right\b/gi, 'he is right'], [/\bthat is my girl\b/gi, 'that is my boy'], [/\bsis\b/gi, 'bro'], [/, babe!/g, '!'], [/\bdressed like a festival queen\b/gi, 'dressed like a festival king']];
const keepCase = (m, w) => m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w;
const genderize = t => isBoy() ? GENDER_SWAPS.reduce((a, [re, w]) => a.replace(re, m => keepCase(m, w)), t) : t;
let D = null;
function say(lines, done, focus) {
  D = { lines, i: 0, done, focus, shown: 0, full: '', acc: 0 };
  if (mode !== 'dialogue') prevMode = mode === 'fading' ? 'play' : mode; mode = 'dialogue';
  $('dialogue').hidden = false; $('prompt').hidden = true; showLine();
}
function choose(who, text, options, focus) { say([{ who, text, choices: options }], null, focus); }
function showLine() {
  const l = D.lines[D.i], sp = speaker(l.who);
  $('dName').textContent = sp.name; $('dRole').textContent = sp.role;
  const pt = $('dPortrait'); pt.textContent = sp.photo ? '' : sp.letter; pt.style.background = sp.photo ? `center / cover url(${sp.photo})` : sp.col;
  D.full = genderize(l.text.replaceAll('{name}', S.name)); D.shown = 0; D.acc = 0; D.pitch = sp.pitch; D.focus = l.focus || D.focus;
  $('dText').textContent = '';
  const box = $('dChoices'); box.hidden = true; box.innerHTML = '';
  $('dNext').hidden = !!l.choices;
  if (l.choices) {
    box.innerHTML = l.choices.map((c, i) => `<button data-i="${i}">${isTouch ? '' : `<kbd>${i + 1}</kbd> `}${esc(c.label)}</button>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); pick(+b.dataset.i); });
  }
}
function pick(i) {
  const l = D?.lines[D.i]; if (!l?.choices?.[i]) return;
  const fn = l.choices[i].fn; endDialogue(); audio.play('ui'); fn?.();
}
function endDialogue() { D = null; $('dialogue').hidden = true; mode = prevMode === 'dialogue' ? 'play' : prevMode; }
function advance() {
  if (!D) return;
  if (D.shown < D.full.length) { D.shown = D.full.length; $('dText').textContent = D.full; if (D.lines[D.i].choices) $('dChoices').hidden = false; return; }
  if (D.lines[D.i].choices) return;
  audio.play('ui');
  D.i++;
  if (D.i >= D.lines.length) { const done = D.done; endDialogue(); if (done) done(); return; }
  showLine();
}
function updateDialogue(dt) {
  if (!D) return;
  if (D.shown >= D.full.length) { if (D.lines[D.i].choices) $('dChoices').hidden = false; return; }
  D.acc += dt * (settings.subtitlesSlow ? 26 : 50);
  while (D.acc >= 1 && D.shown < D.full.length) { D.acc--; D.shown++; if (D.shown % 3 === 0 && /\w/.test(D.full[D.shown])) audio.voice(D.pitch); }
  $('dText').textContent = D.full.slice(0, D.shown);
}
function toast(html, secs = 3.4) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); toastT = secs; }

// ---------------- Quests ----------------
const qi = id => questIndex(id);
const atLeast = id => qi(S.quest) >= qi(id);
const mbeJoined = () => atLeast('market');
const solved = id => S.puzzles.includes(id);
const bagHas = id => (S.bag[id] || 0) > 0;
function setQuest(id, force = false) {
  if (!force && qi(id) <= qi(S.quest) && id !== S.quest) return;
  S.quest = id; const q = QUEST[qi(id)];
  $('quest').textContent = q.title; $('qdetail').textContent = q.detail;
  const o = document.querySelector('.objective'); o.classList.remove('qpulse'); void o.offsetWidth; o.classList.add('qpulse');
  updateAbilities(); persist();
}
function updateAbilities() {
  env.abilities = { weave: atLeast('weave'), double: S.feathers >= 1, glide: S.feathers >= 2, updraft: S.feathers >= 3 };
  const a = [];
  if (env.abilities.weave) a.push('TIME WEAVE'); if (mbeJoined()) a.push('MBE ROLL · SNIFF');
  if (env.abilities.double) a.push('DOUBLE JUMP'); if (env.abilities.glide) a.push('GLIDE'); if (env.abilities.updraft) a.push('UPDRAFT');
  $('abilities').innerHTML = a.map(x => `<span>${x}</span>`).join('');
  $('weaveDial').classList.toggle('locked', !env.abilities.weave);
  $('feathers').innerHTML = [0, 1, 2].map(i => `<i class="${i < S.feathers ? 'on' : ''}"></i>`).join('');
  $('mbeChip').hidden = !mbeJoined();
  for (const p of W.sealed) { p.sealed = S.feathers < 3; p.mesh.visible = !p.sealed; }
  W.seal.visible = S.feathers < 3;
  refreshActive();
}
function refreshActive() {
  env.platforms = W.platforms.filter(p => !p.sealed && (p.layer === 'both' || p.layer === layer));
  env.walls = W.walls.filter(w => !w.layer || w.layer === layer);
  if (!solved('gate')) env.walls.push(...gateWalls);
  if (bossWall) env.walls.push(bossWall);
}
function unlock(key, label) {
  if (Array.isArray(key)) { key.forEach(k => { if (k && !S.owned.includes(k)) S.owned.push(k); }); label = Array.isArray(label) ? label[isBoy() ? 1 : 0] : label; key = null; toast(`New look unlocked: <b>${label}</b> — try it at the mirror or from the pause menu.`, 4.5); return; }
  if (!key || S.owned.includes(key)) return;
  S.owned.push(key); toast(`New look unlocked: <b>${label}</b> — try it at the mirror or from the pause menu.`, 4.5);
}
function giveCoins(n, x = P.x, y = P.y + 1.4, z = P.z) { S.cowries += n; sparks(x, y, z, '#fff2c4', 10 + n, 4, 0.35, 0.7, 4); audio.play('cowry', 6); }

function talkGrandma() {
  const g = 'grandma', at = L.NPCS.grandma;
  if (S.quest === 'meet') return say([
    { who: g, text: 'Ah, {name}! And Ike — good, you brought your Papa. Come closer to the fire.' },
    { who: 'papa', text: 'We came as fast as we could, Mama. Somebody changed her outfit three times.' },
    { who: 'amara', text: 'Papa! A storyteller has to look the part.' },
    { who: g, text: 'She is right, Ike. Now listen. The Sky Feast, where the birds once dined, is fading. Something greedy sits at that table again.' },
    { who: g, text: 'Take this Story Calabash, {name}. Shake it, and you will slip between Now and Story-time… and wake whoever is sleeping inside.' },
    { who: g, text: isTouch ? 'Go on. Tap the moon button.' : 'Go on. Press Q.' },
  ], () => { setQuest('weave'); audio.play('feather'); toast('<b>Story Calabash</b> received — ' + (isTouch ? 'tap ☾' : 'press Q') + ' to Weave time'); }, at);
  if (S.quest === 'soup' || (S.quest === 'market' && GROCERY_LIST.every(bagHas))) return say([
    { who: g, text: 'Egusi, palm oil, peppers and ugu… perfect, my child! The soup will be ready when you come home.' },
    { who: g, text: 'Take this jollof rice for the road — two plates, one for you and one for your Papa. And ten cowries for being so quick.' },
    { who: 'mbe', text: 'Did someone say jollof? I am… asking for a friend.' },
    { who: g, text: 'Behave, Mbe. Now, {name}: Weaver Bird in the baobab has lost her golden threads. Help her and she may trust you with a feather.' },
  ], () => { for (const id of GROCERY_LIST) S.bag[id] = Math.max(0, (S.bag[id] || 0) - 1); S.bag.jollof = (S.bag.jollof || 0) + 2; giveCoins(10); setQuest('weaver', true); }, at);
  const lines = {
    weave: 'Shake the calabash, child. ' + (isTouch ? 'Tap the moon.' : 'Press Q.'),
    market: `Mama Nkem’s stall is in the market, east of the fire. I still need: ${GROCERY_LIST.filter(id => !bagHas(id)).map(id => shopItem(id).name).join(', ') || 'nothing — bring them here!'}.`,
    weaver: 'Weaver Bird is in the baobab, west of the fire. Fussy, but fair. And your Papa is right there — press C to talk to him.', threads: 'Check high places, Story-time… and that drum circle past the huts. The elder drum always has a riddle.',
    return1: 'All the threads? Then hurry back to Weaver Bird.', river: 'Hornbill lives past the river. He loves an audience — and a race.',
    race: 'Hornbill’s rings are in the gold savanna. Fly true!', canyon: 'There is an old stone gate in the canyon. It opens only for two — good thing you brought your Papa.',
    hawks: 'Drum, throw Mbe, then spin. The hawks only fear you in Story-time.', climb: 'The Sky Baobab is open. Climb, my child. The whole village is listening.',
    boss: 'Wait for the shadow to tire. Then strike in Story-time!', done: 'You did what the old trickster never could: you shared. Every crack in a shell holds a story.',
  };
  say([{ who: g, text: lines[S.quest] || 'Go well.' }, { who: g, text: `You have found ${S.tales.length} of 6 Tale Stones. ${S.tales.length < 6 ? 'Each one remembers a piece of the old tale.' : 'You know the whole tale now.'}` }], null, at);
}
function mbeWakes() {
  say([
    { who: 'mbe', text: 'WHO SHOOK ME? I was having the loveliest dream about pounded yam…' },
    { who: 'amara', text: 'A talking tortoise… in Grandma’s calabash?' },
    { who: 'mbe', text: 'Not just any tortoise. I am Mbe. Yes, THAT Mbe — the one from the feast in the sky. The cracked shell. The borrowed feathers. Hello.' },
    { who: 'grandma', text: 'The old trickster himself. His greed from that day never left the sky. Mbe, you will help this child set it right.' },
    { who: 'mbe', text: 'Fine, fine. I will ride in your basket. Press R and I roll out like a cannonball. Press G and I sniff out buried treasure. My nose is excellent. Ask anyone.' },
    { who: 'papa', text: 'And I will be right behind you. Call me any time' + (isTouch ? ' (tap my name at the top)' : ' (press C)') + ' — I can lift you, hold things down, and fix up your gear at my forge.' },
    { who: 'grandma', text: 'But first, I promised your Papa egusi soup. Run to Mama Nkem’s stall and buy egusi, palm oil, peppers and ugu. Here are six cowries.' },
  ], () => { mbe.show(); giveCoins(6); setQuest('market'); toast('<b>Mbe</b> joined! ' + (isTouch ? 'Tap Mbe to throw · Sniff to find treasure' : 'R to throw · G to sniff')); }, L.NPCS.grandma);
}
function talkMama() {
  if (!S.puzzles.includes('metMama')) {
    S.puzzles.push('metMama');
    return say([
      { who: 'mama', text: 'Welcome, my darling! Puff-puff, akara, suya, jollof… and the freshest groceries in the village.' },
      { who: 'mama', text: 'Food heals you on the road. Zobo keeps your spin fresh, chin chin puts wind in your feet. What will it be?' },
    ], () => openShop('market'), L.NPCS.mama);
  }
  openShop('market');
}
function talkTailor() {
  if (!S.puzzles.includes('metNgozi')) {
    S.puzzles.push('metNgozi');
    return say([
      { who: 'tailor', text: 'Look at you! Come, come. Ankara, Kente, Akwete, Bogolan — every cloth tells its own story, and every piece has a little magic.' },
      { who: 'tailor', text: 'Cowries buy cloth. Some special pieces cannot be bought — those you must find on your adventure.' },
    ], () => openWardrobe(true), L.NPCS.tailor);
  }
  openWardrobe(true);
}
function talkWeaver() {
  const w = 'weaver', at = { x: -13, z: -8 }, n = S.threads.length;
  const reward = () => say([
    { who: w, text: 'You found them ALL! And the tortoise did not eat a single thing. Remarkable.' },
    { who: 'mbe', text: 'I have changed. Mostly.' },
    { who: w, text: 'Here — a feather, freely given. With it, you can jump again in mid-air. Hornbill lives across the river. Hop the stepping stones — you will need that second jump!' },
  ], () => { S.feathers = Math.max(S.feathers, 1); audio.play('feather'); sparks(P.x, P.y + 1.5, P.z, '#f2c21b', 30, 7); setQuest('river'); toast('<b>Weaver’s feather</b> — Double Jump unlocked. ' + (isTouch ? 'Tap Jump twice.' : 'Press Space twice.'), 4.5); }, at);
  if (!atLeast('weaver')) return say([{ who: w, text: 'Tweet? Go and see Grandma Adaeze first, little one. She has been calling for you.' }], null, at);
  if (S.quest === 'weaver') {
    if (n >= 5) return reward();
    return say([
      { who: w, text: 'Tweet! A TORTOISE? The last time I lent that tortoise a feather, he ate my dinner!' },
      { who: 'mbe', text: 'In my defence, it was a very good dinner.' },
      { who: w, text: 'Hmph. My five golden threads blew away in the Harmattan wind. One is locked in the drum chest past the huts, one floats in Story-time near the north path.' },
      { who: w, text: 'Find them all and perhaps — PERHAPS — I will trust you.' },
    ], () => setQuest(n >= 5 ? 'return1' : 'threads'), at);
  }
  if (S.quest === 'threads') return say([{ who: w, text: `Still ${5 - n} thread${5 - n === 1 ? '' : 's'} missing! Try the market crates, behind the huts, the drum circle… and Story-time.` }], null, at);
  if (S.quest === 'return1') return reward();
  say([{ who: w, text: 'My threads have never looked so fine. Fly well, {name}!' }], null, at);
}
function talkHornbill() {
  const h = 'hornbill', pos = L.NPCS.hornbill;
  if (race.on) return;
  if (S.quest === 'river') return say([
    { who: h, text: 'HONK! A visitor! Do you know who I am? The fastest beak in the whole savanna!' },
    { who: h, text: 'You want my feather? Feathers are for the FAST. Fly through all eight of my rings before the drum stops.' },
    { who: 'papa', text: 'Go on, {name}! I will cheer from here.' },
    { who: h, text: 'The next ring always glows brightest. Ready? GO!' },
  ], () => { setQuest('race'); startRace(false); papa.cheer(); }, pos);
  if (S.quest === 'race') return say([{ who: h, text: 'Again? Wonderful! The rings are glowing. GO!' }], () => startRace(false), pos);
  if (atLeast('canyon')) return say([{ who: h, text: S.raceBest ? `Your best time is ${S.raceBest.toFixed(1)} seconds. Fancy beating it? GO!` : 'Fancy a practice run? GO!' }], () => startRace(true), pos);
  say([{ who: h, text: 'HONK! Come back when Weaver Bird vouches for you.' }], null, pos);
}
function talkEagle() {
  const e = 'eagle', pos = L.NPCS.eagle;
  if (S.quest === 'canyon') return say([
    { who: e, text: 'Little one. You opened the old gate and crossed my canyon. And you brought… Mbe. Hm.' },
    { who: 'mbe', text: 'Hello, Eagle. Lovely to see you. Please do not drop me.' },
    { who: e, text: 'Shadow hawks have nested in the canyon’s memory. They hunt only in Story-time.' },
    { who: e, text: 'Slip into Story-time. Beat your drum or throw the tortoise to stun them, then spin into them. Drive out all three.' },
  ], () => { setQuest('hawks'); enemies.activateQuestHawks(); toast('Defeat <b>3 shadow hawks</b> in Story-time'); }, pos);
  if (S.quest === 'hawks') return say([{ who: e, text: `${enemies.questHawksLeft()} shadow hawks remain. Story-time. Stun. Spin.` }], null, pos);
  if (atLeast('climb')) return say([{ who: e, text: 'The wind is with you. The Sky Baobab is open.' }], null, pos);
  say([{ who: e, text: '…' }], null, pos);
}
function eagleReward() {
  say([
    { who: 'eagle', text: 'It is done. The sky remembers your family kindly now.' },
    { who: 'eagle', text: 'My feather lets you ride the warm winds while gliding. Look for the rising golden motes.' },
    { who: 'papa', text: 'I cannot climb like you, my daughter, but I will find my way up. I always do.' },
    { who: 'eagle', text: 'The Sky Baobab opens for you. Climb, and face what sits at the feast.' },
  ], () => {
    S.feathers = 3; audio.play('feather'); sparks(P.x, P.y + 1.5, P.z, '#c08a50', 30, 7);
    setQuest('climb'); unlock('acc:crown', 'Feather crown');
    sparks(L.BAOBAB.x, L.BAOBAB.y + 4, L.BAOBAB.z + 8, '#7dff9a', 60, 9, 0.7, 1.2);
  }, L.NPCS.eagle);
}
function talkVillager(v) {
  const who = { name: v.name, role: 'Villager', col: '#c0563a', letter: v.name[0], pitch: v.kind === 'kid' ? 620 : v.kind === 'man' ? 200 : 400 };
  const has = k => S.errands.includes(k);
  if (v.id === 'kelechi') {
    const E = L.ERRANDS.ball;
    if (has('ball:done')) return say([{ who, text: v.lines[(v.li = ((v.li ?? -1) + 1) % v.lines.length)] }], null, v);
    if (has('ball:got')) return say([{ who, text: E.thanks }], () => { S.errands.push('ball:done'); giveCoins(E.reward); persist(); }, v);
    if (!has('ball:start')) return say([{ who, text: E.ask }, { who: 'mbe', text: 'A lost ball? My nose is on the case. Press G near the river.' }], () => { S.errands.push('ball:start'); toast(`Errand: <b>${E.title}</b>`); }, v);
    return say([{ who, text: 'It went towards the river, near the reeds. Please hurry!' }], null, v);
  }
  if (v.id === 'funke') {
    const E = L.ERRANDS.suya;
    if (has('suya:done')) return say([{ who, text: v.lines[(v.li = ((v.li ?? -1) + 1) % v.lines.length)] }], null, v);
    if (has('suya:start') && bagHas('suya')) return say([{ who, text: E.thanks }], () => { S.bag.suya--; S.errands.push('suya:done'); giveCoins(E.reward); unlock(E.unlock, 'Round glasses'); persist(); }, v);
    if (!has('suya:start')) return say([{ who, text: E.ask }], () => { S.errands.push('suya:start'); toast(`Errand: <b>${E.title}</b> — Mama Nkem sells suya`); }, v);
    return say([{ who, text: 'Mama Nkem’s suya is the best — six cowries a stick. I am fading away here!' }], null, v);
  }
  say([{ who, text: v.lines[(v.li = ((v.li ?? -1) + 1) % v.lines.length)] }, { who, text: 'Watch out for Greedlings — purple pests that snatch cowries. Spin or throw Mbe at them to get your cowries back!' }], null, v);
}

// Papa's menu adapts to her age: beside a child he lifts, waits and follows; for a teenager or youth he is called in.
function talkPapa() {
  const pos = { x: papa.S.x, z: papa.S.z, y: papa.S.y }, st = stageId(), present = papa.S.mode === 'follow' || papa.S.mode === 'help' || papa.S.mode === 'hold';
  const opts = [];
  if (present || st === 'child') opts.push({ label: 'Lift me up!', fn: papaLift });
  if (st === 'child') opts.push({ label: papa.S.mode === 'follow' ? 'Wait here, Papa' : 'Follow me, Papa', fn: togglePapa });
  else if (papa.S.mode === 'home') opts.push({ label: 'Come with me!', fn: () => summon(papa) });
  else opts.push({ label: 'Thanks, Papa — you can go home', fn: () => sendHome(papa, 'Papa heads back to his forge.') });
  opts.push({ label: S.papaFights ? 'Let me fight my own battles' : 'Help me fight again', fn: () => { S.papaFights = !S.papaFights; papa.S.fights = S.papaFights; toast(S.papaFights ? 'Papa will fight beside you again (he takes a share of what he beats).' : 'Papa will stay out of fights — every reward is yours.', 3); persist(); } });
  opts.push({ label: 'Any advice?', fn: papaAdvice }, { label: 'Upgrade my gear', fn: () => openShop('forge') }, { label: 'Never mind' });
  choose('papa', st === 'child' ? 'What do you need, my daughter?' : st === 'teen' ? 'My big girl! What do you need?' : st === 'youth' ? 'Look at you, all grown up. How can your old Papa help?' : 'My grown-up child — the whole village asks for YOUR help now. What can I do?', opts, pos);
}
function papaLift() {
  papa.S.face = Math.atan2(P.x - papa.S.x, P.z - papa.S.z); papa.lift();
  P.vy = T.papaLift; P.grounded = false; P.groundId = null; P.jumps = 1; liftedT = 0.7;
  audio.play('double'); sparks(P.x, P.y + 0.5, P.z, '#ffd35a', 16, 4);
}
function togglePapa() {
  if (papa.S.mode === 'follow') { papa.S.mode = 'wait'; toast('Papa will wait here. Press <b>C</b> or talk to him to call him back.'); }
  else { papa.S.mode = 'follow'; papa.S.hold = null; toast('Papa is following you.'); }
}
function papaAdvice() {
  const tips = [];
  const near = (o, r) => Math.hypot(o.x - P.x, o.z - P.z) < r;
  const lift = L.LIFTS.find(l => !S.chests.includes(l.id) && near(l, 30));
  if (lift) tips.push('See that tall rock pillar with a chest on top? Stand next to it, call me and say “Lift me up” — I will toss you higher than any jump.');
  if (W.digs.some(d => !d.dug && near(d, 40))) tips.push('Mbe’s nose is sharper than mine. Press G and watch for golden light — then dig there with E.');
  if (hearts < maxHearts && Object.keys(S.bag).some(k => shopItem(k)?.heal && S.bag[k] > 0)) tips.push('You look tired. Eat something — press H for a quick snack.');
  if (S.quest === 'market') tips.push('Mama Nkem sells the groceries. If you are short of cowries, look around the fire and along the north path.');
  if (S.quest === 'threads' && !solved('drums')) tips.push('That drum circle past the huts… strike the elder drum and listen. Then hit the drum stones in the same order — jump on them, spin into them, or throw Mbe.');
  if (S.quest === 'canyon' && !solved('gate')) tips.push('The canyon gate has two plates. Stand by one and press E to ask me to hold it, then you stand on the other.');
  if (S.quest === 'hawks') tips.push('Hawks swoop low when they attack. Stun them, and if one falls near me, I will flatten it with my hammer.');
  if (S.upgrades.length < 2) tips.push('Bring me cowries and I can strengthen your staff or weave you a better basket for Mbe.');
  if (S.weapons.length < 3) tips.push('My forge sells weapons too: a catapult for anyone, a spear for teenagers and an idà sword for youths and adults. As you grow, I forge them in iron, bronze and gold.');
  tips.push('Whatever happens, I am proud of you.');
  say([{ who: 'papa', text: tips[0] }, ...(tips[1] && tips[1] !== tips.at(-1) ? [{ who: 'papa', text: tips[1] }] : [])], null, papa.S);
}

// ---------------- Paid jobs ----------------
const jobRecipient = j => j.to === 'friend' ? 'tehilah' : j.to;
const whoName = id => PERSONAS[id]?.name || id;
function currentJob() { const j = S.job && JOBS.find(x => x.id === S.job.id); return j ? { ...j, to: jobRecipient(j), toName: whoName(jobRecipient(j)), giverName: whoName(j.giver) } : null; }
function offerFor(giver) {
  const list = JOBS.filter(j => j.giver === giver && j.id !== S.lastJob);
  if (!list.length) return null; const j = list[(S.jobsDone + giver.length) % list.length];
  return { ...j, to: jobRecipient(j), toName: whoName(jobRecipient(j)) };
}
function acceptJob(id) { S.job = { id }; const j = currentJob(); toast(`Job: take <b>${j.item}</b> to <b>${j.toName}</b> for ◈${j.reward}`, 4); audio.play('ui'); persist(); }
function deliverJob() { const j = currentJob(); if (!j) return; S.job = null; S.lastJob = j.id; S.jobsDone++; giveCoins(j.reward); toast(`Delivered! <b>+${j.reward} cowries</b>`, 2.5); persist(); }
const jobLabel = (who, label) => currentJob()?.to === who ? `Deliver ${currentJob().item}` : label;
function jobOr(who, fn) { if (currentJob()?.to === who) { say([{ who: PERSONAS[who] && !FRIEND_SPEAK[who] && SPEAK[who] ? who : { name: whoName(who), role: 'Villager', col: '#c0563a', letter: whoName(who)[0], pitch: 420 }, text: `Ah, ${currentJob().item}! Thank you. Here are your cowries.` }], deliverJob); return; } fn(); }

// ---------------- Race ----------------
function startRace(practice) {
  race = { on: true, idx: 0, t: diff.raceTime, practice, start: time };
  for (const r of W.rings) r.mat.opacity = 0.35;
  $('race').hidden = false; audio.play('checkpoint');
}
function endRace(won) {
  race.on = false; $('race').hidden = true;
  for (const r of W.rings) r.mat.opacity = 0.25;
  if (!won) { audio.play('deny'); toast('The drum stopped! Talk to <b>Hornbill</b> to try again.'); return; }
  const secs = time - race.start;
  const best = !S.raceBest || secs < S.raceBest; if (best) S.raceBest = secs;
  audio.play('win'); papa.cheer();
  if (race.practice) { toast(`Ring race: <b>${secs.toFixed(1)}s</b>${best ? ' — new record!' : ''}`); persist(); return; }
  say([
    { who: 'hornbill', text: `MAGNIFICENT! ${secs.toFixed(1)} seconds! I shall tell everyone I taught you.` },
    { who: 'hornbill', text: 'My feather is yours. Hold Jump while falling to glide on the warm air.' },
    { who: 'hornbill', text: 'Eagle watches from the canyon’s end. Beware the dust devils… and anything that appears only in Story-time.' },
  ], () => { S.feathers = Math.max(S.feathers, 2); audio.play('feather'); setQuest('canyon'); toast('<b>Hornbill’s feather</b> — Glide unlocked. Hold Jump in the air.', 4.5); }, L.NPCS.hornbill);
}

// ---------------- Drum riddle ----------------
let riddle = { phase: 'idle', t: 0, step: 0, input: 0 };
function startRiddle() {
  if (solved('drums')) return toast('The drum chest is already open.');
  if (!S.puzzles.includes('heardRiddle')) {
    S.puzzles.push('heardRiddle');
    return say([
      { who: 'mbe', text: 'The elder drum speaks in riddles. Listen to the rhythm, then strike the drum stones in the same order.' },
      { who: 'mbe', text: 'Jump onto a stone, spin into it, or throw me at it. Gently, please.' },
    ], startRiddle, L.DRUM_CIRCLE);
  }
  riddle = { phase: 'play', t: -0.4, step: 0, input: 0 };
  audio.play('drum'); W.elderDrum.skin.emissiveIntensity = 1;
}
function strikeDrum(i) {
  const d = W.drumStones[i]; d.flash = 0.35; audio.tone(d.pitch);
  sparks(d.x, d.y + 1.1, d.z, d.color, 8, 3, 0.35, 0.5, 2);
  if (riddle.phase !== 'input') return;
  if (L.DRUM_PATTERN[riddle.input] === i) {
    riddle.input++;
    if (riddle.input >= L.DRUM_PATTERN.length) {
      riddle.phase = 'idle'; S.puzzles.push('drums'); audio.play('win');
      openChest('drumchest'); toast('Riddle solved! The <b>drum chest</b> opens.'); persist();
    }
  } else { riddle.phase = 'idle'; audio.play('deny'); toast('Not quite… strike the <b>elder drum</b> (E) to hear it again.'); }
}
function updateRiddle(dt) {
  for (const d of W.drumStones) { d.flash = Math.max(0, (d.flash || 0) - dt); d.skin.emissiveIntensity = 0.15 + d.flash * 4; d.group.scale.y = 1 - d.flash * 0.15; }
  W.elderDrum.skin.emissiveIntensity = Math.max(0.1, W.elderDrum.skin.emissiveIntensity - dt);
  if (riddle.phase === 'play') {
    riddle.t += dt;
    if (riddle.t >= riddle.step * 0.65 && riddle.step < L.DRUM_PATTERN.length) { const i = L.DRUM_PATTERN[riddle.step]; W.drumStones[i].flash = 0.5; audio.tone(W.drumStones[i].pitch); riddle.step++; }
    if (riddle.t > L.DRUM_PATTERN.length * 0.65 + 0.3) { riddle.phase = 'input'; riddle.input = 0; toast('Your turn! Strike the stones in the same order.', 2.5); }
  }
}

// ---------------- Chests, digging, errands ----------------
function openChest(id) {
  const c = W.chests[id]; if (!c || c.opened) return;
  c.opened = true; if (!S.chests.includes(id)) S.chests.push(id);
  audio.play('buy'); sparks(c.x, c.y + 0.8, c.z, '#ffd35a', 34, 6, 0.5, 1);
  if (c.coins) giveCoins(c.coins, c.x, c.y + 1, c.z);
  if (c.item) { S.bag[c.item] = (S.bag[c.item] || 0) + 1; toast(`Found <b>${shopItem(c.item).name}</b>!`); }
  if (c.unlock) unlock(c.unlock, c.name);
  if (id === 'drumchest') { const t = W.threads.find(t => t.id === 't5'); t.group.visible = !t.taken; }
  persist();
}
function sniff() {
  if (!mbeJoined()) return;
  if (sniffCd > 0 || mbe.S.state !== 'pack') return audio.play('deny');
  sniffCd = T.sniffCooldown;
  const range = T.sniffRange * (mods.sniff || 1) * (bagHas('map') ? 2 : 1);
  let n = 0;
  for (const d of W.digs) if (!d.dug && Math.hypot(d.x - P.x, d.z - P.z) < range) { d.revealed = 40; n++; }
  if (!W.ball.taken && Math.hypot(W.ball.x - P.x, W.ball.z - P.z) < range) { W.ball.revealed = 40; n++; }
  audio.play('screech'); sparks(P.x, P.y + 1.4, P.z, '#7fe9ff', 14, 3, 0.35, 0.6, 1);
  shock(P.x, P.y + 0.3, P.z, '#7fe9ff', range * 0.3, 0.8);
  toast(n ? `Mbe: “Sniff sniff… <b>${n}</b> thing${n > 1 ? 's' : ''} nearby! Follow the golden light.”` : 'Mbe: “Nothing nearby. Try somewhere else.”', 2.6);
}
function dig(d) {
  d.dug = true; d.revealed = 0; S.dug.push(d.id);
  audio.play('splash'); sparks(d.x, d.y + 0.5, d.z, '#b07a4a', 24, 5, 0.5, 0.8);
  d.mound.scale.y = 0.08;
  if (d.coins) giveCoins(d.coins, d.x, d.y + 1, d.z);
  if (d.item) { S.bag[d.item] = (S.bag[d.item] || 0) + 1; toast(`Dug up <b>${shopItem(d.item).name}</b> and ${d.coins} cowries!`); }
  else if (!d.unlock) toast(`Buried treasure: <b>${d.coins} cowries</b>!`);
  if (d.unlock) unlock(d.unlock, d.name);
  persist();
}

// ---------------- Bag, food, shops ----------------
function eat(id) {
  const it = shopItem(id); if (!it || !bagHas(id)) return false;
  if (it.heal && hearts >= maxHearts && !it.energy) { toast('You are already full of energy!'); return false; }
  S.bag[id]--;
  if (it.heal) { hearts = Math.min(maxHearts, hearts + it.heal); renderHearts(); }
  if (it.energy) P.energy = 1;
  if (it.buff === 'zobo') buffs.zobo = 60; if (it.buff === 'chinchin') buffs.chinchin = 45;
  audio.play('kola'); sparks(P.x, P.y + 1.3, P.z, '#ff8a6a', 12, 3);
  toast(`Yum! <b>${it.name}</b>`, 1.6); persist(); return true;
}
function quickEat() {
  const foods = [...SHOP.food, ...DISHES].filter(f => bagHas(f.id));
  if (!foods.length) return toast('Your bag has no food. Visit <b>Mama Nkem</b> at the market.');
  const missing = maxHearts - hearts;
  const pickF = missing > 0 ? foods.filter(f => f.heal).sort((a, b) => Math.abs(a.heal - missing) - Math.abs(b.heal - missing))[0] : foods.find(f => f.energy || f.buff);
  if (!pickF) return toast('Nothing to eat right now.');
  eat(pickF.id);
}
let shopTab = 'food';
function openShop(kind) {
  const render = () => {
    const purse = `<span class="purse">◈ ${S.cowries}</span>`;
    if (kind === 'forge') {
      const wRows = WEAPONS.filter(w => w.cost > 0).map(w => {
        const own = S.weapons.includes(w.id), locked = stageIndex(S.stage) < stageIndex(w.minStage), can = !own && !locked && S.cowries >= w.cost;
        return `<div class="shop-row"><span class="ic">${w.kind === 'shoot' ? '⟟' : w.kind === 'thrust' ? '↟' : '⚔'}</span><div><b>${w.name}${own ? `<span class="own">${S.weapon === w.id ? 'equipped' : 'owned'}</span>` : ''}</b><small>${w.note} · damage ${w.dmg}${locked ? ` · unlocks at ${STAGES[stageIndex(w.minStage)].name}` : ''}</small></div>${own ? (S.weapon === w.id ? '<button class="btn" disabled>Equipped</button>' : `<button class="btn gold" data-eq="${w.id}">Equip</button>`) : `<button class="btn ${can ? 'gold' : ''}" data-w="${w.id}" ${can ? '' : 'disabled'}>◈ ${w.cost}</button>`}</div>`;
      }).join('');
      $('pBody').innerHTML = `${purse}<h2>Papa’s forge</h2><p>“Bring me cowries and I will make your gear stronger. You are a ${stageDef().name.toLowerCase()}, so I forge in <b>${tier().name.toLowerCase()}</b>.”</p><h3>Weapons</h3><div class="shop-list">${wRows}</div><h3>Upgrades</h3><div class="shop-list">${FORGE.map(f => {
        const own = S.upgrades.includes(f.id), locked = f.need && !S.upgrades.includes(f.need);
        return `<div class="shop-row"><span class="ic">⚒</span><div><b>${f.name}</b><small>${f.note}${locked ? ' · needs the first upgrade' : ''}</small></div>${own ? '<button class="btn" disabled>Owned</button>' : `<button class="btn ${S.cowries >= f.cost && !locked ? 'gold' : ''}" data-f="${f.id}" ${S.cowries >= f.cost && !locked ? '' : 'disabled'}>◈ ${f.cost}</button>`}</div>`;
      }).join('')}</div>`;
      $('pBody').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const w = weaponOf(b.dataset.w); if (S.cowries < w.cost) return; S.cowries -= w.cost; S.weapons.push(w.id); equip(w.id); audio.play('buy'); shock(papa.S.x, papa.S.y + 1, papa.S.z, '#ff9a40', 3); render(); });
      $('pBody').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { equip(b.dataset.eq); render(); });
      $('pBody').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const f = FORGE.find(x => x.id === b.dataset.f); if (S.cowries < f.cost) return; S.cowries -= f.cost; S.upgrades.push(f.id); refreshMods(); audio.play('buy'); shock(papa.S.x, papa.S.y + 1, papa.S.z, '#ff9a40', 3); persist(); render(); });
      return;
    }
    const groups = { food: 'Food', groceries: 'Groceries', items: 'Items', sell: 'Sell' };
    $('pBody').innerHTML = `${purse}<h2>Mama Nkem’s stall</h2><div class="shop-tabs">${Object.entries(groups).map(([k, n]) => `<button class="${k === shopTab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      ${shopTab === 'groceries' ? `<ul class="checklist">${GROCERY_LIST.map(id => `<li class="${bagHas(id) ? 'ok' : ''}">${bagHas(id) ? '✓ ' : ''}${shopItem(id).name}</li>`).join('')}</ul>` : ''}
      ${shopTab === 'sell' ? `<p>Mama Nkem buys fish and home-cooked dishes.</p><div class="shop-list">${[...FISH, ...DISHES].filter(it => it.sell > 0 && bagHas(it.id)).map(it => `<div class="shop-row"><span class="ic">${it.icon}</span><div><b>${it.name}<span class="own">×${S.bag[it.id]}</span></b><small>${it.note}</small></div><button class="btn gold" data-sell="${it.id}">Sell ◈ ${it.sell}</button></div>`).join('') || '<p class="note">Nothing to sell yet. Catch fish at the river jetty or cook at the village pot.</p>'}</div>` : ''}
      <div class="shop-list">${(SHOP[shopTab] || []).map(it => {
        const n = S.bag[it.id] || 0, soldOut = it.once && n > 0, can = S.cowries >= it.cost && !soldOut;
        return `<div class="shop-row"><span class="ic">${it.icon}</span><div><b>${it.name}${n ? `<span class="own">×${n} in bag</span>` : ''}</b><small>${it.note}</small></div><button class="btn ${can ? 'gold' : ''}" data-buy="${it.id}" ${can ? '' : 'disabled'}>${soldOut ? 'Owned' : `◈ ${it.cost}`}</button></div>`;
      }).join('')}</div>`;
    $('pBody').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { shopTab = b.dataset.tab; audio.play('ui'); render(); });
    $('pBody').querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const it = shopItem(b.dataset.sell); if (!bagHas(it.id)) return; S.bag[it.id]--; if (!S.bag[it.id]) delete S.bag[it.id]; giveCoins(it.sell); bump('sellToday'); persist(); render(); });
    $('pBody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const it = shopItem(b.dataset.buy); if (S.cowries < it.cost) return;
      S.cowries -= it.cost; S.bag[it.id] = (S.bag[it.id] || 0) + 1; audio.play('buy');
      if (S.quest === 'market' && GROCERY_LIST.every(bagHas)) { setQuest('soup'); toast('All the groceries! Take them to <b>Grandma</b>.', 4); }
      persist(); render();
    });
  };
  if (kind === 'market' && S.quest === 'market') shopTab = 'groceries';
  openPanel(kind === 'forge' ? 'PAPA’S FORGE' : 'MARKET', '', render);
}
function equip(id) {
  if (!S.weapons.includes(id)) return;
  S.weapon = id; rebuildAmara(); audio.play('clang'); toast(`Equipped: <b>${weaponName()}</b>`, 2); persist();
}
function openBag() {
  const render = () => {
    const foods = [...SHOP.food, ...DISHES].filter(f => bagHas(f.id)), items = SHOP.items.filter(f => bagHas(f.id)), groc = SHOP.groceries.filter(f => bagHas(f.id)), fish = FISH.filter(f => bagHas(f.id));
    $('pBody').innerHTML = `<span class="purse">◈ ${S.cowries}</span><h2>${esc(S.name)}’s bag</h2>
      <h3>Food</h3>${foods.length ? `<div class="shop-list">${foods.map(f => `<div class="shop-row"><span class="ic">${f.icon}</span><div><b>${f.name} <span class="own">×${S.bag[f.id]}</span></b><small>${f.note}${f.heal ? ` · +${f.heal > 9 ? 'all' : f.heal} heart${f.heal > 1 ? 's' : ''}` : ''}</small></div><button class="btn gold" data-eat="${f.id}">Eat</button></div>`).join('')}</div>` : '<p>No food yet. Mama Nkem’s stall is east of the fire.</p>'}
      ${fish.length ? `<h3>Fish</h3><ul class="checklist">${fish.map(g => `<li class="ok">${g.icon} ${g.name} ×${S.bag[g.id]}</li>`).join('')}</ul>` : ''}
      ${groc.length ? `<h3>Groceries</h3><ul class="checklist">${groc.map(g => `<li class="ok">${g.name} ×${S.bag[g.id]}</li>`).join('')}</ul>` : ''}
      ${items.length ? `<h3>Items</h3><ul class="checklist">${items.map(g => `<li class="ok">${g.name}</li>`).join('')}</ul>` : ''}
      <h3>Weapon</h3><div class="shop-list">${S.weapons.map(id => { const w = weaponOf(id); return `<div class="shop-row"><span class="ic">${id === 'none' ? '✋' : w.kind === 'shoot' ? '⟟' : w.kind === 'thrust' ? '↟' : '⚔'}</span><div><b>${id === 'none' ? w.name : `${tier().name} ${w.name.toLowerCase()}`}</b><small>${w.note}</small></div>${S.weapon === id ? '<button class="btn" disabled>Equipped</button>' : `<button class="btn gold" data-eq="${id}">Equip</button>`}</div>`; }).join('')}</div>
      <p class="note">More weapons at Papa’s forge. Growing older upgrades every weapon: wooden → iron → bronze → gold.</p>
      <h3>Gear</h3><ul class="checklist">${S.upgrades.length ? S.upgrades.map(u => `<li class="ok">${FORGE.find(f => f.id === u).name}</li>`).join('') : '<li>Visit Papa’s forge to upgrade</li>'}</ul>
      <p class="note">Treasure found: ${S.dug.length}/${W.digs.length} buried · ${S.chests.length}/${Object.keys(W.chests).length} chests</p>`;
    $('pBody').querySelectorAll('[data-eat]').forEach(b => b.onclick = () => { eat(b.dataset.eat); render(); });
    $('pBody').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { equip(b.dataset.eq); render(); });
  };
  openPanel('BAG', '', render);
}

// ---------------- Chat ----------------
// Three channels: Nearby (whoever can hear her), Papa & Mbe, and Friends (the other heroines, plus real players online).
const CHAT = { open: false, channel: 'near', logs: { near: [], family: [], friends: [] }, unread: { near: 0, family: 0, friends: 0 }, turns: {}, lastSend: 0, sample: null, room: null, peers: [] };
const CHANNELS = { near: 'Nearby', family: 'Papa & Mbe', friends: 'Friends' };
const QUICK = { near: ['What should I do?', 'Can I help you?', 'How do I earn coins?', 'Tell me a joke'], family: ['What next, Papa?', 'Come and help me!', 'Mbe, find treasure', 'When do I grow up?'], friends: ['Hi!', 'Come and help me!', 'What are you wearing?', 'Any tips?'] };
let bubble = null;
function openChat(channel = CHAT.channel, focusFriend = null) {
  if (mode !== 'play') return;
  CHAT.open = true; CHAT.channel = channel; CHAT.unread[channel] = 0; CHAT.focus = focusFriend;
  $('chat').hidden = false; renderChat(); setTimeout(() => $('chatInput').focus(), 0);
}
function closeChat() { CHAT.open = false; $('chat').hidden = true; $('chatInput').blur(); canvas.focus(); }
function chatPush(ch, m) { const log = CHAT.logs[ch]; log.push(m); if (log.length > 60) log.shift(); if (!(CHAT.open && CHAT.channel === ch)) CHAT.unread[ch]++; if (CHAT.open) renderChat(); }
function renderChat() {
  $('chatTabs').innerHTML = Object.entries(CHANNELS).map(([k, n]) => `<button role="tab" aria-selected="${k === CHAT.channel}" class="${k === CHAT.channel ? 'on' : ''}" data-ch="${k}">${n}${CHAT.unread[k] ? `<span class="dot">${CHAT.unread[k]}</span>` : ''}</button>`).join('');
  $('chatTabs').querySelectorAll('button').forEach(b => b.onclick = () => { CHAT.channel = b.dataset.ch; CHAT.unread[CHAT.channel] = 0; renderChat(); $('chatInput').focus(); });
  const fr = $('chatFriends'); fr.hidden = CHAT.channel !== 'friends';
  if (CHAT.channel === 'friends') renderFriends(fr);
  $('chatLog').innerHTML = CHAT.logs[CHAT.channel].map(m => `<div class="msg ${m.cls || ''}">${m.name ? `<b>${esc(m.name)}</b>` : ''}${esc(m.text)}${m.join ? ` <button class="btn gold mini" data-join="${esc(m.join)}">Join</button>` : ''}</div>`).join('') || `<div class="msg sys">${CHAT.channel === 'near' ? 'Say hello to whoever is near you. Ask “what should I do?” if you are stuck, or “can I help?” to earn cowries.' : CHAT.channel === 'family' ? 'Papa and Mbe can always hear you here.' : 'Chat with your village friends and with real friends you have added. Strangers cannot message you.'}</div>`;
  $('chatLog').querySelectorAll('[data-join]').forEach(b => b.onclick = () => joinParty(b.dataset.join));
  $('chatLog').scrollTop = 1e6;
  $('chatQuick').innerHTML = QUICK[CHAT.channel].map(q => `<button type="button">${esc(q)}</button>`).join('');
  $('chatQuick').querySelectorAll('button').forEach(b => b.onclick = () => sendChat(b.textContent));
}
// Friends panel: the eight village friends, then real friends (added by code), requests, invites and your party.
function renderFriends(fr) {
  const sys = HEROES.map(h => { const on = friendOnline[h.id], st = summonState(friends[h.id]).state; return `<span class="fr ${on ? 'on' : ''}"><i></i>${h.name}${stageId() !== 'child' && on ? ` <button data-call="${h.id}" ${st === 'come' ? '' : 'disabled'} title="Call ${h.name} to help">Call</button>` : ''}</span>`; }).join('');
  let real = '';
  if (!social) real = `<p class="note">${CHAT.p2p ? 'Connecting to other players… if this stays, your network may block online play — try Wi-Fi.' : settings.playOnline === false && !window.claude ? 'Online play is switched off in Settings.' : 'Real friends: open the game from its shared link while signed in to add friends with a friend code and invite them to play.'}</p>`;
  else {
    const SO = social.S, list = social.onlineFriends(), ps = social.players().filter(pl => !social.isFriend(pl.code));
    real = `<div class="fr-real"><p class="fr-code">Your friend code <b>${SO.code || '…'}</b> <button class="mini" id="frCopy" type="button">Copy</button></p>
      <form id="frAdd" class="fr-add" autocomplete="off"><input id="frCode" maxlength="7" placeholder="Friend’s code" aria-label="Friend code"><button class="btn gold mini">Add friend</button></form><p id="frMsg" class="note"></p>
      ${SO.requests.map(r => `<div class="fr-row"><span>🤝 <b>${esc(r.name)}</b> wants to be friends</span><button class="mini gold" data-acc="${r.code}">Accept</button><button class="mini" data-dec="${r.code}">Decline</button></div>`).join('')}
      ${SO.invites.map(i => `<div class="fr-row"><span>🎮 <b>${esc(i.name)}</b> invited you to play</span><button class="mini gold" data-join="${i.party}">Join</button></div>`).join('')}
      ${list.length ? list.map(f => `<div class="fr-row"><span class="fr ${f.online ? 'on' : ''}"><i></i>${esc(f.name)} <small>${f.online ? (f.online.party && f.online.party === SO.party ? 'in your game' : 'online') : 'offline'}</small></span>${f.online && f.online.party !== SO.party ? `<button class="mini gold" data-inv="${f.code}">Invite</button>` : ''}<button class="mini" data-rem="${f.code}" title="Remove friend">✕</button></div>`).join('') : '<p class="note">No real friends yet. Swap friend codes with someone you know, then add them here.</p>'}
      ${SO.party ? `<div class="fr-row"><span>🎮 Playing together: ${social.partyMembers().length + 1} player${social.partyMembers().length ? 's' : ''}</span><button class="mini" id="frLeave">Leave</button></div>` : ''}
      ${ps.length ? `<p class="note">Also playing now: ${ps.map(pl => `${esc(pl.name)} <button class="mini" data-req="${pl.code}">Add</button>`).join(' · ')}</p>` : ''}
      <p class="note">Only friends who accepted your request can chat with you or invite you. Never share your real name, school or address.${CHAT.p2p ? ' Online play connects your phone directly to other players’ phones, so they can see its internet address; turn it off in Settings if you prefer.' : ''}</p></div>`;
  }
  fr.innerHTML = `<div class="fr-sys">${sys}</div>${real}`;
  fr.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { closeChat(); callFriend(b.dataset.call); });
  if (!social) return;
  const msg = t => { $('frMsg').textContent = t; };
  $('frCopy').onclick = () => { navigator.clipboard?.writeText(social.S.code || '').then(() => msg('Copied!'), () => msg('Your code is ' + social.S.code)); };
  $('frAdd').onsubmit = async e => { e.preventDefault(); msg(await social.request($('frCode').value)); $('frCode').value = ''; };
  $('frCode').addEventListener('keydown', e => e.stopPropagation());
  fr.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { social.accept(b.dataset.acc); audio.play('buy'); });
  fr.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => social.decline(b.dataset.dec));
  fr.querySelectorAll('[data-req]').forEach(b => b.onclick = async () => { msg(await social.request(b.dataset.req)); });
  fr.querySelectorAll('[data-rem]').forEach(b => b.onclick = () => social.remove(b.dataset.rem));
  fr.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => { b.disabled = true; msg(await social.invite(b.dataset.inv) ? 'Invite sent!' : 'Could not send the invite.'); });
  fr.querySelectorAll('[data-join]').forEach(b => b.onclick = () => joinParty(b.dataset.join));
  if ($('frLeave')) $('frLeave').onclick = () => social.leaveParty();
}
async function joinParty(code) {
  if (!social) return;
  const ok = await social.joinParty(code);
  toast(ok ? 'You joined your friend’s game! You will see each other in the world.' : 'Could not join that game right now.', 3.5);
}
function hearers() {
  const N = L.NPCS, out = [];
  const add = (id, x, z, y) => out.push({ id, x, z, y, d: Math.hypot(x - P.x, z - P.z) });
  for (const k of ['grandma', 'mama', 'tailor', 'hornbill', 'eagle']) add(k, N[k].x, N[k].z, heightAt(N[k].x, N[k].z) + 1.8);
  add('weaver', -13, -8, heightAt(-13, -8) + 3.6);
  for (const v of W.villagers) add(v.id, v.model.root.position.x, v.model.root.position.z, v.model.root.position.y + 1.8);
  for (const [id, f] of Object.entries(friends)) if (f.model.root.visible) add(id, f.S.x, f.S.z, f.S.y + 1.7);
  add('papa', papa.S.x, papa.S.z, papa.S.y + 2.3);
  return out.filter(h => h.d < 12).sort((a, b) => a.d - b.d);
}
function chatCtx(who) {
  const ns = STAGES.find(st => st.earn > S.earned);
  const food = SHOP.food.reduce((a, f) => a + (S.bag[f.id] || 0), 0);
  const j = currentJob();
  const c = who === 'papa' ? papa : friends[who];
  return { hero: S.name, coins: S.cowries, earned: S.earned, nextStage: ns ? { name: ns.name, need: ns.earn - S.earned } : null, food,
    quest: QUEST[qi(S.quest)].title, hint: QUEST[qi(S.quest)].detail, job: j, canDeliver: !!j && j.to === who, offer: offerFor(who),
    summon: (who === 'papa' || friends[who]) ? (stageId() === 'child' && who === 'papa' ? { state: 'here' } : summonState(c)) : null };
}
function speakerAnchor(who) {
  if (who === 'papa') return { x: papa.S.x, y: papa.S.y + 2.5, z: papa.S.z };
  if (who === 'mbe') return { x: P.x, y: P.y + amara.height + 0.3, z: P.z };
  if (friends[who]) return { x: friends[who].S.x, y: friends[who].S.y + 1.9, z: friends[who].S.z };
  return hearers().find(h => h.id === who) || null;
}
function showBubble(who, text) { const a = speakerAnchor(who); if (!a) return; bubble = { a, text, t: 5 }; $('bubble').textContent = text.length > 120 ? text.slice(0, 117) + '…' : text; $('bubble').hidden = false; }
function updateBubble(dt) {
  if (!bubble) return;
  bubble.t -= dt; const v = new THREE.Vector3(bubble.a.x, bubble.a.y, bubble.a.z).project(camera);
  const el = $('bubble');
  if (bubble.t <= 0 || v.z > 1 || mode !== 'play') { el.hidden = true; if (bubble.t <= 0) bubble = null; return; }
  el.hidden = false; el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
}
function sendChat(raw) {
  const m = moderate(raw); if (!m.ok) return;
  const now = performance.now(); if (now - CHAT.lastSend < 600) return; CHAT.lastSend = now;
  const ch = CHAT.channel;
  chatPush(ch, { name: S.name, text: m.text, cls: 'me' }); audio.play('ui');
  if (m.redacted) chatPush(ch, { text: 'Some words or personal details were hidden to keep chat safe.', cls: 'sys' });
  let who = null;
  if (ch === 'near') { who = hearers()[0]?.id; if (!who) return chatPush(ch, { text: 'Nobody is close enough to hear you. Walk up to someone, or try the Papa & Mbe or Friends channels.', cls: 'sys' }); }
  if (ch === 'family') who = /\b(mbe|tortoise|sniff|treasure|throw|shell)\b/i.test(m.text) ? 'mbe' : 'papa';
  if (ch === 'friends') {
    const realOn = social ? social.onlineFriends().filter(f => f.online).length : 0;
    if (realOn) social.chat(m.text);
    const named = HEROES.find(h => new RegExp(`\\b${h.name}\\b`, 'i').test(m.text));
    const on = onlineFriends();
    if (named && !friendOnline[named.id]) return chatPush(ch, { text: `${named.name} is offline right now.`, cls: 'sys' });
    who = named?.id || CHAT.focus && friendOnline[CHAT.focus] && CHAT.focus || (realOn ? null : bestFriendFor(classify(m.text), on));
    if (!who) return realOn ? null : chatPush(ch, { text: 'None of your friends are online right now.', cls: 'sys' });
  }
  answer(ch, who, m.text);
}
async function answer(ch, who, text) {
  const ctx = chatCtx(who), r = chatReply(who, text, ctx); r.text = genderize(r.text); const name = who === 'mbe' ? 'Mbe' : PERSONAS[who]?.name || who;
  const act = () => {
    if (r.action?.type === 'acceptJob') acceptJob(r.action.id);
    if (r.action?.type === 'deliverJob') deliverJob();
    if (r.action?.type === 'summon') { closeChat(); summon(who === 'papa' ? papa : friends[who]); }
  };
  const smartable = settings.smartChat && CHAT.sample && !r.action && !['help', 'empty'].includes(r.intent);
  if (!smartable) { setTimeout(() => { chatPush(ch, { name, text: r.text }); showBubble(who, r.text); audio.play('chat'); act(); }, 350); return; }
  const key = ch + ':' + who, turns = (CHAT.turns[key] ||= []);
  turns.push({ role: 'user', content: text }); if (turns.length > 8) turns.splice(0, turns.length - 8);
  const typing = { name, text: '…', cls: 'typing' }; chatPush(ch, typing);
  try {
    const { text: out } = await CHAT.sample([{ role: 'user', content: smartPrompt(who, ctx) }, ...turns], { modelTier: 'quick', cache: false, onText: ({ text: tx }) => { typing.text = tx; if (CHAT.open) renderChat(); } });
    typing.cls = ''; typing.text = out.trim().slice(0, 400); turns.push({ role: 'assistant', content: typing.text });
  } catch (e) {
    if (e?.code === 'not_granted' || e?.code === 'sampling_disabled') { settings.smartChat = false; saveSettings(settings); $('chatSmart').checked = false; $('smartRow').hidden = true; }
    typing.cls = ''; typing.text = r.text; turns.pop();
  }
  if (CHAT.open) renderChat(); showBubble(who, typing.text); audio.play('chat');
}
// Optional runtime features of the shared artifact: Claude-powered replies, a smart selfie match, and real friends.
let social = null, partyT = 0;
const party = new Map();
async function initOnline() {
  let online;
  if (window.claude?.use) {
    claude.use('sample').then(fn => { if (!fn) return; CHAT.sample = fn; $('smartRow').hidden = false; $('chatSmart').checked = settings.smartChat; renderSelfie(); }).catch(() => {});
    online = Promise.all([claude.use('room'), claude.use('user').catch(() => null)]);
  } else if (settings.playOnline !== false) {
    // Outside Claude (the GitHub Pages link): direct phone-to-phone play.
    CHAT.p2p = true;
    online = import('./p2p.mjs').then(m => m.createP2P()).then(p => p ? [p.room, p.user] : [null, null]).catch(e => { console.warn('Online play unavailable', e); return [null, null]; });
  } else return;
  online.then(([room, user]) => {
    if (!room) return; CHAT.room = room;
    social = createSocial(room, user, {
      friends: () => realFriends, setFriends: list => { realFriends = list; saveFriends(list); },
      self: () => ({ name: S?.name || 'Player' }),
      onChange: () => { if (CHAT.open) renderChat(); updateFriendChip(); },
      onChat: (from, text) => { chatPush('friends', { name: from.name + (from.guest ? ' (guest)' : ''), text, cls: 'online' }); audio.play('chat'); if (!CHAT.open) toast(`<b>${esc(from.name)}</b>: ${esc(text.slice(0, 60))}`, 3); },
      onInvite: inv => { chatPush('friends', { text: `${inv.name} invited you to play together.`, cls: 'sys', join: inv.party }); audio.play('ring', 3); toast(`<b>${esc(inv.name)}</b> invited you to play! Open the Friends chat to join.`, 5); },
      onRequest: r => { chatPush('friends', { text: `${r.name} sent you a friend request — accept it at the top of this tab.`, cls: 'sys' }); audio.play('chat'); toast(`<b>${esc(r.name)}</b> wants to be your friend — see the Friends chat.`, 4.5); },
      onToast: html => toast(html, 3),
      onHello: (from, kind) => {
        const r = [...worldAvatars.values()].find(a => a.data?.code === from.code); if (r) r.waveT = 2.5;
        audio.play('chat'); toast(`${kind === 'highfive' ? '✋' : kind === 'cheer' ? '🙌' : kind === 'dance' ? '💃' : '👋'} <b>${esc(from.name)}</b> ${kind === 'highfive' ? 'high-fived' : kind === 'cheer' ? 'cheered for' : kind === 'dance' ? 'danced with' : 'waved at'} you!`, 3);
      },
    });
  }).catch(() => {});
}
// Everyone playing appears in your world (nearest few on phones). Friends have gold name tags; their spins also hit monsters near them.
function updateParty(dt) {
  if (!social) return;
  partyT -= dt;
  if (partyT <= 0 && S && ['play', 'dialogue', 'fishing', 'cooking'].includes(mode)) {
    partyT = isTouch ? 0.22 : 0.16;
    social.shareWorld({ name: S.name, stage: S.stage, x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), face: +P.face.toFixed(2), spin: P.spin > 0 || P.attack > 0, ride: riding, bike: S.bike === 'gold' ? 'gold' : 'red',
      anim: mode === 'fishing' ? 'fish' : mode === 'cooking' ? 'cook' : emote?.kind || null, title: titleOf(), gender: S.gender, weapon: S.weapon, look: S.look });
  }
  const max = isTouch ? 6 : 12;
  const list = social.worldPlayers().filter(m => Date.now() - m.at < 30000).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)).slice(0, max), seen = new Set();
  for (const m of list) {
    seen.add(m.peer);
    const look = {}; for (const slot of SLOTS) { const id = m.look?.[slot]; look[slot] = LOOK[slot].items.some(i => i.id === id) ? id : defaultLookFor(m.gender)[slot]; }
    const stage = STAGES.some(st => st.id === m.stage) ? m.stage : 'child', wid = WEAPONS.some(w => w.id === m.weapon) ? m.weapon : 'staff';
    const key = JSON.stringify([look, stage, m.gender, wid, m.friend, m.title, m.ride, m.bike]);
    let r = worldAvatars.get(m.peer);
    if (!r || r.key !== key) {
      if (r) W.scene.remove(r.group);
      const group = new THREE.Group(), model = makeHeroine(look, stage, m.gender, { id: wid, color: TIERS[STAGES[stageIndex(stage)].tier].color });
      group.add(model.root); model.root.add(nameTag(m.name, m.friend, m.title));
      const bike = m.ride ? makeBike(m.bike === 'gold' ? '#f1c24b' : '#d23a2b') : null; if (bike) group.add(bike.root);
      group.position.set(m.x, m.y, m.z); W.scene.add(group);
      r = { group, model, bike, key, x: m.x, y: m.y, z: m.z, hitCd: 0 }; worldAvatars.set(m.peer, r);
    }
    r.data = m;
    const k = Math.min(1, dt * 10), ox = r.x, oz = r.z;
    r.x += (m.x - r.x) * k; r.y += (m.y - r.y) * k; r.z += (m.z - r.z) * k;
    r.group.position.set(r.x, r.y, r.z); r.group.rotation.y = m.face;
    const sp = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 1e-3);
    if (r.bike) { r.model.root.position.y = Math.max(0.05, 0.8 - r.model.height * 0.42); r.bike.spin(dt, sp); }
    r.model.animate(dt, { t: time, speed: sp / T.walk, grounded: true, spin: m.spin && !m.ride, ride: m.ride, wave: m.anim === 'wave' || m.anim === 'highfive' || (r.waveT > 0), cheer: m.anim === 'cheer', dance: m.anim === 'dance', fish: m.anim === 'fish' ? { cast: 0 } : null, cook: m.anim === 'cook' });
    r.waveT = Math.max(0, (r.waveT || 0) - dt);
    r.hitCd = Math.max(0, r.hitCd - dt);
    if (m.friend && m.spin && r.hitCd <= 0) { r.hitCd = 0.4; enemies.hitAt(r.x, r.y, r.z, 2.4, 'party', weave, enemyCtx, 1); }
  }
  for (const [peer, r] of worldAvatars) if (!seen.has(peer)) { W.scene.remove(r.group); worldAvatars.delete(peer); }
}
function nameTag(name, friend = true, title = '') {
  const c = document.createElement('canvas'); c.width = 320; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = 'rgba(18,12,38,.78)'; g.beginPath(); g.roundRect(10, title ? 6 : 24, 300, title ? 84 : 52, 26); g.fill();
  g.fillStyle = friend ? '#ffd35a' : '#f7eedb'; g.font = '700 30px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((friend ? '★ ' : '') + name.slice(0, 14), 160, title ? 34 : 50);
  if (title) { g.fillStyle = '#3cc6c0'; g.font = '600 22px Outfit, sans-serif'; g.fillText(title, 160, 68); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sp.scale.set(2, 0.6, 1); sp.position.y = 2.35; return sp;
}
function updateFriendChip() {
  const n = onlineFriends().length + (social ? social.onlineFriends().filter(f => f.online).length : 0);
  setText($('friendsChip'), `Friends · ${n} online${social?.S.party ? ' · playing together' : ''}`);
}

// ---------------- Growing up ----------------
function checkGrowth() {
  const reached = stageFor(S.earned);
  if (stageIndex(reached.id) <= stageIndex(S.grown || 'child') || mode !== 'play' || D) return;
  S.grown = reached.id; S.stage = reached.id;
  const LINES = {
    teen: ['Eh! Look at my daughter — taller every day. You are a teenager now!', 'You grew! I did not. Tortoises take a few hundred years.', 'From now on I will be at my forge. When a fight or a task is too hard, call me with C — and your friends can come too when they are online. Your weapons are iron now.'],
    youth: ['Is this… my little girl? You are a youth now — strong, wise and ready for anything.', 'All grown up. I may need a bigger basket. Or you may need a smaller tortoise.', 'You can face any enemy by yourself now, with bronze weapons. Call me only for heavy lifting and two-person jobs.'],
    adult: ['An adult! The village elders want to hear YOUR stories now.', 'You are taller than Papa. I have decided not to mention it.', 'Your weapons shine like gold now — and the monsters out there are the fiercest yet. Go well, my child.'],
  }[reached.id];
  say([{ who: 'papa', text: LINES[0] }, { who: 'mbe', text: LINES[1] }, { who: 'papa', text: LINES[2] }], () => {
    applyDifficulty(); rebuildAmara(); refreshMods(); hearts = maxHearts; renderHearts(); applyStageRules();
    audio.play('grow'); sparks(P.x, P.y + 1.4, P.z, '#ffd35a', 60, 7, 0.7, 1.4, 1); shock(P.x, P.y + 0.2, P.z, '#ffd35a', 6, 0.8);
    toast(`You grew into a <b>${reached.name}</b>! ${reached.perk} Challenge: <b>${diff.name}</b>.`, 5.5); persist();
  }, { x: papa.S.x, z: papa.S.z, y: papa.S.y });
}

// ---------------- Pickups, checkpoints, triggers ----------------
function collectAll() {
  const story = layer === 'story', reach = 1.35 * (mods.magnet || 1), py = P.y + 0.8;
  for (const c of W.cowries) {
    if (c.taken || (c.layer === 'story' && !story)) continue;
    const dx = c.x - P.x, dz = c.z - P.z;
    if (Math.abs(dx) > reach + 1 || Math.abs(dz) > reach + 1) continue;
    if (Math.hypot(dx, c.y - py, dz) < reach + 0.4) {
      c.taken = true; S.picked.push(c.id); S.cowries++; bump('coinToday'); combo = comboT > 0 ? combo + 1 : 0; comboT = 1.2;
      audio.play('cowry', combo); sparks(c.x, c.y, c.z, '#fff2c4', 6, 3, 0.3, 0.45, 4);
    }
  }
  for (const t of W.threads) {
    if (t.taken || !t.group.visible || (t.layer === 'story' && !story)) continue;
    if (Math.hypot(t.x - P.x, t.y - py, t.z - P.z) < 1.8) {
      t.taken = true; t.group.visible = false; S.threads.push(t.id); audio.play('thread'); sparks(t.x, t.y, t.z, '#ffd24a', 24, 6);
      toast(`Golden thread <b>${S.threads.length}/5</b>`);
      if (S.threads.length >= 5 && (S.quest === 'threads' || S.quest === 'weaver')) { setQuest('return1'); toast('All five threads! Return to <b>Weaver Bird</b>.'); }
      persist();
    }
  }
  for (const s of W.tales) {
    if (s.taken || (s.layer === 'story' && !story)) continue;
    if (Math.hypot(s.x - P.x, s.z - P.z) < 2.3 && Math.abs(s.y - P.y) < 3) {
      s.taken = true; S.tales.push(s.id); audio.play('tale'); sparks(s.x, s.y + 3, s.z, '#ffd77a', 30, 5, 0.5, 1);
      const tale = TALES[s.i];
      say([{ who: 'stone', text: `“${tale.title}.” ${tale.text}` }, ...(s.i === 5 ? [{ who: 'mbe', text: 'Yes, well. That part still hurts.' }] : [])], () => {
        toast(`Tale Stone <b>${S.tales.length}/6</b> — read them all in the Tale Book (T)`);
        persist();
      });
      return;
    }
  }
  for (const k of W.kola) {
    if (k.taken > 0 || hearts >= maxHearts) continue;
    if (Math.hypot(k.x - P.x, k.y - py, k.z - P.z) < 1.6) { k.taken = 60; k.group.visible = false; hearts = Math.min(maxHearts, hearts + 1); renderHearts(); audio.play('kola'); sparks(k.x, k.y, k.z, '#ff8a6a', 12, 4); }
  }
}
function checkpoints() {
  for (const c of W.checkpoints) {
    if (Math.hypot(c.x - P.x, c.z - P.z) < 4.5 && Math.abs(c.y - P.y) < 4 && S.checkpoint !== c.i) {
      S.checkpoint = c.i; audio.play('checkpoint'); sparks(c.x + 2.4, c.y + 3, c.z, '#ffd35a', 24, 5); shock(c.x + 2.4, c.y + 0.2, c.z, '#ffd35a', 5);
      hearts = maxHearts; renderHearts(); toast(`Story drum: <b>${c.name}</b>`); persist();
    }
    const on = S.checkpoint === c.i; c.skin.emissiveIntensity = on ? 1.4 + Math.sin(time * 3) * 0.4 : 0; c.ringM.opacity = on ? 0.6 : 0;
    c.flag.rotation.y = Math.sin(time * 2 + c.i) * 0.3;
  }
}
let lastGround = null, spinStruck = new Set();
function puzzles(dt) {
  // Drum stones: land on them or spin into them.
  if (P.groundId !== lastGround && P.groundId?.startsWith('ds')) strikeDrum(+P.groundId.slice(2));
  lastGround = P.groundId;
  if (P.spin > 0) for (const d of W.drumStones) { if (!spinStruck.has(d.i) && Math.hypot(d.x - P.x, d.z - P.z) < 1.7 && Math.abs(P.y - d.y) < 1.5) { spinStruck.add(d.i); strikeDrum(d.i); } }
  else spinStruck.clear();
  updateRiddle(dt);
  // Twin plates.
  if (!solved('gate')) {
    const onPlate = p => Math.hypot(p.x - P.x, p.z - P.z) < 1.3 && Math.abs(P.y - p.y) < 0.6;
    const papaOn = p => Math.hypot(p.x - papa.S.x, p.z - papa.S.z) < 1.2;
    let both = true;
    for (const p of W.plates) { const pressed = onPlate(p) || papaOn(p); p.mat.emissiveIntensity = pressed ? 1.2 : 0; both &&= pressed; }
    if (both) {
      S.puzzles.push('gate'); refreshActive(); audio.play('slam'); shake = 0.7; papa.S.mode = 'follow'; papa.S.hold = null; papa.cheer();
      sparks(L.GATE.x, W.gate.y + 4, L.GATE.z, '#ffcf6b', 50, 9, 0.6, 1.2);
      say([{ who: 'papa', text: 'Ha! Teamwork, my daughter. Your Papa is heavier than he looks.' }, { who: 'mbe', text: 'And I supervised.' }], null, L.GATE);
      persist();
    } else if (W.plates.some(onPlate) && !W.plates.some(papaOn) && !S.puzzles.includes('plateHint')) {
      S.puzzles.push('plateHint'); toast('One plate is not enough. Ask <b>Papa</b> to stand on the other — press E at that plate.', 4.5);
    }
  }
  W.gate.open += ((solved('gate') ? 1 : 0) - W.gate.open) * Math.min(1, dt * 1.2);
  W.gate.doors.forEach((d, i) => { d.position.y = 4.5 - W.gate.open * 9.6; d.position.x = (i ? 1 : -1) * L.GATE.half / 2; });
  // Dig spots and chests sparkle.
  for (const d of W.digs) { if (d.revealed > 0) d.revealed -= dt; d.beam.visible = !d.dug && d.revealed > 0; d.beam.material.opacity = 0.25 + Math.sin(time * 4) * 0.12; }
  if (W.ball.revealed > 0) W.ball.revealed -= dt;
  W.ball.mesh.rotation.y += dt;
  for (const c of Object.values(W.chests)) { c.lid.rotation.x += ((c.opened ? -1.9 : 0) - c.lid.rotation.x) * Math.min(1, dt * 5); c.shine.visible = !c.opened; c.shine.material.opacity = 0.4 + Math.sin(time * 3) * 0.2; }
}
function triggers() {
  if (S.quest === 'climb' && Math.hypot(P.x - L.PALACE.x, P.z - L.PALACE.z) < 19.5 && P.y > L.PALACE.y - 1) bossIntro();
  if (S.quest === 'hawks' && enemies.questHawksLeft() === 0 && !D) eagleReward();
  if (race.on) {
    race.t -= frameDt;
    const r = W.rings[race.idx];
    if (r && Math.hypot(P.x - r.x, P.y + 0.8 - r.y, P.z - r.z) < r.r) {
      audio.play('ring', race.idx); sparks(r.x, r.y, r.z, '#ffd35a', 20, 6); shock(r.x, r.y, r.z, '#ffd35a', 3, 0.4);
      race.idx++; if (race.idx >= W.rings.length) endRace(true);
    }
    if (race.on && race.t <= 0) endRace(false);
    W.rings.forEach((rg, i) => { rg.mat.opacity = i < race.idx ? 0.08 : i === race.idx ? 0.95 : 0.3; rg.mesh.scale.setScalar(i === race.idx ? 1 + Math.sin(time * 6) * 0.08 : 1); });
    setText($('race'), `${Math.max(0, race.t).toFixed(1)}s · ring ${Math.min(race.idx + 1, 8)}/8`);
  }
}

// ---------------- Boss ----------------
function bossIntro() {
  bossWall = { id: 'boss', x: L.PALACE.x, z: L.PALACE.z, r: 4.8, y0: L.PALACE.y - 1, y1: L.PALACE.y + 9 }; refreshActive();
  if (papa.S.mode !== 'home') papa.place(L.PALACE.x + 3, L.PALACE.z + 22, L.PALACE.y);
  say([
    { who: 'shade', text: 'WHO DISTURBS MY FEAST? These yams, this soup, this palm wine… all of it is for ALL OF ME.' },
    { who: 'mbe', text: 'Oh no. That is… me. That is my greed, from the old feast. It grew while I slept.' },
    { who: 'amara', text: 'Then we will show it how to share. This feast was meant for everyone!' },
    { who: 'papa', text: 'I will hold the gate, {name}! When it gets dizzy, slip into Story-time and spin into its crystals!' },
  ], () => { setQuest('boss'); boss.start(); audio.setBoss(1); toast('Jump the shockwaves · dodge the orbs · <b>spin in Story-time</b> when it is dizzy', 5); }, L.PALACE);
}
function bossDefeated() {
  audio.setBoss(0); bossWall = null; refreshActive();
  S.enemies += 5;
  say([
    { who: 'shade', text: 'I was… so hungry. For so long.' },
    { who: 'mbe', text: 'I know. I was too. Come — sit with us. There is enough when it is shared.' },
    { who: 'papa', text: 'That is my girl! Grandma will tell this story for a hundred years.' },
    { who: 'grandma', text: 'And so the feast was shared at last. The tortoise’s shell still carries its cracks — but now every crack holds a story.' },
  ], () => { setQuest('done'); unlock('top:feather', 'Borrowed-feather jacket'); startCelebration(); }, L.PALACE);
}
function startCelebration() {
  const birds = [];
  const kinds = [{ body: '#f2c21b', wing: '#b88a10', belly: '#fff0a0', size: 0.9 }, { body: '#1d1d1f', wing: '#151515', belly: '#f4f1ea', beak: '#f2c21b', size: 1.4, hornbill: true }, { body: '#6b4423', wing: '#4a2e17', belly: '#f2efe6', beak: '#f2c21b', size: 1.7, crest: '#f2efe6' }, { body: '#2fa84f', wing: '#d23a2b', belly: '#9be07a', beak: '#f2c21b', size: 1 }];
  for (let i = 0; i < 12; i++) { const b = makeBird(kinds[i % 4]); W.scene.add(b.root); birds.push({ b, a: i / 12 * 6.28, r: 9 + (i % 3) * 3, h: 4 + (i % 4) * 1.5 }); }
  papa.place(P.x + 2, P.z + 2, P.y); papa.S.mode = 'help'; papa.S.helpT = 999;
  for (const id of Object.keys(friends)) { const f = friends[id], a = Math.random() * 6; f.place(P.x + Math.cos(a) * 3, P.z + Math.sin(a) * 3, P.y); f.S.mode = 'help'; f.S.helpT = 999; }
  celebrate = { t: 0, birds, shown: false }; audio.setScene({ victory: true });
  audio.play('win');
}
function updateCelebration(dt) {
  celebrate.t += dt; const B = L.PALACE;
  for (const b of celebrate.birds) {
    b.a += dt * 0.6; b.b.root.position.set(B.x + Math.cos(b.a) * b.r, B.y + b.h + Math.sin(time * 2 + b.a) * 0.6, B.z + Math.sin(b.a) * b.r);
    b.b.root.rotation.y = -b.a; b.b.animate(dt, time + b.a, true);
  }
  if (Math.random() < dt * 3) sparks(B.x + (Math.random() - 0.5) * 30, B.y + 12 + Math.random() * 10, B.z + (Math.random() - 0.5) * 30, ['#ffd35a', '#ff6f91', '#7fe9ff', '#7dffb0'][Math.floor(Math.random() * 4)], 30, 8, 0.6, 1.4, 3);
}

// ---------------- Damage and respawn ----------------
let lastHitBy = 'unknown';
function hurt(fx_, fz, dmg = 1, power = 12, src = null) {
  if (P.inv > 0 || mode !== 'play' || P.spin > 0) return;
  if (src?.practice) { knockback(P, fx_, fz, power * 0.6); P.inv = 0.8; audio.play('deny'); toast('Grandma: “Careful! In a real fight that would cost you a heart.”', 2.2); return; }
  lastHitBy = src?.kind || 'unknown';
  hearts -= dmg * diff.damage; P.inv = T.invuln * [1, 1.2, 1.6, 1.8][stageIndex(stageId())];
  knockback(P, fx_, fz, power); shake = 0.5; hurtFx = 1; audio.play('hurt');
  const h = $('hearts'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
  renderHearts();
  if (hearts <= 0) faint();
}
// When the hearts run out the story ends: everything starts again from the very beginning,
// and Grandma Adaeze teaches how to beat whatever ended it. The hero, wardrobe, badges, hobbies and friends are kept.
function faint() {
  const killer = lastHitBy;
  S.deaths++;
  dismount(); if (fishing) endFishing(); bikeRace = null;
  fadeThen('The story ends…', () => restartStory(killer));
}
function restartStory(killer) {
  const keep = {};
  for (const k of ['name', 'gender', 'talent', 'look', 'owned', 'badges', 'hobby', 'catches', 'cooked', 'dishes', 'bike', 'bikeBest', 'waves', 'daily', 'today', 'deaths', 'enemies', 'startStage']) keep[k] = S[k];
  const restarts = (S.restarts || 0) + 1;
  S = freshSave({ name: keep.name, gender: keep.gender, talent: keep.talent, stage: keep.startStage || 'child', look: keep.look });
  Object.assign(S, keep, { restarts, lesson: killer });
  startGame('restart');
}
const LESSONS = {
  beetle: ['Beetles charge low and fast. Jump and land on their backs to flip them over —', '— then strike while they kick their legs in the air. Never stand in front of one that is running at you.'],
  greed: ['Greedlings snatch cowries and run. Stomp on them, spin into them or throw Mbe.', 'When one flees with your cowries, chase it — a full sack makes it slow.'],
  brute: ['The Harmattan Brute scrapes the ground before it charges. That is your warning!', 'Step to the side, let it thunder past, and strike while it stands panting. Keep at it until it falls.'],
  hyena: ['Shadow hyenas hunt in Story-time. They circle you, then lunge.', 'Keep moving, and when they gather close, beat your drum — press E, or Act — to stun the whole pack. Then strike. And call a friend: hyenas fear a crowd.'],
  wisp: ['Wisps throw slow fire orbs. Run sideways, never backwards.', 'Beat your drum to stun them, then jump and strike — or use a catapult from far away.'],
  hawk: ['Shadow hawks screech before they swoop. That screech is your signal.', 'In Story-time, stun them with your drum or by throwing Mbe, then spin into them as they fall.'],
  devil: ['Dust devils cannot be fought in Now. Slip into Story-time and they calm to nothing —', '— or beat your drum to scatter them, then walk past.'],
  boss: ['The Shade leaps and slams the ground. Jump over its shockwaves and step away from its orbs.', 'When it grows dizzy, slip into Story-time and strike its glowing crystals. Never fight it in Now.'],
  water: ['The river is deep, my child, and it does not forgive.', 'Use the stepping stones, and jump twice once Weaver Bird trusts you with her feather.'],
  fall: ['Look before you leap.', 'Hold jump to glide once you have a feather, and go around a chasm when the ground is solid.'],
  unknown: ['Something caught you unawares.', 'Keep your hearts full: eat from your bag with H, rest at the story drums, and never be too proud to call for help.'],
};
const PRACTICE = { beetle: 'beetle', greed: 'greed', brute: 'brute' };
let lesson = null;
function grandmaLesson(killer) {
  const k = LESSONS[killer] ? killer : 'unknown', name = { beetle: 'a beetle', greed: 'a Greedling', brute: 'a Harmattan Brute', hyena: 'the shadow hyenas', wisp: 'a Story-time wisp', hawk: 'a shadow hawk', devil: 'a dust devil', boss: 'the Shade at the feast', water: 'the river', fall: 'a long fall', unknown: 'the dangers out there' }[k];
  const G = L.NPCS.grandma, practice = PRACTICE[k];
  say([
    { who: 'grandma', text: `Come, sit by the fire, {name}. Your story ended too soon — ${name} was too much for you this time.` },
    { who: 'grandma', text: 'But listen: every story can be told again, and a good storyteller learns from every telling.' },
    { who: 'grandma', text: LESSONS[k][0] }, { who: 'grandma', text: LESSONS[k][1] },
    ...(practice ? [{ who: 'grandma', text: 'Now show me. Here is one to practise on — it cannot hurt you here by my fire.' }] : [{ who: 'grandma', text: 'Remember it well. Now — we begin again, from the very beginning.' }]),
  ], () => {
    if (!practice) return finishLesson(false);
    const a = Math.random() * Math.PI * 2, x = G.x + Math.sin(a) * 9, z = G.z + Math.cos(a) * 9;
    const e = enemies.spawn(practice, x, z); e.practice = true; e.reward = 0; if (e.hp) e.hp = Math.min(e.hp, practice === 'brute' ? 3 : 1);
    lesson = { e, kind: practice };
    sparks(x, e.y + 1, z, '#ffd35a', 30, 5, 0.6, 1, -1); audio.play('checkpoint');
    toast(`Practice: defeat the <b>${{ beetle: 'beetle', greed: 'Greedling', brute: 'Harmattan Brute' }[practice]}</b> the way Grandma showed you.`, 5);
  }, G);
}
function finishLesson(practised) {
  lesson = null; S.lesson = null;
  const lines = practised ? [{ who: 'grandma', text: 'Yes! Just like that. Now you know.' }, { who: 'grandma', text: 'Take these cowries, and let us begin the tale again, from the very beginning. Talk to me when you are ready.' }]
    : [{ who: 'grandma', text: 'Talk to me when you are ready, and the tale will begin again.' }];
  say(lines, () => { if (practised) giveCoins(5); toast(`The story begins again. Story ${S.restarts + 1} · your hero, outfits, badges and hobbies are kept.`, 5); persist(); }, L.NPCS.grandma);
}
function updateLesson() {
  if (!lesson) return;
  if (lesson.e.dead) { audio.play('win'); finishLesson(true); return; }
  if (Math.hypot(lesson.e.x - L.NPCS.grandma.x, lesson.e.z - L.NPCS.grandma.z) > 30) { lesson.e.x = L.NPCS.grandma.x + 6; lesson.e.z = L.NPCS.grandma.z + 6; }
}
function fellOff(splash) {
  lastHitBy = splash ? 'water' : 'fall';
  audio.play(splash ? 'splash' : 'hurt');
  if (splash) sparks(P.x, WATER_Y, P.z, '#bfefff', 30, 6, 0.5, 0.8);
  hearts -= diff.damage; renderHearts();
  if (hearts <= 0) return faint();
  fadeThen('', respawn);
}
let fading = false;
function fadeThen(text, fn) {
  if (fading) return; fading = true; const f = $('fade'); f.textContent = text; f.classList.add('on');
  const was = mode; mode = 'fading';
  setTimeout(() => { fn(); if (mode === 'fading') mode = was === 'fading' ? 'play' : was; setTimeout(() => { f.classList.remove('on'); fading = false; }, 250); }, 550);
}
function respawn() {
  const c = CHECKPOINTS[S.checkpoint];
  Object.assign(P, { x: c.x, z: c.z, y: (c.y ?? heightAt(c.x, c.z)) + 1.2, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, spin: 0, inv: 1.6, grounded: false, face: Math.PI });
  if (race.on) endRace(false);
  if (papa.S.mode === 'follow') papa.place(c.x + 1.5, c.z + 1.5, c.y ?? heightAt(c.x + 1.5, c.z + 1.5));
  for (const f of [papa, ...Object.values(friends)]) if (f.S.mode === 'help') f.place(c.x - 1.5, c.z + 1.5, c.y ?? heightAt(c.x - 1.5, c.z + 1.5));
  cam.yaw = 0; snapCamera();
}
function renderHearts() { $('hearts').innerHTML = Array.from({ length: maxHearts }, (_, i) => `<i class="${i < hearts ? '' : 'off'}"></i>`).join(''); }

// ---------------- Interaction ----------------
function interactables() {
  const N = L.NPCS, g = (x, z) => heightAt(x, z), out = [];
  const add = (o) => out.push(o);
  add({ x: N.grandma.x, z: N.grandma.z, y: g(N.grandma.x, N.grandma.z), r: 3.4, label: jobLabel('grandma', 'Talk to Grandma Adaeze'), fn: () => jobOr('grandma', talkGrandma) });
  add({ x: -13, z: -8, y: g(-13, -8), r: 5, label: 'Talk to Weaver Bird', fn: talkWeaver });
  add({ x: N.tailor.x, z: N.tailor.z, y: g(N.tailor.x, N.tailor.z), r: 3.2, label: jobLabel('tailor', 'Aunty Ngozi’s boutique'), fn: () => jobOr('tailor', talkTailor) });
  add({ x: N.mama.x, z: N.mama.z, y: g(N.mama.x, N.mama.z), r: 3.2, label: jobLabel('mama', 'Mama Nkem’s food stall'), fn: () => jobOr('mama', talkMama) });
  add({ x: L.MIRROR.x, z: L.MIRROR.z, y: g(L.MIRROR.x, L.MIRROR.z), r: 2.6, label: 'Mirror — change your look', fn: () => openWardrobe(false) });
  add({ x: N.hornbill.x, z: N.hornbill.z, y: g(N.hornbill.x, N.hornbill.z), r: 4.2, label: 'Talk to Hornbill', fn: talkHornbill });
  add({ x: N.eagle.x, z: N.eagle.z, y: g(N.eagle.x, N.eagle.z), r: 5, label: 'Talk to Eagle', fn: talkEagle });
  add({ x: L.DRUM_CIRCLE.x, z: L.DRUM_CIRCLE.z, y: W.elderDrum.y, r: 3.3, label: solved('drums') ? 'Elder drum (solved)' : 'Strike the elder drum', fn: startRiddle });
  for (const v of W.villagers) add({ x: v.model.root.position.x, z: v.model.root.position.z, y: v.model.root.position.y, r: 2.6, label: jobLabel(v.id, `Talk to ${v.name}`), fn: () => jobOr(v.id, () => talkVillager(v)) });
  for (const f of Object.values(friends)) if (f.model.root.visible && f.S.mode === 'home') add({ x: f.S.x, z: f.S.z, y: f.S.y, r: 2.6, label: jobLabel(f.heroine.id, `Talk to ${f.heroine.name}`), fn: () => jobOr(f.heroine.id, () => talkFriend(f)) });
  if (papa.S.mode === 'home') add({ x: papa.S.x, z: papa.S.z, y: papa.S.y, r: 3, label: jobLabel('papa', 'Talk to Papa at his forge'), fn: () => jobOr('papa', talkPapa) });
  for (const c of Object.values(W.chests)) if (!c.opened && (c.id !== 'drumchest')) add({ x: c.x, z: c.z, y: c.y, r: 1.9, label: 'Open the chest', fn: () => openChest(c.id), tight: true });
  for (const d of W.digs) if (!d.dug && d.revealed > 0) add({ x: d.x, z: d.z, y: d.y, r: 2, label: 'Dig here', fn: () => dig(d) });
  if (!W.ball.taken) add({ x: W.ball.x, z: W.ball.z, y: W.ball.y, r: 2, label: 'Pick up the football', fn: () => { W.ball.taken = true; W.ball.mesh.visible = false; if (!S.errands.includes('ball:start')) S.errands.push('ball:start'); S.errands.push('ball:got'); audio.play('thread'); toast('Got <b>Kelechi’s football</b>! Take it back to him.'); persist(); } });
  const J = HW.fishSpot; add({ x: J.x, z: J.z, y: J.y, r: 2.2, label: riding ? 'Get off your bike to fish' : 'Fish from the jetty', fn: () => riding ? toast('Get off your bike first (X).') : startFishing() });
  add({ x: L.JETTY.x + 1.4, z: L.JETTY.z + 0.6, y: heightAt(L.JETTY.x, L.JETTY.z), r: 2, label: 'Fishing tips', fn: fishingTips });
  add({ x: L.COOK_POT.x, z: L.COOK_POT.z, y: heightAt(L.COOK_POT.x, L.COOK_POT.z), r: 2.4, label: 'Cook at the village pot', fn: openCooking });
  add({ x: L.BIKE_STAND.x, z: L.BIKE_STAND.z, y: heightAt(L.BIKE_STAND.x, L.BIKE_STAND.z), r: 3, label: S.bike ? (bikeRace ? 'Bike race in progress' : 'Start the village bike loop') : 'Get a bike from Musa’s stand', fn: bikeStand });
  for (const wp of worldAvatars.values()) if (wp.data) add({ x: wp.x, z: wp.z, y: wp.y, r: 2.6, label: `${wp.data.friend ? 'Friend' : 'Player'}: ${wp.data.name}`, fn: () => meetPlayer(wp.data) });
  if (!solved('gate')) for (const p of W.plates) { const h = activeHelper(); add({ x: p.x, z: p.z, y: p.y, r: 2.2, label: h ? `Ask ${h.S.id === 'papa' ? 'Papa' : h.heroine.name} to stand on this plate` : 'This plate needs a second person', fn: () => holdPlate(p) }); }
  return out;
}
function nearestInteract() {
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.x - P.x, it.z - P.z), dy = Math.abs(it.y - P.y);
    if (d < it.r && dy < (it.tight ? 1.4 : 3.5) && d < bd) { best = it; bd = d; }
  }
  return best;
}
// Papa has his own button (C). As a child she has him beside her; from teenager on he stays at his forge
// and she calls him in for hard fights and two-person tasks. Anyone called in fights beside the hero.
const stageId = () => S?.stage || 'child';
function callPapa() {
  if (mode !== 'play') return;
  const d = Math.hypot(papa.S.x - P.x, papa.S.z - P.z);
  if (d < 4.5) return talkPapa();
  if (stageId() === 'child') {
    if (bagHas('whistle')) { papa.place(P.x - Math.sin(P.face) * 1.6, P.z - Math.cos(P.face) * 1.6, P.y); papa.S.mode = 'follow'; papa.S.hold = null; audio.play('ring', 5); toast('Papa heard your whistle!'); return; }
    papa.S.mode = 'follow'; papa.S.hold = null; toast('“Coming, my daughter!” Papa is on his way.'); return;
  }
  summon(papa);
}
function summonState(c) {
  if (!c) return { state: 'offline' };
  if (c.S.mode === 'help' || c.S.mode === 'follow' || c.S.mode === 'hold') return { state: 'here' };
  if (c.heroine && !friendOnline[c.heroine.id]) return { state: 'offline' };
  if ((helperCd[c.S.id] || 0) > 0) return { state: 'busy' };
  return { state: 'come' };
}
function summon(c, quiet = false) {
  const st = summonState(c).state, name = c.S.id === 'papa' ? 'Papa' : c.heroine.name;
  if (st === 'here') return quiet || toast(`${name} is already with you.`);
  if (st === 'offline') return quiet || toast(`${name} is offline right now.`);
  if (st === 'busy') return quiet || toast(`${name} needs a moment before coming out again.`);
  const sx = P.x - Math.sin(P.face) * 1.6 + Math.cos(P.face) * 1.4, sz = P.z - Math.cos(P.face) * 1.6 - Math.sin(P.face) * 1.4;
  sparks(c.S.x, c.S.y + 1, c.S.z, '#e8e0d0', 16, 3, 0.6, 0.6, -1);
  c.place(sx, sz, surfaceBelow(env, sx, sz, P.y + 1).y); c.S.mode = 'help'; c.S.hold = null; c.S.helpT = 60; c.S.fights = c === papa ? S.papaFights !== false : true;
  sparks(c.S.x, c.S.y + 1, c.S.z, c.heroine ? c.heroine.color : '#ffd35a', 24, 4, 0.6, 0.8, -1); audio.play('checkpoint');
  toast(`${name} came to fight beside you for one minute! Helpers take a share of the cowries for every monster <i>they</i> finish off.`, 4);
}
function sendHome(c, why = '') {
  if (!c || c.S.mode === 'home') return;
  sparks(c.S.x, c.S.y + 1, c.S.z, '#e8e0d0', 16, 3, 0.6, 0.6, -1);
  const h = c.S.home; c.place(h.x, h.z, heightAt(h.x, h.z)); c.S.mode = 'home'; c.S.hold = null; helperCd[c.S.id] = 20;
  if (why) toast(why, 2.6);
}
function activeHelper() {
  if (papa.S.mode === 'follow' || papa.S.mode === 'help') return papa;
  return Object.values(friends).find(f => f.S.mode === 'help') || null;
}
function holdPlate(p) {
  const h = activeHelper();
  if (!h) return toast(stageId() === 'child' ? 'Call Papa back first (C).' : 'Two plates need two people. Call Papa (C) or an online friend (V or the Friends chat).', 4);
  h.S.mode = 'hold'; h.S.hold = { x: p.x, z: p.z };
  say([{ who: h.S.id === 'papa' ? 'papa' : h.S.id, text: h.S.id === 'papa' ? 'This one? Right you are. Now you stand on the other plate!' : 'Got it — I’m on this one. Go, go, go!' }], null, p);
}
function applyStageRules() {
  const st = stageId();
  if (st === 'child') { if (papa.S.mode === 'home') { papa.S.mode = 'follow'; papa.place(P.x + 1.5, P.z + 1.2, heightAt(P.x + 1.5, P.z + 1.2)); } papa.S.fights = true; }
  else if (papa.S.mode === 'follow' || papa.S.mode === 'wait') { papa.S.mode = 'home'; const h = papa.S.home; papa.place(h.x, h.z, heightAt(h.x, h.z)); }
  papa.S.fights = S.papaFights !== false; for (const f of Object.values(friends)) f.S.fights = true;
}
function rollFriends(first = false) {
  for (const h of HEROES) friendOnline[h.id] = first ? !['tiara', 'musa'].includes(h.id) : Math.random() < 0.75;
  friendRollT = 150 + Math.random() * 90;
}
function refreshFriends() {
  for (const f of Object.values(friends)) f.model.root.visible = true;
}
function onlineFriends() { return HEROES.filter(h => friendOnline[h.id]).map(h => h.id); }
function callFriend(id) {
  if (mode !== 'play') return;
  if (stageId() === 'child') return toast('Friends come out to help once you are a teenager. For now, Papa is right beside you!');
  const pickId = id || bestFriendFor('fight', onlineFriends().filter(f => summonState(friends[f]).state === 'come'));
  if (!pickId) return toast('None of your friends can come right now. Check who is online in the Friends chat.');
  summon(friends[pickId]);
}
function talkFriend(f) {
  const h = f.heroine;
  const opts = [];
  if (stageId() !== 'child') opts.push({ label: 'Come and help me!', fn: () => summon(f) });
  opts.push({ label: 'Chat', fn: () => openChat('friends', h.id) }, { label: 'Bye' });
  choose(h.id, PERSONAS[h.id].greet[0].replaceAll('{hero}', S.name), opts, f.S);
}
function drum() {
  if (drumCd > 0) return;
  drumCd = T.drumCooldown; const r = T.drumRadius * (mods.drum || 1);
  audio.play('drum'); shock(P.x, P.y + 0.3, P.z, '#9af6e0', r, 0.5); shock(P.x, P.y + 0.6, P.z, '#ffd35a', r * 0.7, 0.4);
  const n = enemies.drum(P.x, P.y, P.z, r, weave); if (n) toast(`Drum stunned <b>${n}</b>!`, 1.6);
  shake = Math.max(shake, 0.15);
}
function throwMbe() {
  if (!mbeJoined()) return toast('You have nobody to throw… yet.');
  if (!mbe.ready) return;
  const range = T.throwRange * (mods.throw || 1);
  // Auto-aim: the nearest enemy in range (Amara turns to face it), else a drum stone during the riddle, else straight ahead.
  let target = enemies.nearest(P.x, P.z, range, weave);
  const off = o => Math.abs(wrapA(Math.atan2(o.x - P.x, o.z - P.z) - P.face));
  if (!target && riddle.phase === 'input') target = W.drumStones.filter(d => Math.hypot(d.x - P.x, d.z - P.z) < range && off(d) < 0.8).sort((a, b) => off(a) - off(b))[0] || null;
  if (target) P.face = Math.atan2(target.x - P.x, target.z - P.z);
  const slot = amara.gear.mbeSlot.getWorldPosition(new THREE.Vector3());
  if (mbe.toss(slot.x, slot.y, slot.z, P.face, target, range)) { audio.play('throw'); throwFlag = true; }
}
function doWeave() {
  if (!env.abilities.weave) { audio.play('deny'); toast('You need Grandma’s <b>Story Calabash</b> first.'); return; }
  if (weaveCd > 0) return;
  weaveCd = T.weaveCooldown * (mods.weave || 1);
  layer = layer === 'now' ? 'story' : 'now';
  refreshActive(); audio.play('weave', layer === 'story'); audio.setWeave(layer === 'story' ? 1 : 0);
  ripple = 0.001; const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60);
  $('weaveDial').classList.toggle('story', layer === 'story');
  setText($('weaveLabel'), layer === 'story' ? 'STORY-TIME' : 'NOW');
  sparks(P.x, P.y + 1, P.z, layer === 'story' ? '#7fe9ff' : '#ffd35a', 26, 6, 0.4, 0.8, 0);
  if (S.quest === 'weave' && layer === 'story') setTimeout(() => { if (mode === 'play' && S.quest === 'weave') mbeWakes(); }, 1100);
}

// ---------------- Input ----------------
const keys = new Set(), pressed = new Set();
const touch = { x: 0, z: 0, jump: false, jumpHeld: false, spin: false, act: false, weave: false, mbe: false, sniff: false, papa: false, bike: false, emote: false };
let pad = { x: 0, z: 0, cx: 0, cy: 0, jumpHeld: false }, padPrev = [];
function bindInput() {
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    audio.init();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (mode === 'intro') skipIntro();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (mode === 'play') openPause(); });
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    audio.init(); canvas.focus();
    if (mode === 'intro') return skipIntro();
    if (mode === 'dialogue') return advance();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    const s = 0.0055 * settings.sensitivity * (e.pointerType === 'touch' ? 1.4 : 1);
    cam.yaw -= dx * s; cam.pitch = clamp(cam.pitch + dy * s * (settings.invertY ? -1 : 1), -0.12, 1.25); cam.manualT = 2.2;
  });
  const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * 0.08), mode === 'photo' ? 2.2 : 4, 18); }, { passive: false });
  const stick = $('stick'), knob = $('knob');
  let sid = null, sc = null;
  stick.addEventListener('pointerdown', e => { audio.init(); sid = e.pointerId; const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; stick.setPointerCapture(e.pointerId); moveStick(e); });
  const moveStick = e => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - sc.x, dy = e.clientY - sc.y; const l = Math.hypot(dx, dy), max = sc.r * 0.7;
    if (l > max) { dx *= max / l; dy *= max / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; touch.x = dx / max; touch.z = -dy / max;
  };
  stick.addEventListener('pointermove', moveStick);
  const stopStick = e => { if (e.pointerId !== sid) return; sid = null; touch.x = touch.z = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', stopStick); stick.addEventListener('pointercancel', stopStick);
  const tb = (id, down, up) => { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); audio.init(); el.setPointerCapture(e.pointerId); down(); }); el.addEventListener('pointerup', () => up?.()); el.addEventListener('pointercancel', () => up?.()); };
  tb('tJump', () => { if (mode === 'dialogue') return advance(); touch.jump = true; touch.jumpHeld = true; }, () => { touch.jumpHeld = false; });
  tb('tSpin', () => { touch.spin = true; });
  tb('tDrum', () => { if (mode === 'dialogue') return advance(); touch.act = true; });
  tb('tWeave', () => { touch.weave = true; });
  tb('tMbe', () => { touch.mbe = true; });
  tb('tSniff', () => { touch.sniff = true; });
  tb('tBike', () => { touch.bike = true; });
  tb('tEmote', () => { touch.emote = true; });
  $('hTap').addEventListener('pointerdown', e => { e.preventDefault(); if (mode === 'fishing') fishTap(); else if (mode === 'cooking') cookTap(); });
  $('hQuit').addEventListener('click', () => { if (mode === 'fishing') endFishing('You packed up your rod.'); });
  $('weaveDial').addEventListener('click', () => { if (mode === 'play') doWeave(); });
  $('papaChip').addEventListener('click', () => { touch.papa = true; });
  $('dialogue').addEventListener('click', advance);
  addEventListener('gamepadconnected', () => { toast('Controller connected — A jump · X spin · B talk/act · Y weave · LB throw Mbe · RB sniff'); updateHint(); });
}
function pollPad() {
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!gp) { pad = { x: 0, z: 0, cx: 0, cy: 0, jumpHeld: false }; return; }
  const dz = v => Math.abs(v) < 0.18 ? 0 : v;
  pad.x = dz(gp.axes[0]); pad.z = -dz(gp.axes[1]); pad.cx = dz(gp.axes[2] || 0); pad.cy = dz(gp.axes[3] || 0);
  const b = i => !!gp.buttons[i]?.pressed, edge = i => b(i) && !padPrev[i];
  pad.jumpHeld = b(0);
  if (edge(0)) pressed.add(mode === 'dialogue' ? 'Enter' : 'Space');
  if (edge(2)) pressed.add('ShiftLeft'); if (edge(1)) pressed.add('KeyE'); if (edge(3)) pressed.add('KeyQ');
  if (edge(4)) pressed.add('KeyR'); if (edge(5)) pressed.add('KeyG'); if (edge(13)) pressed.add('KeyH'); if (edge(12)) pressed.add('KeyC');
  if (edge(9)) pressed.add('Escape'); if (edge(8)) pressed.add('KeyB');
  padPrev = gp.buttons.map(x => x.pressed);
  if (pad.cx || pad.cy) { cam.yaw -= pad.cx * 0.045 * settings.sensitivity; cam.pitch = clamp(cam.pitch + pad.cy * 0.03 * (settings.invertY ? -1 : 1), -0.12, 1.25); cam.manualT = 2; }
}
const hit = (...codes) => codes.some(c => pressed.has(c));
const held = (...codes) => codes.some(c => keys.has(c));

// ---------------- Camera ----------------
const camRay = new THREE.Raycaster(), camFrom = new THREE.Vector3(), camDir = new THREE.Vector3();
function snapCamera() { cam.tx = P.x; cam.ty = P.y + 1.25; cam.tz = P.z; placeCamera(1); }
function placeCamera(k, target = null, dist = cam.dist, yaw = cam.yaw, pitch = cam.pitch, lookOffset = null) {
  const tx = target ? target.x : cam.tx, ty = target ? target.y : cam.ty, tz = target ? target.z : cam.tz;
  let d = dist;
  const ox = Math.sin(yaw) * Math.cos(pitch), oy = Math.sin(pitch), oz = Math.cos(yaw) * Math.cos(pitch);
  for (let i = 1; i <= 10; i++) {
    const s = d * i / 10, x = tx + ox * s, y = ty + oy * s, z = tz + oz * s;
    if (heightAt(x, z) + 0.6 > y) { d = Math.max(2.2, s * 0.85); break; }
  }
  camRay.set(camFrom.set(tx, ty, tz), camDir.set(ox, oy, oz)); camRay.far = d;
  const hitObj = camRay.intersectObjects(W.occluders, true)[0];
  if (hitObj) d = Math.max(1.8, hitObj.distance - 0.5);
  let x = tx + ox * d, y = ty + oy * d, z = tz + oz * d;
  y = Math.max(y, heightAt(x, z) + 0.7);
  cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k; cam.z += (z - cam.z) * k;
  const sh = settings.reducedMotion ? 0 : shake;
  camera.position.set(cam.x + (Math.random() - 0.5) * sh, cam.y + (Math.random() - 0.5) * sh, cam.z + (Math.random() - 0.5) * sh);
  camera.lookAt(tx + (lookOffset?.x || 0), ty + (lookOffset?.y || 0), tz + (lookOffset?.z || 0));
}
function rightOffset(amount, yaw = cam.yaw) { return { x: Math.cos(yaw) * amount, y: 0, z: -Math.sin(yaw) * amount }; }
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 9);
  if (mode === 'title' || mode === 'loading') {
    const a = time * 0.05; cam.x = Math.sin(a) * 30; cam.z = Math.cos(a) * 30 + 2; cam.y = 11 + Math.sin(time * 0.2) * 2;
    camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(0, 3, 4); return;
  }
  if (mode === 'select') {
    const wide = innerWidth > 900, yaw = 0.25 + Math.sin(time * 0.3) * 0.18;
    placeCamera(k, { x: P.x + 0.5, y: P.y + 1.1, z: P.z }, wide ? 4.6 : 6.2, yaw, wide ? 0.12 : 0.3, wide ? rightOffset(-1.9, yaw) : { x: 0, y: -1.0, z: 0 }); return;
  }
  if (mode === 'intro') { introCam(dt); return; }
  if (mode === 'wardrobe') {
    const wy = wardYaw + Math.sin(time * 0.25) * 0.45;
    placeCamera(k, { x: P.x, y: P.y + 0.95, z: P.z }, 3.6, wy, 0.15, innerWidth > 720 ? rightOffset(1.1, wy) : { x: 0, y: -0.6, z: 0 }); return;
  }
  if (mode === 'dialogue' && D?.focus) {
    const f = D.focus, fy = f.y ?? heightAt(f.x, f.z);
    const mx = (P.x + f.x) / 2, mz = (P.z + f.z) / 2, my = Math.max(P.y, fy) + 1.3;
    const a = Math.atan2(f.x - P.x, f.z - P.z) + Math.PI / 2;
    const dist = clamp(Math.hypot(f.x - P.x, f.z - P.z) * 0.9 + 3.5, 5, f === L.PALACE ? 26 : 14);
    placeCamera(k * 0.6, { x: mx, y: my, z: mz }, dist, a, 0.2); return;
  }
  cam.manualT = Math.max(0, cam.manualT - dt);
  const ft = 1 - Math.exp(-dt * 12);
  cam.tx += (P.x - cam.tx) * ft; cam.ty += (P.y + 1.25 - cam.ty) * (1 - Math.exp(-dt * 6)); cam.tz += (P.z - cam.tz) * ft;
  if (mode === 'play' && settings.autoCam && cam.manualT <= 0) {
    const sp = Math.hypot(P.vx, P.vz);
    if (sp > 3) {
      const fwdx = -Math.sin(cam.yaw), fwdz = -Math.cos(cam.yaw), dot = (P.vx * fwdx + P.vz * fwdz) / sp;
      if (dot > -0.2) cam.yaw += wrapA(Math.atan2(-P.vx, -P.vz) - cam.yaw) * Math.min(1, dt * 1.1);
    }
  }
  placeCamera(mode === 'photo' ? k : 1 - Math.exp(-dt * 14));
  shake = Math.max(0, shake - dt * 1.6);
}

// ---------------- Intro ----------------
let intro = null;
const INTRO = [
  'In a village where the stories are older than the baobabs…',
  '…lives a girl who is never late for an adventure — and her Papa, Ike the blacksmith.',
  'Out past the village, monsters roam: beetles, Greedlings, charging Harmattan Brutes and the wisps of Story-time.',
  'Tonight Grandma Adaeze has called them to the story fire. The old feast in the sky is fading…',
  '…and something is stirring inside the Story Calabash.',
];
function startIntro() { mode = 'intro'; intro = { t: 0, i: -1 }; $('cine').hidden = false; $('hud').hidden = true; }
function introCam(dt) {
  intro.t += dt;
  const i = Math.min(INTRO.length - 1, Math.floor(intro.t / 4.2));
  if (i !== intro.i) { intro.i = i; const p = $('cineText'); p.style.opacity = 0; setTimeout(() => { p.textContent = genderize(INTRO[i].replace('a girl', S.name)); p.style.opacity = 1; }, 300); }
  const k = clamp(intro.t / (INTRO.length * 4.2), 0, 1), e = k * k * (3 - 2 * k);
  const from = { x: -40, y: 36, z: -70 }, to = { x: P.x + 2, y: P.y + 3, z: P.z + 7 };
  camera.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, from.z + (to.z - from.z) * e);
  camera.lookAt(P.x * e, 4 + (P.y + 1.2 - 4) * e, -60 + (P.z + 60) * e);
  idleModel(dt);
  if (intro.t > INTRO.length * 4.2 + 0.5) skipIntro();
}
function skipIntro() {
  if (mode !== 'intro') return;
  $('cine').hidden = true; cam.x = camera.position.x; cam.y = camera.position.y; cam.z = camera.position.z; cam.yaw = 0;
  enterPlay();
  setTimeout(() => toast('Careful: if your hearts run out, <b>the story ends</b> and begins again from the very start.', 5), 4200);
  toast(`Find <b>Grandma Adaeze</b> by the story fire.${stageId() === 'child' ? ' Papa will follow you.' : ' Papa waits at his forge — press C to call him.'}`, 3.5);
}

// ---------------- Title and Getting Ready ----------------
function showTitle() {
  mode = 'title'; $('title').hidden = false; $('hud').hidden = true; $('select').hidden = true; $('wardrobe').hidden = true;
  const s = loadGame();
  $('btnContinue').hidden = !s;
  if (s) $('continueInfo').textContent = `${s.name} · ${STAGES[stageIndex(s.stage)].name} · ${QUEST[questIndex(s.quest)].title} · ${fmt(s.elapsed)}`;
  // With a saved adventure, Continue is the big gold button and comes first.
  const cont = $('btnContinue'), fresh = $('btnNew');
  cont.className = s ? 'btn gold big' : 'btn big'; fresh.className = s ? 'btn' : 'btn gold big';
  fresh.firstChild.textContent = s ? 'New adventure ' : 'Begin the tale ';
  if (s) cont.parentNode.insertBefore(cont, fresh); else fresh.parentNode.insertBefore(fresh, cont);
  P.x = L.START.x; P.z = L.START.z; P.y = heightAt(P.x, P.z); P.face = Math.PI;
  amara.root.visible = true; amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = 0.3;
  papa.place(P.x + 1.3, P.z + 0.4, heightAt(P.x + 1.3, P.z + 0.4)); papa.S.face = -0.2; papa.S.mode = 'wait'; audio.setScene({ victory: false, zone: 'village' }); closeChat();
}
let lookTab = 'hair', selGender = 'f', selStage = 'child', selTalent = 'brave', selWeapon = 'staff', selName = '', draftLook = defaultLookFor('f'), selfieUrl = loadSelfie(), selfieBlob = null, realFriends = loadFriends();
function previewHero() {
  S = freshSave({ name: selName, gender: selGender, talent: selTalent, stage: selStage, look: draftLook }); S.weapon = selWeapon;
  rebuildAmara(); amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = 0;
}
function showSelect() {
  mode = 'select'; $('title').hidden = true; $('select').hidden = false;
  P.x = L.START.x; P.z = L.START.z; P.y = heightAt(P.x, P.z); P.face = 0;
  previewHero(); refreshFriends();
  papa.place(P.x - 1.5, P.z - 0.9, heightAt(P.x - 1.5, P.z - 0.9)); papa.S.face = 0.3; papa.S.mode = 'wait';
  $('heroName').value = selName; renderCreator(); renderSelfie();
}
function swatch(slot, it) {
  if (slot === 'top' || slot === 'bottom') return it.tex ? `style="background-image:url(${it.tex === 'feather' ? TX.featherPrint().userData.canvas.toDataURL() : TX.clothSwatch(it.tex)})"` : `style="background:${it.color}"`;
  if (it.color) return `style="background:${it.color}"`;
  return '';
}
const LOOK_ICON = { lowcut: '▁', hightop: '▮', twists: '⁞', cornrows: '≡', filacap: '◒', cap: '◓', chain: '◯', puffs: '◎', afro: '●', braids: '⫶', bantu: '⁘', highpuff: '◓', gele: '❀', bow: '⋈', none: '∅', beads: '⁂', stars: '✦', glasses: '◎◎', crown: '✺', clean: '☺', blush: '◕', freckles: '⁖', uli: '⁙', glitter: '✧' };
const seg = (el, items, cur, fn) => { el.innerHTML = items.map(([v, n]) => `<button role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-v="${v}">${n}</button>`).join(''); el.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.v !== cur) { audio.play('ui'); fn(b.dataset.v); } }); };
function renderCreator() {
  seg($('genderPick'), [['f', 'Girl'], ['m', 'Boy']], selGender, g => {
    selGender = g; const keep = { skin: draftLook.skin, hairColor: draftLook.hairColor }; draftLook = { ...defaultLookFor(g), ...keep };
    if (selfieMatch.hair && !fitsGender(lookItem('hair', selfieMatch.hair), g)) delete selfieMatch.hair;
    previewHero(); renderCreator();
  });
  $('heroPick').innerHTML = TALENTS.map(t => `<button role="radio" aria-checked="${t.id === selTalent}" class="${t.id === selTalent ? 'on' : ''}" data-h="${t.id}"><i style="background:${{ brave: '#e8687a', clever: '#2a6fdb', musical: '#2fa84f', swift: '#f2c21b' }[t.id]}"></i><b>${t.name}</b><small><span class="perk">${t.perk}</span></small></button>`).join('');
  $('heroPick').querySelectorAll('button').forEach(b => b.onclick = () => { selTalent = b.dataset.h; audio.play('ui'); previewHero(); renderCreator(); });
  seg($('difficulty'), STAGES.map(st => [st.id, st.name]), selStage, v => { selStage = v; previewHero(); renderCreator(); });
  const st = STAGES[stageIndex(selStage)], dd = DIFFICULTY[st.diff];
  $('diffNote').innerHTML = `<b>${dd.name} challenge</b> · ${TIERS[st.tier].name} weapons · up to ${st.monsters} roaming monsters at a time. ${st.perk}`;
  seg($('weaponPick'), [['staff', 'Story staff'], ['none', 'No weapon']], selWeapon, v => { selWeapon = v; previewHero(); renderCreator(); });
  $('lookTabs').innerHTML = SLOTS.map(sl => `<button class="${sl === lookTab ? 'on' : ''}" data-t="${sl}">${LOOK[sl].label}</button>`).join('');
  $('lookTabs').querySelectorAll('button').forEach(b => b.onclick = () => { lookTab = b.dataset.t; audio.play('ui'); renderCreator(); });
  const owned = new Set([...freeOwned(), ...Object.entries(selfieMatch).map(([k, v]) => k + ':' + v)]);
  $('lookGrid').innerHTML = LOOK[lookTab].items.filter(it => fitsGender(it, selGender)).map(it => {
    const free = owned.has(lookTab + ':' + it.id), on = draftLook[lookTab] === it.id;
    return `<button class="look-opt ${on ? 'on' : ''} ${free ? '' : 'locked'}" data-id="${it.id}"><i ${swatch(lookTab, it)}>${it.color || it.tex ? '' : (LOOK_ICON[it.id] || '◈')}</i>${it.name}${free ? '' : ` <small>${it.cost > 0 ? '◈' + it.cost : 'earn'}</small>`}</button>`;
  }).join('');
  $('lookGrid').querySelectorAll('.look-opt').forEach(b => b.onclick = () => {
    const it = lookItem(lookTab, b.dataset.id);
    if (!owned.has(lookTab + ':' + it.id)) { audio.play('deny'); $('lookNote').textContent = it.cost > 0 ? `${it.name}: buy it at Aunty Ngozi’s boutique for ${it.cost} cowries.` : `${it.name}: ${it.origin || 'found during the adventure'}.`; return; }
    draftLook[lookTab] = it.id; audio.play('ui'); $('lookNote').textContent = it.origin ? `${it.name} — ${it.origin}.` : '';
    previewHero(); renderCreator();
  });
}
// Selfie play: match skin tone and hair colour from a photo on this device; Claude can refine it if the viewer allows.
let selfieMatch = {};
function renderSelfie() {
  const th = $('selfieThumb'); th.hidden = !selfieUrl; if (selfieUrl) th.style.backgroundImage = `url(${selfieUrl})`;
  $('selfieClear').hidden = !selfieUrl;
  $('selfieFace').hidden = !selfieUrl; $('selfieFace').textContent = settings.photoFace !== false ? '🙂 Photo face: on' : '🙂 Photo face: off';
  $('selfieSmart').hidden = !(selfieBlob && CHAT.sample);
}
async function onSelfie(file) {
  if (!file) return;
  $('selfieNote').textContent = 'Reading your photo…';
  try {
    const r = await readSelfie(file);
    selfieUrl = r.thumb; selfieBlob = r.blob; saveSelfie(r.thumb);
    draftLook.skin = r.skin; draftLook.hairColor = r.hairColor; selfieMatch = { skin: r.skin, hairColor: r.hairColor };
    $('selfieNote').textContent = `Your photo is now your face! Skin tone (${lookItem('skin', r.skin).name}) and hair colour (${lookItem('hairColor', r.hairColor).name}) matched too. Your photo stays on this device — other players see a cartoon face.`;
    audio.play('buy'); previewHero(); renderCreator(); renderSelfie();
  } catch { $('selfieNote').textContent = 'That photo could not be read. Try another one.'; }
}
async function smartSelfie() {
  if (!CHAT.sample || !selfieBlob) return;
  const btn = $('selfieSmart'); btn.disabled = true; $('selfieNote').textContent = 'Asking Claude to match your hairstyle and look…';
  try {
    const lim = await CHAT.sample.limits?.(); if (!lim?.images) throw { code: 'images_unavailable' };
    const m = cleanMatch(await CHAT.sample.json(matchPrompt(selGender), { images: [selfieBlob], modelTier: 'quick' }), selGender);
    Object.assign(draftLook, m); Object.assign(selfieMatch, m);
    $('selfieNote').textContent = Object.keys(m).length ? `Smart match: ${Object.entries(m).map(([k, v]) => lookItem(k, v).name).join(', ')}.` : 'Claude could not find a better match — your colours are kept.';
    audio.play('buy'); previewHero(); renderCreator();
  } catch (e) { $('selfieNote').textContent = e?.code === 'not_granted' ? 'Smart match needs your permission to use Claude.' : 'Smart match is not available right now — your colour match is kept.'; }
  btn.disabled = false;
}
function surprise() {
  const owned = new Set(freeOwned());
  for (const sl of SLOTS) { if (selfieMatch[sl]) continue; const opts = LOOK[sl].items.filter(i => owned.has(sl + ':' + i.id) && fitsGender(i, selGender)); draftLook[sl] = opts[Math.floor(Math.random() * opts.length)].id; }
  selTalent = TALENTS[Math.floor(Math.random() * TALENTS.length)].id;
  previewHero(); audio.play('buy'); renderCreator();
}
function beginNew() {
  selName = cleanName($('heroName').value);
  if (!$('heroName').value.trim()) { $('heroName').focus(); $('nameNote').textContent = 'Type your hero’s name first.'; audio.play('deny'); return; }
  previewHero();
  for (const [k, v] of Object.entries(selfieMatch)) if (!S.owned.includes(k + ':' + v)) S.owned.push(k + ':' + v);
  startGame(true);
}

function startGame(isNew) {
  try { navigator.storage?.persist?.(); } catch { /* not supported */ }
  diff = DIFFICULTY[stageDiffKey()];
  enemies.list.forEach(e => { W.scene.remove(e.v.g || e.v.root); });
  enemies = createEnemies(W.scene, diff); boss.reset(); W.scene.remove(boss.B.model.root); W.scene.remove(boss.B.shield);
  boss = createBoss(W.scene, diff);
  rebuildAmara(); refreshMods(); hearts = maxHearts; renderHearts();
  const picked = new Set(S.picked); for (const c of W.cowries) c.taken = picked.has(c.id);
  for (const t of W.threads) { t.taken = S.threads.includes(t.id); t.group.visible = !t.taken && (t.id !== 't5' || solved('drums')); }
  for (const s of W.tales) s.taken = S.tales.includes(s.id);
  for (const k of W.kola) { k.taken = 0; k.group.visible = true; }
  for (const c of Object.values(W.chests)) c.opened = S.chests.includes(c.id);
  for (const d of W.digs) { d.dug = S.dug.includes(d.id); d.mound.scale.y = d.dug ? 0.08 : 0.35; d.revealed = 0; }
  W.ball.taken = S.errands.includes('ball:got') || S.errands.includes('ball:done'); W.ball.mesh.visible = !W.ball.taken;
  layer = 'now'; weave = 0; $('weaveDial').classList.remove('story'); setText($('weaveLabel'), 'NOW'); audio.setWeave(0); audio.setBoss(0);
  bossWall = null; celebrate?.birds.forEach(b => W.scene.remove(b.b.root)); celebrate = null; riddle.phase = 'idle';
  if (S.quest === 'boss') S.quest = 'climb';
  if (S.quest === 'done') { boss.B.model.root.visible = false; boss.B.shield.visible = false; boss.B.state = 'gone'; }
  if (S.quest === 'hawks') enemies.activateQuestHawks();
  mbe.S.state = mbeJoined() ? 'pack' : 'hidden'; mbe.attach(amara.gear.mbeSlot);
  papa.S.mode = 'follow'; papa.S.hold = null; S.grown ||= S.stage; lastCow = S.cowries; refreshFriends(); pebbles.forEach(pb => W.scene.remove(pb.mesh)); pebbles.length = 0; spawnT = 6;
  for (const f of Object.values(friends)) { f.S.mode = 'home'; const h = f.S.home; f.place(h.x, h.z, heightAt(h.x, h.z)); }
  audio.setScene({ victory: false });
  const q = QUEST[qi(S.quest)]; $('quest').textContent = q.title; $('qdetail').textContent = q.detail;
  updateAbilities(); race.on = false; $('race').hidden = true;
  $('title').hidden = true; $('select').hidden = true;
  amara.root.visible = true;
  respawn();
  applyStageRules();
  if (isNew) safeSpot = null;
  if (isNew === 'restart') {
    const G = L.NPCS.grandma; P.x = G.x + 1.5; P.z = G.z + 3.2; P.y = heightAt(P.x, P.z); P.inv = 2; P.face = Math.atan2(G.x - P.x, G.z - P.z);
    if (stageId() === 'child') papa.place(P.x + 1.5, P.z + 1.2, heightAt(P.x + 1.5, P.z + 1.2));
    snapCamera(); enterPlay(); updateHUD(); setTimeout(() => grandmaLesson(S.lesson), 700);
  } else if (isNew) { P.x = L.START.x; P.z = L.START.z; P.y = heightAt(P.x, P.z); P.inv = 0; papa.place(P.x + 1.5, P.z + 1.2, heightAt(P.x + 1.5, P.z + 1.2)); startIntro(); }
  else {
    const resumed = resumeSpot();
    enterPlay(); toast(`Welcome back, <b>${esc(S.name)}</b>! ${resumed ? 'You’re right where you left off.' : 'You’re back at your last story drum.'}`, 3.5);
    if (S.lesson) setTimeout(() => grandmaLesson(S.lesson), 1200);
  }
  riding = false; bikeModel && W.scene.remove(bikeModel.root); bikeModel = null; bikeRace = null; fishing = null; cooking = null; $('hobbyUI').hidden = true;
  const day = dayNumber(); if (S.today?.day !== day) S.today = { day };
  const gift = dailyGift(S.daily, day);
  if (gift) { S.daily = { day: gift.day, streak: gift.streak }; setTimeout(() => { giveCoins(gift.coins); audio.play('buy'); toast(`🎁 Daily gift: <b>+${gift.coins} cowries</b> · day ${gift.streak} streak${gift.streak < 7 ? ' — come back tomorrow for more!' : '!'}`, 5); persist(); }, isNew ? 26000 : 1500); }
  persist();
}
function resumeSpot() {
  const p = S.pos; if (!p) return false;
  if (p.layer === 'story' && env.abilities.weave) { layer = 'story'; weave = 1; refreshActive(); audio.setWeave(1); $('weaveDial').classList.add('story'); setText($('weaveLabel'), 'STORY-TIME'); }
  const ground = surfaceBelow(env, p.x, p.z, p.y + 1.5);
  if (!ground || !Number.isFinite(ground.y) || Math.abs(ground.y - p.y) > 2.5 || ground.y < WATER_Y + 0.1) return false;
  Object.assign(P, { x: p.x, y: ground.y + 0.05, z: p.z, vx: 0, vy: 0, vz: 0, face: p.face, inv: 1.5, grounded: true });
  safeSpot = { ...p };
  const side = (x, z) => surfaceBelow(env, x, z, P.y + 1.5).y;
  if (papa.S.mode === 'follow') papa.place(P.x + 1.5, P.z + 1.2, side(P.x + 1.5, P.z + 1.2));
  cam.yaw = p.face + Math.PI; snapCamera();
  return true;
}
function enterPlay() { mode = 'play'; $('hud').hidden = false; $('touch').hidden = !isTouch; $('rotateHint').hidden = !isTouch; document.body.classList.toggle('touch-on', isTouch); updateHint(); canvas.focus(); }
function updateHint() {
  const gp = [...(navigator.getGamepads?.() || [])].some(Boolean);
  $('hint').innerHTML = gp ? 'Ⓐ jump · Ⓧ spin · Ⓑ talk/act · Ⓨ weave · LB throw Mbe · RB sniff · ↓ eat · ↑ Papa · Start menu'
    : '<kbd>WASD</kbd>move <kbd>Space</kbd>jump <kbd>Shift</kbd>attack <kbd>X</kbd>bike <kbd>Z</kbd>emote <kbd>Y</kbd>hobbies <kbd>E</kbd>talk / act <kbd>R</kbd>throw Mbe <kbd>G</kbd>sniff <kbd>Q</kbd>weave<br><kbd>H</kbd>eat <kbd>B</kbd>bag <kbd>C</kbd>Papa <kbd>V</kbd>call friend <kbd>Enter</kbd>chat <kbd>F</kbd>dance <kbd>P</kbd>photo <kbd>T</kbd>tales <kbd>Esc</kbd>menu';
}
// Saving: the last safe spot the hero stood on is stored with the save, so returning players resume right there.
let safeSpot = null;
function trackSafeSpot() {
  if (!P.grounded || P.inv > 1 || race.on || bikeRace || P.y < WATER_Y + 0.1 || S.quest === 'boss') return;
  safeSpot = { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), face: +P.face.toFixed(2), layer };
}
function persist() {
  if (!S || mode === 'title' || mode === 'select' || mode === 'loading' || mode === 'intro') return;
  if (safeSpot) S.pos = safeSpot;
  S.savedAt = Date.now();
  if (!saveGame(S) && !persist.warned) { persist.warned = true; toast('Your progress can’t be saved in this browser (private mode?). Use a normal browser tab to keep your adventure.', 6); }
}

// ---------------- Panels ----------------
const panel = $('panel');
function openPanel(kicker, html, onOpen) {
  if (mode === 'play') mode = 'paused';
  $('pKicker').textContent = kicker; $('pBody').innerHTML = html; if (!panel.open) panel.showModal(); onOpen?.();
}
function closePanel() { if (panel.open) panel.close(); }
panel.addEventListener('close', () => { keys.clear(); if (mode === 'paused' || mode === 'victory') { mode = 'play'; canvas.focus(); } });
function openPause() {
  if (mode !== 'play') return;
  openPanel('PAUSED', `<h2>Rest a moment, ${esc(S.name)}.</h2><p>Your adventure saves automatically on this device. ${QUEST[qi(S.quest)].title}.</p>
    <div class="p-actions col"><button class="btn gold" id="pmResume">Keep exploring</button><button class="btn" id="pmBag">Bag</button><button class="btn" id="pmWard">Change my look</button>
    <button class="btn" id="pmHobby">Hobbies &amp; prizes</button><button class="btn" id="pmTales">Tale Book</button><button class="btn" id="pmSet">Settings</button><button class="btn" id="pmHelp">How to play</button><button class="btn" id="pmTitle">Save &amp; return to title</button></div>`, () => {
    $('pmResume').onclick = closePanel; $('pmBag').onclick = () => { closePanel(); setTimeout(openBag, 0); };
    $('pmWard').onclick = () => { closePanel(); setTimeout(() => openWardrobe(false), 0); };
    $('pmTales').onclick = openTales; $('pmHobby').onclick = openHobbies; $('pmSet').onclick = openSettings; $('pmHelp').onclick = openHelp;
    $('pmTitle').onclick = () => { persist(); closePanel(); mode = 'title'; showTitle(); };
  });
}
function openHelp() {
  openPanel('HOW TO PLAY', `<h2>Your hero, Papa and Mbe</h2>
    <p>Name your own hero, choose girl or boy, a talent and an age — <b>child, teenager, youth or adult</b>. Your age sets the challenge (Story, Adventure, Hard, Legend), how many monsters roam, and the metal of your weapons (wooden, iron, bronze, gold). Earn cowries to grow older: teenager at 120, youth at 300, adult at 600. Take a selfie to match your skin tone and hair.</p>
    <p><b>Amara, Hadassah, Tehilah, Tiara, Tobi, Emeka, Dayo and Musa</b> are your village friends: chat with them, and from teenager on call them in for hard fights. Add real friends with a friend code in the Friends chat and invite them into your game. While you are a child, <b>Papa Ike</b> the blacksmith follows you everywhere; later he waits at his forge, which also sells weapons. <b>Mbe</b>, the trickster tortoise, rides in your basket: throw him as a rolling shell or let him sniff out treasure.</p>
    <p><b>Hobbies:</b> fish from the river jetty (wait for the float to dip, then tap in the green to reel), cook dishes at the village pot from groceries and fish, and ride a bike from Musa’s stand round the ten-gate village loop. Each hobby levels up and pays prizes — cowries, a straw hat, a chef’s jacket, racing trainers and a golden bike. Sell fish and dishes to Mama Nkem. Come back daily for a gift and three new challenges.</p>
    <p><b>If your hearts run out, the story ends</b> and begins again from the very beginning. Grandma Adaeze then teaches you how to beat whatever ended it — with a practice fight by her fire for beetles, Greedlings and Brutes. Your hero, outfits, badges, hobbies and friends are kept. Story drums refill your hearts; food from your bag heals.</p>
    <p>Monsters roam at random beyond the village: <b>beetles</b>, cowry-stealing <b>Greedlings</b>, horned <b>Harmattan Brutes</b> that charge (dodge sideways, then strike while they pant), and, in Story-time, <b>wisps</b> that throw fire orbs and packs of <b>shadow hyenas</b> that circle and lunge. Friends and Papa you call in fight beside you.</p>
    <p>The fourth dimension is <b>time</b>. Press Q to slip between Now and Story-time. Spirit bridges, one golden thread and the shadow hawks exist only in Story-time; ruins and dust devils belong to Now.</p>
    <h3>Controls</h3><div class="controls">
    <kbd>W A S D</kbd><span>Move · drag the mouse to look · scroll to zoom</span><kbd>Space</kbd><span>Jump · again for double jump · hold to glide</span>
    <kbd>Shift</kbd><span>Attack with your weapon: staff or bare-hands spin, catapult shot, spear lunge, sword slash</span><kbd>E</kbd><span>Talk, open, dig, shop — or beat your drum to stun enemies</span>
    <kbd>R</kbd><span>Throw Mbe as a rolling shell</span><kbd>G</kbd><span>Mbe sniffs for treasure</span><kbd>Q</kbd><span>Time Weave</span>
    <kbd>H</kbd><span>Eat a snack from your bag</span><kbd>B</kbd><span>Open your bag</span><kbd>C</kbd><span>Papa: beside you while you are a child; from teenager on he stays at his forge and C calls him in for one minute of help</span><kbd>V</kbd><span>Call an online village friend to help (teenagers)</span><kbd>Enter</kbd><span>Open chat: Nearby, Papa &amp; Mbe, Friends (add and invite real friends there)</span>
    <kbd>X · Z · Y</kbd><span>Ride your bike · emotes (wave, cheer, dance, high five) · hobbies, prizes, badges and daily challenges</span>
    <kbd>F · P · T · Esc</kbd><span>Dance · photo mode · Tale Book · pause</span>
    <kbd>Controller</kbd><span>A jump · X spin · B act · Y weave · LB throw · RB sniff · D-pad ↓ eat · ↑ Papa</span></div>
    <h3>Tips</h3><p>Coins (cowries) come from the ground, chests, buried treasure, errands and defeated enemies. Spend them at Mama Nkem’s stall (food, groceries, items), Aunty Ngozi’s boutique (outfits) and Papa’s forge (upgrades). Greedlings steal cowries — defeat them to get them back. Story drums are checkpoints and refill your hearts.</p>
    <h3>About the tale</h3><p>${TALE_NOTE}</p>`);
}
function openHobbies() {
  const day = dayNumber(), today = S.today?.day === day ? S.today : { day };
  const bar = h => { const xp = S.hobby[h], lv = levelOf(xp), nx = nextLevelXp(xp), lo = LEVEL_XP[lv - 1]; return `<div class="hb"><b>${HOBBIES[h].icon} ${HOBBIES[h].name} · level ${lv}</b><div class="xp"><i style="width:${nx ? ((xp - lo) / (nx - lo) * 100).toFixed(0) : 100}%"></i></div><small>${nx ? `${xp}/${nx} XP · next prize: ${Object.entries(HOBBIES[h].prizes).filter(([l]) => +l > lv).map(([l, p]) => `L${l} ${p.label || (p.bike ? 'golden bike' : p.badge ? 'master badge' : '')}${p.coins ? ` +${p.coins}◈` : ''}`)[0] || ''}` : 'Max level!'}</small></div>`; };
  openPanel('HOBBIES & PRIZES', `<h2>Hobbies & prizes</h2>${['fish', 'cook', 'bike'].map(bar).join('')}
    <p class="note">🎣 River jetty north of the village · 🍲 The village pot near the fire · 🚲 Musa’s bike stand by the entrance (X to ride)</p>
    <h3>Today’s challenges</h3><ul class="checklist">${challengesFor(day).map(c => { const n = Math.min(c.goal, today[c.stat] || 0), done = today['done_' + c.id]; return `<li class="${done ? 'ok' : ''}">${done ? '✓ ' : ''}${c.text} — ${n}/${c.goal} · +${c.coins}◈</li>`; }).join('')}</ul>
    <p class="note">Daily gift streak: <b>${S.daily?.streak || 0}</b> day${S.daily?.streak === 1 ? '' : 's'}. Come back tomorrow for a bigger gift.</p>
    <h3>Fish collection</h3><div class="badges">${FISH.map(f => `<span class="badge ${S.catches[f.id] ? 'on' : ''}" title="${f.note}">${S.catches[f.id] ? f.icon : '?'}<small>${S.catches[f.id] ? `${f.name} ×${S.catches[f.id]}` : '???'}</small></span>`).join('')}</div>
    <h3>Badges</h3><div class="badges">${BADGES.map(b => `<span class="badge ${S.badges.includes(b.id) ? 'on' : ''}">${b.icon}<small>${b.name}</small></span>`).join('')}</div>
    ${S.bikeBest ? `<p class="note">Best bike loop: <b>${S.bikeBest.toFixed(1)}s</b> (par ${BIKE_PAR}s)</p>` : ''}`);
}
function openTales() {
  openPanel('TALE BOOK', `<h2>How the Tortoise Got His Cracked Shell</h2><p>${TALE_NOTE}</p>` + TALES.map((t, i) => {
    const got = S.tales.includes('tale' + i);
    return `<div class="tale-card ${got ? '' : 'locked'}"><h3>${i + 1}. ${got ? t.title : 'Undiscovered'}</h3><p>${got ? t.text : 'Find the Tale Stone to hear this part of the story.'}</p></div>`;
  }).join(''));
}
function openSettings() {
  const s = settings;
  openPanel('SETTINGS', `<h2>Settings</h2>
    <label class="setting"><span>Graphics quality</span><select id="sQ">${['auto', 'low', 'medium', 'high'].map(q => `<option ${q === s.quality ? 'selected' : ''} value="${q}">${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select></label>
    <label class="setting"><span>Music volume</span><input id="sM" type="range" min="0" max="1" step="0.05" value="${s.music}"></label>
    <label class="setting"><span>Effects volume</span><input id="sS" type="range" min="0" max="1" step="0.05" value="${s.sfx}"></label>
    <label class="setting"><span>Camera sensitivity</span><input id="sC" type="range" min="0.3" max="2.5" step="0.1" value="${s.sensitivity}"></label>
    <label class="setting"><span>Invert vertical look</span><input id="sI" type="checkbox" ${s.invertY ? 'checked' : ''}></label>
    <label class="setting"><span>Camera follows movement</span><input id="sA" type="checkbox" ${s.autoCam ? 'checked' : ''}></label>
    <label class="setting"><span>Reduce motion (no shake or ripples)</span><input id="sR" type="checkbox" ${s.reducedMotion ? 'checked' : ''}></label>
    <label class="setting"><span>Text size</span><input id="sT" type="range" min="0.9" max="1.4" step="0.05" value="${s.textSize}"></label>
    <label class="setting"><span>Slower dialogue text</span><input id="sD" type="checkbox" ${s.subtitlesSlow ? 'checked' : ''}></label>
    ${window.claude ? '' : `<label class="setting"><span>Play online with other players (reload to apply)</span><input id="sO" type="checkbox" ${s.playOnline !== false ? 'checked' : ''}></label>`}`, () => {
    const on = (id, fn) => $(id).addEventListener('input', e => { fn(e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value); saveSettings(settings); });
    on('sQ', v => { settings.quality = v; qualityLocked = v !== 'auto'; applyQuality(); });
    on('sM', v => { settings.music = v; audio.setVolumes(settings.music, settings.sfx); });
    on('sS', v => { settings.sfx = v; audio.setVolumes(settings.music, settings.sfx); audio.play('cowry'); });
    on('sC', v => { settings.sensitivity = v; }); on('sI', v => { settings.invertY = v; }); on('sA', v => { settings.autoCam = v; });
    on('sR', v => { settings.reducedMotion = v; }); on('sT', v => { settings.textSize = v; document.documentElement.style.setProperty('--ts', v); });
    on('sD', v => { settings.subtitlesSlow = v; });
    if ($('sO')) on('sO', v => { settings.playOnline = v; });
  });
}
function openBoard(highlight = -1) {
  const b = loadBoard();
  openPanel('LEADERBOARD', `<h2>Keepers of the Tale</h2><p>Top runs on this device. Score = cowries, Tale Stones, treasure, enemies, style and speed, multiplied by the challenge of your age.</p>
    ${b.length ? `<div style="overflow-x:auto"><table class="board"><tr><th>#</th><th>NAME</th><th>SCORE</th><th>GRADE</th><th>TIME</th><th>AGE · CHALLENGE</th></tr>${b.map((e, i) => `<tr class="${i === highlight ? 'me' : ''}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.score.toLocaleString('en-GB')}</td><td>${e.grade}</td><td>${fmt(e.time)}</td><td>${esc(e.difficulty)}</td></tr>`).join('')}</table></div>` : '<p><i>No finished tales yet. Be the first.</i></p>'}`);
}
function showVictory() {
  mode = 'victory';
  const style = Math.max(0, mods.style + S.owned.length - freeOwned().length), treasure = S.dug.length + S.chests.length;
  const pts = score({ cowries: S.cowries, tales: S.tales.length, enemies: S.enemies, seconds: S.elapsed, deaths: S.deaths, style, treasure, difficulty: stageDiffKey() });
  const g = grade(pts);
  openPanel('THE FEAST IS SHARED', `<div class="row" style="align-items:center;gap:1.2em"><div class="grade">${g}</div><div><h2 style="margin:0">Tale restored!</h2><p style="margin:.2em 0">${esc(S.name)} · ${stageDef().name} · ${diff.name} · ${pts.toLocaleString('en-GB')} points</p></div></div>
    <div class="result-grid"><div><small>TIME</small><b>${fmt(S.elapsed)}</b></div><div><small>COWRIES</small><b>${S.cowries}</b></div><div><small>TALE STONES</small><b>${S.tales.length}/6</b></div><div><small>TREASURE</small><b>${treasure}/${W.digs.length + Object.keys(W.chests).length}</b></div><div><small>ENEMIES</small><b>${S.enemies}</b></div><div><small>STYLE</small><b>${style}</b></div></div>
    <p>Add your name to this device’s leaderboard:</p><div class="row"><input id="vName" class="name-input" maxlength="14" value="${esc(S.name)}"><button class="btn gold" id="vSave">Save score</button></div>
    <div class="p-actions"><button class="btn" id="vFree">Keep exploring</button><button class="btn" id="vTitle">Title screen</button></div>`, () => {
    $('vSave').onclick = () => { const name = cleanName($('vName').value || S.name); const i = addToBoard({ name, score: pts, time: S.elapsed, grade: g, hero: S.name, difficulty: `${stageDef().name} · ${diff.name}`, date: new Date().toISOString().slice(0, 10) }); audio.play('buy'); openBoard(i); };
    $('vFree').onclick = () => { closePanel(); mode = 'play'; };
    $('vTitle').onclick = () => { closePanel(); showTitle(); };
  });
}

// ---------------- Wardrobe (mirror and boutique) ----------------
let wTab = 'hair', wShop = false, wardYaw = 0;
function openWardrobe(shop) {
  const spot = shop ? L.NPCS.tailor : L.MIRROR;
  wardYaw = Math.atan2(P.x - spot.x, P.z - spot.z);
  P.face = wardYaw; amara.root.rotation.y = wardYaw;
  wShop = shop; prevMode = 'play'; mode = 'wardrobe'; $('wardrobe').hidden = false; $('hud').hidden = true;
  $('wKicker').textContent = shop ? 'AUNTY NGOZI’S BOUTIQUE' : `${S.name.toUpperCase()}’S MIRROR`; wTab = shop ? 'hair' : 'who';
  $('wTitle').textContent = shop ? 'Boutique' : 'Get ready';
  renderWardrobe(); audio.play('ui');
}
function closeWardrobe() { $('wardrobe').hidden = true; $('hud').hidden = false; mode = 'play'; persist(); canvas.focus(); }
function renderWardrobe() {
  $('wCowries').textContent = S.cowries;
  const tabs = wShop ? SLOTS : ['age', ...SLOTS];
  if (!tabs.includes(wTab)) wTab = tabs[0];
  $('wTabs').innerHTML = tabs.map(k => `<button class="${k === wTab ? 'on' : ''}" data-t="${k}">${k === 'age' ? 'Age' : LOOK[k].label}</button>`).join('');
  $('wTabs').querySelectorAll('button').forEach(b => b.onclick = () => { wTab = b.dataset.t; audio.play('ui'); renderWardrobe(); });
  $('wFoot').textContent = wShop ? 'Buy with cowries. Each piece names its origin so traditions stay distinct.' : 'Buy new pieces at Aunty Ngozi’s boutique in the market.';
  if (wTab === 'age') {
    const items = STAGES.map(st => ({ id: st.id, name: st.name, sub: `${DIFFICULTY[st.diff].name} challenge · ${TIERS[st.tier].name} weapons · ${st.earn ? st.perk : 'Papa walks beside you everywhere'}${S.earned < st.earn ? ` · earn ${st.earn - S.earned} more cowries` : ''}`, on: st.id === S.stage, ok: S.earned >= st.earn, col: TIERS[st.tier].color }));
    $('wGrid').innerHTML = items.map(it => `<div class="w-item ${it.on ? 'on' : ''}"><span class="w-sw" style="background:${it.col}">${it.name[0]}</span><div><b>${it.name}</b><small>${it.sub}</small></div>${it.on ? '<button class="btn" disabled>Current</button>' : it.ok ? `<button class="btn gold" data-pick="${it.id}">Choose</button>` : '<button class="btn" disabled>Locked</button>'}</div>`).join('');
    $('wGrid').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      S.stage = b.dataset.pick; applyDifficulty(); applyStageRules(); toast(`${stageDef().name}: <b>${diff.name}</b> challenge, ${tier().name.toLowerCase()} weapons.`, 3);
      rebuildAmara(); amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = wardYaw; refreshMods(); audio.play('buy'); persist(); renderWardrobe();
    });
    return;
  }
  $('wGrid').innerHTML = LOOK[wTab].items.filter(it => fitsGender(it, S.gender)).map(it => {
    const key = wTab + ':' + it.id, own = S.owned.includes(key), on = S.look[wTab] === it.id;
    let btn;
    if (on) btn = '<button class="btn" disabled>Wearing</button>';
    else if (own) btn = `<button class="btn gold" data-wear="${it.id}">Wear</button>`;
    else if (it.cost < 0) btn = '<button class="btn" disabled>Find it</button>';
    else if (!wShop) btn = `<button class="btn" disabled>◈ ${it.cost}</button>`;
    else btn = `<button class="btn ${S.cowries >= it.cost ? 'gold' : ''}" data-buy="${it.id}" ${S.cowries >= it.cost ? '' : 'disabled'}>Buy ◈ ${it.cost}</button>`;
    return `<div class="w-item ${on ? 'on' : ''}"><span class="w-sw" ${swatch(wTab, it)}>${it.color || it.tex ? '' : (LOOK_ICON[it.id] || '◈')}</span><div><b>${it.name}</b>${it.origin ? `<small>${it.origin}</small>` : ''}${it.perk ? `<div class="perk">${it.perk}</div>` : ''}</div>${btn}</div>`;
  }).join('');
  $('wGrid').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => wear(b.dataset.wear));
  $('wGrid').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const it = lookItem(wTab, b.dataset.buy); if (S.cowries < it.cost) return audio.play('deny');
    S.cowries -= it.cost; S.owned.push(wTab + ':' + it.id); audio.play('buy'); wear(it.id);
  });
}
function wear(id) {
  S.look = { ...S.look, [wTab]: id }; rebuildAmara(); amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = wardYaw;
  refreshMods(); audio.play('ui'); sparks(P.x, P.y + 1.2, P.z, '#ffd35a', 18, 3, 0.3, 0.6, 2); persist(); renderWardrobe();
}

// ---------------- UI wiring ----------------
function bindUI() {
  $('btnNew').onclick = () => {
    audio.init(); audio.play('ui');
    const s = loadGame(); if (!s) return showSelect();
    openPanel('NEW ADVENTURE', `<h2>Start a new adventure?</h2><p>This replaces <b>${esc(s.name)}</b>’s saved adventure (${esc(QUEST[questIndex(s.quest)].title)}, ${fmt(s.elapsed)} played) on this device. Your friends list and selfie are kept.</p>
      <div class="p-actions"><button class="btn gold" id="ncKeep">Keep playing ${esc(s.name)}</button><button class="btn" id="ncNew">Start a new adventure</button></div>`, () => {
      $('ncKeep').onclick = () => { closePanel(); S = loadGame(); startGame(false); };
      $('ncNew').onclick = () => { closePanel(); showSelect(); };
    });
  };
  $('btnContinue').onclick = () => { audio.init(); const s = loadGame(); if (!s) return; S = s; startGame(false); };
  $('btnBoard').onclick = () => openBoard(); $('btnSettings').onclick = openSettings; $('btnHelp').onclick = openHelp;
  $('selBack').onclick = () => { audio.play('ui'); showTitle(); };
  $('selGo').onclick = () => { audio.init(); audio.play('checkpoint'); beginNew(); };
  $('selRandom').onclick = surprise;
  $('heroName').addEventListener('input', e => { selName = e.target.value; $('nameNote').textContent = ''; });
  $('heroName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); $('heroName').blur(); } });
  $('selfieBtn').onclick = () => $('selfieInput').click();
  $('selfieInput').addEventListener('change', e => { onSelfie(e.target.files?.[0]); e.target.value = ''; });
  $('selfieSmart').onclick = smartSelfie;
  $('selfieFace').onclick = () => { settings.photoFace = settings.photoFace === false; saveSettings(settings); audio.play('ui'); previewHero(); renderSelfie(); };
  $('selfieClear').onclick = () => { selfieUrl = null; selfieBlob = null; selfieMatch = {}; saveSelfie(null); $('selfieNote').textContent = 'Photo removed from this device.'; renderSelfie(); renderCreator(); };
  $('pClose').onclick = closePanel; $('wClose').onclick = closeWardrobe;
  $('bMenu').onclick = openPause; $('bHobby').onclick = () => { if (mode === 'play') openHobbies(); };
  if (document.fullscreenEnabled) { $('bFull').hidden = false; $('bFull').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}); } catch { /* not allowed here */ } }; } $('bBag').onclick = () => { if (mode === 'play') openBag(); };
  $('bChat').onclick = () => CHAT.open ? closeChat() : openChat();
  $('friendsChip').addEventListener('click', () => openChat('friends'));
  $('chatClose').onclick = closeChat;
  $('chatForm').addEventListener('submit', e => { e.preventDefault(); const v = $('chatInput').value; $('chatInput').value = ''; sendChat(v); });
  $('chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeChat(); } e.stopPropagation(); });
  $('chatSmart').addEventListener('change', e => { settings.smartChat = e.target.checked; saveSettings(settings); });
  initOnline();
  $('bMusic').onclick = () => { audio.init(); audio.setEnabled(!audio.enabled); $('bMusic').style.opacity = audio.enabled ? 1 : 0.4; };
  addEventListener('pagehide', persist); addEventListener('beforeunload', persist); document.addEventListener('freeze', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
}

// ---------------- Main loop ----------------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (window.__shellbound?.paused) return; // trailer recording drives frames itself
  simulate(dt);
  composer.render();
}
function simulate(dt) {
  time += dt; frameDt = dt;
  pollPad();
  if (mode === 'intro' && pressed.size) skipIntro(); // keyboard or controller
  if (S && !['title', 'select', 'loading', 'intro'].includes(mode)) { autoSaveT += dt; if (autoSaveT > 5) { autoSaveT = 0; persist(); } }
  if (S && S.cowries > lastCow) S.earned += S.cowries - lastCow; if (S) lastCow = S.cowries;
  if (mode === 'play') playStep(dt);
  else if (mode === 'dialogue') {
    updateDialogue(dt);
    const l = D?.lines[D.i];
    if (l?.choices) { for (let i = 0; i < l.choices.length; i++) if (hit('Digit' + (i + 1))) { pick(i); break; } }
    else if (hit('KeyE', 'Enter', 'Space', 'KeyJ')) advance();
    S.elapsed += dt; idleModel(dt);
  }
  else if (mode === 'wardrobe') { if (hit('Escape', 'KeyE')) closeWardrobe(); idleModel(dt); }
  else if (mode === 'photo') photoStep(dt);
  else if (mode === 'fishing') fishStep(dt);
  else if (mode === 'cooking') cookStep(dt);
  else if (mode === 'select' || mode === 'title') idleModel(dt);
  else if (mode === 'paused' && hit('Escape')) closePanel();
  if (mode === 'title' && hit('Enter')) showSelect();

  const target = layer === 'story' ? 1 : 0;
  weave += (target - weave) * Math.min(1, dt * (settings.reducedMotion ? 20 : 4.5));
  if (Math.abs(target - weave) < 0.002) weave = target;
  if (ripple > 0) { ripple += dt * 1.4; if (ripple >= 1 || settings.reducedMotion) ripple = 0; }
  weaveCd = Math.max(0, weaveCd - dt); drumCd = Math.max(0, drumCd - dt); sniffCd = Math.max(0, sniffCd - dt);
  hurtFx = Math.max(0, hurtFx - dt * 1.8); liftedT = Math.max(0, liftedT - dt);
  for (const k of Object.keys(buffs)) buffs[k] = Math.max(0, buffs[k] - (mode === 'play' ? dt : 0));
  updateLighting();
  W.update(dt, time, weave, camera); HW.update(dt, time);
  animateNPCs(dt);
  updateCompanions(dt);
  updateParty(dt);
  if (mode === 'play') { updateAttack(dt); spawnMonsters(dt); }
  if (mode !== 'loading') enemies.update(dt, time, enemyCtx);
  if (S && (S.quest === 'boss' || boss.B.state === 'defeated')) boss.update(dt, time, bossCtx);
  else if (S?.quest !== 'done') boss.B.model.animate(dt, { t: time, speed: 0, grounded: true });
  if (celebrate) updateCelebration(dt);
  updateBubble(dt);
  updateFx(dt);
  updateCamera(dt);
  grade_.uniforms.uRipple.value = ripple; grade_.uniforms.uWeave.value = weave; grade_.uniforms.uHurt.value = hurtFx;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  pressed.clear(); for (const k of ['jump', 'spin', 'act', 'weave', 'mbe', 'sniff', 'papa', 'bike', 'emote']) touch[k] = false;
  autoQuality(dt);
}

const enemyCtx = {
  get player() { return P; }, get weave() { return weave; }, get attackDmg() { return S ? weaponDmg() : 1; },
  hurt: (x, z, d, p, e) => hurt(x, z, d, p, e),
  bounce: () => { P.vy = 12; P.jumps = 1; audio.play('stomp'); },
  defeat: (e, n, src = 'hero') => {
    if (e.practice) { sparks(e.x, e.y + 1, e.z, '#ffd35a', 30, 6); return; }
    // A monster beaten by a helper earns nothing, and the helper takes a share: half the reward, at least 1 cowry.
    if (src.startsWith('helper:') || src === 'party') {
      audio.play('stomp'); sparks(e.x, e.y + 1, e.z, '#e8e0d0', 18, 5);
      if (src === 'party') return;
      const id = src.slice(7), who = id === 'papa' ? 'Papa' : (HEROES.find(h => h.id === id)?.name || 'Your friend');
      const fee = Math.min(S.cowries, Math.max(1, Math.ceil(n / 2)));
      S.cowries -= fee; S.helperFees = (S.helperFees || 0) + fee;
      toast(fee ? `${who} beat it — <b>${who}’s share: −${fee} ◈</b>. Land the final blow yourself to earn the reward!` : `${who} beat it for you. Land the final blow yourself to earn cowries!`, 3);
      return;
    }
    S.enemies++; bump('monToday'); S.cowries += n; audio.play('defeat'); sparks(e.x, e.y + 1, e.z, { hawk: '#b48cff', greed: '#b48cff', brute: '#ff7a3a', wisp: '#7fe9ff', hyena: '#9a7bff' }[e.kind] || '#7dffb0', e.kind === 'brute' ? 44 : 26, 7); toast(`+${n} ◈`, 1.2); },
  steal: e => { if (e.practice) { knockback(P, e.x, e.z, 6); toast('Grandma: “See how it grabs? Stomp it or spin before it reaches you!”', 2.5); return 0; } const n = Math.min(3, S.cowries); S.cowries -= n; audio.play('hurt'); sparks(P.x, P.y + 1.2, P.z, '#fff2c4', 10, 4); if (n) toast(`A Greedling snatched <b>${n} cowries</b>! Get them back!`, 2.4); knockback(P, e.x, e.z, 8); return n; },
  fx: (k, e) => {
    if (k === 'screech') audio.play('screech'); if (k === 'stomp') sparks(e.x, e.y + 0.8, e.z, '#ffffff', 10, 4);
    if (k === 'hit') { audio.play('clang'); sparks(e.x, e.y + 1, e.z, '#ffe7a6', 10, 5, 0.35, 0.4); }
    if (k === 'roar') { audio.play('slam'); shake = Math.max(shake, 0.25); if (Math.hypot(e.x - P.x, e.z - P.z) < 16) firstSight('brute', 'A <b>Harmattan Brute</b>! When it scrapes the ground it is about to charge — dodge sideways, then strike while it pants.'); }
    if (k === 'howl') { audio.play('howl'); if (Math.hypot(e.x - P.x, e.z - P.z) < 20) firstSight('hyena', '<b>Shadow hyenas</b> hunt in Story-time! They circle, then lunge — jump aside, drum to stun them, then strike. Call a friend to help.'); }
    if (k === 'wisp') { audio.play('orb'); firstSight('wisp', 'A Story-time <b>wisp</b>! Dodge its fire orbs; drum to stun it, then strike.'); }
  },
};
const bossCtx = {
  get player() { return P; }, get weave() { return weave; },
  hurt: (x, z, d, p) => hurt(x, z, d, p, { kind: 'boss' }), knock: (x, z, p) => { knockback(P, x, z, p); shake = 0.4; },
  fx: k => {
    const B = L.PALACE;
    if (k === 'slam') { audio.play('slam'); shake = 0.8; sparks(B.x, B.y + 0.5, B.z, '#ff4fa3', 40, 10); }
    if (k === 'throw') audio.play('throw');
    if (k === 'orb') audio.play('orb');
    if (k === 'dizzy') { audio.play('dizzy'); papa.cheer(); toast(layer === 'story' ? 'It’s dizzy — <b>SPIN!</b>' : 'It’s dizzy — <b>Weave to Story-time</b> and spin!', 2.2); }
    if (k === 'bosshit') { audio.play('bosshit'); shake = 0.6; sparks(B.x, B.y + 7, B.z, '#ffd35a', 60, 12, 0.7, 1.1); }
    if (k === 'clang') { audio.play('clang'); toast('Clang! Its heart hides in <b>Story-time</b>.', 2); }
    if (k === 'bossdown') { audio.play('win'); sparks(B.x, B.y + 6, B.z, '#b48cff', 80, 14, 0.8, 1.6); }
  },
  bossDefeated: () => bossDefeated(),
};

// ================= Hobbies: fishing, cooking, cycling, prizes =================
let riding = false, bikeModel = null, bikeRace = null, fishing = null, cooking = null, emote = null, badgeT = 0;
const rodLevel = () => S.upgrades.includes('rod3') ? 3 : S.upgrades.includes('rod2') ? 2 : 1;
function bump(stat, n = 1) {
  const day = dayNumber(); if (S.today?.day !== day) S.today = { day };
  S.today[stat] = (S.today[stat] || 0) + n;
  for (const c of challengesFor(day)) if (c.stat === stat && S.today[stat] >= c.goal && !S.today['done_' + c.id]) {
    S.today['done_' + c.id] = 1; giveCoins(c.coins); audio.play('win'); toast(`Daily challenge done: <b>${c.text}</b> · +${c.coins} ◈`, 4);
  }
}
function addXp(h, n) {
  const before = levelOf(S.hobby[h]); S.hobby[h] += n; const after = levelOf(S.hobby[h]);
  if (after <= before) return;
  const H = HOBBIES[h], prize = H.prizes[after] || {};
  audio.play('grow'); sparks(P.x, P.y + 1.5, P.z, '#ffd35a', 50, 7, 0.6, 1.2, 1); shock(P.x, P.y + 0.2, P.z, '#ffd35a', 5, 0.7);
  if (prize.coins) giveCoins(prize.coins);
  if (prize.unlock) for (const k of prize.unlock) if (!S.owned.includes(k)) S.owned.push(k);
  if (prize.bike) { S.bike = prize.bike; if (riding) mountBike(true); }
  toast(`${H.icon} <b>${H.name} level ${after}!</b>${prize.coins ? ` +${prize.coins} ◈` : ''}${prize.label ? ` · Prize: <b>${prize.label}</b> (try it at the mirror)` : ''}${prize.bike ? ' · Prize: a <b>golden bike</b>!' : ''}`, 5.5);
  persist();
}
function checkBadges() {
  for (const id of newBadges(S)) { S.badges.push(id); const b = BADGES.find(x => x.id === id); audio.play('feather'); toast(`${b.icon} Badge earned: <b>${b.name}</b>`, 3.5); }
}
const titleOf = () => { const best = Object.entries(S.hobby).sort((a, b) => b[1] - a[1])[0]; const lv = levelOf(best[1]); return lv >= 3 ? `${lv >= 5 ? 'Master ' : ''}${{ fish: 'Angler', cook: 'Chef', bike: 'Cyclist' }[best[0]]}` : ''; };

// ---- Fishing: cast, wait for the bite, then reel in by tapping when the marker is in the green ----
function fishingTips() {
  say([{ who: { name: 'Baba Ola', role: 'Fisherman', col: '#2a6fdb', letter: 'O', pitch: 210 }, text: 'Stand at the end of the jetty and press E (or Act) to cast. When the float dips — tap! Then tap again each time the marker is in the green. Bigger fish fight harder. In Story-time, the moonfish bites… Papa’s forge sells better hooks.' }], null, L.JETTY);
}
function startFishing() {
  if (mode !== 'play') return;
  dancing = false; mode = 'fishing'; P.vx = P.vz = 0; P.face = Math.PI;
  const tx = HW.fishSpot.x + (Math.random() - 0.5) * 3, tz = HW.fishSpot.z - 5 - Math.random() * 3;
  fishing = { phase: 'cast', t: 0, tx, tz, wait: 1.6 + Math.random() * 3.4, fish: null, mark: 0, dir: 1, hits: 0, misses: 0, need: 0, zone: 0.3, zoneAt: 0.35 };
  HW.rod.visible = true; amara.gear.hand().add(HW.rod); if (amara.gear.weapon) amara.gear.weapon.visible = false;
  hobbyUI('🎣 Fishing', 'Casting…', null, 'Wait…'); audio.play('throw');
}
function endFishing(msg) {
  HW.bobber.visible = false; HW.line.visible = false; HW.rod.visible = false; HW.rod.parent?.remove(HW.rod);
  if (amara.gear.weapon) amara.gear.weapon.visible = true;
  fishing = null; $('hobbyUI').hidden = true; mode = 'play'; if (msg) toast(msg, 3);
}
function fishTap() {
  const F = fishing; if (!F) return;
  if (F.phase === 'wait') { audio.play('deny'); hobbyUI('🎣 Fishing', 'Too soon — you scared it away. Casting again…'); F.phase = 'cast'; F.t = 0; F.wait = 1.6 + Math.random() * 3; return; }
  if (F.phase === 'bite') {
    F.fish = rollFish(Math.random() ** (mods.luck || 1), { level: levelOf(S.hobby.fish), rod: rodLevel(), story: layer === 'story' });
    F.phase = 'reel'; F.need = reelHits(F.fish); F.zone = reelZone(F.fish, rodLevel()); F.zoneAt = Math.random() * (1 - F.zone); audio.play('splash');
    hobbyUI('🎣 Reel it in!', `Something is pulling hard… tap when the marker is in the green (${F.need} times).`, F, 'Reel!'); return;
  }
  if (F.phase === 'reel') {
    if (F.mark >= F.zoneAt && F.mark <= F.zoneAt + F.zone) { F.hits++; audio.play('cowry', F.hits * 2); F.zoneAt = Math.random() * (1 - F.zone); }
    else { F.misses++; audio.play('deny'); }
    if (F.hits >= F.need) return landFish();
    if (F.misses >= 3) { audio.play('splash'); HW.ripple(F.tx, F.tz); return endFishing('It got away! Try again.'); }
    hobbyUI('🎣 Reel it in!', `${F.hits}/${F.need} pulls · ${3 - F.misses} chances left`, F, 'Reel!');
  }
}
function landFish() {
  const f = fishOf(fishing.fish);
  S.bag[f.id] = (S.bag[f.id] || 0) + 1; S.catches[f.id] = (S.catches[f.id] || 0) + 1;
  addXp('fish', f.xp); if (!f.junk) bump('fishToday');
  audio.play(f.junk ? 'deny' : 'win'); sparks(fishing.tx, WATER_Y + 0.5, fishing.tz, f.id === 'goldcarp' ? '#ffd35a' : '#bfefff', 30, 6);
  const first = S.catches[f.id] === 1;
  endFishing(`${f.icon} You caught a <b>${f.name}</b>!${first ? ' <b>New species!</b>' : ''} ${f.note}${f.sell ? ` Sells for ◈${f.sell}.` : ''}`);
  checkBadges(); persist();
}
function fishStep(dt) {
  const F = fishing; S.elapsed += dt; $('prompt').hidden = true;
  if (hit('Escape', 'KeyQ')) return endFishing('You packed up your rod.');
  if (hit('KeyE', 'Space', 'KeyJ', 'Enter') || touch.act || touch.jump) fishTap();
  if (!fishing) return;
  F.t += dt;
  const tip = HW.rodTip.getWorldPosition(new THREE.Vector3());
  if (F.phase === 'cast') {
    const k = Math.min(1, F.t / 0.7);
    const bx = tip.x + (F.tx - tip.x) * k, bz = tip.z + (F.tz - tip.z) * k, byy = tip.y + (WATER_Y - tip.y) * k + Math.sin(k * Math.PI) * 2;
    HW.bobber.visible = true; HW.bobber.position.set(bx, byy, bz);
    if (k >= 1) { F.phase = 'wait'; F.t = 0; HW.ripple(F.tx, F.tz); audio.play('splash'); hobbyUI('🎣 Fishing', 'Wait for the float to dip…', null, 'Wait…'); }
  } else if (F.phase === 'wait') {
    HW.bobber.position.set(F.tx, WATER_Y + 0.05 + Math.sin(time * 3) * 0.03, F.tz);
    if (F.t > F.wait) { F.phase = 'bite'; F.t = 0; audio.play('screech'); HW.ripple(F.tx, F.tz); hobbyUI('🎣 BITE!', 'Tap NOW!', null, 'Hook it!'); if (navigator.vibrate && navigator.userActivation?.hasBeenActive) try { navigator.vibrate(80); } catch { /* not allowed */ } }
  } else if (F.phase === 'bite') {
    HW.bobber.position.set(F.tx + Math.sin(time * 40) * 0.04, WATER_Y - 0.12, F.tz);
    if (F.t > 1.0) { audio.play('deny'); F.phase = 'wait'; F.t = 0; F.wait = 1.5 + Math.random() * 3; hobbyUI('🎣 Fishing', 'Missed the bite… wait for the next one.', null, 'Wait…'); }
  } else if (F.phase === 'reel') {
    const spd = 0.7 + fishOf(F.fish).diff * 0.28;
    F.mark += F.dir * dt * spd; if (F.mark > 1) { F.mark = 1; F.dir = -1; } if (F.mark < 0) { F.mark = 0; F.dir = 1; }
    HW.bobber.position.set(F.tx + Math.sin(time * 9) * 0.25, WATER_Y - 0.05, F.tz + Math.cos(time * 7) * 0.2);
    if (Math.random() < dt * 4) HW.ripple(HW.bobber.position.x, HW.bobber.position.z);
    $('hMark').style.left = `${F.mark * 100}%`; $('hZone').style.left = `${F.zoneAt * 100}%`; $('hZone').style.width = `${F.zone * 100}%`;
  }
  HW.line.visible = true; HW.setLine(tip, HW.bobber.position.clone().setY(HW.bobber.position.y + 0.1));
  amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = P.face;
  amara.animate(dt, { t: time, speed: 0, grounded: true, fish: { cast: F.phase === 'cast' ? Math.max(0, 1 - F.t * 2) : 0, tug: F.phase === 'reel' || F.phase === 'bite' } });
}
function hobbyUI(title, text, bar = null, btn = 'Tap!') {
  const u = $('hobbyUI'); u.hidden = false;
  $('hTitle').textContent = title; $('hText').textContent = text; $('hTap').textContent = btn;
  $('hBar').hidden = !bar;
}

// ---- Cooking: choose a recipe, then stir — tap when the needle is in the gold ----
function openCooking() {
  if (riding) dismount();
  const render = () => {
    const lv = levelOf(S.hobby.cook);
    $('pBody').innerHTML = `<span class="purse">◈ ${S.cowries}</span><h2>The village pot</h2><p>Cook with groceries from Mama Nkem and fish from the river. Cooking level <b>${lv}</b>. Eat dishes to heal, or sell them at the market.</p>
      <div class="shop-list">${RECIPES.map(r => {
        const d = dishOf(r.id), use = recipeUse(S.bag, r), locked = lv < r.level;
        const needs = Object.entries(r.needs).map(([k, n]) => { const have = k === 'fish' ? FISH.some(f => !f.junk && (S.bag[f.id] || 0) > 0) : (S.bag[k] || 0) >= n; return `<span class="need ${have ? 'ok' : ''}">${k === 'fish' ? 'any fish' : (shopItem(k)?.name || k)}</span>`; }).join(' ');
        return `<div class="shop-row"><span class="ic">${d.icon}</span><div><b>${d.name}${S.bag[d.id] ? `<span class="own">×${S.bag[d.id]} in bag</span>` : ''}</b><small>${d.note}</small><div class="needs">${needs}</div></div>${locked ? `<button class="btn" disabled>Level ${r.level}</button>` : `<button class="btn ${use ? 'gold' : ''}" data-cook="${r.id}" ${use ? '' : 'disabled'}>Cook</button>`}</div>`;
      }).join('')}</div><p class="note">Missing something? Mama Nkem sells groceries and puff-puff; the river has fish.</p>`;
    $('pBody').querySelectorAll('[data-cook]').forEach(b => b.onclick = () => { closePanel(); setTimeout(() => startCooking(b.dataset.cook), 0); });
  };
  openPanel('COOKING', '', render);
}
function startCooking(id) {
  const r = RECIPES.find(x => x.id === id), use = recipeUse(S.bag, r); if (!use) return;
  for (const [k, n] of Object.entries(use)) { S.bag[k] -= n; if (S.bag[k] <= 0) delete S.bag[k]; }
  mode = 'cooking'; P.face = Math.atan2(L.COOK_POT.x - P.x, L.COOK_POT.z - P.z);
  cooking = { id, t: 0, mark: 0, dir: 1, hits: 0, taps: 0, zoneAt: 0.4, zone: 0.22 };
  hobbyUI(`🍲 ${dishOf(id).name}`, 'Stir! Tap when the marker is in the gold — 3 stirs.', true, 'Stir!'); audio.play('splash');
}
function cookTap() {
  const C = cooking; if (!C) return; C.taps++;
  if (C.mark >= C.zoneAt && C.mark <= C.zoneAt + C.zone) { C.hits++; audio.play('cowry', C.hits * 3); sparks(L.COOK_POT.x, heightAt(L.COOK_POT.x, L.COOK_POT.z) + 1.3, L.COOK_POT.z, '#ffb36a', 10, 2, 0.3, 0.5, -1); }
  else audio.play('deny');
  C.zoneAt = 0.1 + Math.random() * 0.68;
  if (C.taps >= 3) finishCooking(); else $('hText').textContent = `Stir ${C.taps + 1} of 3 · ${C.hits} perfect`;
}
function finishCooking() {
  const C = cooking, d = dishOf(C.id), q = Math.min(3, quality(C.hits) + (mods.chef ? 1 : 0));
  S.bag[d.id] = (S.bag[d.id] || 0) + 1; S.cooked++; if (!S.dishes.includes(d.id)) S.dishes.push(d.id);
  const tip = q === 3 ? 5 : q === 2 ? 2 : 0; if (tip) giveCoins(tip);
  addXp('cook', 8 + q * 4 + RECIPES.find(r => r.id === d.id).level * 4); bump('cookToday');
  cooking = null; $('hobbyUI').hidden = true; mode = 'play';
  audio.play('win'); toast(`${d.icon} <b>${d.name}</b> ${'★'.repeat(q)}${'☆'.repeat(3 - q)}${tip ? ` · Grandma tasted it: +${tip} ◈` : ''}. It’s in your bag — eat it (B) or sell it at the market.`, 4.5);
  checkBadges(); persist();
}
function cookStep(dt) {
  const C = cooking; S.elapsed += dt; $('prompt').hidden = true;
  if (hit('KeyE', 'Space', 'KeyJ', 'Enter') || touch.act || touch.jump) cookTap();
  if (!cooking) return;
  C.mark += C.dir * dt * 1.25; if (C.mark > 1) { C.mark = 1; C.dir = -1; } if (C.mark < 0) { C.mark = 0; C.dir = 1; }
  $('hMark').style.left = `${C.mark * 100}%`; $('hZone').style.left = `${C.zoneAt * 100}%`; $('hZone').style.width = `${C.zone * 100}%`;
  HW.soupM.color.set(['#c9542a', '#d6a12a', '#3f8a3a', '#e07a2a', '#7fe9ff'][RECIPES.findIndex(r => r.id === C.id) % 5]);
  amara.root.position.set(P.x, P.y, P.z); amara.root.rotation.y = P.face;
  amara.animate(dt, { t: time, speed: 0, grounded: true, cook: true });
}

// ---- Cycling: free bike from Musa's stand; X to ride; a timed loop of ten gates round the village ----
function bikeStand() {
  if (!S.bike) {
    return say([{ who: 'musa', text: friendOnline.musa ? 'You want a bike? Take this red one — free for friends! Press X (or the Bike button) to hop on and off. Bell is on Shift.' : 'Musa left a note: “Bikes are free for friends. Take the red one!” Press X (or the Bike button) to ride.' }], () => { S.bike = 'red'; mountBike(); checkBadges(); persist(); }, L.BIKE_STAND);
  }
  if (bikeRace) return;
  choose('musa', `The village loop: ten gates, starting at the yellow arch. Par time is ${BIKE_PAR} seconds.${S.bikeBest ? ` Your best: ${S.bikeBest.toFixed(1)}s.` : ''}`, [{ label: 'Start the race!', fn: startBikeRace }, { label: 'Maybe later' }], L.BIKE_STAND);
}
function mountBike(force = false) {
  if (!S.bike) return toast('Get a bike from Musa’s stand by the village entrance first.');
  if (riding && !force) return dismount();
  if (mode !== 'play' && !force) return;
  if (bikeModel) W.scene.remove(bikeModel.root);
  bikeModel = makeBike(S.bike === 'gold' ? '#f1c24b' : '#d23a2b'); bikeModel.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); W.scene.add(bikeModel.root);
  riding = true; dancing = false; if (amara.gear.weapon) amara.gear.weapon.visible = false; audio.play('ring', 2);
  if (!force) toast('Riding! Shift rings the bell · X to get off', 2.5);
}
function dismount() {
  if (!riding) return; riding = false; if (bikeModel) W.scene.remove(bikeModel.root); bikeModel = null;
  if (amara.gear.weapon) amara.gear.weapon.visible = true;
  if (bikeRace) { bikeRace = null; $('race').hidden = true; resetGates(); toast('You got off — race cancelled.'); }
}
function resetGates() { HW.gates.forEach((g, i) => { g.m.emissive.set('#000000'); g.g.scale.setScalar(1); g.m.color.set(i === 0 ? '#f2c21b' : '#2fa84f'); }); }
function startBikeRace() {
  if (!riding) mountBike(); if (!riding) return;
  const g0 = BIKE_GATES[0]; P.x = g0.x; P.z = g0.z + 2.5; P.y = heightAt(P.x, P.z) + 0.2; P.face = Math.PI / 2; P.vx = P.vz = 0;
  bikeRace = { idx: 1, t: 0, laps: 0 }; $('race').hidden = false; audio.play('checkpoint');
  toast('GO! Ride through the glowing gates.', 2);
}
function updateBikeRace(dt) {
  if (!bikeRace) return;
  bikeRace.t += dt; const i = bikeRace.idx % BIKE_GATES.length, g = HW.gates[i];
  HW.gates.forEach((x, k) => { const on = k === i; x.m.emissive.set(on ? '#ffd35a' : '#000000'); x.m.emissiveIntensity = on ? 0.8 + Math.sin(time * 6) * 0.3 : 0; x.g.scale.setScalar(on ? 1.08 : 1); });
  if (Math.hypot(P.x - g.x, P.z - g.z) < 2.6) {
    audio.play('ring', bikeRace.idx % 8); sparks(g.x, g.y + 2, g.z, '#ffd35a', 16, 5);
    if (bikeRace.idx === BIKE_GATES.length) return finishBikeRace();
    bikeRace.idx++;
  }
  setText($('race'), `🚲 ${bikeRace.t.toFixed(1)}s · gate ${Math.min(bikeRace.idx, BIKE_GATES.length)}/${BIKE_GATES.length}`);
}
function finishBikeRace() {
  const secs = bikeRace.t; bikeRace = null; $('race').hidden = true; resetGates();
  const best = !S.bikeBest || secs < S.bikeBest; if (best) S.bikeBest = secs;
  const coins = bikeReward(secs); giveCoins(coins); addXp('bike', secs <= BIKE_PAR ? 18 : 10); bump('rideToday');
  audio.play('win'); toast(`🏁 Loop done in <b>${secs.toFixed(1)}s</b>${best ? ' — personal best!' : ''} · +${coins} ◈${secs <= BIKE_PAR ? ' (under par!)' : ` (par ${BIKE_PAR}s)`}`, 5);
  checkBadges(); persist();
}

// ---- Emotes: wave, cheer, dance, high five — others see them ----
const EMOTES = { wave: '👋 Wave', cheer: '🙌 Cheer', dance: '💃 Dance', highfive: '✋ High five' };
function doEmote(kind) { if (mode !== 'play' || riding) return; emote = { kind, t: kind === 'dance' ? 6 : 2.2 }; dancing = kind === 'dance'; audio.play('ui'); }
function openEmotes() {
  if (mode !== 'play') return;
  choose({ name: S.name, role: 'Emotes', col: heroColor(), letter: '☺', pitch: 500 }, 'Pick an emote — everyone near you can see it.', [...Object.entries(EMOTES).map(([k, n]) => ({ label: n, fn: () => doEmote(k) })), { label: 'Close' }]);
}

// ---- Other players in the world ----
const worldAvatars = new Map();
function meetPlayer(d) {
  const opts = [{ label: '👋 Wave', fn: () => greetPlayer(d, 'wave') }, { label: '✋ High five', fn: () => greetPlayer(d, 'highfive') }];
  if (!d.friend) opts.push({ label: 'Send a friend request', fn: async () => toast(esc(await social.request(d.code)), 3.5) });
  else opts.push({ label: 'Chat', fn: () => openChat('friends') }, { label: 'Invite to play together', fn: async () => toast(await social.invite(d.code) ? 'Invite sent!' : 'Could not send the invite.', 3) });
  opts.push({ label: 'Close' });
  choose({ name: d.name, role: d.friend ? 'Friend · online' : 'Player', col: d.friend ? '#f2c14e' : '#3a2a62', letter: d.name[0] || '?', pitch: 500 }, d.friend ? `Your friend ${d.name} is here!` : `${d.name} is exploring too. Strangers can wave and high-five; add them as a friend to chat.`, opts, { x: worldAvatars.get(d.peer)?.x ?? P.x, z: worldAvatars.get(d.peer)?.z ?? P.z });
}
function greetPlayer(d, kind) { doEmote(kind === 'highfive' ? 'cheer' : 'wave'); social?.hello(d.code, kind); S.waves++; bump('waveToday'); checkBadges(); }
function firstSight(kind, html) { const k = 'seen:' + kind; if (S.puzzles.includes(k)) return; S.puzzles.push(k); toast(html, 5); }
// Weapons: staff and bare hands spin; the catapult shoots pebbles; the spear lunges; the idà sword slashes in an arc.
const pebbles = [], pebbleGeo = new THREE.SphereGeometry(0.13, 10, 8), pebbleMat = new THREE.MeshStandardMaterial({ color: '#8d8478', roughness: 0.6 });
let atk = null, atkCd = 0;
function attack() {
  const w = weapon();
  if (atkCd > 0 || P.spin > 0) return;
  const cost = w.kind === 'shoot' ? 0.1 : 0.18;
  if (P.energy < cost) return audio.play('deny');
  P.energy -= cost; atkCd = w.kind === 'shoot' ? 0.42 : w.kind === 'thrust' ? 0.5 : 0.55;
  const dmg = weaponDmg();
  if (w.kind === 'shoot') {
    const target = enemies.nearest(P.x, P.z, 22, weave);
    if (target) P.face = Math.atan2(target.x - P.x, target.z - P.z);
    const hand = amara.gear.weapon?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(P.x, P.y + 1.2, P.z);
    const ty = target ? target.y + (target.kind === 'hawk' || target.kind === 'wisp' ? 0 : 0.7) : hand.y, dx = (target ? target.x : P.x + Math.sin(P.face) * 20) - hand.x, dz = (target ? target.z : P.z + Math.cos(P.face) * 20) - hand.z;
    const d = Math.hypot(dx, ty - hand.y, dz) || 1, sp = 26;
    const mesh = new THREE.Mesh(pebbleGeo, pebbleMat); mesh.position.copy(hand); W.scene.add(mesh);
    pebbles.push({ mesh, x: hand.x, y: hand.y, z: hand.z, vx: dx / d * sp, vy: (ty - hand.y) / d * sp + 1.2, vz: dz / d * sp, life: 1.1, dmg });
    audio.play('throw'); atk = { kind: 'shoot', t: 0, dur: 0.3 }; P.attack = 0.3; return;
  }
  const target = enemies.nearest(P.x, P.z, 4, weave); if (target) P.face = Math.atan2(target.x - P.x, target.z - P.z);
  const reach = w.kind === 'thrust' ? 2.1 : 1.3, r = w.kind === 'thrust' ? 1.5 : 2.4;
  const hx = P.x + Math.sin(P.face) * reach, hz = P.z + Math.cos(P.face) * reach;
  atk = { kind: w.kind, t: 0, dur: w.kind === 'thrust' ? 0.32 : 0.38, hx, hz, r, dmg, done: false }; P.attack = atk.dur;
  if (w.kind === 'thrust') { P.vx += Math.sin(P.face) * 6; P.vz += Math.cos(P.face) * 6; }
  audio.play('spin');
}
function updateAttack(dt) {
  atkCd = Math.max(0, atkCd - dt); P.attack = Math.max(0, (P.attack || 0) - dt);
  if (atk) {
    atk.t += dt;
    if (!atk.done && atk.kind !== 'shoot' && atk.t > atk.dur * 0.4) {
      atk.done = true;
      const n = enemies.hitAt(atk.hx, P.y + 0.8, atk.hz, atk.r, 'weapon', weave, enemyCtx, atk.dmg);
      sparks(atk.hx, P.y + 1, atk.hz, tier().color, n ? 18 : 8, n ? 6 : 3, 0.35, 0.4);
      for (const ds of W.drumStones) if (Math.hypot(ds.x - atk.hx, ds.z - atk.hz) < atk.r && Math.abs(P.y - ds.y) < 1.5) strikeDrum(ds.i);
      if (n) shake = Math.max(shake, 0.15);
    }
    if (atk.t >= atk.dur) atk = null;
  }
  for (const pb of pebbles) {
    pb.life -= dt; pb.vy -= 9 * dt; pb.x += pb.vx * dt; pb.y += pb.vy * dt; pb.z += pb.vz * dt; pb.mesh.position.set(pb.x, pb.y, pb.z);
    if (enemies.hitAt(pb.x, pb.y, pb.z, 1.1, 'weapon', weave, enemyCtx, pb.dmg)) { pb.life = 0; sparks(pb.x, pb.y, pb.z, '#ffffff', 8, 3); }
    else for (const ds of W.drumStones) if (Math.hypot(ds.x - pb.x, ds.z - pb.z) < 1 && pb.y < ds.y + 1.5) { strikeDrum(ds.i); pb.life = 0; }
    if (pb.life <= 0 || pb.y < heightAt(pb.x, pb.z)) { W.scene.remove(pb.mesh); pb.done = true; }
  }
  for (let i = pebbles.length - 1; i >= 0; i--) if (pebbles[i].done) pebbles.splice(i, 1);
}
// Random encounters: monsters appear at random spots beyond the village — more of them, and fiercer, the older you are.
let spawnT = 6;
function spawnMonsters(dt) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = layer === 'story' ? 2 + Math.random() * 2 : 3 + Math.random() * 3;
  enemies.cull(P.x, P.z);
  if (!atLeast('market') || race.on || S.quest === 'boss' || P.z < -290 || enemies.roaming() >= stageDef().monsters + (layer === 'story' ? 2 : 0)) return;
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 16, x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d, y = heightAt(x, z);
    if (Math.hypot(x, z - 2) < 38 || z < -290 || Math.abs(x) > 80 || y < WATER_Y + 0.4 || Math.abs(y - P.y) > 4) continue;
    const zone = z > -50 ? 'village' : z > -74 ? 'river' : z > -150 ? 'savanna' : 'canyon', idx = stageIndex(stageId());
    let pool = { village: ['beetle', 'greed', 'beetle'], river: ['beetle', 'greed'], savanna: ['beetle', 'greed', 'brute'], canyon: ['brute', 'beetle', 'greed'] }[zone];
    if (idx >= 1) pool = [...pool, 'brute']; if (idx >= 3) pool = [...pool, 'brute'];
    let kind = pool[Math.floor(Math.random() * pool.length)];
    if (layer === 'story' && Math.random() < 0.7) kind = Math.random() < 0.55 ? 'hyena' : 'wisp';
    if (kind === 'brute' && idx === 0 && zone !== 'canyon' && Math.random() < 0.6) kind = 'beetle';
    const e = enemies.spawn(kind, x, z); sparks(x, e.y + 1, z, kind === 'wisp' ? '#7fe9ff' : '#d9b48a', 16, 3, 0.6, 0.7, -1);
    return;
  }
}
function updateCompanions(dt) {
  const playing = mode === 'play' || mode === 'dialogue' || mode === 'fading';
  const fightBoss = S?.quest === 'boss' || (S?.quest === 'climb' && Math.hypot(P.x - L.PALACE.x, P.z - L.PALACE.z) < 30 && P.y > L.PALACE.y - 2);
  papa.update(dt, time, {
    player: P, enemies, weave, busy: !playing || mode === 'dialogue', talking: mode === 'dialogue' && D?.lines[D.i]?.who === 'papa', dance: dancing && Math.hypot(P.x - papa.S.x, P.z - papa.S.z) < 6,
    waitAt: !playing ? { x: papa.S.x, z: papa.S.z } : fightBoss && !celebrate && papa.S.mode !== 'home' ? { x: L.PALACE.x + 3, z: L.PALACE.z + 22 } : null,
    surface: (x, z, fromY) => surfaceBelow(env, x, z, fromY).y,
    onAttack: (x, y, z) => { audio.play('stomp'); shock(x, y + 0.2, z, '#ff9a40', 3.2, 0.4); sparks(x, y + 0.3, z, '#d9b48a', 14, 4); shake = Math.max(shake, 0.2); enemies.hitAt(x, y + 1, z, 3.2, 'helper:papa', weave, enemyCtx, 2 + stageIndex(stageId())); },
    puff: (x, y, z) => sparks(x, y + 1, z, '#e8e0d0', 16, 3, 0.6, 0.6, -1),
  });
  for (const [id, f] of Object.entries(friends)) {
    if (!f.model.root.visible) continue;
    f.update(dt, time, {
      player: P, enemies, weave, busy: !playing || mode === 'dialogue', talking: mode === 'dialogue' && D?.lines[D.i]?.who === id, dance: dancing && Math.hypot(P.x - f.S.x, P.z - f.S.z) < 6,
      waitAt: !playing && f.S.mode !== 'home' ? { x: f.S.x, z: f.S.z } : null,
      surface: (x, z, fromY) => surfaceBelow(env, x, z, fromY).y,
      onAttack: (x, y, z) => { audio.play('spin'); shock(x, y + 0.3, z, f.heroine.color, 2.8, 0.35); sparks(x, y + 1, z, f.heroine.color, 12, 4); enemies.hitAt(x, y + 1, z, 2.8, 'helper:' + id, weave, enemyCtx, 1 + stageIndex(stageId())); },
      puff: (x, y, z) => sparks(x, y + 1, z, '#e8e0d0', 16, 3, 0.6, 0.6, -1),
    });
  }
  if (mode === 'play') for (const c of [papa, ...Object.values(friends)]) {
    helperCd[c.S.id] = Math.max(0, (helperCd[c.S.id] || 0) - dt);
    if (c.S.mode === 'help') { c.S.helpT -= dt; if (c.S.helpT <= 0) sendHome(c, `${c.S.id === 'papa' ? 'Papa' : c.heroine.name} heads home. Call again whenever you need help.`); }
    if (c.heroine && c.S.mode === 'help' && !friendOnline[c.heroine.id]) sendHome(c, `${c.heroine.name} went offline.`);
  }
  if (mode === 'play') { friendRollT -= dt; if (friendRollT <= 0) { rollFriends(); updateFriendChip(); if (CHAT.open) renderChat(); } }
  const pm = papa.S.mode;
  setText($('papaChip'), `Papa · ${pm === 'follow' ? 'following' : pm === 'hold' ? 'holding plate' : pm === 'help' ? `helping ${Math.ceil(papa.S.helpT)}s` : pm === 'home' ? 'at the forge · C to call' : 'waiting'}`);
  setText($('stageChip'), `${S.name} · ${stageDef().name} · ${weaponName()}`);
  updateFriendChip();
  mbe.update(dt, time, {
    heightAt, talking: mode === 'dialogue' && D?.lines[D.i]?.who === 'mbe',
    home: amara.gear.mbeSlot.getWorldPosition(new THREE.Vector3()),
    hit: (x, y, z) => {
      if (enemies.hitAt(x, y, z, 1.4, 'mbe', weave, enemyCtx)) { audio.play('stomp'); sparks(x, y, z, '#ffffff', 10, 4); return true; }
      for (const d of W.drumStones) if (Math.hypot(d.x - x, d.z - z) < 1.1) { strikeDrum(d.i); return true; }
      if (boss.B.active && boss.B.state !== 'gone' && Math.hypot(L.PALACE.x - x, L.PALACE.z - z) < 6) { audio.play('clang'); return true; }
      return false;
    },
  });
  if (mbeJoined()) setText($('mbeChip'), `Mbe · ${mbe.S.state === 'pack' ? (mbe.S.cd > 0 ? 'catching breath' : sniffCd > 0 ? 'ready · sniff ' + Math.ceil(sniffCd) + 's' : 'ready') : 'rolling!'}`);
  const b = Object.entries(buffs).filter(([, v]) => v > 0);
  $('buffChip').hidden = !b.length; if (b.length) setText($('buffChip'), b.map(([k, v]) => `${k === 'zobo' ? 'Zobo' : 'Chin chin'} ${Math.ceil(v)}s`).join(' · '));
}

function playStep(dt) {
  S.elapsed += dt; comboT = Math.max(0, comboT - dt);
  trackSafeSpot();
  if (hit('Escape', 'KeyM')) return openPause();
  if (hit('KeyT')) return openTales();
  if (hit('KeyB')) return openBag();
  if (hit('KeyP')) { mode = 'photo'; $('hud').hidden = true; $('photo').hidden = false; cam.dist = 5; return; }
  if (hit('KeyR') || touch.mbe) throwMbe();
  if (hit('KeyG') || touch.sniff) sniff();
  if (hit('KeyH')) quickEat();
  if (hit('KeyC') || touch.papa) return callPapa();
  if (hit('KeyV')) return callFriend();
  if (hit('KeyX') || touch.bike) mountBike();
  if (hit('KeyZ') || touch.emote) return openEmotes();
  if (hit('KeyY')) return openHobbies();
  if (hit('Enter', 'NumpadEnter')) return openChat();
  checkGrowth();
  if (hit('KeyQ', 'KeyL') || touch.weave) doWeave();
  if (hit('KeyF')) dancing = !dancing;
  const near = nearestInteract();
  if (hit('KeyE', 'KeyJ') || touch.act) { if (near) { dancing = false; near.fn(); return; } drum(); }
  const pr = $('prompt');
  if (near) { pr.hidden = false; pr.innerHTML = `<kbd>${isTouch ? 'Act' : 'E'}</kbd>${esc(near.label)}`; } else pr.hidden = true;

  let ix = 0, iz = 0;
  if (held('KeyW', 'ArrowUp')) iz += 1; if (held('KeyS', 'ArrowDown')) iz -= 1;
  if (held('KeyD', 'ArrowRight')) ix += 1; if (held('KeyA', 'ArrowLeft')) ix -= 1;
  ix += touch.x + pad.x; iz += touch.z + pad.z;
  const fx_ = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let attackPressed = hit('ShiftLeft', 'ShiftRight', 'KeyK') || touch.spin;
  const spinWeapon = weapon().kind === 'spin';
  if (riding && attackPressed) { audio.play('ring', 6); attackPressed = false; }
  if (attackPressed && !spinWeapon) attack();
  if (emote) { emote.t -= dt; if (emote.t <= 0 || Math.hypot(P.vx, P.vz) > 1) { emote = null; dancing = false; } }
  badgeT -= dt; if (badgeT <= 0) { badgeT = 3; checkBadges(); }
  const input = { x: rx * ix + fx_ * iz, z: rz * ix + fz * iz, jump: hit('Space') || touch.jump, jumpHeld: held('Space') || touch.jumpHeld || pad.jumpHeld, spin: attackPressed && spinWeapon };
  if (Math.hypot(input.x, input.z) > 0.1 || input.jump) dancing = false;

  for (const p of W.platforms) if (p.moving) {
    p.baseX ??= p.x;
    const nx = p.baseX + Math.sin(time * p.moving.speed) * p.moving.amp;
    p.dx = nx - p.x; p.dz = 0; p.x = nx; p.mesh.position.x = nx;
  }
  env.mods = { ...mods, regen: (mods.regen || 1) * (buffs.zobo > 0 ? 2 : 1), speed: (mods.speed || 1) * (buffs.chinchin > 0 ? 1.15 : 1) * (riding ? 1.75 * (mods.bike || 1) : 1) };
  const ev = stepPlayer(P, dt, input, env);
  for (const e of ev) {
    if (e === 'jump') audio.play('jump');
    if (e === 'double') { audio.play('double'); sparks(P.x, P.y + 0.6, P.z, '#f2c21b', 10, 3, 0.35, 0.5, 2); }
    if (e === 'spin') audio.play('spin');
    if (e === 'land') { audio.play('land'); sparks(P.x, P.y + 0.1, P.z, '#d9b48a', 6, 2, 0.4, 0.4, 2); }
  }
  const inWater = P.y < WATER_Y - 0.25 && heightAt(P.x, P.z) < WATER_Y - 0.2;
  if (ev.includes('fell') || inWater || (P.z < -286 && P.y < 24 && !P.grounded)) { fellOff(inWater); return; }
  // A youth's or adult's spin is a power spin: it strikes everything around them.
  if (strong() && P.spin > 0) enemies.hitAt(P.x, P.y, P.z, 2.6, 'youth', weave, enemyCtx, weaponDmg());
  collectAll(); checkpoints(); puzzles(dt); triggers(); updateBikeRace(dt); updateLesson();
  if (S.quest === 'done' && celebrate?.shown === false && celebrate.t > 6) { celebrate.shown = true; showVictory(); }
  updateAmara(dt, ev.includes('double'));
  updateHUD();
}
function updateAmara(dt, flap) {
  const r = amara.root;
  r.position.set(P.x, P.y + (riding ? Math.max(0.05, 0.8 - amara.height * 0.42) : 0), P.z); r.rotation.y = P.face;
  r.visible = !(P.inv > 0 && Math.floor(time * 16) % 2 === 0 && mode === 'play');
  if (riding && bikeModel) { bikeModel.root.position.set(P.x, P.y, P.z); bikeModel.root.rotation.y = P.face; bikeModel.spin(dt, Math.hypot(P.vx, P.vz)); }
  amara.animate(dt, { t: time, speed: Math.hypot(P.vx, P.vz) / T.walk, grounded: P.grounded, vy: P.vy, spin: P.spin > 0, gliding: P.gliding, flap, dance: dancing, lifted: liftedT > 0, throw: throwFlag, attack: atk ? { kind: atk.kind, t: Math.min(1, atk.t / atk.dur) } : null, ride: riding, wave: emote?.kind === 'wave' || emote?.kind === 'highfive', cheer: emote?.kind === 'cheer' });
  throwFlag = false;
  if (P.inUpdraft && Math.random() < 0.4) sparks(P.x, P.y, P.z, '#ffe7a6', 1, 2, 0.3, 0.6, -4);
}
function idleModel(dt) {
  amara.root.position.set(P.x, P.y, P.z);
  amara.animate(dt, { t: time, speed: 0, grounded: true, talking: mode === 'dialogue' && D?.lines[D.i]?.who === 'amara', dance: mode === 'select' ? Math.sin(time * 0.6) > 0.75 : false, crossArms: mode === 'title' || (mode === 'select' && Math.sin(time * 0.6) < -0.3), wave: mode === 'select' && Math.sin(time * 0.6) > 0.3 && Math.sin(time * 0.6) <= 0.75 });
}
function photoStep(dt) {
  if (hit('KeyP', 'Escape')) { mode = 'play'; $('hud').hidden = false; $('photo').hidden = true; cam.dist = 8; return; }
  if (hit('KeyF')) dancing = !dancing;
  if (held('KeyA', 'ArrowLeft')) cam.yaw += dt * 1.2; if (held('KeyD', 'ArrowRight')) cam.yaw -= dt * 1.2;
  if (held('KeyW', 'ArrowUp')) cam.dist = Math.max(2.2, cam.dist - dt * 4); if (held('KeyS', 'ArrowDown')) cam.dist = Math.min(18, cam.dist + dt * 4);
  cam.ty = P.y + 1;
  amara.animate(dt, { t: time, speed: 0, grounded: true, dance: dancing });
}
function animateNPCs(dt) {
  const N = W.npcs;
  const talking = who => mode === 'dialogue' && D && D.lines[D.i]?.who === who;
  N.grandma.animate(dt, { t: time, speed: 0, grounded: true, talking: talking('grandma') });
  N.tailor.animate(dt, { t: time + 1, speed: 0, grounded: true, talking: talking('tailor'), wave: Math.sin(time * 0.4) > 0.9 });
  N.mama.animate(dt, { t: time + 2, speed: 0, grounded: true, talking: talking('mama'), crossArms: Math.sin(time * 0.3) > 0.2 });
  N.weaver.animate(dt, time, false, talking('weaver'));
  N.hornbill.animate(dt, time + 2, race.on, talking('hornbill'));
  N.eagle.animate(dt, time + 4, false, talking('eagle'));
  for (const v of W.villagers) {
    v.phase += dt * 0.25;
    const tx = v.home.x + Math.cos(v.phase) * 2.5, tz = v.home.z + Math.sin(v.phase * 1.3) * 2.5;
    const r = v.model.root, dx = tx - r.position.x, dz = tz - r.position.z, sp = Math.hypot(dx, dz);
    const talk = mode === 'dialogue' && D?.lines[D.i]?.who?.name === v.name;
    if (!talk) { r.position.x += dx * dt * 0.8; r.position.z += dz * dt * 0.8; if (sp > 0.05) r.rotation.y = Math.atan2(dx, dz); }
    else r.rotation.y = Math.atan2(P.x - r.position.x, P.z - r.position.z);
    r.position.y = heightAt(r.position.x, r.position.z);
    v.model.animate(dt, { t: time + v.phase, speed: talk ? 0 : Math.min(1, sp * 0.4), grounded: true, talking: talk });
  }
  if (mode === 'dialogue' && D) {
    const who = D.lines[D.i]?.who;
    const turn = (o) => { o.rotation.y += wrapA(Math.atan2(P.x - o.position.x, P.z - o.position.z) - o.rotation.y) * Math.min(1, dt * 4); };
    for (const k of ['grandma', 'tailor', 'mama', 'weaver', 'hornbill', 'eagle']) if (who === k) turn(N[k].root);
    if (D.focus) { amara.root.rotation.y += wrapA(Math.atan2(D.focus.x - P.x, D.focus.z - P.z) - amara.root.rotation.y) * Math.min(1, dt * 4); P.face = amara.root.rotation.y; }
  }
}

function updateLighting() {
  const w = weave, Lt = W.light;
  Lt.sun.color.setRGB(1 - w * 0.38, 0.85 - w * 0.08, 0.66 + w * 0.34);
  Lt.sun.intensity = 3.1 - w * 1.5;
  Lt.hemi.intensity = 0.9 + w * 0.25;
  Lt.hemi.color.setRGB(0.81 - w * 0.35, 0.88 - w * 0.3, 1 - w * 0.05);
  Lt.hemi.groundColor.setRGB(0.54 - w * 0.3, 0.35 - w * 0.2, 0.2 + w * 0.1);
  renderer.toneMappingExposure = 1 + w * 0.25;
  const dir = w < 0.5 ? Lt.sunDir : Lt.moonDir;
  const tx = P.x, ty = P.y, tz = P.z;
  Lt.sun.position.set(tx + dir.x * 90, ty + dir.y * 90, tz + dir.z * 90); Lt.sun.target.position.set(tx, ty, tz);
  W.scene.fog.color.setRGB(0.89 - w * 0.78, 0.73 - w * 0.65, 0.55 - w * 0.33);
  W.scene.fog.density = 0.0042 + w * 0.0026;
  W.scene.environment = w < 0.5 ? W.env[0] : W.env[1];
  W.scene.environmentIntensity = 0.9 - w * 0.2;
  W.sea.color.setRGB(0.96 - w * 0.75, 0.93 - w * 0.72, 0.9 - w * 0.55);
  bloom.strength = 0.3 + w * 0.5;
  feastGlow.material.opacity = (0.55 + w * 0.35) * (S?.quest === 'done' ? 1.4 : 1);
}

function questTarget() {
  const q = S.quest, N = L.NPCS;
  if (q === 'meet' || q === 'soup') return { x: N.grandma.x, z: N.grandma.z };
  if (q === 'market') return { x: N.mama.x, z: N.mama.z };
  if (q === 'weaver' || q === 'return1') return { x: -13, z: -8 };
  if (q === 'threads') {
    let best = null, bd = 1e9;
    for (const t of W.threads) if (!t.taken && t.group.visible) { const d = Math.hypot(t.x - P.x, t.z - P.z); if (d < bd) { bd = d; best = t; } }
    return best || (!solved('drums') ? L.DRUM_CIRCLE : null);
  }
  if (q === 'river') return { x: N.hornbill.x, z: N.hornbill.z };
  if (q === 'race') return race.on ? W.rings[race.idx] : { x: N.hornbill.x, z: N.hornbill.z };
  if (q === 'canyon') return !solved('gate') ? W.plates[1] : { x: N.eagle.x, z: N.eagle.z };
  if (q === 'hawks') { const e = enemies.list.find(x => x.quest && !x.dead); return e ? { x: e.x, z: e.z } : { x: N.eagle.x, z: N.eagle.z }; }
  if (q === 'climb') return P.y < 40 ? W.byId.plank3 : { x: L.PALACE.x, z: L.PALACE.z + 18 };
  if (q === 'boss') return { x: L.PALACE.x, z: L.PALACE.z };
  return null;
}
function zoneName() { const z = P.z; return z > -50 ? 'village' : z > -74 ? 'river' : z > -150 ? 'savanna' : z > -248 ? 'canyon' : P.y < 30 && z > -290 ? 'canyon' : z > -370 ? 'sky' : 'feast'; }
function compassAngle(t) {
  const dx = t.x - P.x, dz = t.z - P.z, rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx_ = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  return Math.atan2(dx * rx + dz * rz, dx * fx_ + dz * fz);
}
function updateHUD() {
  setText($('cowries'), String(S.cowries));
  setText($('tales'), `${S.tales.length}/6`);
  setText($('timer'), fmt(S.elapsed));
  $('energy').style.width = `${P.energy * 100}%`;
  const z = P.z, zone = z > -50 ? 'VILLAGE OF STORIES' : z > -74 ? 'RIVER CROSSING' : z > -150 ? 'GOLD SAVANNA' : z > -248 ? 'HARMATTAN CANYON' : P.y < 30 && z > -290 ? 'EAGLE’S PERCH · SKY BAOBAB' : z > -370 ? 'THE SKY ROAD' : 'THE SKY FEAST';
  setText($('zone'), zone + (layer === 'story' ? ' · STORY-TIME' : ''));
  const dm = Math.hypot(P.x - 17.5, P.z - 4), df = Math.hypot(P.x - L.FIRE.x, P.z - L.FIRE.z);
  audio.setScene({ zone: zoneName(), market: Math.max(0, 1 - dm / 22) * 0.05, fire: Math.max(0, 1 - df / 9) * 0.03 });
  $('weaveDial').querySelector('.dial').style.setProperty('--cd', `${(1 - weaveCd / (T.weaveCooldown * (mods.weave || 1))) * 100}%`);
  const t = questTarget();
  if (t) {
    const d = Math.hypot(t.x - P.x, t.z - P.z);
    $('cmark').style.left = `${50 + clamp(compassAngle(t) / (Math.PI / 2), -1, 1) * 46}%`;
    setText($('cdist'), `${Math.round(d)} m`);
    $('compass').style.opacity = 1;
    beacon.visible = d > 7; beacon.position.set(t.x, (t.y ?? heightAt(t.x, t.z)) + 44, t.z);
    beacon.material.opacity = 0.12 + Math.sin(time * 3) * 0.05;
  } else { $('compass').style.opacity = 0.3; beacon.visible = false; setText($('cdist'), ''); }
  const tr = W.digs.filter(d => !d.dug && d.revealed > 0).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
  $('tmark').hidden = !tr; if (tr) $('tmark').style.left = `${50 + clamp(compassAngle(tr) / (Math.PI / 2), -1, 1) * 46}%`;
}

function autoQuality(dt) {
  if (qualityLocked || settings.quality !== 'auto' || mode !== 'play') return;
  frameTimes.push(dt); if (frameTimes.length < 240) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; frameTimes = [];
  if (avg > 0.03 && !isTouch && renderer.getPixelRatio() > 1) { settings.quality = 'low'; applyQuality(); settings.quality = 'auto'; qualityLocked = true; toast('Graphics lowered for smoother play. Change it in Settings.'); }
  else qualityLocked = true;
}

// QA hook: read-only snapshot, deterministic stepping and a teleport. Not for normal play.
window.__shellbound = {
  get state() { return { lesson: lesson?.kind || S?.lesson || null, restarts: S?.restarts, riding, bikeRace: !!bikeRace, fishing: fishing?.phase, hobby: S?.hobby, mode, name: S?.name, gender: S?.gender, stage: S?.stage, diff: diff?.name, weapon: S?.weapon, roaming: enemies?.roaming(), quest: S?.quest, layer, hearts, maxHearts, cowries: S?.cowries, feathers: S?.feathers, tales: S?.tales.length, threads: S?.threads.length, bag: S?.bag, puzzles: S?.puzzles, papa: papa && { x: papa.S.x, y: papa.S.y, z: papa.S.z, mode: papa.S.mode }, mbe: mbe?.S.state, player: { x: P.x, y: P.y, z: P.z, grounded: P.grounded }, boss: boss?.B.state, bossHp: boss?.B.hp }; },
  teleport(x, z, y) { P.x = x; P.z = z; P.y = y ?? heightAt(x, z) + 1; P.vy = 0; snapCamera(); },
  grant(n) { S.feathers = n; S.cowries += 200; if (!atLeast('market')) { S.quest = 'market'; mbe.show(); } updateAbilities(); },
  setQuest(q) { S.quest = q; updateAbilities(); const qq = QUEST[qi(q)]; $('quest').textContent = qq.title; },
  render: () => composer.render(), get renderer() { return renderer; }, get P() { return P; }, get amara() { return amara; }, get friendsMap() { return friends; },
  weave: () => doWeave(), get hw() { return HW; }, fishTap: () => fishTap(), cookTap: () => cookTap(), get fishingState() { return fishing; }, get cookingState() { return cooking; }, worldAvatars,
  attack: () => { if (weapon().kind === 'spin') { pressed.add('ShiftLeft'); } else attack(); }, equip: id => { if (!S.weapons.includes(id)) S.weapons.push(id); equip(id); }, spawn: (k, x, z) => enemies.spawn(k, x, z), get pebbles() { return pebbles.length; }, get social() { return social; },
  chat(text, channel = 'near') { CHAT.channel = channel; sendChat(text); return CHAT.logs[channel].slice(-3); }, get friends() { return friends; }, get online() { return friendOnline; },
  get audio() { return audio; }, get world() { return W; }, get camera() { return camera; }, get enemies() { return enemies; }, get boss() { return boss; }, get papa() { return papa; }, get mbe() { return mbe; }, get save() { return S; },
  tick(n = 60, hold = [], press = [], render = true) { for (const k of hold) keys.add(k); for (let i = 0; i < n; i++) { if (i === 0) for (const k of press) pressed.add(k); simulate(1 / 60); } for (const k of hold) keys.delete(k); if (render) composer.render(); return this.state; },
};

boot().catch(e => { console.error(e); $('loading').hidden = true; $('error').hidden = false; $('error').querySelector('h2').textContent = 'The tale hit a snag'; $('error').querySelector('p').textContent = 'Something went wrong while building the world: ' + e.message; });
