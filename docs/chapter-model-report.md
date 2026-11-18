# Chapter model verification — 2026-11-17

Implemented `src/chapter.js` with eight original narrative locations, an optional overlook, six accessible species, environmental preparation followed by two habit responses, three distinct encounter definitions, explicit three-starter evolution, ending and postgame replay. State and public API are documented in `chapter-api.md`.

All three starter routes can collect the full six before the first mandatory battle. Forest habitat preparation and creek cleanup are deterministic and free; wrong habit choices preserve trust. A full three-species party is required for trials, while owned reserves remain selectable outside combat. Shrine attunement after ridge brings every currently owned starter species to 90 XP. Returning after recruiting another starter grants the same growth without duplicating the unique shrine item. Evolution remains a separate explicit action.

Victory XP and unique story rewards apply only on each encounter's first victory. Failed attempts and postgame replays grant no XP. Full-turn battle snapshots are separate from presentation events. End-state settlement is explicit and idempotent; leaving an unsettled battle result is rejected. Story prerequisites, milestone chains, item correspondence and evolution prerequisites are checked by the domain validator, with detailed battle/reward envelope validation supplied by the save module.

Verification:

- `node --test tests/chapter.test.js tests/chapter-save.test.js`: 17/17 passing at time of check.
- `npm test`: 80/80 passing, including combat encounter tests and existing regressions.
- Chapter tests cover all three full starter story paths, all six recruits, all three evolutions, mistake recovery, cloning, duplicate actions, late shrine growth, defeat/retry, encounter identity, invalid story records and ending/replay rewards.

Domain tests deliberately create valid terminal battle snapshots to isolate chapter settlement behavior. They do not claim tactical wins; combat tests independently verify actual encounter wins. Browser integration, art quality, human playtime and public deployment are outside this module's verification. The 20–30 minute duration remains a target requiring human playtesting.

## Independent review follow-up

Fixed `setTeam` from an ended battle: after settlement it now clears the previous battle through `returnToMap` before changing the team; before settlement it refuses with the existing readable settlement message. This prevents a successful team edit from leaving a retained battle with a different party. Added a regression that first failed on unclaimed team changes, then passed for both rejection and valid reordered settled state. Checked other result-exit mutations: `visitNode`, `openParty` and `showEnding` already use `returnToMap`; encounter retry explicitly requires settlement; bonding/evolution/environment interactions require node phase.

`node --test tests/chapter.test.js tests/chapter-save.test.js`: 18/18 passing after the fix. Scoped `git diff --check` clean.
