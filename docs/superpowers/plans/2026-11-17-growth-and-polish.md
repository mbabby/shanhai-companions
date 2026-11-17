# v0.3 成长与体验 Implementation Plan

**Goal:** 六兽统一手绘、战术有收益、胜负后有成长、关闭页面后可继续。

**Architecture:** 纯战斗模块继续输出有序事件；成长/存档独立模块；界面只在完整回合后保存。音频为交互后启动的 Web Audio。

**Tech Stack:** 原生 ES modules、Node 22+ 内置测试、Playwright、PNG。

## Global Constraints

保持既有探索与五行规则，不扩地图、不加装备抽卡或多人。六兽全部采用已确认手绘方向。成长具体数值是首轮可调整实现，不声称已长期平衡。

## 精确接口

### progression.js（存档任务所有）

- `levelForXp(xp)`：0–29 为1级、30–89 为2级、90及以上为3级；经验上限90。
- `combatConfig(id, xp=0)`：返回 CREATURES 配置副本。每级生命+8、攻击+2、防御+1，速度不变；附带 level。3级 fox/turtle/deer 的特色技能 power+4（一次强化），name加「·精通」，description说明强化。
- `awardExperience(progress, teamIds, winner)` 返回 `{progress,gains}`，progress 为 id→累计经验，胜利+30、失败/平局+10，最多90；gains数组每项 `{id,xpGained,fromLevel,toLevel,mastered}`。纯函数，不重复处理同场由UI rewardClaimed负责。

### save.js（存档任务所有）

- `encodeSave({run,progress,settings})` 返回JSON字符串；`decodeSave(text)` 返回规范化同结构，校验后才返回。
- envelope `{version:1,run,progress,settings}`。run必须为合法游戏阶段、队伍、地点、结契进度、完整战斗状态；额外字段 rewardClaimed:boolean、gains:[] 默认false/[]。当前无已发布存档旧格式；兼容本版可缺省settings/rewardClaimed/gains的v1，未来版本拒绝覆盖并保留原始数据。
- settings `{speed:1|2,reducedMotion:boolean,sfx:boolean,music:boolean}`。
- `readSave(storage)` 返回 `{data:null|{run,progress,settings},error:null|string}`；`writeSave(storage,payload)` 返回 `{ok:boolean,error:null|string}`。键 `shanhai-save-v1`、备份 `shanhai-save-backup`。错误必须可见；拒绝将损坏/未知版本旧值静默覆盖。`restoreBackup(storage)` 尝试校验备份再恢复，返回同readSave结构。UI新旅程/导入覆盖需用户明确按钮确认；损坏值保留为备份或允许导出原文。

### battle.js / data.js（战斗任务所有）

- `createBattle(playerIds,enemyIds,options={})` options.playerProgress 为 id→xp；每队员附带 xp/level。无options兼容1级旧调用；state用xp推导真实配置，不信任持久化任意面板。
- `validateBattle(state)` 导出已有validate，校验完整边界后返回true，可供存档导入校验。
- 所有计算、AI、技能列表使用 combatConfig。保留 resolveTurn/previewMove 及事件契约。
- 战术技能加入优先级使护盾赶在普通攻击前；配置补充角色定位。AI使用公开状态选技能/必要时换兽，避免循环。给出基准比较和可赢阵容证据。

### audio.js（音频任务所有）

- `createAudio()` 返回 `{unlock(),setSettings({sfx,music}),play(event),dispose()}`。仅用户交互时unlock，默认均关闭；失败不影响游戏。play接收battle event或 `{type:'bond'|'victory'|'defeat'}`；音效/氛围独立控制，不请求外部文件。

## 分工与验收

- [x] 存档/成长：src/progression.js、save.js、独立Node测试；先测试失败再实现。导入校验、未来版本、损坏保留、禁用storage、备份恢复、奖励上限。
- [x] 战斗/平衡：src/battle.js、data.js、battle*.test.js、docs/battle-rules.md、docs/balance-v0.3.md。验证护盾改变结果、AI不偷看/不循环、三初始至少各一条1级可赢路线、升级和强化有效。
- [x] 界面：main.js、style.css。接存档/成长/音频；继续/新旅程、导入/导出/恢复备份、存储失败提示，阶段变更与完整回合后保存；奖励先标记再保存避免刷新重复领取，战斗开始刷新保留相同初态。突出行动者、独立伤害颜色、手机同屏紧凑布局。
- [x] 音频：audio.js及必要隔离验证，不自动播放。
- [x] 主代理：生成 boar/ape/fish.png，art.js 切换全部手绘，来源/运行/版本/进展文档，GitHub同步。
- [x] QA：更新旧浏览器测试适配明确新行为，新增存档继续/导出导入/破损/奖励防重复/连击锁/音频关闭/移动视口测试与独立审查。

验收：`npm test`、`npm run build`、三个浏览器脚本；桌面和390×844实际截图检查；同步GitHub后交付本机可玩版。
