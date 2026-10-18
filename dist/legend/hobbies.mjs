// Village hobbies: fishing, cooking and cycling — each levels up and pays prizes — plus badges,
// a daily gift and daily challenges. Pure data and rules, shared by the game and the tests.

// River fish (Nigerian freshwater favourites). Weight = how often it bites; diff = how hard to reel.
export const FISH = [
  { id: 'tilapia', name: 'Tilapia', icon: '🐟', weight: 40, diff: 1, sell: 3, xp: 4, note: 'The everyday river fish. Grill it with pepper.' },
  { id: 'catfish', name: 'Catfish (eja aro)', icon: '🐟', weight: 26, diff: 2, sell: 5, xp: 6, note: 'Whiskered and wriggly — perfect for pepper soup.' },
  { id: 'mudfish', name: 'Mudfish', icon: '🐟', weight: 14, diff: 2, sell: 6, xp: 7, note: 'Smoked mudfish makes any soup richer.', minLevel: 2 },
  { id: 'perch', name: 'Nile perch', icon: '🐠', weight: 9, diff: 3, sell: 10, xp: 12, note: 'A heavy fighter. Hold steady!', minLevel: 3 },
  { id: 'sandal', name: 'Old sandal', icon: '🩴', weight: 7, diff: 1, sell: 0, xp: 1, note: 'Not a fish. Mbe says it smells like home.', junk: true },
  { id: 'goldcarp', name: 'Golden carp', icon: '✨', weight: 3, diff: 4, sell: 25, xp: 25, note: 'Rare! Grandma says it brings good luck.', minLevel: 3 },
  { id: 'moonfish', name: 'Story-time moonfish', icon: '🌙', weight: 6, diff: 4, sell: 30, xp: 30, note: 'Only bites in Story-time. It glows.', story: true },
];
export const fishOf = id => FISH.find(f => f.id === id);

// Dishes cooked at the village pot. Ingredients come from the market and the river.
export const DISHES = [
  { id: 'grilledfish', name: 'Grilled tilapia', icon: '🍢', heal: 2, sell: 8, note: 'Smoky, peppery, delicious. +2 hearts.' },
  { id: 'peppersoup', name: 'Catfish pepper soup', icon: '🍲', heal: 99, buff: 'zobo', sell: 14, note: 'Restores every heart and recharges your spin faster.' },
  { id: 'egusisoup', name: 'Egusi soup', icon: '🥣', heal: 99, buff: 'chinchin', sell: 20, note: 'Grandma’s recipe. Every heart, and swift feet.' },
  { id: 'fishroll', name: 'Fish roll', icon: '🥐', energy: 1, heal: 1, sell: 6, note: 'Street-snack classic. Refills spin energy.' },
  { id: 'moonstew', name: 'Moonlight stew', icon: '🌙', heal: 99, buff: 'zobo', sell: 45, note: 'Glows faintly. Worth a fortune at the market.' },
];
export const dishOf = id => DISHES.find(d => d.id === id);
// needs: bag items; fish: 'any' accepts any real fish.
export const RECIPES = [
  { id: 'grilledfish', needs: { tilapia: 1, pepper: 1 }, level: 1 },
  { id: 'fishroll', needs: { fish: 1, puffpuff: 1 }, level: 1 },
  { id: 'peppersoup', needs: { catfish: 1, pepper: 1, ugu: 1 }, level: 2 },
  { id: 'egusisoup', needs: { egusi: 1, palmoil: 1, ugu: 1, fish: 1 }, level: 2 },
  { id: 'moonstew', needs: { moonfish: 1, palmoil: 1, pepper: 1 }, level: 3 },
];
const REAL_FISH = FISH.filter(f => !f.junk).map(f => f.id);
// Which bag items a recipe would use, or null if something is missing. 'fish' takes the cheapest fish you hold.
export function recipeUse(bag, recipe) {
  const use = {}, have = id => (bag[id] || 0) - (use[id] || 0);
  for (const [k, n] of Object.entries(recipe.needs)) {
    if (k !== 'fish') { if (have(k) < n) return null; use[k] = (use[k] || 0) + n; continue; }
    for (let i = 0; i < n; i++) {
      const pick = REAL_FISH.filter(id => have(id) > 0 && !Object.keys(recipe.needs).includes(id)).sort((a, b) => fishOf(a).sell - fishOf(b).sell)[0];
      if (!pick) return null; use[pick] = (use[pick] || 0) + 1;
    }
  }
  return use;
}
// Stirring score 0..3 hits → quality ★1..★3; better quality sells for more.
export const quality = hits => Math.max(1, Math.min(3, hits));
export const sellPrice = (base, q = 1) => Math.round(base * (1 + (q - 1) * 0.35));

// Hobby levels and prizes.
export const LEVEL_XP = [0, 25, 70, 150, 280];
export const levelOf = xp => LEVEL_XP.filter(t => xp >= t).length;
export const nextLevelXp = xp => LEVEL_XP.find(t => t > xp) ?? null;
export const HOBBIES = {
  fish: { name: 'Fishing', icon: '🎣', prizes: { 2: { coins: 10 }, 3: { coins: 20, unlock: ['acc:strawhat'], label: 'Fisher’s straw hat' }, 4: { coins: 35 }, 5: { coins: 60, badge: 'angler' } } },
  cook: { name: 'Cooking', icon: '🍲', prizes: { 2: { coins: 10 }, 3: { coins: 20, unlock: ['top:chef'], label: 'Chef’s jacket' }, 4: { coins: 35 }, 5: { coins: 60, badge: 'chef' } } },
  bike: { name: 'Cycling', icon: '🚲', prizes: { 2: { coins: 10 }, 3: { coins: 20, unlock: ['shoes:racers'], label: 'Racing trainers' }, 4: { coins: 35, bike: 'gold' }, 5: { coins: 60, badge: 'cyclist' } } },
};
// Fishing: what bites. Higher fishing level and a better rod reach rarer fish; Story-time brings the moonfish.
export function rollFish(r, { level = 1, rod = 1, story = false } = {}) {
  const pool = FISH.filter(f => (f.minLevel || 1) <= level + rod - 1 && (!f.story || story));
  const w = f => f.weight * (f.junk ? 1 / rod : 1) * (f.diff >= 3 ? 1 + (rod - 1) * 0.6 : 1);
  let t = r * pool.reduce((a, f) => a + w(f), 0);
  for (const f of pool) { t -= w(f); if (t <= 0) return f.id; }
  return pool[0].id;
}
// Reeling: the green zone shrinks for tougher fish and grows with a better rod.
export const reelZone = (fishId, rod = 1) => Math.max(0.12, Math.min(0.5, 0.42 - fishOf(fishId).diff * 0.07 + (rod - 1) * 0.08));
export const reelHits = fishId => fishOf(fishId).diff >= 3 ? 3 : 2;

// Cycling: a loop of gates around the village. Par time decides the prize.
export const BIKE_GATES = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return { x: Math.sin(a) * 22.5, z: 2 + Math.cos(a) * 23.5 }; });
export const BIKE_PAR = 38;
export const bikeReward = secs => secs <= BIKE_PAR * 0.75 ? 25 : secs <= BIKE_PAR ? 15 : 6;

// Badges: shown in the Trophy room. Each check reads the save.
export const BADGES = [
  { id: 'first', name: 'First catch', icon: '🎣', test: s => Object.keys(s.catches || {}).length > 0 },
  { id: 'gold', name: 'Lucky carp', icon: '✨', test: s => (s.catches?.goldcarp || 0) > 0 },
  { id: 'moon', name: 'Moon fisher', icon: '🌙', test: s => (s.catches?.moonfish || 0) > 0 },
  { id: 'cook1', name: 'Little chef', icon: '🍳', test: s => (s.cooked || 0) >= 1 },
  { id: 'feast', name: 'Soup of the day', icon: '🥣', test: s => (s.dishes || []).includes('egusisoup') },
  { id: 'rider', name: 'On two wheels', icon: '🚲', test: s => !!s.bike },
  { id: 'fast', name: 'Speed demon', icon: '⚡', test: s => s.bikeBest > 0 && s.bikeBest <= BIKE_PAR * 0.75 },
  { id: 'monsters', name: 'Monster tamer', icon: '🛡', test: s => (s.enemies || 0) >= 25 },
  { id: 'social', name: 'Friendly face', icon: '👋', test: s => (s.waves || 0) >= 5 },
  { id: 'streak', name: 'Daily visitor', icon: '📅', test: s => (s.daily?.streak || 0) >= 3 },
  { id: 'angler', name: 'Master angler', icon: '🏆', test: s => levelOf(s.hobby?.fish || 0) >= 5 },
  { id: 'chef', name: 'Master chef', icon: '🏆', test: s => levelOf(s.hobby?.cook || 0) >= 5 },
  { id: 'cyclist', name: 'Master cyclist', icon: '🏆', test: s => levelOf(s.hobby?.bike || 0) >= 5 },
];
export const newBadges = s => BADGES.filter(b => !(s.badges || []).includes(b.id) && b.test(s)).map(b => b.id);

// Daily gift: come back on consecutive days for a bigger gift (resets after a missed day).
export const dayNumber = (ms = Date.now()) => Math.floor((ms - new Date().getTimezoneOffset() * 60000) / 86400000);
export function dailyGift(daily, today) {
  if (daily?.day === today) return null;
  const streak = daily?.day === today - 1 ? Math.min(7, (daily.streak || 0) + 1) : 1;
  return { day: today, streak, coins: 4 + streak * 3 };
}
// Three challenges a day, the same for everyone on that day.
export const CHALLENGES = [
  { id: 'c_fish3', text: 'Catch 3 fish', stat: 'fishToday', goal: 3, coins: 12 },
  { id: 'c_cook2', text: 'Cook 2 dishes', stat: 'cookToday', goal: 2, coins: 12 },
  { id: 'c_ride', text: 'Finish the village bike loop', stat: 'rideToday', goal: 1, coins: 10 },
  { id: 'c_mon5', text: 'Defeat 5 monsters', stat: 'monToday', goal: 5, coins: 15 },
  { id: 'c_sell', text: 'Sell 3 things at the market', stat: 'sellToday', goal: 3, coins: 10 },
  { id: 'c_wave', text: 'Wave to 2 players or village friends', stat: 'waveToday', goal: 2, coins: 8 },
  { id: 'c_coins', text: 'Pick up 20 cowries', stat: 'coinToday', goal: 20, coins: 10 },
];
export function challengesFor(day) {
  const out = [], n = CHALLENGES.length; let k = (day * 2654435761) >>> 0;
  while (out.length < 3) { const c = CHALLENGES[k % n]; if (!out.includes(c)) out.push(c); k = (Math.imul(k, 1103515245) + 12345) >>> 0; }
  return out;
}
