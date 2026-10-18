// 3D props for the hobbies: the river jetty, the cooking pot, Musa's bike stand, the bike-loop gates and bicycles.
import * as THREE from 'three';
import { heightAt, WATER_Y } from './terrain.mjs';
import * as L from './layout.mjs';
import { BIKE_GATES } from './hobbies.mjs';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const box = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = x.receiveShadow = true; return x; };
const cyl = (r1, r2, h, m, seg = 12) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); x.castShadow = true; return x; };

export function makeBike(color = '#d23a2b') {
  const g = new THREE.Group(), frame = std(color, { metalness: 0.5, roughness: 0.35 }), dark = std('#1b1b1f', { roughness: 0.5 }), steel = std('#b9bcc2', { metalness: 0.9, roughness: 0.25 });
  const wheels = [];
  for (const z of [-0.52, 0.52]) {
    const w = new THREE.Group(); w.position.set(0, 0.34, z);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 28), dark); tyre.rotation.y = Math.PI / 2; w.add(tyre);
    for (let i = 0; i < 6; i++) { const s = cyl(0.008, 0.008, 0.6, steel, 4); s.rotation.x = i / 6 * Math.PI; w.add(s); }
    g.add(w); wheels.push(w);
  }
  const bar = (a, b, r = 0.025, m = frame) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), c = cyl(r, r, A.distanceTo(B), m, 8); c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(c); return c; };
  bar([0, 0.34, -0.52], [0, 0.72, -0.12]); bar([0, 0.34, -0.52], [0, 0.36, 0.05]); bar([0, 0.36, 0.05], [0, 0.72, -0.12]);
  bar([0, 0.72, -0.12], [0, 0.78, 0.4]); bar([0, 0.36, 0.05], [0, 0.78, 0.4]); bar([0, 0.34, 0.52], [0, 0.88, 0.42]);
  bar([-0.22, 0.9, 0.42], [0.22, 0.9, 0.42], 0.02, dark);
  const seat = box(0.14, 0.05, 0.26, dark); seat.position.set(0, 0.8, -0.14); g.add(seat);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std('#f2c21b', { metalness: 0.8, roughness: 0.2 })); bell.position.set(0.12, 0.93, 0.42); g.add(bell);
  return { root: g, wheels, spin(dt, speed) { for (const w of wheels) w.rotation.x -= dt * speed / 0.31; } };
}

export function buildHobbyWorld(W) {
  const scene = W.scene, wood = std('#7a5230'), darkWood = std('#4f3420'), rope = std('#c9a66b');
  // River jetty: planks out over the water, a rod rack and a sign.
  const J = L.JETTY, jy = 0.35, jetty = new THREE.Group(); jetty.position.set(J.x, 0, J.z);
  for (let i = 0; i < 14; i++) { const p = box(2.2, 0.08, 0.46, i % 2 ? wood : darkWood); p.position.set(0, jy - 0.04, -0.25 - i * 0.5); p.rotation.y = (Math.random() - 0.5) * 0.04; jetty.add(p); }
  for (const z of [-0.5, -3.5, -6.5]) for (const x of [-1, 1]) { const post = cyl(0.09, 0.11, 3, darkWood, 8); post.position.set(x, jy - 1.4, z); jetty.add(post); }
  const rack = new THREE.Group(); rack.position.set(1.4, heightAt(J.x + 1.4, J.z + 0.6), 0.6);
  for (const x of [-0.4, 0.4]) { const l = cyl(0.04, 0.04, 1.3, darkWood, 6); l.position.set(x, 0.65, 0); rack.add(l); }
  const top = cyl(0.03, 0.03, 0.9, darkWood, 6); top.rotation.z = Math.PI / 2; top.position.y = 1.25; rack.add(top);
  for (const x of [-0.25, 0, 0.25]) { const r = cyl(0.012, 0.02, 1.8, std('#c9a66b'), 6); r.position.set(x, 1.0, 0.08); r.rotation.x = 0.25; rack.add(r); }
  jetty.add(rack); scene.add(jetty);
  W.platforms.push({ id: 'jetty', layer: 'both', shape: 'box', x: J.x, z: J.z - 3.5, w: 2.2, d: 7.2, top: jy, kind: 'jetty' });
  const fishSpot = { x: J.x, z: J.z - 6.2, y: jy };
  // Bobber and fishing line (shown while fishing).
  const bobber = new THREE.Group();
  const bTop = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#ff3b2e', { roughness: 0.4, emissive: '#ff2a10', emissiveIntensity: 0.6 })), bBot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#f4f1ea', { roughness: 0.4 }));
  bobber.add(bTop, bBot); bobber.visible = false; scene.add(bobber);
  // The line is a thin tube stretched between rod tip and float, so it shows at any distance.
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5, 1, true), new THREE.MeshBasicMaterial({ color: '#f7f3ea', transparent: true, opacity: 0.85 })); line.visible = false; line.frustumCulled = false; scene.add(line);
  const UP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const setLine = (a, b) => { tmp.copy(b).sub(a); line.position.copy(a).add(b).multiplyScalar(0.5); line.scale.set(1, tmp.length(), 1); line.quaternion.setFromUnitVectors(UP, tmp.normalize()); };
  const lineGeo = null;
  const rod = new THREE.Group(); const rodPole = cyl(0.02, 0.04, 2.4, std('#b8894a', { roughness: 0.6 }), 8); rodPole.position.y = 1.1; rod.add(rodPole);
  for (const y of [0.5, 1.2, 1.9]) { const g = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), std('#d0d0d0', { metalness: 0.8 })); g.position.set(0, y, 0.03); rod.add(g); }
  const reel = cyl(0.05, 0.05, 0.05, std('#555b66', { metalness: 0.7 }), 10); reel.rotation.z = Math.PI / 2; reel.position.set(0.04, 0.15, 0); rod.add(reel);
  const rodTip = new THREE.Object3D(); rodTip.position.y = 2.3; rod.add(rodTip); rod.rotation.x = Math.PI / 2 - 0.75; rod.visible = false;
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.18, 24), new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  splash.rotation.x = -Math.PI / 2; scene.add(splash);

  // Cooking pot: three hearth stones, a clay pot, a fire and a stirring spoon.
  const C = L.COOK_POT, cy = heightAt(C.x, C.z), pot = new THREE.Group(); pot.position.set(C.x, cy, C.z);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), std('#6e6a64')); st.position.set(Math.sin(a) * 0.45, 0.2, Math.cos(a) * 0.45); st.castShadow = true; pot.add(st); }
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), std('#8a3d22', { roughness: 0.7 })); body.scale.y = 0.75; body.position.y = 0.72; body.castShadow = true; pot.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 24), std('#6e2c18')); rim.rotation.x = Math.PI / 2; rim.position.y = 1.08; pot.add(rim);
  const soupM = std('#c9542a', { emissive: '#3a1004', roughness: 0.4 }), soup = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), soupM); soup.rotation.x = -Math.PI / 2; soup.position.y = 1.04; pot.add(soup);
  const spoon = cyl(0.02, 0.02, 0.9, wood, 6); spoon.position.set(0.12, 1.25, 0); spoon.rotation.z = -0.4; pot.add(spoon);
  const flameM = new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [0, 1, 2].map(i => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 8), flameM); f.position.set(Math.sin(i * 2.1) * 0.15, 0.32, Math.cos(i * 2.1) * 0.15); pot.add(f); return f; });
  const potLight = new THREE.PointLight('#ff8a3a', 2.2, 6, 2); potLight.position.y = 0.6; pot.add(potLight);
  const mat = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), std('#9b7a4c', { roughness: 1 })); mat.rotation.x = -Math.PI / 2; mat.position.y = 0.02; mat.receiveShadow = true; pot.add(mat);
  scene.add(pot);
  W.walls.push({ id: 'pot', x: C.x, z: C.z, r: 0.75, y0: cy - 1, y1: cy + 1.3 });

  // Musa's bike stand.
  const B = L.BIKE_STAND, by = heightAt(B.x, B.z), stand = new THREE.Group(); stand.position.set(B.x, by, B.z); stand.rotation.y = -0.3;
  const roof = box(3.2, 0.1, 1.8, std('#c0563a')); roof.position.y = 2.1; stand.add(roof);
  for (const x of [-1.5, 1.5]) for (const z of [-0.8, 0.8]) { const p = cyl(0.06, 0.06, 2.1, darkWood, 6); p.position.set(x, 1.05, z); stand.add(p); }
  const sign = box(1.6, 0.4, 0.06, std('#f2c21b')); sign.position.set(0, 2.45, 0.85); stand.add(sign);
  for (const [i, col] of [[-0.8, '#d23a2b'], [0.8, '#2a6fdb']].entries()) { const b = makeBike(col[1]); b.root.position.set(col[0], 0, 0); b.root.rotation.y = Math.PI / 2; stand.add(b.root); }
  scene.add(stand);

  // Bike-loop gates: arches with flags; the next gate glows during a ride.
  const gates = BIKE_GATES.map((gt, i) => {
    const gy = heightAt(gt.x, gt.z), g = new THREE.Group(); g.position.set(gt.x, gy, gt.z);
    const next = BIKE_GATES[(i + 1) % BIKE_GATES.length]; g.rotation.y = Math.atan2(next.x - gt.x, next.z - gt.z) + Math.PI / 2;
    const m = std(i === 0 ? '#f2c21b' : '#2fa84f', { emissive: '#000000' });
    for (const s of [-1, 1]) { const p = cyl(0.07, 0.07, 2.6, m, 8); p.position.set(0, 1.3, s * 1.6); g.add(p); }
    const top = cyl(0.06, 0.06, 3.2, m, 8); top.rotation.x = Math.PI / 2; top.position.y = 2.6; g.add(top);
    const flag = box(0.02, 0.4, 0.6, std(i === 0 ? '#d23a2b' : '#f4f1ea')); flag.position.set(0, 2.35, 0); g.add(flag);
    scene.add(g); return { ...gt, y: gy, g, m };
  });
  const startSign = box(0.08, 0.5, 1.3, std('#1d1540')); startSign.position.set(BIKE_GATES[0].x, heightAt(BIKE_GATES[0].x, BIKE_GATES[0].z) + 3.1, BIKE_GATES[0].z); scene.add(startSign);

  function update(dt, t) {
    flames.forEach((f, i) => { f.scale.set(1, 0.8 + Math.sin(t * 13 + i * 2) * 0.25, 1); });
    potLight.intensity = 2 + Math.sin(t * 17) * 0.3 + Math.sin(t * 7.3) * 0.2;
    soupM.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.2;
    if (splash.material.opacity > 0) { splash.material.opacity = Math.max(0, splash.material.opacity - dt * 1.2); splash.scale.multiplyScalar(1 + dt * 3); }
  }
  function ripple(x, z) { splash.position.set(x, WATER_Y + 0.02, z); splash.scale.setScalar(1); splash.material.opacity = 0.9; }
  return { jetty, fishSpot, bobber, line, setLine, rod, rodTip, ripple, pot, soupM, stand, gates, update };
}
