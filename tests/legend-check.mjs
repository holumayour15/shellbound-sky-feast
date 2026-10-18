// Behaviour checks for Shellbound: Legend of the Sky Feast (pure modules, no renderer).
// Run from the game folder: node tests/legend-check.mjs
import assert from 'node:assert/strict';
import { TUNING as T, LOOK, DEFAULT_LOOK, SHOP, GROCERY_LIST, CHECKPOINTS, QUEST, HEROINES, HEROES, BOYS, fitsGender, STAGES, JOBS, stageFor, modifiers, score, grade, TALES, DIFFICULTY, WEAPONS, TIERS, TALENTS, stageIndex } from '../dist/legend/config.mjs';
import { classify, reply, moderate, PERSONAS } from '../dist/legend/chat.mjs';
import { heightAt, WATER_Y, CHASMS, canyonX } from '../dist/legend/terrain.mjs';
import { createPlayer, stepPlayer, surfaceBelow } from '../dist/legend/physics.mjs';
import * as L from '../dist/legend/layout.mjs';
import { sanitize, freshSave } from '../dist/legend/save.mjs';
import { friendCode, normCode, createSocial } from '../dist/legend/social.mjs';
import { nearestColor, cleanMatch, matchPrompt } from '../dist/legend/selfie.mjs';
import { FRIEND_IDS } from '../dist/legend/chat.mjs';
import * as H from '../dist/legend/hobbies.mjs';

const results = [];
const pending = [];
const check = (name, fn) => { const r = fn(); if (r?.then) pending.push(r.then(() => results.push(name))); else results.push(name); };
const PLAT = L.buildPlatforms(), byId = Object.fromEntries(PLAT.map(p => [p.id, p]));
const envFor = (layer, abilities, mods = {}) => ({
  heightAt, walls: L.buildWalls(), updrafts: L.UPDRAFTS, abilities, mods,
  platforms: PLAT.filter(p => !p.sealed && (p.layer === 'both' || p.layer === layer)),
});

// Run from the centre of `from` toward `to`, jump at the edge, double jump at the apex, and hold jump to glide.
function attempt(from, to, { layer = 'both', abilities = {}, double = true, glide = true, maxT = 6 } = {}) {
  const env = envFor(layer === 'both' ? 'now' : layer, abilities);
  if (layer === 'both') env.platforms = PLAT.filter(p => !p.sealed && p.layer !== 'story' || p.id === from.id || p.id === to.id);
  const p = createPlayer(from.x, from.top, from.z); p.grounded = true; p.groundId = from.id;
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz), ix = dx / d, iz = dz / d;
  const edge = from.r ?? Math.min(from.w, from.d) / 2;
  let jumped = false, doubled = false, t = 0;
  while (t < maxT) {
    const dist = Math.hypot(p.x - from.x, p.z - from.z);
    const over = Math.hypot(p.x - to.x, p.z - to.z) < (to.r ?? Math.min(to.w, to.d) / 2) * 0.55;
    const input = { x: over ? 0 : ix, z: over ? 0 : iz, jump: false, jumpHeld: jumped && glide && !over, spin: false };
    if (!jumped && dist > edge - 0.45) { input.jump = true; jumped = true; }
    else if (jumped && !doubled && double && p.vy < 0.5 && !p.grounded) { input.jump = true; doubled = true; }
    stepPlayer(p, 1 / 60, input, env); t += 1 / 60;
    if (jumped && p.grounded && t > 0.1) return p.groundId;
    if (p.y < Math.min(from.top, to.top) - 12 || p.y < WATER_Y - 0.4) return 'fell';
  }
  return 'timeout';
}

check('terrain is finite everywhere players can go', () => {
  for (let x = -138; x <= 138; x += 3) for (let z = -300; z <= 84; z += 3) assert.ok(Number.isFinite(heightAt(x, z)), `NaN at ${x},${z}`);
});
check('village clearing is flat and dry', () => {
  for (const [x, z] of [[0, 12], [0, 0], [10, 5], [-10, -5], [L.NPCS.tailor.x, L.NPCS.tailor.z]]) { const h = heightAt(x, z); assert.ok(h > -0.2 && h < 0.8, `${x},${z}: ${h}`); }
});
check('river is deep water between dry banks', () => {
  assert.ok(heightAt(0, -62) < WATER_Y - 2); assert.ok(heightAt(0, -52) > WATER_Y + 1); assert.ok(heightAt(0, -72) > WATER_Y + 1);
});
check('canyon chasms are bottomless and walls are unclimbable', () => {
  for (const c of CHASMS) assert.ok(heightAt(canyonX((c.a + c.b) / 2), (c.a + c.b) / 2) < -30);
  const z = -200, x = canyonX(z); assert.ok(heightAt(x + 17, z) - heightAt(x + 12, z) > 10, 'wall should rise steeply');
});
check('single and double jump heights match tuning', () => {
  const env = envFor('now', { double: true }); env.platforms = [];
  const flat = { ...env, heightAt: () => 0 };
  const p = createPlayer(0, 0, 0); p.grounded = true;
  let maxY = 0; stepPlayer(p, 1 / 60, { jump: true }, flat);
  for (let i = 0; i < 90; i++) { stepPlayer(p, 1 / 60, {}, flat); maxY = Math.max(maxY, p.y); }
  assert.ok(maxY > 2.0 && maxY < 2.5, 'single ' + maxY);
  const q = createPlayer(0, 0, 0); q.grounded = true; let m2 = 0, dj = false;
  stepPlayer(q, 1 / 60, { jump: true }, flat);
  for (let i = 0; i < 140; i++) { const jump = !dj && q.vy < 0.3; if (jump) dj = true; stepPlayer(q, 1 / 60, { jump }, flat); m2 = Math.max(m2, q.y); }
  assert.ok(m2 > 3.8 && m2 < 4.6, 'double ' + m2);
});
check('river stones: second gap needs Weaver’s double jump', () => {
  assert.equal(attempt(byId.stone1, byId.stone2, { abilities: {}, double: false, glide: false }), 'fell');
  assert.equal(attempt(byId.stone1, byId.stone2, { abilities: { double: true }, glide: false }), 'stone2');
});
check('canyon: ruin pillar works in Now, vanishes in Story-time', () => {
  const edge = { id: 'edgeA', x: canyonX(-178), z: -178.5, r: 1.6, top: heightAt(canyonX(-178), -178.5) };
  const now = envFor('now', { double: true }); assert.ok(now.platforms.includes(byId.pillar));
  const story = envFor('story', { double: true }); assert.ok(!story.platforms.includes(byId.pillar));
  const env = envFor('now', { double: true }), p = createPlayer(byId.pillar.x, byId.pillar.top + 1, byId.pillar.z);
  for (let i = 0; i < 40; i++) stepPlayer(p, 1 / 60, {}, env);
  assert.equal(p.groundId, 'pillar'); void edge;
});
check('spirit bridge exists only in Story-time', () => {
  assert.ok(envFor('story', {}).platforms.includes(byId.bridge)); assert.ok(!envFor('now', {}).platforms.includes(byId.bridge));
});
check('Sky Baobab: sealed until Eagle, then climbable plank to plank', () => {
  const ground = { id: 'g', x: byId.plank3.x, z: byId.plank3.z + 4, r: 2, top: heightAt(byId.plank3.x, byId.plank3.z + 4) };
  assert.ok(byId.plank3.top - ground.top > 4.6, 'first open plank must be out of reach from the ground');
  for (let i = 3; i < L.PLANKS - 1; i++) {
    const a = byId['plank' + i], b = byId['plank' + (i + 1)];
    const layer = a.layer === 'story' || b.layer === 'story' ? 'story' : 'now';
    if (a.layer !== 'both' && b.layer !== 'both' && a.layer !== b.layer) throw new Error('impossible layer pair ' + i);
    const env = PLAT.filter(p => p === a || p === b);
    void env;
    assert.equal(attempt(a, b, { layer, abilities: { double: true, glide: true } }), b.id, `plank ${i} -> ${i + 1}`);
  }
  assert.equal(attempt(byId.plank15, { ...byId.crown, x: byId.crown.x + Math.sin(15 * 0.62) * 6, z: byId.crown.z + Math.cos(15 * 0.62) * 6, r: 2, id: 'crown' }, { layer: 'now', abilities: { double: true, glide: true } }), 'crown');
});
check('Sky Road: updraft gap needs Eagle’s feather', () => {
  const ab = { double: true, glide: true };
  assert.notEqual(attempt(byId.isle3, byId.isle4, { abilities: ab }), 'isle4');
  assert.equal(attempt(byId.isle3, byId.isle4, { abilities: { ...ab, updraft: true } }), 'isle4');
  assert.equal(attempt(byId.crown, byId.isle1, { abilities: ab }), 'isle1');
  assert.equal(attempt(byId.isle1, byId.isle2, { layer: 'story', abilities: ab }), 'isle2');
  assert.equal(attempt(byId.isle2, byId.isle3, { layer: 'story', abilities: ab }), 'isle3');
  assert.equal(attempt(byId.isle4, byId.isle5, { layer: 'story', abilities: { ...ab, updraft: true } }), 'isle5');
});
check('checkpoints sit on solid ground or platforms', () => {
  const env = envFor('now', { double: true });
  for (const c of CHECKPOINTS) {
    const s = surfaceBelow(env, c.x, c.z, (c.y ?? heightAt(c.x, c.z)) + 1.5);
    assert.ok(s.y > WATER_Y + 0.3, `${c.name} at ${s.y}`);
    if (c.y != null) assert.ok(Math.abs(s.y - c.y) < 0.6, `${c.name}: surface ${s.y} vs ${c.y}`);
  }
});
check('pickups are clear of huts and inside the world', () => {
  for (const it of [...L.THREADS, ...L.TALE_STONES, ...L.KOLA]) for (const h of L.HUTS) assert.ok(Math.hypot(it.x - h.x, it.z - h.z) > 4.4, `${it.id} inside hut`);
  const cow = L.buildCowries(PLAT); assert.ok(cow.length > 100); assert.equal(new Set(cow.map(c => c.id)).size, cow.length);
  for (const c of cow) assert.ok(Number.isFinite(c.y) && c.y > WATER_Y, c.id);
});
check('moving platform carries a standing player', () => {
  const pl = { ...byId.isle6, dx: 0.1, dz: 0 }, env = { heightAt: () => -80, platforms: [pl], walls: [], updrafts: [] };
  const p = createPlayer(pl.x, pl.top, pl.z); p.grounded = true; p.groundId = pl.id;
  for (let i = 0; i < 10; i++) stepPlayer(p, 1 / 60, {}, env);
  assert.ok(p.x > pl.x + 0.8 && p.groundId === pl.id);
});
check('walls push players out', () => {
  const env = { heightAt: () => 0, platforms: [], walls: [{ x: 0, z: 0, r: 3, y0: -5, y1: 5 }], updrafts: [] };
  const p = createPlayer(0, 0, 3.2); p.grounded = true;
  for (let i = 0; i < 30; i++) stepPlayer(p, 1 / 60, { x: 0, z: -1 }, env);
  assert.ok(Math.hypot(p.x, p.z) >= 3 + T.radius - 1e-6);
});
check('save sanitisation rejects junk, keeps valid progress and migrates v2/v3 saves', () => {
  assert.equal(sanitize(null), null); assert.equal(sanitize({ v: 1 }), null);
  const s = sanitize({ v: 4, name: 'Kemi<script>', gender: 'm', talent: 'swift', cowries: 1e12, earned: 150, stage: 'youth', quest: 'hack', feathers: 9, owned: ['hair:gele', 'evil:<script>'],
    look: { hair: 'twists', top: 'nope', acc: 'crown' }, bag: { jollof: 3, bomb: 9, suya: -4 }, upgrades: ['staff1', 'laser'], weapons: ['spear', 'laser'], weapon: 'laser', job: { id: 'hack' }, picked: [1, 'c1', 'c1'], checkpoint: -4, elapsed: NaN });
  assert.equal(s.name, 'Kemiscript'); assert.equal(s.gender, 'm'); assert.equal(s.talent, 'swift'); assert.equal(s.cowries, 99999); assert.equal(s.quest, 'meet'); assert.equal(s.feathers, 3);
  assert.equal(s.stage, 'child', 'youth not earned yet'); assert.equal(s.grown, 'teen'); assert.equal(s.job, null);
  assert.equal(s.look.hair, 'twists'); assert.equal(s.look.top, BOYS[0].look.top); assert.equal(s.look.acc, BOYS[0].look.acc, 'unowned crown is refused');
  assert.deepEqual(s.weapons, ['none', 'staff', 'spear']); assert.equal(s.weapon, 'staff');
  assert.deepEqual(s.bag, { jollof: 3 }); assert.deepEqual(s.upgrades, ['staff1']); assert.deepEqual(s.picked, ['c1']); assert.equal(s.checkpoint, 0); assert.equal(s.elapsed, 0);
  assert.ok(!s.owned.includes('evil:<script>'));
  const v3 = sanitize({ v: 3, hero: 'dayo', looks: { dayo: { ...BOYS[2].look } }, earned: 130, stage: 'teen', cowries: 9 });
  assert.equal(v3.name, 'Dayo'); assert.equal(v3.gender, 'm'); assert.equal(v3.talent, 'musical'); assert.equal(v3.stage, 'teen'); assert.equal(v3.look.hair, 'twists');
  const old = sanitize({ v: 2, look: { ...DEFAULT_LOOK, hair: 'afro' }, cowries: 40, quest: 'river', feathers: 1 });
  assert.equal(old.name, 'Amara'); assert.equal(old.look.hair, 'afro'); assert.equal(old.quest, 'river'); assert.equal(old.earned, 40);
});
check('players create their own hero: name, gender, talent and starting age', () => {
  const f = freshSave({ name: '  Adé   Ọlá  ', gender: 'm', talent: 'clever', stage: 'adult' });
  assert.equal(f.name, 'Adé Ọlá'); assert.equal(f.gender, 'm'); assert.equal(f.talent, 'clever'); assert.equal(f.stage, 'adult'); assert.equal(f.earned, 600, 'starting age counts as earned');
  assert.equal(freshSave({ name: '' }).name, 'Shellbound'); assert.equal(freshSave({ stage: 'wizard' }).stage, 'child');
  for (const g of ['f', 'm']) { const x = freshSave({ gender: g }); for (const [slot, id] of Object.entries(x.look)) { const it = LOOK[slot].items.find(i => i.id === id); assert.ok(it && fitsGender(it, g) && x.owned.includes(slot + ':' + id), `${g} ${slot}:${id}`); } }
  for (const t of TALENTS) assert.ok(Object.keys(t.mod).length, t.id);
});
check('eight village friends with homes, voices and wardrobe looks', () => {
  assert.deepEqual(HEROES.map(h => h.name), ['Amara', 'Hadassah', 'Tehilah', 'Tiara', 'Tobi', 'Emeka', 'Dayo', 'Musa']);
  assert.deepEqual(FRIEND_IDS, HEROES.map(h => h.id));
  for (const h of HEROES) {
    assert.ok(PERSONAS[h.id]?.friend, 'persona ' + h.id); const home = L.FRIEND_HOMES[h.id]; assert.ok(home, 'home ' + h.id);
    assert.ok(heightAt(home.x, home.z) > WATER_Y + 0.3);
    for (const [slot, id] of Object.entries(h.look)) { const it = LOOK[slot].items.find(i => i.id === id); assert.ok(it && fitsGender(it, h.gender), `${h.id} ${slot}:${id}`); }
  }
  for (const g of ['f', 'm']) for (const slot of Object.keys(LOOK)) assert.ok(LOOK[slot].items.some(i => i.cost === 0 && fitsGender(i, g)), `free ${slot} for ${g}`);
});
check('age sets the challenge, monster count and weapon tier', () => {
  assert.deepEqual(STAGES.map(s => s.id), ['child', 'teen', 'youth', 'adult']);
  for (let i = 1; i < STAGES.length; i++) {
    const a = STAGES[i - 1], b = STAGES[i];
    assert.ok(b.earn > a.earn && b.monsters > a.monsters && b.tier > a.tier);
    assert.ok(DIFFICULTY[b.diff].enemySpeed >= DIFFICULTY[a.diff].enemySpeed && DIFFICULTY[b.diff].scoreMul > DIFFICULTY[a.diff].scoreMul, b.id);
    assert.ok(TIERS[b.tier].mul > TIERS[a.tier].mul);
  }
  assert.equal(stageFor(0).id, 'child'); assert.equal(stageFor(120).id, 'teen'); assert.equal(stageFor(300).id, 'youth'); assert.equal(stageFor(600).id, 'adult');
  const child = modifiers(DEFAULT_LOOK, [], 'brave', 'child'), adult = modifiers(DEFAULT_LOOK, [], 'brave', 'adult');
  assert.ok(adult.hearts > child.hearts && adult.speed > child.speed && adult.drum > child.drum);
  const pickups = L.buildCowries(PLAT).length, chests = L.CHESTS.reduce((a, c) => a + (c.coins || 0), 0), digs = L.DIG_SPOTS.reduce((a, d) => a + d.coins, 0);
  assert.ok(pickups + chests + digs >= STAGES[1].earn, 'teen reachable from the world alone');
  assert.ok(JOBS.length >= 6 && JOBS.every(j => j.reward > 0), 'repeatable jobs pay the rest of the way');
});
check('weapons: optional, age-gated and stronger with age', () => {
  assert.ok(WEAPONS.some(w => w.id === 'none' && w.cost === 0), 'playing without a weapon is allowed');
  for (const w of WEAPONS) { assert.ok(['spin', 'shoot', 'thrust', 'slash'].includes(w.kind)); assert.ok(STAGES.some(s => s.id === w.minStage)); }
  assert.ok(WEAPONS.some(w => stageIndex(w.minStage) >= 2), 'something saved for youths');
  const best = Math.max(...WEAPONS.map(w => w.dmg)) * TIERS[3].mul; assert.ok(best >= 6, 'gold sword hits hard');
});
check('friend codes are stable, short and hard to collide', () => {
  assert.equal(friendCode('user-1'), friendCode('user-1')); assert.match(friendCode('user-1'), /^[A-Z2-9]{6}$/);
  const codes = new Set(Array.from({ length: 2000 }, (_, i) => friendCode('u' + i))); assert.ok(codes.size > 1990);
  assert.equal(friendCode(null), null); assert.equal(normCode(' ab-c1 2z '), 'ABC12Z');
});
check('only befriended players can chat or invite; strangers can only ask', async () => {
  // A tiny in-memory room shared by three players.
  const subs = []; const mk = id => ({
    on: (topic, fn) => subs.push({ id, topic, fn }), onPeers: () => {}, presence: async () => {},
    emit: async (topic, data) => { for (const s of subs) if (s.topic === topic) s.fn({ topic, data: JSON.parse(JSON.stringify(data)), by: id, isMe: s.id === id, guest: false }); },
    join: async () => ({ onPeers: () => {}, presence: async () => {}, leave: async () => {} }),
  });
  const mkPlayer = (id, name) => { const st = { list: [], chats: [], invites: [], reqs: [] };
    st.social = createSocial(mk(id), { id: async () => id }, { friends: () => st.list, setFriends: l => { st.list = l; }, self: () => ({ name }), onChange() {}, onChat: (f, t) => st.chats.push([f.name, t]), onInvite: i => st.invites.push(i), onRequest: r => st.reqs.push(r), onToast() {} });
    return st; };
  const A = mkPlayer('ida', 'Ada'), B = mkPlayer('ben', 'Bayo'), C = mkPlayer('cy', 'Stranger');
  await Promise.all([A.social.ready, B.social.ready, C.social.ready]);
  const [a, b, c] = [A, B, C].map(x => x.social.S.code);
  await C.social.chat('hi'); assert.equal(A.chats.length, 0, 'stranger chat ignored');
  assert.equal(await C.social.invite(a), false, 'stranger cannot invite');
  await A.social.request(b); assert.equal(B.reqs.length, 1); assert.equal(B.reqs[0].name, 'Ada');
  B.social.accept(a); await Promise.resolve();
  assert.deepEqual(A.list.map(f => f.code), [b]); assert.deepEqual(B.list.map(f => f.code), [a]);
  const fake = mk('cy'); await fake.emit('invite', { to: a, party: b, name: 'Bayo' }); assert.equal(A.invites.length, 0, 'forged sender is ignored');
  assert.equal(await B.social.invite(a), true); assert.equal(A.invites.length, 1); assert.equal(A.invites[0].name, 'Bayo');
  await fake.emit('chat', { text: 'hello', to: [a] }); assert.equal(A.chats.length, 0);
  assert.ok(c && a !== b);
  // Anyone may wave; a wave is a fixed gesture, rate-limited, and junk gestures are dropped.
  const waves = []; A.social = A.social; const hooksA = A;
  const W1 = mk('wa'), D = createSocial(mk('dee'), { id: async () => 'dee' }, { friends: () => [], setFriends() {}, self: () => ({ name: 'Dee' }), onChange() {}, onChat() {}, onInvite() {}, onRequest() {}, onToast() {}, onHello: (f, k) => waves.push(k) });
  await D.ready; const dc = D.S.code;
  await W1.emit('hello', { to: dc, kind: 'wave' }); await W1.emit('hello', { to: dc, kind: 'wave' }); await W1.emit('hello', { to: dc, kind: '<script>' });
  assert.deepEqual(waves, ['wave'], 'one wave, then rate-limited; unknown gestures ignored');
  assert.ok(hooksA);
});
check('jobs name real characters', () => {
  for (const j of JOBS) { assert.ok(PERSONAS[j.giver], j.giver); assert.ok(j.to === 'friend' || PERSONAS[j.to], j.to); }
});
check('chat understands requests and stays in character', () => {
  assert.equal(classify('Hello!'), 'greet'); assert.equal(classify('what should I do now?'), 'help'); assert.equal(classify('can I help you?'), 'offer');
  assert.equal(classify('come and help me'), 'summon'); assert.equal(classify('how do I earn coins'), 'coins'); assert.equal(classify('when will I grow up'), 'grow');
  const ctx = { hero: 'Tiara', coins: 5, earned: 50, nextStage: { name: 'Teenager', need: 70 }, hint: 'Buy egusi.', quest: 'Market run', offer: { id: 'x', item: 'yams', toName: 'Mama Nkem', reward: 7 } };
  const job = reply('grandma', 'can I help?', ctx); assert.equal(job.action?.type, 'acceptJob'); assert.match(job.text, /yams/);
  const del = reply('mama', 'here is your delivery', { ...ctx, job: { item: 'yams', reward: 7, toName: 'Mama Nkem' }, canDeliver: true }); assert.equal(del.action?.type, 'deliverJob');
  assert.match(reply('papa', 'what next?', ctx).text, /Buy egusi/);
  assert.equal(reply('papa', 'come help me', { ...ctx, summon: { state: 'come' } }).action?.type, 'summon');
  assert.ok(!reply('papa', 'come help me', { ...ctx, summon: { state: 'youth' } }).action, 'a youth fights alone');
  for (const id of FRIEND_IDS) assert.ok(reply(id, 'tell me a joke', ctx).text.length > 5, id);
  for (const id of Object.keys(PERSONAS)) assert.ok(reply(id, 'hi', ctx).text.length > 2, id);
});
check('chat filter hides personal details and insults but not innocent words', () => {
  const m = moderate('email me a@b.co or call +234 803 123 4567, you idiot. hello class, assist me');
  assert.ok(m.redacted); assert.ok(!/a@b\.co|803/.test(m.text)); assert.ok(!/idiot/.test(m.text)); assert.ok(/hello class, assist me/.test(m.text));
  assert.equal(moderate('x'.repeat(500)).text.length, 140);
});
check('look perks and forge upgrades combine', () => {
  const m = modifiers({ ...DEFAULT_LOOK, acc: 'beads', top: 'kente', shoes: 'boots', hair: 'gele' }, ['charm', 'sandals'], 'clever', 'child');
  assert.equal(m.hearts, 2); assert.equal(m.style, 2); assert.ok(m.glide > 1); assert.ok(m.speed > 1.1);
  for (const slot of Object.keys(LOOK)) for (const it of LOOK[slot].items) assert.ok(it.id && it.name && Number.isFinite(it.cost), slot + ':' + it.id);
  for (const slot of Object.keys(LOOK)) assert.ok(LOOK[slot].items.some(i => i.id === DEFAULT_LOOK[slot] && i.cost === 0), 'default ' + slot + ' is free');
});
check('market sells every grocery and the soup quest is affordable from village cowries', () => {
  const groceries = GROCERY_LIST.map(id => SHOP.groceries.find(g => g.id === id));
  assert.ok(groceries.every(Boolean));
  const cost = groceries.reduce((a, g) => a + g.cost, 0);
  const villageCowries = L.buildCowries(PLAT).filter(c => c.z > -50 && c.layer !== 'story').length;
  assert.ok(villageCowries + 6 >= cost, `need ${cost}, village has ${villageCowries} + 6 from Grandma`);
  assert.ok(SHOP.food.every(f => f.heal || f.energy || f.buff));
});
check('Papa-lift pillars need a lift: too high to jump, low enough to be lifted', () => {
  const dj = T.jump ** 2 / (2 * T.gravity) + T.doubleJump ** 2 / (2 * T.gravity);
  const lift = T.papaLift ** 2 / (2 * T.gravity);
  for (const l of L.LIFTS) { const h = l.top - heightAt(l.x, l.z); assert.ok(h > dj + 0.5, `${l.id} jumpable`); assert.ok(h < lift - 0.2, `${l.id} too high to lift`); }
  for (const l of L.LIFTS) assert.ok(L.CHESTS.some(c => c.id === l.id), 'chest on ' + l.id);
});
check('drum riddle uses real stones and the drum chest holds the fifth thread', () => {
  assert.ok(L.DRUM_PATTERN.length >= 4 && L.DRUM_PATTERN.every(i => L.DRUM_STONES[i]));
  assert.ok(new Set(L.DRUM_PATTERN).size === L.DRUM_STONES.length, 'every stone is used');
  assert.equal(L.THREADS.find(t => t.id === 't5').chest, 'drumchest');
});
check('canyon gate spans the canyon and both plates sit on dry ground before it', () => {
  const G = L.GATE;
  assert.ok(heightAt(G.x - G.half, G.z) > heightAt(G.x, G.z) + 5 && heightAt(G.x + G.half, G.z) > heightAt(G.x, G.z) + 5, 'gate reaches the walls');
  for (const p of G.plates) { assert.ok(p.z > G.z, 'plate before gate'); assert.ok(heightAt(p.x, p.z) > WATER_Y); }
});
check('treasure, errands and Greedlings are placed on reachable land', () => {
  for (const d of [...L.DIG_SPOTS, ...L.GREEDLINGS, L.ERRANDS.ball.item]) { const h = heightAt(d.x, d.z); assert.ok(h > WATER_Y + 0.3 && h < 20, JSON.stringify(d)); }
  assert.equal(new Set(L.DIG_SPOTS.map(d => d.id)).size, L.DIG_SPOTS.length);
});
check('scores reward completion, treasure, speed and difficulty', () => {
  const base = { cowries: 100, tales: 6, enemies: 10, seconds: 1200, deaths: 0, style: 2, treasure: 3 };
  assert.ok(score({ ...base, difficulty: 'legend' }) > score({ ...base, difficulty: 'adventure' }));
  assert.ok(score({ ...base, seconds: 900 }) > score(base));
  assert.ok(score({ ...base, treasure: 8 }) > score(base));
  assert.ok(score({ ...base, deaths: 5 }) < score(base));
  assert.equal(grade(20000), 'S'); assert.equal(grade(0), 'D');
});
check('selfie play maps photo colours to avatar choices and trusts only known ids', () => {
  assert.equal(nearestColor([75, 42, 26], LOOK.skin.items), 'ebony'); assert.equal(nearestColor([240, 205, 178], LOOK.skin.items), 'ivory');
  assert.equal(nearestColor([20, 16, 12], LOOK.hairColor.items), 'black');
  assert.deepEqual(cleanMatch({ skin: 'sand', hair: 'puffs', acc: 'glasses', face: 'evil' }, 'm'), { skin: 'sand', acc: 'glasses' }, 'girls-only hair refused for a boy');
  assert.deepEqual(cleanMatch('nope', 'f'), {});
  assert.ok(!/puffs/.test(matchPrompt('m')) && /lowcut/.test(matchPrompt('m')));
});
check('fishing: rarer fish need skill, Story-time brings the moonfish, tougher fish are harder to reel', () => {
  const counts = level => { const c = {}; for (let i = 0; i < 2000; i++) { const id = H.rollFish(i / 2000, { level, rod: 1 }); c[id] = (c[id] || 0) + 1; } return c; };
  const beginner = counts(1); assert.ok(!beginner.perch && !beginner.goldcarp && !beginner.moonfish, 'no rare fish at level 1');
  assert.ok(counts(3).perch > 0 && counts(3).goldcarp > 0);
  let moon = 0; for (let i = 0; i < 1000; i++) if (H.rollFish(i / 1000, { level: 1, story: true }) === 'moonfish') moon++; assert.ok(moon > 0);
  assert.ok(H.reelZone('perch') < H.reelZone('tilapia') && H.reelZone('perch', 3) > H.reelZone('perch', 1));
  for (const f of H.FISH) assert.ok(H.fishOf(f.id) && f.name, f.id);
});
const shopItemOK = id => !!(H.fishOf(id) || H.dishOf(id));
check('cooking: recipes use what is in the bag, any fish works where a recipe allows it', () => {
  const r = id => H.RECIPES.find(x => x.id === id);
  assert.deepEqual(H.recipeUse({ tilapia: 1, pepper: 2 }, r('grilledfish')), { tilapia: 1, pepper: 1 });
  assert.equal(H.recipeUse({ tilapia: 1 }, r('grilledfish')), null);
  assert.deepEqual(H.recipeUse({ catfish: 1, perch: 1, egusi: 1, palmoil: 1, ugu: 1 }, r('egusisoup')), { egusi: 1, palmoil: 1, ugu: 1, catfish: 1 }, 'cheapest fish is used');
  assert.equal(H.recipeUse({ sandal: 3, puffpuff: 1 }, r('fishroll')), null, 'a sandal is not a fish');
  for (const rc of H.RECIPES) { assert.ok(H.dishOf(rc.id)); for (const k of Object.keys(rc.needs)) assert.ok(k === 'fish' || H.fishOf(k) || SHOP.groceries.some(g => g.id === k) || SHOP.food.some(g => g.id === k), k); }
  assert.ok(H.DISHES.every(d => d.heal || d.energy) && H.quality(0) === 1 && H.quality(5) === 3);
});
check('hobby levels pay prizes that exist in the wardrobe', () => {
  assert.equal(H.levelOf(0), 1); assert.equal(H.levelOf(24), 1); assert.equal(H.levelOf(25), 2); assert.equal(H.levelOf(999), 5);
  for (const h of Object.values(H.HOBBIES)) for (const pz of Object.values(h.prizes)) for (const k of pz.unlock || []) { const [slot, id] = k.split(':'); assert.ok(LOOK[slot].items.some(i => i.id === id && i.cost < 0), k); }
  const f = freshSave({}); assert.deepEqual(f.hobby, { fish: 0, cook: 0, bike: 0 });
  const s = sanitize({ ...f, hobby: { fish: 99, cook: 'x', bike: -5 }, catches: { tilapia: 3, shark: 2 }, bag: { tilapia: 2, peppersoup: 1, rocket: 1 }, badges: ['first', 'hack'], bike: 'gold', today: { day: 5, fishToday: 2, 'bad key!': 1 } });
  assert.deepEqual(s.hobby, { fish: 99, cook: 0, bike: 0 }); assert.deepEqual(s.catches, { tilapia: 3 }); assert.deepEqual(s.bag, { tilapia: 2, peppersoup: 1 });
  assert.deepEqual(s.badges, ['first']); assert.equal(s.bike, 'gold'); assert.deepEqual(s.today, { day: 5, fishToday: 2 });
});
check('bike loop gates sit on dry village ground, with par time and prizes', () => {
  assert.equal(H.BIKE_GATES.length, 10);
  for (const g of H.BIKE_GATES) assert.ok(heightAt(g.x, g.z) > WATER_Y + 0.5 && Math.hypot(g.x, g.z - 2) < 30);
  assert.ok(H.bikeReward(H.BIKE_PAR * 0.7) > H.bikeReward(H.BIKE_PAR) && H.bikeReward(H.BIKE_PAR) > H.bikeReward(99));
  assert.ok(heightAt(L.JETTY.x, L.JETTY.z) > WATER_Y && heightAt(L.JETTY.x, L.JETTY.z - 6) < WATER_Y, 'jetty runs from the bank out over water');
});
check('daily gift grows with a streak and resets after a missed day; challenges are stable per day', () => {
  const a = H.dailyGift(null, 100); assert.equal(a.streak, 1);
  const b = H.dailyGift({ day: 100, streak: 1 }, 101); assert.equal(b.streak, 2); assert.ok(b.coins > a.coins);
  assert.equal(H.dailyGift({ day: 101, streak: 2 }, 101), null, 'once a day');
  assert.equal(H.dailyGift({ day: 101, streak: 5 }, 104).streak, 1);
  assert.deepEqual(H.challengesFor(42).map(c => c.id), H.challengesFor(42).map(c => c.id)); assert.equal(new Set(H.challengesFor(42)).size, 3);
  const st = { catches: { goldcarp: 1 }, hobby: { fish: 300, cook: 0, bike: 0 }, badges: ['first'] };
  assert.deepEqual(H.newBadges(st).sort(), ['angler', 'gold']);
});
check('a restarted story remembers the starting age and how many times it was retold', () => {
  const f = freshSave({ stage: 'teen' }); assert.equal(f.startStage, 'teen'); assert.equal(f.restarts, 0);
  const s = sanitize({ ...f, restarts: 3, startStage: 'wizard', lesson: 'brute' }); assert.equal(s.restarts, 3); assert.equal(s.startStage, 'child'); assert.equal(s.lesson, null);
});
check('content tables are complete', () => {
  assert.equal(TALES.length, 6); assert.equal(L.TALE_STONES.length, 6); assert.equal(L.THREADS.length, 5); assert.equal(L.RINGS.length, 8);
  assert.ok(QUEST.some(q => q.id === 'market') && QUEST.some(q => q.id === 'soup'));
  assert.ok(QUEST.at(-1).id === 'done');
});

await Promise.all(pending);
console.log(`Legend checks passed (${results.length}):\n - ` + results.join('\n - '));
