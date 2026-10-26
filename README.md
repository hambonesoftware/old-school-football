# Old School Football — v0.1
An original browser running challenge inspired by red LED handheld football, with a striped field and small animated football players. No third-party assets, dependencies, accounts, analytics, or external requests.

## Play
Run toward the top end zone. Arrow keys/WASD or hold the touch direction buttons. Space snaps; P pauses. Four downs to gain ten yards. Start at your 25, down 14–19 with two minutes of live-play time. A touchdown wins. No passing, kicking, opposing possessions, or extra points in this first running-only vertical slice. Clock stops between plays. The backward button is a modern convenience; this is not an exact historical rules emulation.

## GitHub Pages
1. Create a repository such as `old-school-football`.
2. Upload all contents of this folder to its root, including `.github/workflows/pages.yml`.
3. In repository Settings → Pages → Source, select **GitHub Actions**.
4. Run the Deploy Football to Pages workflow, or push a commit to main.
Alternatively select Deploy from a branch, main, /(root); the game needs no build. Do not enable both deployment methods.
The expected URL is `https://YOUR-USERNAME.github.io/old-school-football/` after deployment succeeds.

## Local development
Serve this folder using `python3 -m http.server 8000`, then open http://localhost:8000. ES modules require HTTP rather than opening index.html directly. Run `npm test` (Node 18+); no install needed.

## Modules
- js/engine.js: independent rules and defensive AI; accepts injectable randomness.
- js/renderer.js: Canvas sprites, camera, field and alternate LED view.
- js/main.js: inputs, clock loop, audio and optional local best-drive storage.
- style.css: responsive layout.

Best-drive yards are stored in this browser when storage is available. Clearing website data clears the record. Gameplay remains available if storage is blocked. Sound starts off. Backgrounding pauses live play.
