/**
 * 提示词自检：纯函数，无 I/O，可直接单测。
 *
 * 设计原则：
 * - 只报「能改的」问题，不报「模型随机性」这类无解项。
 * - 阻断项（blocker）会让分数掉 35，提示项（high）掉 15，
 *   这样 100 分只可能来自「一条都挑不出」的稿子。
 * - 所有文案走 i18n，规则 code 保持语言无关。
 * @module ai-prompt-kit/check
 */

import {
  ATMOSPHERE_BAIT_PATTERN,
  ATMOSPHERE_GUARD_PATTERN,
  CAMERA_HINTS,
  DOCUMENTARY_PATTERN,
  FILLER_WORDS,
  HEAD_TURN_PATTERN,
  LIGHT_HINTS,
  MODEL_SYNTAX,
  NEGATION_PATTERNS,
  ORDINAL_IMAGE_PATTERN,
  SHOT_OPENER_PATTERN,
  SILENCE_GUARD_PATTERN,
  SPEECH_PATTERN,
  VERTICAL_HAVE_PATTERN,
  VERTICAL_WANT_PATTERN,
  VIDEO_TASK_PATTERN,
} from './constants.js'
import { t } from './i18n.js'

const LEVEL_PENALTY = { blocker: 35, high: 15 }
const MAX_PROMPT_CHARS = 8000

/**
 * @typedef {object} CheckIssue
 * @property {'blocker'|'high'} level 严重度
 * @property {string} code 规则代码
 * @property {string} message 面向模型的说明
 */

/**
 * @typedef {object} CheckResult
 * @property {number} score 0–100
 * @property {CheckIssue[]} issues 阻断/高危问题
 * @property {string[]} notes 建议
 * @property {{words: number, hasCjk: boolean, hasLatin: boolean}} stats 统计
 */

/**
 * 把否定式短语挖空，避免 `no CGI` 被当成空话词。
 * @param {string} lower 已小写的正文
 * @returns {string} 挖空后的文本
 */
function maskNegations(lower) {
  let masked = lower
  for (const pattern of NEGATION_PATTERNS) {
    masked = masked.replace(pattern, ' ')
  }
  return masked
}

/**
 * 归一化模型名，用于语法匹配。
 * @param {string} value 用户写的模型名
 * @returns {string} 小写、去空格
 */
function normalizeModel(value) {
  return String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '')
}

/**
 * 判断某条语法是否属于目标模型。
 * @param {string} required 语法所属模型族
 * @param {string} declared 用户声明的模型
 * @returns {boolean} 是否匹配
 */
function modelMatches(required, declared) {
  const a = normalizeModel(required)
  const b = normalizeModel(declared)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

/**
 * 检查一份提示词。
 * @param {object} input 输入
 * @param {string} input.prompt 提示词正文
 * @param {string} [input.model] 目标模型
 * @param {string} [input.language] 文案语言（zh|en），默认 zh
 * @returns {CheckResult} 结果
 */
export function checkPrompt({ prompt, model, language = 'zh' }) {
  const text = String(prompt ?? '')
  const lower = text.toLowerCase()
  const issues = []
  const notes = []

  const hasCjk = /[\u4e00-\u9fff]/.test(text)
  const hasLatin = /\b[a-z]{3,}\b/i.test(text)
  const words = (lower.match(/\b[a-z0-9'-]+\b/g) ?? []).length
  const stats = { words, hasCjk, hasLatin }

  if (text.trim().length === 0) {
    return {
      score: 0,
      issues: [{ level: 'blocker', code: 'EMPTY', message: t(language, 'issue', 'EMPTY') }],
      notes,
      stats,
    }
  }

  const pushIssue = (level, code, vars) => {
    issues.push({ level, code, message: t(language, 'issue', code, vars) })
  }

  // 1) 空话词（排除否定式短语）
  const masked = maskNegations(lower)
  const fillerHits = FILLER_WORDS.filter((word) => masked.includes(word))
  if (fillerHits.length > 0) {
    pushIssue('blocker', 'FILLER_WORDS', { words: [...new Set(fillerHits)].join(', ') })
  }

  // 2) 镜头 / 光线
  const hasCamera = CAMERA_HINTS.some((hint) => lower.includes(hint))
  const hasLight = LIGHT_HINTS.some((hint) => lower.includes(hint))
  if (!hasCamera) pushIssue('high', 'NO_CAMERA')
  if (!hasLight) pushIssue('high', 'NO_LIGHT')

  // 3) 纪实题材的反 CG 收尾
  const isDocumentary = DOCUMENTARY_PATTERN.test(text)
  if (isDocumentary && !/(no cgi|no beauty retouch|no oversharpen)/i.test(lower) && !/无\s*cg/.test(text)) {
    pushIssue('high', 'NO_ANTI_CG')
  }
  if (isDocumentary && !/(no text|no watermark)|无文字|无水印/i.test(text)) {
    notes.push(t(language, 'note', 'NO_TEXT_GUARD'))
  }

  // 4) 视频专项
  const isVideo = VIDEO_TASK_PATTERN.test(text)
  if (isVideo) {
    const speaks = SPEECH_PATTERN.test(text)
    const guarded = SILENCE_GUARD_PATTERN.test(text)
    if (speaks && !guarded) pushIssue('blocker', 'VIDEO_SPEECH')
    if (!guarded) notes.push(t(language, 'note', 'VIDEO_SILENCE'))
    if (HEAD_TURN_PATTERN.test(text)) pushIssue('high', 'VIDEO_HEADTURN')
    if (ATMOSPHERE_BAIT_PATTERN.test(lower) && !ATMOSPHERE_GUARD_PATTERN.test(lower)) {
      notes.push(t(language, 'note', 'ATMOSPHERE_GUARD'))
    }
  }

  // 5) 竖屏
  if (VERTICAL_WANT_PATTERN.test(text) && !VERTICAL_HAVE_PATTERN.test(text)) {
    pushIssue('blocker', 'NO_VERTICAL_FRAMING')
  }

  // 6) 序数指认图片
  if (ORDINAL_IMAGE_PATTERN.test(text)) notes.push(t(language, 'note', 'ORDINAL_IMAGE'))

  // 7) 模型专属语法
  const syntaxHits = MODEL_SYNTAX.filter((entry) => lower.includes(entry.token))
  if (syntaxHits.length > 0) {
    if (!model) {
      pushIssue('blocker', 'MODEL_SYNTAX_NO_MODEL', {
        tokens: [...new Set(syntaxHits.map((entry) => entry.token))].join(', '),
      })
    } else {
      const mismatched = syntaxHits.filter((entry) => !modelMatches(entry.model, model))
      if (mismatched.length > 0) {
        pushIssue('blocker', 'MODEL_SYNTAX_MISMATCH', {
          pairs: [...new Set(mismatched.map((entry) => `${entry.token}→${entry.model}`))].join('; '),
          model: String(model),
        })
      }
    }
  }

  // 8) 长度
  if (words > 0 && words < 25) notes.push(t(language, 'note', 'TOO_SHORT', { words }))
  if (words > 400) notes.push(t(language, 'note', 'TOO_LONG_WORDS', { words }))
  if (text.length > MAX_PROMPT_CHARS) {
    pushIssue('blocker', 'TOO_LONG', { limit: MAX_PROMPT_CHARS })
  }

  // 9) 主体是否靠前（仅纯英文稿检查；镜头型开头视为合规）
  const trimmed = text.trim()
  if (hasLatin && !hasCjk && !SHOT_OPENER_PATTERN.test(trimmed) && !/^(a|an|the)\b/i.test(trimmed)) {
    notes.push(t(language, 'note', 'SUBJECT_NOT_FIRST'))
  }

  // 10) 中英单边
  if (hasCjk && !hasLatin) notes.push(t(language, 'note', 'ONLY_CJK'))
  if (!hasCjk && hasLatin) notes.push(t(language, 'note', 'ONLY_LATIN'))

  const penalty = issues.reduce((sum, issue) => sum + (LEVEL_PENALTY[issue.level] ?? 0), 0)
  return { score: Math.max(0, 100 - penalty), issues, notes, stats }
}

/**
 * 把检查结果渲染成可读文本。
 * @param {CheckResult} result 结果
 * @param {string} [language] 语言
 * @returns {string} 多行文本
 */
export function formatCheckResult(result, language = 'zh') {
  const lines = [`${t(language, 'ui', 'score')}: ${result.score}/100`]
  if (result.issues.length === 0) {
    lines.push(`${t(language, 'ui', 'blockers')}: ${t(language, 'ui', 'none')}`)
  } else {
    lines.push(`${t(language, 'ui', 'issues')}:`)
    for (const issue of result.issues) lines.push(`- [${issue.level}] ${issue.code}: ${issue.message}`)
  }
  if (result.notes.length > 0) {
    lines.push(`${t(language, 'ui', 'notes')}:`)
    for (const note of result.notes) lines.push(`- ${note}`)
  }
  return lines.join('\n')
}
