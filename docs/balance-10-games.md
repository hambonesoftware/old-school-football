# v0.4 — Runner speed and ten-game balance check

## Changes

- Held runner movement: 170 ms to 150 ms per yard (13.3% higher nominal movement rate).
- Defense: base action interval 600 ms to 560 ms; progress ramp capped at 110 ms, reaching about 450 ms near the end zone. Chase probability stays at 64%.
- Closest defender starts two yards ahead instead of five, with a 75% chance of lining up in the runner’s lane; remaining defenders stay four yards apart. Formations are visible and fixed before snap.
- Touch taps, keyboard changes and held directions share one movement clock. A short tap during cooldown is buffered once. Rapid tapping cannot bypass the movement interval.

## Method and limits

Executed 10 baseline games and 10 final updated games with the same ten fixed seeds. A preliminary speed-only candidate was also run for ten games; it won all ten and was rejected as insufficient defense adjustment. These are automated engine games, not ten human or manual browser sessions.

Two policies only hold forward. Four react to visible nearby defenders with 320 ms observation delays and 12% forward mistakes. Four use three-action look-ahead on visible positions with 200 ms observation delays and 4% forward mistakes. They cannot read the AI RNG or future defender positions. The simulation uses 120 Hz updates and the same MovementClock as the browser. The baseline reproduces the original rules and held-input timing, not the old rapid-tap bypass. Individual game win rates are not human skill estimates.

The seed suite was fixed before tuning and retained, including the two deliberately weak straight-ahead controls. The runner reacts immediately to the formation already visible before snap; observation delays apply to subsequent AI changes.

## Results

| Game | Seed | Scripted policy | Baseline | Updated | Updated yards | Live seconds | Plays |
|---|---|---|---|---|---:|---:|---:|
| 1 | 101 | straight | touchdown | downs | 8 | 0.6 | 4 |
| 2 | 202 | straight | touchdown | downs | 8 | 0.6 | 4 |
| 3 | 303 | reactive | touchdown | touchdown | 75 | 11.85 | 6 |
| 4 | 404 | reactive | touchdown | touchdown | 75 | 12.96 | 4 |
| 5 | 505 | reactive | touchdown | touchdown | 75 | 12.97 | 6 |
| 6 | 606 | reactive | touchdown | touchdown | 75 | 12.5 | 5 |
| 7 | 707 | reader | touchdown | touchdown | 75 | 13.09 | 6 |
| 8 | 808 | reader | touchdown | touchdown | 75 | 14.52 | 7 |
| 9 | 909 | reader | touchdown | touchdown | 75 | 13.02 | 8 |
| 10 | 1010 | reader | touchdown | touchdown | 75 | 13.53 | 5 |

Baseline: 10/10 wins, including both forward-only controls. Updated: 8/10 wins; both forward-only controls lost on downs after eight yards, while all eight lane-changing policies won. Updated winning drives averaged 13.05 seconds of live-play time.

## Design review

- **Meaningful choices:** baseline forward-only play was too reliable in these samples. The final closer pressure creates a reason to inspect the formation and make cuts. This applies Sirlin’s principle of avoiding dominant strategies; it does not establish that the revised game has no other dominant strategy.
- **Readable challenge:** no hidden mid-play difficulty changes were added. The defense ramps by field progress according to fixed values. Every upcoming formation remains visible.
- **Responsive, simple inputs:** existing arrows and Snap remain; the timing gate is shared across input methods and short taps are buffered.
- **Difficulty range:** reactive and look-ahead policies all won in this small sample. That is suitable evidence that the game remains forgiving to these policies, not proof of ideal difficulty for actual players. A larger independent seed set and real player feedback remain necessary.
- **Pacing limit:** the two-minute clock was never close to expiring. It is currently a generous safety limit, not the main source of tension. It was preserved rather than silently shortening the challenge.
- **Controls limit:** the directional buttons are compact on phones; a larger touch-target accessibility pass remains useful.

## Reproduce

Run `node scripts/balance-sim.mjs --save` from the repository root. The complete per-play gain logs are in `docs/balance-10-games.json`. Run `npm test` for the rules, movement-clock and player-model tests.

## Primary design references

- David Sirlin, GDC 2009, Balancing Multiplayer Competitive Games: https://media.gdcvault.com/gdc09/slides/GDC09_sirlin_balancing.pdf — meaningful options and dominant strategy pitfalls. This football game is single player; only the general meaningful-choice principle is applied.
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/ensure-controls-are-as-simple-as-possible-or-provide-a-simpler-alternative/ — preserve simple controls.
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/ — touch-target review.
