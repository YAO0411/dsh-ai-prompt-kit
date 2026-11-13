# 10 · 七块结构（唯一标准写法，中英双版）

> 三套常见说法（六层框架 / 通用公式 / 七块）本质是同一件事。这里合并成一套，以后只用它。

## 一、七块

按顺序填，**能填几块填几块，不要求填满**。简单需求 3 块就够，复杂场景才展开到 7 块。

| # | 块名 | 写什么 | 好例子 | 坏例子 |
|---|---|---|---|---|
| 1 | **核心元素** | 数量 + 年龄/身份 + 服装 + 关键识别特征 + 手中物 | 一名三十多岁的女武士，束发，暗红旧战袍，右手握拔出半截的武士刀 | 一个很酷的女人，高级感 |
| 2 | **动作与环境** | 正在做什么 + 视线 + 空间关系 + 地点类型 + 时间天气 | 半蹲于泥泞战场，视线越过刀锋看向画面左前方；身后二十米是列阵的旗兵；阴天正午 | 在战斗 |
| 3 | **具体置景** | 3～5 个能看见的实物 + 表面状态 | 磨损的札甲、沾泥的护腕、断裂的旗杆、被踩烂的草鞋、溅在脸上的血点 | 古代战场，很有气氛 |
| 4 | **镜头与构图** | 景别 + 机位 + 焦段 + 光圈／景深 + 主体位置 + 画幅 | 中近景，低机位仰拍，约 35mm 广角，T2.0 浅景深，主体偏右三分之一，2.35:1 | 电影感构图 |
| 5 | **光线** | 光源类型 + 数量 + 方向 + 软硬 + 阴影与反射 | 阴天顶光为主，左后方一束弱逆光勾轮廓，面部柔和无明显鼻影 | 光线很棒 |
| 6 | **色彩与质感** | 3 个主色 + 明度关系 + 材质纹理 + 自然瑕疵 | 冷青灰为主，铁灰与暗红点缀；皮肤有细汗与血污；布料起球、金属有划痕 | 高级配色 |
| 7 | **风格·后期·约束** | 风格定位 + 后期特征 + 必须保留 / 不许出现 | 历史战争片实拍质感，轻微胶片颗粒与空气透视；不要文字、水印、现代物件 | 8K 超高清，杰作 |

## 二、英文版（直接粘给模型）

**不要逐句翻译中文**，而是按同样顺序压成一段连贯英文，**80～150 词**，用完整句子、不用逗号堆词。

```
[Shot type + subject with concrete identifiers], [doing what, looking where],
in [place + time/weather]. [3-5 visible props and their surface state].
[Camera: lens, aperture, angle, framing, aspect]. [Light: source, direction,
quality, count, shadow behaviour]. [Colour: 3 dominant hues + one accent].
[Texture: skin/fabric/metal specifics + 1-2 imperfections].
[Style anchor + post-processing]. [Constraints: keep X, no Y].
```

示例：

```
A medium close-up of a woman in her thirties, hair tied back, worn dark-red
lamellar armor, a katana half-drawn in her right hand. She is crouched on a
muddy battlefield, eyes tracking past the blade toward frame-left; twenty
meters behind her, banner-bearing infantry hold formation under an overcast
midday sky. Cracked lacquer plates, mud-caked bracers, a snapped banner pole,
trodden straw sandals, flecks of blood on her cheek. Low-angle 35mm lens at
T2.0, shallow depth of field, subject on the right third, 2.35:1.
Overcast top light with a weak rim from back-left; soft, shadowless face.
Cool blue-grey base, iron and dark red accents. Visible sweat, pores and grime
on skin; scuffed metal, pilled cloth. Historical war-film realism, subtle film
grain and atmospheric haze. No text, no watermark, no modern objects.
```

## 三、硬性要求

1. **中文版和英文版都要给**，中文在前、英文在后，两块各自完整、可独立使用。
2. 英文版**不许出现** `8K`、`ultra detailed`、`masterpiece`、`hyperrealistic` 这类空词。
3. 七块里**至少第 1、2、4、5 块必须有实质内容**，缺一块要说明「为什么没写」。
4. 模型专属语法只放在英文版末尾，且只放**该模型支持的**（见 `30_model_syntax.md`）。
5. 长度参考：快速概念 10～30 词，常规 30～80 词，复杂多主体 80～300 词。

## 四、什么时候不用七块

| 场景 | 用什么 |
|---|---|
| 产品、商业、特效、需要精确控光的多主体 | 七块 |
| 人文 / 纪实 / 旅拍类**视频** | 散文式创作阐述（`90_essay_style.md`） |

两种按题材选，**不混用**。

## 五、与旧说法的映射

| 本文七块 | 六层框架 | 通用公式 |
|---|---|---|
| 1 核心元素 | 第一层 主体 | Subject + action |
| 2 动作与环境 | 第二层 动作与场景 | Environment + 2-3 objects |
| 3 具体置景 | 第二层（细化） | Environment + 2-3 objects |
| 4 镜头与构图 | 第三层 构图 | Camera/lens/aperture |
| 5 光线 | 第四层 光线 | Light source/direction/quality |
| 6 色彩与质感 | 第五层 材质与真实感 | Texture/imperfections + Film/grain/color |
| 7 风格·后期·约束 | 第六层 风格与限制 | Technical params |
