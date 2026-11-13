/**
 * ai-prompt-kit — 提示词工坊（DSH / Cordis Host 插件，无界面）
 *
 * 做三件事：
 * 1) 把一张「工坊卡」注入系统提示，使每个新会话天然具备两种能力：
 *    A. 一句大纲 → 可直接复制的图片/视频/分镜提示词（中英双版）
 *    B. 说不清的需求 → 结构化任务提示词
 * 2) 提供知识库工具：列目录、读文件、查重检索。
 * 3) 提供样本与版本工具：把「提示词 → 实际效果」落库、草稿分版、任务收尾只留最终版。
 *
 * 库默认位于 `~/ai-prompt-library`，由 config.libraryRoot 覆盖。
 * @module ai-prompt-kit
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderCard } from './lib/card.js'
import { checkPrompt, formatCheckResult } from './lib/check.js'
import { t } from './lib/i18n.js'
import {
  ensureLibrary,
  listFiles,
  readWindowed,
  resolveLibraryRoot,
  safeJoin,
  toPosixRelative,
} from './lib/paths.js'
import { bestChunkMatch, tokenize } from './lib/search.js'
import { finalizeTask, libraryStats, saveSample, writeDraft } from './lib/store.js'
import { DIRS } from './lib/constants.js'

export const name = 'ai-prompt-kit'
export const inject = ['systemPrompt', 'tools']

/** 卡片段的固定名称，用于幂等注册与诊断。 */
const CARD_SECTION = 'ai-prompt-kit:card'

/** 卡片段顺序：在工具说明（1000–3000）之后、结构化输出（9900）之前。 */
const CARD_ORDER = 4200

/** 卡片体积上限（字符）。超了说明卡写胖了，应挪进 rules/。 */
const CARD_SOFT_LIMIT = 8000

/**
 * 行配置说明（仅作文档用途，不导出为 Cordis Config schema）。
 *
 * 这里刻意**不导出 `Config`**：本插件在 profile 里以链接方式安装，
 * 环境中不保证能解析 `@deepseek-ai/schemastery`；导出普通对象会让
 * Loader 误当成 schema 调用 `.validate()` 而整个条目激活失败。
 * 配置改为在 apply() 内用 {@link normalizeConfig} 自行归一化——
 * 未知字段忽略、类型不对回落默认值，效果等价且零依赖。
 *
 * 可用字段：
 * - `libraryRoot`  知识库根目录绝对路径。省略时读环境变量 AI_PROMPT_KIT_DIR，再回落 ~/ai-prompt-library
 * - `injectRules`  是否把工坊卡注入系统提示，默认 true
 * - `language`     卡片与自检文案语言：zh / en，默认 zh
 * - `maxSearchFiles` 单次检索最多扫描文件数，默认 400，范围 20–5000
 *
 * @type {{libraryRoot: string, injectRules: boolean, language: 'zh'|'en', maxSearchFiles: number}}
 */
export const CONFIG_SHAPE = Object.freeze({
  libraryRoot: 'string (absolute path, optional)',
  injectRules: 'boolean, default true',
  language: "'zh' | 'en', default 'zh'",
  maxSearchFiles: 'integer 20–5000, default 400',
})

/**
 * 归一化行配置。
 * @param {unknown} raw 原始 config
 * @returns {{libraryRoot: string, injectRules: boolean, language: 'zh'|'en', maxSearchFiles: number}} 归一化结果
 */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const language = String(source.language ?? 'zh').toLowerCase() === 'en' ? 'en' : 'zh'
  const maxSearchFiles = Number.isFinite(source.maxSearchFiles)
    ? Math.max(20, Math.min(Number(source.maxSearchFiles), 5000))
    : 400
  return {
    libraryRoot: resolveLibraryRoot(source.libraryRoot),
    injectRules: source.injectRules !== false,
    language,
    maxSearchFiles,
  }
}

/**
 * 把工坊卡注册为系统提示段。
 *
 * 只在本插件 ctx 上注册时，该段落落在插件作用域内，委派出的子会话可能看不到；
 * 因此若 `systemPrompt` 服务带着宿主 ctx，也一并注册（与社区插件的通行做法一致）。
 * @param {any} ctx 插件上下文
 * @param {{name: string, order: number, interpolate: false, text: string}} section 段定义
 * @returns {boolean} 是否至少注册成功一处
 */
export function registerSection(ctx, section) {
  const hosts = []
  const push = (host) => {
    if (!host || hosts.includes(host)) return
    try {
      if (host.systemPrompt && typeof host.systemPrompt.section === 'function') hosts.push(host)
    } catch {
      /* 代理未注入时点属性会抛 */
    }
  }
  try {
    push(ctx?.systemPrompt?.ctx)
  } catch {
    /* 同上 */
  }
  push(ctx)

  const disposers = []
  let registered = false
  let lastError = null
  for (const host of hosts) {
    try {
      const dispose = host.systemPrompt.section(section)
      registered = true
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      const message = String(error && error.message ? error.message : error)
      if (message.includes('already registered')) registered = true
      else lastError = error
    }
  }
  if (!registered && lastError) throw lastError
  if (disposers.length > 0 && typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          /* 卸载期忽略 */
        }
      }
    }, 'ai-prompt-kit.card')
  }
  return registered
}

/**
 * 统一的文本型工具输出定义。
 * @param {string} fallback 渲染兜底文本
 * @returns {{schema: object, render: (args: unknown, value: unknown) => Array<{type: string, text: string}>}} 输出定义
 */
function textOutput(fallback) {
  return {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { text: { type: 'string' } },
    },
    render: (_args, value) => [{ type: 'text', text: String(value?.text ?? fallback) }],
  }
}

/**
 * 把异常收敛成一行文本。
 * @param {unknown} error 异常
 * @returns {string} 消息
 */
function errorText(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 装载插件。
 * @param {any} ctx Cordis 上下文
 * @param {unknown} config 行配置
 */
export function apply(ctx, config) {
  const cfg = normalizeConfig(config)
  const root = ensureLibrary(cfg.libraryRoot)
  const lang = cfg.language

  if (cfg.injectRules) {
    const card = renderCard({ libraryRoot: root, language: lang })
    if (card.length > CARD_SOFT_LIMIT) {
      // 不阻断：卡片过长只是浪费上下文，不该让整个插件失效。
      try {
        ctx.logger?.('ai-prompt-kit')?.warn?.(
          `card is ${card.length} chars, over the ${CARD_SOFT_LIMIT} soft limit; move detail into rules/`,
        )
      } catch {
        /* 无 logger 时安静跳过 */
      }
    }
    registerSection(ctx, {
      name: CARD_SECTION,
      order: CARD_ORDER,
      interpolate: false,
      text: card,
    })
  }

  if (!ctx.tools || typeof ctx.tools.register !== 'function') return

  // ── 1. 列目录 ─────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_list',
    description:
      '列出提示词库里的规则、样本与草稿（相对路径、大小、首行标题）。写提示词前先看有哪些题材模板和样本可用。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        section: {
          type: 'string',
          description: `限定子目录，通常是 ${Object.values(DIRS).join(' / ')}；省略则全列。`,
        },
      },
    },
    output: textOutput(t(lang, 'ui', 'emptyLibrary')),
    async execute(args) {
      try {
        const section = typeof args?.section === 'string' ? args.section.trim() : ''
        const dir = section ? safeJoin(root, section) : root
        const files = listFiles(root, { dir })
        if (files.length === 0) {
          return { text: `${t(lang, 'ui', 'emptyLibrary')}: ${toPosixRelative(root, dir) || '.'}` }
        }
        const lines = files.map((file) => `- ${file.path}｜${file.size} B｜${file.title || '(no title)'}`)
        return {
          text: `${t(lang, 'ui', 'libraryRoot')}: ${root}\n${files.length} ${t(lang, 'ui', 'fileCount')}:\n${lines.join('\n')}`,
        }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'listFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 2. 读文件 ─────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_read',
    description: '读取库里的某份规则、样本或草稿，可分段读。path 用 promptlib_list 返回的相对路径。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        path: { type: 'string', description: `相对库根目录的路径，例如 ${DIRS.rules}/20_topics.md。` },
        offset: { type: 'integer', description: '起始行，1 起；默认 1。' },
        limit: { type: 'integer', description: '读取行数，默认 400，上限 1200。' },
      },
      required: ['path'],
    },
    output: textOutput(t(lang, 'ui', 'readFailed')),
    async execute(args) {
      try {
        const file = safeJoin(root, args?.path)
        if (!existsSync(file)) return { text: `${t(lang, 'ui', 'noSuchFile')}: ${args?.path}` }
        const window = readWindowed(file, args?.offset, args?.limit)
        const tail = window.truncated
          ? `\n\n[${t(lang, 'ui', 'truncatedHint', { total: window.totalLines })}]`
          : ''
        return { text: `${args?.path} (${window.totalLines} lines)\n${window.text}${tail}` }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'readFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 3. 自检 ───────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_check',
    description:
      '交付前自检一份提示词：空话词、缺镜头、缺光线、纪实缺反 CG 句、视频说话/转头、竖屏没写画幅、模型语法误用、长度异常。返回分数与逐条问题。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        prompt: { type: 'string', description: '待检查的提示词正文；中英混排或单边均可。' },
        model: {
          type: 'string',
          description: '目标模型，例如 midjourney / flux / gpt-image / sd；未指定则留空，此时出现专属参数会被判为阻断。',
        },
      },
      required: ['prompt'],
    },
    output: textOutput(t(lang, 'ui', 'checkNotRun')),
    async execute(args) {
      const result = checkPrompt({ prompt: args?.prompt, model: args?.model, language: lang })
      return { text: formatCheckResult(result, lang) }
    },
  })

  // ── 4. 存样本 ─────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_save',
    description:
      '把一次「提示词 → 实际效果」的对照落库，供以后复用与改规则。也用于记录用户对生成结果的修正意见。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: {
          type: 'string',
          enum: ['sample', 'correction', 'rule'],
          description: 'sample=完整对照样本；correction=对已有结果的修正；rule=要新增或修改的规则。',
        },
        brief: { type: 'string', description: '用户原始需求或大纲（尽量原话）。' },
        category: { type: 'string', description: '题材或任务类别，例如 portrait / product / historical / storyboard。' },
        promptZh: { type: 'string', description: '中文提示词。' },
        promptEn: { type: 'string', description: '英文提示词。' },
        effect: { type: 'string', description: '实际效果：成了什么、崩了什么，尽量具体到构图/光/皮肤/手/文字。' },
        verdict: {
          type: 'string',
          enum: ['good', 'partial', 'bad', 'unverified'],
          description: '效果评价；没真正出过图就用 unverified。',
        },
        model: { type: 'string', description: '使用的模型与版本，可留空。' },
        tags: { type: 'string', description: '逗号分隔的标签。' },
      },
      required: ['kind', 'brief'],
    },
    output: textOutput(t(lang, 'ui', 'saveFailed')),
    async execute(args) {
      try {
        const result = saveSample({
          root,
          kind: args?.kind,
          brief: args?.brief,
          category: args?.category,
          promptZh: args?.promptZh,
          promptEn: args?.promptEn,
          effect: args?.effect,
          verdict: args?.verdict,
          model: args?.model,
          tags: String(args?.tags ?? '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
        return {
          text: `${t(lang, 'ui', 'saved')}: ${result.relativePath} (+ ${result.indexPath})`,
        }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'saveFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 5. 查重检索 ───────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_search',
    description:
      '在规则与样本里检索相似内容，用于查重：避免把同一个画面模板重复交付。返回相关度与命中片段。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: '待查的提示词或需求描述。' },
        top: { type: 'integer', description: '返回条数，默认 5，上限 20。' },
        section: { type: 'string', description: `限定子目录，例如 ${DIRS.rules}；省略则全库。` },
      },
      required: ['query'],
    },
    output: textOutput(t(lang, 'ui', 'searchNone')),
    async execute(args) {
      try {
        const queryTokens = tokenize(args?.query)
        if (queryTokens.size === 0) return { text: t(lang, 'ui', 'searchNone') }
        const top = Math.max(1, Math.min(Number(args?.top) || 5, 20))
        const section = typeof args?.section === 'string' ? args.section.trim() : ''
        const dir = section ? safeJoin(root, section) : root
        const files = listFiles(root, { dir, withTitle: false })
          .filter((file) => file.path.endsWith('.md') || file.path.endsWith('.jsonl'))
          .slice(0, cfg.maxSearchFiles)

        const scored = []
        for (const file of files) {
          if (file.size > 512 * 1024) continue
          let content = ''
          try {
            content = readFileSync(file.absolute, 'utf8')
          } catch {
            continue
          }
          const best = bestChunkMatch(queryTokens, content.slice(0, 200_000))
          if (best.score > 0.08) scored.push({ ...file, score: best.score, chunk: best.chunk })
        }
        scored.sort((a, b) => b.score - a.score)
        const picked = scored.slice(0, top)
        if (picked.length === 0) return { text: t(lang, 'ui', 'searchNone') }
        return {
          text: `按相关度排序（≥0.55 可能重复，需换角度；0.25–0.55 可参考）：\n${picked
            .map((item) => `- ${item.score.toFixed(2)}｜${item.path}\n  命中片段：${item.chunk}`)
            .join('\n')}`,
        }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'searchFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 6. 写草稿 ─────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_draft',
    description:
      '把一版草稿写进任务工作区（workspace/<任务名>/v1.md、v2.md…）。同一任务反复改版必须用同一任务名，方便最后一次性清理；不要把草稿散落到 output/ 或库外。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task: { type: 'string', description: '任务名，同一任务全程不变。' },
        content: { type: 'string', description: '本版完整内容（含中文版与英文版）。' },
        note: { type: 'string', description: '这一版改了什么，一句话；可留空。' },
      },
      required: ['task', 'content'],
    },
    output: textOutput(t(lang, 'ui', 'draftFailed')),
    async execute(args) {
      try {
        if (!String(args?.task ?? '').trim()) return { text: t(lang, 'ui', 'draftMissingTask') }
        const result = writeDraft({ root, task: args.task, content: args.content, note: args.note })
        return { text: t(lang, 'ui', 'draftOk', { path: result.relativePath, version: result.version }) }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'draftFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 7. 任务收尾 ───────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_finalize',
    description:
      '任务收尾：只保留最终版，删除其余中间版本。默认只预演（列出将删哪些文件），用户明确同意后才传 confirm=true。删除范围仅限该任务自己的工作区，不碰 rules/、samples/、output/。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task: { type: 'string', description: '任务名，必须与 promptlib_draft 用过的一致。' },
        keep: { type: 'string', description: '要保留的文件名，例如 v3.md；省略则自动取编号最大的一版。' },
        confirm: { type: 'boolean', description: '是否真的删除。false 或省略 = 只预演。' },
        promote: { type: 'boolean', description: `是否把最终版另存一份到 ${DIRS.output}/<任务名>.md 作为成品归档。默认 true。` },
      },
      required: ['task'],
    },
    output: textOutput(t(lang, 'ui', 'finalizeFailed')),
    async execute(args) {
      try {
        if (!String(args?.task ?? '').trim()) return { text: t(lang, 'ui', 'finalizeMissingTask') }
        const result = finalizeTask({
          root,
          task: args.task,
          keep: args.keep,
          confirm: args?.confirm === true,
          promote: args?.promote,
        })

        if (result.status === 'no-workspace') {
          return { text: t(lang, 'ui', 'finalizeNoWorkspace', { dir: result.dir }) }
        }
        if (result.status === 'no-versions') {
          return { text: t(lang, 'ui', 'finalizeNoVersions', { files: result.files.join(', ') || '-' }) }
        }
        if (result.status === 'no-keep-file') {
          return { text: t(lang, 'ui', 'finalizeNoKeep', { name: result.name, names: result.names.join(', ') }) }
        }
        if (result.status === 'dry-run') {
          return {
            text: [
              t(lang, 'ui', 'finalizeDryRun', { task: args.task }),
              t(lang, 'ui', 'finalizeKeep', { name: result.keep }),
              result.doomed.length === 0
                ? t(lang, 'ui', 'finalizeNothingToDelete')
                : t(lang, 'ui', 'finalizeWillDelete', { count: result.doomed.length, names: result.doomed.join(', ') }),
              t(lang, 'ui', 'finalizeConfirmHint'),
            ].join('\n'),
          }
        }

        const lines = [
          t(lang, 'ui', 'finalizeDone', { task: args.task }),
          t(lang, 'ui', 'finalizeKeep', { name: result.keep }),
          t(lang, 'ui', 'finalizeDeleted', {
            count: result.removed.length,
            named: result.removed.length ? `: ${result.removed.join(', ')}` : '',
          }),
        ]
        if (result.failed.length > 0) {
          lines.push(
            t(lang, 'ui', 'finalizeFailedDelete', {
              count: result.failed.length,
              names: result.failed.map((item) => `${item.name}(${item.reason})`).join(', '),
            }),
          )
        }
        if (result.promoted) lines.push(t(lang, 'ui', 'finalizePromoted', { path: result.promoted }))
        if (result.promoteError) lines.push(t(lang, 'ui', 'finalizePromoteFailed', { reason: result.promoteError }))
        return { text: lines.join('\n') }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'finalizeFailed')}: ${errorText(error)}` }
      }
    },
  })

  // ── 8. 诊断 ───────────────────────────────────────────────
  ctx.tools.register({
    name: 'promptlib_diag',
    description:
      '诊断：报告库路径、文件计数、工坊卡是否真的进了本次系统提示，并列出提示段清单。安装后排查「插件装了但没生效」时用。',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: textOutput(t(lang, 'ui', 'diagFailed')),
    async execute(_args, exec) {
      try {
        const stats = libraryStats(root)
        const lines = [
          `${t(lang, 'ui', 'libraryRoot')}: ${root}`,
          `rules=${stats.rules} samples=${stats.samples} workspace=${stats.workspace} output=${stats.output}`,
          `language=${lang} injectRules=${cfg.injectRules}`,
        ]
        if (!ctx.systemPrompt || typeof ctx.systemPrompt.assemble !== 'function') {
          lines.push('systemPrompt service unavailable: card state unknown')
          return { text: lines.join('\n') }
        }
        const assembly = await ctx.systemPrompt.assemble({ scope: exec?.agent })
        const sections = Array.isArray(assembly?.sections) ? assembly.sections : []
        const cardFound = sections.some((section) => String(section?.name ?? '') === CARD_SECTION)
        lines.push(`card section "${CARD_SECTION}": ${cardFound ? 'present' : 'absent'} (${sections.length} sections total)`)
        lines.push(...sections.map((section) => `  - ${section?.name} (${typeof section?.text === 'string' ? section.text.length : 0} B)`))
        return { text: lines.join('\n') }
      } catch (error) {
        return { text: `${t(lang, 'ui', 'diagFailed')}: ${errorText(error)}` }
      }
    },
  })
}

export { checkPrompt, renderCard, CARD_SECTION }
