// Player controller: pure, frame-rate tolerant, testable without a renderer.
import { TUNING as T } from './config.mjs';
import { BOUNDS } from './terrain.mjs';

export function createPlayer(x = 0, y = 0, z = 12) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, face: Math.PI, grounded: false, groundId: null, jumps: 0, coyote: 0, buffer: 0,
    gliding: false, spin: 0, energy: 1, inv: 0, kx: 0, kz: 0, airTime: 0, inUpdraft: false };
}

const angleLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

export function onPlatform(pl, x, z, pad = 0.35) {
  if (pl.shape === 'box') {
    const c = Math.cos(-(pl.rot || 0)), s = Math.sin(-(pl.rot || 0)), lx = (x - pl.x) * c - (z - pl.z) * s, lz = (x - pl.x) * s + (z - pl.z) * c;
    return Math.abs(lx) < pl.w / 2 + pad && Math.abs(lz) < pl.d / 2 + pad;
  }
  return Math.hypot(x - pl.x, z - pl.z) < pl.r + pad;
}

// Highest solid surface under (x, z) that the player can stand on, given they were at height fromY.
export function surfaceBelow(env, x, z, fromY) {
  let y = env.heightAt(x, z), id = 'terrain', pl = null;
  for (const p of env.platforms) {
    if (p.top > y && fromY >= p.top - 0.3 && onPlatform(p, x, z)) { y = p.top; id = p.id; pl = p; }
  }
  return { y, id, pl };
}

export function tryJump(p, ab, mods) {
  if (p.grounded || p.coyote > 0) {
    p.vy = T.jump; p.jumps = 1; p.grounded = false; p.coyote = 0; p.groundId = null; return 'jump';
  }
  if (ab.double && p.jumps < 2) { p.vy = T.doubleJump * (mods.djump || 1); p.jumps = 2; return 'double'; }
  return null;
}

export function trySpin(p, mods) {
  const cost = T.spinCost * (mods.spinCost || 1);
  if (p.spin <= 0 && p.energy >= cost) { p.energy -= cost; p.spin = T.spinTime * (mods.spin || 1); return true; }
  return false;
}

/**
 * Advance the player one step.
 * input: { x, z } camera-relative move in world space, jump (pressed this frame), jumpHeld, spin (pressed)
 * env: { heightAt, platforms[], walls[], updrafts[], abilities{double,glide,updraft}, mods }
 * Returns a list of event names for audio/visual feedback.
 */
export function stepPlayer(p, dt, input, env) {
  dt = Math.min(dt, 1 / 30);
  const ev = [], ab = env.abilities || {}, m = env.mods || {};
  p.energy = Math.min(1, p.energy + dt * T.energyRegen * (m.regen || 1));
  p.inv = Math.max(0, p.inv - dt);
  p.coyote = Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (p.coyote <= 0 && !p.grounded && p.jumps === 0) p.jumps = 1;

  // Ride moving platforms.
  const carrier = env.platforms.find(q => q.id === p.groundId);
  if (carrier && p.grounded) { p.x += carrier.dx || 0; p.z += carrier.dz || 0; }

  if (input.spin && trySpin(p, m)) ev.push('spin');
  if (input.jump) p.buffer = T.jumpBuffer;
  if (p.buffer > 0) { const j = tryJump(p, ab, m); if (j) { p.buffer = 0; ev.push(j); } }

  let ix = input.x || 0, iz = input.z || 0;
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }
  if (len > 0.08 && p.spin <= 0) p.face = angleLerp(p.face, Math.atan2(ix, iz), Math.min(1, dt * 14));

  if (p.spin > 0) {
    p.spin -= dt;
    const sp = T.spinSpeed;
    if (len > 0.08) p.face = angleLerp(p.face, Math.atan2(ix, iz), Math.min(1, dt * 5));
    p.vx = Math.sin(p.face) * sp; p.vz = Math.cos(p.face) * sp;
    if (p.spin <= 0) { p.vx *= 0.35; p.vz *= 0.35; }
  } else {
    const max = (p.gliding ? T.glideSpeed * (m.glideSpeed || 1) : T.walk) * (m.speed || 1);
    const acc = (p.grounded ? (len > 0.05 ? T.accel : T.friction) : T.airAccel) * dt;
    const tx = ix * max, tz = iz * max;
    p.vx += Math.max(-acc, Math.min(acc, tx - p.vx));
    p.vz += Math.max(-acc, Math.min(acc, tz - p.vz));
  }

  // Knockback impulse decays separately so it never fights the stick.
  const kdecay = Math.exp(-dt * 5);
  p.kx *= kdecay; p.kz *= kdecay;

  // Gravity, glide and warm-wind updrafts.
  p.vy -= T.gravity * dt;
  p.inUpdraft = false;
  p.gliding = !p.grounded && ab.glide && input.jumpHeld && p.vy < 1 && p.spin <= 0;
  if (p.gliding) {
    p.vy = Math.max(p.vy, -T.glideFall / (m.glide || 1));
    if (ab.updraft) for (const u of env.updrafts || []) {
      if (Math.hypot(p.x - u.x, p.z - u.z) < u.r && p.y > u.y0 && p.y < u.y1) {
        p.inUpdraft = true; p.vy = Math.min(T.updraftMax, p.vy + T.updraft * dt);
      }
    }
  }

  // Horizontal move with terrain step limit (slide along steep walls axis by axis).
  const mx = (p.vx + p.kx) * dt, mz = (p.vz + p.kz) * dt;
  const blocked = (x, z) => env.heightAt(x, z) > p.y + T.stepUp && !onAnyPlatform(env, x, z, p.y);
  if (!blocked(p.x + mx, p.z + mz)) { p.x += mx; p.z += mz; }
  else if (!blocked(p.x + mx, p.z)) { p.x += mx; p.vz *= 0.2; }
  else if (!blocked(p.x, p.z + mz)) { p.z += mz; p.vx *= 0.2; }
  else { p.vx = 0; p.vz = 0; }

  // Solid round obstacles: huts, trunks, columns, the boss.
  for (const w of env.walls) {
    if (p.y + 1.4 < w.y0 || p.y > w.y1) continue;
    const dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz), min = w.r + T.radius;
    if (d < min && d > 1e-5) {
      const nx = dx / d, nz = dz / d;
      p.x = w.x + nx * min; p.z = w.z + nz * min;
      const vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= vn * nx; p.vz -= vn * nz; }
      if (w.onHit) ev.push('wall:' + w.id);
    }
  }
  p.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, p.x));
  p.z = Math.min(BOUNDS.maxZ, p.z);

  // Vertical integrate and land.
  const oldY = p.y, wasGrounded = p.grounded;
  p.y += p.vy * dt;
  const s = surfaceBelow(env, p.x, p.z, oldY);
  const snap = wasGrounded && p.vy <= 0 && oldY - s.y < 0.6 && oldY - s.y > -T.stepUp;
  if ((p.y <= s.y && p.vy <= 0.01) || snap) {
    if (!wasGrounded && p.airTime > 0.25) ev.push('land');
    p.y = s.y; p.vy = 0; p.grounded = true; p.groundId = s.id; p.jumps = 0; p.coyote = T.coyote; p.airTime = 0; p.gliding = false;
  } else {
    p.grounded = false; p.groundId = null; p.airTime += dt;
  }
  if (p.y < T.fallLimit) ev.push('fell');
  return ev;
}

function onAnyPlatform(env, x, z, y) {
  for (const p of env.platforms) if (p.top <= y + T.stepUp && p.top > y - 3 && onPlatform(p, x, z)) return true;
  return false;
}

export function knockback(p, fromX, fromZ, power = 12) {
  const dx = p.x - fromX, dz = p.z - fromZ, d = Math.hypot(dx, dz) || 1;
  p.kx = dx / d * power; p.kz = dz / d * power; p.vy = Math.max(p.vy, 6); p.grounded = false; p.groundId = null;
}
