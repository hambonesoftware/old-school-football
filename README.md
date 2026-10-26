# Old School Football — v0.5
An original browser running challenge inspired by red LED handheld football, with a striped field and small animated football players. No third-party assets, dependencies, accounts, analytics, or external requests.

## Play
Run toward the top end zone. In the default **Arcade Run** mode, the runner automatically advances after the snap: use left/right to steer without losing forward momentum, hold up for a speed increase, and down to brake. Choose **Classic Steps** in Settings for the original four-direction one-yard stepping. Arrow keys/WASD and touch controls are supported. Space snaps; P pauses. Four downs to gain ten yards. Start at your 25, down 14–19 with two minutes of live-play time. A touchdown wins. No passing, kicking, opposing possessions, or extra points in this first running-only vertical slice. Clock stops between plays. Classic mode retains a backward direction as a modern convenience; this is not an exact historical rules emulation.

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

## v0.2 — Broadcast presentation and pre-snap flow
- Field-first responsive layout with a compact college broadcast inspired score strip, original Great Lakes and Iron Valley team graphics, turf details, uniform numbers and a player selection ring.
- Snap sits beside the direction pad in a dedicated control deck below the field.
- Play results and pause messages stay in the status strip; no automatic overlays obscure the players.
- The next formation is prepared after a tackle. Snap preserves that exact formation and does not reroll the defense.
- Smooth visual movement, device-pixel-ratio-aware rendering and reduced-motion support.
- Settings are opened explicitly and pause a live play.
- Nine engine tests cover the original rules and formation-preview regressions.

## v0.3 — Block football figures and smoother motion
The player-model.js module adapts the beveled rectangular construction used in Faces & Heels: broad shoulder blocks, articulated arms and legs, shaded faces, block helmets, facemasks, cleats, jersey numbers and a tucked football. Models are projected into a bounded cache of local Canvas sprites; no WebGL dependency or external assets are required. Player and camera interpolation is gentler while input cadence, collisions and rules stay the same. The camera includes more space ahead for the taller figures.

Twelve automated tests cover rules, formation stability, block geometry and animated rig validity. Desktop and 390-pixel phone layouts were visually checked in the browser.

## v0.4 — Pace and balance
Runner movement is 150 ms per step. Defense acts a little faster and starts with closer visible pressure. Read [the ten-game balance report](docs/balance-10-games.md) for the automated results, limits, sources and reproduction steps. The simulation uses the browser’s shared movement clock.


## v0.5 — Continuous running and a more readable camera

- Arcade Run is now the default. Forward movement is independent of left/right steering; holding up surges and holding down brakes. Movement accelerates smoothly. Classic Steps is available in Settings and retains v0.4 defensive spacing and rules; changing modes restarts the drive.
- The camera starts the runner around 76% down the field view, allows about five yards of visible advancement before following, and uses approximately 200 ms damping. The 100-yard field and approximately 37-yard view are unchanged.
- Fine turf texture moves with the world instead of staying fixed to screen pixels. The chibi player's running cycle is linked to traveled distance so animation cadence matches progress.
- Arcade defenders initially line up six yards ahead, then visibly close down the gap. Their response increases with field progress; visible pre-snap formations stay authoritative.
- The split left-edge direction pad and right-edge Snap button remain. No play-result overlay covers the field.
- Run npm test for the automated rules and model suite. Run node scripts/arcade-balance.mjs for 200 seeded arcade games, or add --save to regenerate the committed result JSON.
- See [the 200-game balance report](docs/arcade-balance-200.md). The simulation does not substitute for hands-on phone playtesting.
