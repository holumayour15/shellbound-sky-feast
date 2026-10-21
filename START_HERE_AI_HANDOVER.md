# Shellbound: The Sky Feast — handover for a new AI or session

Read this file first. It is the single entry point. `HANDOVER_LEGEND.md` holds the detailed changelog for every iteration, and `README.md` holds the player-facing feature summary.

**Owner:** Mayowa Dada (GitHub **holumayour15**) · **Brand on screen:** Bukham Play · **Last updated:** 21 October 2026 (commit `d8aa3ef` on `main`)

---

## 1. What this is

Shellbound is a 3D adventure that runs in the browser, built on the West African folktale of how the tortoise got his cracked shell. It plays on computers and phones.

The player creates their own hero (name, girl or boy, selfie face, talent, age, look, optional weapon) and explores a Nigerian village and beyond with:
- **Papa Ike**, the blacksmith.
- **Mbe**, the trickster tortoise, who rides in the hero's basket.
- **Eight village friends:** Amara, Hadassah, Tehilah, Tiara, Tobi, Emeka, Dayo and Musa.

**The "fourth dimension" is time:** **Q / ☾** switches the whole world between **Now** and **Story-time**. Lighting, music, which platforms are solid and which enemies exist all change.

The quest line runs: Grandma Adaeze → Story Calabash → market run → Weaver Bird's five golden threads → Hornbill's ring race → canyon gate → Eagle's shadow hawks → climb the Sky Baobab → boss (Mbe's greedy shadow) at the Sky Feast.

**Live links**
| What | Where |
|---|---|
| Public game (computers and phones, multiplayer, no account needed) | https://holumayour15.github.io/shellbound-sky-feast/ |
| Code (public) | https://github.com/holumayour15/shellbound-sky-feast |
| Claude artifact version (private, owner only unless shared) | https://claude.ai/artifact/1BnuuqQgyGe6XCx59Bm6pz |

Every push to `main` runs the tests and redeploys GitHub Pages automatically (`.github/workflows/pages.yml`).

---

## 2. Run, test, deploy

```bash
npm test                       # 4 suites; must pass before any push (CI runs it too)
python tools/serve.py 8766     # local server for dist/ with caching off → http://127.0.0.1:8766
```

- **No build step.** `dist/` is the shipped site. It uses plain ES modules and an import map, with Three.js 0.180.0 vendored in `dist/vendor` and its post-processing add-ons flattened into `dist/vendor/fx`.
- **Deploy:** commit and `git push` to `main`. GitHub Actions tests, then publishes `dist/` to Pages in about a minute.
- **Claude artifact:** publish `dist/artifact.html`, generated from `dist/index.html` (head meta and styles + import map + body, no doctype; the manifest and icon links are removed), with the `legend/*` files as supporting files. Capabilities: `sample {images:true}`, `room` with topics `chat, friend, invite, hello` at `interact`, and `user`.
- **Dev preview from the desktop app:** `.claude/launch.json` in the parent folder has a `shellbound-dev` config on port 8766.

---

## 3. Code map (`dist/legend/`)

| File | Lines | Role |
|---|---|---|
| `main.mjs` | ~2450 | Everything that ties the game together: renderer and post-processing, game loop, input (keyboard, touch, gamepad), camera, dialogue, quests, shops, wardrobe, chat UI, friends UI, growth, weapons and attacks, random monster spawner, hobbies UI (fishing, cooking, cycling), emotes, world players, story-ends and Grandma's lessons, save/resume, settings, QA hook `window.__shellbound` |
| `config.mjs` | ~300 | Data: tuning, difficulties, wardrobe (`LOOK`, with `g:'f'/'m'` gender tags), heroes, ages (`STAGES`: child/teen/youth/adult → difficulty, monster cap, weapon tier), `TIERS`, `WEAPONS`, `TALENTS`, shop, forge, jobs, checkpoints, `QUEST`, tales, score |
| `save.mjs` | ~115 | `freshSave`, `sanitize` (migrates v2→v3→v4 and validates every field), settings, leaderboard, friends list, selfie storage |
| `world.mjs` | ~750 | Builds the 3D world: terrain mesh, sky/water/grass shaders, village, NPCs, platforms, puzzles, chests, palace |
| `terrain.mjs` | ~80 | Pure height function `heightAt`, river, canyon, `WATER_Y` (shared by physics, world and tests) |
| `physics.mjs` | ~150 | Player movement: jumps, double jump, glide, spin dash, platforms, walls |
| `layout.mjs` | ~200 | Positions of everything (NPCs, friend homes, jetty, cooking pot, bike stand, platforms, pickups, enemies) |
| `humans.mjs` | ~375 | Procedural people (child/teen/youth/adult/man/woman bodies), hair styles, outfits, weapons in hand, photo face, animations (walk, spin, glide, attack, ride, fish, cook, cheer, wave, dance) |
| `models.mjs`, `textures.mjs` | | Birds, tortoise, props; canvas-generated cloth patterns (adire, kente, ankara, aso-oke, akwete, bogolan) |
| `companions.mjs` | ~120 | Shared helper brain for Papa and the friends (modes: follow, help, hold, wait, home; hunts the enemy nearest the hero), and Mbe |
| `enemies.mjs` | ~500 | Beetles, dust devils, Greedlings, shadow hawks, Harmattan Brutes, Story-time wisps and shadow hyenas; hit points, damage, spawn/cull; boss (the Shade). `hitAt(x,y,z,r,source,weave,ctx,dmg)`; the source decides helper fees |
| `audio.mjs` | ~320 | Synthesised Yoruba drum ensemble (talking drum lead, omele, gúdúgúdú, agogo 12/8, shekere, sakara, udu, ogene, agidigbo, mbira, flute, palm-wine guitar). Instruments are pre-rendered into samples at start; each note replays a sample. 16-bar song form. Styles by zone. Sound effects. `tap()` for recording |
| `chat.mjs` | ~160 | Rule-based chat: intents, personas for every character, jobs, summon, safety filter `moderate()`, prompt for optional Claude replies |
| `social.mjs` | ~135 | Real friends: friend code (hash of the platform user id), requests and accepts, friends-only chat and invites, party room, world players, waves/high-fives (`hello` topic, fixed gestures, rate-limited) |
| `p2p.mjs` | ~95 | Multiplayer outside Claude: WebRTC via Trystero (`@trystero-p2p/mqtt@0.25.4` from jsDelivr), with the same `room`/`user` interface as Claude's runtime. Device ECDSA P-256 key; a peer counts as verified only after signing its connection id |
| `hobbies.mjs` | ~115 | Pure rules: fish table, dishes and recipes, hobby levels and prizes, bike-loop gates, badges, daily gift streak, daily challenges |
| `hobbyworld.mjs` | ~100 | 3D props: jetty, rod/line/float, cooking pot, bike stand, bike-loop gates, bicycles |
| `selfie.mjs` | ~65 | Selfie → skin and hair colour match; optional Claude smart match (artifact only); face texture (`faceCanvas`) |
| `legend.css` | | All UI styles, including phone layouts (`max-height:520px` landscape and `max-width:520px` portrait blocks) |

Also in `dist/`:
- `index.html` (the game page, which loads `legend/main.mjs`), `artifact.html` (Claude version), `manifest.webmanifest` and `icon.svg` (home-screen install).
- Older editions kept unchanged: `skybound.html` (earlier 3D), `classic.html` (2D), `studio.html`.
- `dev-cast.html` is a dev page for previewing characters.

`tests/legend-check.mjs` holds 40 behaviour checks for the pure modules: physics routes, save sanitising and migration, hero creation, ages and weapons, friend codes, the friends-only protocol with an in-memory room, selfie colour matching, hobby rules, bike gates, daily gift, restart, saved position. The other three suites cover the older editions.

`tools/`:
- `serve.py` — the no-cache dev server.
- `trailer-director.js`, `capture_server.py`, `assemble.py` — make the trailer (see §7).

---

## 4. Saved data (browser `localStorage`, per device)

| Key | Contents |
|---|---|
| `shellbound-hero-v4` | The adventure, sanitised by `save.mjs`. Older keys `shellbound-amara-v3` and `-v2` are migrated on load |
| `shellbound-legends-settings-v1` | Settings, including `photoFace`, `playOnline`, `smartChat` |
| `shellbound-legends-board-v1` | Leaderboard on this device |
| `shellbound-friends-v1` | Real friends `{code, name}` |
| `shellbound-selfie-v1` | Selfie thumbnail (data URL, 192 px, under 60 KB). **Never sent to other players** |
| `shellbound-device-key-v1` | Device signing key for peer-to-peer identity (GitHub link only) |

The save holds:
- **Identity:** `name`, `gender`, `talent`, `look`, `owned`.
- **Age:** `stage`, `grown`, `startStage`, `earned`.
- **Progress:** `quest`, `feathers`, `threads`, `tales`, `chests`, `dug`, `errands`, `puzzles`, `checkpoint`, and `pos` (exact resume spot, `{x,y,z,face,layer}`).
- **Gear:** `weapon`, `weapons`, `upgrades`.
- **Hobbies:** `hobby{fish,cook,bike}`, `catches`, `cooked`, `dishes`, `bike`, `bikeBest`.
- **Social and stats:** `badges`, `daily`, `today`, `waves`, `restarts`, `deaths`, `enemies`, `papaFights`.

**To add a field:** add it in `freshSave` **and** in the `sanitize` return; anything not listed is dropped on load.

---

## 5. Game rules the owner asked for (keep these)

1. **The player creates their own hero.** The eight named characters are default *system friends*, not playable heroes.
2. **Ages:** child → teen (120 cowries earned) → youth (300) → adult (600). Age sets the difficulty, the monster count and the weapon metal (wooden/iron/bronze/gold). The player picks a starting age.
3. **Papa follows a child.** From teenager on he stays at his forge and is called with **C**. Village friends can be called with **V** when online.
4. **Helpers fight, but cost money:** when Papa or a friend lands the killing blow, the hero earns nothing and pays half the reward (minimum 1). Papa can be told "Let me fight my own battles".
5. **Running out of hearts ends the story:** the tale restarts from the very beginning at the starting age, keeping the hero, wardrobe, badges and hobbies. **Grandma Adaeze** then teaches how to beat whatever ended it, with a harmless practice fight for beetles, Greedlings and Brutes.
6. **Only befriended players can chat or invite.** Strangers can only wave or high-five (fixed gestures) or send a friend request.
7. **Resume where you left off:** Continue is the main title button, the hero resumes at the exact saved spot, and "New adventure" asks before replacing a save.
8. **Music must be cultural, with an obvious talking drum.** There are no recordings; everything is synthesised. The owner said the current music "sound is good".
9. **Phones are first-class:** test landscape (about 740×360) and portrait (375×812) for any UI change.

---

## 6. Safety and privacy choices already made

- **Chat:** `chat.mjs` `moderate()` hides emails, links, phone numbers and insults, and caps messages at 140 characters. Names are cleaned with `cleanName`.
- **Selfie:** stays on the device. Smart match sends it to Claude only after the viewer agrees, and only in the artifact version.
- **Peer-to-peer:** players can see each other's internet address. The Friends tab says so, and Settings can turn online play off.
- **Before opening this to children outside a trusted group:** add server-side moderation, reporting and blocking. Also consider a TURN relay, because some mobile networks block direct connections.
- **Commits** use the GitHub no-reply email `<id>+holumayour15@users.noreply.github.com`. Don't put the owner's Gmail in the repository.

---

## 7. Tooling notes and gotchas (Windows machine)

- **Long paths:** the working folder path is very deep. Python and PowerShell fail on long relative paths, so use short folders (for example `C:\Users\lenovo 2025\AppData\Local\Temp\...`) for helpers, and `git config core.longpaths true` (already set).
- **GitHub CLI** is at `C:\Program Files\GitHub CLI\gh.exe`. Its login lives in the Windows keyring, which **sandboxed shells cannot read**. Run `git push` and `gh` in the user's real terminal (in the desktop app, the terminal panel).
- **Editing large files:** patch scripts with exact-match replace and an assert on every match have been reliable for `main.mjs`. Always `node --check` after an edit.
- **QA hook** `window.__shellbound`:
  - Read state: `state`.
  - Move and stage: `tick(n, hold[], press[], render)` (deterministic 60 Hz steps), `teleport(x,z,y)`, `grant(feathers)`, `setQuest(id)`, `weave()`.
  - Fight: `attack()`, `equip(id)`, `spawn(kind,x,z)`.
  - Hobbies: `fishTap()`, `cookTap()`.
  - Objects: `friends`, `friendsMap`, `papa`, `enemies`, `audio`, `social`, `camera`, `renderer`, `P`.
  - Rendering: `render()`, and `paused = true` stops the live loop.
- **Browser automation:** a hidden preview tab runs slowly (timers throttled, no animation frames), so show the pane when recording. Two players on one machine need different origins (`localhost` versus `127.0.0.1`) so they have separate storage and keys.
- **Trailer pipeline:**
  1. Run `tools/capture_server.py <outdir>` (receives frames on port 8790).
  2. Copy `trailer-director.js` into `dist/`, load it in the page, and run `__dir.prep()` then `__dir.shots.s1…s6`.
  3. Record audio through `audio.tap()` with `MediaRecorder`.
  4. Run `tools/assemble.py` (uses the ffmpeg from the `imageio_ffmpeg` Python package) to get 16:9 and 9:16 MP4s (H.264 yuv420p TV range, AAC 48 kHz).
- The Python packages `imageio_ffmpeg` and Pillow are installed on the owner's PC.

---

## 8. Known limitations and good next steps

- **Untested:** multiplayer on real phones over mobile data, and frame rate on low-end phones.
- **Multiplayer:** each player fights their own copy of the monsters; only presence, gestures, chat, invites and friends' spins are shared.
- **Possible features:**
  - Cloud saves across devices (needs a backend or the Claude `db` capability).
  - A TURN server for difficult networks.
  - Recorded music or voices, if the owner provides recordings they have rights to.
  - More quests after the Sky Feast.
  - Trading and gifting between friends.
- `main.mjs` is large. If it keeps growing, split the hobbies, social UI and story-ends logic into modules.
- The owner reports issues as players experience them ("my progress is lost", "music sounds awkward"). Reproduce in the browser before changing code, and verify the fix the same way.
