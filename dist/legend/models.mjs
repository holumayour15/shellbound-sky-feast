// Procedural characters: tortoise heroes and villagers with swappable fashion, birds, hawks.
import * as THREE from 'three';
import { cloth, shell as shellTex } from './textures.mjs';

const G = {
  shell: new THREE.SphereGeometry(1, 44, 22, 0, Math.PI * 2, 0, Math.PI / 2),
  wrap: new THREE.CylinderGeometry(1.1, 1.05, 0.36, 44, 1, true),
  belly: new THREE.CylinderGeometry(1.0, 0.9, 0.22, 32),
  neck: new THREE.CapsuleGeometry(0.24, 0.35, 4, 10),
  head: new THREE.SphereGeometry(0.44, 28, 18),
  eye: new THREE.SphereGeometry(0.14, 16, 12),
  pupil: new THREE.SphereGeometry(0.075, 12, 10),
  shine: new THREE.SphereGeometry(0.028, 8, 6),
  leg: new THREE.CapsuleGeometry(0.23, 0.3, 4, 10),
  foot: new THREE.SphereGeometry(0.27, 14, 10),
  tail: new THREE.ConeGeometry(0.14, 0.45, 10),
  bead: new THREE.SphereGeometry(0.07, 10, 8),
  feather: (() => { const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.13, 0.025, 0.72); g.translate(0, 0, -0.62); return g; })(),
  ball: new THREE.SphereGeometry(1, 20, 14),
};

const M = {
  eye: new THREE.MeshStandardMaterial({ color: '#fbfbf6', roughness: 0.25 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#16120f', roughness: 0.2 }),
  shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  belly: new THREE.MeshStandardMaterial({ color: '#e8d6a2', roughness: 0.7 }),
  cheek: new THREE.MeshStandardMaterial({ color: '#f08c7a', roughness: 0.8, transparent: true, opacity: 0.55 }),
  white: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.7 }),
  leather: new THREE.MeshStandardMaterial({ color: '#e7d2a8', roughness: 0.6 }),
  coral: new THREE.MeshStandardMaterial({ color: '#e0492e', roughness: 0.28, emissive: '#3a0a02' }),
  gold: new THREE.MeshStandardMaterial({ color: '#f1c24b', roughness: 0.25, metalness: 0.85 }),
  shades: new THREE.MeshStandardMaterial({ color: '#0b0b10', roughness: 0.08, metalness: 0.9 }),
};
const FEATHER_COLS = ['#1d1d1f', '#f2c21b', '#7b4a26', '#2fa84f', '#d23a2b', '#2a6fdb'];
const featherMats = FEATHER_COLS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide }));

const mesh = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; return m; };

function featherFan(n, spread, mats, len = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const f = mesh(G.feather, mats[i % mats.length]);
    f.rotation.y = (i / (n - 1) - 0.5) * spread; f.scale.setScalar(len * (1 - Math.abs(i / (n - 1) - 0.5) * 0.4));
    g.add(f);
  }
  return g;
}

export function makeTortoise(opts = {}) {
  const { skin = '#7f9f5c', elder = false, gender = 'f', jacket = '#d9a441', scale = 1 } = opts;
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body); root.scale.setScalar(scale);
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62 });
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTex('natural'), roughness: 0.48, metalness: 0.05, emissive: '#000000' });
  const wrapMat = new THREE.MeshPhysicalMaterial({ map: cloth('adire'), roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
  wrapMat.map = wrapMat.map.clone(); wrapMat.map.repeat.set(5, 0.6); wrapMat.map.needsUpdate = true;

  const shellMesh = mesh(G.shell, shellMat, 0, 0.62, 0); shellMesh.scale.set(1.05, 0.84, 1.25); body.add(shellMesh);
  const wrap = mesh(G.wrap, wrapMat, 0, 0.66, 0); wrap.scale.z = 1.2; body.add(wrap);
  const belly = mesh(G.belly, M.belly, 0, 0.46, 0); belly.scale.z = 1.2; body.add(belly);

  const head = new THREE.Group(); head.position.set(0, 0.92, 1.22); body.add(head);
  const neck = mesh(G.neck, skinMat, 0, -0.16, -0.12); neck.rotation.x = 1.0; head.add(neck);
  const skull = mesh(G.head, skinMat, 0, 0.12, 0.3); skull.scale.set(1, 0.92, 1.12); head.add(skull);
  for (const s of [-1, 1]) {
    head.add(mesh(G.eye, M.eye, s * 0.19, 0.28, 0.62));
    head.add(mesh(G.pupil, M.pupil, s * 0.2, 0.29, 0.73, false));
    head.add(mesh(G.shine, M.shine, s * 0.17, 0.33, 0.79, false));
    const ch = mesh(G.ball, M.cheek, s * 0.31, 0.06, 0.6, false); ch.scale.set(0.08, 0.05, 0.03); head.add(ch);
  }
  const smile = mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14, Math.PI), M.pupil, 0, 0.06, 0.72, false); smile.rotation.z = Math.PI; head.add(smile);

  const legs = [];
  for (const [x, z] of [[-0.78, 0.92], [0.78, 0.92], [-0.78, -0.88], [0.78, -0.88]]) {
    const g = new THREE.Group(); g.position.set(x, 0.55, z);
    g.add(mesh(G.leg, skinMat, 0, -0.24, 0));
    const f = mesh(G.foot, skinMat, 0, -0.5, 0.06); f.scale.set(1, 0.55, 1.2); g.add(f);
    body.add(g); legs.push(g);
  }
  const tail = mesh(G.tail, skinMat, 0, 0.45, -1.38); tail.rotation.x = -1.9; body.add(tail);

  if (elder) {
    for (const s of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), M.white, s * 0.2, 0.47, 0.66, false); b.rotation.z = s * -0.25; head.add(b); }
    if (gender === 'm') { const beard = mesh(new THREE.ConeGeometry(0.13, 0.34, 10), M.white, 0, -0.18, 0.6); beard.rotation.x = Math.PI; head.add(beard); }
    const cane = new THREE.Group(); cane.position.set(1.05, 0, 1.0);
    cane.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), M.wood, 0, 0.65, 0));
    const crook = mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 12, Math.PI), M.wood, -0.13, 1.3, 0); cane.add(crook);
    body.add(cane);
  }

  // Wings of borrowed feathers, shown when double jumping and gliding.
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.95, 1.05, -0.05);
    const fan = featherFan(6, 1.1, featherMats, 1.25); fan.rotation.y = s * Math.PI / 2; w.add(fan);
    w.visible = false; body.add(w); wings.push(w);
  }

  const slots = { head: new THREE.Group(), neck: new THREE.Group(), face: new THREE.Group(), back: new THREE.Group() };
  slots.head.position.set(0, 0.5, 0.3); head.add(slots.head);
  slots.face.position.set(0, 0.29, 0.78); head.add(slots.face);
  slots.neck.position.set(0, 0.86, 1.05); body.add(slots.neck);
  slots.back.position.set(0, 1.28, -0.35); body.add(slots.back);

  const jacketCol = new THREE.Color(jacket);
  const state = { phase: 0, flap: 0, spinAngle: 0, retract: 0, outfit: null };

  function clear(g) { while (g.children.length) g.remove(g.children[0]); }
  function setOutfit(o) {
    state.outfit = { ...o };
    for (const g of Object.values(slots)) clear(g);
    // Head pieces
    if (o.head === 'gele') {
      const mat = new THREE.MeshPhysicalMaterial({ color: jacketCol, roughness: 0.35, metalness: 0.25, sheen: 1, sheenColor: new THREE.Color('#fff2c0'), side: THREE.DoubleSide });
      const band = mesh(new THREE.TorusGeometry(0.4, 0.13, 10, 28), mat, 0, -0.02, -0.02); band.rotation.x = Math.PI / 2 - 0.25; slots.head.add(band);
      const band2 = mesh(new THREE.TorusGeometry(0.3, 0.12, 10, 24), mat, 0, 0.14, -0.08); band2.rotation.x = Math.PI / 2 - 0.4; slots.head.add(band2);
      const fan = mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.12, -0.25); fan.scale.set(1.15, 0.95, 0.38); fan.rotation.x = -0.75; slots.head.add(fan);
      const knot = mesh(G.ball, mat, 0.36, 0.08, 0.05); knot.scale.setScalar(0.14); slots.head.add(knot);
    } else if (o.head === 'fila') {
      const m2 = new THREE.MeshStandardMaterial({ map: cloth('asooke'), roughness: 0.7 });
      const cap = mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.34, 24), m2, 0, 0.08, -0.04); slots.head.add(cap);
      const flop = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.22, 24), m2, 0.14, 0.27, -0.02); flop.rotation.z = -0.55; slots.head.add(flop);
    } else if (o.head === 'bucket') {
      const pts = [[0.0, 0.32], [0.3, 0.3], [0.36, 0.05], [0.58, -0.04], [0.6, -0.07]].map(([x, y]) => new THREE.Vector2(x, y));
      const m2 = new THREE.MeshStandardMaterial({ map: cloth('ankara'), roughness: 0.8, side: THREE.DoubleSide });
      slots.head.add(mesh(new THREE.LatheGeometry(pts, 28), m2, 0, 0, -0.02));
    } else if (o.head === 'halo') {
      const ring = featherFan(9, 2.6, featherMats, 0.75); ring.rotation.x = -1.2; ring.position.set(0, 0.05, -0.3); slots.head.add(ring);
    }
    // Neck / face / back accessories
    if (o.acc === 'coral') {
      for (const [r, n, y] of [[0.42, 18, 0], [0.5, 22, -0.08]]) for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2; slots.neck.add(mesh(G.bead, i % 6 === 0 ? M.gold : M.coral, Math.cos(a) * r, y + Math.sin(a) * r * 0.25, Math.sin(a) * r * 0.55 + 0.05, false));
      }
    } else if (o.acc === 'shades') {
      for (const s of [-1, 1]) slots.face.add(mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), M.shades, s * 0.2, 0, 0.02, false));
      slots.face.add(mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), M.gold, 0, 0.03, 0.02, false));
    } else if (o.acc === 'drum') {
      const pts = [[0.26, -0.42], [0.2, -0.2], [0.14, 0], [0.2, 0.2], [0.26, 0.42]].map(([x, y]) => new THREE.Vector2(x, y));
      const drum = new THREE.Group(); drum.rotation.z = Math.PI / 2;
      drum.add(mesh(new THREE.LatheGeometry(pts, 20), M.wood));
      for (const y of [-0.43, 0.43]) drum.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 20), M.leather, 0, y, 0));
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const c = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.86, 3), M.leather, Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2, false); drum.add(c); }
      slots.back.add(drum);
    } else if (o.acc === 'cape') {
      const cape = featherFan(9, 1.6, featherMats, 1.1); cape.rotation.x = 0.9; cape.position.set(0, -0.1, -0.2); slots.back.add(cape);
    }
    // Wrap and shell paint
    wrapMat.map = cloth(o.wrap).clone(); wrapMat.map.repeat.set(5, 0.6); wrapMat.map.needsUpdate = true; wrapMat.needsUpdate = true;
    shellMat.map = shellTex(o.shell);
    shellMat.metalness = o.shell === 'gold' ? 0.35 : 0.05;
    shellMat.emissive.set(o.shell === 'star' ? '#2f5cff' : '#000000');
    shellMat.emissiveMap = o.shell === 'star' ? shellMat.map : null;
    shellMat.needsUpdate = true;
  }
  setOutfit(opts.outfit || { head: 'none', wrap: 'adire', shell: 'natural', acc: 'none' });

  function animate(dt, s) {
    const t = s.t || 0, speed = s.speed || 0;
    state.phase += dt * (5 + speed * 9) * (speed > 0.05 ? 1 : 0);
    const walk = Math.min(1, speed);
    const retractTarget = s.spin ? 1 : 0;
    state.retract += (retractTarget - state.retract) * Math.min(1, dt * 18);
    const r = 1 - state.retract * 0.75;
    head.scale.setScalar(r); legs.forEach(l => l.scale.setScalar(Math.max(0.3, r)));
    head.position.z = 1.22 - state.retract * 0.5;
    if (s.spin) { state.spinAngle += dt * 28; body.rotation.y = state.spinAngle; body.position.y = 0.15; }
    else {
      state.spinAngle = 0;
      if (s.dance) {
        body.rotation.y = Math.sin(t * 4) * 0.7; body.position.y = Math.abs(Math.sin(t * 8)) * 0.28;
        body.rotation.z = Math.sin(t * 8) * 0.12; head.rotation.x = Math.sin(t * 8) * 0.2;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i * Math.PI / 2) * 0.8; });
      } else {
        body.rotation.y *= 0.8;
        body.position.y = s.grounded ? Math.abs(Math.sin(state.phase)) * 0.07 * walk + Math.sin(t * 2) * 0.012 : 0.05;
        body.rotation.z = Math.sin(state.phase) * 0.05 * walk;
        body.rotation.x = (elder ? 0.06 : 0) + (s.gliding ? 0.18 : 0);
        head.rotation.y = speed < 0.05 ? Math.sin(t * 0.7) * 0.25 : 0;
        head.rotation.x = s.talking ? Math.sin(t * 14) * 0.06 : 0;
        legs.forEach((l, i) => {
          const off = (i === 0 || i === 3) ? 0 : Math.PI;
          l.rotation.x = s.grounded ? Math.sin(state.phase + off) * 0.75 * walk : (i < 2 ? -0.6 : 0.6);
          l.rotation.z = s.grounded ? 0 : (i % 2 ? -0.4 : 0.4);
        });
      }
    }
    if (s.flap) state.flap = 0.45;
    state.flap = Math.max(0, state.flap - dt);
    const showWings = s.gliding || state.flap > 0;
    wings.forEach((w, i) => {
      w.visible = showWings && !s.spin;
      const side = i ? 1 : -1;
      const flapA = state.flap > 0 ? Math.sin(state.flap * 40) * 0.8 : Math.sin(t * 6) * 0.12;
      w.rotation.z = side * (0.25 + flapA);
      w.scale.setScalar(showWings ? 1 : 0.01);
    });
  }
  return { root, body, head, legs, wings, shellMat, wrapMat, setOutfit, animate, state };
}

export function makeBird(o = {}) {
  const { body = '#f2c21b', wing = '#c99a12', belly = '#fff1a8', beak = '#33240f', size = 1, hornbill = false, crest = null, eye = '#16120f', glow = null } = o;
  const root = new THREE.Group(); root.scale.setScalar(size);
  const bm = new THREE.MeshStandardMaterial({ color: body, roughness: 0.6, emissive: glow || '#000', emissiveIntensity: glow ? 0.6 : 0 });
  const wm = new THREE.MeshStandardMaterial({ color: wing, roughness: 0.6, emissive: glow || '#000', emissiveIntensity: glow ? 0.4 : 0 });
  const blm = new THREE.MeshStandardMaterial({ color: belly, roughness: 0.7 });
  const bkm = new THREE.MeshStandardMaterial({ color: beak, roughness: 0.4 });
  const torso = mesh(G.ball, bm, 0, 0.75, 0); torso.scale.set(0.42, 0.4, 0.58); root.add(torso);
  const chest = mesh(G.ball, blm, 0, 0.68, 0.18); chest.scale.set(0.34, 0.32, 0.38); root.add(chest);
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.38); root.add(head);
  const hd = mesh(G.ball, bm, 0, 0, 0); hd.scale.setScalar(0.27); head.add(hd);
  for (const s of [-1, 1]) {
    const e = mesh(G.ball, glow ? new THREE.MeshBasicMaterial({ color: '#ff5a3c' }) : M.eye, s * 0.15, 0.06, 0.15, false); e.scale.setScalar(0.07); head.add(e);
    const p = mesh(G.ball, glow ? new THREE.MeshBasicMaterial({ color: '#ffd23f' }) : new THREE.MeshStandardMaterial({ color: eye }), s * 0.17, 0.06, 0.19, false); p.scale.setScalar(0.035); head.add(p);
  }
  if (hornbill) {
    const b1 = mesh(new THREE.ConeGeometry(0.13, 0.75, 12), bkm, 0, -0.06, 0.55); b1.rotation.x = Math.PI / 2 + 0.25; head.add(b1);
    const cq = mesh(G.ball, new THREE.MeshStandardMaterial({ color: '#f28a1a', roughness: 0.35 }), 0, 0.14, 0.38); cq.scale.set(0.1, 0.12, 0.3); head.add(cq);
  } else {
    const b1 = mesh(new THREE.ConeGeometry(0.07, 0.26, 10), bkm, 0, -0.02, 0.33); b1.rotation.x = Math.PI / 2 + (glow ? 0.5 : 0.1); head.add(b1);
  }
  if (crest) { const c = featherFan(4, 0.6, [new THREE.MeshStandardMaterial({ color: crest, side: THREE.DoubleSide })], 0.45); c.rotation.x = -2.2; c.position.set(0, 0.2, -0.05); head.add(c); }
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.36, 0.86, 0);
    const wm2 = mesh(G.ball, wm, s * 0.3, 0, -0.05); wm2.scale.set(0.42, 0.06, 0.34); w.add(wm2);
    root.add(w); wings.push(w);
  }
  const tail = featherFan(3, 0.5, [wm], 0.6); tail.position.set(0, 0.78, -0.45); tail.rotation.x = 0.35; tail.rotation.y = Math.PI; root.add(tail);
  for (const s of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), bkm, s * 0.14, 0.25, 0.05, false));
  let flapT = 0;
  function animate(dt, t, flying = false, talking = false) {
    flapT += dt;
    const a = flying ? Math.sin(t * 16) * 0.9 : (Math.sin(t * 0.8) > 0.97 ? Math.sin(t * 30) * 0.6 : 0.12);
    wings[0].rotation.z = -a; wings[1].rotation.z = a;
    head.rotation.y = talking ? Math.sin(t * 3) * 0.3 : Math.sin(t * 0.6) * 0.5;
    head.rotation.x = talking ? Math.sin(t * 12) * 0.12 : 0;
    root.children[0].position.y = 0.75 + (flying ? 0 : Math.sin(t * 2) * 0.02);
  }
  return { root, head, wings, animate, bodyMat: bm };
}

export function makeHawk() {
  return makeBird({ body: '#2a1c45', wing: '#160f2a', belly: '#4a2f6e', beak: '#d4a73c', size: 1.5, glow: '#7a3cff', crest: '#9b6bff' });
}
