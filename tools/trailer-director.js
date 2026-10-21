// Trailer director (dev tool, not shipped): copy into dist/, load it in the page, run __dir.prep() then the shots;
// tools/capture_server.py receives the frames and tools/assemble.py builds the MP4s.
// draws titles over each frame and sends the frames to the local capture receiver.
(() => {
  const Q = window.__shellbound, W = 1920, H = 1080, FPS = 30, SIM = 2; // two 60 Hz game steps per video frame
  const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  let frameNo = 0;
  const ease = k => k * k * (3 - 2 * k), clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, k) => a + (b - a) * k;
  const fade = (k, a, b, f = 0.12) => clamp(Math.min((k - a) / f, (b - k) / f), 0, 1);
  function cam(px, py, pz, tx, ty, tz) { const c = Q.camera; c.position.set(px, py, pz); c.lookAt(tx, ty, tz); c.updateMatrixWorld(); }
  function text(str, y, size, { font = 'Fraunces', weight = 800, color = '#f7eedb', alpha = 1, spacing = 0, glow = 'rgba(0,0,0,.65)' } = {}) {
    if (alpha <= 0) return;
    g.save(); g.globalAlpha = alpha; g.font = `${weight} ${size}px ${font}, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.letterSpacing = spacing + 'px'; g.shadowColor = glow; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.05;
    g.fillStyle = color; g.fillText(str, W / 2, y); g.restore();
  }
  function shade(alpha, top = false) {
    const gr = g.createLinearGradient(0, top ? 0 : H * 0.45, 0, top ? H * 0.55 : H);
    gr.addColorStop(top ? 1 : 0, 'rgba(10,6,24,0)'); gr.addColorStop(top ? 0 : 1, `rgba(10,6,24,${alpha})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  async function frame(drawOverlay) {
    Q.render();
    g.drawImage(Q.renderer.domElement, 0, 0, W, H);
    drawOverlay?.();
    const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.9));
    await fetch(`http://127.0.0.1:8790/f/${String(frameNo).padStart(4, '0')}`, { method: 'POST', body: blob });
    frameNo++;
  }
  const step = (hold = [], press = []) => { Q.tick(1, hold, press, false); Q.tick(SIM - 1, hold, [], false); };
  const caption = (str, k, a = 0.08, b = 0.92) => { const al = fade(k, a, b); shade(0.7 * al); text(str, H - 120, 64, { font: 'Outfit', weight: 800, spacing: 6, alpha: al }); };
  const P = () => Q.P;

  const shots = {
    // 0–3.5 s: crane down over the village to the hero by the story fire. Titles.
    async s1() {
      Q.teleport(0.5, 6); Q.P.face = Math.PI; step(); const n = 105;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), e = ease(k), p = P();
        step();
        cam(lerp(-26, 2.5, e), lerp(26, 2.6, e), lerp(30, p.z + 5.2, e), lerp(0, p.x, e), lerp(2, p.y + 1.4, e), lerp(-6, p.z, e));
        await frame(() => {
          shade(0.55 * fade(k, 0, 1.2, 0.05));
          text('A TORTOISE FOLKTALE · TOLD IN FOUR DIMENSIONS', H / 2 - 150, 34, { font: 'Outfit', weight: 700, spacing: 8, color: '#f2c14e', alpha: fade(k, 0.08, 0.95) });
          text('SHELLBOUND', H / 2 - 30, 170, { spacing: 10, alpha: fade(k, 0.3, 0.97), color: '#ffdf8a' });
          text('The Sky Feast', H / 2 + 95, 64, { weight: 600, alpha: fade(k, 0.42, 0.97) });
        });
      }
    },
    // 3.5–6.5 s: the hero runs towards camera with Papa.
    async s2() {
      Q.teleport(0, 18); for (let i = 0; i < 30; i++) step(['KeyW']); const n = 90;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), p = P();
        step(['KeyW']);
        const fx = Math.sin(p.face), fz = Math.cos(p.face);
        cam(p.x + fx * 5.2 + fz * 2.2, p.y + 1.7, p.z + fz * 5.2 - fx * 2.2, p.x + fx * 0.5, p.y + 1.1, p.z + fz * 0.5);
        await frame(() => caption('CREATE YOUR OWN HERO', k));
      }
    },
    // 6.5–9.5 s: Story-time — the world turns to night, spirits hunt.
    async s3() {
      Q.teleport(-16, -82); for (let i = 0; i < 20; i++) step();
      const p0 = P(); for (let a = 0; a < 3; a++) Q.spawn('wisp', p0.x + Math.cos(a * 2.1) * 6, p0.z + Math.sin(a * 2.1) * 6);
      Q.weave(); const n = 90;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), p = P(), a = 0.6 + k * 1.4;
        step(i % 22 === 10 ? [] : [], i % 22 === 10 ? ['ShiftLeft'] : []);
        cam(p.x + Math.sin(a) * 6.5, p.y + 2.2, p.z + Math.cos(a) * 6.5, p.x, p.y + 1.2, p.z);
        await frame(() => caption('SLIP INTO STORY-TIME', k));
      }
      Q.weave(); for (let i = 0; i < 40; i++) step();
    },
    // 9.5–12.5 s: a Harmattan Brute charges; a friend fights beside the hero.
    async s4() {
      Q.teleport(8, -112); for (let i = 0; i < 10; i++) step();
      const p = P(), tobi = Q.friendsMap.tobi; tobi.place(p.x - 2, p.z + 1, p.y); tobi.S.mode = 'help'; tobi.S.helpT = 99; tobi.S.fights = true;
      const b = Q.spawn('brute', p.x + 1.5, p.z - 9); b.state = 'charge'; b.t = 0; b.cx = -0.15; b.cz = 1; Q.spawn('beetle', p.x + 4, p.z - 3);
      const n = 90;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        step([], i % 18 === 6 ? ['ShiftLeft'] : []);
        const q = P(), a = -0.9 + k * 0.6;
        cam(q.x + Math.sin(a) * 7.5, q.y + 2.6, q.z + Math.cos(a) * 7.5, q.x + 0.5, q.y + 1, q.z - 2.5);
        await frame(() => caption('FIGHT MONSTERS WITH FRIENDS', k));
      }
    },
    // 12.5–15.5 s: fishing on the jetty, then the bike race through the village gates.
    async s5() {
      Q.teleport(-30, -61.5, 0.6); for (let i = 0; i < 10; i++) step();
      step([], ['KeyE']); if (Q.fishingState) Q.fishingState.wait = 99;
      const n1 = 45;
      for (let i = 0; i < n1; i++) {
        const k = i / 89, p = P();
        step();
        cam(p.x + 4.2, p.y + 1.8, p.z + 1.5 - i * 0.02, p.x - 0.5, p.y + 0.5, p.z - 4);
        await frame(() => caption('FISH · COOK · RIDE · WIN PRIZES', k));
      }
      step([], ['Escape']); Q.save.bike = 'red'; Q.teleport(0, 25.5); Q.P.face = Math.PI / 2; step([], ['KeyX']); for (let i = 0; i < 15; i++) step(['KeyW']);
      for (let i = 0; i < 45; i++) {
        const k = (45 + i) / 89, p = P();
        step(['KeyW']);
        const fx = Math.sin(p.face), fz = Math.cos(p.face);
        cam(p.x - fz * 4.5 + fx * 2, p.y + 1.6, p.z + fx * 4.5 + fz * 2, p.x + fx * 1.5, p.y + 0.9, p.z + fz * 1.5);
        await frame(() => caption('FISH · COOK · RIDE · WIN PRIZES', k));
      }
      step([], ['KeyX']);
    },
    // 15.5–20 s: the feast in the sky, then the end card.
    async s6() {
      Q.teleport(0, -380, 58.5); Q.P.face = Math.PI; for (let i = 0; i < 20; i++) step();
      const n = 135, X = 0, Y = 58, Z = -396;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), a = 0.5 - k * 0.9;
        step();
        cam(X + Math.sin(a) * lerp(44, 34, k), Y + lerp(16, 10, k), Z + Math.cos(a) * lerp(44, 34, k), X, Y + 6, Z);
        const end = clamp((i - 58) / 14, 0, 1);
        await frame(() => {
          if (end < 1) { const al = fade(i / 58, 0.1, 0.95) * (1 - end); shade(0.7 * al); text('WIN BACK THE FEAST IN THE SKY', H - 120, 64, { font: 'Outfit', weight: 800, spacing: 6, alpha: al }); }
          if (end > 0) {
            g.fillStyle = `rgba(14,9,32,${0.62 * end})`; g.fillRect(0, 0, W, H);
            text('SHELLBOUND', H / 2 - 110, 160, { spacing: 10, alpha: end, color: '#ffdf8a' });
            text('The Sky Feast', H / 2 + 5, 60, { weight: 600, alpha: end });
            text('PLAY FREE ON YOUR PHONE', H / 2 + 120, 40, { font: 'Outfit', weight: 800, spacing: 8, color: '#f2c14e', alpha: clamp((i - 78) / 12, 0, 1) });
            text('holumayour15.github.io/shellbound-sky-feast', H / 2 + 185, 42, { font: 'Outfit', weight: 600, alpha: clamp((i - 84) / 12, 0, 1) });
          }
        });
      }
    },
  };
  window.__dir = {
    shots, get frameNo() { return frameNo; }, set frameNo(v) { frameNo = v; },
    async prep() { await document.fonts.load('800 100px Fraunces'); await document.fonts.load('800 40px Outfit'); await document.fonts.load('600 40px Outfit'); Q.paused = true; return document.fonts.check('800 100px Fraunces'); },
  };
})();
