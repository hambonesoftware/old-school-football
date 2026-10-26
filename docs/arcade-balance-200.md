# v0.5 — Arcade momentum and 200-game balance check

## What changed

- Default Arcade Run automatically advances at a cruise target of 7.2 yards/sec, with an 8.0 yards/sec surge when up is held and a 3.2 yards/sec braking speed when down is held. Acceleration response is 180 ms.
- Lateral moves do not suspend forward travel. A shared 150 ms input cadence limits repeated lane changes.
- Camera starts near 76% downscreen, permits about five yards of on-screen progress, then follows with a ~200 ms response. Approximately 37 yards remain visible vertically.
- First defender appears six yards ahead. Defenders close the gap if the runner remains in their lane; pressure ramps with field position, but formation positions are fully visible before snap.
- Classic mode retains v0.4 defensive values and discrete step controls.

## Simulated results

The following results were executed by evaluating the same Game and MovementClock source modules as the browser. Fifty deterministic seeds were replayed under each policy, for 200 arcade drives total. The policies sample current defender positions, never future RNG. These are not human games.

| Policy | Touchdowns | Mean max progress (yd) | Mean live time | Mean plays |
| --- | ---: | ---: | ---: | ---: |
| straight | 14/50 | 63.8 | 11.8s | 18.2 |
| reactive | 50/50 | 75 | 11.5s | 7.3 |
| reader | 50/50 | 75 | 11.1s | 4 |
| reckless | 50/50 | 75 | 10.3s | 4.2 |

- **Straight:** never changes lanes; a weak control policy.
- **Reactive:** reacts to threats within 6.5 yards using an approximately 320 ms observation delay, occasionally missing a decision.
- **Reader:** chooses nearby safer lanes with a roughly 200 ms observation delay.
- **Reckless:** same lane reading as Reader but holds up/surge whenever it is not steering; it cannot sprint and change lanes simultaneously.

The straight policy wins some drives but is much less reliable than lane-aware policies, indicating that steering choices remain useful. However, all lane-aware bots won every sampled drive; actual difficulty may be too forgiving for experienced players. Ten or even 200 scripted games cannot measure subjective feel, real touchscreen accuracy, or player learning.

## Verification and limitations

- Source-level assertions cover continuous progress, steering without forward slowdown, sprint/brake, classic stepping, collisions, touchdowns, pre-snap stability, and reset behavior.
- The field and renderer were exercised with simulated canvas contexts at 390×450, 1000×650, and 320×220 sizes without throwing errors.
- The tested bot policies do not measure visual comprehension. Human testing should inspect the first contact, perceived speed, lane readability, and camera framing on a phone.
- Run npm test and node scripts/arcade-balance.mjs --save in Node 18+ to reproduce test and report outputs.
