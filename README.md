# Shellbound: The Sky Feast

A real-time 3D adventure for Bukham Play, built around the widely told West African tale of how the tortoise got his cracked shell. The fourth dimension is **time**: at any moment the player can slip between **Now** (the world as it is) and **Story-time** (the world as it was told). Bridges, threads, enemies, lighting and music all change between the two.

Buildless static site, Three.js 0.180.0 vendored locally, WebGL2. No backend.

## Play locally

```sh
python tools/serve.py 8000
```

Then open http://127.0.0.1:8000. (On Windows you can use `py tools/serve.py 8000`.) Any static server works; double-clicking `index.html` does not, because browsers block ES modules from `file://`.

## Iteration 7 — the story ends

If your hearts run out, the story ends and begins again from the very beginning. Grandma Adaeze then teaches you how to beat whatever ended it, with a safe practice fight by her fire for beetles, Greedlings and Brutes. Your hero, outfits, badges and hobbies are kept.

## Iteration 5 — hobbies, prizes, everyone online, phones

- **Hobbies with prizes:** fish at the river jetty, cook Nigerian dishes at the village pot, ride a bike round the ten-gate village loop. Each hobby levels up to 5 and pays cowries, outfits and a golden bike. Sell catches and dishes to Mama Nkem.
- **Come back daily:** a daily gift that grows with your streak, three daily challenges, 13 badges and a fish collection (🏆 or Y).
- **A shared world:** everyone playing appears in the village. Wave, cheer, dance or high-five (Z or 👋); add people as friends to chat and invite them.
- **Phones:** a compact layout for phones held sideways, bike and emote buttons, full screen, and a portrait-friendly hero creator. See `PHONE_TESTING.md` for testing with friends and family.

## Iteration 4 — your own hero, ages, weapons and real friends

- **Create your hero:** type your name, pick girl or boy, a talent and a look — or take a selfie to match your skin tone and hair.
- **Choose your age:** child, teenager, youth or adult. Age sets the challenge, how many monsters roam and your weapon metal (wooden → iron → bronze → gold). Earn cowries to grow older.
- **Weapons (optional):** bare hands, story staff, catapult, hunter's spear (teen+), idà sword (youth+). Buy and equip at Papa's forge or in the bag; Shift attacks.
- **More monsters:** charging Harmattan Brutes and Story-time wisps join beetles and Greedlings, appearing at random spots beyond the village.
- **Friends:** Amara, Hadassah, Tehilah, Tiara, Tobi, Emeka, Dayo and Musa are your village friends. In the shared game, add real friends with a friend code, chat with them, and invite them to play in your world. Strangers can only send a friend request.

## Iteration 3 — eight heroes, growing up, chat and a Nigerian soundscape

- **Girl or boy.** The Getting Ready screen starts with Girl / Boy. Girls: **Amara** (brave, +1 heart), **Hadassah** (clever, Mbe sniffs further), **Tehilah** (musical, bigger drum pulse), **Tiara** (swift, faster). Boys mirror the same traits: **Tobi, Emeka, Dayo, Musa**. The wardrobe shows only pieces that suit the chosen hero: boys get low cut, high-top, twists and cornrows hair, a red snapback, a gold chain, an aso-oke buba, sokoto and Akwete trousers, cargo shorts; earned rewards come in a girl's and a boy's version (gele or fila, star clips or gold chain). Shared pieces (tees, Adire, Ankara, Kente, jersey, beads, glasses, shoes, uli dots, feather crown and jacket) work for everyone. Dialogue adapts ("my daughter" / "my son"). The four girls you are not playing are your friends in the village.
- **Growing up.** Lifetime cowries earned unlock **Teenager** (120) and **Youth** (300), with a short ceremony and a taller model. *Child:* Papa follows and fights beside you. *Teenager:* Papa stays at his forge; press C to call him in for a minute of help, or V / the Friends chat to call an **online** friend. *Youth:* fights alone — the spin becomes a power spin that hits everything around her or him, drum +50%, longer invulnerability; Papa and friends still come for two-person jobs (lifts, pressure plates) but no longer fight. Any unlocked age can be chosen at the mirror.
- **Text chat (Enter or the ✉ button).** *Nearby* talks to whoever can hear you; *Papa & Mbe* always hear you; *Friends* reaches the other heroes (with online/offline status and Call buttons) and, in the shared artifact, real players who have the game open. Characters answer from what the game knows: quest hints, coins, growth progress, food, puzzles, jokes. Ask "can I help?" and Mama Nkem, Aunty Ngozi, Grandma or Papa hand out **paid delivery jobs** — a repeatable way to earn cowries and grow up. "Come and help me!" summons Papa or a friend. A filter hides emails, phone numbers, links and insults in player chat. In the artifact, an optional **Smart replies** switch lets characters answer conversationally through the viewer's own Claude account.
- **Music and sound.** Synthesised Nigerian instruments — talking drum with speech-like pitch glides, agogo bell, shekere, udu, ogene, highlife guitar, Afrobeat bass and horns, choir pads — in styles that follow the zone: highlife (village), jùjú (savanna), Afrobeat (canyon), airy highlife (sky), a 12/8 Story-time groove, fuji for the boss and a victory highlife. Dialogue "voices" are tiny talking-drum strokes. Ambience: market chatter, fire, birdsong, canyon wind, Story-time crickets. These are impressions made with synthesis, not recordings.

## The cast (iteration 2)

- **Amara** — the playable hero, based on the owner's reference art (afro puffs, red headband and yellow bow, pink tee, mustard overall dress). Players dress her before the adventure on the **Getting Ready** mirror screen: hair style, hair colour, accessories, top, bottom, shoes, face (blush, freckles, uli dots, glitter), lips and skin tone, plus her name. More pieces are bought at Aunty Ngozi's boutique or found as treasure. Restyle any time at her mirror or from the pause menu.
- **Papa Ike** — her father, the village blacksmith (beard, curly hair, dark shirt, from the same reference). He follows her, joins fights with a hammer slam, **lifts** her onto tall pillars, **holds** pressure plates in co-op puzzles, gives context **advice**, and **upgrades** her gear at his forge. Press C (or tap his name in the HUD).
- **Mbe** — the trickster tortoise from the tale itself, woken from the Story Calabash. He rides in Amara's woven basket. Press R to throw him as a rolling, auto-aiming shell; press G and he sniffs out buried treasure. The final boss is his own greedy shadow.
- **Grandma Adaeze, Mama Nkem, Aunty Ngozi**, villagers (Chidi, Funke, Little Kelechi), Weaver Bird, Hornbill and Eagle.

## New systems (iteration 2)

- **Economy:** cowries from pickups, chests, buried treasure, errands and defeated enemies. Spend at Mama Nkem's stall (food, groceries, items), Aunty Ngozi's boutique (outfits) and Papa's forge (upgrades).
- **Food and bag:** puff-puff, akara, roasted corn, suya, zobo, chin chin and jollof heal or give timed boosts. B opens the bag, H eats the best snack.
- **Market quest:** buy egusi, palm oil, peppers and ugu for Grandma's soup.
- **Puzzles:** the elder-drum rhythm riddle (strike stones by jumping, spinning or throwing Mbe), the twin-plate canyon gate (you and Papa), Papa-lift pillars with chests.
- **Searching:** six buried treasures revealed by Mbe's sniff, a lost football errand, a suya delivery errand.
- **Enemies:** Greedlings steal cowries and flee; beat them to get the cowries back with interest.

## What is in it

- **Story and quest line (about 25–40 minutes):** Grandma Adaeze gives you the Story Calabash, then you earn three feathers honestly — Weaver Bird (double jump), Hornbill’s ring race (glide), Eagle’s hawk hunt (updraft) — climb the Sky Baobab, cross the Sky Road and face the Shade of All-of-You at the feast.
- **Six zones:** Village of Stories, River Crossing, Gold Savanna, Harmattan Canyon, Eagle’s Perch and Sky Baobab, the Sky Road and the Sky Feast palace.
- **Time Weave:** Story-time-only spirit bridges and platforms, Now-only ruins, dust devils that sleep in Story-time, shadow hawks that hunt only in Story-time, and a boss whose weak points only show in Story-time.
- **Four heroes** (young and elder, female and male) with different traits; **three difficulties**.
- **Fashion with perks:** Ngozi’s loom sells headwear, wraps, shell paints and accessories. Every textile names its origin (Adire, Aso-oke, Akwete, Bogolan, Ankara, Kente) so traditions stay distinct. Each item has a small gameplay perk; some are earned, not bought.
- **Competitive layer:** run timer, score and grade (S–D), and a top-10 leaderboard on the device. Six Tale Stones, 125 cowries and enemies all add to the score.
- **Tech:** physically based materials, ACES tone mapping, image-based lighting generated from the sky shader, soft shadows, custom sky, water and grass (instanced, wind-animated) shaders, bloom plus a custom grade/time-ripple post pass, raycast camera collision, procedural West African–inspired music and sound (Web Audio, no samples), keyboard, mouse, touch and gamepad input, auto graphics quality.
- **Accessibility:** Story difficulty, text size, slower dialogue, reduced motion, invert look, camera sensitivity and auto-camera options.

## Controls

| Action | Keyboard | Controller | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick | Stick |
| Look / zoom | Drag mouse / wheel | Right stick | Drag screen |
| Jump, double jump, glide (hold) | Space | A | Jump |
| Shell Spin (dash attack) | Shift | X | Spin |
| Talk / act / talking-drum pulse | E | B | Act |
| Throw Mbe · Mbe sniff | R · G | LB · RB | Mbe · Sniff |
| Papa (lift, wait/follow, advice, forge) | C | D-pad ↑ | Tap “Papa” chip |
| Eat · Bag | H · B | D-pad ↓ · Back | Bag button |
| Chat · call a friend | Enter · V | – | ✉ button · Friends tab |
| Time Weave | Q | Y | ☾ |
| Dance · Photo mode · Tale Book · Pause | F · P · T · Esc | RB · – · Back · Start | – |

## Tests

```sh
npm test
```

Runs four suites with plain Node (no install needed): `tests/legend-check.mjs` (29 behaviour checks for this edition, including simulated jumps proving each gap needs the intended ability) and the three suites for the earlier editions.

## Files

| Path | Purpose |
| --- | --- |
| `dist/index.html` | This edition: screens, HUD, dialogue, wardrobe |
| `dist/legend/main.mjs` | Game loop, input, camera, quests, dialogue, UI, saving |
| `dist/legend/world.mjs` | Scene: terrain, sky, water, grass, village, canyon, baobab, palace, pickups, NPCs |
| `dist/legend/enemies.mjs` | Beetles, dust devils, shadow hawks, the Shade boss |
| `dist/legend/humans.mjs` | Procedural humans: Amara (all looks), Papa, Grandma, market women, kids |
| `dist/legend/companions.mjs` | Papa and friend helper AI (follow, home, timed help, plates) and Mbe's thrown shell |
| `dist/legend/chat.mjs` | Chat intents, character personalities, safety filter, smart-reply prompt |
| `dist/legend/models.mjs` | Procedural tortoises (Mbe, the boss) and birds |
| `dist/legend/textures.mjs` | Procedural textile, shell, wall and sprite textures |
| `dist/legend/audio.mjs` | Procedural score and sound effects |
| `dist/legend/config.mjs` | Tuning, heroes, wardrobe, quests, tale text, scoring |
| `dist/legend/layout.mjs` | Level layout as pure data |
| `dist/legend/terrain.mjs` | Analytic terrain shared by rendering, physics and tests |
| `dist/legend/physics.mjs` | Player controller (pure) |
| `dist/legend/save.mjs` | Save, settings and leaderboard with validation |
| `dist/vendor/` | Three.js 0.180.0 and its official post-processing add-ons (MIT) |
| `dist/skybound.html`, `sky.*` | Previous 3D edition (Skybound Run), unchanged |
| `dist/classic.html`, `game.js`, `engine.mjs` | Original 2D edition, unchanged |
| `tools/serve.py` | Local server with caching disabled |
| `dist/dev-cast.html` | Developer preview of the character models (not linked from the game) |

See `HANDOVER_LEGEND.md` for verification evidence, limitations and next steps.
