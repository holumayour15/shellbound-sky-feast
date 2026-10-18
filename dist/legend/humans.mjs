// Stylised human characters: Amara, Papa Ike, Grandma Adaeze, market women and village kids.
// Built from primitives with procedural hair and cloth textures; animated procedurally.
import * as THREE from 'three';
import { cloth, hair as hairTex, hairBump, featherPrint, thatch } from './textures.mjs';
import { LOOK, lookItem } from './config.mjs';

const BODY = {
  child: { L: 0.56, legR: 0.062, hipX: 0.085, pelvisR: 0.15, torsoR: 0.15, torsoLen: 0.2, shoulderX: 0.2, armR: 0.048, up: 0.21, fore: 0.21, neck: 0.07, headR: 0.26, eye: 0.23, nose: 0.1, headScale: [1, 1.04, 0.97] },
  teen:  { L: 0.72, legR: 0.07, hipX: 0.095, pelvisR: 0.17, torsoR: 0.17, torsoLen: 0.27, shoulderX: 0.23, armR: 0.053, up: 0.27, fore: 0.26, neck: 0.085, headR: 0.235, eye: 0.21, nose: 0.1, headScale: [1, 1.06, 0.97] },
  youth: { L: 0.84, legR: 0.076, hipX: 0.105, pelvisR: 0.19, torsoR: 0.19, torsoLen: 0.33, shoulderX: 0.26, armR: 0.058, up: 0.3, fore: 0.29, neck: 0.1, headR: 0.215, eye: 0.19, nose: 0.11, headScale: [1, 1.1, 0.98] },
  adult: { L: 0.94, legR: 0.082, hipX: 0.115, pelvisR: 0.2, torsoR: 0.21, torsoLen: 0.37, shoulderX: 0.27, armR: 0.063, up: 0.32, fore: 0.31, neck: 0.1, headR: 0.2, eye: 0.18, nose: 0.115, headScale: [1, 1.12, 1] },
  man:   { L: 0.98, legR: 0.095, hipX: 0.13, pelvisR: 0.22, torsoR: 0.25, torsoLen: 0.42, shoulderX: 0.33, armR: 0.075, up: 0.36, fore: 0.35, neck: 0.12, headR: 0.2, eye: 0.21, nose: 0.24, headScale: [1, 1.32, 1.05] },
  woman: { L: 0.86, legR: 0.08, hipX: 0.11, pelvisR: 0.22, torsoR: 0.23, torsoLen: 0.34, shoulderX: 0.27, armR: 0.062, up: 0.3, fore: 0.29, neck: 0.1, headR: 0.19, eye: 0.18, nose: 0.13, headScale: [1, 1.12, 1] },
};

const fluffCache = new Map();
function fluffy(seed = 1) {
  if (fluffCache.has(seed)) return fluffCache.get(seed);
  const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = Math.sin(v.x * 9 + seed) * Math.sin(v.y * 11 + seed * 2) * Math.sin(v.z * 7 + seed * 3);
    const d = 1 + n * 0.07 + Math.sin(v.x * 23 + v.y * 19 + v.z * 29 + seed) * 0.025;
    p.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  g.computeVertexNormals(); fluffCache.set(seed, g); return g;
}
const SPH = new THREE.SphereGeometry(1, 24, 16), CAP = new THREE.CapsuleGeometry(1, 1, 6, 14), CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
const mk = (geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = cast; return m; };
const capsule = (r, len, mat) => { const g = new THREE.CapsuleGeometry(r, len, 6, 14); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };

const MAT = {
  eye: new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.15, clearcoat: 1 }),
  pupil: new THREE.MeshBasicMaterial({ color: '#0d0907' }),
  shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  blush: new THREE.MeshStandardMaterial({ color: '#e0607a', transparent: true, opacity: 0.38, roughness: 1, depthWrite: false }),
  uli: new THREE.MeshBasicMaterial({ color: '#f6efe2' }),
  freckle: new THREE.MeshBasicMaterial({ color: '#3a2014' }),
  glitter: new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffb21e', emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.2 }),
  gold: new THREE.MeshStandardMaterial({ color: '#f1c24b', metalness: 0.85, roughness: 0.25 }),
  coral: new THREE.MeshStandardMaterial({ color: '#e0492e', roughness: 0.28 }),
  sock: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.8 }),
  frame: new THREE.MeshStandardMaterial({ color: '#2a1a12', metalness: 0.4, roughness: 0.3 }),
  wood: new THREE.MeshStandardMaterial({ color: '#7a4a24', roughness: 0.7 }),
  iron: new THREE.MeshStandardMaterial({ color: '#4a4a52', metalness: 0.8, roughness: 0.35 }),
  red: new THREE.MeshStandardMaterial({ color: '#d0303a', roughness: 0.5 }),
  bow: new THREE.MeshStandardMaterial({ color: '#f2bf3a', roughness: 0.45 }),
  white: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.6 }),
};
const FEATHER_COLS = ['#1d1d1f', '#f2c21b', '#7b4a26', '#2fa84f', '#d23a2b', '#2a6fdb'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide }));
const FEATHER = (() => { const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.07, 0.014, 0.42); g.translate(0, 0, -0.36); return g; })();

function fabric({ color, tex, repeat = [2, 1], sheen = 0.5 }) {
  const m = new THREE.MeshPhysicalMaterial({ color: tex ? '#ffffff' : color, roughness: 0.8, sheen, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
  if (tex) { const t = (tex === 'feather' ? featherPrint() : cloth(tex)).clone(); t.repeat.set(...repeat); t.needsUpdate = true; m.map = t; }
  return m;
}
function hairMat(color) {
  const t = hairTex().clone(); t.repeat.set(3, 3); t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color, map: t, bumpMap: hairBump(), bumpScale: 1.4, roughness: 0.95 });
}

/**
 * opts: { kind: 'child'|'man'|'woman', skin, hair, hairColor, acc, top:{color|tex}, bottom:{type,color|tex}, shoes, face, lips,
 *         beard, elder, cane, hammer, backpack, staff, glasses, gele:{color|tex}, scale }
 */
export function makeHuman(o = {}) {
  const young = ['child', 'teen', 'youth', 'adult'].includes(o.kind || 'child');
  // Boys grow a little broader in the shoulders as teenagers and youths.
  const B = o.gender === 'm' && (o.kind === 'teen' || o.kind === 'youth' || o.kind === 'adult') ? { ...BODY[o.kind], shoulderX: BODY[o.kind].shoulderX * 1.1, torsoR: BODY[o.kind].torsoR * 1.08, pelvisR: BODY[o.kind].pelvisR * 0.95, L: BODY[o.kind].L * 1.04 } : BODY[o.kind || 'child'], hr = B.headR;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  if (o.scale) root.scale.setScalar(o.scale);
  const skin = new THREE.MeshStandardMaterial({ color: o.skin || '#653a24', roughness: 0.52 });
  const topMat = fabric(o.top || { color: '#e8687a' });
  const bt = o.bottom || { type: 'overalls', color: '#d29a3c' };
  const botMat = fabric({ ...bt, repeat: [3, 1] });
  const shoeMat = new THREE.MeshStandardMaterial({ color: o.shoes || '#d84a3a', roughness: 0.45, metalness: o.shoes === '#c79bff' ? 0.5 : 0 });
  const hMat = hairMat(o.hairColor || '#17110d');
  const hipY = B.L + 0.04;

  // Legs (pivot at hip).
  const legs = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * B.hipX, hipY, 0);
    const covered = bt.type === 'trousers' || bt.type === 'wrapperLong';
    const leg = capsule(B.legR, B.L * 0.78, covered ? botMat : skin); leg.position.y = -B.L * 0.47; g.add(leg);
    if (young && !covered) g.add(mk(CYL, MAT.sock, 0, -B.L + 0.12, 0, B.legR * 1.08, 0.08, B.legR * 1.08));
    const shoe = mk(SPH, shoeMat, 0, -B.L + B.legR * 0.7, 0.035, B.legR * 1.45, B.legR * 0.95, B.legR * 2.3); g.add(shoe);
    if (young) g.add(mk(SPH, MAT.white, 0, -B.L + B.legR * 0.35, 0.035, B.legR * 1.5, B.legR * 0.35, B.legR * 2.35));
    body.add(g); legs.push(g);
  }
  // Pelvis and lower garment.
  const torsoY = hipY + 0.04 + B.torsoLen / 2 + B.torsoR * 0.6;
  if (bt.type === 'skirt' || bt.type === 'overalls' || bt.type === 'wrapper' || bt.type === 'wrapperLong') {
    const len = bt.type === 'wrapperLong' ? B.L * 0.95 : B.L * 0.45, flare = bt.type === 'wrapperLong' ? 1.35 : 1.75;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(B.pelvisR * 0.95, B.pelvisR * flare, len, 28, 1, true), botMat);
    skirt.position.y = hipY + 0.06 - len / 2; skirt.castShadow = true; body.add(skirt);
  } else {
    body.add(mk(CYL, botMat, 0, hipY - 0.02, 0, B.pelvisR, 0.2, B.pelvisR * 0.9));
    if (bt.type === 'shorts' || bt.type === 'denim') for (const s of [-1, 1]) body.add(mk(CYL, botMat, s * B.hipX, hipY - 0.13, 0, B.legR * 1.35, 0.16, B.legR * 1.35));
  }
  // Torso (with a longer tunic hem for a buba).
  if (o.tunic) { const hem = new THREE.Mesh(new THREE.CylinderGeometry(B.torsoR * 0.95, B.torsoR * 1.3, B.L * 0.3, 24, 1, true), topMat); hem.position.y = hipY + 0.1 - B.L * 0.12; hem.castShadow = true; body.add(hem); }
  const torso = capsule(B.torsoR, B.torsoLen, topMat); torso.position.y = torsoY; torso.scale.z = 0.8; body.add(torso);
  if (bt.type === 'overalls' || bt.type === 'denim') {
    const bib = mk(new THREE.BoxGeometry(1, 1, 1), botMat, 0, torsoY - 0.02, B.torsoR * 0.72, B.torsoR * 1.2, B.torsoLen + 0.08, 0.04); body.add(bib);
    for (const s of [-1, 1]) {
      const strap = mk(new THREE.BoxGeometry(1, 1, 1), botMat, s * B.torsoR * 0.45, torsoY + B.torsoLen * 0.55, 0, 0.04, 0.03, B.torsoR * 1.75); body.add(strap);
      body.add(mk(SPH, MAT.gold, s * B.torsoR * 0.45, torsoY + B.torsoLen * 0.42, B.torsoR * 0.75, 0.022));
    }
    body.add(mk(new THREE.BoxGeometry(1, 1, 1), botMat, 0, hipY + 0.05, B.pelvisR * 0.6, B.pelvisR * 1.6, 0.12, 0.05)); // waistband pocket
  }
  if (o.kind === 'man') { // collar and buttons
    for (const s of [-1, 1]) { const c = mk(new THREE.BoxGeometry(1, 1, 1), topMat, s * 0.08, torsoY + B.torsoLen * 0.55 + B.torsoR * 0.5, B.torsoR * 0.55, 0.12, 0.03, 0.09); c.rotation.z = s * 0.5; body.add(c); }
    for (let i = 0; i < 4; i++) body.add(mk(SPH, MAT.gold, 0, torsoY + 0.18 - i * 0.14, B.torsoR * 0.82, 0.014));
    body.add(mk(SPH, MAT.white, 0, torsoY + B.torsoLen * 0.5 + B.torsoR * 0.4, B.torsoR * 0.55, 0.07, 0.05, 0.03));
  }
  // Arms (pivot at shoulder; elbow child group).
  const shoulderY = torsoY + B.torsoLen / 2 + B.torsoR * 0.55;
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * B.shoulderX, shoulderY, 0);
    const sleeveLong = o.kind === 'man' || o.kind === 'woman';
    const up = capsule(B.armR, B.up, sleeveLong ? topMat : skin); up.position.y = -B.up / 2; sh.add(up);
    if (!sleeveLong) sh.add(mk(CYL, topMat, 0, -B.up * 0.22, 0, B.armR * 1.45, B.up * 0.55, B.armR * 1.45));
    const el = new THREE.Group(); el.position.y = -B.up; sh.add(el);
    const fo = capsule(B.armR * 0.92, B.fore, skin); fo.position.y = -B.fore / 2; el.add(fo);
    if (o.kind === 'man') el.add(mk(CYL, topMat, 0, -0.02, 0, B.armR * 1.35, 0.08, B.armR * 1.35)); // rolled cuff
    const hand = mk(SPH, skin, 0, -B.fore - B.armR * 0.6, 0, B.armR * 1.25); el.add(hand);
    body.add(sh); arms.push({ sh, el, hand });
  }
  // Neck and head.
  body.add(mk(CYL, skin, 0, shoulderY + B.neck / 2, 0, B.armR * 1.2, B.neck + 0.04, B.armR * 1.2));
  const head = new THREE.Group(); head.position.set(0, shoulderY + B.neck + hr * B.headScale[1] * 0.9, 0.01); body.add(head);
  head.add(mk(SPH, skin, 0, 0, 0, hr * B.headScale[0], hr * B.headScale[1], hr * B.headScale[2]));
  for (const s of [-1, 1]) head.add(mk(SPH, skin, s * hr * 0.98, -hr * 0.05, -hr * 0.05, hr * 0.22, hr * 0.32, hr * 0.15));
  const fz = hr * B.headScale[2];
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * hr * 0.37, hr * 0.1 * B.headScale[1], fz * 0.84); head.add(e);
    const er = hr * B.eye;
    e.add(mk(SPH, MAT.eye, 0, 0, 0, er, er * 1.08, er * 0.75, false));
    e.add(mk(SPH, new THREE.MeshStandardMaterial({ color: '#5a3216', roughness: 0.3 }), 0, -er * 0.05, er * 0.5, er * 0.62, er * 0.66, er * 0.35, false));
    e.add(mk(SPH, MAT.pupil, 0, -er * 0.05, er * 0.66, er * 0.34, er * 0.36, er * 0.25, false));
    e.add(mk(SPH, MAT.shine, er * 0.25, er * 0.22, er * 0.78, er * 0.14, er * 0.14, er * 0.1, false));
    eyes.push(e);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(er * 1.05, er * 0.2, 6, 14, Math.PI * 0.8), hMat);
    brow.position.set(s * hr * 0.37, hr * 0.1 * B.headScale[1] + er * 1.1, fz * 0.86); brow.rotation.z = Math.PI * 0.1 + (s < 0 ? 0.05 : -0.05); brow.scale.z = 0.5; head.add(brow);
  }
  // Nose and mouth.
  const nose = mk(SPH, new THREE.MeshStandardMaterial({ color: new THREE.Color(o.skin || '#653a24').offsetHSL(0.01, 0.05, o.kind === 'man' ? 0.06 : 0.03), roughness: 0.45 }), 0, -hr * 0.12, fz * 0.98, hr * B.nose, hr * B.nose * (o.kind === 'man' ? 1.05 : 0.8), hr * B.nose * (o.kind === 'man' ? 1.25 : 0.85));
  head.add(nose);
  const lipMat = new THREE.MeshStandardMaterial({ color: o.lips || '#7a3b33', roughness: o.lips && o.lips !== '#7a3b33' ? 0.2 : 0.6 });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.2, hr * 0.035, 6, 16, Math.PI), lipMat);
  mouth.position.set(0, -hr * 0.42 * B.headScale[1], fz * 0.86); mouth.rotation.z = Math.PI; mouth.scale.z = 0.6; head.add(mouth);
  // Face looks.
  if (o.face === 'blush' || o.face === 'glitter') for (const s of [-1, 1]) head.add(mk(SPH, MAT.blush, s * hr * 0.55, -hr * 0.25, fz * 0.78, hr * 0.16, hr * 0.1, hr * 0.06, false));
  if (o.face === 'freckles') for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1; head.add(mk(SPH, MAT.freckle, s * hr * (0.3 + (i % 5) * 0.06), -hr * (0.12 + (i % 3) * 0.06), fz * 0.92, hr * 0.018, hr * 0.018, hr * 0.01, false)); }
  if (o.face === 'uli') { for (const s of [-1, 1]) for (let i = 0; i < 4; i++) head.add(mk(SPH, MAT.uli, s * hr * (0.28 + i * 0.1), -hr * 0.22 - Math.sin(i) * hr * 0.05, fz * 0.9, hr * 0.028, hr * 0.028, hr * 0.012, false)); for (let i = 0; i < 3; i++) head.add(mk(SPH, MAT.uli, (i - 1) * hr * 0.08, hr * 0.55, fz * 0.83, hr * 0.03, hr * 0.03, hr * 0.012, false)); }
  if (o.face === 'glitter') for (const s of [-1, 1]) { const st = mk(new THREE.OctahedronGeometry(1, 0), MAT.glitter, s * hr * 0.62, hr * 0.02, fz * 0.75, hr * 0.06, hr * 0.06, hr * 0.02, false); head.add(st); }
  // Beard and moustache (Papa).
  if (o.beard) {
    const beard = mk(fluffy(7), hMat, 0, -hr * 0.82, fz * 0.3, hr * 0.92, hr * 0.7, hr * 0.75); head.add(beard);
    const mus = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.28, hr * 0.07, 8, 18, Math.PI), hMat);
    mus.position.set(0, -hr * 0.32, fz * 0.9); mus.scale.z = 0.7; head.add(mus);
    mouth.position.y = -hr * 0.4 * B.headScale[1];
  }
  // Hair.
  const hairG = new THREE.Group(); head.add(hairG);
  const style = o.hair || 'puffs', yTop = hr * B.headScale[1];
  const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hMat);
  cap.scale.set(B.headScale[0], B.headScale[1], B.headScale[2] * 1.02); cap.rotation.x = -0.32; cap.position.y = hr * 0.06; cap.castShadow = true;
  if (style !== 'gele' || young) hairG.add(cap);
  const puffs = [];
  const puff = (x, y, z, r, seed) => { const p = mk(fluffy(seed), hMat, x, y, z, r); hairG.add(p); puffs.push(p); return p; };
  if (style === 'puffs') { puff(-hr * 0.85, yTop * 0.62, -hr * 0.12, hr * 0.62, 1); puff(hr * 0.85, yTop * 0.62, -hr * 0.12, hr * 0.62, 2); }
  if (style === 'afro') puff(0, yTop * 0.55, -hr * 0.62, hr * 1.3, 3);
  if (style === 'highpuff') puff(0, yTop * 1.15, -hr * 0.2, hr * 0.78, 4);
  if (style === 'bantu') for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.4; puff(Math.sin(a) * hr * 0.75, yTop * (0.72 + Math.cos(a) * 0.2), -hr * 0.25 + Math.cos(a) * hr * 0.1, hr * 0.26, 10 + i).scale.y = hr * 0.34; }
  if (style === 'short') puff(0, yTop * 0.78, -hr * 0.12, hr * 1.02, 6).scale.set(hr * 1.02, hr * 0.62, hr * 1.0);
  if (style === 'curlytop') puff(0, yTop * 0.98, -hr * 0.08, hr * 1.05, 5).scale.set(hr * 1.05, hr * 0.85, hr * 0.95);
  if (style === 'lowcut') cap.scale.multiplyScalar(0.985);
  if (style === 'hightop') puff(0, yTop * 0.95, -hr * 0.06, hr, 8).scale.set(hr * 0.98, hr * 0.85, hr * 0.92);
  if (style === 'twists') {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 34; i++) {
      const th = 0.15 + (i % 6) * 0.2, ph = i * 2.39996, n = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      if (n.z > 0.55 && n.y < 0.75) continue; // keep the forehead clear
      const tw = mk(CAP, hMat, n.x * hr * 1.12, n.y * hr * 1.12 * B.headScale[1] + hr * 0.08, n.z * hr * 1.08, hr * 0.06, hr * 0.17, hr * 0.06);
      tw.quaternion.setFromUnitVectors(up, n); hairG.add(tw);
    }
  }
  if (style === 'cornrows') for (let i = 0; i < 7; i++) {
    const row = new THREE.Mesh(new THREE.TorusGeometry(hr * 1.06, hr * 0.045, 6, 28, Math.PI * 0.82), hMat);
    row.rotation.set(0, Math.PI / 2, 0); row.position.set((i - 3) * hr * 0.2, hr * 0.06, -hr * 0.02); row.scale.set(1, B.headScale[1], 1); hairG.add(row);
  }
  if (style === 'filacap') {
    const fm = new THREE.MeshStandardMaterial({ map: cloth('asooke'), roughness: 0.7 });
    const fc = mk(CYL, fm, 0, yTop * 0.82, -hr * 0.05, hr * 0.98, hr * 0.62, hr * 1.0); fc.rotation.z = 0.12; hairG.add(fc);
    const fold = mk(CYL, fm, hr * 0.3, yTop * 1.12, -hr * 0.05, hr * 0.8, hr * 0.28, hr * 0.85); fold.rotation.z = -0.5; hairG.add(fold);
  }
  if (style === 'braids') {
    const beadMats = ['#f2c21b', '#d23a2b', '#2a6fdb', '#ffffff'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }));
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.25 + (i / 15) * Math.PI * 1.5, len = hr * (1.7 + (i % 3) * 0.2);
      const x = Math.sin(a) * hr * 0.98, z = Math.cos(a) * hr * 0.95 - hr * 0.05;
      const b = mk(CYL, hMat, x, -len / 2 + hr * 0.25, z, hr * 0.07, len, hr * 0.07); hairG.add(b);
      hairG.add(mk(SPH, beadMats[i % 4], x, -len + hr * 0.2, z, hr * 0.1));
    }
  }
  if (style === 'gele' || o.gele) {
    const gm = new THREE.MeshPhysicalMaterial({ color: o.gele?.color || '#c43d6d', roughness: 0.35, metalness: 0.2, sheen: 1, sheenColor: new THREE.Color('#fff0c0'), side: THREE.DoubleSide });
    if (o.gele?.tex) { gm.map = cloth(o.gele.tex); gm.color.set('#ffffff'); }
    const band = new THREE.Mesh(new THREE.TorusGeometry(hr * 1.02, hr * 0.32, 10, 28), gm); band.rotation.x = Math.PI / 2 - 0.3; band.position.y = yTop * 0.45; hairG.add(band);
    const fan = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), gm); fan.scale.set(1.15, 0.9, 0.42); fan.rotation.x = -0.7; fan.position.set(0, yTop * 0.7, -hr * 0.4); hairG.add(fan);
    hairG.add(mk(SPH, gm, hr * 0.95, yTop * 0.55, hr * 0.2, hr * 0.3));
  }
  // Hair accessories.
  if (o.acc === 'bow' && (style === 'puffs' || style === 'highpuff' || style === 'afro' || style === 'bantu')) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(hr * 1.02, hr * 0.06, 8, 32, Math.PI * 1.15), MAT.red); band.rotation.set(-0.35, 0, -Math.PI * 0.075); band.position.y = yTop * 0.38; band.scale.z = 0.98; hairG.add(band);
    const bow = new THREE.Group(); bow.position.set(-hr * 0.55, yTop * 0.95, hr * 0.15); bow.rotation.z = 0.4;
    for (const s of [-1, 1]) { const c = mk(new THREE.ConeGeometry(1, 1, 10), MAT.bow, s * hr * 0.14, 0, 0, hr * 0.12, hr * 0.26, hr * 0.06); c.rotation.z = s * Math.PI / 2; bow.add(c); }
    bow.add(mk(SPH, MAT.bow, 0, 0, 0, hr * 0.07)); hairG.add(bow);
  }
  if (o.acc === 'cap') {
    const cm = new THREE.MeshStandardMaterial({ color: '#c8323a', roughness: 0.6 });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cm); crown.position.y = hr * 0.18; crown.scale.y = B.headScale[1] * 0.85; crown.castShadow = true; hairG.add(crown);
    const brim = mk(new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, -Math.PI / 2, Math.PI), cm, 0, hr * 0.2, hr * 0.55, hr * 0.85, hr * 0.06, hr * 1.1); brim.rotation.x = -0.12; hairG.add(brim);
    hairG.add(mk(SPH, MAT.white, 0, hr * 0.62 + hr * 0.18 * B.headScale[1], hr * 0.8, hr * 0.12, hr * 0.12, hr * 0.04));
  }
  if (o.acc === 'strawhat') {
    const sm = new THREE.MeshStandardMaterial({ color: '#e2c27a', roughness: 0.9 }), bandM = new THREE.MeshStandardMaterial({ color: '#c8323a', roughness: 0.7 });
    const top = mk(new THREE.CylinderGeometry(hr * 0.72, hr * 0.85, hr * 0.55, 20), sm, 0, yTop * 0.9 + hr * 0.1, 0); top.castShadow = true; hairG.add(top);
    hairG.add(mk(new THREE.CylinderGeometry(hr * 0.86, hr * 0.86, hr * 0.12, 20), bandM, 0, yTop * 0.9 - hr * 0.08, 0));
    const brim = mk(new THREE.CylinderGeometry(hr * 1.75, hr * 1.8, hr * 0.06, 28), sm, 0, yTop * 0.9 - hr * 0.16, 0); brim.castShadow = true; hairG.add(brim);
  }
  if (o.acc === 'chain') { const ch = new THREE.Mesh(new THREE.TorusGeometry(B.torsoR * 0.72, B.armR * 0.16, 6, 28), MAT.gold); ch.rotation.x = Math.PI / 2 - 0.25; ch.position.set(0, shoulderY - 0.02, B.torsoR * 0.18); body.add(ch); body.add(mk(SPH, MAT.gold, 0, shoulderY - 0.1, B.torsoR * 0.78, B.armR * 0.45)); }
  if (o.acc === 'stars') for (let i = 0; i < 4; i++) hairG.add(mk(new THREE.OctahedronGeometry(1, 0), MAT.glitter, (i - 1.5) * hr * 0.4, yTop * 0.95, hr * 0.35, hr * 0.08, hr * 0.08, hr * 0.03));
  if (o.acc === 'crown') { const cr = new THREE.Group(); cr.position.set(0, yTop * 1.05, -hr * 0.1); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(FEATHER, FEATHER_COLS[i % 6]); f.rotation.set(-1.4, (i / 6 - 0.5) * 2.2, 0); f.scale.setScalar(hr * 2.2); cr.add(f); } hairG.add(cr); }
  if (o.acc === 'beads') for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; body.add(mk(SPH, i % 5 === 0 ? MAT.gold : MAT.coral, Math.cos(a) * B.torsoR * 0.75, shoulderY + 0.01 + Math.sin(a) * 0.015, Math.sin(a) * B.torsoR * 0.62 + 0.02, B.armR * 0.45)); }
  if (o.acc === 'glasses' || o.glasses) for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.TorusGeometry(hr * B.eye * 1.25, hr * 0.022, 6, 18), MAT.frame); f.position.set(s * hr * 0.37, hr * 0.1 * B.headScale[1], fz * 1.02); head.add(f); }

  // Gear.
  const gear = {};
  gear.hand = () => arms[1].hand;
  if (o.backpack) {
    const bp = new THREE.Group(); bp.position.set(0, torsoY + 0.02, -B.torsoR * 0.95);
    const bm = new THREE.MeshStandardMaterial({ map: thatch(), color: '#d8b06a', roughness: 0.95, side: THREE.DoubleSide });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.24, 18, 1, true), bm); basket.castShadow = true; bp.add(basket);
    bp.add(mk(CYL, bm, 0, -0.12, 0, 0.12, 0.02, 0.12));
    const rim = mk(new THREE.TorusGeometry(1, 0.08, 6, 20), MAT.red, 0, 0.12, 0, 0.15, 0.15, 0.15); rim.rotation.x = Math.PI / 2; bp.add(rim);
    const slot = new THREE.Group(); slot.position.set(0, 0.1, 0); bp.add(slot);
    body.add(bp); gear.mbeSlot = slot;
  }
  // The equipped weapon, held in the right hand; its metal shows the age tier.
  const wpn = o.weapon || (o.staff ? { id: 'staff' } : null);
  if (wpn && wpn.id !== 'none') {
    const metal = new THREE.MeshStandardMaterial({ color: wpn.color || '#9a6a3a', metalness: wpn.color && wpn.color !== '#9a6a3a' ? 0.85 : 0.1, roughness: 0.3 });
    const w = new THREE.Group();
    if (wpn.id === 'staff') { w.add(mk(CYL, MAT.wood, 0, 0, 0, 0.022, 1.2, 0.022)); for (const y of [-0.45, 0, 0.45]) w.add(mk(CYL, metal, 0, y, 0, 0.03, 0.04, 0.03)); }
    if (wpn.id === 'spear') { w.add(mk(CYL, MAT.wood, 0, 0.1, 0, 0.02, 1.5, 0.02)); w.add(mk(new THREE.ConeGeometry(1, 1, 4), metal, 0, 0.95, 0, 0.05, 0.28, 0.02)); w.add(mk(CYL, metal, 0, 0.8, 0, 0.028, 0.05, 0.028)); }
    if (wpn.id === 'ida') {
      w.add(mk(CYL, MAT.wood, 0, -0.08, 0, 0.022, 0.18, 0.022)); w.add(mk(new THREE.BoxGeometry(1, 1, 1), metal, 0, 0.02, 0, 0.16, 0.03, 0.04));
      w.add(mk(new THREE.BoxGeometry(1, 1, 1), metal, 0, 0.36, 0, 0.075, 0.62, 0.012)); w.add(mk(new THREE.ConeGeometry(1, 1, 4), metal, 0, 0.74, 0, 0.055, 0.16, 0.008));
    }
    if (wpn.id === 'sling') { w.add(mk(CYL, MAT.wood, 0, 0, 0, 0.018, 0.2, 0.018)); for (const sx of [-1, 1]) { const arm = mk(CYL, MAT.wood, sx * 0.04, 0.15, 0, 0.014, 0.14, 0.014); arm.rotation.z = -sx * 0.45; w.add(arm); } w.add(mk(new THREE.BoxGeometry(1, 1, 1), MAT.red, 0, 0.21, 0, 0.12, 0.012, 0.012)); }
    w.rotation.x = Math.PI / 2; w.position.y = -0.02; arms[1].hand.add(w); gear.weapon = w; gear.weaponId = wpn.id;
    if (wpn.id === 'staff') gear.staff = w;
  }
  if (o.hammer) {
    const hm = new THREE.Group();
    hm.add(mk(CYL, MAT.wood, 0, 0, 0, 0.035, 0.9, 0.035));
    hm.add(mk(new THREE.BoxGeometry(1, 1, 1), MAT.iron, 0, 0.45, 0, 0.3, 0.16, 0.16));
    hm.position.set(0.12, torsoY, -B.torsoR * 0.9); hm.rotation.z = 0.5; body.add(hm); gear.hammer = hm;
  }
  if (o.cane) { const c = mk(CYL, MAT.wood, 0, -B.fore * 1.5, 0.05, 0.022, B.L * 1.1, 0.022); arms[1].el.add(c); }
  // Borrowed-feather wings, shown while gliding.
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * B.torsoR * 0.6, torsoY + 0.05, -B.torsoR * 0.8);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(FEATHER, FEATHER_COLS[i]); f.rotation.y = s * (Math.PI / 2 - 0.2 + i * 0.12); f.rotation.x = (i - 2.5) * 0.08; f.scale.setScalar(0.9 + (young ? 0 : 0.6)); w.add(f); }
    w.visible = false; body.add(w); wings.push(w);
  }

  const st = { phase: Math.random() * 6, blink: 2 + Math.random() * 3, spinA: 0, throwT: 0, flapT: 0 };
  function animate(dt, s) {
    const t = s.t || 0, sp = Math.min(1.3, s.speed || 0), walk = Math.min(1, sp);
    st.phase += dt * (6 + sp * 7) * (sp > 0.05 ? 1 : 0);
    st.blink -= dt; const blinking = st.blink < 0.12; if (st.blink < 0) st.blink = 2.5 + Math.random() * 3;
    for (const e of eyes) e.scale.y = blinking ? 0.12 : 1;
    if (s.throw) st.throwT = 0.35; st.throwT = Math.max(0, st.throwT - dt);
    if (s.flap) st.flapT = 0.45; st.flapT = Math.max(0, st.flapT - dt);
    // Reset pose.
    body.rotation.set(0, 0, 0); body.position.set(0, 0, 0); head.rotation.set(0, 0, 0);

    if (s.ride) {
      // Pedalling: knees up, legs circle, hands on the handlebars.
      body.rotation.x = 0.28; body.position.y = Math.sin(t * 2) * 0.004;
      const pp = st.phase * 1.2;
      legs.forEach((l, i) => l.rotation.set(-1.15 + Math.sin(pp + (i ? Math.PI : 0)) * 0.45, 0, 0));
      arms.forEach((a, i) => { a.sh.rotation.set(-1.25, 0, (i ? 1 : -1) * 0.18); a.el.rotation.set(-0.2, 0, 0); });
      head.rotation.x = -0.2;
    } else if (s.fish || s.cook || s.cheer) {
      legs.forEach(l => l.rotation.set(0, 0, 0)); body.position.y = Math.sin(t * 2.2) * 0.006;
      arms.forEach((a, i) => {
        const side = i ? 1 : -1;
        if (s.cheer) { a.sh.rotation.set(0, 0, side * (2.7 + Math.sin(t * 9 + i) * 0.25)); a.el.rotation.set(0, 0, 0); body.position.y = Math.abs(Math.sin(t * 9)) * 0.07; return; }
        if (s.fish) { const c = s.fish.cast || 0; a.sh.rotation.set(i ? -1.0 - c * 1.6 + (s.fish.tug ? Math.sin(t * 30) * 0.12 : 0) : -0.8, 0, i ? 0.15 : -0.2); a.el.rotation.set(i ? -0.2 : -0.9, 0, 0); return; }
        if (s.cook) { a.sh.rotation.set(i ? -1.1 + Math.sin(t * 6) * 0.25 : -0.4, 0, i ? 0.3 + Math.cos(t * 6) * 0.25 : -0.15); a.el.rotation.set(-0.6, 0, 0); body.rotation.x = 0.15; }
      });
      head.rotation.x = s.fish ? 0.12 : s.cook ? 0.3 : 0;
    } else if (s.spin) { st.spinA += dt * 26; body.rotation.y = st.spinA; arms[1].sh.rotation.set(0, 0, 1.4); arms[0].sh.rotation.set(0, 0, -1.2); arms.forEach(a => a.el.rotation.set(0, 0, 0)); legs.forEach(l => l.rotation.set(0, 0, 0)); }
    else if (s.dance) {
      body.position.y = Math.abs(Math.sin(t * 8)) * 0.06; body.rotation.y = Math.sin(t * 4) * 0.5; head.rotation.z = Math.sin(t * 8) * 0.12;
      arms.forEach((a, i) => { a.sh.rotation.set(0, 0, (i ? 1 : -1) * (2.2 + Math.sin(t * 8 + i * 3) * 0.6)); a.el.rotation.set(0, 0, 0); });
      legs.forEach((l, i) => l.rotation.set(Math.max(0, Math.sin(t * 8 + i * Math.PI)) * -0.6, 0, 0));
    } else {
      const air = !s.grounded;
      legs.forEach((l, i) => { const off = i ? Math.PI : 0; l.rotation.set(air ? (i ? 0.5 : -0.35) : Math.sin(st.phase + off) * 0.75 * walk, 0, 0); });
      arms.forEach((a, i) => {
        const side = i ? 1 : -1;
        let rx = -Math.sin(st.phase + (i ? 0 : Math.PI)) * 0.7 * walk, rz = side * 0.12, ex = -0.25 * walk;
        if (air && !s.gliding) { rx = -0.3; rz = side * (s.vy > 0 ? 2.5 : 1.3); ex = -0.2; }
        if (s.gliding || s.lifted) { rx = 0; rz = side * (s.lifted ? 2.8 : 1.45); ex = 0; }
        let ez = 0;
        if (s.crossArms && sp < 0.05 && s.grounded) { rx = i ? -0.42 : -0.32; rz = side * 0.08; ex = -0.25; ez = -side * 1.5; }
        if (s.wave && i === 1) { rx = 0; rz = 2.6 + Math.sin(t * 10) * 0.3; ex = -0.3; }
        if (s.hammer && i === 1) { rx = -2.6 + Math.min(1, s.hammer) * 2.8; ex = -0.3; }
        if (st.throwT > 0 && i === 1) { rx = -2.8 + (0.35 - st.throwT) * 9; ex = 0; }
        if (s.attack) { const k = s.attack.t, kind = s.attack.kind;
          if (kind === 'slash' && i === 1) { rx = -2.6 + k * 3.4; rz = 0.6 - k * 1.2; ex = 0; }
          if (kind === 'thrust' && i === 1) { rx = -1.6; rz = 0.05; ex = 0; }
          if (kind === 'shoot') { rx = -1.45; rz = i ? 0.05 : -0.25; ex = i ? 0 : -0.4; } }
        if (!s.grounded || sp > 0.05 || s.crossArms || s.attack || st.throwT > 0) a.sh.rotation.set(rx, 0, rz); else a.sh.rotation.set(Math.sin(t * 1.6 + i) * 0.04, 0, rz);
        a.el.rotation.set(ex, 0, ez);
      });
      body.position.y = s.grounded ? Math.abs(Math.sin(st.phase)) * 0.035 * walk + Math.sin(t * 2.2) * 0.006 : 0;
      body.rotation.x = s.gliding ? 0.35 : (o.elder ? 0.1 : 0) + walk * 0.06;
      head.rotation.y = sp < 0.05 && !s.talking ? Math.sin(t * 0.6 + st.phase) * 0.3 : 0;
      head.rotation.x = s.talking ? Math.sin(t * 13) * 0.06 : 0;
    }
    for (const p of puffs) { const k = 1 + Math.sin(t * 9 + p.position.x * 20) * 0.025 * (0.4 + walk); p.scale.y = p.userData.sy ??= p.scale.y; p.scale.y = p.userData.sy * k; }
    const showWings = (s.gliding || st.flapT > 0) && !s.spin;
    wings.forEach((w, i) => { w.visible = showWings; w.rotation.z = (i ? 1 : -1) * (st.flapT > 0 ? Math.sin(st.flapT * 40) * 0.7 : 0.1); });
  }
  return { root, body, head, arms, legs, gear, animate, height: head.position.y + hr };
}

// Convenience builders for the cast.
export function lookToOptions(look, stage = 'child', gender = 'f', weapon = null) {
  const g = slot => lookItem(slot, look[slot]) || LOOK[slot].items[0];
  const bottom = g('bottom'), top = g('top');
  const btype = { overalls: 'overalls', denim: 'denim', wrapper: 'skirt', akwete: 'skirt', bogolan: 'shorts', sokoto: 'trousers', cargo: 'shorts', akwetewrap: 'trousers' }[bottom.id] || 'denim';
  return {
    kind: stage, skin: g('skin').color, hair: g('hair').id, hairColor: g('hairColor').color, acc: g('acc').id,
    top: top.tex ? { tex: top.tex, repeat: [1.5, 1] } : { color: top.color }, bottom: { type: btype, ...(bottom.tex ? { tex: bottom.tex } : { color: bottom.color }) },
    shoes: g('shoes').color, face: g('face').id, lips: g('lips').color, backpack: true, weapon: weapon || { id: 'staff' }, gender, tunic: top.id === 'buba',
    gele: g('hair').id === 'gele' ? { color: '#e0a32e' } : null,
  };
}
export const makeAmara = (look, stage = 'child', gender = 'f', weapon = null) => makeHuman(lookToOptions(look, stage, gender, weapon));
export const makeHeroine = makeAmara;
export const makePapa = () => makeHuman({ kind: 'man', skin: '#5a3420', hair: 'curlytop', hairColor: '#17110d', beard: true, top: { color: '#2c2a26' }, bottom: { type: 'trousers', color: '#6b4a2e' }, shoes: '#3a2416', hammer: true });
export const makeGrandma = () => makeHuman({ kind: 'woman', elder: true, skin: '#6a4029', hair: 'short', hairColor: '#cfc8bd', gele: { tex: 'akwete' }, top: { tex: 'akwete', repeat: [2, 1] }, bottom: { type: 'wrapperLong', tex: 'akwete' }, shoes: '#6b4426', glasses: true, cane: true, acc: 'beads' });
export const makeMamaNkem = () => makeHuman({ kind: 'woman', skin: '#5e3621', hair: 'short', hairColor: '#17110d', gele: { tex: 'ankara' }, top: { tex: 'ankara', repeat: [2, 1] }, bottom: { type: 'wrapperLong', tex: 'ankara' }, shoes: '#9a3a2a' });
export const makeNgozi = () => makeHuman({ kind: 'woman', skin: '#7a4a2e', hair: 'gele', gele: { color: '#2bb5a6' }, top: { tex: 'kente', repeat: [2, 1] }, bottom: { type: 'wrapperLong', tex: 'asooke' }, shoes: '#f2c14e', acc: 'beads' });
export const makeKid = (o = {}) => makeHuman({ kind: 'child', skin: '#5a3420', hair: 'short', hairColor: '#17110d', top: { color: '#3d8f5a' }, bottom: { type: 'shorts', color: '#2f3d6b' }, shoes: '#f1ece2', face: 'clean', ...o });
