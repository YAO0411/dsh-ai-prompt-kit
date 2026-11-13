/**
 * 路径与文件系统工具。所有对外输入都经过这里，保证不逃出库根目录。
 * @module ai-prompt-kit/paths
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  DEFAULT_LIBRARY_DIRNAME,
  DIRS,
  MAX_SCAN_DEPTH,
  RESERVED_SEGMENTS,
  TEXT_EXTENSIONS,
} from './constants.js'

/**
 * 把任意字符串收敛成安全的单段目录/文件名。
 * @param {string} value 原始文本
 * @param {number} [maxLength] 最大长度
 * @returns {string} 安全片段；空输入返回 `item`
 */
export function sanitizeSegment(value, maxLength = 48) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return cleaned.slice(0, maxLength) || 'item'
}

/**
 * 解析可能带 Windows 盘符的绝对路径。
 * `D:/tmp` 这类盘符路径在 Windows 上是绝对路径，但在 POSIX 上
 * `path.resolve` 会把它当相对路径拼到当前目录后面，所以先识别出来直接返回。
 * @param {string} value 候选路径
 * @returns {string} 绝对路径
 */
function resolveAbsolute(value) {
  if (/^[A-Za-z]:[\\/]/.test(value)) return value.replaceAll('\\', '/')
  return resolve(value)
}

/**
 * 解析库根目录：配置值 > 环境变量 > 用户目录下的默认位置。
 * @param {string | undefined} configured 行配置里的 libraryRoot
 * @returns {string} 绝对路径
 */
export function resolveLibraryRoot(configured) {
  const raw = String(configured ?? '').trim()
  if (raw) return resolveAbsolute(raw)
  const fromEnv = String(process.env.AI_PROMPT_KIT_DIR ?? '').trim()
  if (fromEnv) return resolveAbsolute(fromEnv)
  return join(homedir(), DEFAULT_LIBRARY_DIRNAME)
}

/**
 * 建立库骨架（幂等）。
 * @param {string} root 库根
 * @returns {string} 同一个 root
 */
export function ensureLibrary(root) {
  for (const name of Object.values(DIRS)) {
    mkdirSync(join(root, name), { recursive: true })
  }
  return root
}

/**
 * 把用户给的相对路径解析到库内。越界即抛错。
 * @param {string} root 库根
 * @param {string} relativePath 相对路径
 * @returns {string} 绝对路径
 */
export function safeJoin(root, relativePath) {
  const raw = String(relativePath ?? '')
  if (RESERVED_SEGMENTS.has(raw)) return resolve(root)
  const target = resolve(root, raw)
  const rel = relative(root, target)
  if (rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) {
    throw new Error(`路径越界，已拒绝：${raw}`)
  }
  return target
}

/**
 * 转为模型可读的 POSIX 风格相对路径。
 * @param {string} root 库根
 * @param {string} absolute 绝对路径
 * @returns {string} 正斜杠相对路径
 */
export function toPosixRelative(root, absolute) {
  return relative(root, absolute).split(sep).join('/')
}

/**
 * 读取文件首行非空文本作为标题。
 * @param {string} absolute 绝对路径
 * @returns {string} 标题；失败返回空串
 */
function readTitle(absolute) {
  try {
    const head = readFileSync(absolute, 'utf8').slice(0, 512)
    const line = head.split(/\r?\n/).find((l) => l.trim().length > 0) || ''
    return line.replace(/^#+\s*/, '').trim().slice(0, 80)
  } catch {
    return ''
  }
}

/**
 * 递归列出库内文本文件。
 * @param {string} root 库根，用于生成相对路径
 * @param {object} [options] 选项
 * @param {string} [options.dir] 起始目录（绝对路径），默认 root
 * @param {number} [options.depth] 剩余深度
 * @param {boolean} [options.withTitle] 是否读取首行标题（较慢）
 * @returns {Array<{path: string, absolute: string, size: number, title: string}>} 文件清单
 */
export function listFiles(root, options = {}) {
  const dir = options.dir ? resolve(options.dir) : root
  const depth = Number.isFinite(options.depth) ? Number(options.depth) : MAX_SCAN_DEPTH
  const withTitle = options.withTitle !== false
  if (depth < 0 || !existsSync(dir)) return []

  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      out.push(...listFiles(root, { dir: full, depth: depth - 1, withTitle }))
      continue
    }
    if (!entry.isFile()) continue
    if (!TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue
    let size = 0
    try {
      size = statSync(full).size
    } catch {
      size = 0
    }
    out.push({
      path: toPosixRelative(root, full),
      absolute: full,
      size,
      title: withTitle ? readTitle(full) : '',
    })
  }
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * 按行窗口读取文本。
 * @param {string} absolute 绝对路径
 * @param {number} [offset] 起始行，1 起
 * @param {number} [limit] 行数
 * @returns {{lines: string[], text: string, totalLines: number, truncated: boolean, startLine: number}} 窗口内容
 */
export function readWindowed(absolute, offset, limit) {
  const raw = readFileSync(absolute, 'utf8')
  const all = raw.split(/\r?\n/)
  const totalLines = all.length
  const startLine = Math.max(1, Math.min(Number(offset) || 1, Math.max(1, totalLines)))
  const count = Math.max(1, Math.min(Number(limit) || 400, 1200))
  const slice = all.slice(startLine - 1, startLine - 1 + count)
  return {
    lines: slice,
    text: slice.map((line, index) => `${startLine + index}\t${line}`).join('\n'),
    totalLines,
    truncated: startLine - 1 + count < totalLines,
    startLine,
  }
}
