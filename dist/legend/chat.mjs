// Text chat: intent detection, character personalities and a safety filter.
// Pure module — no DOM, no Three.js — so every reply rule can be tested under Node.

const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];
let turn = 0;

// Lower-case, strip punctuation, collapse spaces.
export const norm = t => String(t || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const INTENTS = [
  ['deliver', /\b(deliver(y|ed|ing)?|brought|bringing|here'?s your|here is your|your order|for you)\b/],
  ['summon', /\b(come (here|help|quick|quickly|and help)|help me (fight|with)|i need (you|backup|back up)|need your help|save me|back ?up|call papa|come over)\b/],
  ['offer', /\b(can i help|help you|need a hand|any (jobs?|work|tasks?|errands?)|give me (a |some )?(job|work|task|errand)|i want to (help|work)|what can i do for you)\b/],
  ['greet', /^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|bawo|kedu|sannu|how far|ndewo|wetin dey|e kaaro|e kaasan|how are you)\b/],
  ['grow', /\b(grow|grown|teen|teenager|youth|older|bigger|age|birthday)\b/],
  ['coins', /\b(coins?|cowr(y|ies)|money|rich|earn|cash|pay|broke)\b/],
  ['food', /\b(hungry|food|eat|snack|jollof|suya|puff|akara|zobo|chin ?chin|corn|soup)\b/],
  ['shop', /\b(buy|shop|market|store|sell|price|cost)\b/],
  ['riddle', /\b(riddle|drum stones?|elder drum|rhythm)\b/],
  ['gate', /\b(gate|plates?)\b/],
  ['lift', /\b(lift|pillars?|reach|chests?)\b/],
  ['treasure', /\b(treasure|dig|sniff|buried|map)\b/],
  ['weave', /\b(weave|story ?time|calabash|time travel)\b/],
  ['fight', /\b(fight|enem(y|ies)|beetles?|hawks?|greedlings?|attack|devils?)\b/],
  ['boss', /\b(boss|shadow|shade)\b/],
  ['music', /\b(music|songs?|sing|drums?|dance|talking drum)\b/],
  ['fashion', /\b(outfit|clothes|dress|hair|style|fashion|gele|ankara|kente|look|mirror)\b/],
  ['tale', /\b(story|tale|tortoise|cracked|shell|legend)\b/],
  ['feel', /\b(sad|scared|afraid|tired|bored|angry|lonely|hard|difficult|give up)\b/],
  ['thanks', /\b(thank|thanks|thx|e se|daalu|nagode|appreciate)\b/],
  ['bye', /\b(bye|goodbye|see you|later|o dabo|good night)\b/],
  ['who', /\b(who are you|your name|what do you do|about you)\b/],
  ['joke', /\b(joke|funny|laugh|make me smile)\b/],
  ['help', /\b(help|stuck|lost|where|what now|what next|what do i do|what should i|how do i|quest|hint|clue|confused|dont know|don't know)\b/],
];
export function classify(text) {
  const t = norm(text);
  if (!t) return 'empty';
  for (const [id, re] of INTENTS) if (re.test(t)) return id;
  return 'chat';
}

// Personalities. {hero} is the player's heroine; replies stay short, warm and in-world.
export const PERSONAS = {
  grandma: { name: 'Grandma Adaeze', greet: ['Nnọọ, my child! Come, sit by the fire a moment.', 'Ah, {hero}! Kedu? The fire is warm tonight.'],
    who: ['I am Grandma Adaeze, keeper of the village stories. Every crack in a shell holds one.'], joke: ['Why did the tortoise bring a ladder to the feast? Because he heard the food was on a high table! Heh heh.'],
    fallback: ['Hmm. Tell an old woman more, my child.', 'Stories are listening, {hero}. Speak plainly and they answer.'], bye: ['Go well, my child. Ije ọma.'], thanks: ['Daalụ, my dear. Your kindness is your best outfit.'] },
  papa: { name: 'Papa Ike', greet: ['My daughter! How far? I am right here.', 'Ah, {hero}! Ready when you are.'],
    who: ['I am Papa Ike, blacksmith of the Village of Stories — and your number one fan.'], joke: ['What did the anvil say to the hammer? “Stop hitting on me!” Ha! Your Papa is very funny.'],
    fallback: ['Hmm, I hear you, my daughter. Press C if you want me to lift you, wait, or fix your gear.', 'Talk to me any time. If you are stuck, ask me “what next?”'], bye: ['I am never far. Call me with C.'], thanks: ['Anything for you, my daughter.'] },
  mbe: { name: 'Mbe', greet: ['Oh, hello. Yes, I am awake. Mostly.', 'Greetings from the basket, {hero}. It is cosy in here.'],
    who: ['I am Mbe. Yes, THAT tortoise. The one from the feast. Let us not talk about the feathers.'], joke: ['How many feathers does it take to fool a whole flock of birds? Just one each. Allegedly.'],
    fallback: ['Mm-hm. Fascinating. Is there food involved?', 'I am listening. My shell has excellent acoustics.'], bye: ['I will be in the basket. Snoring politely.'], thanks: ['You are welcome. Please do not throw me too hard.'] },
  mama: { name: 'Mama Nkem', greet: ['Ah, my darling! Welcome, welcome! You look hungry.', 'How far, {hero}! Fresh puff-puff just came out of the pot.'],
    who: ['I am Mama Nkem. Best jollof, puff-puff and suya in the village — ask anybody.'], joke: ['My jollof is so good, even the Greedlings queue politely! Well… almost.'],
    fallback: ['Eh-heh! Are you buying or just admiring my akara?', 'Come and see what is in my pots today.'], bye: ['Go well, my darling. Come back hungry!'], thanks: ['No wahala, my darling!'] },
  tailor: { name: 'Aunty Ngozi', greet: ['Darling! Look at you. Who styled you? Oh — you did!', 'Kedu, {hero}! Come and see my new cloth.'],
    who: ['I am Aunty Ngozi. Ankara, Kente, Akwete, Bogolan — every cloth tells its own story, and I know them all.'], joke: ['Why was the gele so proud? Because it was always on top of things!'],
    fallback: ['Mm, interesting. But tell me — what are you wearing to the feast?', 'Fashion is a story you wear, darling.'], bye: ['Stay fabulous, darling!'], thanks: ['For you? Always.'] },
  weaver: { name: 'Weaver Bird', greet: ['Tweet! Oh, it is you. Hello.'], who: ['Weaver Bird. I weave the finest nests in the baobab. Do not touch them.'], joke: ['A joke? My nests are no joke.'], fallback: ['Tweet. Busy, busy.'], bye: ['Tweet-tweet!'], thanks: ['Hmph. You are welcome.'] },
  hornbill: { name: 'Hornbill', greet: ['HONK! A fan! Hello!'], who: ['The FASTEST beak in the savanna. Also very handsome.'], joke: ['Why are my races so fair? Because I always WING! HONK HONK!'], fallback: ['HONK! Want to race? Talk to me with E!'], bye: ['HONK! Fly fast!'], thanks: ['HONK! Of course!'] },
  eagle: { name: 'Eagle', greet: ['Little one.'], who: ['I guard the sky road. I see far.'], joke: ['…No.'], fallback: ['Speak, and be brief.'], bye: ['The wind is with you.'], thanks: ['Hm.'] },
  chidi: { name: 'Chidi', greet: ['How far! The Harmattan is serious today o.'], who: ['Chidi. I farm yams beyond the huts.'], joke: ['Why did the yam go to school? To become a smart-ato! …Okay, that one was bad.'], fallback: ['Eh, true talk.', 'Watch out for Greedlings by the huts.'], bye: ['Later!'], thanks: ['No wahala!'] },
  funke: { name: 'Funke', greet: ['Hi! Ẹ n lẹ! Love the look.'], who: ['Funke. I run the cloth stall with Ngozi on busy days.'], joke: ['What do you call a stylish tortoise? A shell-ebrity!'], fallback: ['Oya, tell me everything.', 'Mama Nkem’s suya is calling me…'], bye: ['Bye bye!'], thanks: ['Anytime!'] },
  kelechi: { name: 'Little Kelechi', greet: ['Hi! Hi! Did you see the beetles? They flip!'], who: ['I’m Kelechi! I’m six and three quarters.'], joke: ['Knock knock! …I forgot the rest.'], fallback: ['Cool!', 'Can you jump on a beetle for me?'], bye: ['Bye-bye!'], thanks: ['You’re welcome!'] },
  amara: { name: 'Amara', friend: true, greet: ['Hey! How far? Need a hand?', 'Hiii! I was just about to call you.'], who: ['Amara! Brave, loud and always first into trouble.'], joke: ['Why don’t beetles play hide and seek? Because they always get flipped!'], fallback: ['Same! Okay, what’s the plan?', 'Ha! Tell me more.'], bye: ['Later, sis!'], thanks: ['That’s what friends are for!'] },
  hadassah: { name: 'Hadassah', friend: true, greet: ['Hi! I just finished reading the whole Tale Book. Twice.'], who: ['Hadassah. Riddles, maps and a lot of questions.'], joke: ['A riddle: what has a shell but no egg? Mbe! …Too easy?'], fallback: ['Interesting. Let me think about that.', 'Logically, we should check the compass first.'], bye: ['Bye! Remember: the compass never lies.'], thanks: ['Glad I could help!'] },
  tehilah: { name: 'Tehilah', friend: true, greet: ['Heyyy! *drums on the table* Hi!', 'Hi! I’m learning a new talking-drum rhythm.'], who: ['Tehilah! If it has a beat, I’m dancing to it.'], joke: ['Why did the talking drum go to school? To improve its tone! Ba-dum-tss.'], fallback: ['Ooh, that has a rhythm to it.', 'Say it again but sing it!'], bye: ['Byeee! Keep the beat!'], thanks: ['Aww, love you!'] },
  tiara: { name: 'Tiara', friend: true, greet: ['Hey! Race you to the river? Kidding. Unless…', 'Hi! Your outfit today? Ten out of ten.'], who: ['Tiara. Fastest runner, best dresser. Facts.'], joke: ['Why did the cowry go to the party? To get spent! Ha!'], fallback: ['Mood.', 'Okay but what are we wearing?'], bye: ['Byeee! Run fast!'], thanks: ['Of course, babe!'] },
  tobi: { name: 'Tobi', friend: true, greet: ['How far! Ready for wahala?', 'Oya! I was just looking for you.'], who: ['Tobi! First to jump, last to give up.'], joke: ['Why did the beetle cross the road? To get flipped on the other side!'], fallback: ['No shaking! What’s the plan?', 'Ehen? Go on.'], bye: ['Later! Stay strong!'], thanks: ['Anytime, my person!'] },
  emeka: { name: 'Emeka', friend: true, greet: ['Hi! I built a new gadget at Papa’s forge.', 'Hey! Did you check your compass?'], who: ['Emeka. Gadgets, maps and plans.'], joke: ['How does Mbe fix his shell? With a tortoise-screwdriver. …I’m still working on that one.'], fallback: ['Let me calculate that.', 'Interesting. Show me the map.'], bye: ['Bye! The compass never lies.'], thanks: ['Happy to help!'] },
  dayo: { name: 'Dayo', friend: true, greet: ['Heyyy! *taps a rhythm* How far?', 'Hi! I learnt a new talking-drum beat.'], who: ['Dayo! If it has a beat, I’m on it.'], joke: ['Why was the drum so tired? It got beaten all day! Ba-dum-tss.'], fallback: ['That has a rhythm to it!', 'Say it again with a beat.'], bye: ['Bye! Keep the beat!'], thanks: ['You’re the best!'] },
  musa: { name: 'Musa', friend: true, greet: ['Hey! Race you to the river? Just kidding… or not.', 'Yo! Sharp look today.'], who: ['Musa. Fastest feet in the village.'], joke: ['Why did the cowry run? Because someone tried to spend it!'], fallback: ['Mood.', 'Okay, let’s move fast.'], bye: ['Later! Run fast!'], thanks: ['No wahala!'] },
};
export const FRIEND_IDS = ['amara', 'hadassah', 'tehilah', 'tiara', 'tobi', 'emeka', 'dayo', 'musa'];

// Who a friend is best at helping with.
const SPECIALITY = { hadassah: ['riddle', 'gate', 'treasure', 'help', 'tale'], tehilah: ['music', 'riddle', 'weave', 'feel'], tiara: ['fashion', 'fight', 'coins', 'grow'], amara: ['fight', 'boss', 'help', 'feel'], tobi: ['fight', 'boss', 'feel'], emeka: ['riddle', 'gate', 'treasure', 'help'], dayo: ['music', 'riddle', 'weave'], musa: ['fight', 'coins', 'grow', 'fashion'] };
export function bestFriendFor(intent, friends) {
  return friends.find(f => SPECIALITY[f]?.includes(intent)) || friends[(turn++) % friends.length];
}

const TOPIC = {
  coins: c => `You have ${c.coins} cowries. You earn them from the ground, chests, buried treasure, beating enemies and errands — and folk here pay for help: ask someone “can I help?”`,
  grow: c => c.nextStage ? `You have earned ${c.earned} cowries so far. Earn ${c.nextStage.need} more and you will grow into a ${c.nextStage.name.toLowerCase()} — stronger and faster.` : `You are already an adult — the strongest you can be!`,
  shop: () => 'Mama Nkem sells food and groceries, Aunty Ngozi sells clothes, and Papa’s forge upgrades your gear. Press B to see your bag.',
  food: c => c.food ? `You have ${c.food} snack${c.food > 1 ? 's' : ''} in your bag — press H to eat one when your hearts are low.` : 'Your bag has no food. Mama Nkem’s stall is east of the fire: puff-puff, akara, suya, jollof…',
  riddle: () => 'At the drum circle past the huts, strike the elder drum and listen. Then hit the coloured stones in the same order — jump on them, spin into them, or throw Mbe.',
  gate: () => 'The canyon gate needs two plates pressed at once. Stand by one, press E to ask Papa to hold it, then stand on the other.',
  lift: () => 'Tall rock pillars with chests are too high to jump. Stand next to one, press C and choose “Lift me up!” — Papa throws you up.',
  treasure: () => 'Press G and Mbe sniffs for buried treasure nearby. Follow the golden light, then press E to dig. A treasure map makes his nose twice as strong.',
  weave: () => 'Press Q to slip between Now and Story-time. Spirit bridges and one golden thread only exist in Story-time; ruins and dust devils belong to Now.',
  fight: () => 'Shift attacks with your weapon (staff spin, catapult, spear or sword — pick one in your bag). R throws Mbe. E (with nobody to talk to) beats your drum to stun. Jump on beetles to flip them. Greedlings steal cowries — beat them to get them back.',
  boss: () => 'When the shadow at the feast gets dizzy, slip into Story-time and spin into its glowing crystals. Jump over the pink shockwaves.',
  music: () => 'Listen — the talking drum, shekere and agogo bell are playing all over the village. Press F to dance!',
  fashion: () => 'Change your look at your mirror near the start, or buy new pieces at Aunty Ngozi’s boutique. Some pieces have little perks too.',
  tale: () => 'Long ago, Tortoise borrowed a feather from every bird and ate the whole sky feast. Find the six Tale Stones to hear it all — press T to read them.',
  feel: () => 'It is okay to feel that way. Take a breath, eat something, and try again. You are braver than you think.',
};

/**
 * Build a reply. ctx = { hero, coins, earned, nextStage, food, hint, quest, job, offer, canDeliver, stuckTip }
 *  - offer: a job this speaker can give right now (or null)
 *  - job: the player's current job (with toName / giverName), canDeliver: true if this speaker is its recipient
 * Returns { text, intent, action? } where action is { type: 'acceptJob', id } or { type: 'deliverJob' }.
 */
export function reply(who, text, ctx = {}) {
  const P = PERSONAS[who] || PERSONAS.papa;
  const intent = classify(text);
  const fill = s => s.replaceAll('{hero}', ctx.hero || 'Amara');
  const seed = turn++ + (text || '').length;
  const say = s => ({ text: fill(s), intent });

  if (ctx.canDeliver && (intent === 'deliver' || intent === 'greet' || intent === 'chat' || intent === 'thanks'))
    return { text: fill(`Ah, ${ctx.job.item}! Thank you, {hero}. Here are your ${ctx.job.reward} cowries.`), intent: 'deliver', action: { type: 'deliverJob' } };
  if (intent === 'deliver') return say(ctx.job ? `That is not for me — take ${ctx.job.item} to ${ctx.job.toName}.` : 'Deliver? I am not expecting anything today.');
  if (intent === 'offer') {
    if (ctx.job) return say(`You are already carrying ${ctx.job.item} for ${ctx.job.toName}. Finish that first!`);
    if (ctx.offer) return { text: fill(`Yes please! Take ${ctx.offer.item} to ${ctx.offer.toName}. I will pay ${ctx.offer.reward} cowries.`), intent, action: { type: 'acceptJob', id: ctx.offer.id } };
    return say(P.friend ? 'Help me? Ha — let’s go and help Mama Nkem or Aunty Ngozi, they always have errands.' : 'Thank you, but I have nothing for you today. Try Mama Nkem or Aunty Ngozi.');
  }
  if (intent === 'summon') {
    const sm = ctx.summon;
    if (sm?.state === 'come') return { text: fill(P.friend ? 'On my way! Hold on, {hero}!' : 'I am coming, my daughter! Hold on!'), intent, action: { type: 'summon' } };
    if (sm?.state === 'here') return say(P.friend ? 'I’m right here with you!' : 'I am right beside you, my daughter.');
    if (sm?.state === 'youth') return say(P.friend ? 'You? Need help fighting? Please — you’ve got this. Call me for two-person jobs though!' : 'You are a youth now — strong enough to face any enemy alone. I will still come for heavy lifting and plates.');
    if (sm?.state === 'offline') return say('…');
    if (sm?.state === 'busy') return say(P.friend ? 'Give me a minute, I just got home! Try again soon.' : 'Let me catch my breath at the forge. Call again in a moment.');
  }
  if (intent === 'help' || intent === 'summon') return say(ctx.hint ? `${ctx.quest ? ctx.quest + ': ' : ''}${ctx.hint}` : 'Follow the golden marker on your compass at the top of the screen.');
  if (TOPIC[intent]) return say(TOPIC[intent](ctx));
  if (intent === 'greet') return say(pick(P.greet, seed));
  if (['who', 'joke', 'bye', 'thanks'].includes(intent)) return say(pick(P[intent], seed));
  if (intent === 'empty') return say('…');
  return say(pick(P.fallback, seed));
}

// ---------------- Safety filter for player-to-player chat ----------------
const BLOCK = ['stupid', 'idiot', 'dumb', 'shut up', 'hate you', 'kill', 'ugly', 'loser', 'damn', 'hell', 'crap', 'sex', 'fuck', 'shit', 'bitch', 'ass'];
export function moderate(raw) {
  let t = String(raw || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, 140);
  let redacted = false;
  const sub = (re, w) => { if (re.test(t)) { redacted = true; t = t.replace(re, w); } };
  sub(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email hidden]');
  sub(/(https?:\/\/|www\.)\S+/gi, '[link hidden]');
  sub(/(\+?\d[\d\s().-]{6,}\d)/g, '[number hidden]');
  for (const w of BLOCK) sub(new RegExp(`\\b${w.replace(' ', '\\s+')}(s|es|ed|ing|er|ers)?\\b`, 'gi'), '♥'); // whole words only: "hello" and "class" stay
  return { text: t, redacted, ok: t.length > 0 };
}

// The instruction turn for optional smart replies (the artifact's `sample` capability).
export function smartPrompt(who, ctx) {
  const P = PERSONAS[who] || PERSONAS.papa;
  return `You are ${P.name}, a character in "Shellbound", a family-friendly 3D adventure game set in a Nigerian village of stories, inspired by the West African tale of how the tortoise got his cracked shell. Players are children, teens and adults.
Speak as ${P.name} to the player's heroine, ${ctx.hero}. Example lines in your voice: ${[...P.greet, ...P.fallback].slice(0, 3).map(s => '"' + s.replaceAll('{hero}', ctx.hero) + '"').join(' ')}
Rules: reply in at most 2 short sentences; warm, playful and kind; light Nigerian flavour (a Pidgin, Yoruba or Igbo greeting now and then) without overdoing it; never ask for or repeat real names, schools, addresses, phone numbers or other personal details; never mention being an AI; stay inside the game world; only state game facts listed below and do not invent controls, places or rewards.
Game facts: current quest "${ctx.quest || 'none'}" — hint: ${ctx.hint || 'follow the compass'}. Cowries: ${ctx.coins}. Growth: ${ctx.nextStage ? `${ctx.nextStage.need} more cowries earned to become a ${ctx.nextStage.name}` : 'fully grown youth'}. Controls: WASD move, Space jump, Shift spin, E talk/act, R throw Mbe, G sniff treasure, Q time weave, C Papa, H eat, B bag.`;
}
