// Builds the Three.js world from layout data: terrain, sky, water, light, scenery, pickups and NPCs.
import * as THREE from 'three';
import * as TX from './textures.mjs';
import { heightAt, WATER_Y, fbm, riverZ, canyonX, distToRoute, smooth, slopeAt } from './terrain.mjs';
import * as L from './layout.mjs';
import { CHECKPOINTS } from './config.mjs';
import { makeBird } from './models.mjs';
import { makeHuman, makeGrandma, makeMamaNkem, makeNgozi, makeKid } from './humans.mjs';

const lin = c => new THREE.Color(c);
let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const SKY_GLSL = /* glsl */`
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= .5; } return s; }
vec3 skyColour(vec3 d, float weave, float t, vec3 sun, vec3 moon){
  float h = d.y;
  vec3 top = vec3(.25, .52, .86), hor = vec3(1., .78, .55), low = vec3(.86, .62, .45);
  vec3 day = mix(hor, top, pow(smoothstep(-.05, .6, h), .8));
  day = mix(low, day, smoothstep(-.25, 0., h));
  float sd = max(dot(d, normalize(sun)), 0.);
  day += vec3(1., .72, .42) * pow(sd, 6.) * .45 + vec3(1., .96, .82) * smoothstep(.9975, .999, sd) * 6.;
  vec2 cuv = d.xz / max(h + .25, .05) * 1.3;
  float cl = fbm(cuv + vec2(t * .008, t * .003));
  float cm = smoothstep(.52, .82, cl) * smoothstep(-.02, .22, h);
  vec3 cloudCol = mix(vec3(1., .8, .65), vec3(1.), smoothstep(0., .4, h)) * (.9 + .35 * pow(sd, 4.));
  day = mix(day, cloudCol, cm * .75);
  vec3 night = mix(vec3(.22, .11, .36), vec3(.02, .03, .13), smoothstep(-.05, .55, h));
  vec2 sp = vec2(atan(d.z, d.x) * 70., h * 140.);
  float st = h21(floor(sp));
  night += vec3(.9, .95, 1.) * step(.986, st) * smoothstep(.0, .15, h) * (.55 + .45 * sin(t * 3. + st * 90.)) * 1.4;
  float band = sin(d.x * 9. + sin(d.z * 6. + t * .15) * 2.) * .5 + .5;
  float rib = smoothstep(.86, 1., band) * smoothstep(.05, .35, h) * smoothstep(.85, .3, h);
  night += vec3(.12, .66, .9) * rib * .55 + vec3(.6, .3, .95) * smoothstep(.96, 1., band) * rib * .5;
  float md = max(dot(d, normalize(moon)), 0.);
  night += vec3(.8, .88, 1.) * smoothstep(.9988, .9993, md) * 3. + vec3(.3, .4, .9) * pow(md, 40.) * .5;
  night = mix(vec3(.07, .04, .13), night, smoothstep(-.3, 0., h));
  return pow(mix(day, night, weave), vec3(2.2));
}`;

export function buildWorld(renderer) {
  seed = 42;
  const scene = new THREE.Scene();
  const W = {
    scene, platforms: L.buildPlatforms(), walls: L.buildWalls(), updrafts: L.UPDRAFTS,
    layerMats: { story: [], now: [] }, anims: [], npcs: {}, checkpoints: [], cowries: [], threads: [], tales: [], kola: [], rings: [],
    grass: null, flames: [], lanterns: [], sealed: [], occluders: [], uniforms: { uTime: { value: 0 }, uWeave: { value: 0 } },
  };
  const byId = Object.fromEntries(W.platforms.map(p => [p.id, p]));
  W.byId = byId;
  const U = W.uniforms;
  const add = (o, parent = scene) => { parent.add(o); return o; };
  const m = (geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = receive; return o; };
  const layered = (mat, layer) => { mat.transparent = true; W.layerMats[layer].push(mat); return mat; };

  // ---------- Materials ----------
  const MAT = {
    mud: new THREE.MeshStandardMaterial({ map: TX.mudWall(), roughness: 0.92 }),
    thatch: new THREE.MeshStandardMaterial({ map: TX.thatch(), roughness: 1 }),
    bark: new THREE.MeshStandardMaterial({ map: TX.bark(), roughness: 0.95, color: '#c8b8a6' }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4f6b2a', roughness: 0.85 }),
    leafDry: new THREE.MeshStandardMaterial({ color: '#7d7a34', roughness: 0.9 }),
    rock: new THREE.MeshStandardMaterial({ map: TX.rock(), roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: '#7e7568', roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: '#7a4d2b', roughness: 0.8 }),
    crate: new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.75, map: TX.bark() }),
    clay: new THREE.MeshStandardMaterial({ color: '#a4502e', roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: '#f2c14e', roughness: 0.25, metalness: 0.9, emissive: '#5a3800', emissiveIntensity: 0.4 }),
    grassTop: new THREE.MeshStandardMaterial({ color: '#6f8f36', roughness: 0.9 }),
    palace: new THREE.MeshStandardMaterial({ color: '#9c7a52', roughness: 0.7, map: TX.cloth('bogolan') }),
    column: new THREE.MeshStandardMaterial({ color: '#c0563a', roughness: 0.55 }),
    dome: new THREE.MeshStandardMaterial({ color: '#efe1c4', roughness: 0.5 }),
    ember: new THREE.MeshBasicMaterial({ color: '#ffb347' }),
    lantern: new THREE.MeshStandardMaterial({ color: '#ffcf6b', emissive: '#ff9a2e', emissiveIntensity: 0.6 }),
  };
  MAT.palace.map = MAT.palace.map.clone(); MAT.palace.map.repeat.set(10, 10); MAT.palace.map.needsUpdate = true;
  const spiritTex = TX.spirit();
  const spiritMat = () => layered(new THREE.MeshStandardMaterial({ color: '#59dcff', emissive: '#2fb6ff', emissiveIntensity: 1.3, emissiveMap: spiritTex, map: spiritTex, roughness: 0.3, opacity: 0.1, depthWrite: false }), 'story');
  const SPIRIT = spiritMat();
  const RUIN = layered(new THREE.MeshStandardMaterial({ map: TX.rock(), color: '#d8b89a', roughness: 0.9 }), 'now');
  const NOWWOOD = layered(new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.8 }), 'now');
  W.SPIRIT = SPIRIT;

  // ---------- Sky, fog, light ----------
  const sunDir = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();
  const moonDir = new THREE.Vector3(0.3, 0.55, -0.78).normalize();
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uWeave: U.uWeave, uTime: U.uTime, uSun: { value: sunDir }, uMoon: { value: moonDir } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uWeave, uTime; uniform vec3 uSun, uMoon; varying vec3 vDir; ${SKY_GLSL}
      void main(){ gl_FragColor = vec4(skyColour(normalize(vDir), uWeave, uTime, uSun, uMoon), 1.); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  W.sky = sky;

  // Image-based lighting from the sky itself, one map per time layer.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envFor = weave => {
    const s = new THREE.Scene();
    const mat = skyMat.clone(); mat.uniforms = { uWeave: { value: weave }, uTime: { value: 0 }, uSun: { value: sunDir }, uMoon: { value: moonDir } };
    mat.vertexShader = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: weave ? '#1a1430' : '#8a6a42' })); ground.rotation.x = -Math.PI / 2; ground.position.y = -4;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat), ground);
    const rt = pmrem.fromScene(s, 0.02); return rt.texture;
  };
  W.env = [envFor(0), envFor(1)];
  scene.environment = W.env[0];
  scene.fog = new THREE.FogExp2('#e4b98c', 0.0042);

  const hemi = add(new THREE.HemisphereLight('#cfe2ff', '#8a5a33', 0.9));
  const sun = new THREE.DirectionalLight('#ffd9a8', 3.1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  add(sun); add(sun.target);
  W.light = { hemi, sun, sunDir, moonDir };

  // ---------- Terrain ----------
  const tGeo = new THREE.PlaneGeometry(300, 420, 240, 336);
  tGeo.rotateX(-Math.PI / 2); tGeo.translate(0, 0, -105);
  const pos = tGeo.attributes.position, cols = new Float32Array(pos.count * 3);
  const cGrass = lin('#7f9a3d'), cGold = lin('#caa64b'), cDirt = lin('#a5633a'), cEarth = lin('#b97a4a'), cSand = lin('#dcc28e'), cDeep = lin('#3e4a3a');
  const cR1 = lin('#9a4628'), cR2 = lin('#d38d50'), cFloor = lin('#c47c47'), cPlat = lin('#a69447'), cAbyss = lin('#3b1d16');
  const tmp = new THREE.Color(), rockC = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z); pos.setY(i, h);
    const n = fbm(x * 0.05, z * 0.05);
    tmp.copy(cGrass).lerp(cGold, smooth(0.32, 0.68, n) * 0.85 + smooth(-70, -120, z) * 0.15);
    const dv = Math.hypot(x, z - 2);
    tmp.lerp(cEarth, (1 - smooth(13, 27, dv)) * (0.55 + 0.45 * fbm(x * 0.3, z * 0.3)));
    tmp.lerp(cDirt, (1 - smooth(1.2, 3.4, distToRoute(x, z))) * 0.85);
    const dr = Math.abs(z - riverZ(x));
    tmp.lerp(cSand, (1 - smooth(8, 10.8, dr)) * 0.9);
    if (h < WATER_Y) tmp.lerp(cDeep, 0.85);
    if (z < -140) {
      const s = slopeAt(x, z);
      rockC.copy(cR1).lerp(cR2, 0.5 + 0.5 * Math.sin(h * 1.15 + n * 4));
      tmp.lerp(cFloor, smooth(-142, -160, z) * 0.9);
      if (z < -248) tmp.lerp(cPlat, smooth(-248, -256, z) * 0.7);
      tmp.lerp(rockC, smooth(0.7, 1.6, s));
      if (h < -4) tmp.lerp(cAbyss, smooth(-4, -30, h));
    }
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  tGeo.computeVertexNormals();
  const grain = TX.grain().clone(); grain.repeat.set(90, 126); grain.needsUpdate = true;
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, map: grain, color: '#ffffff' });
  const terrain = m(tGeo, terrainMat, 0, 0, 0, { cast: false }); scene.add(terrain); W.terrain = terrain;

  // ---------- Water ----------
  const waterMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uWeave: { value: 0 }, uSun: { value: sunDir } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime, uWeave; uniform vec3 uSun; varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){
        vec2 p = vW.xz; float t = uTime;
        vec3 n = normalize(vec3(cos(p.x * .5 + t * 1.3) * .12 + cos(p.y * .7 - t) * .08 + sin((p.x + p.y) * 1.3 + t * 2.) * .05, 1.,
                                 sin(p.y * .45 + t * 1.1) * .12 + sin(p.x * .8 + t * .7) * .07));
        vec3 v = normalize(cameraPosition - vW);
        float fr = pow(1. - max(dot(n, v), 0.), 3.);
        vec3 deep = mix(vec3(.04, .22, .25), vec3(.02, .05, .16), uWeave);
        vec3 skyc = mix(vec3(.85, .75, .6), vec3(.15, .2, .45), uWeave);
        vec3 c = mix(deep, skyc, .25 + fr * .6);
        vec3 h = normalize(normalize(uSun) + v);
        c += vec3(1., .85, .6) * pow(max(dot(n, h), 0.), 180.) * 3. * (1. - uWeave);
        float glow = smoothstep(.92, 1., sin(p.x * .6 + sin(p.y * .5 + t) * 2. + t * 1.5)) * uWeave;
        c += vec3(.2, .8, 1.) * glow * .8;
        gl_FragColor = vec4(pow(c, vec3(2.2)), .88);
        #include <fog_fragment>
      }`,
    transparent: true, fog: true, depthWrite: false,
  });
  waterMat.uniforms.uTime = U.uTime; waterMat.uniforms.uWeave = U.uWeave;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(300, 34, 1, 1), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, -62); scene.add(water);
  // Sea of clouds beyond the edge of the world.
  const seaMat = new THREE.MeshStandardMaterial({ color: '#f6efe6', roughness: 1, transparent: true, opacity: 0.92, depthWrite: false });
  const sea = new THREE.Mesh(new THREE.CircleGeometry(420, 48), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -18, -420); scene.add(sea); W.sea = seaMat;

  // ---------- Grass (instanced, wind in the vertex shader) ----------
  const blade = new THREE.BufferGeometry();
  // A tuft of seven tapered, leaning blades.
  const bv = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + rnd(), r = 0.06 + rnd() * 0.12, ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const fa = a + Math.PI / 2, w = 0.035 + rnd() * 0.02, wx = Math.cos(fa) * w, wz = Math.sin(fa) * w;
    const h = 0.45 + rnd() * 0.45, lean = 0.12 + rnd() * 0.22, tx = ox + Math.cos(a) * lean, tz = oz + Math.sin(a) * lean;
    const mx = ox + Math.cos(a) * lean * 0.4, mz = oz + Math.sin(a) * lean * 0.4;
    bv.push(ox - wx, 0, oz - wz, ox + wx, 0, oz + wz, mx + wx * 0.6, h * 0.55, mz + wz * 0.6);
    bv.push(ox - wx, 0, oz - wz, mx + wx * 0.6, h * 0.55, mz + wz * 0.6, mx - wx * 0.6, h * 0.55, mz - wz * 0.6);
    bv.push(mx - wx * 0.6, h * 0.55, mz - wz * 0.6, mx + wx * 0.6, h * 0.55, mz + wz * 0.6, tx, h, tz);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(bv, 3)); blade.computeVertexNormals();
  const grassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 gw = instanceMatrix * vec4(0., 0., 0., 1.);
      float sway = sin(uTime * 1.8 + gw.x * .35 + gw.z * .22) * .22 + sin(uTime * 3.1 + gw.x) * .05;
      transformed.x += sway * position.y; transformed.z += sway * .4 * position.y;`);
    // Brighten blades so they read as sunlit tufts rather than black slivers.
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vec3(0., 1., 0.) + normal * .3);');
  };
  const GRASS_MAX = 14000;
  const grass = new THREE.InstancedMesh(blade, grassMat, GRASS_MAX);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v3 = new THREE.Vector3(), gc = new THREE.Color();
  let gi = 0, tries = 0;
  while (gi < GRASS_MAX && tries < 90000) {
    tries++;
    const x = (rnd() - 0.5) * 190, z = 50 - rnd() * 200;
    if (distToRoute(x, z) < 2.6 || Math.abs(z - riverZ(x)) < 9 || Math.hypot(x, z - 2) < 13 || slopeAt(x, z) > 0.55) continue;
    if (L.HUTS.some(h => Math.hypot(h.x - x, h.z - z) < 4)) continue;
    const y = heightAt(x, z);
    q.setFromAxisAngle(v3.set(0, 1, 0), rnd() * 6.28); sc.setScalar(0.8 + rnd() * 0.6); sc.y *= 0.7 + rnd() * 0.6;
    mtx.compose(v3.set(x, y - 0.05, z), q, sc); grass.setMatrixAt(gi, mtx);
    gc.set(z < -70 ? '#c7aa52' : '#8fb04a').offsetHSL((rnd() - 0.5) * 0.05, 0, (rnd() - 0.5) * 0.12); grass.setColorAt(gi, gc);
    gi++;
  }
  grass.count = gi; grass.userData.max = gi; grass.receiveShadow = true; grass.frustumCulled = false; scene.add(grass); W.grass = grass; W.grassMat = grassMat;

  // Flowers and pebbles, instanced.
  const flower = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 700);
  const fcols = ['#f6d33c', '#e2483a', '#b05ce0', '#ffffff', '#f08a24'];
  for (let i = 0; i < 700; i++) {
    let x, z; do { x = (rnd() - 0.5) * 120; z = 40 - rnd() * 170; } while (distToRoute(x, z) < 2 || Math.abs(z - riverZ(x)) < 9);
    mtx.compose(v3.set(x, heightAt(x, z) + 0.12, z), q.identity(), sc.setScalar(0.8 + rnd())); flower.setMatrixAt(i, mtx); flower.setColorAt(i, gc.set(fcols[i % 5]));
  }
  scene.add(flower);
  const pebble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), MAT.rock, 260); pebble.castShadow = true; pebble.receiveShadow = true;
  for (let i = 0; i < 260; i++) {
    let x, z; if (i < 160) { x = (rnd() - 0.5) * 170; z = 30 - rnd() * 190; } else { z = -150 - rnd() * 100; x = canyonX(z) + (rnd() > 0.5 ? 1 : -1) * (5 + rnd() * 7); }
    if (distToRoute(x, z) < 3 || Math.abs(z - riverZ(x)) < 8.5) { x += 12; }
    const s = 0.3 + rnd() * rnd() * (i < 160 ? 2 : 1.1);
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
    mtx.compose(v3.set(x, heightAt(x, z) + s * 0.25, z), q, sc.set(s, s * (0.5 + rnd() * 0.5), s)); pebble.setMatrixAt(i, mtx);
  }
  scene.add(pebble);

  // ---------- Village of Stories ----------
  for (const h of L.HUTS) {
    const g = new THREE.Group(); g.position.set(h.x, heightAt(h.x, h.z), h.z); g.rotation.y = h.rot + Math.PI / 2;
    const wall = MAT.mud.map.clone(); wall.repeat.set(3, 1); wall.needsUpdate = true;
    g.add(m(new THREE.CylinderGeometry(3.2, 3.35, 3, 28, 1), new THREE.MeshStandardMaterial({ map: wall, roughness: 0.92 }), 0, 1.5, 0));
    g.add(m(new THREE.ConeGeometry(4.3, 3.6, 28, 1), MAT.thatch, 0, 4.7, 0));
    g.add(m(new THREE.ConeGeometry(0.3, 0.9, 8), MAT.wood, 0, 6.8, 0));
    g.add(m(new THREE.BoxGeometry(1.3, 2, 0.3), new THREE.MeshStandardMaterial({ color: '#2a1a12' }), 0, 1, 3.15));
    add(g); W.occluders.push(g);
  }
  // Granaries and clay pots for texture.
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + 0.6, r = 35 + (i % 2) * 3, x = Math.cos(a) * r, z = Math.sin(a) * r + 2;
    if (Math.abs(x) < 6) continue;
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z);
    g.add(m(new THREE.CylinderGeometry(1.2, 1.0, 2, 16), MAT.mud, 0, 1.6, 0));
    g.add(m(new THREE.ConeGeometry(1.7, 1.6, 16), MAT.thatch, 0, 3.4, 0));
    for (let k = 0; k < 4; k++) g.add(m(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), MAT.wood, Math.cos(k * 1.57) * 0.8, 0.4, Math.sin(k * 1.57) * 0.8));
    add(g); W.occluders.push(g); W.walls.push({ id: 'granary', x, z, r: 1.3, y0: -5, y1: 5 });
  }
  const potGeo = new THREE.LatheGeometry([[0, 0], [0.35, 0.05], [0.5, 0.35], [0.42, 0.7], [0.22, 0.85], [0.26, 0.95]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
  for (let i = 0; i < 18; i++) {
    const h = L.HUTS[i % L.HUTS.length], a = rnd() * 6.28, x = h.x + Math.cos(a) * 4.4, z = h.z + Math.sin(a) * 4.4;
    add(m(potGeo, MAT.clay, x, heightAt(x, z), z)).scale.setScalar(0.8 + rnd() * 0.7);
  }

  // Story fire with Grandma.
  {
    const g = new THREE.Group(); g.position.set(L.FIRE.x, heightAt(L.FIRE.x, L.FIRE.z), L.FIRE.z);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; g.add(m(new THREE.DodecahedronGeometry(0.32, 0), MAT.stone, Math.cos(a) * 1.1, 0.15, Math.sin(a) * 1.1)); }
    for (let i = 0; i < 4; i++) { const l = m(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8), MAT.wood, 0, 0.25, 0); l.rotation.set(Math.PI / 2 - 0.3, i * 0.8, 0); g.add(l); }
    const fm = [new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.9 }), new THREE.MeshBasicMaterial({ color: '#ffd04a', transparent: true, opacity: 0.85 })];
    for (let i = 0; i < 5; i++) { const f = m(new THREE.ConeGeometry(0.35 - i * 0.04, 1.4 - i * 0.12, 8), fm[i % 2], (rnd() - 0.5) * 0.4, 0.8, (rnd() - 0.5) * 0.4, { cast: false }); g.add(f); W.flames.push(f); }
    const light = new THREE.PointLight('#ff9a40', 26, 26, 1.6); light.position.set(0, 1.6, 0); g.add(light); W.fireLight = light;
    add(g);
    // Seating logs around the fire.
    for (const a of [0.6, 2.2, 3.8, 5.2]) { const x = Math.cos(a) * 4, z = Math.sin(a) * 4 + L.FIRE.z; const lg = m(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 10), MAT.wood, x, heightAt(x, z) + 0.35, z); lg.rotation.set(0, -a, Math.PI / 2); add(lg); }
  }

  // Village baobab with weaver nests.
  function baobab(x, z, s = 1, nests = false) {
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z) - 0.2, z); g.scale.setScalar(s);
    const prof = [[2.6, 0], [3, 0.8], [2.9, 3], [2.5, 6], [2.1, 8], [1.5, 9.2], [0.4, 9.6]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(m(new THREE.LatheGeometry(prof, 22), MAT.bark));
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.28 + rnd(), br = new THREE.Group(); br.position.set(0, 8.6, 0); br.rotation.set(0.9 + rnd() * 0.4, a, 0);
      br.add(m(new THREE.CylinderGeometry(0.25, 0.55, 4, 7), MAT.bark, 0, 2, 0));
      const cl = m(new THREE.IcosahedronGeometry(1.6 + rnd(), 1), MAT.leaf, 0, 4.2, 0); cl.scale.y = 0.6; br.add(cl);
      if (nests && i % 2 === 0) { const n = m(new THREE.SphereGeometry(0.35, 8, 6), MAT.thatch, 0.3, 2.6, 0.4); n.scale.y = 1.5; br.add(n); }
      g.add(br);
    }
    add(g); W.occluders.push(g); return g;
  }
  baobab(L.VILLAGE_BAOBAB.x, L.VILLAGE_BAOBAB.z, 1, true);
  // Branch perch for Weaver Bird.
  const perch = m(new THREE.CylinderGeometry(0.15, 0.2, 3.4, 6), MAT.bark, -13, heightAt(-13, -8) + 3.1, -8); perch.rotation.z = 1.2; perch.rotation.y = 0.5; add(perch);

  // Market stalls and the tailor's loom.
  for (const s of L.STALLS) {
    const g = new THREE.Group(); g.position.set(s.x, heightAt(s.x, s.z), s.z); g.rotation.y = Math.atan2(-s.x, -(s.z)) ;
    for (const [px, pz] of [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]]) g.add(m(new THREE.CylinderGeometry(0.09, 0.09, 2.7, 6), MAT.wood, px, 1.35, pz));
    const ct = TX.cloth(s.cloth).clone(); ct.repeat.set(2, 1); ct.needsUpdate = true;
    const canopy = m(new THREE.BoxGeometry(3.8, 0.12, 2.8), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.8 }), 0, 2.75, 0); canopy.rotation.x = 0.12; g.add(canopy);
    g.add(m(new THREE.BoxGeometry(3.2, 0.12, 1.4), MAT.wood, 0, 0.95, 0.4));
    if (s.tailor) {
      for (let i = 0; i < 6; i++) { const names = ['adire', 'asooke', 'akwete', 'bogolan', 'ankara', 'kente']; const roll = m(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 12), new THREE.MeshStandardMaterial({ map: TX.cloth(names[i]) }), -1.3 + i * 0.52, 1.2, 0.4); roll.rotation.x = Math.PI / 2; g.add(roll); }
      const loom = new THREE.Group(); loom.position.set(0, 0, -0.9);
      for (const px of [-1, 1]) loom.add(m(new THREE.BoxGeometry(0.1, 2, 0.1), MAT.wood, px, 1, 0));
      loom.add(m(new THREE.BoxGeometry(2.1, 0.1, 0.1), MAT.wood, 0, 2, 0));
      const warp = m(new THREE.PlaneGeometry(1.8, 1.5), new THREE.MeshStandardMaterial({ map: TX.cloth('kente'), side: THREE.DoubleSide }), 0, 1.15, 0); loom.add(warp);
      g.add(loom);
      const sign = m(new THREE.BoxGeometry(1.8, 0.5, 0.06), MAT.gold, 0, 3.2, 1.2); g.add(sign);
    } else {
      for (let i = 0; i < 5; i++) { const f = m(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: ['#e2483a', '#f6d33c', '#5c9c3a', '#f08a24', '#7a3c1c'][i] }), -1 + i * 0.5, 1.15, 0.4); g.add(f); }
      g.add(m(potGeo, MAT.clay, 1.2, 1.0, 0.3));
    }
    add(g);
  }
  // Lantern strings (they glow in Story-time).
  const lanternGeo = new THREE.SphereGeometry(0.22, 10, 8);
  function lanternLine(ax, az, bx, bz, n, y0 = 4.2, base) {
    const ha = base ?? heightAt(ax, az), hb = base ?? heightAt(bx, bz);
    for (const [x, z, h] of [[ax, az, ha], [bx, bz, hb]]) add(m(new THREE.CylinderGeometry(0.08, 0.1, y0 + 0.3, 6), MAT.wood, x, h + (y0 + 0.3) / 2, z));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, sag = Math.sin(t * Math.PI) * 0.8;
      const l = m(lanternGeo, MAT.lantern, x, (ha + (hb - ha) * t) + y0 - sag, z, { cast: false }); add(l); W.lanterns.push(l);
    }
  }
  lanternLine(-9, 27, 9, 27, 9); lanternLine(-7, -16, 7, -16, 7); lanternLine(10, -6, 14, 14, 7);

  // ---------- River crossing ----------
  for (const p of W.platforms.filter(p => p.kind === 'stone')) {
    const s = m(new THREE.CylinderGeometry(p.r, p.r * 1.2, 3.5, 12), MAT.stone, p.x, p.top - 1.75, p.z); add(s);
  }
  for (let i = 0; i < 40; i++) { // reeds
    const x = (rnd() - 0.5) * 120, z = riverZ(x) + (rnd() > 0.5 ? 1 : -1) * (7.5 + rnd() * 1.5);
    const r = m(new THREE.CylinderGeometry(0.03, 0.05, 1.6 + rnd(), 4), MAT.leaf, x, heightAt(x, z) + 0.7, z, { cast: false }); r.rotation.z = (rnd() - 0.5) * 0.3; add(r);
  }
  const padMat = new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 0.6 });
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * 80, z = riverZ(x) + (rnd() - 0.5) * 10; add(m(new THREE.CylinderGeometry(0.5 + rnd() * 0.4, 0.5, 0.04, 12), padMat, x, WATER_Y + 0.03, z, { cast: false })); }

  // ---------- Savanna ----------
  function acacia(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(s); g.rotation.y = rnd() * 6;
    const t = m(new THREE.CylinderGeometry(0.18, 0.3, 4.2, 7), MAT.bark, 0.4, 2.1, 0); t.rotation.z = -0.2; g.add(t);
    for (let k = 0; k < 3; k++) { const c = m(new THREE.SphereGeometry(1.8 + rnd(), 12, 8), MAT.leafDry, 0.8 + (k - 1) * 1.4, 4.4 + rnd() * 0.3, (rnd() - 0.5) * 1.2); c.scale.y = 0.26; g.add(c); }
    add(g); W.walls.push({ id: 'tree', x: x + 0.4 * s, z, r: 0.4 * s, y0: -5, y1: 4 * s });
  }
  for (let i = 0; i < 34; i++) {
    const x = (rnd() - 0.5) * 170, z = -76 - rnd() * 70;
    if (distToRoute(x, z) < 5 || L.RINGS.some(r => Math.hypot(r.x - x, r.z - z) < 5) || Math.hypot(x - L.NPCS.hornbill.x, z - L.NPCS.hornbill.z) < 6) continue;
    acacia(x, z, 0.9 + rnd() * 0.7);
  }
  for (let i = 0; i < 10; i++) { const x = (i % 2 ? 1 : -1) * (30 + rnd() * 50), z = 10 - rnd() * 140; if (Math.abs(z - riverZ(x)) > 12) acacia(x, z, 1 + rnd() * 0.5); }
  baobab(-48, -112, 1.25); baobab(52, -88, 1.1); baobab(38, -138, 0.9); baobab(-42, 28, 1.1);
  const moundMat = new THREE.MeshStandardMaterial({ color: '#b5683d', roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const x = (rnd() - 0.5) * 140, z = -80 - rnd() * 65; if (distToRoute(x, z) < 4) continue;
    const h = 2 + rnd() * 3; const mnd = m(new THREE.ConeGeometry(0.9 + rnd() * 0.6, h, 9), moundMat, x, heightAt(x, z) + h / 2 - 0.1, z); add(mnd);
    W.walls.push({ id: 'mound', x, z, r: 1, y0: -5, y1: h });
  }
  // Hornbill's stump and the ring course.
  { const h = L.NPCS.hornbill; add(m(new THREE.CylinderGeometry(0.8, 1, 1.1, 12), MAT.bark, h.x, heightAt(h.x, h.z) + 0.5, h.z)); }
  const ringGeo = new THREE.TorusGeometry(2.1, 0.16, 10, 40);
  for (const r of L.RINGS) {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffd35a', emissive: '#ffae1a', emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.25 });
    const o = m(ringGeo, mat, r.x, r.y, r.z, { cast: false }); o.lookAt(L.RINGS[(L.RINGS.indexOf(r) + 1) % L.RINGS.length].x, r.y, L.RINGS[(L.RINGS.indexOf(r) + 1) % L.RINGS.length].z);
    add(o); W.rings.push({ ...r, mesh: o, mat });
  }

  // ---------- Harmattan Canyon ----------
  {
    const p = byId.pillar;
    const pil = m(new THREE.CylinderGeometry(p.r, p.r * 1.15, 52, 12), RUIN, p.x, p.top - 26, p.z); add(pil); p.mesh = pil;
    for (let k = 0; k < 3; k++) add(m(new THREE.TorusGeometry(p.r * 1.03, 0.12, 6, 20), RUIN, p.x, p.top - 0.6 - k * 1.2, p.z)).rotation.x = Math.PI / 2;
    const b = byId.bridge;
    const br = m(new THREE.BoxGeometry(b.w, 0.4, b.d), SPIRIT, b.x, b.top - 0.2, b.z, { cast: false }); add(br); b.mesh = br;
    for (const s of [-1, 1]) add(m(new THREE.BoxGeometry(0.15, 0.9, b.d), SPIRIT, b.x + s * b.w / 2, b.top + 0.45, b.z, { cast: false }));
    // Broken Now-time bridge stubs hint at the crossing.
    for (const z of [-214, -233]) add(m(new THREE.BoxGeometry(4.6, 0.6, 2.4), RUIN, canyonX(z), heightAt(canyonX(z), z) - 0.1, z + (z > -220 ? -1.5 : 1.5)));
  }
  // Ruins: arches and broken columns along the canyon (Now-time), spirit lanterns (Story-time).
  for (let i = 0; i < 10; i++) {
    const z = -158 - i * 9.5; if ((z < -179 && z > -196) || (z < -213 && z > -234)) continue;
    const side = i % 2 ? 1 : -1, x = canyonX(z) + side * 9;
    if (i % 3 === 0) {
      const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); g.rotation.y = side * 0.4;
      for (const s of [-1.6, 1.6]) g.add(m(new THREE.BoxGeometry(0.8, 4.2, 0.8), RUIN, s, 2.1, 0));
      g.add(m(new THREE.BoxGeometry(4.2, 0.7, 1), RUIN, 0, 4.4, 0)); add(g);
    } else {
      const h = 1.5 + rnd() * 3; add(m(new THREE.CylinderGeometry(0.6, 0.7, h, 10), RUIN, x, heightAt(x, z) + h / 2, z));
      W.walls.push({ id: 'ruin', x, z, r: 0.7, y0: -50, y1: heightAt(x, z) + h, layer: 'now' });
    }
    const sl = m(new THREE.OctahedronGeometry(0.4, 0), SPIRIT, canyonX(z) - side * 8, heightAt(canyonX(z) - side * 8, z) + 3, z, { cast: false }); add(sl); W.anims.push(t => { sl.rotation.y = t; sl.position.y += Math.sin(t * 2 + i) * 0.004; });
  }
  // Hoodoos along the rim.
  for (let i = 0; i < 22; i++) {
    const z = -150 - rnd() * 100, side = rnd() > 0.5 ? 1 : -1, x = canyonX(z) + side * (16 + rnd() * 10);
    const g = new THREE.Group(); let y = heightAt(x, z);
    g.position.set(x, y, z);
    let r = 1.4 + rnd(); for (let k = 0; k < 4; k++) { const hh = 1.5 + rnd() * 2; g.add(m(new THREE.CylinderGeometry(r * 0.8, r, hh, 9), MAT.rock, 0, k * 1.8 + hh / 2, 0)); r *= 0.8; }
    add(g); W.occluders.push(g);
  }

  // ---------- Eagle's Perch and the Sky Baobab ----------
  {
    const e = L.NPCS.eagle; const rk = m(new THREE.CylinderGeometry(1.4, 2, 2.6, 9), MAT.rock, e.x, heightAt(e.x, e.z) + 1.2, e.z); add(rk); W.occluders.push(rk);
    W.walls.push({ id: 'eaglerock', x: e.x, z: e.z, r: 1.6, y0: -5, y1: 11 });
    const B = L.BAOBAB;
    const prof = [[7.5, 0], [7, 2], [6, 6], [5.6, 14], [5.4, 24], [5.6, 32], [6.4, 38], [7.5, 41], [8.4, 42.6], [8.6, 43]].map(([a, b]) => new THREE.Vector2(a, b));
    const bark = MAT.bark.map.clone(); bark.repeat.set(4, 6); bark.needsUpdate = true;
    const trunk = m(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ map: bark, color: '#b8a690', roughness: 0.95 }), B.x, B.y - 0.4, B.z); add(trunk); W.occluders.push(trunk);
    for (let i = 0; i < L.PLANKS; i++) {
      const p = byId['plank' + i];
      const mat = p.layer === 'story' ? SPIRIT : p.layer === 'now' ? NOWWOOD : MAT.wood;
      const pl = m(new THREE.BoxGeometry(3.4, 0.35, 2.6), mat, p.x, p.top - 0.18, p.z, { cast: p.layer !== 'story' }); pl.rotation.y = p.angle; add(pl); p.mesh = pl;
      // Peg into the trunk.
      const peg = m(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 6), MAT.wood, B.x + Math.sin(p.angle) * 6.6, p.top - 0.5, B.z + Math.cos(p.angle) * 6.6); peg.rotation.set(Math.PI / 2, p.angle, 0, 'YXZ'); add(peg);
      if (p.sealed) { pl.visible = false; W.sealed.push(p); }
    }
    // Thorn seal around the base until Eagle opens the way.
    const seal = new THREE.Group();
    const thornMat = new THREE.MeshStandardMaterial({ color: '#2f3d1c', roughness: 0.8, emissive: '#3a0f5a', emissiveIntensity: 0.4 });
    for (let k = 0; k < 7; k++) { const t = m(new THREE.TorusGeometry(8 + k * 0.25, 0.25, 6, 40), thornMat, B.x, B.y + 0.6 + k * 0.9, B.z); t.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.2; seal.add(t); }
    for (let k = 0; k < 40; k++) { const a = k / 40 * 6.28; const sp = m(new THREE.ConeGeometry(0.12, 0.8, 5), thornMat, B.x + Math.sin(a) * 8.4, B.y + 1 + (k % 6) * 1.0, B.z + Math.cos(a) * 8.4); sp.rotation.z = Math.PI / 2; sp.rotation.y = a; seal.add(sp); }
    add(seal); W.seal = seal;
    // The crown: a woven platform ringed with leaves and lanterns.
    const cp = byId.crown;
    const crown = m(new THREE.CylinderGeometry(cp.r, cp.r - 0.6, 0.8, 40), MAT.thatch, cp.x, cp.top - 0.4, cp.z); add(crown);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.28; if (Math.cos(a) < 0.2) continue; // keep the Sky Road side open
      const cl = m(new THREE.IcosahedronGeometry(3 + rnd() * 1.5, 1), MAT.leaf, cp.x + Math.sin(a) * 12.5, cp.top + 1 + rnd() * 2, cp.z + Math.cos(a) * 12.5); cl.scale.y = 0.55; add(cl); W.occluders.push(cl);
    }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.2; const l = m(lanternGeo, MAT.lantern, cp.x + Math.sin(a) * 8.2, cp.top + 1.6, cp.z + Math.cos(a) * 8.2, { cast: false }); add(l); W.lanterns.push(l); add(m(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), MAT.wood, l.position.x, cp.top + 0.8, l.position.z)); }
  }

  // ---------- Sky Road and the Feast Palace ----------
  const isleTop = new THREE.CylinderGeometry(1, 1, 0.7, 24), isleRock = new THREE.ConeGeometry(1, 2.4, 9);
  for (const p of W.platforms.filter(p => p.kind === 'isle' || (p.kind === 'spirit' && p.id.startsWith('isle')))) {
    const g = new THREE.Group(); g.position.set(p.x, p.top, p.z);
    const story = p.layer === 'story';
    const top = m(isleTop, story ? SPIRIT : MAT.grassTop, 0, -0.35, 0, { cast: !story }); top.scale.set(p.r, 1, p.r); g.add(top);
    const under = m(isleRock, story ? SPIRIT : MAT.rock, 0, -0.7 - p.r * 1.2, 0, { cast: !story }); under.scale.set(p.r * 0.95, p.r, p.r * 0.95); under.rotation.x = Math.PI; g.add(under);
    if (!story) for (let k = 0; k < 3; k++) { const a = rnd() * 6.28; const b = m(new THREE.IcosahedronGeometry(0.5, 0), MAT.leaf, Math.cos(a) * p.r * 0.6, 0.3, Math.sin(a) * p.r * 0.6); g.add(b); }
    add(g); p.mesh = g;
  }
  {
    const P = L.PALACE, g = new THREE.Group(); g.position.set(P.x, P.y, P.z);
    g.add(m(new THREE.CylinderGeometry(P.r, P.r - 1, 2, 64), MAT.palace, 0, -1, 0));
    const ub = m(new THREE.ConeGeometry(P.r - 1, 26, 24), MAT.rock, 0, -15, 0); ub.rotation.x = Math.PI; g.add(ub);
    const rimRing = m(new THREE.TorusGeometry(P.r - 0.3, 0.35, 8, 80), MAT.gold, 0, 0.05, 0); rimRing.rotation.x = Math.PI / 2; g.add(rimRing);
    // Mosaic rings.
    for (const [r, c] of [[6, '#c0563a'], [11, '#f2c14e'], [17, '#2a6f73']]) { const ring = m(new THREE.RingGeometry(r - 0.4, r, 64), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), 0, 0.02, 0, { cast: false }); ring.rotation.x = -Math.PI / 2; g.add(ring); }
    add(g);
    for (const c of L.COLUMNS) {
      const cg = new THREE.Group(); cg.position.set(c.x, P.y, c.z);
      cg.add(m(new THREE.CylinderGeometry(0.75, 0.9, 7, 14), MAT.column, 0, 3.5, 0));
      cg.add(m(new THREE.BoxGeometry(2, 0.5, 2), MAT.gold, 0, 7.2, 0));
      cg.add(m(new THREE.SphereGeometry(0.9, 16, 10, 0, 6.28, 0, Math.PI / 2), MAT.dome, 0, 7.45, 0));
      const fl = m(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshStandardMaterial({ map: TX.cloth(['kente', 'adire', 'akwete', 'ankara'][L.COLUMNS.indexOf(c) % 4]), side: THREE.DoubleSide }), 0, 5, 0.95, { cast: false }); cg.add(fl);
      cg.lookAt(P.x, P.y, P.z); add(cg); W.occluders.push(cg);
    }
    // Feast tables laden with food the Shade has hoarded.
    const foodMats = ['#f3ead4', '#c23b22', '#e9b13b', '#5c9c3a', '#7a3c1c'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    for (let i = 0; i < 4; i++) {
      const t = byId['table' + i], tg = new THREE.Group(); tg.position.set(t.x, P.y, t.z); tg.rotation.y = t.rot;
      tg.add(m(new THREE.BoxGeometry(t.w, 0.2, t.d), MAT.wood, 0, 0.8, 0));
      for (const s of [-1, 1]) for (const s2 of [-1, 1]) tg.add(m(new THREE.BoxGeometry(0.2, 0.8, 0.2), MAT.wood, s * (t.w / 2 - 0.3), 0.4, s2 * (t.d / 2 - 0.3)));
      const runner = TX.cloth('kente').clone(); runner.repeat.set(3, 0.5); runner.needsUpdate = true;
      tg.add(m(new THREE.BoxGeometry(t.w * 0.9, 0.02, 0.7), new THREE.MeshStandardMaterial({ map: runner }), 0, 0.91, 0));
      for (let k = 0; k < 6; k++) { const b = m(new THREE.SphereGeometry(0.28, 14, 8, 0, 6.28, 0, Math.PI / 2), MAT.clay, -2.3 + k * 0.92, 0.92, 0); tg.add(b); const food = m(new THREE.SphereGeometry(0.22, 10, 8), foodMats[k % 5], -2.3 + k * 0.92, 1.05, 0); tg.add(food); }
      add(tg);
    }
    const feastLight = new THREE.PointLight('#ffcf7a', 30, 40, 1.4); feastLight.position.set(P.x, P.y + 9, P.z); add(feastLight); W.feastLight = feastLight;
  }

  // Updraft columns: rising motes show the warm winds.
  {
    const n = 220, g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3 * L.UPDRAFTS.length);
    L.UPDRAFTS.forEach((u, k) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * u.r; arr.set([u.x + Math.cos(a) * r, u.y0 + rnd() * (u.y1 - u.y0), u.z + Math.sin(a) * r], (k * n + i) * 3); } });
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pm = new THREE.PointsMaterial({ size: 0.35, map: TX.softDot('255,236,190'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe8b0', opacity: 0.25 });
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; add(pts); W.updraftPts = { pts, pm, n };
  }

  // ---------- Clouds ----------
  const cloudTex = TX.cloud();
  for (let i = 0; i < 60; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.85, fog: true, color: '#ffffff' }));
    const far = i < 34;
    const side = rnd() > 0.5 ? 1 : -1, x = far ? (rnd() - 0.5) * 400 : side * (34 + rnd() * 50), z = far ? -300 - rnd() * 300 : -280 - rnd() * 140, y = far ? -12 + rnd() * 20 : 20 + rnd() * 50;
    sp.position.set(x, y, z); sp.scale.set(40 + rnd() * 50, 18 + rnd() * 18, 1); add(sp);
  }
  for (let i = 0; i < 20; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.55, fog: false })); sp.position.set((rnd() - 0.5) * 500, 80 + rnd() * 60, 50 - rnd() * 500); sp.scale.set(90, 30, 1); add(sp); }

  // ---------- Ambient particles: fireflies (Story-time) and Harmattan dust (Now) ----------
  function cloudOfPoints(n, fn, colour, size, tex) {
    const g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set(fn(i), i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const pm = new THREE.PointsMaterial({ size, map: tex, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const p = new THREE.Points(g, pm); p.frustumCulled = false; add(p); return { p, pm, base: a.slice() };
  }
  W.fireflies = cloudOfPoints(700, () => { const x = (rnd() - 0.5) * 160, z = 40 - rnd() * 300; return [x, heightAt(x, z) + 0.5 + rnd() * 3, z]; }, '#c6ff7a', 0.5, TX.softDot('200,255,140'));
  W.dust = cloudOfPoints(900, () => { const z = -140 - rnd() * 140, x = canyonX(z) + (rnd() - 0.5) * 30; return [x, heightAt(x, z) + rnd() * 9, z]; }, '#ffd2a0', 0.28, TX.softDot('255,214,170'));

  // ---------- Flocks ----------
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.4, -1, 0.15, -0.2, 0, 0, -0.1, 0, 0, 0.4, 0, 0, -0.1, 1, 0.15, -0.2], 3)); birdGeo.computeVertexNormals();
  const birdMat = new THREE.MeshBasicMaterial({ color: '#2a1d18', side: THREE.DoubleSide });
  W.flock = [];
  for (let f = 0; f < 4; f++) for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(birdGeo, birdMat); b.scale.setScalar(0.9); add(b);
    W.flock.push({ b, f, i, cx: [0, -30, 20, 0][f], cz: [-20, -110, -200, -320][f], cy: [24, 30, 40, 70][f], r: 18 + f * 4 });
  }

  // ---------- Checkpoint drums ----------
  const cpWood = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.7 });
  CHECKPOINTS.forEach((c, i) => {
    const y = c.y ?? heightAt(c.x, c.z);
    const g = new THREE.Group(); g.position.set(c.x + 2.4, y, c.z);
    g.add(m(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), cpWood, 0, 1.1, 0));
    const dp = [[0.42, -0.5], [0.3, -0.2], [0.22, 0], [0.3, 0.2], [0.42, 0.5]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(m(new THREE.LatheGeometry(dp, 18), cpWood, 0, 2.6, 0));
    const skin = new THREE.MeshStandardMaterial({ color: '#e7d2a8', emissive: '#ffb02e', emissiveIntensity: 0 });
    g.add(m(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 18), skin, 0, 3.12, 0));
    const flag = m(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshStandardMaterial({ map: TX.cloth('adire'), side: THREE.DoubleSide }), 0.55, 1.9, 0, { cast: false }); g.add(flag);
    const ringM = new THREE.MeshBasicMaterial({ color: '#ffd35a', transparent: true, opacity: 0, map: TX.ring(), depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = m(new THREE.PlaneGeometry(4, 4), ringM, 0, 0.06, 0, { cast: false }); ring.rotation.x = -Math.PI / 2; g.add(ring);
    add(g); W.checkpoints.push({ ...c, y, i, group: g, skin, ringM, flag });
  });

  // ---------- Pickups ----------
  const cowGeo = new THREE.SphereGeometry(0.28, 14, 10); cowGeo.scale(1, 0.62, 1.4);
  const cowMat = new THREE.MeshPhysicalMaterial({ color: '#fff4dc', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#6b5020', emissiveIntensity: 0.12 });
  const cowStoryMat = layered(new THREE.MeshStandardMaterial({ color: '#bff3ff', emissive: '#4fd2ff', emissiveIntensity: 1.4, opacity: 0.15 }), 'story');
  const cowries = L.buildCowries(W.platforms);
  const both = cowries.filter(c => c.layer !== 'story'), story = cowries.filter(c => c.layer === 'story');
  W.cowryMesh = { both: new THREE.InstancedMesh(cowGeo, cowMat, both.length), story: new THREE.InstancedMesh(cowGeo, cowStoryMat, story.length) };
  both.forEach((c, i) => { c.mesh = W.cowryMesh.both; c.idx = i; });
  story.forEach((c, i) => { c.mesh = W.cowryMesh.story; c.idx = i; });
  for (const im of Object.values(W.cowryMesh)) { im.frustumCulled = false; im.castShadow = true; add(im); }
  W.cowries = cowries;

  const threadMat = new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#ff9d00', emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 });
  const threadStory = layered(new THREE.MeshStandardMaterial({ color: '#ffe48a', emissive: '#ffb000', emissiveIntensity: 1.4, opacity: 0.15 }), 'story');
  for (const t of L.THREADS) {
    const y = (t.top ? byId[t.top].top : heightAt(t.x, t.z)) + t.add;
    const g = new THREE.Group(); g.position.set(t.x, y, t.z);
    const mat = t.layer === 'story' ? threadStory : threadMat;
    g.add(m(new THREE.TorusKnotGeometry(0.28, 0.07, 64, 8, 2, 3), mat, 0, 0, 0, { cast: false }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot('255,200,80'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 })); glow.scale.setScalar(1.8); g.add(glow);
    add(g); W.threads.push({ ...t, y, group: g, layer: t.layer || 'both' });
  }
  L.TALE_STONES.forEach((t, i) => {
    const y = t.top ? byId[t.top].top : heightAt(t.x, t.z);
    const g = new THREE.Group(); g.position.set(t.x, y, t.z);
    const mat = t.layer === 'story' ? spiritMat() : MAT.stone;
    const st = m(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 5), mat, 0, 1.2, 0); g.add(st);
    const gm = new THREE.MeshBasicMaterial({ map: TX.glyph(i), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffd77a' });
    const glyph = m(new THREE.PlaneGeometry(1.2, 1.2), gm, 0, 3.1, 0, { cast: false }); g.add(glyph);
    add(g); W.tales.push({ ...t, i, y, group: g, glyph, gm, layer: t.layer || 'both' });
  });
  const kolaMat = new THREE.MeshStandardMaterial({ color: '#b2452c', roughness: 0.45 }), kolaLeaf = new THREE.MeshStandardMaterial({ color: '#4f8a2a', side: THREE.DoubleSide });
  for (const k of L.KOLA) {
    const y = (k.top ? byId[k.top].top : heightAt(k.x, k.z)) + 0.8;
    const g = new THREE.Group(); g.position.set(k.x, y, k.z);
    for (const s of [-1, 1]) { const h = m(new THREE.SphereGeometry(0.22, 12, 8), kolaMat, s * 0.12, 0, 0); h.scale.set(0.8, 1, 1); g.add(h); }
    const lf = m(new THREE.CircleGeometry(0.35, 6), kolaLeaf, 0, 0.22, -0.1, { cast: false }); lf.rotation.x = -0.8; g.add(lf);
    add(g); W.kola.push({ ...k, y, group: g, taken: 0 });
  }

  // ---------- NPCs ----------
  const N = L.NPCS;
  const place = (mdl, x, z, lookX, lookZ, dy = 0) => { mdl.root.position.set(x, heightAt(x, z) + dy, z); mdl.root.rotation.y = Math.atan2(lookX - x, lookZ - z); mdl.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); add(mdl.root); return mdl; };
  const grandma = place(makeGrandma(), N.grandma.x, N.grandma.z, L.FIRE.x, L.FIRE.z);
  const tailor = place(makeNgozi(), N.tailor.x, N.tailor.z, 0, 0);
  const mama = place(makeMamaNkem(), N.mama.x, N.mama.z, 0, -2);
  const weaver = makeBird({ body: '#f2c21b', wing: '#b88a10', belly: '#fff0a0', beak: '#2b1d0e', size: 0.85 });
  weaver.root.position.set(-13, heightAt(-13, -8) + 3.3, -8); weaver.root.rotation.y = 0.6; add(weaver.root);
  const hornbill = makeBird({ body: '#1d1d1f', wing: '#151515', belly: '#f4f1ea', beak: '#f2c21b', size: 1.6, hornbill: true });
  hornbill.root.position.set(N.hornbill.x, heightAt(N.hornbill.x, N.hornbill.z) + 1.05, N.hornbill.z); hornbill.root.rotation.y = -2.2; add(hornbill.root);
  const eagle = makeBird({ body: '#6b4423', wing: '#4a2e17', belly: '#f2efe6', beak: '#f2c21b', size: 2.1, crest: '#f2efe6' });
  eagle.root.position.set(N.eagle.x, heightAt(N.eagle.x, N.eagle.z) + 2.5, N.eagle.z); eagle.root.rotation.y = 2.4; add(eagle.root);
  W.npcs = { grandma, tailor, mama, weaver, hornbill, eagle };
  const villagerLooks = {
    chidi: () => makeHuman({ kind: 'man', skin: '#6a3c22', hair: 'short', hairColor: '#17110d', top: { tex: 'kente', repeat: [2, 1] }, bottom: { type: 'trousers', color: '#2e2a3a' }, shoes: '#3a2416' }),
    funke: () => makeHuman({ kind: 'woman', skin: '#7a4a2e', hair: 'gele', gele: { tex: 'ankara' }, top: { tex: 'ankara', repeat: [2, 1] }, bottom: { type: 'wrapperLong', tex: 'ankara' }, shoes: '#d84a3a', acc: 'beads' }),
    kelechi: () => makeKid({ top: { color: '#f2c21b' }, bottom: { type: 'shorts', color: '#2f3d6b' } }),
  };
  W.villagers = L.VILLAGERS.map(v => {
    const t = villagerLooks[v.id](); t.root.position.set(v.x, heightAt(v.x, v.z), v.z); t.root.rotation.y = rnd() * 6;
    t.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); add(t.root);
    return { ...v, model: t, home: { x: v.x, z: v.z }, phase: rnd() * 6 };
  });

  // ---------- Amara's mirror and Papa's forge ----------
  {
    const g = new THREE.Group(); g.position.set(L.MIRROR.x, heightAt(L.MIRROR.x, L.MIRROR.z), L.MIRROR.z); g.rotation.y = 0.5;
    g.add(m(new THREE.BoxGeometry(1.1, 1.9, 0.1), MAT.wood, 0, 1.15, 0));
    g.add(m(new THREE.PlaneGeometry(0.9, 1.65), new THREE.MeshStandardMaterial({ color: '#cfe6ff', metalness: 1, roughness: 0.05, envMapIntensity: 1.6 }), 0, 1.15, 0.06, { cast: false }));
    for (const sx of [-0.4, 0.4]) g.add(m(new THREE.BoxGeometry(0.08, 0.3, 0.5), MAT.wood, sx, 0.15, 0));
    const frameTex = TX.cloth('kente').clone(); frameTex.repeat.set(1, 3); frameTex.needsUpdate = true;
    g.add(m(new THREE.BoxGeometry(1.2, 0.12, 0.14), new THREE.MeshStandardMaterial({ map: frameTex }), 0, 2.12, 0));
    add(g); W.walls.push({ id: 'mirror', x: L.MIRROR.x, z: L.MIRROR.z, r: 0.6, y0: -5, y1: 3 });
  }
  {
    const F = L.FORGE_SPOT, g = new THREE.Group(); g.position.set(F.x, heightAt(F.x, F.z), F.z); g.rotation.y = Math.atan2(-F.x, -F.z);
    for (const [px, pz] of [[-1.7, -1.2], [1.7, -1.2], [-1.7, 1.2], [1.7, 1.2]]) g.add(m(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 6), MAT.wood, px, 1.4, pz));
    const roof = m(new THREE.ConeGeometry(2.8, 1.2, 4, 1), MAT.thatch, 0, 3.3, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
    const iron = new THREE.MeshStandardMaterial({ color: '#3b3b42', metalness: 0.85, roughness: 0.35 });
    g.add(m(new THREE.BoxGeometry(0.5, 0.5, 0.4), MAT.wood, 0.6, 0.25, 0.3)); g.add(m(new THREE.BoxGeometry(0.8, 0.22, 0.32), iron, 0.6, 0.62, 0.3));
    g.add(m(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 14), MAT.stone, -0.8, 0.25, -0.2));
    const glow = m(new THREE.CircleGeometry(0.5, 14), new THREE.MeshBasicMaterial({ color: '#ff7a1a' }), -0.8, 0.52, -0.2, { cast: false }); glow.rotation.x = -Math.PI / 2; g.add(glow);
    g.add(m(new THREE.BoxGeometry(1.6, 0.45, 0.06), MAT.gold, 0, 2.5, 1.25));
    add(g); W.walls.push({ id: 'forge', x: F.x, z: F.z, r: 1.6, y0: -5, y1: 3 });
  }

  // ---------- Drum riddle ----------
  const drumWood = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.6 });
  const cordMat = new THREE.MeshStandardMaterial({ color: '#efe1c4' });
  const drumProfile = [[0.55, 0], [0.62, 0.3], [0.5, 0.65], [0.6, 0.95]].map(([a, b]) => new THREE.Vector2(a, b));
  W.drumStones = L.DRUM_STONES.map(d => {
    const y = heightAt(d.x, d.z), g = new THREE.Group(); g.position.set(d.x, y, d.z);
    g.add(m(new THREE.LatheGeometry(drumProfile, 18), drumWood));
    const skin = new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.15, roughness: 0.4 });
    g.add(m(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20), skin, 0, 0.97, 0));
    add(g); W.walls.push({ id: d.id, x: d.x, z: d.z, r: 0.65, y0: -5, y1: y + 0.95 });
    W.platforms.push({ id: d.id, layer: 'both', shape: 'cyl', x: d.x, z: d.z, r: 0.6, top: y + 0.98, kind: 'drum' });
    return { ...d, group: g, skin, y };
  });
  {
    const D = L.DRUM_CIRCLE, y = heightAt(D.x, D.z), g = new THREE.Group(); g.position.set(D.x, y, D.z);
    const tall = [[0.45, 0], [0.5, 0.6], [0.32, 1.1], [0.5, 1.7]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(m(new THREE.LatheGeometry(tall, 20), drumWood));
    const skin = new THREE.MeshStandardMaterial({ color: '#e7d2a8', emissive: '#ffb02e', emissiveIntensity: 0.1 });
    g.add(m(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), skin, 0, 1.72, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.add(m(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 3), cordMat, Math.cos(a) * 0.4, 0.85, Math.sin(a) * 0.4, { cast: false })); }
    add(g); W.walls.push({ id: 'elderdrum', x: D.x, z: D.z, r: 0.6, y0: -5, y1: y + 2 });
    W.elderDrum = { ...D, group: g, skin, y };
  }

  // ---------- Chests ----------
  const chestWood = new THREE.MeshStandardMaterial({ color: '#7a4a24', roughness: 0.6 });
  W.chests = {};
  for (const c of L.CHESTS) {
    const lift = L.LIFTS.find(l => l.id === c.id);
    const x = c.x ?? lift.x, z = c.z ?? lift.z, y = lift ? lift.top : heightAt(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rnd() * 6;
    g.add(m(new THREE.BoxGeometry(0.9, 0.5, 0.6), chestWood, 0, 0.25, 0));
    for (const sx of [-0.35, 0.35]) g.add(m(new THREE.BoxGeometry(0.08, 0.52, 0.62), MAT.gold, sx, 0.26, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3);
    const lidMesh = m(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16, 1, false, 0, Math.PI), chestWood, 0, 0, 0.3); lidMesh.rotation.z = Math.PI / 2; lid.add(lidMesh);
    lid.add(m(new THREE.BoxGeometry(0.12, 0.12, 0.06), MAT.gold, 0, 0.05, 0.6));
    g.add(lid);
    const shine = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot('255,214,120'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); shine.scale.setScalar(2.4); shine.position.y = 0.6; g.add(shine);
    add(g); W.chests[c.id] = { ...c, x, y, z, group: g, lid, shine, opened: false };
    if (!lift) W.walls.push({ id: 'chest', x, z, r: 0.5, y0: -5, y1: y + 0.6 });
  }

  // ---------- Canyon gate and pressure plates ----------
  {
    const G = L.GATE, gy = heightAt(G.x, G.z);
    const g = new THREE.Group(); g.position.set(G.x, gy, G.z);
    const doorMat = new THREE.MeshStandardMaterial({ map: TX.rock(), color: '#c48a5a', roughness: 0.85 });
    const doors = [];
    for (const sx of [-1, 1]) { const d = m(new THREE.BoxGeometry(G.half, 9, 1.4), doorMat, sx * G.half / 2, 4.5, 0); g.add(d); doors.push(d); }
    for (let i = 0; i < 2; i++) { const glyphM = new THREE.MeshBasicMaterial({ map: TX.glyph(i + 2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffcf6b' }); doors[i].add(m(new THREE.PlaneGeometry(2.4, 2.4), glyphM, (i ? -1 : 1) * 3, 0.5, 0.72, { cast: false })); }
    add(g); W.gate = { ...G, group: g, doors, y: gy, open: 0 };
    W.plates = G.plates.map(p => {
      const y = heightAt(p.x, p.z);
      const mat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', emissive: '#ffb02e', emissiveIntensity: 0, roughness: 0.6 });
      add(m(new THREE.CylinderGeometry(1.3, 1.4, 0.2, 24), mat, p.x, y + 0.05, p.z, { cast: false }));
      const ring = m(new THREE.RingGeometry(1.0, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0.6 }), p.x, y + 0.17, p.z, { cast: false }); ring.rotation.x = -Math.PI / 2; add(ring);
      return { ...p, y, mat };
    });
  }

  // ---------- Papa-lift pillars ----------
  for (const l of L.LIFTS) {
    const base = heightAt(l.x, l.z), h = l.top - base + 6;
    add(m(new THREE.CylinderGeometry(1.75, 2.1, h, 10), MAT.rock, l.x, l.top - h / 2, l.z));
    add(m(new THREE.CylinderGeometry(1.95, 1.95, 0.25, 16), MAT.grassTop, l.x, l.top - 0.12, l.z));
    for (let k = 0; k < 3; k++) { const rope = m(new THREE.TorusGeometry(1.85, 0.05, 5, 24), MAT.thatch, l.x, base + 1.2 + k * 1.4, l.z); rope.rotation.x = Math.PI / 2; add(rope); }
  }

  // ---------- Hidden treasure and errand items ----------
  W.digs = L.DIG_SPOTS.map(d => {
    const y = heightAt(d.x, d.z);
    const mound = m(new THREE.SphereGeometry(0.7, 12, 6, 0, 6.28, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 1 }), d.x, y - 0.05, d.z); mound.scale.y = 0.35; add(mound);
    const beam = m(new THREE.CylinderGeometry(0.35, 0.35, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), d.x, y + 7, d.z, { cast: false });
    beam.visible = false; add(beam);
    return { ...d, y, mound, beam, revealed: 0, dug: false };
  });
  {
    const b = L.ERRANDS.ball.item, y = heightAt(b.x, b.z) + 0.3;
    const ball = m(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5, flatShading: true }), b.x, y, b.z); add(ball);
    const patchMat = new THREE.MeshStandardMaterial({ color: '#1b1b1b', side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.6, Math.sin(a + 1) * 0.5).normalize(); const pt = m(new THREE.CircleGeometry(0.1, 5), patchMat, dir.x * 0.3, dir.y * 0.3, dir.z * 0.3, { cast: false }); pt.lookAt(dir.multiplyScalar(2)); ball.add(pt); }
    W.ball = { ...b, y, mesh: ball, taken: false };
  }

  // ---------- Per-frame world update ----------
  const dummy = new THREE.Object3D();
  W.update = (dt, t, weave, cam) => {
    U.uTime.value = t; U.uWeave.value = weave;
    sky.position.copy(cam.position);
    for (const mat of W.layerMats.story) { mat.opacity = 0.08 + 0.84 * weave; mat.depthWrite = weave > 0.5; }
    for (const mat of W.layerMats.now) { mat.opacity = 1 - 0.85 * weave; mat.depthWrite = weave < 0.5; }
    for (const f of W.flames) { f.scale.set(1 + Math.sin(t * 17 + f.id) * 0.12, 1 + Math.sin(t * 11 + f.id * 3) * 0.25, 1); }
    W.fireLight.intensity = 22 + Math.sin(t * 13) * 4 + Math.sin(t * 7.3) * 3 + weave * 14;
    for (const l of W.lanterns) l.material.emissiveIntensity = 0.5 + weave * 2.6;
    W.fireflies.pm.opacity = weave * 0.95; W.dust.pm.opacity = (1 - weave) * 0.55;
    const fa = W.fireflies.p.geometry.attributes.position, fb = W.fireflies.base;
    if (weave > 0.02) { for (let i = 0; i < fa.count; i++) { fa.array[i * 3] = fb[i * 3] + Math.sin(t * 0.7 + i) * 0.8; fa.array[i * 3 + 1] = fb[i * 3 + 1] + Math.sin(t * 1.3 + i * 1.7) * 0.4; } fa.needsUpdate = true; }
    const da = W.dust.p.geometry.attributes.position, db = W.dust.base;
    if (weave < 0.98) { for (let i = 0; i < da.count; i++) { da.array[i * 3] = db[i * 3] + ((t * 3 + i * 7) % 30) - 15; } da.needsUpdate = true; }
    const ua = W.updraftPts.pts.geometry.attributes.position;
    for (let i = 0; i < ua.count; i++) { const u = L.UPDRAFTS[Math.floor(i / W.updraftPts.n)]; let y = ua.array[i * 3 + 1] + dt * 6; if (y > u.y1) y = u.y0; ua.array[i * 3 + 1] = y; }
    ua.needsUpdate = true;
    for (const fl of W.flock) {
      const a = t * 0.18 + fl.i * 0.25 + fl.f * 2; const r = fl.r + Math.sin(fl.i) * 3;
      fl.b.position.set(fl.cx + Math.cos(a) * r, fl.cy + Math.sin(t + fl.i) * 1.5 + fl.i * 0.4, fl.cz + Math.sin(a) * r);
      fl.b.rotation.set(0, -a, Math.sin(t * 12 + fl.i) * 0.5); fl.b.scale.y = 0.6 + Math.abs(Math.sin(t * 12 + fl.i)) * 0.8;
    }
    // Pickups spin and bob.
    for (const c of W.cowries) {
      if (c.taken) { dummy.scale.setScalar(0); }
      else { dummy.position.set(c.x, c.y + Math.sin(t * 2.5 + c.x) * 0.15, c.z); dummy.rotation.set(0.5, t * 2 + c.z, 0); dummy.scale.setScalar(1); }
      dummy.updateMatrix(); c.mesh.setMatrixAt(c.idx, dummy.matrix);
    }
    W.cowryMesh.both.instanceMatrix.needsUpdate = true; W.cowryMesh.story.instanceMatrix.needsUpdate = true;
    for (const th of W.threads) if (th.group.visible) { th.group.rotation.y = t * 1.6; th.group.position.y = th.y + Math.sin(t * 2) * 0.2; }
    for (const ts of W.tales) { ts.glyph.lookAt(cam.position); ts.glyph.position.y = 3.1 + Math.sin(t * 1.5 + ts.i) * 0.15; ts.gm.opacity = ts.taken ? 0.15 : (ts.layer === 'story' ? weave : 0.9); }
    for (const k of W.kola) { if (k.taken > 0) { k.taken -= dt; k.group.visible = k.taken <= 0; } k.group.rotation.y = t; }
    for (const a of W.anims) a(t, dt);
  };

  W.setGrassDensity = f => { grass.count = Math.floor(grass.userData.max * f); };
  return W;
}
