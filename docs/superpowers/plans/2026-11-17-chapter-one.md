# 青岚谷第一章 Implementation Plan

> **For agentic workers:** Use subagent-driven-development with scoped ownership, integration and independent review. User explicitly requested subagent division and GitHub updates.

**Goal:** Complete a playable first chapter about restoring Qinglan Valley's water, including exploration, collection, team management, evolution, three encounters and an ending.
**Architecture:** Native ESM pure chapter state module, existing deterministic battle engine and event UI, versioned saves. Domain state is separate from DOM. No runtime dependencies.
**Tech Stack:** JavaScript, CSS, generated original painted PNG, Node test runner, Playwright.

## Global Constraints
- Preserve approved hand-painted Eastern fantasy visuals and traditional five-element interactions.
- Six existing species; team of three unique owned species, reserves available outside battle.
- Eight explorable nodes including optional branch; three required distinct battles; no randomized grind required.
- Three starters each have one explicit evolution with distinct painted art, new skill behavior and actual combat changes.
- No paid, multiplayer, account or third-party protected assets.
- Preserve/migrate valid v1 saves; corrupt/future saves protected, import/export/backup remain available.
- Progress persists only at full-turn boundaries; rewards and story items cannot duplicate.
- 20–30 minutes is a target until human playtesting, not a measured claim.
- Work only in this repository. Agents own disjoint files; root integrates, reviews, tests and commits.

### Task 1: Chapter model and content
Own src/chapter.js, tests/chapter.test.js. Implement eight-node original story with dialogue, clues, environmental interactions, all six recruitable species with contextual habit contracts; three battles (ridge, marsh, source), shrine evolution, ending, postgame collection/replay. Pure functions return cloned state or throw readable errors. Export complete API documentation in docs/chapter-api.md for UI/save agents immediately. State must track owned/reserves, active team, discovered species, clue/item completion, node progress, evolved species and claimed battle milestones. Repeated actions never duplicate unique rewards. Wrong habit answers recover. No map softlock for any starter. Required bosses need full team but collection is freely accessible early.
- [x] Define public contract and write targeted state transition tests.
- [x] Implement all content/transitions, test all starter paths and replay/idempotency.

### Task 2: Combat growth and encounter support
Own src/battle.js, src/progression.js, tests/chapter-combat.test.js. Preserve existing v0.3 default behavior/tests. Extend combatConfig(id,xp=0,evolved=false); evolved variants only fox/turtle/deer, requires xp90. Export EVOLUTIONS with species/form names and description. Add explicit actor evolved flag (missing=false for legacy), createBattle options playerEvolved/enemyEvolved arrays and enemyProgress map. Chapter combat options encounterId ridge/marsh/source support deterministic, telegraphed distinctive mechanics with preview accounting and validated snapshots. Mechanics cannot depend on future player action. Config remains authoritative for bars and UI. communicate exact encounter contract to chapter/UI/save agents. Test state validation, each mechanic, preview vs outcome and evolved effects. Avoid changing source data default moves/IDs; evolved moves keep existing IDs so UI remains compatible.
- [x] Write tests for explicit evolution and encounter mechanics.
- [x] Implement and run regression suite; provide winning routes for three starter teams.

### Task 3: Chapter UI
Own src/main.js, src/style.css, optional src/chapter-view.js. Consume chapter API (coordinate directly), maintain existing combat event renderer/audio/settings. New chapter map, story/interaction views, objectives, full six-slot bestiary, active/reserve management, explicit evolution preview/confirmation, encounter briefing and telegraphs, meaningful ending/postgame. Use creatureArt(id,{evolved:true}) for evolved sprites. All battle config reads must include actor.evolved. Preserve atomic save and reward behavior. Update mobile layout and accessibility, disabled/locked reasons and mistake recovery. Do not modify domain/save modules. Notify save agent of final payload.
- [x] Integrate domain and views, syntax/build smoke.
- [x] Verify desktop/mobile by independent QA after stable.

### Task 4: Save migration
Own src/save.js, tests/chapter-save.test.js. Start after chapter contract exists. Encode v2 chapter schema and accept v1 through existing strict validation then migrate preserved party/xp/settings into chapter state. Do not delete old data; retain raw v1 backup on first write. Preserve legacy testable API where possible. Reject malformed state, unknown versions, unowned party/evolution, mismatched battle/rewards and oversized payload. Migration must not strand prior players. Document behavior.
- [x] Test v1 migration, v2 roundtrip, invalid states, replay rewards and backup.
- [x] Implement and run save tests.

### Task 5: Evolution art
Own assets/fox-evolved.png, turtle-evolved.png, deer-evolved.png, src/art.js, docs/art-direction/evolution provenance. Use imagegen skill and inspect approved base assets. Generate original mature forms in approved style on transparent background; preserve base files. creatureArt options.evolved selects them. Review exported transparency/composition and graceful fallback not necessary once files exist.
- [x] Generate three forms and validate dimensions/alpha.
- [x] Add renderer and provenance.

### Task 6: Independent QA, integration and GitHub
Own tests/browser-chapter.mjs and docs/chapter-validation.md (QA); root owns package/version, README, CHANGELOG, progress, roadmap. Test three starter routes, recruit all6, bench swaps/lead, three bosses, each evolution, chapter ending and postgame. Browser desktop/mobile, refresh midbattle/after rewards, v1 migration, import/export, no console errors/overflow and asset loading. Distinguish old legacy browser scripts from current chapter suite. Review full diff independently. Publish verified milestones via commits/push and a PR on feat/growth-and-polish; update chapter Issue with evidence. No claim of public deployment or human playtesting.
- [x] Core tests/build/browser QA and review issues resolved.
- [x] Docs and version updated, GitHub commit/PR/Issue synced, CI observed.
