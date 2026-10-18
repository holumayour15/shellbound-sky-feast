# Testing Shellbound on phones with friends and family

## Option A — the shared Claude link (multiplayer works)
1. Open the game link on the computer and use **Share** (top right of the page) to invite each tester by email. They need to be signed in to Claude on their phone.
2. Testers open the link in the phone browser (Chrome on Android, Safari on iPhone). Turn the phone sideways and tap ⛶ for full screen where the phone allows it.
3. Everyone who has the game open appears in the same village. Swap friend codes in the Friends chat (✉ → Friends) to chat and invite each other.
4. Only Contributors and above can send chat, friend requests, invites and waves. Viewers can watch but not send, so share with at least Contributor access.

## Option B — host the files yourself (single player, no Claude account needed)
Upload the `dist/` folder to any static host (Netlify Drop, GitHub Pages, Cloudflare Pages) and send the link. On a phone, "Add to Home Screen" installs it like an app (it uses `manifest.webmanifest`). Friends, chat and the shared world need the Claude runtime, so they are switched off in this version; everything else works.

## What to ask testers
- Is it smooth? (If not: pause → Settings → Graphics quality → Low.)
- Can you reach every button with your thumbs? Is any text too small (Settings → Text size)?
- Did you understand fishing, cooking and the bike loop without help?
- Did anything feel unfair or confusing with other players?
