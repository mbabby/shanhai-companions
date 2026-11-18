# 第一章进化立绘与生成记录

日期：2026-11-17。使用内置 `image_gen.imagegen`，未使用 CLI/API fallback、第三方素材库或受保护角色。用户已批准东方幻想手绘、青绿金边与幼体到威严成长方向。本次是该方向下的新成熟形态；不把本次输出表述为用户另行逐张验收。

## 资产与来源

原有 `assets/fox.png`、`turtle.png`、`deer.png` 只作为造型和风格参考，已逐张查看且未修改。分别独立调用生成工具，均设置 `transparent_background: true`，按原始字节复制到项目。

| 项目文件 | 内置工具原始文件名 | 设计区别 |
| --- | --- | --- |
| assets/fox-evolved.png | exec-aa579010-0d9a-4108-91e2-1c9d23f058a4.png | 更高昂的头部、长胸鬃、金尖九尾、肩部玉色纹样 |
| assets/turtle-evolved.png | exec-2d2bf1d2-0c16-47b7-8768-79f62420f2ae.png | 高颈长羽冠、层叠厚玉甲、强化四肢与尾鳍 |
| assets/deer-evolved.png | exec-e99492cb-1ac3-4db2-9cea-4f8a20a58fa5.png | 成熟马体、落地行进姿态、长赤鬃赤尾、玉色肩腿纹样 |

工具原始输出保存在 Codex 的 generated_images 会话目录中；运行时仅引用仓库内资产，不依赖本机生成缓存。三图保持九尾狐、鸟首长尾旋龟、白首虎纹赤尾鹿蜀的识别特征；鹿蜀延续确认稿的马形，不添加鹿角。造型纹样属于本游戏原创表达，不宣称古籍复原。均为静态立绘，无逐帧动画。

## 验证

三张文件均为 1536 × 1024、8-bit RGBA PNG。使用 Python 标准库解码 PNG 的 scanline filter，读取实际 alpha；未使用 Python 编辑图像。

| 文件 | alpha 范围 | 完全透明像素 | alpha ≥ 250 像素 | 四角 alpha（左上/右上/左下/右下） |
| --- | --- | --- | --- | --- |
| fox-evolved.png | 0–254 | 630202 | 706593 | 0 / 0 / 1 / 0 |
| turtle-evolved.png | 0–254 | 594892 | 852650 | 0 / 0 / 0 / 0 |
| deer-evolved.png | 0–254 | 817273 | 543907 | 0 / 0 / 1 / 0 |

主体 alpha 主要集中于 251–253；工具生成文件没有 alpha 255，近乎不透明但并非严格完全不透明。边缘有极低 alpha 的抗锯齿/软边。保留工具原始 alpha，不人为提高或阈值化。目视检查全身造型、右朝向、无文字以及成熟形态差异；PNG 预览的底色不是矩形不透明背景。实际留白比提示要求的 8% 更紧，耳/尾/足仍在画布内。

`creatureArt(id, { evolved: true })` 为 fox/turtle/deer 选择 `-evolved.png`；其他三兽保持基础立绘。直接 Node 断言验证三种进化路径、三种基础路径、非初始兽 fallback 与未知 ID 抛错通过。整章浏览器加载与画面验收由集成 QA 记录。

## 完整提示词

### fox

Use case: stylized-concept. Create a NEW original evolved adult nine-tailed fox production sprite for Chinese mythology RPG. Reference image is style and species identity only; design a clearly different majestic mature evolution, not a copy or recolor. Fine hand-painted Eastern fantasy gouache, delicate ink contours and textured fur, matching reference quality. Adult tall elegant fox facing RIGHT in 3/4 full-body, proud raised head, narrow wise amber eyes, powerful long legs, magnificent layered ivory chest mane, cinnabar forehead sigil. EXACTLY NINE separate flowing tails spread behind left in a stately fan, ivory roots transitioning vermilion with fine warm gold flame-like tips. Subtle jade and muted gold natural fur markings at shoulders; no armor or clothing. More regal, larger mane and dramatic distinct silhouette than reference. Landscape 3:2 canvas, all paws ears and nine tails fully visible, centered with 8% clear margins. True transparent alpha background; no colored glow backdrop, no scenery, no shadow disk, no frame, no lettering, no labels, no watermark. Preserve cream/red fox identity. No wings, no extra limbs, no existing game characters.

### turtle

Use case: stylized-concept. Create a NEW original majestic evolved adult bird-headed long-tail turtle production sprite for Chinese mythology RPG. Input image is approved base identity and style reference ONLY; make a distinct elder evolution with different posture and silhouette. Fine hand-painted Eastern fantasy gouache and ink, tactile detailed feathers, jade stone shell, muted gold detailing. Full body faces RIGHT, low broad powerful quadrupedal stance, raised long neck with unmistakable stern eagle-like BIRD HEAD and short ivory hooked beak, narrow amber eye, long swept-back teal feather crest and layered ivory-teal neck mantle. Large jade-green stepped domed TURTLE SHELL with raised gold-edged geometric scutes and elegant river spiral engravings; wider and more architectural than base but organic, no buildings. Four thick armored reptilian legs with ivory claws; long powerful scaled teal tail curling high behind LEFT, tapered featherlike fin tip. Mature sacred river guardian, wise and formidable. Palette celadon, deep teal, ivory, restrained antique gold. Landscape 3:2 full character with generous 8% transparent margins, all feet crest shell and tail visible. True transparent alpha background, no backdrop glow, no scenery, ground, shadow disk, text, labels or watermark. No dragon head, no wings, no human armor, no existing franchise designs.

### deer

Use case: stylized-concept. Create a NEW original evolved adult Lushu white-headed tiger-striped horse production sprite for Chinese mythology RPG. Reference is approved base identity and fine hand-painted Eastern fantasy gouache style only. Clearly different majestic mature evolution, not merely recoloring reference. Proud powerful adult HORSE with WHITE equine head, elongated regal neck, athletic broad chest and strong long horse legs, dark tiger stripes over tawny-gold body. Dramatically long flowing vermilion RED mane cascades along neck and chest; an enormous elegant red flowing tail sweeps behind LEFT in two broad ribbon-like locks, with restrained warm gold strands. Natural jade-green leaflike markings around shoulder and lower legs, subtle gold edging to dark stripes. Hooves dark jade, ivory fetlock feathering. Noble focused amber eyes. Full body facing RIGHT, one front hoof forward but grounded in a statuesque confident walking stance; distinct low flowing tail and muscular mature silhouette compared to base raised-leg juvenile. Fine ink contours, tactile gouache fur and hair, exquisite detailed original Eastern fantasy animal, no tack or clothing. Landscape 3:2 canvas, whole head ears tail and four hooves within frame, 8% clear margin. True transparent alpha background. No background glow or color, scenery, ground, shadow disk, text, frame, labels or watermark. NO ANTLERS, NO HORN, no wings, no dragon scales, no existing game character.

