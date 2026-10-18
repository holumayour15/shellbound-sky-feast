// Online play outside Claude: direct phone-to-phone connections (WebRTC via Trystero, introduced over public
// MQTT brokers). It offers the same small "room" and "user" interface the game uses inside Claude, so friends,
// waves, chat, invites and the shared world work the same on the GitHub Pages link.
//
// Identity: each device keeps an ECDSA P-256 key pair. Its id is a hash of the public key, and every peer proves
// it owns that key by signing its own connection id when it says hello. Messages from a peer that has not proved
// its key carry `by: null`, so the game ignores them for friends, chat and invites, exactly as in Claude.
const LIB = 'https://cdn.jsdelivr.net/npm/@trystero-p2p/mqtt@0.25.4/+esm';
const APP_ID = 'shellbound-sky-feast-v1-holumayour15';
const KEY_STORE = 'shellbound-device-key-v1';
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };

async function deviceKey() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY_STORE) || 'null');
    if (saved?.priv && saved?.pub) return { priv: await crypto.subtle.importKey('jwk', saved.priv, ALG, false, ['sign']), pubJwk: saved.pub };
  } catch { /* make a new one */ }
  const kp = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey), pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
  try { localStorage.setItem(KEY_STORE, JSON.stringify({ priv, pub })); } catch { /* private mode: identity lasts this visit */ }
  return { priv: kp.privateKey, pubJwk: pub };
}
const idOf = async pubJwk => b64((await crypto.subtle.digest('SHA-256', enc.encode(`${pubJwk.x}.${pubJwk.y}`))).slice(0, 18));

export async function createP2P() {
  if (!window.RTCPeerConnection || !crypto?.subtle) return null;
  const { joinRoom, selfId } = await import(LIB);
  const key = await deviceKey(), myId = await idOf(key.pubJwk);
  const proof = b64(await crypto.subtle.sign(SIG, key.priv, enc.encode('shellbound:' + selfId)));
  const verified = new Map(); // trystero peer id → device id (only after the signature checks out)

  async function verify(peerId, hi) {
    try {
      if (!hi?.pub?.x || !hi?.pub?.y || typeof hi.sig !== 'string') return null;
      const pk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: hi.pub.x, y: hi.pub.y, ext: true }, ALG, false, ['verify']);
      const ok = await crypto.subtle.verify(SIG, pk, unb64(hi.sig), enc.encode('shellbound:' + peerId));
      return ok ? idOf(hi.pub) : null;
    } catch { return null; }
  }

  function makeRoom(name) {
    const room = joinRoom({ appId: APP_ID }, name);
    const hi = room.makeAction('hi'), pres = room.makeAction('pres'), msg = room.makeAction('msg');
    const peers = new Map(), topicFns = new Map(), peerFns = new Set();
    let mine = {}, presT = null, notifyT = null, pendingChange = { joined: [], left: [], updated: [] };
    const me = () => ({ peer: selfId, by: myId, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() });
    const snapshot = () => [me(), ...[...peers.values()].map(p => ({ peer: p.peer, by: verified.get(p.peer) || null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: p.presence, updatedAt: p.updatedAt }))];
    function notify(kind, peerId) {
      if (kind) pendingChange[kind].push(peerId);
      if (notifyT) return;
      notifyT = setTimeout(() => {
        notifyT = null; const all = snapshot(), pick = ids => all.filter(p => ids.includes(p.peer));
        const ch = { peers: all, joined: pick(pendingChange.joined), left: pendingChange.left.map(peer => ({ peer, by: null, presence: {} })), updated: pick(pendingChange.updated) };
        pendingChange = { joined: [], left: [], updated: [] };
        for (const fn of peerFns) try { fn(ch); } catch (e) { console.error(e); }
      }, 100);
    }
    room.onPeerJoin = peerId => {
      peers.set(peerId, { peer: peerId, presence: {}, updatedAt: Date.now() });
      hi.send({ pub: { x: key.pubJwk.x, y: key.pubJwk.y }, sig: proof }, { target: peerId });
      pres.send(mine, { target: peerId });
      notify('joined', peerId);
    };
    room.onPeerLeave = peerId => { peers.delete(peerId); notify('left', peerId); };
    hi.onMessage = async (data, { peerId }) => { const id = await verify(peerId, data); if (id) { verified.set(peerId, id); notify('updated', peerId); } };
    pres.onMessage = (data, { peerId }) => {
      if (!data || typeof data !== 'object' || JSON.stringify(data).length > 4096) return;
      const p = peers.get(peerId) || { peer: peerId }; p.presence = data; p.updatedAt = Date.now(); peers.set(peerId, p); notify('updated', peerId);
    };
    msg.onMessage = (data, { peerId }) => {
      if (!data || typeof data.topic !== 'string' || JSON.stringify(data).length > 4096) return;
      for (const fn of topicFns.get(data.topic) || []) try { fn({ topic: data.topic, data: data.data, by: verified.get(peerId) || null, peer: peerId, isMe: false, sameTab: false, kind: 'viewer', guest: false }); } catch (e) { console.error(e); }
    };
    return {
      on(topic, fn) { if (!topicFns.has(topic)) topicFns.set(topic, new Set()); topicFns.get(topic).add(fn); return () => topicFns.get(topic).delete(fn); },
      async emit(topic, data) { msg.send({ topic, data }); },
      async presence(patch) {
        for (const [k, v] of Object.entries(patch)) { if (v === null) delete mine[k]; else mine[k] = v; }
        mine = { ...mine };
        if (!presT) presT = setTimeout(() => { presT = null; pres.send(mine); }, 60);
      },
      peers: snapshot,
      onPeers(fn) { peerFns.add(fn); notify(null); return () => peerFns.delete(fn); },
      async join(name) { const sub = makeRoom('party-' + String(name).slice(0, 48)); return sub; },
      async leave() { room.leave(); peers.clear(); },
      connected: () => true,
    };
  }
  return { room: makeRoom('lobby'), user: { id: async () => myId, me: async () => ({ id: myId }) }, selfId };
}
