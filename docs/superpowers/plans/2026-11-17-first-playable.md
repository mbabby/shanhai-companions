# 首个可玩版本 Implementation Plan

**Goal:** 浏览器完成选伙伴、习性结契、配队、战斗与首领结算，可重复游玩。

**Architecture:** 原生 ES modules；纯函数战斗内核与 DOM 界面分离。静态站点无需服务器账号或运行时依赖。

**Tech Stack:** JavaScript、CSS、SVG、Node.js 22+ 内置测试与静态服务。

## Global Constraints

- 已确认方向沿用 design-v0.1；本文件的数值与流程为首轮试玩假设，用户要求直接完成首个可玩版本。
- 六兽覆盖五行；白耳暂为金，属于原创游戏改编。
- 金克木、木克土、土克水、水克火、火克金；倍率 1.5 / 0.75 / 1。
- 三兽队伍，单兽出场，主动换兽优先且消耗行动；倒下自动补位，倒下者当回合不再行动。
- 三技能、冷却、灼伤、减速、护盾；AI 不读取玩家本回合选择。
- 两次习性互动后直接结契，答错可重试；不引入随机抽取、付费或登录。
- 当前不承诺成熟成长美术、完整存档或 20–30 分钟内容。

## 模块接口

`src/data.js`: export `CREATURES` 数组，每项 `{id,name,species,element,hp,attack,defense,speed,description,moves:[{id,name,description,power,cooldown,effect?}]}`；元素中文；id 为 fox,turtle,deer,boar,ape,fish。

`src/battle.js`: export `createBattle(playerIds,enemyIds)`；`stepBattle(state,action)` 返回新状态；`chooseEnemyAction(state)`；`effectiveness(attackElement,defenseElement)`。

状态 `{turn,player:{team,active},enemy:{team,active},winner:null|'player'|'enemy'|'draw',log:string[]}`。team 成员 `{id,hp,maxHp,cooldowns:{[moveId]:number},burn:number,slow:number,shield:number}`。行动 `{type:'move',moveId}` 或 `{type:'switch',index}`。无效行动抛 Error 且原状态不变。

`src/art.js`: export `creatureArt(id, options={})` 返回原创 SVG 字符串；options 可包含 className。

## Task 1 战斗内核
- [x] 先写 Node 测试并观察失败：五行、换兽承伤、击倒取消行动、状态/冷却、胜负和非法输入。
- [x] 实现 data.js / battle.js；基本攻击无冷却，状态时序写入规则文档。
- [x] `node --test tests/battle.test.js` 验证；用至少两队完整通关测试验证可赢。

## Task 2 网页与短冒险
- [x] 实现 index.html、src/main.js、src/style.css，消费上述接口。
- [x] 初始三选一，两个地点展示习性与选项获得另外两兽，调整领队，挑战守关三兽。
- [x] 展示生命、五行、技能效果、冷却、状态、逐回合日志；胜负后重试或重开旅程。
- [x] 桌面与移动尺寸浏览器操作验收，无横向溢出。

## Task 3 原创插画
- [x] src/art.js 原创 SVG 六兽，各自形态可辨；不引用现代 IP 素材。
- [x] 界面接入插画并提供文本名与属性，不能只凭颜色识别。

## Task 4 集成与发布
- [x] package.json 提供 dev/test/build；scripts 静态服务与构建，无额外运行时依赖。
- [x] 测试、构建、真实浏览器完整试玩；独立 subagent 复核实现及关键边界。
- [x] 更新 README、progress、CHANGELOG 和 GitHub Issue，验证后提交推送。
