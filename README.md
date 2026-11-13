# ai-prompt-kit · 提示词工坊

> 一个给 **DeepSeek Harness（DSH / Cordis）** 用的插件，干两件同等重要的事：
> **① 把说不清的需求变成可执行的提示词**（任务、分析、计划 → 七段式结构）
> **② 把一句话画面变成可复制的提示词**（图片 / 视频 / 分镜 → 中英双版）
> 自带规则库、样本记忆、交付前自检、版本收尾。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-38%20passing-brightgreen.svg)](./tests)
[![node](https://img.shields.io/badge/node-%3E%3D18-informational.svg)](./package.json)

---

## 目录

- [它解决什么问题](#它解决什么问题)
- [安装](#安装)
- [快速上手](#快速上手)
- [两种模式](#两种模式)
- [八个工具](#八个工具)
- [知识库结构](#知识库结构)
- [配置](#配置)
- [工作原理](#工作原理)
- [样本记忆怎么让插件变准](#样本记忆怎么让插件变准)
- [版本纪律](#版本纪律)
- [自检规则清单](#自检规则清单)
- [设计取舍](#设计取舍)
- [已知限制](#已知限制)
- [开发](#开发)
- [常见问题](#常见问题)
- [许可](#许可)

---

## 它解决什么问题

用 AI 干活——不管是出图还是让它处理任务——真正的瓶颈都不是「想不出词」，而是这三件事：

1. **写出来的提示词看着很专业，结果却很塑料。**
   出图时满屏 `8K, masterpiece, ultra realistic`，皮肤像蜡、光线没有方向；
   交给 AI 干活时满屏「详细一点」「写得专业些」，交回来的东西无法验收。
2. **每次都要从零开始写。**
   上次调好的那套人像写法、那份周报结构，一周后记不起来了。
3. **改好几版之后，电脑里堆着一堆半成品。**
   最后连哪一版是能用的都分不清。

这个插件把三件事都固化下来：

| 问题 | 解法 |
|---|---|
| 提示词看着专业、结果不对 | **模式 A** 七段式结构 + **模式 B** 七块结构 + **交付前自检**（20 项可机检规则） |
| 每次从零开始 | **本地规则库** + **样本记忆**：写之前先检索同类，写完把效果落库 |
| 版本混乱 | **草稿分版** + **任务收尾**：一个任务只留最终版，删中间版前必须问你 |

---

## 安装

### 前置

- 一个能跑 DSH 的环境（本插件是 Host 插件，无界面）
- Node.js ≥ 18

### 方式一：指向本地目录（开发/自用）

```bash
# 1. 把仓库放到任意位置，例如 D:\code\ai-prompt-kit
#    然后在 DSH profile 的 package.json 里登记：
#    "dependencies": { "ai-prompt-kit": "link:D:\\code\\ai-prompt-kit" }
#    "dsh": { "profile": { "bundles": [ ..., "ai-prompt-kit" ] } }
```

### 方式二：从 npm 安装

```bash
dsh plugin --profile <你的 profile> add ai-prompt-kit
```

### 方式三：在本仓库内直接装

```bash
# 指向本目录即可，DSH 的插件管理器会建立链接
# 参数是绝对路径
```

安装完成后：

1. 打开插件管理面板，应该能看到 **ai-prompt-kit** 一行，带开关
2. 初始化知识库：

```bash
node scripts/init-library.mjs                 # 默认 ~/ai-prompt-library（含示例图片，约 7 MB）
node scripts/init-library.mjs D:/mylib        # 指定目录
node scripts/init-library.mjs D:/mylib --no-samples   # 只铺规则，不复制示例图片（约 47 KB）
```

> `--no-samples` 会用在你不想把 7 MB 示例图放进库的场合。
> 示例图片是一份已证实样本的原始证据（见 `seed/samples/pore-level-2026-11-13/`），不需要时可以跳过。

3. **新建一个对话**（系统提示在会话开始时组装，老会话不会自动带上）

验证是否生效：

```
promptlib_diag()
```

应当看到类似：

```
library: C:\Users\you\ai-prompt-library
rules=12 samples=0 workspace=0 output=0
language=zh injectRules=true
card section "ai-prompt-kit:card": present (25 sections total)
```

`card section ... present` 是关键——它说明工坊卡真的进了本次会话的系统提示。

---

## 快速上手

### 模式 A · 把说不清的需求变成清晰提示词

```
你：帮我弄个东西，关于我们店里新品的介绍
```

插件会：

1. 判为「模式 A」
2. 先问 1–2 个关键问题（**交付物是什么类型？给谁看？**），不脑补
3. 产出**七段式**任务提示词：角色 / 目标 / 输入 / 输出格式 / 硬约束 / 未知处理 / 验收标准
4. 按 `rules/45_task_prompt.md` 检查七段是否齐全

### 模式 B · 出一张图

```
你：我想要一张海边真实人物肖像，不要摆拍感
```

插件会：

1. 判为「模式 B」
2. 先当导演问「拍哪一刻」，必要时给三种拍法
3. 检索库里的人像母版
4. 输出**中文七块 + 英文成段**两版
5. 交付前跑 `promptlib_check`

### 模式 B · 出一段视频

```
你：拍一段 8 秒的短视频，木匠在工作台前打磨木料
```

插件会先按 `80_still_then_video.md` 问你：**先出静帧还是直接图生视频？**
（默认先出静帧——直接文生视频，模型每帧都在重新猜手指和毛发。）

### 说不太清的需求

```
你：帮我弄个东西，关于我们店里新品的介绍
```

被判为「模式 B」，插件会先问 1–2 个关键问题（交付物类型？给谁看？），
然后产出一份七段式任务提示词：角色 / 目标 / 输入 / 输出格式 / 硬约束 / 未知处理 / 验收标准。

---

## 两种模式（同等重要，各占一半）

> 这两个方向**不是主次关系**。插件不假设你要出图——先判你给的是「画面构思」还是「一件要干的事」。

| | **模式 A · 把需求变成可执行的提示词** | **模式 B · 把画面变成可复制的提示词** |
|---|---|---|
| 输入 | 任务、要求、想法（没有可执行结构） | 画面、镜头、场景 |
| 典型原话 | 「帮我弄个新品介绍」「做个学习计划」「分析这份数据」 | 「海边真实人像，不要摆拍感」「8 秒木匠打磨木料」 |
| 输出 | **七段式**任务提示词 | **中文七块 + 英文成段**双版 |
| 是否代替做任务 | **不**，只产提示词 | 产出提示词 |
| 详细规则 | `rules/45_task_prompt.md` | `rules/20_topics.md`、`25_director_view.md` |

### 模式 A 的七段式（缺一段即不合格）

| # | 段 | 写什么 |
|---|---|---|
| 1 | 角色 | 领域 + 经验层级 + 立场 + 不做什么 |
| 2 | 目标 | 交付什么、给谁用、用来干什么 |
| 3 | 输入 | 用户会给什么、什么格式、哪些字段是权威 |
| 4 | 输出格式 | 结构 / 长度 / 语言 / 必须包含哪些字段 |
| 5 | 硬约束 | 必须做到 + **绝对不许做**（禁止项要可检查） |
| 6 | 未知处理 | 缺信息时：先问 / 标注假设 / 直接选默认 |
| 7 | 验收标准 | 3–5 条可逐项打勾的合格线 |

**三条铁律**：
1. 不清楚就先问，一次只问最关键的 1–2 个，不甩问卷
2. 只产提示词，不替用户做任务（除非他明说要成品）
3. 禁止项要可检查——写「不许出现具体人名」而不是「注意隐私」

### 模式 B 的七块

| # | 块 | 写什么 |
|---|---|---|
| 1 | 核心元素 | 数量 + 年龄/身份 + 服装 + 关键特征 + 手中物 |
| 2 | 动作与环境 | 正在做什么 + 视线 + 空间关系 + 地点时间天气 |
| 3 | 具体置景 | 3–5 个看得见的实物 + 表面状态 |
| 4 | 镜头与构图 | 景别 + 机位 + 焦段 + 光圈/景深 + 主体位置 + 画幅 |
| 5 | 光线 | 光源 + 数量 + 方向 + 软硬 + 阴影 |
| 6 | 色彩与质感 | 3 主色 + 材质纹理 + 自然瑕疵 |
| 7 | 风格·后期·约束 | 风格定位 + 后期特征 + 必须保留 / 不许出现 |

**至少 1、2、4、5 块要有实质内容。** 简单需求 3 块就够，不必填满。

---

## 八个工具

| 工具 | 作用 | 幂等 |
|---|---|---|
| `promptlib_list` | 列出库里的规则 / 样本 / 草稿 | ✅ |
| `promptlib_read` | 读某份文件，支持分段（`offset` / `limit`） | ✅ |
| `promptlib_check` | 交付前自检，返回 0–100 分 + 逐条问题 | ✅ |
| `promptlib_search` | 查重检索，返回相关度 + 命中片段 | ✅ |
| `promptlib_save` | 把「提示词 → 实际效果」落库 | ⚠️ 追加写 |
| `promptlib_draft` | 写一版草稿（`v1.md`、`v2.md`…） | ⚠️ 追加写 |
| `promptlib_finalize` | 收尾：只留最终版，删中间版 | ⚠️ **默认只预演** |
| `promptlib_diag` | 诊断：库路径、文件计数、卡片是否注入 | ✅ |

### `promptlib_check` 输出示例

```
自检得分：35/100
问题：
- [blocker] FILLER_WORDS: 出现空话关键词：8k, ultra detailed, masterpiece；换成可见的具体描述。
- [high] NO_CAMERA: 缺少镜头信息（焦段/光圈/景别/机位/画幅至少一项）。
- [high] NO_LIGHT: 缺少光线信息（光源/方向/软硬至少一项）。
提示：
- 只有英文：建议补一份中文版便于理解。
- 英文约 9 词，偏短；除非是快速概念（10–30 词可接受），否则补到 80–150 词。
```

### `promptlib_finalize` 默认不删东西

```
【预演，未删除任何文件】任务「舞狮表演」
保留：v3.md
将删除 2 个：v1.md、v2.md
要真正执行，请确认后传 confirm=true。
```

只有显式传 `confirm: true` 才真的删。

---

## 知识库结构

```
~/ai-prompt-library/          # 位置可用配置或环境变量改
├─ rules/                     # 规则库：模型写提示词时照它执行
│   ├─ 00_core.md              十条硬规则、空话词、真实感来源、色温写法
│   ├─ 10_seven_blocks.md      七块结构（唯一标准）+ 中英双版要求
│   ├─ 20_topics.md            10 个题材母版（人像/产品/建筑/历史/分镜…）
│   ├─ 25_director_view.md     导演视角：先想清楚拍哪一刻
│   ├─ 30_model_syntax.md      模型语法禁区（防混用，不做平台适配）
│   ├─ 40_vague_to_precise.md  模糊词映射表（「高级感」→ 具体参数）
│   ├─ 45_task_prompt.md       模式 B 的七段式任务提示词
│   ├─ 50_self_check.md        人工自检清单
│   ├─ 70_version_discipline.md 版本纪律
│   ├─ 80_still_then_video.md  先出静帧再图生视频（六步 + 四处验收）
│   ├─ 85_camera_movement.md   运镜三要素 + 八种运镜语义
│   ├─ 90_essay_style.md       散文式提示词（人文/纪实视频首选）
│   └─ 100_how_to_validate.md  A/B 验证法
├─ samples/                   # 样本库
│   ├─ index.jsonl             每次 promptlib_save 追加一行
│   └─ pore-level-2026-11-13/  已证实样本的完整原始证据（8 张图 + 验证 HTML）
├─ workspace/                 # 草稿（v1.md、v2.md…）
├─ output/                    # 成品（任务收尾后归档）
└─ material/                  # 外部素材存档（可选）
```

> 目录名是英文的，因为要跨平台；**内容语言随意**，中文完全没问题。

### 关于示例样本的体积

`seed/samples/pore-level-2026-11-13/` 包含 8 张原始 JPG 和一份自包含验证 HTML（图片已 base64 内嵌），
合计约 **7 MB**。这是整个发布包里唯一的大文件。

它值得留着：这是本库**第一条经 A/B 对照证实有效的规则**（`pore-level` 皮肤纹理，毛孔明显 A 组 0/4 vs B 组 4/4），
附带完整偏差记录与副作用（纹理会把年龄推高 3–10 岁、品牌胶片型号会画出边框）。
想省体积就用 `--no-samples` 初始化，或直接从发布包里去掉这个目录。

---

## 配置

在 profile 的 `cordis.patch.yml` 里按 id 覆盖：

```yaml
- id: ai-prompt-kit
  config:
    libraryRoot: 'D:\my\prompt-library'
    injectRules: true
    language: zh
    maxSearchFiles: 400
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `libraryRoot` | `~/ai-prompt-library` | 知识库根目录绝对路径 |
| `injectRules` | `true` | 是否把工坊卡注入系统提示。关掉后只剩工具 |
| `language` | `zh` | 卡片与自检文案语言：`zh` / `en` |
| `maxSearchFiles` | `400` | 单次检索最多扫描文件数（大库提速） |

也可以用环境变量 `AI_PROMPT_KIT_DIR` 指定库位置——这样同一份配置在任何机器上都能用。

---

## 工作原理

```
┌─────────────────────────────────────────────┐
│ 系统提示组装（每个会话开始时）                │
│   └─ ai-prompt-kit:card  ← 工坊卡（约 1.6 K 字符） │
│      内容：身份 / 两种模式 / 铁律 / 版本纪律  │
└─────────────────────────────────────────────┘
                    ↓
        模型按卡片行为约束工作
                    ↓
    需要细节时 → promptlib_read 读 rules/
    要交付时   → promptlib_check 自检
    有反馈时   → promptlib_save 落库
    改多版时   → promptlib_draft → promptlib_finalize
```

**为什么用「注入卡片」而不是纯提示词？**

因为卡片会跟着每个新会话走。你不用每次粘贴一大段 system prompt，
装一次、开新对话，能力就在那儿。

**为什么卡片只有 1.6 K 字符？**

卡片占的是**每一轮**的上下文预算。所以只放「不查也知道该怎么做」的行为约束，
题材细节全部挪进 `rules/`，需要时按需读。

---

## 样本记忆怎么让插件变准

> **先说清楚：这不是训练模型。** 没有微调，没有权重更新。

它做的是**经验累积**：

1. 你出一张图 → 把「提示词 + 实际效果」告诉它
2. `promptlib_save` 落成一条样本
3. 从小结里提炼一条**可复用规则**，写进 `rules/`
4. 下次遇到同类，先 `promptlib_search` 查重，命中就直接复用

效果上会「越用越准」，机制上是**规则库在长经验**，不是模型在变。

### 一条好样本长什么样

```markdown
原始需求：海边真实人物肖像，不要摆拍感

中文提示词：一名三十多岁女人，卷曲赤褐色头发，厚绿色毛衣，坐在海滩上。
自然柔和日光，真实笑容，可见毛孔与细纹，85mm 人像镜头，浅景深。

英文提示词：A photorealistic candid portrait of a middle-aged woman with
curly auburn hair, wearing a thick green sweater, sitting on a beach.
Natural soft daylight, genuine joyful expression, realistic skin texture,
visible pores and fine lines, 85mm portrait lens, shallow depth of field,
authentic documentary photography, natural color grading.

模型：FLUX.1 dev

实际效果：
- 成了：皮肤质感出来了，不是塑料脸；浅景深把背景压干净了
- 崩了：光从画面右侧来（没指定方向，属预期内）；头发边缘和背景糊在一起

结论：想控制光向必须显式写 from camera left，否则模型自由决定。
```

**关键在「实际效果」要具体到能复核**：哪块成了、哪块崩了。
写「很好」「有提升」的样本等于没有。

---

## 版本纪律

改了好几版之后，只留最终版。

| 阶段 | 命令 | 结果 |
|---|---|---|
| 写第一版 | `promptlib_draft` | `workspace/<任务>/v1.md` |
| 改版 | `promptlib_draft`（同名） | `v2.md`、`v3.md`… |
| 收尾 | `promptlib_finalize`（不传 confirm） | 预演：列出将删哪些 |
| 确认 | `promptlib_finalize` + `confirm: true` | 真删 + 归档到 `output/` |

**默认不删任何东西。** 必须显式 `confirm: true`。

删除范围硬限制在 `workspace/<任务名>/` 内，且只删形如 `vN.md` 的文件——
`rules/`、`samples/`、`output/` 永不碰，你自己放的其他文件也不会被动。

---

## 自检规则清单

`promptlib_check` 目前检查这些（全部可在 `lib/constants.js` 里改词表）：

| 代码 | 级别 | 说明 |
|---|---|---|
| `EMPTY` | blocker | 提示词为空 |
| `FILLER_WORDS` | blocker | 空话词（排除 `no CGI` 这类否定式） |
| `NO_CAMERA` | high | 缺镜头信息 |
| `NO_LIGHT` | high | 缺光线信息 |
| `NO_ANTI_CG` | high | 纪实题材缺「无 CG 感」收尾句 |
| `VIDEO_SPEECH` | blocker | 视频里写「说话/开口」，模型会真配音 |
| `VIDEO_HEADTURN` | high | 图生视频写「转头」，必然重画脸 |
| `NO_VERTICAL_FRAMING` | blocker | 竖屏需求没写画幅 |
| `MODEL_SYNTAX_NO_MODEL` | blocker | 有模型专属参数但没说用哪个模型 |
| `MODEL_SYNTAX_MISMATCH` | blocker | 参数与模型不匹配 |
| `TOO_LONG` | blocker | 超 8000 字符 |

还有 10 条「提示」级建议（中英单边、字数、主体位置、尘雾守卫等），
全部走 i18n，`language: en` 会输出英文。

---

## 设计取舍

这些是刻意的选择，不是没做完：

| 取舍 | 理由 |
|---|---|
| **不做平台适配** | Midjourney / FLUX / SD 的语法差异以「防混用」形式处理，不自动改写。自动改写会掩盖语法错误 |
| **不做图片分析** | 插件只读文本。图在会话里，换会话就没了；把「实际效果」用文字固定下来才是可复用的 |
| **不自动删文件** | `finalize` 默认预演。删文件是不可逆操作，必须由人确认 |
| **不做向量检索** | 库是给人读的 Markdown，逐段算覆盖率已经够用，且零依赖 |
| **卡片放行为约束，不放题材细节** | 卡片每轮都占上下文；细节按需读 |
| **规则分 A/B/C/D 级** | 官方文档和博主说法不是一回事。把 D 当 A 用是这类工具最大的坑 |

---

## 已知限制

- **不训练模型**：没有微调，只有规则库累积
- **不生成图片**：只产提示词，出图要你自己用别的工具
- **图片进不了库**：插件只读文本，样本的「实际效果」靠文字描述
- **无法验证效果**：规则是否真有效，得你自己出图做 A/B
- **老会话不生效**：系统提示在会话开始时组装，装完插件要开新对话
- **卡片语言**：`language` 影响卡片与自检文案，但 `rules/` 里是文件内容，不受影响

---

## 开发

```bash
# 语法检查
node --check index.js
node --check lib/check.js

# 单元测试（零依赖，node --test）
npm test
# 或
node --test tests/check.test.js

# 初始化一个测试库
node scripts/init-library.mjs "$TEMP/test-lib"
```

### 模块划分

```
index.js          插件入口：apply()、工具注册、配置归一化
lib/constants.js  所有词表与模式（改规则先改这里）
lib/check.js      自检纯函数，可单测，无 I/O
lib/card.js       工坊卡渲染，中英双语
lib/i18n.js       文案表 + t() 插值
lib/paths.js      路径解析与越界防护
lib/search.js     中英文分词 + 分段打分
lib/store.js      样本/草稿/收尾的文件读写
seed/rules/       初始规则库（13 份 Markdown）
scripts/          库初始化脚本
tests/            单元测试
docs/             补充文档
```

### 加一条自检规则

1. 在 `lib/constants.js` 加模式（如 `MY_CHECK_PATTERN`）
2. 在 `lib/check.js` 的 `checkPrompt` 里加判断，`pushIssue('blocker'|'high', 'MY_CODE')`
3. 在 `lib/i18n.js` 的两种语言里加 `MY_CODE` 文案
4. 在 `tests/check.test.js` 加用例

### 加一份题材母版

直接往 `seed/rules/` 写 Markdown，命名 `NN_name.md`。
工坊卡里若需提及，改 `lib/card.js`。

---

## 常见问题

**Q：装了但模型不用它？**
先跑 `promptlib_diag`，看 `card section ... present` 是否为 `present`。
如果 `absent`，说明卡片没进系统提示——检查 `injectRules` 是不是被关了，
并且**开一个新对话**（老会话不会重装）。

**Q：能用在别的 AI 客户端吗？**
代码是 Cordis 插件形态，依赖 DSH 的 `systemPrompt` / `tools` 服务。
但 `lib/check.js`、`lib/search.js`、`seed/rules/` 是纯逻辑与文本，可以单独拿走用。

**Q：为什么库目录是英文名？**
跨平台路径安全。内容语言随便，中文、英文、混排都行。

**Q：我的库很大，会变慢吗？**
`promptlib_search` 有 `maxSearchFiles` 上限（默认 400），
且跳过 512 KB 以上的文件。真的大了就把素材移到 `material/`，检索时用 `section` 限定范围。

**Q：`promptlib_finalize` 会误删我的文件吗？**
只删 `workspace/<任务名>/` 下形如 `vN.md` 的文件。
其他文件、其他目录一律不碰，且默认只预演。

**Q：能改成英文界面吗？**
`config.language: 'en'`，卡片与自检文案会切英文（`seed/rules/` 的内容不翻译）。

---

## 贡献

欢迎 PR。几个约定：

- 改规则词表 → `lib/constants.js`；改行为逻辑 → 对应模块；**不要只改卡片**
- 新增自检规则必须带单测（`tests/check.test.js`）
- 新增规则文档请标可信度（A 官方 / B 转述 / C 第三方 / D 推断）
- 不要提交任何未经实际出图验证的「效果结论」

---

## 许可

[MIT](./LICENSE)

规则库中的方法论部分来自公开资料与个人实践，
标注可信度是为了区分「官方文档」与「经验说法」，沿用请保留标注。
