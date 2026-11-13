# 40 · 模糊需求 → 精确提示词

## 一、五步流程

1. **判意图**：生成新图 / 编辑已有图？用途是什么？最在意什么？必须保留什么？
2. **拆信息**：用户明说的 / 可推断的 / 缺失的 / **互相冲突的**（冲突必须当面指出）
3. **判追问**：换答案会让画面完全不同 → 问 1～2 个最关键的；只影响丰满度 → 自己补，并标注「我补的」
4. **写提示词**：按七块结构，落在**可见维度**上
5. **写说明**：我理解成什么 / 补了什么 / 还有什么不确定 / 最终提示词

> 死规矩：**不许只做「中文 → 英文 + 堆 cinematic/8K」的同义词替换**。

## 二、映射表

| 用户原话 | 真实要的是 | 补进哪些可见元素 | 英文落点 |
|---|---|---|---|
| 高级感 | 极简 + 大留白 + 克制材质 | 哑光表面、柔和北向漫射光、负空间、中性色、85mm | `minimalist, soft diffused north light, matte surfaces with subtle reflections, negative space, muted neutral palette, 85mm` |
| 电影感 | 长焦压缩 + 体积光 + 调色 | 变形宽银幕、浅景深、体积光束、胶片颗粒、青橙调 | `anamorphic, volumetric light rays, shallow DOF, film grain, teal-orange grade, narrative framing` |
| 科技感 | 冷光 + 精密几何 + 金属玻璃 | 蓝白 LED 轮廓光、拉丝金属、高调棚光、几何精度 | `cool blue-white LED rim light, brushed metal + glass with accurate reflections, high-key studio, precise geometry` |
| 自然真实 | 纪实抓拍 + 可见皮肤织物纹理 | 自然窗光、35mm 手持、瑕疵、Portra 400 | `documentary candid, natural window light, visible pores and fabric texture, 35mm handheld, slight imperfections, Kodak Portra` |
| 温馨家庭感 | 生活痕迹 + 暖侧光 | 有人气的厨房、午后窗光、柔阴影、轻微杂乱 | `lived-in kitchen, warm afternoon window light, soft shadows, 50mm, natural expressions, slight clutter` |
| 街头真实 | 阴天城市 + 运动模糊 | 阴天漫射光、35mm、背景运动模糊、真实褶皱 | `candid street, overcast urban light, 35mm, motion blur on background, authentic clothing wrinkles` |
| 科幻但不假 | 现实物理 + 真实材质 | 物理正确的光照、粒子、材质、非卡通 | `photorealistic sci-fi, real-world physics lighting and materials, volumetric particles, not cartoonish` |
| 美食诱人 | 微距 + 侧光打质感 | 100mm 微距、侧光突出纹理、蒸汽/水珠、浅景深 | `100mm macro, soft side light highlighting texture, steam and droplets, shallow DOF, appetizing color` |

## 三、完整示范

**用户原话**：「帮我生成一张非常真实的咖啡照片，要有高级感。」

- 明说：主体=咖啡；目标=真实 + 高级
- 可推断：商业/编辑类静物，不是随手拍
- 缺失且**会改画面**：是「饮品」还是「产品包装」？（值得问）
- 缺失但不重要：杯型、桌面材质、咖啡种类（自己定并标注）

**中文版（七块）**

```
1 核心元素：一杯刚做好的拿铁，手工陶杯，杯口细腻拉花
2 动作与环境：无动作；放在深胡桃木桌上，位于一家安静的当代咖啡馆内
3 具体置景：杯壁可见手工釉面不平整，细小气泡，一缕蒸汽；桌面有轻微使用划痕
4 镜头与构图：45 度斜俯，50mm，f/2.8 浅景深，杯体占画面右下三分之二，4:5 竖幅
5 光线：左侧柔和自然窗光，阴影柔和且方向一致，杯沿有一道细高光
6 色彩与质感：暖中性调，木棕 + 奶白 + 陶器土黄；奶泡可见细密气孔
7 风格·后期·约束：高级商业静物摄影，自然色调；不要文字、不要 logo、不要水印
```

**英文版**

```
A freshly prepared latte in a handmade ceramic cup on a dark walnut table inside
a quiet contemporary coffee shop. Visible glaze irregularity and a few tiny
bubbles on the cup, one faint wisp of steam, light scratches on the wood.
Shot at a 45-degree angle with a 50mm lens at f/2.8, shallow depth of field,
cup filling the lower right two-thirds, 4:5 vertical. Soft natural window light
from the left, gentle consistent shadows, a thin highlight along the rim.
Warm neutral palette of walnut brown, cream and clay. Fine foam pores visible.
Premium editorial still-life photography, natural color grading.
No text, no logos, no watermark.
```

## 四、三种「必须问」

| 情形 | 问法 |
|---|---|
| 主体本身没定 | 「主要拍什么？人 / 物 / 场景？」 |
| 用途会改变风格 | 「这张是用在封面、商品页，还是随手发？」 |
| 要求互相冲突 | 「你要「复古」又要「科技感」，这两者会打架 —— 优先哪个？」 |

**不问的**：镜头型号、具体色值、背景小物、光线细微方向 —— 自己定并标注即可。
