# 素材出处与原创约定

首批异兽候选来自《山海经·南山经》，参考古籍文本：

- https://www.shidianguji.com/book/HY6742/chapter/1kulpugdrvvh7
- https://www.shidianguji.com/book/HY6095/chapter/1kskaxvo1hzpl

仅将这些链接作为文本查证入口，不复制其现代译文、插图或网站资源。正式制作前逐条记录原典描述、设计改编及素材作者。

游戏昵称、属性、技能、成长形态、青岚谷与录灵人设定均为原创提案，不宣称出自原典。不使用现有游戏或影视中的角色造型、地图、音乐、截图、提取素材。

外部依赖与美术须明确许可和署名。未来素材另行许可时，应在素材目录中明确说明，不覆盖第三方权利。

## v0.1 原型素材

`src/art.js` 的六兽 SVG 为本项目用代码绘制的原创原型插画，随仓库采用 MIT 许可；未复制外部图片、角色模型或现代游戏素材。九尾、鸟首龟身、白首虎纹、掘土足爪、白耳及翼蛇尾为设计线索；色彩、表情、比例、光环及昵称均属本项目表达，并非古籍复原。后续正式美术仍需逐条完善原典考据。

界面使用用户设备系统字体，没有外部字体、图片或运行时脚本请求。Playwright 仅用于可选开发测试，不随静态游戏分发。

## v0.2 手绘素材

用户确认 `docs/art-direction/characters-approved.png` 与 `battle-approved.png` 的美术方向后，使用内置 imagegen 生成 `assets/fox.png`、`turtle.png`、`deer.png`、`battlefield.png`。完整提示词见 [生成记录](art-direction/prompts.md)。素材为本项目 AI 生成表达，按仓库 MIT 条款提供，不宣称人工绘制或原典复原。原型其余三兽仍使用 SVG。

参考稿保留为设计记录，游戏实际使用独立角色 PNG 与无角色背景、真实 HTML 血条和技能控件。效果图中的等级、生命数值及装饰文字不构成游戏规则。

## v0.3 六兽与合成音频

新增 `assets/boar.png`、`ape.png`、`fish.png`，采用同一内置 imagegen 工作流与已确认风格；提示词见 [v0.3 记录](art-direction/prompts-v0.3.md)。全套素材按仓库 MIT 条款提供，明确为 AI 生成表达，不宣称人工绘制。

音效与氛围由 `src/audio.js` 使用 Web Audio 正弦振荡器实时合成，没有使用外部音乐或采样文件。界面、素材与声音均无需第三方网络请求。
