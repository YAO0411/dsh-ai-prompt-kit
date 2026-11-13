/**
 * 样本库 / 规则库 / 工作区的读写。全部落在库根目录内。
 * @module ai-prompt-kit/store
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { DIRS, VERSION_FILE_PATTERN } from './constants.js'
import { safeJoin, sanitizeSegment, toPosixRelative } from './paths.js'

/**
 * 生成文件名安全的时间戳。
 * @param {Date} [date] 时间
 * @returns {string} 形如 2026-11-13T13-45-40-123Z
 */
export function fileStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

/**
 * 列出版本文件（v1.md / v2.md …），按编号升序。
 * @param {string} dir 目录绝对路径
 * @returns {Array<{name: string, version: number}>} 版本列表
 */
export function listVersions(dir) {
  if (!existsSync(dir)) return []
  const found = []
  for (const name of readdirSync(dir)) {
    const matched = VERSION_FILE_PATTERN.exec(name)
    if (!matched) continue
    try {
      if (!statSync(join(dir, name)).isFile()) continue
    } catch {
      continue
    }
    found.push({ name, version: Number(matched[1]) })
  }
  return found.sort((a, b) => a.version - b.version)
}

/**
 * 追加一条「提示词 → 效果」对照样本。
 * @param {object} input 输入
 * @param {string} input.root 库根
 * @param {'sample'|'correction'|'rule'} input.kind 类型
 * @param {string} input.brief 原始需求（必填）
 * @param {string} [input.category] 题材
 * @param {string} [input.promptZh] 中文提示词
 * @param {string} [input.promptEn] 英文提示词
 * @param {string} [input.effect] 实际效果
 * @param {string} [input.verdict] 评价：good|partial|bad|unverified
 * @param {string} [input.model] 模型
 * @param {string[]} [input.tags] 标签
 * @returns {{relativePath: string, indexPath: string}} 写入结果
 */
export function saveSample(input) {
  const root = input.root
  const kind = ['sample', 'correction', 'rule'].includes(input.kind) ? input.kind : 'sample'
  const createdAt = new Date()
  const stamp = fileStamp(createdAt)
  const slug = sanitizeSegment(input.category || kind, 24)
  const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : []

  const record = {
    id: `${kind}_${stamp}`,
    kind,
    createdAt: createdAt.toISOString(),
    category: input.category ?? '',
    brief: input.brief ?? '',
    promptZh: input.promptZh ?? '',
    promptEn: input.promptEn ?? '',
    effect: input.effect ?? '',
    verdict: input.verdict ?? '',
    model: input.model ?? '',
    tags,
  }

  const samplesDir = join(root, DIRS.samples)
  mkdirSync(samplesDir, { recursive: true })
  const indexPath = join(samplesDir, 'index.jsonl')
  appendFileSync(indexPath, `${JSON.stringify(record)}\n`, 'utf8')

  const markdown = [
    `# ${record.category || kind} · ${stamp}`,
    '',
    `- 类型：${kind}`,
    `- 模型：${record.model || '未指定'}`,
    `- 评价：${record.verdict || '未评价'}`,
    `- 标签：${tags.join('、') || '无'}`,
    '',
    '## 原始需求',
    '',
    record.brief || '(未提供)',
    '',
    '## 中文提示词',
    '',
    record.promptZh || '(未提供)',
    '',
    '## 英文提示词',
    '',
    record.promptEn || '(未提供)',
    '',
    '## 实际效果',
    '',
    record.effect || '(未提供)',
    '',
  ].join('\n')

  const filePath = join(samplesDir, `${slug}-${stamp}.md`)
  writeFileSync(filePath, markdown, 'utf8')
  return {
    relativePath: toPosixRelative(root, filePath),
    indexPath: toPosixRelative(root, indexPath),
  }
}

/**
 * 写入下一版草稿（v1.md → v2.md …）。
 * @param {object} input 输入
 * @param {string} input.root 库根
 * @param {string} input.task 任务名
 * @param {string} input.content 本版内容
 * @param {string} [input.note] 改动说明
 * @returns {{relativePath: string, version: number}} 写入结果
 */
export function writeDraft(input) {
  const task = String(input.task ?? '').trim()
  if (!task) throw new Error('missing task')
  const dir = safeJoin(input.root, join(DIRS.workspace, sanitizeSegment(task)))
  mkdirSync(dir, { recursive: true })

  const versions = listVersions(dir)
  const next = versions.length === 0 ? 1 : versions[versions.length - 1].version + 1

  const header = [
    `<!-- task: ${task} | version: v${next} | ${new Date().toISOString()} -->`,
    input.note ? `<!-- change: ${String(input.note).replace(/-->/g, '')} -->` : '',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  const filePath = join(dir, `v${next}.md`)
  writeFileSync(filePath, `${header}${String(input.content ?? '')}\n`, 'utf8')
  return { relativePath: toPosixRelative(input.root, filePath), version: next }
}

/**
 * 收尾一个任务：保留最终版，删除其余版本，可选归档。
 * @param {object} input 输入
 * @param {string} input.root 库根
 * @param {string} input.task 任务名
 * @param {string} [input.keep] 要保留的文件名
 * @param {boolean} [input.confirm] 是否真的删除
 * @param {boolean} [input.promote] 是否归档到 output/
 * @returns {object} 预演或执行结果
 */
export function finalizeTask(input) {
  const task = String(input.task ?? '').trim()
  if (!task) throw new Error('missing task')
  const slug = sanitizeSegment(task)
  const dir = safeJoin(input.root, join(DIRS.workspace, slug))
  if (!existsSync(dir)) return { status: 'no-workspace', dir: toPosixRelative(input.root, dir) }

  const versions = listVersions(dir)
  if (versions.length === 0) {
    return { status: 'no-versions', files: readdirSync(dir) }
  }

  const keepName = input.keep ? String(input.keep).trim() : versions[versions.length - 1].name
  const keepPath = safeJoin(dir, keepName)
  if (!existsSync(keepPath) || !VERSION_FILE_PATTERN.test(keepName)) {
    return { status: 'no-keep-file', name: keepName, names: versions.map((v) => v.name) }
  }

  const doomed = versions.filter((v) => v.name !== keepName).map((v) => v.name)

  if (input.confirm !== true) {
    return { status: 'dry-run', keep: keepName, doomed }
  }

  const removed = []
  const failed = []
  for (const name of doomed) {
    try {
      unlinkSync(join(dir, name))
      removed.push(name)
    } catch (error) {
      failed.push({ name, reason: error instanceof Error ? error.message : String(error) })
    }
  }

  let promoted = ''
  let promoteError = ''
  if (input.promote !== false) {
    const outDir = join(input.root, DIRS.output)
    mkdirSync(outDir, { recursive: true })
    const target = join(outDir, `${slug}.md`)
    try {
      writeFileSync(target, readFileSync(keepPath, 'utf8'), 'utf8')
      promoted = toPosixRelative(input.root, target)
    } catch (error) {
      promoteError = error instanceof Error ? error.message : String(error)
    }
  }

  return { status: 'done', keep: keepName, removed, failed, promoted, promoteError }
}

/**
 * 统计库规模。
 * @param {string} root 库根
 * @returns {{rules: number, samples: number, workspace: number, output: number}} 各目录文件数
 */
export function libraryStats(root) {
  const count = (subdir) => {
    const dir = join(root, subdir)
    if (!existsSync(dir)) return 0
    let total = 0
    for (const name of readdirSync(dir)) {
      try {
        if (statSync(join(dir, name)).isFile()) total += 1
      } catch {
        /* 忽略读不到的文件 */
      }
    }
    return total
  }
  return {
    rules: count(DIRS.rules),
    samples: count(DIRS.samples),
    workspace: count(DIRS.workspace),
    output: count(DIRS.output),
  }
}
