# v0.3 战术与成长平衡记录

2026-11-17，确定性模拟；不是长期平衡或真人难度的结论。

## 改动边界

未提升任何 1 级基础属性、攻击威力、护盾量或回复量。五行仍为 1.5 / 0.75 / 1；伤害公式不变。改变的是行动优先级与公开状态 AI：换兽 > 护盾 > 攻击/回复，同组按速度；敌方能识别可用护盾救命的局面，并在受伤受克制时选择可承伤的抵抗属性伙伴，两轮内不再主动换兽。详见 [规则](battle-rules.md)。

六兽的现有差异继续保留：狐以灼伤持续施压，龟高防厚盾但慢速，鹿克土且可回复，狸力以土系强击对付水，狌狌高速减速，鯥水系减速。没有加入额外破盾或新状态。

成长另行叠加：Lv2 / Lv3 每级最大生命 +8、攻击 +2、防御 +1；Lv3 初始三兽的特色攻击威力 +4。经验与面板由同一配置推导，下面的胜利证据全部为 **Lv1、零经验**，无需先输几场升级。

## 前后对照

旧版基准：`68f5a3026fba23a7c69a28243767bdf94a741396`。守关队固定为狸力、狌狌、旋龟。普通策略每轮选择显示威力最大的可用攻击；同分取技能列表先者。换位策略按当前敌人选择鹿对狸力、狐对狌狌、龟对旋龟；目标伙伴存活且未出场时换兽，否则按普通策略。

| 阵容/策略 | v0.2 | v0.3 | v0.3 我方剩余生命（阵容顺序） |
| --- | --- | --- | --- |
| 狐、狌狌、龟；普通 | 胜，10 回合 | 胜，12 回合 | 0 / 0 / 34 |
| 鹿、狌狌、鯥；普通 | 胜，11 回合 | 胜，14 回合 | 0 / 0 / 28 |
| 龟、鹿、狐；普通 | 负，9 回合 | 负，10 回合 | 0 / 0 / 0 |
| 龟、鹿、狐；换位 | 胜，12 回合 | 胜，15 回合 | 3 / 23 / 19 |

三条获胜路线都能从探索获得：火初始在林地选狌狌、溪流选龟；木初始在林地选狌狌、溪流选鯥；水初始在林地选鹿、溪流选狐。水初始的同一队伍仅改变换位决策，就从失败转为获胜。敌方更会防守后，流程比旧版增加 2–3 回合，现阶段接受这一代价；尚未验证长期重复游玩的疲劳感。

护盾独立对照：我方龟剩余 30 生命，对方满血狌狌且断响可用。旧版龟使用护盾或普攻均先被击倒；新版护盾先吸收 36 点，龟承受剩余 5 点并存活于 25 生命。普攻仍被击倒，证明收益来自优先级而非增大生命。反例：面对最后一只 1 生命的狸力，龟普攻立即取胜，护盾则放弃这一击，战斗继续；防守并非通用最优解。鹿回复最多 35 点并需等待 3 回合，不可无限连续回复。

## 复现

当前版完整断言与诊断输出：

```sh
node --test tests/battle-balance.test.js tests/battle-growth.test.js
node --test tests/battle*.test.js
```

前后表格可使用下面同一段策略，分别指向旧版和当前版源码目录。旧版文件可提取到临时目录，不更改当前工作树：

```sh
mkdir -p /tmp/shanhai-v02
 git show 68f5a3026fba23a7c69a28243767bdf94a741396:src/battle.js > /tmp/shanhai-v02/battle.js
 git show 68f5a3026fba23a7c69a28243767bdf94a741396:src/data.js > /tmp/shanhai-v02/data.js
```

使用 Node 22+ 将以下保存为临时 `compare.mjs`，运行 `node compare.mjs /tmp/shanhai-v02` 与 `node compare.mjs "$PWD/src"`：

```js
const root=process.argv[2];
const {createBattle,stepBattle}=await import(`${root}/battle.js`);
const {CREATURES}=await import(`${root}/data.js`);
for(const [ids,matchups] of [
  [['fox','ape','turtle'],false], [['deer','ape','fish'],false],
  [['turtle','deer','fox'],false], [['turtle','deer','fox'],true],
]) {
  let s=createBattle(ids,['boar','ape','turtle']);
  while(!s.winner && s.turn<80) {
    const actor=s.player.team[s.player.active];
    const move=CREATURES.find(c=>c.id===actor.id).moves
      .filter(m=>m.power>0&&!actor.cooldowns[m.id]).sort((a,b)=>b.power-a.power)[0];
    let action={type:'move',moveId:move.id};
    if(matchups) {
      const wanted={boar:'deer',ape:'fox',turtle:'turtle'}[s.enemy.team[s.enemy.active].id];
      const index=s.player.team.findIndex(c=>c.id===wanted&&c.hp>0);
      if(index>=0&&index!==s.player.active)action={type:'switch',index};
    }
    s=stepBattle(s,action);
  }
  console.log({ids,matchups,winner:s.winner,rounds:s.turn-1,hp:s.player.team.map(c=>c.hp)});
}
```

测试还覆盖 AI 换位锁、护盾冷却、先换兽再护盾、满血不空刷护盾、成长改变真实伤害、伪造等级/生命拒绝、状态不可变与原有事件顺序。三条获胜路线只证明可行性，不保证所有阵容、策略或随意操作都能取胜。
