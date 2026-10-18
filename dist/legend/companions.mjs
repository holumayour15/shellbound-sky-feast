// Companions: Papa Ike and the heroine's friends share one helper brain; Mbe rides in the basket.
// Modes: 'follow' (Papa while she is a child), 'help' (called in for a limited time), 'hold' (standing on a plate),
// 'wait' (told to stay), 'home' (pottering at their home spot until called).
import * as THREE from 'three';
import { makePapa, makeHeroine } from './humans.mjs';
import { makeTortoise } from './models.mjs';

const wrapA = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

export function createCompanion(scene, model, { attack = 'hammer', home = { x: 0, z: 0 }, id = 'papa' } = {}) {
  model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(model.root);
  const S = { id, x: home.x, y: 0, z: home.z, face: Math.PI, mode: 'home', hold: null, home, fights: true, helpT: 0, slamCd: 2, slamT: 0, liftT: 0, speed: 0, cheer: 0, wander: Math.random() * 6 };
  const swing = attack === 'hammer' ? 0.6 : 0.45;

  function place(x, z, y) { S.x = x; S.z = z; S.y = y; S.speed = 0; }

  /** ctx: { player, surface(x, z, fromY), enemies, weave, busy, waitAt?, onAttack(x, y, z, kind), puff(x, y, z), talking, dance } */
  function update(dt, t, ctx) {
    const p = ctx.player;
    S.slamCd = Math.max(0, S.slamCd - dt); S.slamT = Math.max(0, S.slamT - dt); S.liftT = Math.max(0, S.liftT - dt); S.cheer = Math.max(0, S.cheer - dt);
    const withHer = S.mode === 'follow' || S.mode === 'help';
    let goal;
    if (ctx.waitAt) goal = ctx.waitAt;
    else if (S.mode === 'hold' && S.hold) goal = S.hold;
    else if (S.mode === 'wait') goal = { x: S.x, z: S.z };
    else if (S.mode === 'home') { S.wander += dt * 0.2; goal = { x: S.home.x + Math.cos(S.wander) * 1.5, z: S.home.z + Math.sin(S.wander * 1.3) * 1.5 }; }
    else {
      // Walk alongside her (to her left, slightly behind) so nobody blocks the camera's view of her.
      const side = id === 'papa' ? 2.3 : -2.3;
      goal = { x: p.x - Math.sin(p.face) * 0.5 + Math.cos(p.face) * side, z: p.z - Math.cos(p.face) * 0.5 - Math.sin(p.face) * side };
    }
    // Fight beside the hero: hunt the enemy nearest the hero (within reach), close in and strike again and again.
    if (!ctx.busy && withHer && S.fights && !ctx.waitAt) {
      const e = ctx.enemies.nearest(p.x, p.z, 15, ctx.weave) || ctx.enemies.nearest(S.x, S.z, 10, ctx.weave);
      const reachable = e && (e.kind !== 'hawk' || e.stun > 0 || e.y - S.y < 3) && Math.abs(e.y - S.y) < 3.2;
      if (reachable) {
        S.target = e; goal = { x: e.x - Math.sin(S.face) * 0.6, z: e.z - Math.cos(S.face) * 0.6 };
        if (Math.hypot(e.x - S.x, e.z - S.z) < 2.4 && S.slamT <= 0 && S.slamCd <= 0) { S.face = Math.atan2(e.x - S.x, e.z - S.z); S.slamT = swing; S.slamCd = attack === 'hammer' ? 1.6 : 1.1; S.slamDone = false; }
      } else S.target = null;
    }
    if (S.slamT > 0 && S.slamT < swing * 0.55 && !S.slamDone) { S.slamDone = true; ctx.onAttack(S.x + Math.sin(S.face) * 1.1, S.y, S.z + Math.cos(S.face) * 1.1, attack); }

    const dx = goal.x - S.x, dz = goal.z - S.z, d = Math.hypot(dx, dz), pd = Math.hypot(p.x - S.x, p.z - S.z);
    // Catch up when far behind or separated by height: companions always find a way.
    if (!ctx.waitAt && withHer && p.grounded && (pd > 20 || Math.abs(p.y - S.y) > 3.2)) {
      const sx = p.x - Math.sin(p.face) * 1.6, sz = p.z - Math.cos(p.face) * 1.6, sy = ctx.surface(sx, sz, p.y + 1);
      if (Math.abs(sy - p.y) < 1) { ctx.puff(S.x, S.y, S.z); place(sx, sz, sy); ctx.puff(sx, sy, sz); }
    }
    if (S.mode === 'home' && Math.hypot(S.home.x - S.x, S.home.z - S.z) > 30) place(S.home.x, S.home.z, ctx.surface(S.home.x, S.home.z, 50));
    let speed = 0;
    if (d > 0.35 && S.slamT <= 0 && S.liftT <= 0) {
      speed = Math.min(S.mode === 'home' ? 1.6 : S.target ? 11 : 9.4, d * 2.6);
      const nx = S.x + dx / d * speed * dt, nz = S.z + dz / d * speed * dt, ny = ctx.surface(nx, nz, S.y + 0.6);
      if (ny - S.y < 0.7 && ny > S.y - 6) { S.x = nx; S.z = nz; S.y += (ny - S.y) * Math.min(1, dt * 14); }
      else speed = 0;
      S.face += wrapA(Math.atan2(dx, dz) - S.face) * Math.min(1, dt * 8);
    } else if (pd < 6) S.face += wrapA(Math.atan2(p.x - S.x, p.z - S.z) - S.face) * Math.min(1, dt * 3);
    S.speed += (speed / 8.6 - S.speed) * Math.min(1, dt * 8);
    model.root.position.set(S.x, S.y, S.z); model.root.rotation.y = S.face;
    const spinning = attack === 'spin' && S.slamT > 0;
    model.animate(dt, { t, speed: S.speed, grounded: true, crossArms: id === 'papa' && (S.mode !== 'follow' && S.mode !== 'help' || (S.speed < 0.05 && !ctx.busy)), talking: ctx.talking,
      hammer: attack === 'hammer' && S.slamT > 0 ? 1 - S.slamT / swing : 0, spin: spinning, lifted: S.liftT > 0, wave: S.cheer > 0, dance: ctx.dance });
    if (model.gear.hammer) model.gear.hammer.visible = S.slamT <= 0;
  }
  return { model, S, update, place, lift() { S.liftT = 0.6; }, cheer() { S.cheer = 2.5; } };
}

export const createPapa = (scene, home) => createCompanion(scene, makePapa(), { attack: 'hammer', home, id: 'papa' });
export function createFriend(scene, heroine, home, stage = 'child') {
  const c = createCompanion(scene, makeHeroine(heroine.look, stage), { attack: 'spin', home, id: heroine.id });
  c.heroine = heroine; return c;
}

export function createMbe(scene) {
  const model = makeTortoise({ scale: 0.16, outfit: { head: 'none', wrap: 'adire', shell: 'natural', acc: 'none' } });
  model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const S = { state: 'hidden', x: 0, y: 0, z: 0, vx: 0, vz: 0, travelled: 0, range: 14, cd: 0, target: null, spin: 0 };
  let slot = null;
  function attach(newSlot) {
    slot = newSlot;
    if (S.state === 'pack' || S.state === 'hidden') { slot.add(model.root); model.root.position.set(0, 0.02, 0); model.root.rotation.set(0, Math.PI / 2, 0); model.root.scale.setScalar(0.16); }
    model.root.visible = S.state !== 'hidden';
  }
  function show() { if (S.state === 'hidden') { S.state = 'pack'; model.root.visible = true; } }
  /** Throw from (x, y, z) toward a target object (with x, z) or along face. */
  function toss(x, y, z, face, target, range) {
    if (S.state !== 'pack' || S.cd > 0) return false;
    scene.add(model.root); model.root.scale.setScalar(0.22);
    S.state = 'roll'; S.x = x; S.y = y; S.z = z; S.travelled = 0; S.range = range; S.target = target; S.cd = 1.1;
    const a = target ? Math.atan2(target.x - x, target.z - z) : face;
    S.vx = Math.sin(a) * 20; S.vz = Math.cos(a) * 20;
    return true;
  }
  /** ctx: { heightAt, home: {x, y, z}, hit(x, y, z) -> bool } */
  function update(dt, t, ctx) {
    S.cd = Math.max(0, S.cd - dt);
    if (S.state === 'roll' || S.state === 'return') {
      S.spin += dt * 30;
      if (S.state === 'roll') {
        if (S.target && !S.target.dead) { const a = Math.atan2(S.target.x - S.x, S.target.z - S.z); const sp = Math.hypot(S.vx, S.vz); S.vx += (Math.sin(a) * sp - S.vx) * Math.min(1, dt * 6); S.vz += (Math.cos(a) * sp - S.vz) * Math.min(1, dt * 6); }
        S.x += S.vx * dt; S.z += S.vz * dt; S.travelled += 20 * dt;
        const ground = ctx.heightAt(S.x, S.z) + 0.35;
        S.y += (Math.max(ground, S.y - 2 * dt) - S.y) * Math.min(1, dt * 10);
        if (ctx.hit(S.x, S.y, S.z) || S.travelled > S.range) S.state = 'return';
      } else {
        const h = ctx.home, dx = h.x - S.x, dy = h.y - S.y, dz = h.z - S.z, d = Math.hypot(dx, dy, dz);
        const sp = 24 * dt;
        if (d < 0.8) { S.state = 'pack'; attach(slot); return; }
        S.x += dx / d * sp; S.y += dy / d * sp; S.z += dz / d * sp;
      }
      model.root.position.set(S.x, S.y, S.z); model.root.rotation.set(0, S.spin, 0);
      model.animate(dt, { t, spin: true });
    } else if (S.state === 'pack') {
      model.animate(dt, { t, speed: 0, grounded: true, talking: ctx.talking });
    }
  }
  return { model, S, attach, show, toss, update, get ready() { return S.state === 'pack' && S.cd <= 0; } };
}
