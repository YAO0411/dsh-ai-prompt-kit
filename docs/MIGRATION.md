# 迁移说明：从单文件 index.js 到模块化

> 版本 1.0.0 做了一次结构性重构。这份文件记录**行为变化**，方便老用户对照。

## 一、目录结构变了

**旧**（单文件，800 行）

```
ai-prompt-kit/
├─ index.js          全部逻辑
├─ cordis.patch.yml
├─ package.json
├─ locale/
└─ icon.svg
```

**新**（模块化）

```
ai-prompt-kit/
├─ index.js          插件入口，只做注册与编排
├─ lib/
│   ├─ constants.js  所有词表与模式
│   ├─ check.js      自检纯函数
│   ├─ card.js       工坊卡渲染
│   ├─ i18n.js       中英文案
│   ├─ paths.js      路径与越界防护
│   ├─ search.js     分词与检索
│   └─ store.js      样本/草稿/收尾
├─ seed/rules/       初始规则库 12 份
├─ scripts/          库初始化
├─ tests/            19 个单测
└─ docs/
```

## 二、行为变化（有几处是破坏性的）

| 项 | 旧 | 新 | 影响 |
|---|---|---|---|
| **库目录默认值** | 写死 `D:\姚泽霖的文件\AI提示词库` | `~/ai-prompt-library`，可用 `AI_PROMPT_KIT_DIR` 或 `libraryRoot` 覆盖 | ⚠️ 老用户需显式配置，否则会建一个新库 |
| 子目录名 | 中文（`工作区`、`分镜`、`素材`） | 英文（`workspace`、`output`、`material`） | ⚠️ 已有草稿需手动迁移目录名 |
| `promptlib_check` 的 `model` 取值 | 任意文本 | 建议用 `midjourney` / `flux` / `gpt-image` / `sd` / `local` | 旧值仍可用，匹配是宽松包含 |
| 空话词表 | 17 条 | 24 条（新增 `sharp focus`、`insanely detailed`、`大师作品` 等） | 自检会更严 |
| 否定式豁免 | 只处理 `no CGI` 等 6 种 | 扩展到 5 组正则，含 `without retouching` | 减少误报 |
| 自检新增项 | — | `TOO_LONG`（>8000 字符）| 长稿会被判阻断 |
| `promptlib_diag` 输出 | 段落清单 + 卡片是否在 | 增加库路径、四目录文件计数、语言与开关状态 | 更好排查 |
| 卡片内容 | 含项目特有的「散文式」「先图后视频」「反 AI 感硬规则」等 | 精简为通用行为约束，细节移到 `seed/rules/` | 卡片从 4776 B 降到约 5 KB（内容重排） |

## 三、新增能力

- **`lib/i18n.js`**：`config.language: 'en'` 可切换卡片与自检文案
- **`config.maxSearchFiles`**：大库检索提速
- **`resolveLibraryRoot`**：三级回落（配置 → 环境变量 → home）
- **`scripts/init-library.mjs`**：一条命令把 seed 规则铺进新库，`--force` 才覆盖
- **19 个单测**：`npm test` 可直接跑
- **路径越界防护加强**：`a/../../x` 这类也能拦住

## 四、老用户升级步骤

```bash
# 1. 备份现有库
mv "D:\姚泽霖的文件\AI提示词库" "D:\姚泽霖的文件\AI提示词库.bak"

# 2. 建新库
node scripts/init-library.mjs "D:\姚泽霖的文件\AI提示词库"

# 3. 把自定义规则与样本搬进去
#    rules/     ← 直接拷
#    samples/   ← 直接拷
#    工作区/     → workspace/
#    分镜/       → output/
#    素材/       → material/

# 4. 在 profile 的 cordis.patch.yml 里指定路径
#    - id: ai-prompt-kit
#      config:
#        libraryRoot: 'D:\姚泽霖的文件\AI提示词库'

# 5. 关掉插件开关再打开（或重启 DSH）
```

## 五、没有变的

- 八个工具的名字与参数语义
- `promptlib_finalize` 默认只预演、必须 `confirm: true` 才删
- 七块结构、两种模式、版本纪律的核心规则
- 删除范围只在任务工作区内

## 六、为什么这样重构

1. **可测试**：`check.js` 拆成纯函数后能单测，19 个用例覆盖了主要分支
2. **可改**：词表集中在 `constants.js`，社区改规则不用碰逻辑
3. **可移植**：默认路径改成 home 下的英文目录，不再是某台机器的绝对路径
4. **可读**：800 行拆成 7 个模块，每个职责单一
