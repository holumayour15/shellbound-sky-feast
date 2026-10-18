// Yoruba drum-ensemble score and sound effects, synthesised in the browser (no recordings).
// Every instrument is rendered once into a short sample when audio starts; notes then replay those samples
// (two audio nodes per note), which keeps the music smooth even on phones. The talking drum's pitch glides
// by bending the sample's playback rate, the way a drummer squeezes the cords.
// Ensemble: ìyá ìlù dùndún (lead talking drum) with ṣaworo jingles, omele (answering drums), gúdúgúdú (low drums),
// agogo bell on the 12/8 timeline, shekere, sakara, udu, ogene, agidigbo thumb-piano bass, palm-wine guitar,
// mbira, and a breathy Fulani-style flute.
// Styles: jùjú (village), àpàlà (river, savanna), dùndún war drums (canyon), palm-wine highlife (sky),
// Story-time 12/8, fújì (boss), festival jùjú (victory). Impressions built from synthesis, not recordings.

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz

// Talking-drum phrases: "step:tone", glides "L>H" (squeeze up) and "H>L" (release). Tones follow spoken Yoruba.
const ph = s => s.trim().split(/\s+/).map(tok => { const [st, tn] = tok.split(':'); const [a, b] = tn.split('>'); return [+st, a, b || a]; });
const LEAD = {
  call: [ph('0:H 1:H 2:M 4:L>M 6:H 7:H>M'), ph('0:L>H 3:M 4:M 5:H 6:L'), ph('0:M 1:H 2:H 3:M>L 6:L>H 8:H'), ph('0:H>L 2:L 3:M 4:H 5:H 6:M>L'), ph('0:M 2:M 3:H 4:L>H 6:H>M 7:L')],
  roll: [ph('0:M 1:M 2:M 3:H 4:H 5:H>X 6:H 7:M>L 9:L>H 10:H'), ph('0:L 1:M 2:H 3:X>H 4:M 5:L>M 7:H 8:H 9:X>M')],
  greet: ph('0:M 2:H 3:L 4:M>H 6:H 8:L>M'),
};
const ANSWER = [ph('0:H 1:X 2:H>X'), ph('0:X 1:H>M'), ph('0:H 1:H 2:X>H')];
const TONE = { L: 0.74, M: 1, H: 1.36, X: 1.72 };

const STYLES = {
  juju: { bpm: 116, grid: 16, base: 150, bell: [0, 3, 6, 10, 12], shek: 'eighths', gudu: [[0, 'L'], [6, 'L'], [8, 'M'], [11, 'L']], omele: [2, 3, 7, 10, 11, 14, 15], lead: 1, leadVel: 0.5,
    guitar: [[0, 67], [2, 69], [3, 72], [6, 69], [8, 67], [10, 64], [11, 67], [14, 62]], bassRiff: [[0, 43], [6, 43], [8, 48], [12, 50]],
    flute: [[0, 79], [4, 81], [6, 79], [8, 76], [12, 74]] },
  apala: { bpm: 94, grid: 12, base: 138, bell: [0, 2, 4, 5, 7, 9, 11], shek: 'twelve', gudu: [[0, 'L'], [3, 'M'], [7, 'L'], [10, 'M']], omele: [2, 5, 8, 11], lead: 1, leadVel: 0.48,
    sakara: [0, 3, 6, 8, 9], bassRiff: [[0, 40], [3, 43], [6, 45], [9, 43]], thumb: [[1, 64], [4, 67], [5, 69], [7, 67], [10, 64]],
    flute: [[0, 76], [3, 79], [5, 76], [6, 74], [9, 72]] },
  dundun: { bpm: 126, grid: 12, base: 162, bell: [0, 2, 4, 5, 7, 9, 11], shek: 'twelve', gudu: [[0, 'L'], [2, 'L'], [6, 'L'], [7, 'M'], [9, 'L']], omele: [1, 3, 5, 8, 10, 11], lead: 1, roll: 0.45, leadVel: 0.52,
    ogene: [0, 6], bassRiff: [[0, 38], [6, 38], [9, 41]] },
  highlife: { bpm: 100, grid: 16, base: 150, bell: [0, 6, 10], shek: 'eighths', gudu: [[0, 'L'], [8, 'L']], omele: [7, 15], lead: 2, leadVel: 0.36,
    guitar: [[0, 72], [2, 74], [4, 76], [6, 79], [8, 76], [10, 74], [11, 72], [14, 69]], guitar2: [[3, 64], [7, 67], [11, 64], [15, 62]], bassRiff: [[0, 41], [8, 48]],
    flute: [[0, 79], [4, 81], [6, 79], [8, 76], [12, 74]] },
  story: { bpm: 70, grid: 12, base: 126, bell: [0, 7], shek: 'soft', gudu: [[0, 'L']], omele: [], lead: 2, leadVel: 0.28, udu: [0, 7, 9],
    mbira: [[0, 69], [2, 72], [3, 76], [5, 74], [6, 72], [8, 69], [9, 67], [11, 64]], bassRiff: [[0, 45], [6, 40]], bassUdu: true,
    flute: [[0, 69], [3, 72], [6, 67], [9, 64]] },
  fuji: { bpm: 138, grid: 16, base: 170, bell: [0, 2, 4, 6, 8, 10, 12, 14], shek: 'sixteenths', gudu: [[0, 'L'], [3, 'L'], [8, 'L'], [11, 'M']], omele: [2, 6, 10, 13, 14], lead: 1, roll: 0.6, leadVel: 0.52,
    sakara: [0, 4, 7, 8, 12, 15], bassRiff: [[0, 40], [3, 40], [8, 43], [11, 45]] },
  victory: { bpm: 126, grid: 16, base: 160, bell: [0, 3, 6, 10, 12], shek: 'sixteenths', gudu: [[0, 'L'], [6, 'L'], [8, 'M'], [11, 'L']], omele: [2, 3, 7, 10, 11, 14, 15], lead: 1, roll: 0.3, leadVel: 0.5,
    guitar: [[0, 72], [2, 74], [3, 76], [6, 79], [8, 81], [10, 79], [11, 76], [14, 74]], bassRiff: [[0, 48], [6, 48], [8, 53], [12, 55]], flute: [[0, 84], [3, 86], [6, 84], [8, 81], [12, 79]] },
};

// ---------- Offline instrument rendering (plain maths into sample buffers) ----------
function svf(fc, Q, sr) { const f = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr), q = 1 / Q; let low = 0, band = 0; return x => { low += f * band; const high = x - low - q * band; band += f * high; return { low, band, high }; }; }
// Adds decaying sines into d cheaply: partials = [[freq, amp, tau]], optional pitch kick (fractional, time constant).
function partials(d, sr, parts, kick = 0, kickTau = 0.006) {
  const n = d.length, kd = Math.exp(-1 / (sr * kickTau));
  for (const [f, a, tau] of parts) {
    const dec = Math.exp(-1 / (sr * tau)); let amp = a, ph = 0, k = kick;
    const stop = Math.min(n, Math.ceil(sr * tau * 9));
    for (let i = 0; i < stop; i++) { ph += 2 * Math.PI * f * (1 + k) / sr; d[i] += Math.sin(ph) * amp; amp *= dec; k *= kd; }
  }
}
function noiseInto(d, sr, gain, tau, filt) { const dec = Math.exp(-1 / (sr * tau)); let a = gain; const stop = Math.min(d.length, Math.ceil(sr * tau * 9)); for (let i = 0; i < stop; i++) { d[i] += filt(Math.random() * 2 - 1) * a; a *= dec; } }
function attack(d, sr, sec) { const n = Math.min(d.length, Math.ceil(sr * sec)); for (let i = 0; i < n; i++) d[i] *= i / n; }
function normalise(d, peak = 0.9) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m; for (let i = 0; i < 64 && i < d.length; i++) d[d.length - 1 - i] *= i / 64; }
const RENDER = {
  // Talking drum at 150 Hz: membrane partials with the stick's pitch kick, plus a curved-stick slap.
  drum(d, sr) {
    partials(d, sr, [[150, 1, 0.22], [238.5, 0.36, 0.12], [321, 0.16, 0.07], [397.5, 0.07, 0.045]], 0.07);
    const bp = svf(2300, 1.3, sr), lp = svf(240, 0.8, sr);
    noiseInto(d, sr, 0.9, 0.008, x => bp(x).band); noiseInto(d, sr, 1.4, 0.02, x => lp(x).low); attack(d, sr, 0.0025);
  },
  // Ṣaworo: little brass jingles round the rim — a bright shimmer that does not change pitch.
  jingle(d, sr) {
    const fs = [6100, 6950, 7800, 8650, 9900].map(f => [f, Math.random() * 6]), bp = svf(7200, 6, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr; let e = 0; for (const h of [0, 0.012, 0.026]) if (t >= h) e += Math.exp(-(t - h) / 0.035) * (h ? 0.7 : 1);
      let v = 0; for (const [f, p] of fs) v += Math.sin(2 * Math.PI * f * t + p); d[i] = (v * 0.12 + bp(Math.random() * 2 - 1).band * 0.8) * e;
    }
  },
  gudu(d, sr) {
    let p1 = 0, p2 = 0; const lp = svf(200, 0.7, sr);
    for (let i = 0; i < d.length; i++) { const t = i / sr, f = 85 * (1 + 0.12 * Math.exp(-t / 0.03)); p1 += 2 * Math.PI * f / sr; p2 += 2 * Math.PI * f * 1.5 / sr; d[i] = (Math.sin(p1) * Math.exp(-t / 0.25) + Math.sin(p2) * 0.3 * Math.exp(-t / 0.1) + lp(Math.random() * 2 - 1).low * 1.5 * Math.exp(-t / 0.015)) * Math.min(1, t / 0.002); }
  },
  bellHi: (d, sr) => RENDER._bell(d, sr, 880), bellLo: (d, sr) => RENDER._bell(d, sr, 620),
  _bell(d, sr, f) { partials(d, sr, [[f, 1, 0.13], [f * 2.76, 0.32, 0.05], [f * 5.4, 0.12, 0.025]]); const hp = svf(4000, 0.7, sr); noiseInto(d, sr, 0.3, 0.003, x => hp(x).high); attack(d, sr, 0.001); },
  shek(d, sr) { const bp = svf(8200, 0.9, sr); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = bp(Math.random() * 2 - 1).band * Math.min(1, t / 0.004) * Math.exp(-t / 0.022); } },
  swish(d, sr) { const bp = svf(6500, 0.8, sr); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = bp(Math.random() * 2 - 1).band * Math.min(1, t / 0.025) * Math.exp(-t / 0.05); } },
  udu(d, sr) { let p = 0; const bp = svf(360, 7, sr); for (let i = 0; i < d.length; i++) { const t = i / sr, f = 95 + 85 * Math.exp(-t / 0.05); p += 2 * Math.PI * f / sr; d[i] = (Math.sin(p) * Math.exp(-t / 0.18) + bp(Math.random() * 2 - 1).band * 0.6 * Math.exp(-t / 0.06)) * Math.min(1, t / 0.004); } },
  ogene(d, sr) { partials(d, sr, [[520, 1, 0.5], [1180, 0.45, 0.3], [1955, 0.25, 0.18], [2760, 0.12, 0.1]]); attack(d, sr, 0.001); },
  sakara(d, sr) { let p = 0; const bp = svf(1200, 1.2, sr); for (let i = 0; i < d.length; i++) { const t = i / sr, f = 260 * (1 + 0.1 * Math.exp(-t / 0.01)); p += 2 * Math.PI * f / sr; d[i] = (Math.sin(p) * Math.exp(-t / 0.08) + bp(Math.random() * 2 - 1).band * 1.4 * Math.exp(-t / 0.012)) * Math.min(1, t / 0.0015); } },
  // Thumb piano at 220 Hz (agidigbo when played low, mbira when played high).
  thumb(d, sr) { partials(d, sr, [[220, 1, 0.45], [924, 0.18, 0.06], [440, 0.2, 0.15]]); const bp = svf(1800, 4, sr); noiseInto(d, sr, 0.25, 0.01, x => bp(x).band); attack(d, sr, 0.002); },
  // Fulani-style flute at 440 Hz: breathy, with vibrato that blooms after the attack.
  flute(d, sr) {
    let p = 0, vp = 0, breath = 0.45; const bp = svf(1800, 2, sr), n = d.length, bd = Math.exp(-1 / (sr * 0.05)), a1 = sr * 0.07, a2 = sr * 0.35;
    for (let i = 0; i < n; i++) {
      vp += 2 * Math.PI * 5.4 / sr; const vib = 1 + 0.006 * Math.min(1, Math.max(0, (i / sr - 0.15) / 0.3)) * Math.sin(vp); p += 2 * Math.PI * 440 * vib / sr;
      const a = Math.min(1, i / a1, (n - i) / a2); breath = 0.1 + (breath - 0.1) * bd;
      d[i] = (Math.sin(p) + Math.sin(2 * p) * 0.14 + Math.sin(3 * p) * 0.05 + bp(Math.random() * 2 - 1).band * breath) * a;
    }
  },
};
const LENGTHS = { drum: 0.7, jingle: 0.16, gudu: 0.6, bellHi: 0.35, bellLo: 0.35, shek: 0.09, swish: 0.2, udu: 0.5, ogene: 1.3, sakara: 0.3, thumb: 1.1, flute: 1.3 };

export function createAudio() {
  let ctx = null, master, musicIn, musicBus, sfxBus, noise, timer = null, ksCache = new Map(), B = {};
  let nextTime = 0, step = 0, enabled = true, musicVol = 0.6, sfxVol = 0.8, phraseN = 0, greeted = false;
  let style = 'juju', pending = 'juju', scene = { zone: 'village', weave: 0, boss: 0, victory: false };
  const amb = {}, renderMs = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }); } catch { ctx = null; return; }
    // Master limiter keeps the mix clean without pumping.
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.15; lim.connect(master);
    // Music: instruments → musicIn → (dry) musicBus, and musicIn → room reverb → musicBus. No feedback path.
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.7; musicBus.connect(lim);
    musicIn = ctx.createGain(); musicIn.connect(musicBus);
    const len = Math.floor(ctx.sampleRate * 1.1), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
    const conv = ctx.createConvolver(); conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.12;
    musicIn.connect(conv); conv.connect(wet); wet.connect(musicBus);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(lim);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    buildAmbience();
    // Render one instrument per tick so starting the music never stalls the game; the band starts once all are ready.
    const todo = Object.entries(LENGTHS);
    const next = () => {
      const job = todo.shift();
      if (!job) { nextTime = ctx.currentTime + 0.15; timer = setInterval(schedule, 40); return; }
      const [k, sec] = job, b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
      const t0 = performance.now(); RENDER[k](d, ctx.sampleRate); normalise(d); B[k] = b; renderMs[k] = Math.round(performance.now() - t0); setTimeout(next, 16);
    };
    setTimeout(next, 30);
  }

  // ---------- Sample player ----------
  const human = () => (Math.random() - 0.5) * 0.008;
  function hit(buf, t, vel, dest, rate = 1, rateTo = null, glide = 0.08) {
    if (!buf || vel <= 0) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf;
    s.playbackRate.setValueAtTime(rate, t);
    if (rateTo && Math.abs(rateTo - rate) > 0.005) s.playbackRate.setTargetAtTime(rateTo, t + 0.025, glide / 2.5);
    g.gain.value = vel; s.connect(g); g.connect(dest); s.start(Math.max(t, ctx.currentTime)); s.stop(Math.max(t, ctx.currentTime) + buf.duration / Math.min(rate, rateTo || rate) + 0.05);
  }
  // Talking drum: the sample's pitch glides from f0 to f1; jingles shimmer on top at their own pitch.
  function tdrum(t, f0, f1, vel, dest, { glide = 0.09, jingle = 0.6 } = {}) {
    hit(B.drum, t, vel, dest, f0 / 150, f1 / 150, glide);
    if (jingle) hit(B.jingle, t + 0.004, vel * 0.22 * jingle, dest, 0.95 + Math.random() * 0.1);
  }
  function playPhrase(t, phrase, base, vel, dest, sd, jingle = 0.6) {
    for (const [st, a, b] of phrase) {
      const f0 = base * TONE[a], f1 = base * TONE[b], gl = a !== b;
      tdrum(t + st * sd + human(), gl ? f0 : f0 * 1.02, gl ? f1 : f0 * 0.98, vel * (st === 0 ? 1 : 0.82) * (0.92 + Math.random() * 0.12), dest, { glide: gl ? sd * 1.4 : 0.04, jingle });
    }
  }
  const omele = (t, f, vel, dest) => tdrum(t, f, f * 1.15, vel, dest, { glide: 0.05, jingle: 0.25 });
  const gudugudu = (t, f, vel, dest) => hit(B.gudu, t, vel, dest, f / 85);
  const agogo = (t, high, vel, dest) => hit(high ? B.bellHi : B.bellLo, t, vel, dest);
  const shekere = (t, vel, dest, swish = false) => hit(swish ? B.swish : B.shek, t, vel, dest, 0.95 + Math.random() * 0.1);
  const udu = (t, f, vel, dest) => hit(B.udu, t, vel, dest, f / 95);
  const ogene = (t, vel, dest) => hit(B.ogene, t, vel, dest);
  const sakara = (t, vel, dest, open) => hit(B.sakara, t, vel, dest, open ? 0.88 : 1.12);
  const thumb = (t, f, vel, dest) => hit(B.thumb, t, vel, dest, f / 220);
  const flute = (t, f, vel, dest, rateTo = null) => hit(B.flute, t, vel, dest, f / 440, rateTo, 0.3);
  function ksBuffer(freq) {
    const key = Math.round(freq);
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, len = Math.floor(sr * 1.0), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const P = Math.max(2, Math.round(sr / freq));
    for (let i = 0; i < P; i++) d[i] = (Math.random() * 2 - 1) * 0.7;
    for (let i = P; i < len; i++) d[i] = (d[i - P] + d[i - P + 1 < i ? i - P + 1 : i - P]) * 0.5 * 0.995;
    for (let i = 0; i < 256; i++) d[len - 1 - i] *= i / 256;
    ksCache.set(key, buf); return buf;
  }
  const pluck = (t, f, vel, dest) => hit(ksBuffer(f), t, vel, dest);
  // A few one-off effects still use oscillators; they are rare, so they cost little.
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  function osc(type, f, t, dur, peak, dest, a = 0.005, glideTo = null) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.8);
    env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function burst(t, dur, peak, dest, type = 'highpass', freq = 6000, q = 1, sweepTo = null) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); env(g, t, 0.003, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // ---------- Ambience: market chatter, savanna birds, canyon wind, Story-time crickets ----------
  function loopNoise(type, freq, q) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
    return g;
  }
  function buildAmbience() { amb.market = loopNoise('bandpass', 520, 0.8); amb.wind = loopNoise('lowpass', 380, 0.5); amb.fire = loopNoise('highpass', 2500, 0.5); }
  let ambT = 0;
  function ambienceTick() {
    const t = ctx.currentTime; if (t < ambT) return; ambT = t + 0.2;
    const z = scene.zone, w = scene.weave;
    const lv = { market: scene.market || 0, wind: (z === 'canyon' ? 0.05 : z === 'sky' ? 0.07 : 0.012) * (1 - w * 0.5), fire: scene.fire || 0 };
    for (const k of Object.keys(lv)) amb[k].gain.setTargetAtTime(lv[k] * (0.8 + Math.sin(t * (k === 'market' ? 1.7 : 0.4)) * 0.2 + (k === 'fire' ? Math.random() * 0.6 : 0)), t, 0.4);
    if (w > 0.5 && Math.random() < 0.3) { const f = 4200 + Math.random() * 600; for (let i = 0; i < 3; i++) osc('sine', f, t + i * 0.05, 0.03, 0.01, sfxBus, 0.002); } // crickets
    if (w < 0.5 && (z === 'savanna' || z === 'village') && Math.random() < 0.08) { const f = 2200 + Math.random() * 1400; osc('sine', f, t, 0.12, 0.012, sfxBus, 0.01, f * 1.4); osc('sine', f * 1.2, t + 0.15, 0.1, 0.01, sfxBus, 0.01, f); } // birdsong
  }

  // ---------- Sequencer ----------
  function pickStyle() {
    if (scene.victory) return 'victory';
    if (scene.boss) return 'fuji';
    if (scene.weave > 0.5) return 'story';
    return { village: 'juju', river: 'apala', savanna: 'apala', canyon: 'dundun', sky: 'highlife', feast: 'highlife' }[scene.zone] || 'juju';
  }
  function schedule() {
    if (!ctx || !enabled || ctx.state !== 'running') return;
    // If the tab was busy or hidden we fell behind: skip ahead instead of playing a burst of late notes.
    if (nextTime < ctx.currentTime - 0.05) nextTime = ctx.currentTime + 0.05;
    pending = pickStyle();
    let S = STYLES[style];
    while (nextTime < ctx.currentTime + 0.3) {
      if (step % S.grid === 0 && pending !== style) { style = pending; S = STYLES[style]; step = 0; greeted = false; }
      const stepDur = 60 / S.bpm / (S.grid === 12 ? 3 : 4);
      playStep(S, step, nextTime, stepDur);
      nextTime += stepDur; step++;
    }
    ambienceTick();
  }
  // A 16-bar song form: 2-bar intro, groove with call and response, flute melody, a talking-drum solo break, and the full band to close.
  function playStep(S, s, t, sd) {
    const g = S.grid, i = s % g, bar = Math.floor(s / g), sec = bar % 16, M = musicIn, Bf = S.base;
    const intro = sec < 2, brk = sec === 12 || sec === 13, full = !intro && !brk;
    const T = t + human();
    // Agogo bell timeline: the clock every drum locks to (half-time in the break).
    if (S.bell.includes(i) && (!brk || i === 0)) agogo(T, i === 0 || i === S.bell[Math.floor(S.bell.length / 2)], i === 0 ? 0.2 : 0.13, M);
    // Shekere.
    if (!brk) {
      if (S.shek === 'eighths' && i % 2 === 0) shekere(T, i % 4 === 2 ? 0.26 : 0.13, M);
      if (S.shek === 'sixteenths') shekere(T, i % 4 === 2 ? 0.24 : 0.1, M);
      if (S.shek === 'twelve') shekere(T, i % 3 === 0 ? 0.24 : 0.1, M, i % 6 === 3);
      if (S.shek === 'soft' && i % 3 === 2) shekere(T, 0.1, M, true);
    }
    // Gúdúgúdú: the heartbeat.
    if (!brk) for (const [st, tone] of S.gudu) if (st === i) gudugudu(T, (tone === 'L' ? 82 : 112) * (Bf / 150), 0.55, M);
    // Lead talking drum: speaks at the top of the bar; in the break it plays a long solo roll.
    const leadBar = bar % S.lead === 0;
    if (i === 0 && !intro && (leadBar || brk)) {
      const roll = brk || (S.roll && Math.random() < S.roll);
      const phrase = !greeted ? LEAD.greet : roll ? LEAD.roll[phraseN % LEAD.roll.length] : LEAD.call[phraseN % LEAD.call.length];
      greeted = true; phraseN++;
      playPhrase(t, phrase, Bf, S.leadVel * (brk ? 1.1 : 1), M, sd);
    }
    // Omele answer the lead in the gaps and keep a light ostinato.
    if (full && !leadBar && S.omele.length && i === Math.floor(g / 2)) playPhrase(t, ANSWER[bar % ANSWER.length], Bf * 1.25, S.leadVel * 0.5, M, sd, 0.3);
    if (full && S.omele.includes(i) && !(leadBar && i < 9)) omele(T, Bf * 1.6, 0.13, M);
    if (full && S.sakara?.includes(i)) sakara(T, 0.32, M, i % 4 === 0);
    if (S.udu?.includes(i)) udu(T, i === 0 ? 78 : 104, 0.45, M);
    if (S.ogene?.includes(i) && !intro) ogene(T, 0.12, M);
    // Bass: agidigbo thumb piano (udu in Story-time).
    if (!brk) for (const [st, n] of S.bassRiff) if (st === i) { if (S.bassUdu) udu(T, N(n) / 1.6, 0.4, M); else thumb(T, N(n), 0.5, M); }
    // Melodies come in once the groove is set: guitar and thumb-piano riffs, then the flute takes a turn.
    if (full && sec >= 2) {
      const lift = sec >= 14 ? 2 : sec >= 8 ? 0 : 0;
      for (const [st, n] of S.guitar || []) if (st === i) pluck(T, N(n + lift), 0.22, M);
      for (const [st, n] of S.guitar2 || []) if (st === i) pluck(T, N(n), 0.14, M);
      for (const [st, n] of S.thumb || []) if (st === i) thumb(T, N(n), 0.25, M);
      for (const [st, n] of S.mbira || []) if (st === i) thumb(T, N(n + (bar % 4 === 2 ? -2 : 0)), 0.16, M);
      if (S.flute && sec >= 4 && sec < 8) for (const [st, n] of S.flute) if (st === i) flute(T, N(n), 0.13, M, st === S.flute.at(-1)[0] ? N(n - 2) : null);
    }
  }

  // ---------- Sound effects on the same instruments ----------
  const SFX = {
    jump: t => tdrum(t, 170, 250, 0.4, sfxBus, { glide: 0.05, jingle: 0.3 }),
    double: t => { tdrum(t, 220, 320, 0.4, sfxBus, { glide: 0.04, jingle: 0.5 }); shekere(t + 0.04, 0.3, sfxBus, true); },
    land: t => gudugudu(t, 80, 0.5, sfxBus),
    spin: t => { burst(t, 0.36, 0.16, sfxBus, 'bandpass', 600, 3, 5200); shekere(t, 0.3, sfxBus, true); },
    drum: t => { playPhrase(t, LEAD.roll[0], 150, 0.7, sfxBus, 0.06); gudugudu(t, 70, 0.6, sfxBus); },
    cowry: (t, k = 0) => hit(B.bellHi, t, 0.22, sfxBus, Math.pow(1.06, Math.min(k, 12))),
    thread: t => [67, 69, 72, 76, 79].forEach((n, i) => pluck(t + i * 0.07, N(n), 0.3, sfxBus)),
    feather: t => { [72, 76, 79, 84, 88].forEach((n, i) => thumb(t + i * 0.08, N(n), 0.25, sfxBus)); tdrum(t, 150, 220, 0.35, sfxBus); },
    tale: t => { ogene(t, 0.2, sfxBus); [69, 72, 76, 81].forEach((n, i) => thumb(t + 0.1 + i * 0.12, N(n), 0.22, sfxBus)); },
    hurt: t => { gudugudu(t, 60, 0.7, sfxBus); tdrum(t + 0.02, 180, 110, 0.3, sfxBus, { glide: 0.08, jingle: 0 }); },
    weave: (t, toStory) => { ogene(t, 0.25, sfxBus); tdrum(t, toStory ? 220 : 120, toStory ? 120 : 220, 0.45, sfxBus, { glide: 0.35 }); flute(t + 0.05, toStory ? N(76) : N(69), 0.12, sfxBus, toStory ? N(69) : N(76)); },
    ring: (t, k = 0) => { agogo(t, k % 2 === 0, 0.3, sfxBus); pluck(t, N(72 + [0, 2, 4, 7, 9, 12, 14, 16][k % 8]), 0.25, sfxBus); },
    checkpoint: t => { playPhrase(t, LEAD.greet, 165, 0.6, sfxBus, 0.08); ogene(t + 0.6, 0.18, sfxBus); },
    screech: t => osc('sawtooth', 1700, t, 0.45, 0.035, sfxBus, 0.02, 900),
    stomp: t => { gudugudu(t, 95, 0.5, sfxBus); agogo(t, false, 0.15, sfxBus); },
    defeat: t => { playPhrase(t, ANSWER[0], 190, 0.45, sfxBus, 0.06); shekere(t, 0.35, sfxBus, true); },
    slam: t => { osc('sine', 55, t, 0.7, 0.55, sfxBus, 0.003, 30); burst(t, 0.5, 0.2, sfxBus, 'lowpass', 600); },
    throw: t => { burst(t, 0.4, 0.08, sfxBus, 'bandpass', 300, 3, 1500); tdrum(t, 140, 230, 0.28, sfxBus, { glide: 0.1 }); },
    orb: t => { burst(t, 0.3, 0.16, sfxBus, 'lowpass', 1200); osc('sine', 140, t, 0.3, 0.18, sfxBus, 0.002, 60); },
    bosshit: t => { burst(t, 0.4, 0.18, sfxBus, 'highpass', 3000); ogene(t, 0.35, sfxBus); },
    clang: t => { ogene(t, 0.18, sfxBus); hit(B.bellLo, t, 0.12, sfxBus, 1.4); },
    dizzy: t => [true, false, true, false].forEach((h, i) => agogo(t + i * 0.1, h, 0.2, sfxBus)),
    win: t => { playPhrase(t, LEAD.roll[0], 170, 0.55, sfxBus, 0.07); [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => { pluck(t + 0.8 + i * 0.11, N(n), 0.3, sfxBus); if (i % 2 === 0) agogo(t + 0.8 + i * 0.11, true, 0.12, sfxBus); }); },
    ui: t => shekere(t, 0.14, sfxBus),
    deny: t => tdrum(t, 170, 105, 0.38, sfxBus, { glide: 0.06, jingle: 0 }),
    splash: t => burst(t, 0.6, 0.22, sfxBus, 'lowpass', 1800, 1, 300),
    kola: t => [72, 79].forEach((n, i) => thumb(t + i * 0.1, N(n), 0.28, sfxBus)),
    buy: t => { agogo(t, true, 0.25, sfxBus); agogo(t + 0.09, false, 0.2, sfxBus); pluck(t + 0.05, N(79), 0.22, sfxBus); },
    chat: t => omele(t, 260, 0.22, sfxBus),
    howl: t => { flute(t, 330, 0.18, sfxBus, 560); flute(t + 0.05, 660, 0.06, sfxBus, 1100); },
    grow: t => { playPhrase(t, LEAD.greet, 160, 0.6, sfxBus, 0.09); [72, 76, 79, 84, 88, 91].forEach((n, i) => pluck(t + 0.8 + i * 0.09, N(n), 0.28, sfxBus)); ogene(t + 0.8, 0.18, sfxBus); },
  };

  function play(name, arg) { if (!ctx || !enabled || !SFX[name] || !B.flute) return; try { SFX[name](ctx.currentTime + 0.01, arg); } catch { /* audio graph unavailable */ } }
  // Dialogue voice: each syllable is a tiny talking-drum stroke, pitched per speaker — the drum "speaks" for them.
  let syl = 0, lastVoice = 0;
  function voice(pitch) {
    if (!ctx || !enabled || !B.drum) return;
    const t = ctx.currentTime; if (t - lastVoice < 0.05) return; lastVoice = t;
    const tone = [1, 0, 1, -1, 0][syl++ % 5], f = Math.max(90, pitch * 0.45) * (tone > 0 ? 1.3 : tone < 0 ? 0.8 : 1);
    tdrum(t + 0.01, f, f * (tone > 0 ? 1.08 : 0.92), 0.12, sfxBus, { glide: 0.04, jingle: 0.15 });
  }
  return {
    init, play, voice,
    tone(f) { if (!ctx || !enabled || !B.drum) return; const t = ctx.currentTime + 0.01; tdrum(t, f * 0.75, f * 0.65, 0.6, sfxBus); agogo(t, f > 280, 0.12, sfxBus); },
    setScene(s) { scene = { ...scene, ...s }; },
    setWeave(w) { scene.weave = w; }, setBoss(b) { scene.boss = b; },
    setVolumes(mv, sv) { musicVol = mv; sfxVol = sv; if (ctx) { musicBus.gain.setTargetAtTime(mv * 0.7, ctx.currentTime, 0.05); sfxBus.gain.setTargetAtTime(sv, ctx.currentTime, 0.05); } },
    setEnabled(e) { enabled = e; if (ctx) { if (e) { ctx.resume(); nextTime = ctx.currentTime + 0.1; } else ctx.suspend(); } },
    get renderMs() { return renderMs; }, get enabled() { return enabled; }, get ready() { return !!ctx; }, get style() { return style; },
    stop() { if (timer) clearInterval(timer); },
  };
}
