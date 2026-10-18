// Selfie play: turn a photo into avatar choices on this device. The photo itself never leaves the device
// unless the player asks for a smart match, and then only to Claude, never to other players.
import { LOOK } from './config.mjs';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// Closest look item by colour (simple RGB distance, weighted towards green like the eye).
export function nearestColor(rgb, items) {
  let best = items[0], bd = Infinity;
  for (const it of items) { const [r, g, b] = hex(it.color), d = 2 * (r - rgb[0]) ** 2 + 4 * (g - rgb[1]) ** 2 + 3 * (b - rgb[2]) ** 2; if (d < bd) { bd = d; best = it; } }
  return best.id;
}
// Average colour of a region, ignoring the brightest and darkest tenth (glare and shadow).
export function regionColor(data, w, x0, y0, x1, y1) {
  const px = [];
  for (let y = Math.floor(y0 * w); y < y1 * w; y++) for (let x = Math.floor(x0 * w); x < x1 * w; x++) { const i = (y * w + x) * 4; px.push([data[i], data[i + 1], data[i + 2]]); }
  px.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const cut = Math.floor(px.length * 0.1), mid = px.slice(cut, px.length - cut);
  return [0, 1, 2].map(k => Math.round(mid.reduce((s, p) => s + p[k], 0) / Math.max(1, mid.length)));
}
function loadImage(file) {
  return new Promise((res, rej) => { const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); res(img); }; img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('not an image')); }; img.src = url; });
}
// Returns a small square thumbnail plus the closest skin tone and hair colour.
export async function readSelfie(file) {
  const img = await loadImage(file), N = 192, c = document.createElement('canvas'); c.width = c.height = N;
  const side = Math.min(img.width, img.height), ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);
  const skinRgb = regionColor(data, N, 0.38, 0.48, 0.62, 0.68), hairRgb = regionColor(data, N, 0.3, 0.04, 0.7, 0.16);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
  return { thumb: c.toDataURL('image/jpeg', 0.7), blob, skin: nearestColor(skinRgb, LOOK.skin.items), hairColor: nearestColor(hairRgb, LOOK.hairColor.items.filter(i => i.id !== 'indigo')) };
}
// What Claude may pick from for a smart match.
export function matchPrompt(gender) {
  const ids = slot => LOOK[slot].items.filter(i => (!i.g || i.g === gender) && i.cost >= 0).map(i => i.id).join(', ');
  return `This is a selfie a player took to make their cartoon avatar in a family-friendly adventure game. Choose the closest avatar options. ` +
    `Reply with JSON only: {"skin": one of [${ids('skin')}], "hairColor": one of [${ids('hairColor')}], "hair": one of [${ids('hair')}], "acc": "glasses" if they wear glasses else "none", "face": one of [${ids('face')}]}. ` +
    `Do not describe the person or guess anything else about them.`;
}
export function cleanMatch(m, gender) {
  const out = {};
  if (!m || typeof m !== 'object') return out;
  for (const slot of ['skin', 'hairColor', 'hair', 'acc', 'face']) { const it = LOOK[slot].items.find(i => i.id === m[slot]); if (it && (!it.g || it.g === gender) && it.cost >= 0) out[slot] = it.id; }
  return out;
}

// Turns the saved selfie into a face texture: the centre of the photo, in an oval that fades into the skin.
export function faceCanvas(dataUrl, onReady) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const img = new Image();
  img.onload = () => {
    const g = c.getContext('2d'), s = Math.min(img.width, img.height), crop = s * 0.78;
    g.filter = 'saturate(1.15) contrast(1.05)';
    g.drawImage(img, (img.width - crop) / 2, (img.height - crop) / 2 - s * 0.03, crop, crop, 0, 0, 256, 256);
    g.filter = 'none'; g.globalCompositeOperation = 'destination-in';
    g.save(); g.translate(128, 128); g.scale(0.84, 1);
    const grad = g.createRadialGradient(0, 0, 70, 0, 0, 126); grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill(); g.restore();
    onReady?.();
  };
  img.src = dataUrl;
  return c;
}
