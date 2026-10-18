// Procedural canvas textures: textiles, shells, walls and soft sprites. No external image assets.
import * as THREE from 'three';

const cache = new Map();
let rng = 1;
const rand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };

function make(key, w, h, draw, { srgb = true, repeat = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); rng = 7 + key.length * 131;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4; t.userData.canvas = c;
  cache.set(key, t); return t;
}

const PAT = {
  adire(g, w, h) {
    g.fillStyle = '#1d2c66'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s, cx = x + s / 2, cy = y + s / 2;
      g.strokeStyle = 'rgba(205,220,250,.85)'; g.fillStyle = 'rgba(205,220,250,.85)'; g.lineWidth = 3;
      if ((i + j) % 2 === 0) {
        for (let r = s * .12; r < s * .45; r += s * .1) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
      } else {
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + 6, y + 10 + k * s / 4.5); for (let t = 0; t <= s - 12; t += 6) g.lineTo(x + 6 + t, y + 10 + k * s / 4.5 + Math.sin(t / 6) * 3); g.stroke(); }
      }
      g.strokeStyle = 'rgba(205,220,250,.35)'; g.lineWidth = 1.5; g.strokeRect(x + 2, y + 2, s - 4, s - 4);
    }
    g.globalAlpha = .12; for (let i = 0; i < 900; i++) { g.fillStyle = rand() > .5 ? '#fff' : '#0a1435'; g.fillRect(rand() * w, rand() * h, 2, 2); } g.globalAlpha = 1;
  },
  asooke(g, w, h) {
    const cols = ['#7a1f4b', '#d8a531', '#1f5a47', '#f1e3c4', '#7a1f4b', '#2b2340'];
    let y = 0; let k = 0;
    while (y < h) { const t = [18, 6, 12, 3, 22, 8][k % 6]; g.fillStyle = cols[k % cols.length]; g.fillRect(0, y, w, t); y += t; k++; }
    g.globalAlpha = .25; g.fillStyle = '#000'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    g.globalAlpha = .55; g.fillStyle = '#f6d66a'; for (let x = 8; x < w; x += 32) for (let yy = 0; yy < h; yy += 16) g.fillRect(x, yy, 6, 3); g.globalAlpha = 1;
  },
  akwete(g, w, h) {
    g.fillStyle = '#b52c26'; g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      g.fillStyle = ((x + y) / s) % 2 ? '#1b1b1f' : '#f0b630';
      g.beginPath(); g.moveTo(x + s / 2, y + 3); g.lineTo(x + s - 3, y + s / 2); g.lineTo(x + s / 2, y + s - 3); g.lineTo(x + 3, y + s / 2); g.closePath(); g.fill();
      g.fillStyle = '#f7eedd'; g.fillRect(x + s / 2 - 2, y + s / 2 - 2, 4, 4);
    }
    g.fillStyle = '#1b1b1f'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 4);
  },
  bogolan(g, w, h) {
    g.fillStyle = '#4a2e1b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#efe2c4'; g.fillStyle = '#efe2c4'; g.lineWidth = 3;
    const s = 64;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const kind = ((x / s) + (y / s) * 3) % 4;
      g.strokeRect(x + 4, y + 4, s - 8, s - 8);
      if (kind === 0) { g.beginPath(); for (let i = 0; i < 6; i++) { g.lineTo(x + 8 + i * 9, y + (i % 2 ? 20 : 44)); } g.stroke(); }
      if (kind === 1) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + 14 + i * 12, y + 14 + j * 12, 2.6, 0, 7); g.fill(); }
      if (kind === 2) { g.beginPath(); g.moveTo(x + 10, y + 32); g.lineTo(x + 54, y + 32); g.moveTo(x + 32, y + 10); g.lineTo(x + 32, y + 54); g.stroke(); g.strokeRect(x + 22, y + 22, 20, 20); }
      if (kind === 3) { for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + 8, y + 10 + i * 10); g.lineTo(x + 56, y + 10 + i * 10); g.stroke(); } }
    }
  },
  ankara(g, w, h) {
    g.fillStyle = '#f08a24'; g.fillRect(0, 0, w, h);
    const cols = ['#0f7b78', '#6b2b7a', '#f6d34a', '#c3262f', '#ffffff'];
    for (let y = 0; y < h + 40; y += 64) for (let x = (y / 64) % 2 * 32; x < w + 40; x += 64) {
      for (let r = 28, k = 0; r > 4; r -= 6, k++) { g.fillStyle = cols[(k + x / 32) % cols.length | 0]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    }
    g.fillStyle = '#1b1b1b'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rand() * w, rand() * h, 2 + rand() * 2, 0, 7); g.fill(); }
  },
  kente(g, w, h) {
    const s = 32, cols = ['#f2b705', '#0b7a3e', '#c1121f', '#141414'];
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const k = ((x / s) * 7 + (y / s) * 3) % 4;
      g.fillStyle = cols[k]; g.fillRect(x, y, s, s);
      g.fillStyle = cols[(k + 1) % 4];
      if ((x / s + y / s) % 2) for (let i = 4; i < s; i += 8) g.fillRect(x, y + i, s, 3);
      else for (let i = 4; i < s; i += 8) g.fillRect(x + i, y, 3, s);
    }
  },
};
for (const k of ['gele', 'fila', 'bucket', 'cloth']) PAT[k] = PAT.asooke;

export function cloth(name) { return make('cloth-' + name, 256, 256, PAT[name] || PAT.adire); }
export function clothSwatch(name) { return cloth(name).userData.canvas.toDataURL(); }

export function shell(kind = 'natural') {
  return make('shell-' + kind, 512, 256, (g, w, h) => {
    const base = { natural: ['#6b5532', '#8a7040'], uli: ['#e8dcc0', '#d9c9a4'], gold: ['#4a3a24', '#5c4a2c'], star: ['#151a3d', '#222a5c'] }[kind] || ['#6b5532', '#8a7040'];
    g.fillStyle = base[0]; g.fillRect(0, 0, w, h);
    // Scutes: hexagon-ish plates across the dome.
    const rows = 4, cols = 8;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = (c + (r % 2) * .5) * w / cols, cy = (r + .5) * h / rows, R = w / cols * .46;
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * .85); } g.closePath();
      g.fillStyle = base[1]; g.fill();
      g.lineWidth = 5; g.strokeStyle = kind === 'uli' ? '#bfa77a' : 'rgba(0,0,0,.35)'; g.stroke();
      if (kind === 'natural' || kind === 'gold') { g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,240,200,.18)'; for (let k = 1; k < 3; k++) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * R * k / 3, cy + Math.sin(a) * R * .85 * k / 3); } g.closePath(); g.stroke(); } }
      if (kind === 'uli') { g.strokeStyle = '#1d1b18'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R * .45, 0, Math.PI * 1.5); g.stroke(); g.beginPath(); g.moveTo(cx - R * .6, cy + R * .5); g.quadraticCurveTo(cx, cy - R * .2, cx + R * .6, cy + R * .5); g.stroke(); g.fillStyle = '#1d1b18'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx - R * .3 + i * R * .3, cy - R * .5, 2.5, 0, 7); g.fill(); } }
      if (kind === 'star') { g.fillStyle = '#c9d6ff'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(cx + (rand() - .5) * R, cy + (rand() - .5) * R, rand() * 2 + .6, 0, 7); g.fill(); } }
    }
    // The mended cracks of the old tale.
    g.strokeStyle = kind === 'gold' ? '#ffcf4a' : kind === 'star' ? '#7fe9ff' : kind === 'uli' ? '#7b5b34' : '#e2b95a';
    g.lineWidth = kind === 'gold' ? 4 : 2.5;
    for (let k = 0; k < 9; k++) {
      let x = rand() * w, y = rand() * h; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 7; i++) { x += (rand() - .5) * 60; y += (rand() - .3) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  });
}
export function mudWall() {
  return make('mud', 512, 128, (g, w, h) => {
    g.fillStyle = '#b9804c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${90 + rand() * 60},${50 + rand() * 30},${20 + rand() * 20},.18)`; g.fillRect(rand() * w, rand() * h, 3 + rand() * 6, 2 + rand() * 4); }
    // Painted band of triangles and lozenges.
    const y = h * .58;
    g.fillStyle = '#efe0c2'; g.fillRect(0, y, w, 24);
    for (let x = 0; x < w; x += 24) { g.fillStyle = (x / 24) % 2 ? '#2a1d17' : '#9e2f22'; g.beginPath(); g.moveTo(x, y + 24); g.lineTo(x + 12, y + 2); g.lineTo(x + 24, y + 24); g.fill(); }
    g.fillStyle = '#2a1d17'; g.fillRect(0, y - 4, w, 3); g.fillRect(0, y + 26, w, 3);
    for (let x = 12; x < w; x += 48) { g.strokeStyle = '#efe0c2'; g.lineWidth = 3; g.beginPath(); g.arc(x, h * .3, 10, 0, 7); g.stroke(); }
  });
}

export function thatch() {
  return make('thatch', 256, 256, (g, w, h) => {
    g.fillStyle = '#b08d4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { const x = rand() * w, y = rand() * h; g.strokeStyle = `hsl(${38 + rand() * 12},${45 + rand() * 20}%,${30 + rand() * 30}%)`; g.lineWidth = 1 + rand(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - .5) * 4, y + 14 + rand() * 18); g.stroke(); }
    g.fillStyle = 'rgba(60,40,15,.5)'; for (let y = 30; y < h; y += 52) g.fillRect(0, y, w, 4);
  });
}

export function bark() {
  return make('bark', 256, 512, (g, w, h) => {
    g.fillStyle = '#8c7a68'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = rand() * w; g.strokeStyle = `rgba(${50 + rand() * 40},${40 + rand() * 30},${30 + rand() * 25},.55)`; g.lineWidth = 2 + rand() * 4; g.beginPath(); g.moveTo(x, rand() * h); g.bezierCurveTo(x + (rand() - .5) * 20, rand() * h, x + (rand() - .5) * 20, rand() * h, x + (rand() - .5) * 10, rand() * h); g.stroke(); }
  });
}

// Tightly coiled hair: a near-white base so the material colour tints it.
export function hair() {
  return make('hair', 256, 256, (g, w, h) => {
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * w, y = rand() * h, r = 1.5 + rand() * 3.5, v = rand() > 0.5 ? 255 : 70;
      g.strokeStyle = `rgba(${v},${v},${v},${0.35 + rand() * 0.4})`; g.lineWidth = 1 + rand() * 1.2;
      g.beginPath(); g.arc(x, y, r, rand() * 6, rand() * 6 + 3.5); g.stroke();
    }
  });
}
export function hairBump() {
  return make('hairbump', 128, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = rand() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(rand() * w, rand() * h, 1 + rand() * 2.5, 0, 7); g.fill(); }
  }, { srgb: false });
}
export function featherPrint() {
  return make('featherprint', 256, 256, (g, w, h) => {
    g.fillStyle = '#1f6f78'; g.fillRect(0, 0, w, h);
    const cols = ['#f2c21b', '#f4f1ea', '#d23a2b', '#2fa84f', '#8a5a30'];
    for (let i = 0; i < 40; i++) {
      const x = rand() * w, y = rand() * h, a = rand() * 6.28;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = cols[i % 5];
      g.beginPath(); g.ellipse(0, 0, 6, 20, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 20); g.stroke(); g.restore();
    }
  });
}

export function grain() {
  return make('grain', 256, 256, (g, w, h) => {
    g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const v = 170 + rand() * 85 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3); }
  });
}

export function rock() {
  return make('rock', 256, 256, (g, w, h) => {
    g.fillStyle = '#a65a37'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { g.fillStyle = `rgba(${150 + rand() * 60},${70 + rand() * 40},${40 + rand() * 20},.5)`; g.fillRect(0, y, w, 3 + rand() * 4); }
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(40,20,10,${rand() * .2})`; g.fillRect(rand() * w, rand() * h, 2 + rand() * 5, 1 + rand() * 2); }
  });
}

// Glowing adire-like line work used for spirit (Story-time) structures.
export function spirit() {
  return make('spirit', 256, 256, (g, w, h) => {
    g.fillStyle = '#0b1430'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8fe8ff'; g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.lineWidth = 2.5;
    for (let r = 20; r < 110; r += 22) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 20, h / 2 + Math.sin(a) * 20); g.lineTo(w / 2 + Math.cos(a) * 120, h / 2 + Math.sin(a) * 120); g.stroke(); }
  });
}

export function glyph(i) {
  return make('glyph' + i, 128, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd77a'; g.lineWidth = 6; g.lineCap = 'round';
    const c = w / 2;
    const draws = [
      () => { g.beginPath(); g.arc(c, c, 34, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, 12, 0, 7); g.stroke(); },
      () => { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(c - 36, c - 20 + k * 20); g.quadraticCurveTo(c, c - 40 + k * 20, c + 36, c - 20 + k * 20); g.stroke(); } },
      () => { g.beginPath(); g.moveTo(c, c - 40); g.lineTo(c + 36, c + 30); g.lineTo(c - 36, c + 30); g.closePath(); g.stroke(); g.beginPath(); g.arc(c, c + 8, 8, 0, 7); g.stroke(); },
      () => { g.beginPath(); g.ellipse(c, c + 10, 38, 18, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(c - 20, c - 10); g.lineTo(c - 20, c - 36); g.moveTo(c, c - 10); g.lineTo(c, c - 40); g.moveTo(c + 20, c - 10); g.lineTo(c + 20, c - 36); g.stroke(); },
      () => { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .45; g.beginPath(); g.moveTo(c, c + 34); g.lineTo(c + Math.cos(a) * 44, c + 34 + Math.sin(a) * 66); g.stroke(); } },
      () => { g.beginPath(); g.arc(c, c, 32, Math.PI, 0); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(c - 30 + k * 20, c); g.lineTo(c - 24 + k * 16, c + 34); g.stroke(); } },
    ];
    (draws[i % draws.length])();
  }, { srgb: true, repeat: false });
}

export function softDot(color = '255,255,255') {
  return make('dot' + color, 64, 64, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, `rgba(${color},1)`); r.addColorStop(.35, `rgba(${color},.55)`); r.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }, { repeat: false });
}

export function cloud() {
  return make('cloud', 256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (.18 + rand() * .64), y = h * (.45 + (rand() - .5) * .35), r = 18 + rand() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }, { repeat: false });
}

export function ring() {
  return make('ringtex', 128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.7, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }, { repeat: false });
}
