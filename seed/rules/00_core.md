# 00 · 核心原则

> 这十条是所有题材共用的底层规则。改词表请改 `lib/constants.js`；改这里只影响模型读到的文字。

## 一、一句话原则

**用「看得见的东西」描述画面，不用「听起来很厉害」的词形容画面。**
提示词质量不等于长度。1～3 个清晰句子常常胜过一段形容词墙（A，OpenAI / Midjourney / BFL / Google 四家一致）。

## 二、十条硬规则

| # | 规则 | 依据 |
|---|---|---|
| 1 | **主体放最前**，越靠前的词权重越高 | A（Midjourney / Stability）、B（BFL） |
| 2 | **主体写具体**：数量、年龄、职业、服装、姿态、与环境的关系 | A |
| 3 | **数量写数字**：「三只猫」优于「猫」 | A（Midjourney） |
| 4 | **不写情绪词，写可见特征**：材质、颜色、光线、媒介、纹理 | A（OpenAI） |
| 5 | **一个提示词里主体尽量少**；多主体必须写清位置与相互关系 | D |
| 6 | **光线要写四件**：数量 + 方向 + 软硬 + 阴影。只写「影室光」「自然光」等于没写 | A/B/C |
| 7 | **镜头词是「外观线索」，不是物理模拟**，不保证焦段真的被遵守 | A（OpenAI 明确说明） |
| 8 | **迭代时一次只改一个变量** | A（OpenAI / Google） |
| 9 | **不要无限加长**：复杂场景才展开细节，简单需求保持简洁 | A（多家） |
| 10 | **否定写法按模型区分**：有的支持负面提示词字段，有的必须改写成正向状态 | 见 `30_model_syntax.md` |

## 三、必须避免的空话词

以下词单独使用时常导致塑料感、CG 感、过度锐化：

```
8K, 4K, ultra detailed, hyperrealistic, masterpiece, best quality,
award-winning, highly detailed, perfect skin, flawless, airbrushed,
CGI, 3D render, oversmoothed, beauty filter
```

**替代做法**：换成可见的具体信息 ——
`natural skin texture with visible pores and fine lines`、
`fabric weave visible, slight wrinkles`、
`subtle specular reflections, faint dust`、
`slight motion blur`、`stray hair`、`fine film grain`。

> ⚠️ **不要用品牌胶片型号换颗粒**（2026-11-13 实测）：
> 写 `Kodak Portra 400 film grain`，模型会画出片基边框和 "KODAK PORTRA 400" 印刷文字。
> 品牌型号是强先验，连带出包装、文字、边框。改写成属性：
> `fine film grain, warm neutral color balance` / `tungsten-balanced night grade` / `coarse visible grain`。

> 注意区分：**否定式出现时不算空话**。`no CGI`、`no beauty retouching`、`无 CG 感` 都是主动排除，
> 属良性约束。`promptlib_check` 已按此区分处理。

## 四、真实感从哪来（可写的具体特征）

- 皮肤：毛孔、细纹、日晒质感、细绒毛；**明确写「不美化、不重度修图」**
- 织物：可见织纹、轻微褶皱、自然垂坠
- 金属 / 玻璃 / 陶瓷：柔和镜面高光、准确折射、极少量指纹或灰尘
- 环境：接触处的阴影（手与物体、脚与地面）、与光源方向一致的阴影、背景里的日常杂物
- 构图：不必完美居中，允许轻微不对称
- 主动排除电影化处理：不要电影海报式打光、不要戏剧性调色、不要风格化构图

**纹理有天花板**：主体本身已很粗糙时（`weathered face` + 高龄劳动者），
再堆 `pore-level / sun damage` 不会更真，只会过冲成「核桃壳」。
先判断底子，再决定要不要加强。

## 五、色温写法

裸写 Kelvin 数值常被模型忽略，必须配描述性后缀：

| 错 | 对 |
|---|---|
| `2700K` | `2700K soft incandescent warm white` |
| `3000K` | `3000K halogen warm white` |
| `6000K` | `6000K cool daylight` |

多光源要分层写，每层给色温 + 位置：

```
recessed spotlights at 2700K soft incandescent warm white on the artworks,
3000K halogen wall wash on the far wall,
concealed cove indirect glow along the ceiling
```

## 六、缺信息时怎么办（三级区分，不许混）

1. **用户明说的** —— 原样保留，不许改。
2. **可推断的** —— 可以补，但要在输出里标明「这是我补的」。
3. **会显著改变画面的** —— **必须先问**，且一次只问最关键的 1～2 个，不甩问卷。

判断标准：**换个答案画面会完全不同 → 问；只是细节丰满度 → 自己补并标注。**
禁止把推测伪装成用户的要求。

## 七、绝对不做

- 不承诺「一定生成出某效果」——图像模型本身有随机性
- 不把一个模型的专属参数塞进另一个模型
- 不复制受版权保护的原始提示词冒充自己的
