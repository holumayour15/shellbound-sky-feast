// Real friends: friend codes, friend requests, invites and a shared party room.
// Only players you have added (and who accepted) can chat with you or invite you; strangers can only send a request.
import { moderate } from './chat.mjs';
import { cleanName } from './save.mjs';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// A short, stable code derived from the platform's user id (FNV-1a hash), so a code can't be faked in a message.
export function friendCode(id) {
  if (typeof id !== 'string' || !id) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let out = '';
  for (let i = 0; i < 6; i++) { out += ALPHA[h % 32]; h = Math.floor(h / 32); }
  return out;
}
export const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const safeName = n => cleanName(moderate(typeof n === 'string' ? n : '').text) || 'Player';
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// hooks: { friends(), setFriends(list), self(), onChange(), onChat(from, text), onInvite(from), onRequest(from), onToast(html), onHello(from, kind) }
// Everyone playing is visible in the world, and anyone may wave or cheer (fixed gestures, no text). Only friends may chat or invite.
export const GESTURES = ['wave', 'cheer', 'dance', 'highfive'];
export function createSocial(room, user, hooks) {
  const S = { lastHello: {}, code: null, requests: [], invites: [], sent: new Set(), party: null, partyRoom: null, partyPeers: [], lobbyPeers: [] };
  const ready = (async () => { try { S.code = friendCode(await user?.id?.()); } catch { S.code = null; } hooks.onChange(); })();
  const isFriend = code => hooks.friends().some(f => f.code === code);
  const senderCode = msg => friendCode(msg.by);
  const players = () => S.lobbyPeers.filter(p => !p.isMe && p.presence?.game === 'shellbound' && p.by).map(p => ({ code: friendCode(p.by), name: safeName(p.presence.name), stage: p.presence.stage, party: p.presence.party, peer: p.peer, guest: p.guest }));
  const onlineFriends = () => { const ps = players(); return hooks.friends().map(f => ({ ...f, online: ps.find(p => p.code === f.code) || null })); };

  room.onPeers(ch => { S.lobbyPeers = ch.peers; for (const p of ch.joined) { const c = p.by && friendCode(p.by); if (c && isFriend(c) && !p.isMe && p.presence?.game === 'shellbound') hooks.onToast(`Your friend <b>${safeName(p.presence.name)}</b> is online.`); } hooks.onChange(); }, () => {});
  room.on('friend', msg => {
    if (msg.isMe) return; const d = msg.data || {}, from = senderCode(msg);
    if (!from || d.to !== S.code) return;
    const name = safeName(d.name);
    if (d.type === 'request') {
      if (isFriend(from)) { room.emit('friend', { type: 'accept', to: from, name: hooks.self().name }).catch(() => {}); return; }
      if (S.sent.has(from)) { addFriend(from, name); room.emit('friend', { type: 'accept', to: from, name: hooks.self().name }).catch(() => {}); return; } // both asked
      if (!S.requests.some(r => r.code === from)) S.requests.push({ code: from, name }); hooks.onRequest({ code: from, name });
    }
    if (d.type === 'accept' && S.sent.has(from)) { S.sent.delete(from); addFriend(from, name); hooks.onToast(`<b>${name}</b> accepted your friend request!`); }
    if (d.type === 'remove' && isFriend(from)) { hooks.setFriends(hooks.friends().filter(f => f.code !== from)); hooks.onChange(); }
    hooks.onChange();
  }, () => {});
  room.on('invite', msg => {
    if (msg.isMe) return; const d = msg.data || {}, from = senderCode(msg);
    if (!from || d.to !== S.code || !isFriend(from)) return; // only befriended players can invite you
    const party = normCode(d.party); if (!party) return;
    const f = hooks.friends().find(x => x.code === from);
    if (!S.invites.some(i => i.code === from)) S.invites.push({ code: from, name: f.name, party });
    hooks.onInvite({ code: from, name: f.name, party }); hooks.onChange();
  }, () => {});
  room.on('chat', msg => {
    if (msg.isMe) return; const from = senderCode(msg);
    if (!from || !isFriend(from)) return; // friends-only chat
    const d = msg.data || {}, tx = moderate(typeof d.text === 'string' ? d.text : '');
    if (!tx.ok) return;
    if (Array.isArray(d.to) && !d.to.includes(S.code)) return;
    hooks.onChat({ code: from, name: hooks.friends().find(f => f.code === from).name, guest: msg.guest }, tx.text);
  }, () => {});

  room.on('hello', msg => {
    if (msg.isMe) return; const d = msg.data || {}, from = senderCode(msg);
    if (!from || d.to !== S.code || !GESTURES.includes(d.kind)) return;
    const now = Date.now(); if (now - (S.lastHello[from] || 0) < 3000) return; S.lastHello[from] = now; // no spamming
    const p = players().find(pl => pl.code === from);
    hooks.onHello?.({ code: from, name: hooks.friends().find(f => f.code === from)?.name || p?.name || 'A player', peer: msg.peer, friend: isFriend(from) }, d.kind);
  }, () => {});
  async function hello(code, kind) { if (!GESTURES.includes(kind)) return false; await room.emit('hello', { to: code, kind }).catch(() => {}); return true; }
  // Everyone in the world: position, look and gesture from their lobby presence (untrusted, clamped).
  function worldPlayers() {
    return S.lobbyPeers.filter(p => !p.isMe && p.by && p.presence?.game === 'shellbound' && typeof p.presence.x === 'number').map(p => {
      const d = p.presence, code = friendCode(p.by), fr = hooks.friends().find(f => f.code === code);
      return { peer: p.peer, code, friend: !!fr, name: fr?.name || safeName(d.name), x: num(d.x), y: num(d.y), z: num(d.z), face: num(d.face), spin: !!d.spin, ride: !!d.ride, anim: GESTURES.includes(d.anim) || ['fish', 'cook'].includes(d.anim) ? d.anim : null,
        title: typeof d.title === 'string' ? safeName(d.title).slice(0, 18) : '', gender: d.gender === 'm' ? 'm' : 'f', stage: typeof d.stage === 'string' ? d.stage : 'child', weapon: typeof d.weapon === 'string' ? d.weapon : 'staff', bike: d.bike === 'gold' ? 'gold' : 'red', look: d.look && typeof d.look === 'object' ? d.look : null, guest: p.guest, at: p.updatedAt };
    });
  }
  function addFriend(code, name) {
    const list = hooks.friends().filter(f => f.code !== code); list.push({ code, name: safeName(name) });
    hooks.setFriends(list); S.requests = S.requests.filter(r => r.code !== code); hooks.onChange();
  }
  async function request(codeRaw) {
    await ready; const code = normCode(codeRaw);
    if (!S.code) return 'Friend codes need you to be signed in to the shared game.';
    if (code.length !== 6) return 'A friend code has 6 letters and numbers.';
    if (code === S.code) return 'That is your own code!';
    if (isFriend(code)) return 'You are already friends.';
    const pending = S.requests.find(r => r.code === code);
    if (pending) { accept(code); return `You are now friends with ${pending.name}.`; }
    S.sent.add(code);
    await room.emit('friend', { type: 'request', to: code, name: hooks.self().name }).catch(() => {});
    return players().some(p => p.code === code) ? 'Request sent! They need to accept it.' : 'Request sent. They will see it if they are playing right now — ask them to open the game.';
  }
  function accept(code) {
    const r = S.requests.find(x => x.code === code); if (!r) return;
    addFriend(code, r.name); room.emit('friend', { type: 'accept', to: code, name: hooks.self().name }).catch(() => {});
  }
  function decline(code) { S.requests = S.requests.filter(r => r.code !== code); hooks.onChange(); }
  function remove(code) { hooks.setFriends(hooks.friends().filter(f => f.code !== code)); room.emit('friend', { type: 'remove', to: code, name: hooks.self().name }).catch(() => {}); hooks.onChange(); }
  async function chat(text) { const to = onlineFriends().filter(f => f.online).map(f => f.code); if (to.length) await room.emit('chat', { text, to }).catch(() => {}); return to.length; }

  // Party: the host's code names a private room; only invited friends are told the name, and others are ignored.
  async function joinParty(party) {
    party = normCode(party); if (!party || S.party === party) return true;
    await leaveParty();
    try {
      const r = await room.join('party-' + party.toLowerCase());
      S.party = party; S.partyRoom = r; S.invites = S.invites.filter(i => i.party !== party);
      r.onPeers(ch => { S.partyPeers = ch.peers.filter(p => !p.isMe && p.by && (isFriend(friendCode(p.by)) || friendCode(p.by) === party)); hooks.onChange(); }, () => {});
      room.presence({ party }).catch(() => {}); hooks.onChange(); return true;
    } catch { return false; }
  }
  async function leaveParty() {
    if (!S.partyRoom) return; try { await S.partyRoom.leave(); } catch { /* already gone */ }
    S.partyRoom = null; S.party = null; S.partyPeers = []; room.presence({ party: null }).catch(() => {}); hooks.onChange();
  }
  async function invite(code) {
    await ready; if (!S.code || !isFriend(code)) return false;
    if (!S.party) await joinParty(S.code);
    await room.emit('invite', { to: code, party: S.party }).catch(() => {}); return true;
  }
  // Remote party members as plain, clamped data for the game to draw.
  function partyMembers() {
    return S.partyPeers.map(p => {
      const d = p.presence || {}, code = friendCode(p.by);
      return { peer: p.peer, code, name: hooks.friends().find(f => f.code === code)?.name || safeName(d.name), x: num(d.x), y: num(d.y), z: num(d.z), face: num(d.face), spin: !!d.spin,
        gender: d.gender === 'm' ? 'm' : 'f', stage: typeof d.stage === 'string' ? d.stage : 'child', weapon: typeof d.weapon === 'string' ? d.weapon : 'staff', look: d.look && typeof d.look === 'object' ? d.look : null, at: p.updatedAt };
    });
  }
  const share = state => { room.presence({ game: 'shellbound', name: state.name, stage: state.stage, party: S.party }).catch(() => {}); S.partyRoom?.presence(state.body).catch(() => {}); };
  const shareWorld = body => room.presence({ game: 'shellbound', party: S.party, ...body }).catch(() => {});
  return { S, ready, players, worldPlayers, hello, shareWorld, onlineFriends, request, accept, decline, remove, chat, invite, joinParty, leaveParty, partyMembers, share, isFriend };
}
