// Shellbound: Amara and the Sky Feast — tuning, content and data tables.
// Pure data: no Three.js or DOM, so tests can import it under Node.

export const VERSION = 4;
export const SAVE_KEY = 'shellbound-hero-v4';
export const OLD_SAVE_KEYS = ['shellbound-amara-v3', 'shellbound-amara-v2'];
export const OLD_SAVE_KEY = OLD_SAVE_KEYS[0];
export const BOARD_KEY = 'shellbound-legends-board-v1';
export const SETTINGS_KEY = 'shellbound-legends-settings-v1';

export const TUNING = {
  walk: 8.6, accel: 46, airAccel: 20, friction: 30,
  gravity: 30, jump: 11.6, doubleJump: 10.8, papaLift: 19,
  glideFall: 2.4, glideSpeed: 10.5, updraft: 46, updraftMax: 11,
  spinSpeed: 21, spinTime: 0.42, spinCost: 0.34, energyRegen: 0.34,
  drumCooldown: 2.2, drumRadius: 7.5, throwCooldown: 1.1, throwRange: 14, sniffCooldown: 6, sniffRange: 32,
  coyote: 0.13, jumpBuffer: 0.14, stepUp: 0.5, radius: 0.6,
  invuln: 1.25, weaveCooldown: 0.75, fallLimit: -24,
};

export const DIFFICULTY = {
  story:     { name: 'Story',     hearts: 6, damage: 1, enemySpeed: 0.7,  raceTime: 70, scoreMul: 0.6, note: 'Relaxed. Plenty of hearts, gentle enemies, generous timers.' },
  adventure: { name: 'Adventure', hearts: 4, damage: 1, enemySpeed: 1.0,  raceTime: 52, scoreMul: 1.0, note: 'The intended balance of exploration and challenge.' },
  hard:      { name: 'Hard',      hearts: 4, damage: 1, enemySpeed: 1.15, raceTime: 46, scoreMul: 1.3, note: 'Faster, tougher enemies and more of them.' },
  legend:    { name: 'Legend',    hearts: 3, damage: 1, enemySpeed: 1.3,  raceTime: 42, scoreMul: 1.6, note: 'For speedrunners. Faster enemies, tight timers, bigger scores.' },
};

// ---------------- Amara's look ----------------
// cost 0 = free from the start · cost > 0 = buy at Aunty Ngozi's boutique · cost -1 = earned in the adventure.
export const LOOK = {
  hair: { label: 'Hair', items: [
    { id: 'puffs', name: 'Afro puffs', cost: 0, g: 'f' },
    { id: 'afro', name: 'Big afro', cost: 0 },
    { id: 'braids', name: 'Beaded braids', cost: 0, g: 'f' },
    { id: 'bantu', name: 'Bantu knots', cost: 0, g: 'f' },
    { id: 'highpuff', name: 'High puff', cost: 0, g: 'f' },
    { id: 'lowcut', name: 'Low cut', cost: 0, g: 'm' },
    { id: 'hightop', name: 'High-top', cost: 0, g: 'm' },
    { id: 'twists', name: 'Twists', cost: 0, g: 'm' },
    { id: 'cornrows', name: 'Cornrows', cost: 0, g: 'm' },
    { id: 'gele', name: 'Festival gele', origin: 'Yoruba headwrap for celebrations', cost: -1, perk: 'Glide lasts longer', mod: { glide: 1.2 }, g: 'f' },
    { id: 'filacap', name: 'Festival fila', origin: 'Yoruba men’s cap, worn with buba and sokoto', cost: -1, perk: 'Glide lasts longer', mod: { glide: 1.2 }, g: 'm' },
  ] },
  hairColor: { label: 'Hair colour', items: [
    { id: 'black', name: 'Midnight black', color: '#17110d', cost: 0 },
    { id: 'espresso', name: 'Espresso', color: '#2f1d13', cost: 0 },
    { id: 'auburn', name: 'Auburn', color: '#5e2a16', cost: 0 },
    { id: 'honey', name: 'Honey', color: '#8b5a2b', cost: 10 },
    { id: 'blonde', name: 'Sunlit blonde', color: '#c9a060', cost: 0 },
    { id: 'silver', name: 'Silver', color: '#a8a4a0', cost: 0 },
    { id: 'indigo', name: 'Adire indigo', color: '#25306b', cost: 15 },
  ] },
  acc: { label: 'Accessories', items: [
    { id: 'bow', name: 'Yellow bow + red band', cost: 0, g: 'f' },
    { id: 'cap', name: 'Red snapback cap', cost: 10, g: 'm' },
    { id: 'none', name: 'Nothing', cost: 0 },
    { id: 'beads', name: 'Coral bead necklace', origin: 'Worn at Nigerian weddings and festivals', cost: 18, perk: '+1 heart', mod: { hearts: 1 } },
    { id: 'stars', name: 'Star clips', cost: -1, perk: 'Cowry magnet', mod: { magnet: 1.6 }, g: 'f' },
    { id: 'chain', name: 'Gold chain', cost: -1, perk: 'Cowry magnet', mod: { magnet: 1.6 }, g: 'm' },
    { id: 'glasses', name: 'Round glasses', cost: 8, perk: 'Mbe sniffs further', mod: { sniff: 1.4 } },
    { id: 'crown', name: 'Feather crown', origin: 'Gift of the three birds', cost: -1, perk: 'Double jump goes higher', mod: { djump: 1.15 } },
    { id: 'strawhat', name: 'Fisher’s straw hat', origin: 'Prize for fishing level 3', cost: -1, perk: 'Rare fish bite more', mod: { luck: 1.3 } },
  ] },
  top: { label: 'Top', items: [
    { id: 'pink', name: 'Pink tee', color: '#e8687a', cost: 0 },
    { id: 'white', name: 'White tee', color: '#f1ece2', cost: 0 },
    { id: 'adire', name: 'Adire top', origin: 'Yoruba resist-dyed indigo, Abeokuta', tex: 'adire', cost: 0 },
    { id: 'ankara', name: 'Ankara top', origin: 'Pan-West African wax print', tex: 'ankara', cost: 12, perk: 'Style +1', mod: { style: 1 } },
    { id: 'kente', name: 'Kente vest', origin: 'Asante and Ewe weaving, Ghana', tex: 'kente', cost: 22, perk: 'Style +2', mod: { style: 2 } },
    { id: 'buba', name: 'Aso-oke buba', origin: 'Yoruba men’s top, hand-loomed aso-oke', tex: 'asooke', cost: 0, g: 'm' },
    { id: 'jersey', name: 'Green football jersey', color: '#1f8a4a', cost: 8 },
    { id: 'chef', name: 'Chef’s jacket', color: '#f4f1ea', origin: 'Prize for cooking level 3', cost: -1, perk: 'Dishes cook one star better', mod: { chef: 1 } },
    { id: 'feather', name: 'Borrowed-feather jacket', origin: 'Earned at the Sky Feast', tex: 'feather', cost: -1, perk: 'Glide faster', mod: { glideSpeed: 1.2 } },
  ] },
  bottom: { label: 'Bottom', items: [
    { id: 'overalls', name: 'Mustard overall dress', color: '#d29a3c', cost: 0, g: 'f' },
    { id: 'denim', name: 'Denim overalls', color: '#3d5c8c', cost: 0 },
    { id: 'wrapper', name: 'Adire wrapper skirt', tex: 'adire', origin: 'Yoruba indigo cloth', cost: 0, g: 'f' },
    { id: 'sokoto', name: 'Sokoto trousers', color: '#3b2e5a', origin: 'Yoruba men’s trousers', cost: 0, g: 'm' },
    { id: 'cargo', name: 'Cargo shorts', color: '#6b6a3a', cost: 0, g: 'm' },
    { id: 'akwete', name: 'Akwete skirt', tex: 'akwete', origin: 'Igbo women’s weaving, Akwete', cost: 14, perk: 'Style +1', mod: { style: 1 }, g: 'f' },
    { id: 'akwetewrap', name: 'Akwete trousers', tex: 'akwete', origin: 'Igbo weaving, Akwete', cost: 14, perk: 'Style +1', mod: { style: 1 }, g: 'm' },
    { id: 'bogolan', name: 'Bogolan shorts', tex: 'bogolan', origin: 'Bamana mud cloth, Mali', cost: 10, perk: 'Spin recharges faster', mod: { regen: 1.15 } },
  ] },
  shoes: { label: 'Shoes', items: [
    { id: 'sneakers', name: 'Red sneakers', color: '#d84a3a', cost: 0 },
    { id: 'sandals', name: 'Leather sandals', color: '#7a4a24', cost: 0 },
    { id: 'boots', name: 'Rain boots', color: '#f0b62e', cost: 10, perk: '+5% run speed', mod: { speed: 1.05 } },
    { id: 'glitter', name: 'Glitter sneakers', color: '#c79bff', cost: -1, perk: '+8% run speed', mod: { speed: 1.08 } },
    { id: 'racers', name: 'Racing trainers', color: '#2ee6a8', origin: 'Prize for cycling level 3', cost: -1, perk: 'Bike rides 10% faster', mod: { bike: 1.1 } },
  ] },
  face: { label: 'Face', items: [
    { id: 'clean', name: 'Fresh face', cost: 0 },
    { id: 'blush', name: 'Rosy cheeks', cost: 0, g: 'f' },
    { id: 'freckles', name: 'Freckles', cost: 0 },
    { id: 'uli', name: 'Uli face dots', origin: 'Inspired by Igbo uli body art', cost: 8, perk: 'Drum pulse +20%', mod: { drum: 1.2 } },
    { id: 'glitter', name: 'Glitter stars', cost: -1, perk: 'Style +2', mod: { style: 2 } },
  ] },
  lips: { label: 'Lips', items: [
    { id: 'natural', name: 'Natural', color: '#7a3b33', cost: 0 },
    { id: 'berry', name: 'Berry gloss', color: '#9c2550', cost: 6, g: 'f' },
    { id: 'coral', name: 'Coral gloss', color: '#e3624f', cost: 6, g: 'f' },
  ] },
  skin: { label: 'Skin', items: [
    { id: 'ebony', name: 'Ebony', color: '#4b2a1a', cost: 0 },
    { id: 'cocoa', name: 'Cocoa', color: '#653a24', cost: 0 },
    { id: 'mahogany', name: 'Mahogany', color: '#7a4a2e', cost: 0 },
    { id: 'chestnut', name: 'Chestnut', color: '#8f5a3a', cost: 0 },
    { id: 'caramel', name: 'Caramel', color: '#a96f48', cost: 0 },
    { id: 'golden', name: 'Golden', color: '#c08458', cost: 0 },
    { id: 'sand', name: 'Sand', color: '#d9a982', cost: 0 },
    { id: 'ivory', name: 'Ivory', color: '#efcdb2', cost: 0 },
  ] },
};
export const SLOTS = Object.keys(LOOK);
export const DEFAULT_LOOK = { hair: 'puffs', hairColor: 'black', acc: 'bow', top: 'pink', bottom: 'overalls', shoes: 'sneakers', face: 'blush', lips: 'natural', skin: 'cocoa' };
export const lookItem = (slot, id) => LOOK[slot]?.items.find(i => i.id === id);

// ---------------- The four heroines ----------------
// Pick one to play on the Getting Ready screen; the other three become her friends in the village and in chat.
export const HEROINES = [
  { id: 'amara', name: 'Amara', trait: 'Brave', perk: '+1 heart', mod: { hearts: 1 }, color: '#e8687a',
    blurb: 'Leads from the front and never leaves a friend behind.',
    look: { hair: 'puffs', hairColor: 'black', acc: 'bow', top: 'pink', bottom: 'overalls', shoes: 'sneakers', face: 'blush', lips: 'natural', skin: 'cocoa' } },
  { id: 'hadassah', name: 'Hadassah', trait: 'Clever', perk: 'Mbe sniffs 40% further', mod: { sniff: 1.4 }, color: '#2a6fdb',
    blurb: 'Reads every map twice and solves riddles for fun.',
    look: { hair: 'braids', hairColor: 'espresso', acc: 'glasses', top: 'adire', bottom: 'denim', shoes: 'sandals', face: 'freckles', lips: 'natural', skin: 'ebony' } },
  { id: 'tehilah', name: 'Tehilah', trait: 'Musical', perk: 'Drum pulse +30%', mod: { drum: 1.3 }, color: '#2fa84f',
    blurb: 'Sings with the talking drums and keeps the whole village dancing.',
    look: { hair: 'bantu', hairColor: 'auburn', acc: 'none', top: 'ankara', bottom: 'akwete', shoes: 'boots', face: 'uli', lips: 'coral', skin: 'chestnut' } },
  { id: 'tiara', name: 'Tiara', trait: 'Swift', perk: '+6% run speed', mod: { speed: 1.06 }, color: '#f2c21b',
    blurb: 'Fastest runner in the village and the sharpest dresser at every festival.',
    look: { hair: 'highpuff', hairColor: 'honey', acc: 'bow', top: 'white', bottom: 'bogolan', shoes: 'sneakers', face: 'blush', lips: 'berry', skin: 'caramel' } },
];
for (const h of HEROINES) h.gender = 'f';
export const BOYS = [
  { id: 'tobi', name: 'Tobi', gender: 'm', trait: 'Brave', perk: '+1 heart', mod: { hearts: 1 }, color: '#d8553a',
    blurb: 'First to jump, last to give up, and the loudest laugh in the village.',
    look: { hair: 'hightop', hairColor: 'black', acc: 'none', top: 'white', bottom: 'cargo', shoes: 'sneakers', face: 'clean', lips: 'natural', skin: 'cocoa' } },
  { id: 'emeka', name: 'Emeka', gender: 'm', trait: 'Clever', perk: 'Mbe sniffs 40% further', mod: { sniff: 1.4 }, color: '#2a6fdb',
    blurb: 'Builds gadgets from scrap at Papa’s forge and never loses a map.',
    look: { hair: 'lowcut', hairColor: 'black', acc: 'glasses', top: 'adire', bottom: 'denim', shoes: 'sandals', face: 'freckles', lips: 'natural', skin: 'ebony' } },
  { id: 'dayo', name: 'Dayo', gender: 'm', trait: 'Musical', perk: 'Drum pulse +30%', mod: { drum: 1.3 }, color: '#2fa84f',
    blurb: 'Plays the talking drum at every festival — the drum practically talks back.',
    look: { hair: 'twists', hairColor: 'auburn', acc: 'beads', top: 'buba', bottom: 'sokoto', shoes: 'boots', face: 'uli', lips: 'natural', skin: 'chestnut' } },
  { id: 'musa', name: 'Musa', gender: 'm', trait: 'Swift', perk: '+6% run speed', mod: { speed: 1.06 }, color: '#f2c21b',
    blurb: 'Fastest feet in three villages and always the sharpest-dressed at the match.',
    look: { hair: 'cornrows', hairColor: 'espresso', acc: 'cap', top: 'jersey', bottom: 'bogolan', shoes: 'sneakers', face: 'clean', lips: 'natural', skin: 'caramel' } },
];
// Every playable hero. HEROINES (the four girls) are always in the story as friends.
export const HEROES = [...HEROINES, ...BOYS];
export const heroine = id => HEROES.find(h => h.id === id) || HEROINES[0];
export const fitsGender = (item, gender) => !item.g || item.g === gender;

// ---------------- Growing up ----------------
// Lifetime cowries earned (not spent) unlock each stage; the mirror lets you choose any unlocked stage.
// Age sets the challenge (enemy speed, how many monsters roam) and the weapon tier.
export const STAGES = [
  { id: 'child', name: 'Child', earn: 0, diff: 'story', tier: 0, monsters: 3, perk: 'Papa walks beside you and fights with you. Gentle enemies.', mod: {} },
  { id: 'teen', name: 'Teenager', earn: 120, diff: 'adventure', tier: 1, monsters: 5, perk: 'Papa stays at his forge — call him or online friends for hard fights. Iron weapons, +1 heart.', mod: { hearts: 1, speed: 1.05 } },
  { id: 'youth', name: 'Youth', earn: 300, diff: 'hard', tier: 2, monsters: 7, perk: 'Fights alone: power spin, bronze weapons, +50% drum, +2 hearts.', mod: { hearts: 2, speed: 1.1, glide: 1.1, drum: 1.5, spin: 1.2 } },
  { id: 'adult', name: 'Adult', earn: 600, diff: 'legend', tier: 3, monsters: 9, perk: 'Master of the village: gold weapons, the toughest monsters, +3 hearts.', mod: { hearts: 3, speed: 1.12, glide: 1.15, drum: 1.6, spin: 1.3, regen: 1.2 } },
];
export const stageIndex = id => Math.max(0, STAGES.findIndex(s => s.id === id));
export const TIERS = [{ name: 'Wooden', color: '#9a6a3a', mul: 1 }, { name: 'Iron', color: '#7c8088', mul: 1.25 }, { name: 'Bronze', color: '#c9813a', mul: 1.6 }, { name: 'Gold', color: '#f1c24b', mul: 2.1 }];

// Weapons: the attack button uses whichever one is equipped. Damage grows with the age tier.
export const WEAPONS = [
  { id: 'none', name: 'Bare hands', kind: 'spin', dmg: 1, cost: 0, minStage: 'child', note: 'A spinning dash — no weapon at all.' },
  { id: 'staff', name: 'Story staff', kind: 'spin', dmg: 1, cost: 0, minStage: 'child', note: 'Spin attack that hits everything you touch.' },
  { id: 'sling', name: 'Catapult', kind: 'shoot', dmg: 1, cost: 12, minStage: 'child', note: 'A forked-stick catapult: fires pebbles at the nearest enemy.' },
  { id: 'spear', name: 'Hunter’s spear', kind: 'thrust', dmg: 2, cost: 25, minStage: 'teen', note: 'A long lunge that strikes enemies in front of you.' },
  { id: 'ida', name: 'Idà sword', kind: 'slash', dmg: 3, cost: 45, minStage: 'youth', note: 'A broad sword in the Yoruba idà style: a wide, powerful slash.' },
];
export const weaponOf = id => WEAPONS.find(w => w.id === id) || WEAPONS[1];

// Talents: the player's own strength (the same four the village friends have).
export const TALENTS = [
  { id: 'brave', name: 'Brave', perk: '+1 heart', mod: { hearts: 1 } },
  { id: 'clever', name: 'Clever', perk: 'Mbe sniffs 40% further', mod: { sniff: 1.4 } },
  { id: 'musical', name: 'Musical', perk: 'Drum pulse +30%', mod: { drum: 1.3 } },
  { id: 'swift', name: 'Swift', perk: '+6% run speed', mod: { speed: 1.06 } },
];

export const stageFor = earned => [...STAGES].reverse().find(s => earned >= s.earn) || STAGES[0];

// ---------------- Paid jobs (offered in chat or by talking) ----------------
export const JOBS = [
  { id: 'jollof-chidi', giver: 'mama', to: 'chidi', item: 'a pot of jollof rice', reward: 8 },
  { id: 'puff-kelechi', giver: 'mama', to: 'kelechi', item: 'a bag of puff-puff', reward: 6 },
  { id: 'akara-grandma', giver: 'mama', to: 'grandma', item: 'hot akara', reward: 6 },
  { id: 'ankara-funke', giver: 'tailor', to: 'funke', item: 'a roll of Ankara cloth', reward: 8 },
  { id: 'gele-grandma', giver: 'tailor', to: 'grandma', item: 'a new gele', reward: 9 },
  { id: 'yam-mama', giver: 'grandma', to: 'mama', item: 'a basket of yams', reward: 7 },
  { id: 'hoe-chidi', giver: 'papa', to: 'chidi', item: 'a mended hoe', reward: 8 },
  { id: 'drum-tehilah', giver: 'papa', to: 'friend', item: 'a tuned talking drum', reward: 9 },
];
export const findItem = lookItem;

// ---------------- Market, food and gear ----------------
export const SHOP = {
  food: [
    { id: 'puffpuff', name: 'Puff-puff', note: 'Sweet fried dough balls', cost: 2, heal: 1, icon: '●' },
    { id: 'akara', name: 'Akara', note: 'Bean fritters', cost: 3, heal: 1, icon: '◍' },
    { id: 'corn', name: 'Roasted corn', note: 'Refills spin energy', cost: 3, energy: 1, icon: '❘' },
    { id: 'suya', name: 'Suya', note: 'Spiced grilled skewer', cost: 6, heal: 2, icon: '⟋' },
    { id: 'zobo', name: 'Zobo drink', note: 'Hibiscus — spin recharges twice as fast for 60 s', cost: 4, buff: 'zobo', icon: '◖' },
    { id: 'chinchin', name: 'Chin chin', note: 'Crunchy snack — run 15% faster for 45 s', cost: 5, buff: 'chinchin', icon: '⁘' },
    { id: 'jollof', name: 'Jollof rice', note: 'Restores every heart', cost: 10, heal: 99, icon: '◉' },
  ],
  groceries: [
    { id: 'egusi', name: 'Egusi seeds', note: 'Ground melon seeds for the soup', cost: 3, icon: '⁙' },
    { id: 'palmoil', name: 'Palm oil', note: 'A small bottle', cost: 3, icon: '◒' },
    { id: 'pepper', name: 'Scotch bonnet peppers', note: 'Careful, hot!', cost: 2, icon: '◆' },
    { id: 'ugu', name: 'Ugu leaves', note: 'Fluted pumpkin leaves', cost: 2, icon: '❦' },
  ],
  items: [
    { id: 'map', name: 'Treasure map', note: 'Mbe sniffs twice as far', cost: 8, once: true, icon: '⌖' },
    { id: 'whistle', name: 'Papa’s whistle', note: 'Press C to call Papa to you instantly, wherever he is', cost: 6, once: true, icon: '♪' },
  ],
};
export const FORGE = [
  { id: 'staff1', name: 'Iron-bound staff', note: 'Spin attack reaches further', cost: 15, mod: { spin: 1.2 } },
  { id: 'staff2', name: 'Bronze staff', note: 'Spin attack costs less energy', cost: 30, need: 'staff1', mod: { spinCost: 0.75 } },
  { id: 'basket1', name: 'Woven basket', note: 'Mbe rolls 25% further', cost: 12, mod: { throw: 1.25 } },
  { id: 'charm', name: 'Heart charm', note: '+1 heart', cost: 35, mod: { hearts: 1 } },
  { id: 'sandals', name: 'Runner’s straps', note: '+6% run speed', cost: 20, mod: { speed: 1.06 } },
  { id: 'rod2', name: 'Iron fishing hook', note: 'Wider reel zone and bigger fish', cost: 18 },
  { id: 'rod3', name: 'Golden reel', note: 'The best rod in the village', cost: 40, need: 'rod2' },
];
export const GROCERY_LIST = ['egusi', 'palmoil', 'pepper', 'ugu'];
import { FISH, DISHES } from './hobbies.mjs';
export const shopItem = id => [...SHOP.food, ...SHOP.groceries, ...SHOP.items, ...FISH, ...DISHES].find(i => i.id === id);

// Combine worn items and forge upgrades into gameplay modifiers.
export function modifiers(look, upgrades = [], talentId = 'brave', stageId = 'child') {
  const m = { speed: 1, glide: 1, glideSpeed: 1, magnet: 1, djump: 1, regen: 1, weave: 1, hearts: 0, spin: 1, drum: 1, style: 0, spinCost: 1, sniff: 1, throw: 1 };
  const apply = mod => { for (const [k, v] of Object.entries(mod || {})) { if (k === 'hearts' || k === 'style') m[k] += v; else m[k] *= v; } };
  for (const slot of SLOTS) apply(lookItem(slot, look?.[slot])?.mod);
  for (const u of upgrades) apply(FORGE.find(f => f.id === u)?.mod);
  apply((TALENTS.find(t => t.id === talentId) || heroine(talentId)).mod);
  apply(STAGES.find(s => s.id === stageId)?.mod);
  return m;
}

// Story drums (checkpoints), in route order.
export const CHECKPOINTS = [
  { x: 0, z: 12, name: 'Village of Stories' },
  { x: 2, z: -47, name: 'River Crossing' },
  { x: 5, z: -96, name: 'Gold Savanna' },
  { x: 7, z: -152, name: 'Harmattan Canyon' },
  { x: 0, z: -204, name: 'Canyon of Echoes' },
  { x: 2, z: -258, name: "Eagle's Perch" },
  { x: 0, y: 43, z: -281, name: 'Baobab Crown' },
  { x: -4, y: 53, z: -338, name: 'Sky Road' },
  { x: 0, y: 58, z: -377, name: 'Gate of the Feast' },
];

export const QUEST = [
  { id: 'meet',    title: 'Find Grandma Adaeze',          detail: 'Papa is walking you to the story fire.', zone: 'Village of Stories' },
  { id: 'weave',   title: 'Shake the Story Calabash',     detail: 'Press Q (or the moon button) and see who wakes up.', zone: 'Village of Stories' },
  { id: 'market',  title: 'Market run for Grandma',       detail: 'Buy egusi, palm oil, peppers and ugu at Mama Nkem’s stall.', zone: 'Village of Stories' },
  { id: 'soup',    title: 'Bring the groceries home',     detail: 'Grandma is waiting by the fire.', zone: 'Village of Stories' },
  { id: 'weaver',  title: 'Speak to Weaver Bird',         detail: 'She nests in the great baobab.', zone: 'Village of Stories' },
  { id: 'threads', title: 'Gather golden threads',        detail: 'Five threads. One is locked in the drum chest, one floats in Story-time.', zone: 'Village of Stories' },
  { id: 'return1', title: 'Return the threads to Weaver', detail: 'She is still fussing in the baobab.', zone: 'Village of Stories' },
  { id: 'river',   title: 'Cross the river to Hornbill',  detail: 'Hop the stepping stones. Use your double jump.', zone: 'River Crossing' },
  { id: 'race',    title: "Win Hornbill's ring race",     detail: 'Fly through all eight rings before the drum stops.', zone: 'Gold Savanna' },
  { id: 'canyon',  title: "Reach Eagle's Perch",          detail: 'A stone gate blocks the canyon: you and Papa must press both plates.', zone: 'Harmattan Canyon' },
  { id: 'hawks',   title: 'Drive out the shadow hawks',   detail: 'In Story-time: drum or throw Mbe to stun them, then spin.', zone: "Eagle's Perch" },
  { id: 'climb',   title: 'Climb the Sky Baobab',         detail: 'Spiral up the great tree, then follow the Sky Road.', zone: 'Sky Baobab' },
  { id: 'boss',    title: 'Face Mbe’s greedy shadow',     detail: 'Wait until it is dizzy, slip into Story-time, then spin.', zone: 'Sky Feast' },
  { id: 'done',    title: 'The feast is shared',          detail: 'You restored the tale. Keep exploring for treasure!', zone: 'Sky Feast' },
];
export const questIndex = id => QUEST.findIndex(q => q.id === id);

export const TALES = [
  { title: 'The Invitation', text: 'Once, the birds of the sky were invited to a feast among the clouds. Tortoise, whose feet had never left the ground, heard the news and could not sleep for hunger.' },
  { title: 'The Borrowed Feathers', text: 'Tortoise was a sweet talker. He went from bird to bird: “Just one feather, my friend.” Soon he wore a coat of a hundred colours, and he flew with them.' },
  { title: 'A New Name', text: 'On the way, Tortoise said, “At great feasts, guests take new names. Mine shall be All of You.” The birds were excited and did not think twice.' },
  { title: 'The Feast', text: 'The hosts set out pounded yam, rich soup and palm wine. Tortoise asked, “For whom is this feast?” “For all of you,” they replied. So Tortoise ate, and ate, and left the birds only scraps.' },
  { title: 'Feathers Taken Back', text: 'Hungry and angry, each bird took back its feather. Tortoise was left at the edge of the sky with nothing but his shell.' },
  { title: 'The Fall', text: 'He begged Parrot to tell his wife to lay out soft things to catch him. Parrot told her to bring out the hardest things instead. Tortoise fell, and his shell cracked. It was mended piece by piece, and it has looked patched ever since.' },
];

export const TALE_NOTE = 'Retold in this game’s own words from the widely told West African tale of how the tortoise got his cracked shell, known among the Igbo of Nigeria and beyond. Tellings differ from place to place.';

// Scoring for the competitive leaderboard.
export function score({ cowries = 0, tales = 0, enemies = 0, seconds = 0, deaths = 0, style = 0, treasure = 0, difficulty = 'adventure' }) {
  const mul = (DIFFICULTY[difficulty] || DIFFICULTY.adventure).scoreMul;
  const time = Math.max(0, 2400 - seconds) * 3;
  const raw = cowries * 10 + tales * 500 + enemies * 120 + treasure * 300 + time + style * 250 - deaths * 150;
  return Math.max(0, Math.round(raw * mul));
}
export function grade(points) {
  return points >= 14000 ? 'S' : points >= 10000 ? 'A' : points >= 6500 ? 'B' : points >= 3000 ? 'C' : 'D';
}
