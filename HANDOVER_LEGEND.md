# Shellbound: Legend of the Sky Feast — iteration handover

**Owner:** Mayowa Dada · **Brand:** Bukham Play · **Date:** 17 October 2026
**Builds on:** Shellbound: Skybound Run handover (commit 69272b7). Both earlier editions are preserved unchanged (`skybound.html`, `classic.html`).

## 1. What changed

The home page (`index.html`) is now a new, larger 3D edition. The earlier 3D page moved from `index.html` to `skybound.html`; the 2D edition is untouched. Earlier save keys are not touched; this edition uses `shellbound-legends-v1` (save), `shellbound-legends-settings-v1` and `shellbound-legends-board-v1`.

**Core idea — the fourth dimension is time.** The Time Weave switches the whole world between Now and Story-time: lighting, sky, fog, environment map, grading, music, which platforms are solid, which enemies are active, and which pickups can be collected.

**Narrative.** Retold in the game's own words from the widely told West African tale of how the tortoise got his cracked shell (known among the Igbo of Nigeria and beyond). The player is a descendant who must *earn* the feathers Tortoise once borrowed with a lie, then share the feast instead of taking it. Six Tale Stones tell the original story in parts. Characters, dialogue and the Shade are original.

**Content.** 6 zones; 5 NPCs plus 3 villagers; 4 heroes; 3 difficulties; 9 checkpoints; 3 enemy types plus a 3-phase boss; a timed 8-ring race; 5 threads, 6 Tale Stones, 125 cowries, 7 kola nuts; 20 wardrobe items (3 earned).

**Fashion.** Textiles are labelled with their origins: Adire (Yoruba, Abeokuta), Aso-oke and gele and fila (Yoruba), Akwete (Igbo), Bogolan (Bamana, Mali), Kente (Asante and Ewe, Ghana), Ankara (pan-West African wax print), uli-inspired shell paint (Igbo). Patterns are generated in code as impressions, not reproductions of specific cloths.

## 2. Verification performed

- `npm test` runs four suites, all passing: 18 new behaviour checks plus the three earlier suites. New checks include terrain sanity, jump heights, and **simulated jumps** proving the river gap needs the double jump, the Baobab is sealed until Eagle, every plank-to-plank climb works, the updraft gap needs Eagle's feather, and the Sky Road is crossable; plus save sanitisation, perks, scoring, checkpoint placement and pickup placement.
- **Real-browser QA** (Chromium in the desktop app, 1280×720 and 375×812): no console errors; title, hero select, intro, dialogue, Time Weave, wardrobe purchase and wear, save/continue, leaderboard save, and touch-control layout checked visually. The full quest line was driven end-to-end through a deterministic test hook (`window.__shellbound.tick/teleport`): Grandma → weave → Weaver's threads → double jump → Hornbill race → glide → Eagle's hawks → updraft → Baobab opens → boss intro → three Story-time strikes (a Now-time strike correctly does nothing) → victory screen → leaderboard.
- Defects found and fixed during QA: add-on paths exceeding Windows' 260-character limit (flattened to `vendor/fx`), CSS class collisions (objective card, letterbox), enemies rendering at the world origin before first update, camera buried in scenery (now raycast collision), loader stalling in background tabs, washed-out terrain grain and Story-time darkness, projectiles lingering after the boss falls.

## 3. Known limitations

- Not yet hand-played start to finish in real time by a person; the end-to-end run used teleports and scripted input. Difficulty, race timing and boss pacing need human playtesting with the intended age groups.
- Not measured on real phones or low-end GPUs. Auto quality drops to "low" when frames are slow; touch devices start on "low".
- Decorative scenery (stalls, small rocks, trees other than trunks) is not solid; huts, trunks, columns, termite mounds and the boss are.
- Leaderboard and saves are per-browser `localStorage`: not shared, not cheat-proof. `window.__shellbound` is a QA hook and can be used to cheat locally; remove or gate it before any public competition.
- Single player only. The earlier Skybound edition keeps its two-player local co-op. No online play, accounts or payments.
- Cultural content has not been reviewed by Igbo, Yoruba, Ghanaian or Malian cultural advisers. This should happen before commercial release, especially for tale wording, names and textile depictions.
- Music and sound are synthesised impressions of instruments, not recordings or traditional compositions.
- Google Fonts are requested for typography, with system font fallbacks.

## 4. Suggested next steps

1. Observed playtests with teens, adults and older players on desktop and phones; tune race time, hawk aggression and boss timings from evidence.
2. Cultural review of the tale text, names and textile descriptions; consider voiced narration in Igbo and English.
3. Performance pass on mid-range Android: merge static scenery geometry, LODs for grass and trees.
4. Online leaderboard with a server-validated run (replay or checkpoint timestamps) before promoting it as competitive.
5. More content using the same data-driven layout: a second chapter (Parrot's message), photo-mode sharing, seasonal outfits.

## 5. Assets and provenance

All meshes, textures, music and sounds in the new edition are generated in code in this repository. Three.js 0.180.0 and its official post-processing add-ons (`vendor/fx`, from the `three` npm package, examples/jsm) are MIT-licensed; licence in `vendor/THREE-LICENSE.txt`.

## 6. Iteration 2 — Amara, Papa Ike and Mbe (18 October 2026)

**Change:** the playable tortoise heroes were replaced by **Amara**, a girl modelled on the owner's reference image, with a full dress-up screen. Her father **Papa Ike** (from the same image) became an AI companion, and **Mbe**, the tortoise of the tale, became her basket companion, thrown attack and treasure finder. New systems: market, food and bag, boutique, forge upgrades, groceries quest, drum riddle, twin-plate gate, Papa-lift pillars, buried treasure, errands and the Greedling enemy. Save key changed to `shellbound-amara-v2` (iteration 1 saves are not migrated).

**Verified:** `npm test` passes (23 new-edition checks plus the 3 earlier suites). In Chromium at 1280×720 and 375×812, the whole quest line ran end to end through the deterministic test hook: dress-up → Grandma → Mbe wakes → market purchases → soup → Weaver → drum riddle (chest and fifth thread) → double jump → Hornbill race → Papa lift to a pillar chest → sniff and dig → Mbe throw stuns a beetle → Greedling steals and repays → football errand → twin-plate gate with Papa → Eagle's hawks → Baobab opens → boss → ending and victory screen. No console errors.

**Fixed during QA:** Papa's menu stealing the E key (moved to C); the fade after a faint overriding an open dialogue; Mbe's throw missing targets (now auto-aims); Papa blocking the camera (now walks beside Amara); a long-standing bug where `group.add(x).rotation` rotated a whole group (also fixed the Sky Feast palace floor).

**Still limited:** not hand-played in real time end to end; character art is procedural (primitives), not sculpted models; human companions do not use path-finding (Papa catches up by reappearing beside Amara when far away or separated by height); no voice acting; the cast and tale still need cultural review before commercial release.

## 7. Iteration 3 — heroes, growing up, chat, sound (18 October 2026)

**Change:** eight playable heroes (Amara, Hadassah, Tehilah, Tiara; Tobi, Emeka, Dayo, Musa) with gender-aware wardrobe and dialogue; growth from child to teenager (120 cowries earned) to youth (300) with stage rules for Papa and friends; three-channel text chat with rule-based character replies, paid delivery jobs and summoning; optional Claude-powered replies (`sample` capability) and live player chat (`room` capability, topic `chat` open to Contributors and above) when published as an artifact; a new synthesised Nigerian score and instrument-based sound effects. Save key `shellbound-amara-v3`; v2 saves migrate (played as Amara, earnings start from current cowries).

**Verified:** `npm test` passes (29 checks, including chat intents, the safety filter, jobs, growth thresholds, boys' looks and v2→v3 migration). In Chromium: heroine and boy pickers, gender-filtered wardrobe, dialogue gender swaps, Nearby/Papa & Mbe/Friends chat, a paid delivery job, growth to teenager (Papa goes home; C and V summon helpers who leave after a minute) and youth (power spin defeats a beetle alone), every music style and sound effect without errors, and a regression run of the opening quests.

**Not verified:** how the music sounds (checked only for errors), smart replies and live player chat (both need the published artifact, a signed-in viewer and, for chat, a second person), mobile layout of the chat panel at every size.

**Notes for live chat:** only people the artifact is shared with can join; Viewers can read but only Contributors and above can send; messages are filtered client-side and are not stored. A real multiplayer release needs server-side moderation, reporting and blocking, and age-appropriate safeguards before it is opened to children outside a trusted group.

## 8. Iteration 4 — your own hero, ages, weapons, monsters, real friends (18 October 2026)

**Change:** players create their own hero (typed name, girl or boy, talent, starting age, look, optional weapon). The eight former heroes are now default village friends with homes, voices and chat personas. Four ages — child, teenager, youth, adult (adult at 600 cowries earned) — each set the challenge (Story, Adventure, Hard, Legend), the number of roaming monsters (3/5/7/9) and the weapon tier (wooden, iron, bronze, gold). Weapons: bare hands, story staff (spin), catapult (pebbles, auto-aim), hunter's spear (age teen+, lunge) and idà sword (youth+, slash), sold and equipped at Papa's forge and in the bag. Enemies now have hit points; two new monsters — the charging Harmattan Brute and the Story-time wisp that throws fire orbs — and random encounters spawn beyond the village. Selfie play matches skin tone and hair colour from a photo on the device; with the published artifact, an optional "Smart match" sends the photo to Claude (`sample` with images) to suggest a hairstyle. Real friends (`social.mjs`): a 6-character friend code derived from the platform user id, friend requests that must be accepted, friends-only chat and invites, and a shared party room in which friends see each other's avatars. Save key `shellbound-hero-v4`; v2 and v3 saves migrate.

**Verified:** `npm test` passes (33 legend checks, including v3→v4 migration, hero creation, age/weapon tables, selfie colour matching and an in-memory three-player test that strangers' chat, invites and forged senders are ignored). In Chromium: the creator screen, selfie colour match, adult difficulty and hearts, random spawns outside the village, gold sword defeating a brute, catapult pebble defeating a beetle, staff spin damage, wisp visibility and drum stun in Story-time, village-friend chat, and — with a mocked runtime — the friend code, request/accept, friends-only chat, invite, joining a party and drawing the friend's avatar. No console errors.

**Not verified:** real two-person play on the published artifact (needs two signed-in people), the Claude smart selfie match, mobile layout of the creator and friends panel at every size, and long-session balance of monster numbers.

**Privacy notes:** the selfie thumbnail is stored only in the player's browser and never sent to other players; smart match sends it to Claude only after the viewer's consent. Friend codes come from the platform's user id, so a message can't pretend to be another player. Names are self-chosen nicknames filtered by the chat filter. Before opening this to children outside a trusted group, add reporting, blocking and server-side moderation.

## 9. Iteration 5 — hobbies, prizes, a shared world and phones (18 October 2026)

**Change (ideas borrowed from Roblox-style social games):** three hobbies, each with five levels and prizes (`hobbies.mjs`, props in `hobbyworld.mjs`).
- **Fishing** from a new river jetty: cast, wait for the float to dip, hook it, then reel by tapping when the marker is in the green. Seven catches, including a rare golden carp, a Story-time moonfish and a joke old sandal. Better hooks are sold at Papa's forge.
- **Cooking** at a village pot: five dishes made from groceries and fish, with a three-stir timing game that sets the dish's star rating.
- **Cycling:** a free bike from Musa's stand (X or the bike button; Shift rings the bell) and a timed ten-gate loop round the village.

Fish and dishes sell at a new Sell tab in Mama Nkem's stall. The prizes are a straw hat, a chef's jacket, racing trainers and a golden bike. Other additions:
- 13 badges, a fish collection, a daily gift that grows with a streak, and three daily challenges that are the same for everyone (Hobbies & prizes panel: 🏆 button or Y).
- Emotes: wave, cheer, dance and high five (Z or 👋).
- **Everyone online is visible in the world**, with gold name tags for friends and titles such as "Angler". Players walk up to anyone to wave or high-five (fixed gestures, rate-limited, no text), send a friend request, or — with friends — chat and invite. Chat and invites stay friends-only.
- Phone layout: a compact HUD for phones held sideways, a bike button and an emote button, a full-screen button, a "turn sideways" hint, a darker hero creator in portrait, a home-screen manifest and icon for self-hosting, and at most 6 other players drawn on phones (12 on computers).
- Save fields: `hobby`, `catches`, `cooked`, `dishes`, `bike`, `bikeBest`, `badges`, `waves`, `daily`, `today` (all sanitised).

**Verified:** `npm test` passes (38 legend checks, including fish rarity, recipes, prize unlocks, bike gates, the daily streak, badges, and that waves are rate-limited and unknown gestures are dropped). In Chromium with a mocked online room: another player's avatar, name tag and title, the meet menu, sending and receiving waves and high fives, a full fishing catch, cooking with a ★ rating and a badge, getting a bike, riding it and finishing the bike loop, and the phone layout in landscape (740×360) and portrait (375×812) with touch controls. No console errors.

**Not verified:** real phones (the checks used desktop Chrome's phone emulation), real multiplayer between two signed-in people, frame rate on low-end phones, and long-term hobby balance.

## 10. Iteration 6 — talking-drum score, fighting friends, Story-time hunters (18 October 2026)

**Change:**
- **Music:** `audio.mjs` is rewritten around a Yoruba drum ensemble instead of Western chord pads.
  - The lead dùndún talking drum plays speech-like phrases that rise and fall. It has membrane overtones, a curved-stick slap and ṣaworo jingles.
  - Omele drums answer the lead, gúdúgúdú drums keep the low pulse, and the agogo bell plays the 12/8 timeline, with shekere and sakara.
  - Melody comes from an agidigbo thumb-piano bass, palm-wine guitar riffs and an mbira in Story-time.
  - Styles by place: jùjú in the village, àpàlà at the river and savanna, dùndún war drums in the canyon, palm-wine highlife in the sky, Story-time 12/8, fújì for the boss, festival jùjú for victory.
  - The sound effects and dialogue "voices" use the same drums.
  - There are still no vocals: the game uses no recordings, and synthesised voices sound unnatural.
- **Friends and Papa fight:** called helpers now fight at every age (before, youths and adults were left to fight alone). Each helper hunts the enemy nearest the hero within 15 m and strikes every 1.1 s (friends) or 1.6 s (Papa). Damage grows with the hero's age.
- **Story-time enemies:** shadow hyenas — spirit packs that circle and then lunge. Four fixed packs sit across the river and savanna. Random encounters in Story-time are now 70% hyenas or wisps, come more often, and allow two extra monsters. Drum pulses stun hyenas. A new howl sound plays.

**Verified:** `npm test` passes (38 checks). In Chromium: a called friend kills a brute without the player attacking (about 2 s for an adult's friend), hyenas are hidden in Now and hunt in Story-time, the drum stuns them and the sword kills them, and every music style plays and switches without errors. The music's sound was checked only for errors, not listened to.

## 11. Iteration 7 — when the hearts run out, the story ends (18 October 2026)

**Change:** losing every heart (to a monster, the river or a fall) now ends the story instead of respawning at a checkpoint.
- **Restart:** the tale starts again from the very beginning — first quest, no cowries, the staff only, no feathers, threads, chests, upgrades or bag, at the age the hero was created with.
- **Kept:** the hero's name, gender, talent, look and wardrobe, badges, hobby levels and catches, the bike, the daily streak, and lifetime deaths and monsters beaten.
- **Grandma's lesson:** Grandma Adaeze sits the hero by the fire and teaches how to beat whatever ended the story. There are 11 lessons: beetle, Greedling, Brute, shadow hyena, wisp, shadow hawk, dust devil, the Shade, the river, falls, and a general one.
- **Practice fight:** for beetles, Greedlings and Brutes she conjures a practice monster that cannot hurt the hero or steal cowries, and praises the hero (+5 cowries) when it is beaten.
- **How it works:** monsters now pass themselves to `hurt()`, so the game knows what dealt the final blow.
- **Warnings:** players are told after the intro and in How to play. Save fields `startStage` and `restarts` were added; older saves restart at the age they were playing.

**Verified:** `npm test` passes (39 checks). In Chromium: an adult hero killed by a Brute saw "The story ends…"; the story reset to the first quest with 0 cowries and the staff while keeping hobbies and badges; Grandma's Brute lesson played; the practice Brute did no damage when it charged and was beaten with spins; Grandma's praise followed.

## 12. Iteration 8 — smoother, glitch-free music (18 October 2026)

**Causes of the glitches, now fixed:**
- **Reverb feedback loop:** the music bus fed the reverb, and the reverb fed back into the music bus. Instruments now go to `musicIn`, which feeds a dry path and the room reverb, both into `musicBus`.
- **Too many nodes:** every drum stroke built about a dozen oscillators, filters and noise sources, hundreds per second. Each instrument is now rendered once into a short sample, a few per frame so start-up never stalls, and each note replays that sample with 2 audio nodes. The talking-drum glide bends the sample's playback rate.
- **Late notes:** when the game fell behind, the scheduler played a burst of late notes. It now skips ahead, looks 0.3 s ahead and wakes every 40 ms.
- **Limiter:** a gentle master limiter replaces the pumping compressor.

**Musically:**
- A 16-bar form: a 2-bar intro of bell, shekere and drums; the groove with talking-drum calls and omele answers; a Fulani-style flute melody in bars 5–8; a talking-drum solo break in bars 13–14; then the full band again.
- Slight human timing and dynamics.

**Verified:** `npm test` passes. In Chromium, every style plays and switches without errors, and instrument rendering takes under 70 ms per frame. The sound itself was not listened to.

## 13. Iteration 9 — helpers take a share, and your photo becomes your face (18 October 2026)

**Change:**
- **Helpers take a share:** when Papa or a called village friend lands the killing blow, the hero earns nothing and pays the helper half the monster's reward (at least 1 cowry, never below zero). A toast names the helper and the share. Kills by real friends in your party earn and cost nothing. Helper kills don't count towards the hero's monster total or badges.
- **Papa can stay out of fights:** a new Papa option, "Let me fight my own battles", toggles this (`papaFights` in the save).
- **Photo face:** the selfie now wraps the front of the 3D head in place of the cartoon eyes, nose and mouth. It is an oval crop of the photo that fades into the skin colour (`faceCanvas` in `selfie.mjs`; the `photo` option in `makeHuman`).
  - Selfies are now taken at 192 px.
  - A "Photo face: on/off" button sits in the hero creator (`settings.photoFace`).
  - The photo stays on the device; other players see the cartoon face.

**Verified:** `npm test` passes. In Chromium: a drawn test face appears on the hero's head the right way up and not mirrored, Papa killing a Brute cost 4 cowries with a share message, and the hero's own kill earned the reward.

## 14. Iteration 10 — one link for everyone: multiplayer on GitHub Pages (18 October 2026)

**Change:** the GitHub Pages link now has the full online features (shared world, friend codes, requests, chat, invites, waves) without Claude.
- **How it connects:** `p2p.mjs` connects phones directly with WebRTC using Trystero (`@trystero-p2p/mqtt@0.25.4` from jsDelivr, MIT licence). Public MQTT brokers are used only for matchmaking. Trystero's nostr route did not connect reliably in testing, so MQTT is used.
- **Drop-in replacement:** it exposes the same `room` (`on`, `emit`, `presence`, `onPeers`, `join`, `leave`) and `user.id()` interface the game uses with Claude's runtime, so `social.mjs` is unchanged.
- **Identity:** each device holds an ECDSA P-256 key (localStorage). Its id is a hash of the public key, and a peer becomes verified only after signing its own connection id. Unverified peers have `by: null` and are ignored for friends, chat and invites.
- **Opt-out:** online play can be switched off in Settings (`settings.playOnline`). The Friends tab notes that peers can see each other's internet address. Inside Claude the game still uses Claude's room.

**Verified:** in Chromium with two separate players (localhost and 127.0.0.1, so each had its own storage and key): both connected and verified within seconds; each saw the other's avatar and name; a friend request was accepted; chat and a high-five arrived. Real phones on mobile networks were not tested. Without a TURN relay, some carrier networks may block direct connections.

## 15. Iteration 11 — come back where you left off (21 October 2026)

**Problem:** progress was saved, but Continue put the hero back at the last story drum — usually the very first spot in the village — so returning players felt they had started over. "Begin the tale" was also the big gold button, making it easy to overwrite an adventure by accident, and saves only happened while walking around.

**Change:**
- **Resume on the spot:** the last safe spot the hero stood on (grounded, not in water, not mid-race or in the boss fight) is saved as `pos` with the layer, and Continue puts the hero back there. If that spot is no longer safe, the hero starts at the last story drum, and the welcome message says which happened.
- **Saving:** autosave every 5 s in every in-game mode (dialogue, fishing, cooking and so on), plus on `pagehide`, `beforeunload`, `freeze` and hidden tabs. The game asks the browser for persistent storage, and warns once if the browser refuses to save (private mode).
- **Title screen:** with a saved adventure, Continue is the gold button and comes first, and shows the hero's name, age, quest and time played. "New adventure" asks for confirmation before replacing the save.

**Verified:** `npm test` passes (40 checks). In Chromium: a hero moved to the north path, the page was reloaded, Continue was the gold button, and the hero resumed at the same spot on the same quest. "New adventure" showed the warning, and "Keep playing" resumed the save.
