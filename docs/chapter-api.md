# Chapter API (authoritative contract)

`src/chapter.js`, native ESM. All mutations clone input; errors are readable Chinese. Persistent payload remains `{run, progress, settings}`. XP lives only in `progress` (id→integer 0–90).

## Run

`{chapter:1, phase:'choose'|'map'|'node'|'party'|'battle'|'end'|'ending', starter:null|id, team:[], owned:[], discovered:[], evolved:[], node:null|nodeId, visited:[], completed:[], clues:[], items:[], interactions:[], bonds:{}, encounter:null|speciesId, bond:0, note:'', battle:null|BattleState, battleId:null|'ridge'|'marsh'|'source', milestones:[], rewardClaimed:false, gains:[], endingSeen:false}`.

Arrays are unique IDs. `team` is ordered, max 3; remaining owned are reserves. `bonds` id→0/1/2. `interactions` holds unique `nodeId:actionId`. `completed` node IDs. `milestones` encounter IDs, awarded once. Battle/end retain exact battle and battleId until leaving. `gains` existing awardExperience shape. Phase ending is narrative epilogue; map remains available afterward. Do not mutate domain fields directly except installing full-turn `battle` snapshots with `recordBattle`.

## Exports

- `STARTERS = ['fox','turtle','deer']`
- `NODES`: ordered eight objects `{id,name,subtitle,description,dialogue:[{speaker,text}],species:[],actions:[{id,label,description}],optional:boolean}`. IDs village, forest, creek, ridge, marsh, shrine, source, overlook.
- `HABITS`: species→`{clue,steps:[{prompt,options:[{id,label}],answer,success}],mistake}` (2 steps). IDs are semantic strings; pass chosen option ID.
- `ENCOUNTERS`: encounter→`{id,node,name,description,team:[ids],hint,reward,item}` (reward 30). Mechanics come from battle module.
- `ENDING`: `{title,paragraphs:[strings]}`.
- `freshChapter()` → run (choose).
- `chooseStarter(run,id)` → run (map).
- `nodeStatus(run,nodeId)` → `{unlocked,reason,completed}`.
- `visitNode(run,nodeId)` → run (node), adds visited and discovered species.
- `returnToMap(run)` → run (map), clears encounter/battle/result; disallowed during unfinished battle.
- `openParty(run)` → run (party); `setTeam(run,ids)` → run. Max3 unique owned, at least1. Disallowed during battle. Editing a team from a settled end result clears the old battle and returns to map; an unclaimed result must be settled first.
- `bondStatus(run,id)` → `{unlocked,reason,completed}`. Forest requires `roots` environmental action; creek requires `clear`. Display habit clue before preparation so players observe → prepare habitat → build trust. Owned species are unaffected.
- `startBond(run,id)` → run; requires species in current node and not owned, sets encounter and bond from bonds.
- `answerBond(run,optionId)` → run. Wrong choice keeps progress, supplies recovery note. After second correct answer add owned; autofill team if under3; clears encounter, retains bond=2. Already-owned start returns explanatory note with no duplicate.
- `interactNode(run,actionId,progress={})` → `{run,progress}`. Applies clue/items once. Shrine action `attune` sets each currently owned starter XP to90, marks shrine complete. Repeat safely trains newly recruited starters, no duplicate items.
- `evolveCompanion(run,progress,id)` → run. Requires shrine visited/completed, current node shrine, owned starter, XP≥90; explicit and idempotent.
- `encounterStatus(run,id)` → `{unlocked,reason,completed}`. Needs full team and prerequisite nodes/items. Replays available.
- `beginEncounter(run,progress,id)` → run with battle from createBattle, phase battle, rewardClaimed false. Requires current encounter node (phase node or end for retry).
- `recordBattle(run,battle)` → run; validate full snapshot; matching team/encounter; sets phase end on winner, else battle.
- `settleEncounter(run,progress)` → `{run,progress}`. Requires ended battle. First victory only awards team XP30, unique item and milestone; losses/replays award nothing. rewardClaimed makes repeated settlement no-op. Source first victory unlocks ending, does not force it.
- `showEnding(run)` → run (ending), requires source milestone, sets endingSeen.
- `chapterObjective(run)` → string.
- `validateChapter(run,progress={})` → true or throws; save module additionally validates settings/payload and battle/reward consistency as appropriate.

## Content gating

Village, forest, creek and optional overlook open immediately: all six species recruitable without combat for every starter. Ridge requires three companions. Marsh unlocks after ridge. Shrine unlocks after ridge. Source unlocks after marsh plus shrine attunement. Creek `clear` grants `water-trace`; source battle also needs it. Village `listen` grants `valley-map` (story context, not mandatory). Other node actions have clues and narrative. Victory items: `ridge-seal`, `marsh-seal`, `spring-heart`. Shrine attune gives `spring-tone`. Ending/replays preserve collection, XP and milestone uniqueness.
