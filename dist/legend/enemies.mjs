// Enemies: thorn beetles, Harmattan dust devils, shadow hawks, and the Shade of All-of-You.
import * as THREE from 'three';
import { heightAt } from './terrain.mjs';
import * as L from './layout.mjs';
import { makeHawk, makeTortoise } from './models.mjs';
import { softDot } from './textures.mjs';

const m = (g, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); o.castShadow = true; return o; };

function beetleMesh() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = new THREE.MeshPhysicalMaterial({ color: '#1e5a3a', metalness: 0.6, roughness: 0.25, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141214', roughness: 0.5 });
  const sh = m(new THREE.SphereGeometry(0.75, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.35, 0); sh.scale.set(1, 0.8, 1.3); body.add(sh);
  body.add(m(new THREE.SphereGeometry(0.34, 12, 10), dark, 0, 0.45, 0.95));
  const horn = m(new THREE.ConeGeometry(0.1, 0.6, 8), dark, 0, 0.72, 1.15); horn.rotation.x = 0.7; body.add(horn);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#ff3b1f' });
  for (const s of [-1, 1]) body.add(m(new THREE.SphereGeometry(0.07, 8, 6), eyeM, s * 0.18, 0.55, 1.22));
  const legs = [];
  for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, z = (Math.floor(i / 2) - 1) * 0.45; const l = m(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), dark, s * 0.75, 0.25, z); l.rotation.z = s * 1.1; body.add(l); legs.push(l); }
  return { g, body, legs };
}

function greedMesh() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shade = new THREE.MeshStandardMaterial({ color: '#2a1440', emissive: '#6a2bb0', emissiveIntensity: 0.6, roughness: 0.4, transparent: true, opacity: 0.92 });
  const b = m(new THREE.SphereGeometry(0.42, 18, 14), shade, 0, 0.75, 0); b.scale.set(1, 1.1, 0.95); body.add(b);
  const tail = m(new THREE.ConeGeometry(0.3, 0.7, 12), shade, 0, 0.3, -0.05); tail.rotation.x = Math.PI; body.add(tail);
  for (const s of [-1, 1]) {
    const ear = m(new THREE.ConeGeometry(0.1, 0.35, 8), shade, s * 0.25, 1.15, 0); ear.rotation.z = -s * 0.5; body.add(ear);
    body.add(m(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), s * 0.15, 0.85, 0.33));
    body.add(m(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#1a0a00' }), s * 0.15, 0.85, 0.43));
    const arm = m(new THREE.CapsuleGeometry(0.06, 0.25, 4, 8), shade, s * 0.42, 0.65, 0.05); arm.rotation.z = s * 0.7; body.add(arm);
  }
  const grin = m(new THREE.TorusGeometry(0.13, 0.025, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), 0, 0.66, 0.38); grin.rotation.z = Math.PI; body.add(grin);
  const sack = m(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.9 }), 0, 0.55, -0.4); sack.visible = false; body.add(sack);
  return { g, body, shade, sack };
}

function devilMesh() {
  const g = new THREE.Group();
  const n = 260, geo = new THREE.BufferGeometry(), a = new Float32Array(n * 3), seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = Math.random(); seeds[i] = Math.random() * 6.28; a.set([0, h * 6, 0], i * 3); }
  geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const pm = new THREE.PointsMaterial({ size: 0.55, map: softDot('230,170,110'), color: '#e0a36a', transparent: true, depthWrite: false, opacity: 0.85 });
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; g.add(pts);
  const coneMat = new THREE.MeshStandardMaterial({ color: '#d79a5c', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 20, 1, true), coneMat); cone.rotation.x = Math.PI; cone.position.y = 3; g.add(cone);
  return { g, pts, pm, cone, coneMat, seeds };
}

// Harmattan Brute: a horned beast that scrapes the ground, then charges in a straight line.
function bruteMesh() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const hide = new THREE.MeshStandardMaterial({ color: '#5a2a1e', roughness: 0.85 }), horn = new THREE.MeshStandardMaterial({ color: '#efe1c4', roughness: 0.4 });
  const eyeM = new THREE.MeshBasicMaterial({ color: '#ff4a1a' });
  const torso = m(new THREE.SphereGeometry(1, 20, 14), hide, 0, 1.0, 0); torso.scale.set(0.8, 0.75, 1.25); body.add(torso);
  const hump = m(new THREE.SphereGeometry(0.6, 14, 10), hide, 0, 1.55, -0.2); hump.scale.set(1, 0.7, 1.2); body.add(hump);
  const head = new THREE.Group(); head.position.set(0, 1.05, 1.25); body.add(head);
  head.add(m(new THREE.SphereGeometry(0.45, 14, 10), hide)).scale.set(1, 0.9, 1.1);
  for (const s of [-1, 1]) {
    const hn = m(new THREE.ConeGeometry(0.11, 0.7, 8), horn, s * 0.32, 0.3, 0.1); hn.rotation.set(-0.5, 0, -s * 0.9); head.add(hn);
    head.add(m(new THREE.SphereGeometry(0.07, 8, 6), eyeM, s * 0.2, 0.12, 0.38));
  }
  head.add(m(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#2a1410' }), 0, -0.12, 0.42)).scale.set(1, 0.7, 0.8);
  const legs = [];
  for (const [x, z] of [[-0.45, 0.7], [0.45, 0.7], [-0.45, -0.75], [0.45, -0.75]]) { const l = m(new THREE.CylinderGeometry(0.13, 0.1, 0.8, 8), hide, x, 0.4, z); body.add(l); legs.push(l); }
  const glow = m(new THREE.SphereGeometry(1.5, 16, 10), new THREE.MeshBasicMaterial({ color: '#ff3b1f', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 1, 0.3, false); body.add(glow);
  g.scale.setScalar(1.25);
  return { g, body, head, legs, glow, eyeM };
}
// Night Wisp: a floating fire spirit seen only in Story-time.
function wispMesh() {
  const g = new THREE.Group();
  const coreM = new THREE.MeshStandardMaterial({ color: '#7fe9ff', emissive: '#2fb6ff', emissiveIntensity: 2.2, transparent: true });
  const core = m(new THREE.SphereGeometry(0.32, 16, 12), coreM, 0, 0, 0, false); g.add(core);
  const flame = m(new THREE.ConeGeometry(0.3, 0.9, 12), new THREE.MeshBasicMaterial({ color: '#b48cff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.45, 0, false); g.add(flame);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('120,220,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); halo.scale.setScalar(2.2); g.add(halo);
  for (const s of [-1, 1]) g.add(m(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#1a0f2e' }), s * 0.1, 0.05, 0.28, false));
  return { g, core, coreM, flame, halo };
}

// Shadow hyena: a Story-time spirit that hunts in packs — it circles, then lunges. Invisible and harmless in Now.
function hyenaMesh() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: '#2a1e4a', emissive: '#3b1d7a', emissiveIntensity: 0.6, roughness: 0.7, transparent: true });
  const mane = new THREE.MeshStandardMaterial({ color: '#7fe9ff', emissive: '#4fb8ff', emissiveIntensity: 1.4, transparent: true });
  const eyeM = new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true });
  const torso = m(new THREE.SphereGeometry(0.5, 16, 12), fur, 0, 0.75, 0); torso.scale.set(0.75, 0.8, 1.4); body.add(torso);
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.72); body.add(head);
  head.add(m(new THREE.SphereGeometry(0.28, 14, 10), fur));
  const snout = m(new THREE.ConeGeometry(0.15, 0.4, 10), fur, 0, -0.05, 0.3); snout.rotation.x = Math.PI / 2; head.add(snout);
  for (const sx of [-1, 1]) { head.add(m(new THREE.SphereGeometry(0.05, 8, 6), eyeM, sx * 0.12, 0.08, 0.2, 1, 1, 1, false)); const ear = m(new THREE.ConeGeometry(0.08, 0.22, 6), fur, sx * 0.15, 0.25, -0.05); head.add(ear); }
  for (let i = 0; i < 6; i++) { const sp = m(new THREE.ConeGeometry(0.07, 0.3, 5), mane, 0, 1.12 - i * 0.03, 0.45 - i * 0.18, 1, 1, 1, false); sp.rotation.x = -0.4; body.add(sp); }
  const tail = m(new THREE.ConeGeometry(0.08, 0.5, 6), mane, 0, 0.85, -0.75, 1, 1, 1, false); tail.rotation.x = -2.2; body.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.45], [0.2, -0.45]]) { const l = m(new THREE.CylinderGeometry(0.07, 0.05, 0.6, 6), fur, x, 0.3, z); body.add(l); legs.push(l); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('140,90,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 })); glow.scale.setScalar(2.4); glow.position.y = 0.8; g.add(glow);
  const mats = [fur, mane, eyeM, glow.material];
  return { g, body, head, legs, mats, base: mats.map(mt => mt.opacity) };
}
// Fixed Story-time packs, so the spirit world always has something to fight.
const HYENA_PACKS = [[-20, -84], [26, -108], [-34, -128], [12, -143]];

export function createEnemies(scene, diff) {
  const list = [], shots = [];
  let spd = diff.enemySpeed, hpMul = diff.enemySpeed > 1.2 ? 1.6 : diff.enemySpeed > 1.05 ? 1.3 : 1;
  const shotGeo = new THREE.SphereGeometry(0.28, 12, 10), shotMat = new THREE.MeshStandardMaterial({ color: '#b48cff', emissive: '#7fe9ff', emissiveIntensity: 2 });
  const make = {
    beetle: (x, z, r = 5) => { const v = beetleMesh(); scene.add(v.g); return { kind: 'beetle', home: { x, z }, r, x, z, y: heightAt(x, z), a: Math.random() * 6, face: 0, stun: 0, hp: 1, reward: 2, v, layer: 'both' }; },
    devil: (x, z) => { const v = devilMesh(); scene.add(v.g); return { kind: 'devil', home: { x, z }, x, z, y: heightAt(x, z), a: Math.random() * 6, calm: 0, scatter: 0, v, layer: 'now' }; },
    greed: (x, z) => { const v = greedMesh(); scene.add(v.g); return { kind: 'greed', home: { x, z }, x, z, y: heightAt(x, z), a: Math.random() * 6, stun: 0, flee: 0, loot: 0, hp: 1, reward: 4, v, layer: 'both' }; },
    brute: (x, z) => { const v = bruteMesh(); scene.add(v.g); const hp = Math.round(3 * hpMul); return { kind: 'brute', home: { x, z }, x, z, y: heightAt(x, z), a: Math.random() * 6, face: 0, stun: 0, hp, maxHp: hp, reward: 8, state: 'roam', t: 0, cx: 0, cz: 0, v, layer: 'both' }; },
    hyena: (x, z) => { const v = hyenaMesh(); scene.add(v.g); const hp = Math.round(2 * hpMul); return { kind: 'hyena', home: { x, z }, x, z, y: heightAt(x, z), a: Math.random() * 6, face: 0, stun: 0, hp, maxHp: hp, reward: 5, state: 'prowl', t: Math.random() * 2, v, layer: 'story' }; },
    wisp: (x, z) => { const v = wispMesh(); scene.add(v.g); return { kind: 'wisp', home: { x, z }, x, z, y: heightAt(x, z) + 2.2, a: Math.random() * 6, stun: 0, hp: 1, reward: 3, shootT: 2, v, layer: 'story' }; },
  };
  const add = (e, id) => { e.id = id; e.dead = false; list.push(e); (e.v.g || e.v.root).position.set(e.x, e.y, e.z); return e; };
  for (const b of L.BEETLES) add(make.beetle(b.x, b.z, b.r), b.id);
  for (const d of L.DEVILS) add(make.devil(d.x, d.z), d.id);
  const hawk = (h) => {
    const v = makeHawk(); scene.add(v.root);
    const mats = []; v.root.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    return { kind: 'hawk', id: h.id, quest: h.quest, home: h, x: h.x, z: h.z, y: heightAt(h.x, h.z) + 9, a: Math.random() * 6, state: 'circle', t: 0, tx: 0, ty: 0, tz: 0, stun: 0, hp: 1, dead: false, active: !h.quest, v, mats, layer: 'story' };
  };
  for (const h of L.HAWKS) add(hawk(h), h.id);
  for (const h of L.QUEST_HAWKS) { const e = add(hawk(h), h.id); e.v.root.visible = false; }
  for (const gr of L.GREEDLINGS) add(make.greed(gr.x, gr.z), gr.id);
  HYENA_PACKS.forEach(([x, z], i) => { for (let k = 0; k < 2; k++) add(make.hyena(x + k * 2.5, z + k), `hy${i}_${k}`); });
  let spawnId = 0;

  function kill(e, ctx, src = 'hero') { e.dead = true; e.deadT = 0; (e.v.g || e.v.root).visible = false; ctx.defeat(e, (e.reward || 2) + (e.loot || 0), src); }
  // Damage with a short per-enemy cooldown so one swing counts once. Returns true if it landed.
  function damage(e, dmg, ctx, fromX, fromZ, src = 'hero') {
    if (e.dead || (e.hitCd || 0) > 0) return false;
    e.hitCd = 0.35; e.hp = (e.hp ?? 1) - dmg; e.flash = 0.25;
    if (e.hp <= 0) { kill(e, ctx, src); return true; }
    e.stun = Math.max(e.stun || 0, e.kind === 'brute' ? 0.7 : 1.5);
    if (e.kind === 'brute' && e.state === 'charge') { e.state = 'tired'; e.t = 0; }
    if (fromX != null) { const d = Math.hypot(e.x - fromX, e.z - fromZ) || 1; e.x += (e.x - fromX) / d * 1.4; e.z += (e.z - fromZ) / d * 1.4; }
    ctx.fx('hit', e); return true;
  }

  function update(dt, t, ctx) {
    const p = ctx.player, weave = ctx.weave, story = weave > 0.5, atk = ctx.attackDmg || 1;
    for (const e of list) {
      if (e.dead) { e.deadT = (e.deadT || 0) + dt; continue; }
      e.hitCd = Math.max(0, (e.hitCd || 0) - dt); e.flash = Math.max(0, (e.flash || 0) - dt);
      const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
      if (dist > 90) continue; // sleep far away
      const dy = p.y - e.y;
      if (e.kind === 'beetle') {
        e.stun = Math.max(0, e.stun - dt);
        if (e.stun <= 0) {
          const leash = Math.hypot(e.x - e.home.x, e.z - e.home.z);
          let tx, tz, s;
          if (dist < 9 && leash < e.r + 7 && Math.abs(dy) < 3) { tx = p.x; tz = p.z; s = 4.6 * spd; }
          else { e.a += dt * 0.5 * spd; tx = e.home.x + Math.cos(e.a) * e.r; tz = e.home.z + Math.sin(e.a) * e.r; s = 2.6 * spd; }
          const mx = tx - e.x, mz = tz - e.z, ml = Math.hypot(mx, mz) || 1;
          e.x += mx / ml * s * dt; e.z += mz / ml * s * dt; e.face = Math.atan2(mx, mz);
        }
        e.y = heightAt(e.x, e.z);
        e.v.g.position.set(e.x, e.y, e.z); e.v.g.rotation.y = e.face;
        e.v.body.rotation.z = e.stun > 0 ? Math.PI : 0; e.v.body.position.y = e.stun > 0 ? 0.6 : 0;
        e.v.legs.forEach((l, i) => { l.rotation.x = e.stun > 0 ? Math.sin(t * 20 + i) * 0.6 : Math.sin(t * 14 + i * 2) * 0.4; });
        if (dist < 1.6 && dy < 1.6 && dy > -1) {
          if (p.vy < -2 && dy > 0.5) { e.stun = 4; ctx.bounce(); ctx.fx('stomp', e); }
          else if (p.spin > 0) damage(e, atk, ctx, p.x, p.z);
          else if (e.stun > 0) damage(e, 99, ctx, p.x, p.z);
          else ctx.hurt(e.x, e.z, 1, 12, e);
        }
      } else if (e.kind === 'devil') {
        e.scatter = Math.max(0, e.scatter - dt);
        e.calm += ((story || e.scatter > 0 ? 1 : 0) - e.calm) * Math.min(1, dt * 3);
        e.a += dt * 0.6 * spd;
        e.x = e.home.x + Math.sin(e.a) * 7; e.z = e.home.z + Math.sin(e.a * 2) * 4;
        e.y = heightAt(e.x, e.z);
        e.v.g.position.set(e.x, e.y, e.z);
        const pa = e.v.pts.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const h = (pa.array[i * 3 + 1] + dt * 2.5) % 6, r = 0.3 + h * 0.32, ang = e.v.seeds[i] + t * (5 - h * 0.4);
          pa.array[i * 3] = Math.cos(ang) * r; pa.array[i * 3 + 1] = h; pa.array[i * 3 + 2] = Math.sin(ang) * r;
        }
        pa.needsUpdate = true;
        e.v.cone.rotation.y = t * 4;
        const s = 1 - e.calm * 0.8; e.v.g.scale.set(s, 1 - e.calm * 0.7, s);
        e.v.pm.opacity = 0.85 * (1 - e.calm * 0.75); e.v.coneMat.opacity = 0.22 * (1 - e.calm);
        if (e.calm < 0.5 && dist < 2.4 && dy < 5) ctx.hurt(e.x, e.z, 1, 17, e);
      } else if (e.kind === 'greed') {
        e.stun = Math.max(0, e.stun - dt); e.flee = Math.max(0, e.flee - dt);
        if (e.stun <= 0) {
          let tx, tz, sp;
          const leash = Math.hypot(e.x - e.home.x, e.z - e.home.z);
          if (e.flee > 0) { tx = e.x - dx; tz = e.z - dz; sp = 6.5 * spd; }
          else if (dist < 11 && leash < 16 && Math.abs(dy) < 3) { tx = p.x; tz = p.z; sp = 5.2 * spd; }
          else { e.a += dt * 0.7; tx = e.home.x + Math.cos(e.a) * 4; tz = e.home.z + Math.sin(e.a * 1.3) * 4; sp = 2.4; }
          const mx = tx - e.x, mz = tz - e.z, ml = Math.hypot(mx, mz) || 1;
          e.x += mx / ml * sp * dt; e.z += mz / ml * sp * dt; e.face = Math.atan2(mx, mz);
        }
        e.y = heightAt(e.x, e.z);
        e.v.g.position.set(e.x, e.y + (e.stun > 0 ? 0 : 0.25 + Math.sin(t * 5 + e.a) * 0.12), e.z);
        e.v.g.rotation.y = e.face || 0; e.v.body.rotation.z = e.stun > 0 ? Math.sin(t * 20) * 0.3 : 0;
        e.v.sack.visible = e.loot > 0;
        if (dist < 1.4 && dy < 1.8 && dy > -1) {
          if (p.vy < -2 && dy > 0.6) { e.stun = 3; ctx.bounce(); ctx.fx('stomp', e); }
          else if (p.spin > 0 || e.stun > 0) damage(e, Math.max(atk, e.stun > 0 ? 99 : atk), ctx, p.x, p.z);
          else if (e.flee <= 0) { e.loot += ctx.steal(e); e.flee = 3.5; }
        }
      } else if (e.kind === 'brute') {
        e.stun = Math.max(0, e.stun - dt); e.t += dt;
        const charging = e.state === 'charge';
        if (e.stun <= 0) {
          if (e.state === 'roam') {
            e.a += dt * 0.35; const tx = e.home.x + Math.cos(e.a) * 7, tz = e.home.z + Math.sin(e.a) * 7, mx = tx - e.x, mz = tz - e.z, ml = Math.hypot(mx, mz) || 1;
            e.x += mx / ml * 1.8 * dt; e.z += mz / ml * 1.8 * dt; e.face = Math.atan2(mx, mz);
            if (dist < 15 && Math.abs(dy) < 3 && e.t > 1.5) { e.state = 'warn'; e.t = 0; ctx.fx('roar', e); }
          } else if (e.state === 'warn') {
            e.face = Math.atan2(dx, dz);
            if (e.t > 0.9 / spd) { e.state = 'charge'; e.t = 0; const d = dist || 1; e.cx = dx / d; e.cz = dz / d; }
          } else if (charging) {
            const nx = e.x + e.cx * 15 * spd * dt, nz = e.z + e.cz * 15 * spd * dt;
            if (heightAt(nx, nz) - e.y > 1 || e.t > 1.2) { e.state = 'tired'; e.t = 0; }
            else { e.x = nx; e.z = nz; }
          } else if (e.state === 'tired' && e.t > 1.6) { e.state = 'roam'; e.t = 0; }
        }
        e.y = heightAt(e.x, e.z);
        e.v.g.position.set(e.x, e.y, e.z); e.v.g.rotation.y = e.face;
        const k = e.state === 'warn' ? Math.sin(t * 30) * 0.06 : 0;
        e.v.body.rotation.x = e.state === 'charge' ? 0.15 : e.state === 'tired' ? -0.1 : k;
        e.v.body.rotation.z = e.stun > 0 ? Math.sin(t * 25) * 0.08 : 0;
        e.v.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * (charging ? 22 : e.state === 'warn' ? 30 : 6) + i * 1.7) * (charging ? 0.7 : 0.25); });
        e.v.glow.material.opacity = (e.state === 'warn' ? 0.25 + Math.sin(t * 20) * 0.15 : 0) + e.flash * 1.2;
        e.v.eyeM.color.set(e.state === 'tired' ? '#ffd35a' : '#ff4a1a');
        if (dist < 2.3 && dy < 2.2 && dy > -1) {
          if (p.spin > 0) damage(e, atk, ctx, p.x, p.z);
          else if (charging) { ctx.hurt(e.x, e.z, 1, 20, e); e.state = 'tired'; e.t = 0; }
          else if (e.state !== 'tired' && e.stun <= 0) ctx.hurt(e.x, e.z, 1, 10, e);
        }
      } else if (e.kind === 'hyena') {
        const vis = weave; e.v.g.visible = vis > 0.05; e.v.mats.forEach((mt, k) => { mt.opacity = e.v.base[k] * vis; });
        e.stun = Math.max(0, e.stun - dt); e.t += dt;
        if (story && e.stun <= 0) {
          const hunting = dist < 18 && Math.abs(dy) < 3;
          if (!hunting) { e.state = 'prowl'; e.a += dt * 0.5; const tx = e.home.x + Math.cos(e.a) * 5, tz = e.home.z + Math.sin(e.a) * 5, mx = tx - e.x, mz = tz - e.z, ml = Math.hypot(mx, mz) || 1; e.x += mx / ml * 2.2 * dt; e.z += mz / ml * 2.2 * dt; e.face = Math.atan2(mx, mz); }
          else if (e.state === 'lunge') {
            const s = 13 * spd * dt; e.x += e.cx * s; e.z += e.cz * s; e.face = Math.atan2(e.cx, e.cz);
            if (e.t > 0.45) { e.state = 'circle'; e.t = 0; }
          } else {
            // Circle the hero, then lunge from the side.
            e.state = 'circle'; e.a += dt * 1.6 * spd;
            const tx = p.x + Math.cos(e.a) * 4.2, tz = p.z + Math.sin(e.a) * 4.2, mx = tx - e.x, mz = tz - e.z, ml = Math.hypot(mx, mz) || 1;
            e.x += mx / ml * Math.min(ml * 3, 7 * spd) * dt; e.z += mz / ml * Math.min(ml * 3, 7 * spd) * dt; e.face = Math.atan2(dx, dz);
            if (e.t > 1.8 / spd + (e.id.length % 3) * 0.4) { e.state = 'lunge'; e.t = 0; const d = dist || 1; e.cx = dx / d; e.cz = dz / d; ctx.fx('howl', e); }
          }
        }
        e.y = heightAt(e.x, e.z);
        e.v.g.position.set(e.x, e.y, e.z); e.v.g.rotation.y = e.face;
        const run = e.state === 'lunge' ? 26 : story && e.stun <= 0 ? 14 : 0;
        e.v.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * run + i * 1.6) * (run ? 0.7 : 0); });
        e.v.body.rotation.z = e.stun > 0 ? Math.sin(t * 20) * 0.25 : 0; e.v.body.rotation.x = e.state === 'lunge' ? 0.2 : 0;
        if (story && dist < 1.8 && Math.abs(dy) < 1.8) {
          if (p.spin > 0) damage(e, atk, ctx, p.x, p.z);
          else if (p.vy < -2 && dy > 0.6) { e.stun = 2.5; ctx.bounce(); ctx.fx('stomp', e); }
          else if (e.state === 'lunge' && e.stun <= 0) { ctx.hurt(e.x, e.z, 1, 12, e); e.state = 'circle'; e.t = 0; }
        }
      } else if (e.kind === 'wisp') {
        const vis = weave; e.v.g.visible = vis > 0.05; e.v.coreM.opacity = vis; e.v.halo.material.opacity = 0.8 * vis;
        e.stun = Math.max(0, e.stun - dt); e.a += dt * 0.6;
        const keep = story && dist < 16 ? 8 : 0;
        let tx = e.home.x + Math.cos(e.a) * 5, tz = e.home.z + Math.sin(e.a) * 5;
        if (keep) { const d = dist || 1; tx = p.x - dx / d * keep + Math.cos(e.a * 2) * 2; tz = p.z - dz / d * keep + Math.sin(e.a * 2) * 2; }
        if (e.stun <= 0) { e.x += (tx - e.x) * Math.min(1, dt * 1.2); e.z += (tz - e.z) * Math.min(1, dt * 1.2); }
        e.y += (heightAt(e.x, e.z) + (e.stun > 0 ? 0.6 : 2.2 + Math.sin(t * 2 + e.a) * 0.3) - e.y) * Math.min(1, dt * 3);
        e.v.g.position.set(e.x, e.y, e.z); e.v.flame.scale.y = 1 + Math.sin(t * 12 + e.a) * 0.25;
        e.shootT -= dt;
        if (story && keep && e.stun <= 0 && e.shootT <= 0) {
          e.shootT = 2.6 / spd;
          const mesh = new THREE.Mesh(shotGeo, shotMat); mesh.position.set(e.x, e.y, e.z); scene.add(mesh);
          const d = Math.hypot(dx, p.y + 0.9 - e.y, dz) || 1;
          shots.push({ practice: e.practice, mesh, x: e.x, y: e.y, z: e.z, vx: dx / d * 7 * spd, vy: (p.y + 0.9 - e.y) / d * 7 * spd, vz: dz / d * 7 * spd, life: 3 });
          ctx.fx('wisp', e);
        }
        if (story && Math.hypot(dx, p.y + 0.9 - e.y, dz) < 1.6 && p.spin > 0) damage(e, atk, ctx, p.x, p.z);
      } else if (e.kind === 'hawk') {
        if (!e.active) continue;
        const vis = 0.12 + 0.88 * weave;
        for (const mt of e.mats) mt.opacity = vis;
        e.stun = Math.max(0, e.stun - dt); e.t += dt;
        const hy = heightAt(e.home.x, e.home.z) + 9;
        if (e.stun > 0) e.y += (heightAt(e.x, e.z) + 0.7 - e.y) * Math.min(1, dt * 6);
        else if (!story) e.state = 'circle';
        if (e.stun <= 0) {
          if (e.state === 'circle') {
            e.a += dt * 0.8 * spd;
            const cx = e.home.x + Math.cos(e.a) * 7, cz = e.home.z + Math.sin(e.a) * 7;
            e.x += (cx - e.x) * Math.min(1, dt * 2); e.z += (cz - e.z) * Math.min(1, dt * 2); e.y += (hy - e.y) * Math.min(1, dt * 2);
            if (story && dist < 22 && e.t > 1.5) { e.state = 'warn'; e.t = 0; ctx.fx('screech', e); }
          } else if (e.state === 'warn') {
            e.y += Math.sin(t * 20) * 0.02;
            if (e.t > 1.0 / spd) { e.state = 'swoop'; e.t = 0; e.tx = p.x; e.ty = p.y + 0.8; e.tz = p.z; }
          } else if (e.state === 'swoop') {
            const mx = e.tx - e.x, my = e.ty - e.y, mz = e.tz - e.z, ml = Math.hypot(mx, my, mz), s = 20 * spd * dt;
            if (ml < s || e.t > 1.6) { e.state = 'climb'; e.t = 0; } else { e.x += mx / ml * s; e.y += my / ml * s; e.z += mz / ml * s; }
          } else if (e.state === 'climb') {
            e.y += (hy - e.y) * Math.min(1, dt * 1.8);
            if (e.t > 1.8) { e.state = 'circle'; e.t = 0; }
          }
        }
        e.v.root.position.set(e.x, e.y, e.z);
        e.v.root.rotation.y = e.state === 'swoop' ? Math.atan2(e.tx - e.x, e.tz - e.z) : e.state === 'circle' ? -e.a : Math.atan2(dx, dz);
        e.v.root.rotation.z = e.stun > 0 ? 1.4 : 0;
        e.v.animate(dt, t, e.stun <= 0, e.state === 'warn');
        const d3 = Math.hypot(dx, p.y + 0.8 - e.y, dz);
        if (d3 < 1.9 && story) {
          if (p.spin > 0) kill(e, ctx);
          else if (e.state === 'swoop' && e.stun <= 0) { ctx.hurt(e.x, e.z, 1, 12, e); e.state = 'climb'; e.t = 0; }
        }
      }
    }
    // Wisp fire orbs.
    for (const s of shots) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.mesh.position.set(s.x, s.y, s.z);
      if (Math.hypot(p.x - s.x, p.y + 0.9 - s.y, p.z - s.z) < 0.9) { s.life = 0; ctx.hurt(s.x, s.z, 1, 8, { kind: 'wisp', practice: s.practice }); }
      if (s.life <= 0 || s.y < heightAt(s.x, s.z)) { scene.remove(s.mesh); s.done = true; }
    }
    for (let i = shots.length - 1; i >= 0; i--) if (shots[i].done) shots.splice(i, 1);
  }

  // A thrown shell, a companion's blow or a weapon striking near (x, y, z). Returns how many were hit.
  function hitAt(x, y, z, r, source, weave, ctx, dmg = 1) {
    let n = 0;
    for (const e of list) {
      if (e.dead || (e.kind === 'hawk' && !e.active) || ((e.kind === 'wisp' || e.kind === 'hyena') && weave < 0.5)) continue;
      const d = Math.hypot(e.x - x, (e.kind === 'hawk' || e.kind === 'wisp' ? e.y - y : 0), e.z - z);
      if (d > r) continue;
      if (e.kind === 'devil') { e.scatter = 5; n++; continue; }
      if (e.kind === 'hawk') { if (weave > 0.5) { if (e.stun > 0 && source !== 'mbe') kill(e, ctx, source); else { e.stun = 4; e.state = 'circle'; } n++; } continue; }
      const power = source === 'youth' ? Math.max(dmg, 2) : source === 'mbe' ? (e.kind === 'beetle' && e.stun <= 0 ? 0 : 1) : dmg;
      if (source === 'mbe' && e.kind === 'beetle' && e.stun <= 0) { e.stun = 4; n++; continue; }
      if (damage(e, e.kind === 'beetle' && e.stun > 0 ? 99 : power, ctx, x, z, source)) n++;
    }
    return n;
  }
  function nearest(x, z, maxD, weave) {
    let best = null, bd = maxD;
    for (const e of list) {
      if (e.dead || (e.kind === 'hawk' && (!e.active || weave < 0.5)) || (e.kind === 'devil' && weave > 0.5) || ((e.kind === 'wisp' || e.kind === 'hyena') && weave < 0.5)) continue;
      const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // Talking-drum pulse: stuns beetles, Greedlings, brutes, wisps, hyenas and hawks; scatters dust devils.
  function drum(x, y, z, r, weave) {
    let n = 0;
    for (const e of list) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, (e.kind === 'hawk' || e.kind === 'wisp' ? e.y - y : 0), e.z - z);
      if (d > r * (e.kind === 'hawk' ? 1.6 : 1)) continue;
      if (['beetle', 'greed', 'brute'].includes(e.kind)) { e.stun = e.kind === 'brute' ? 3 : 4; if (e.kind === 'brute') { e.state = 'tired'; e.t = 0; } n++; }
      if ((e.kind === 'wisp' || e.kind === 'hyena') && weave > 0.5) { e.stun = 3.5; if (e.kind === 'hyena') e.state = 'circle'; n++; }
      if (e.kind === 'devil') { e.scatter = 5; n++; }
      if (e.kind === 'hawk' && e.active && weave > 0.5) { e.stun = 4; e.state = 'circle'; n++; }
    }
    return n;
  }
  // Random encounters: the game spawns monsters around the player and clears them away when far off.
  function spawn(kind, x, z) { const e = add(make[kind](x, z), 'r' + (spawnId++)); e.dynamic = true; return e; }
  function cull(px, pz) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i]; if (!e.dynamic) continue;
      if ((e.dead && e.deadT > 2) || Math.hypot(e.x - px, e.z - pz) > 95) { scene.remove(e.v.g || e.v.root); list.splice(i, 1); }
    }
  }
  const roaming = () => list.filter(e => e.dynamic && !e.dead).length;
  function setDifficulty(d) { spd = d.enemySpeed; hpMul = d.enemySpeed > 1.2 ? 1.6 : d.enemySpeed > 1.05 ? 1.3 : 1; }
  function activateQuestHawks() { for (const e of list) if (e.quest) { e.active = true; e.v.root.visible = true; e.dead = false; } }
  const questHawksLeft = () => list.filter(e => e.quest && !e.dead).length;
  return { list, update, drum, hitAt, nearest, damage, spawn, cull, roaming, setDifficulty, activateQuestHawks, questHawksLeft };
}

// ---------------- Boss: the Shade of All-of-You ----------------
export function createBoss(scene, diff) {
  const P = L.PALACE;
  const model = makeTortoise({ skin: '#2b1a45', outfit: { head: 'halo', wrap: 'kente', shell: 'star', acc: 'cape' }, scale: 4.2 });
  const shadow = new THREE.MeshStandardMaterial({ color: '#2b1a45', emissive: '#5a2b9a', emissiveIntensity: 0.55, roughness: 0.35, transparent: true, opacity: 0.94 });
  model.root.traverse(o => { if (o.isMesh && o.material !== model.shellMat && o.material !== model.wrapMat) { if (o.material.color && o.material.color.getHex() === 0xfbfbf6) o.material = new THREE.MeshBasicMaterial({ color: '#ff5a2a' }); else if (!o.material.isMeshBasicMaterial) o.material = shadow; } });
  model.root.position.set(P.x, P.y, P.z); model.root.rotation.y = 0;
  scene.add(model.root);
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#ffd35a', emissive: '#ffb000', emissiveIntensity: 2, roughness: 0.2, metalness: 0.3, transparent: true });
  const crystals = [];
  for (let i = 0; i < 3; i++) {
    const c = m(new THREE.OctahedronGeometry(0.3, 0), crystalMat, (i - 1) * 0.55, 1.42, -0.1 + (i % 2) * 0.2);
    model.body.add(c); crystals.push(c);
  }
  const shieldMat = new THREE.MeshStandardMaterial({ color: '#ffd35a', emissive: '#ff9a00', emissiveIntensity: 0.6, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(7.5, 32, 20), shieldMat); shield.position.set(P.x, P.y + 3, P.z); scene.add(shield);
  const stars = new THREE.Group(); for (let i = 0; i < 5; i++) { const s = m(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: '#fff2a0' }), Math.cos(i * 1.256) * 2.2, 0, Math.sin(i * 1.256) * 2.2); stars.add(s); }
  stars.position.set(P.x, P.y + 9.5, P.z); stars.visible = false; scene.add(stars);

  const ringGeo = new THREE.TorusGeometry(1, 0.22, 8, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ff4fa3', transparent: true, opacity: 0.85 });
  const orbGeo = new THREE.SphereGeometry(0.55, 16, 12);
  const orbMat = new THREE.MeshStandardMaterial({ color: '#8b3cff', emissive: '#a24bff', emissiveIntensity: 2.2 });
  const markMat = new THREE.MeshBasicMaterial({ color: '#ff3b6a', transparent: true, opacity: 0.5, depthWrite: false });
  const markGeo = new THREE.RingGeometry(2.2, 2.6, 32);

  const B = { hp: 3, state: 'sleep', t: 0, rings: [], orbs: [], model, crystals, shield, active: false, hitCooldown: 0 };
  const speed = diff.enemySpeed;

  function start() { if (B.state === 'sleep') { B.state = 'intro'; B.t = 0; B.active = true; } }
  function reset() {
    B.hp = 3; B.state = 'sleep'; B.t = 0; B.active = false; crystals.forEach(c => { c.visible = true; });
    for (const r of B.rings) scene.remove(r.mesh); for (const o of B.orbs) { scene.remove(o.mesh); scene.remove(o.mark); }
    B.rings = []; B.orbs = []; model.root.visible = true; model.root.scale.setScalar(4.2); shield.visible = true; stars.visible = false;
    model.root.position.y = P.y;
  }

  function update(dt, t, ctx) {
    const p = ctx.player, weave = ctx.weave;
    B.t += dt; B.hitCooldown = Math.max(0, B.hitCooldown - dt);
    const dx = p.x - P.x, dz = p.z - P.z, dist = Math.hypot(dx, dz);
    const face = Math.atan2(dx, dz);
    if (B.state !== 'defeated' && B.state !== 'gone') model.root.rotation.y += ((((face - model.root.rotation.y + Math.PI) % 6.283) + 6.283) % 6.283 - Math.PI) * Math.min(1, dt * 2);
    model.animate(dt, { t, speed: 0, grounded: true, talking: B.state === 'intro' });
    const dizzy = B.state === 'dizzy';
    shield.visible = !dizzy && B.state !== 'defeated' && B.state !== 'gone' && B.state !== 'sleep';
    shieldMat.opacity = (0.12 + Math.sin(t * 4) * 0.05) * (1 - weave * 0.5);
    crystalMat.opacity = 0.25 + weave * 0.75; crystalMat.emissiveIntensity = dizzy ? 3 + Math.sin(t * 10) * 1.5 : 1.2;
    stars.visible = dizzy; stars.rotation.y = t * 3;
    const lvl = 3 - B.hp; // 0..2 escalation

    if (B.state === 'intro' && B.t > 3.2) { B.state = 'orbs'; B.t = 0; B.thrown = 0; }
    else if (B.state === 'orbs') {
      const count = 3 + lvl * 2, gap = Math.max(0.45, 0.85 - lvl * 0.15) / speed;
      if (B.t > gap) { B.t = 0; throwOrb(p, ctx); B.thrown++; if (B.thrown >= count) { B.state = 'windup'; B.t = 0; } }
    } else if (B.state === 'windup') {
      model.root.position.y = P.y + Math.sin(Math.min(1, B.t / 1.0) * Math.PI / 2) * 3.5;
      if (B.t > 1.0 / speed) { B.state = 'slam'; B.t = 0; B.slams = 0; model.root.position.y = P.y; ctx.fx('slam'); spawnRing(); B.slams = 1; }
    } else if (B.state === 'slam') {
      if (B.slams < 1 + lvl && B.t > 0.7) { spawnRing(); B.slams++; B.t = 0; }
      if (B.t > 1.6) { B.state = 'dizzy'; B.t = 0; ctx.fx('dizzy'); }
    } else if (B.state === 'dizzy') {
      if (B.t > 4.2 - lvl * 0.4) { B.state = 'orbs'; B.t = 0; B.thrown = 0; }
    } else if (B.state === 'hurt') {
      model.root.position.y = P.y + Math.max(0, Math.sin(B.t * 8)) * 0.6;
      if (B.t > 1.4) {
        if (B.hp <= 0) {
          B.state = 'defeated'; B.t = 0; ctx.fx('bossdown');
          for (const r of B.rings) scene.remove(r.mesh); for (const o of B.orbs) { scene.remove(o.mesh); scene.remove(o.mark); }
          B.rings = []; B.orbs = [];
        } else { B.state = 'orbs'; B.t = 0; B.thrown = 0; }
      }
    } else if (B.state === 'defeated') {
      const s = Math.max(0.01, 4.2 * (1 - B.t / 3));
      model.root.scale.setScalar(s); model.root.position.y = P.y + B.t * 1.2; model.root.rotation.y += dt * 6;
      if (B.t > 3) { B.state = 'gone'; model.root.visible = false; ctx.bossDefeated(); }
    }

    // Body contact and the dizzy-window strike.
    if (B.state !== 'defeated' && B.state !== 'gone' && B.state !== 'sleep' && dist < 6.6 && p.y < P.y + 6) {
      if (dizzy && (p.spin > 0 || p.attack > 0) && B.hitCooldown <= 0) {
        if (weave > 0.5) {
          B.hp--; B.hitCooldown = 1; crystals[B.hp].visible = false; B.state = 'hurt'; B.t = 0; ctx.fx('bosshit');
          if (B.hp <= 0) { for (const r of B.rings) r.hit = true; for (const o of B.orbs) o.dud = true; }
          ctx.knock(P.x, P.z, 18);
        } else { B.hitCooldown = 0.8; ctx.fx('clang'); ctx.knock(P.x, P.z, 14); }
      } else if (!dizzy) ctx.hurt(P.x, P.z, 1, 16);
    }
    // Shockwave rings.
    for (const r of B.rings) {
      r.r += dt * (9.5 + lvl * 1.5) * speed;
      r.mesh.scale.set(r.r, r.r, 1); ringMat.opacity = 0.85;
      if (!r.hit && Math.abs(dist - r.r) < 0.9 && p.y - P.y < 0.75) { r.hit = true; ctx.hurt(P.x, P.z, 1, 10); }
      if (r.r > P.r + 2) { scene.remove(r.mesh); r.done = true; }
    }
    B.rings = B.rings.filter(r => !r.done);
    // Greed orbs.
    for (const o of B.orbs) {
      o.t += dt; const k = Math.min(1, o.t / o.dur);
      o.mesh.position.set(o.sx + (o.tx - o.sx) * k, o.sy + (o.ty - o.sy) * k + Math.sin(k * Math.PI) * 8, o.sz + (o.tz - o.sz) * k);
      o.mark.material.opacity = 0.25 + k * 0.6;
      if (k >= 1) {
        scene.remove(o.mesh); scene.remove(o.mark); o.done = true; ctx.fx('orb', o);
        if (!o.dud && Math.hypot(p.x - o.tx, p.z - o.tz) < 2.7 && Math.abs(p.y - o.ty) < 2) ctx.hurt(o.tx, o.tz, 1, 12);
      }
    }
    B.orbs = B.orbs.filter(o => !o.done);
  }

  function spawnRing() {
    const mesh = new THREE.Mesh(ringGeo, ringMat); mesh.rotation.x = Math.PI / 2; mesh.position.set(P.x, P.y + 0.35, P.z); scene.add(mesh);
    B.rings.push({ r: 5, mesh, hit: false });
  }
  function throwOrb(p, ctx) {
    const lead = 0.6, tx = p.x + p.vx * lead, tz = p.z + p.vz * lead;
    const d = Math.hypot(tx - P.x, tz - P.z), k = d > P.r - 1 ? (P.r - 1) / d : 1;
    const fx = P.x + (tx - P.x) * k, fz = P.z + (tz - P.z) * k;
    const mesh = new THREE.Mesh(orbGeo, orbMat); scene.add(mesh);
    const mark = new THREE.Mesh(markGeo, markMat.clone()); mark.rotation.x = -Math.PI / 2; mark.position.set(fx, P.y + 0.05, fz); scene.add(mark);
    B.orbs.push({ t: 0, dur: 1.25 / speed, sx: P.x, sy: P.y + 6, sz: P.z, tx: fx, ty: P.y + 0.3, tz: fz, mesh, mark });
    ctx.fx('throw');
  }
  return { B, start, reset, update };
}
