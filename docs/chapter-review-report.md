# Independent chapter review

## Task 2: combat growth and encounters

Spec verdict: PASS. Quality verdict: PASS. No blocking or actionable combat regression identified in the scoped diff, plan, implementation, tests and combat report.

Reviewed `src/battle.js`, `src/progression.js`, `tests/chapter-combat.test.js`, Task 2/global constraints in the chapter plan, and `docs/chapter-combat-report.md`.

- Traditional five-element cycle is unchanged.
- Evolution is explicit, limited to fox/turtle/deer at XP90 or above, and preserves move IDs. Derived actor values and evolved flags are validated. Missing legacy flags resolve to false.
- Evolution affects authoritative combat configurations, damage, healing/shields, move events and maximum HP consistently.
- Terrain damage is shared by preview, AI scoring and resolution. Marsh speed is applied during public turn ordering, preserving priority.
- Encounter IDs survive event snapshots and final state. Terrain depends only on public turn number; enemy decisions do not read the selected player action.
- No default source moves or species IDs changed. The supplied scoped verification reports 47 passing tests; this review did not duplicate that run.

Optional wording polish: `src/battle.js` marsh odd-round telegraph says “本回合速度正常”, while an ordinary slow status may still be present. “本回合泥沼不降低速度” would make clear that this describes only terrain. The mechanic and even-round stacking description are correct.

Scope limitation: chapter reachability, save integration, UI configuration reads and human difficulty are not established by this combat-only review. They require the subsequent integrated review.

## Integrated core: Tasks 1, 3 and 4

Final spec verdict: PASS. Final quality verdict: PASS. The domain API issue identified below has been corrected and re-reviewed; no remaining blocker was found in reviewed code.

Reviewed fresh `src/chapter.js`, `src/chapter-view.js`, `src/main.js`, `src/save.js`, chapter/save tests, API contract and save report. Supplied prior test evidence was not broadly rerun. Browser acceptance remains the independent QA agent's responsibility.

### Resolved finding: preserve valid state when changing a team after settlement

`src/chapter.js`, `setTeam`: the guard rejects only phase `battle`, so a successful call during phase `end` changes `run.team` while retaining `run.battle.player.team`. Swapping two members after a settled win produces a state rejected by `validateChapter` with “战斗队伍记录不一致”; it also cannot be saved. A focused Node reproduction confirmed this. Require the caller to leave the result phase with a readable error, or clear a settled battle through `returnToMap` before updating the team. The current UI avoids this edge because its party button already calls `openParty`.

### Verified by code inspection

- All six species are accessible before the first required battle; habitat preparation gates are contextual and recoverable, and wrong bond responses preserve progress.
- Three required encounters have ordered story gates; creek clue recovery is available, shrine attunement matures owned starters without grinding and can mature later recruits.
- Settlement ties unique story items, completion and milestones together; repeated settlement and replay do not repeat rewards. Losses preserve chapter/collection progress.
- Evolution preview is explicit, with separate confirmation; party/reserve management and six-species bestiary are available outside combat. Evolved damage plus self-heal/shield is now displayed on the correct actors.
- Playback locks submissions before resolving and skips saving while intermediate event snapshots are displayed. Only the final turn state passes through `recordBattle`, settlement and persistence. Refresh therefore resumes the previous complete turn.
- v1 migration retains team order, ownership, XP and settings, settles outstanding legacy rewards once, and does not invent chapter wins. Raw v1 data is protected in a dedicated backup before the first v2 write.
- Ordinary saves refuse corrupt/future primary data; backup failures prevent primary overwrite; explicit import/new-flow confirmations and raw export remain available. Strict chapter save validation checks encounter identity, actor growth/evolution and reward XP.

The original optional marsh wording observation has been corrected in fresh combat code. No claim is made about measured playtime, browser layout or final art quality from this code-only review.

## Final closure review

Re-reviewed the `setTeam` correction: result-phase edits now call `returnToMap`, which rejects unclaimed rewards and clears a settled retained battle before assigning the new team. The focused regression covers both rejection and valid post-settlement reordering. Root reports the complete suite at 81/81 passing; no redundant broad test run was performed by this reviewer.

The final `creatureArt` change selects the three `*-evolved.png` files only for explicit `evolved === true` on supported starters and preserves normal artwork for other species. All three mapped files exist. Fresh UI code includes correct dual-effect actor targeting and readable clue labels. No new actionable issue was found in these finishing changes. Visual quality and rendered browser acceptance remain covered by the separate art/QA reports.

### Final resource-reference follow-up

Accepted the narrow CSS correction: `.chapter-map` now references existing `assets/battlefield.png` relative to `src/style.css`; no `battle-bg.png` reference remains in that stylesheet. The gradient/layout are preserved. The `index.html` description now accurately describes eight locations, six species and three trials. No new review blocker. Root reports a fresh 81-test pass and successful build; resource/defeat browser rechecks remain with QA, and no broad tests were repeated here.

## Targeted first-battle responsiveness review

Reviewed the playback change, new `src/playback.js` and its four tests, plus the surrounding fresh `main.js`/audio integration. No critical correctness finding. The complete outcome and reward state are computed before presentation; intermediate snapshots are not persisted. Normal completion, skip, animation error and timeout share one inactive-before-commit gate. Checks after awaits prevent stale animation writes after an immediate settlement or a subsequent turn. Save schemas are unchanged.

Two nonblocking text observations were sent to root: finished battles should not display the “choose a skill or switch” announcement; automatic-recovery messaging should avoid claiming a successful save when persistence reports storage failure. Suggested focused browser error injection and skip/new-turn checks to supplement helper-level tests. Root reports 85 unit tests and build passing; this review did not rerun the broad suite. Browser acceptance remains pending the targeted retest.

Playback follow-up accepted: finished-battle announcement now points to result navigation; automatic recovery says the round was settled without claiming storage success; projectile duration matches the 240 ms windup. Root reports direct CUA evidence for immediate acknowledgement, consecutive skips, deterministic HP/outcomes after refresh and a roughly 1.3-second subsequent shield turn. Both text observations are resolved; no additional broad review or test run was performed.
