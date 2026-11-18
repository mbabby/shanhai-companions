# Chapter combat API and validation

`combatConfig(id, xp = 0, evolved = false)` remains the authoritative source of maximum HP, attack, defense, speed, move names and effects. All existing XP/mastery behavior is preserved when evolution is false. Evolution is explicit, requires at least 90 XP and is available only for fox/turtle/deer. Battle XP remains capped at 90. Evolution adds 12 HP and 3 attack beyond the existing Lv3 bonuses.

`EVOLUTIONS` is an object keyed by starter ID, each value `{species, name, description}`. Forms: 照夜灵狐, 镇澜玄龟, 青岚鹿蜀. Existing move IDs are preserved: fox-skill adds 8 power beyond Lv3 mastery and retains three burn ticks; turtle-skill attacks and grants a 24-point shield (maximum with existing shield, not additive); deer-skill attacks and heals 18 (capped at maximum HP). These effects use the ordinary move event's `amount` and `hpDamage` fields.

`createBattle(playerIds, enemyIds, options)` accepts:

- `playerProgress`, `enemyProgress`: known-species XP maps, 0–90.
- `playerEvolved`, `enemyEvolved`: unique species-ID arrays. May include reserves; all listed IDs must be mature starter species in the corresponding progress map.
- `encounterId`: omitted for the legacy trial, or `ridge`, `marsh`, `source`.

Created actors have a boolean `evolved`; missing flags in legacy saves mean false. Invalid types, unsupported/immature evolution and forged derived stats are rejected. `encounterId` is validated and preserved in every event snapshot and final state. No hidden encounter counters exist.

`encounterTelegraph(state)` returns a Chinese string for the currently displayed turn; empty string for legacy battles. Display it before submitting an action. Each encounter depends only on public turn number:

| Encounter | Mechanic |
| --- | --- |
| ridge | Odd rounds: direct attacks against the enemy lose 8 damage after elemental calculation, minimum 1. Even rounds: normal. |
| marsh | Even rounds: player's speed is halved, multiplicative with ordinary slow. Priority moves and switching retain priority. Odd rounds: normal. |
| source | Every third round: enemy direct attacks gain 8 damage after elemental calculation. Other rounds: normal. |

Terrain never affects healing, shields or burn ticks. `previewMove` includes the current terrain modifier, shield absorption and current target HP cap. Like the existing preview, it describes the current target, not future switching or a shield cast before the attack. Enemy decisions account for public damage modifiers and never inspect the player's chosen action. Each turn's terrain explanation is also logged.

## Reproducible winning policies

All three lead orders of the team fox/turtle/deer were tested:

- Ridge at XP0, against ape/boar/fox: switch to fox against ape, deer against boar, turtle against fox; otherwise use the available damaging move with greatest power. Fox lead wins in 10 rounds; turtle and deer lead in 12.
- Marsh at XP90 with all three evolved, against fish/turtle/deer: use greatest-power available damaging move, no voluntary switching. Fox/turtle/deer leads win in 15/13/12 rounds.
- Source at XP90 with all three evolved, against boar/ape/fish: same no-switch policy; leads win in 12/13/13 rounds.

These prove deterministic engine routes, not human difficulty or chapter playtime. Chapter model tests must separately prove the required recruitment and XP are available without repeated battles.

Verification: `node --test tests/battle*.test.js tests/progression.test.js tests/chapter-combat.test.js` — 47 passed, 0 failed. Includes unchanged legacy balance, event, growth and battle regressions plus explicit evolution, terrain preview/outcomes, snapshots, malformed options and nine winning routes. An intermediate whole-suite run encountered other agents' not-yet-implemented chapter/save APIs; those are outside this scoped result.
