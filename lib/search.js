/**
 * 中英文混合的轻量检索：分词 + 分段打分。
 *
 * 不引入依赖，也不做向量检索——库是给人读的 Markdown，
 * 逐个段落算覆盖率已经足够区分「哪个文件讲过这件事」。
 * @module ai-prompt-kit/search
 */

const WORD_TOKEN = /[a-z0-9][a-z0-9'-]{2,}/g
const HAN_CHUNK = /[\u4e00-\u9fff]{2,}/g

/**
 * 把文本切成检索词组：英文按词（≥3 字符），中文按相邻二字符。
 * @param {string} input 任意文本
 * @returns {Set<string>} 词组集合
 */
export function tokenize(input) {
  const lower = String(input ?? '').toLowerCase()
  const tokens = new Set()
  for (const word of lower.match(WORD_TOKEN) ?? []) tokens.add(word)
  for (const chunk of lower.match(HAN_CHUNK) ?? []) {
    for (let i = 0; i < chunk.length - 1; i += 1) tokens.add(chunk.slice(i, i + 2))
  }
  return tokens
}

/**
 * Jaccard 相似度。
 * @param {Set<string>} a 集合 A
 * @param {Set<string>} b 集合 B
 * @returns {number} 0–1
 */
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  return intersection / (a.size + b.size - intersection)
}

/**
 * 把 Markdown 切成段落：空行、标题、JSON 行边界都是切点。
 * @param {string} content 全文
 * @returns {string[]} 段落列表
 */
export function splitChunks(content) {
  return String(content ?? '')
    .split(/\n\s*\n|\n(?=#{1,6}\s)|(?<=\})\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
}

/**
 * 在全文里找「最相关的一段」。
 *
 * 打分 = 查询覆盖率 × 0.7 + Jaccard × 0.3。
 * 用覆盖率而不是纯 Jaccard：长段落不该因为词多而被稀释，
 * 短查询也不该被整篇全文淹没。
 * @param {Set<string>} query 查询词组
 * @param {string} content 全文
 * @returns {{score: number, chunk: string}} 最高分与命中片段（压缩空白后截断）
 */
export function bestChunkMatch(query, content) {
  if (query.size === 0) return { score: 0, chunk: '' }
  let best = { score: 0, chunk: '' }
  for (const chunk of splitChunks(content)) {
    const chunkTokens = tokenize(chunk)
    if (chunkTokens.size === 0) continue
    let hits = 0
    for (const token of query) if (chunkTokens.has(token)) hits += 1
    const coverage = hits / query.size
    const score = coverage * 0.7 + jaccard(query, chunkTokens) * 0.3
    if (score > best.score) {
      best = { score, chunk: chunk.replace(/\s+/g, ' ').slice(0, 160) }
    }
  }
  return best
}
