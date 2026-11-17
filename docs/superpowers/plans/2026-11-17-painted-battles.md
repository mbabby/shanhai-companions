# 绘本战斗 v0.2 实现计划

用户确认三兽手绘稿及青绿金边对战界面风格，继续接入可玩版。

## 范围与接口

- 保留 v0.1 探索与规则，三只已确认角色改为透明背景手绘素材；其余三只明确保留原型插画。
- `assets/fox.png`, `turtle.png`, `deer.png` 均朝右；`assets/battlefield.png` 为无角色无文字溪石场景。
- `resolveTurn(state, action)` 返回 `{state, events}`；`stepBattle` 兼容原接口。事件含 `type, side, targetSide?, actorId?, targetId?, moveId?, hpDamage?, shieldDamage?, amount?, multiplier?, state`，state 是该事件后的独立快照；末尾 roundEnd 含最终状态。
- 事件类型：move（攻击与效果后的快照）、switch、faint、replace、burn、roundEnd。禁止从中文日志反向推断伤害。
- `previewMove(state, moveId)` 返回 `{damage, hpDamage, shieldDamage, multiplier}`，表达当前面板预估，不承诺回合内对手换位/先手效果不改变结果。
- UI 按真实事件顺序播放出招、受击、护盾、回复、倒下、补位；演出中禁止重复提交，支持 ×1/×2 和减少动态效果。
- 生命及护盾独立数值/条，状态剩余回合、队员生命始终可见。数值使用真实规则；不照搬提案等级或示例生命。

## 并行分工

- [x] 内核：battle.js、事件与预估测试、战斗规则文档。
- [x] 界面：main.js、style.css、可新增 presentation.js；使用原 art API 或 assets 图片。
- [x] 主代理：素材生成、art.js 接入、静态服务/构建、来源记录、项目说明与 GitHub。
- [x] 独立 QA：完整流程、连击锁、动画事件与数值、移动端、减少动态效果、原测试回归。

## 验收

`npm test`、`npm run build`；Chrome 桌面/手机视口完整战斗；检查真实截图、无加载错误、无布局溢出。更新进展后推送独立分支 PR（基于首版分支）。
