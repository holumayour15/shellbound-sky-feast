// Analytic world terrain. Pure functions shared by rendering, physics and tests.

export const WATER_Y = -1.2;
export const BOUNDS = { minX: -138, maxX: 138, minZ: -292, maxZ: 84 };
export const CHASMS = [
  { a: -181, b: -193 }, // crossed on Now-time ruin pillars
  { a: -216, b: -231 }, // crossed on a Story-time spirit bridge
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }

export const riverZ = x => -62 + 4 * Math.sin(x * 0.06);
// Canyon centre line, easing to x = 0 at Eagle's Perch so the Sky Baobab sits centrally.
export const canyonX = z => lerp(8 * Math.sin(z * 0.03), 0, smooth(-238, -256, z));
export const canyonHalfWidth = z => 13 + 11 * smooth(-244, -256, z);

export function heightAt(x, z) {
  // Gentle rolling savanna base, always above water.
  let h = fbm(x * 0.028 + 3.1, z * 0.028 - 1.7) * 5.2 - 0.6;
  // Village bowl: flattened clearing around the story fire.
  const dv = Math.hypot(x, z - 2);
  h = lerp(0.15 + (fbm(x * 0.12, z * 0.12) - 0.5) * 0.25, h, smooth(32, 50, dv));
  // Outer hills keep the explorer inside the world.
  const ex = Math.max(Math.abs(x) - 92, 0), es = Math.max(z - 58, 0);
  h += ex * ex * 0.07 + es * es * 0.09;
  // River channel.
  const dr = Math.abs(z - riverZ(x));
  if (dr < 12) h = lerp(-4.2, Math.max(h, 0.2), smooth(5.6, 9.6, dr));
  // Harmattan Canyon, Eagle's Perch and the edge of the world.
  const cz = smooth(-140, -158, z);
  if (cz > 0) {
    const dx = Math.abs(x - canyonX(z)), hw = canyonHalfWidth(z);
    const floor = lerp(3 + fbm(x * 0.2, z * 0.2) * 0.7, 8, smooth(-170, -252, z));
    const plateau = smooth(-244, -254, z);
    const floorH = lerp(floor, 8 + fbm(x * 0.3, z * 0.3) * 0.25, plateau);
    const wall = 30 + fbm(x * 0.05, z * 0.05) * 14;
    const w = smooth(hw - 1, hw + 3.5, dx);
    let ch = lerp(floorH, wall, w);
    for (const c of CHASMS) {
      const inside = Math.min(c.a - z, z - c.b);
      if (inside > -1.5) ch = lerp(ch, -46, smooth(-0.6, 0.9, inside) * (1 - w));
    }
    h = lerp(h, ch, cz);
  }
  h = lerp(h, -80, smooth(-287, -296, z));
  return h;
}

// Approximate surface normal for shading and slope tests.
export function slopeAt(x, z, e = 0.6) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z), hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

export function inBounds(x, z) { return x > BOUNDS.minX && x < BOUNDS.maxX && z > BOUNDS.minZ - 140 && z < BOUNDS.maxZ; }

// Main walking route, used for dirt paths, cowry trails and keeping grass off the road.
export const ROUTE = [[0, 16], [0, -40], [0, -52], [0, -73], [4, -96], [7, -128], [7.8, -150]];
export function distToRoute(x, z) {
  let best = Infinity;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1];
    const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  if (z < -150 && z > -250) best = Math.min(best, Math.abs(x - canyonX(z)));
  return best;
}
