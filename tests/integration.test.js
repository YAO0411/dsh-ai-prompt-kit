/**
 * 集成测试：用一个假的 Cordis ctx 装载插件，逐个调用工具。
 * 目的是验证「注册成功 + 工具可调用 + 文件真的落盘」，而不是测内部算法。
 */

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { apply, normalizeConfig } from '../index.js'

let libraryRoot
const registered = new Map()
let cardText = ''
const sections = []

/**
 * 造一个最小可用的 ctx：只实现插件会碰的接口。
 * @returns {object} 假 ctx
 */
function makeCtx() {
  return {
    systemPrompt: {
      section(section) {
        sections.push(section)
        cardText = typeof section.text === 'string' ? section.text : section.text()
        return () => {}
      },
      async assemble() {
        return { sections: sections.map((s) => ({ name: s.name, text: typeof s.text === 'string' ? s.text : '' })) }
      },
    },
    tools: {
      register(definition) {
        registered.set(definition.name, definition)
      },
    },
    effect(fn) {
      const disposer = fn()
      return () => disposer?.()
    },
  }
}

/**
 * 调用一个已注册的工具，返回它的文本输出。
 * @param {string} toolName 工具名
 * @param {object} [args] 参数
 * @returns {Promise<string>} 输出文本
 */
async function callTool(toolName, args = {}) {
  const definition = registered.get(toolName)
  assert.ok(definition, `tool ${toolName} not registered`)
  const value = await definition.execute(args, { agent: {} })
  return String(value?.text ?? '')
}

before(() => {
  libraryRoot = mkdtempSync(join(tmpdir(), 'aipk-'))
  apply(makeCtx(), { libraryRoot, language: 'zh' })
})

after(() => {
  // 只删自己建的临时目录
  if (libraryRoot?.includes('aipk-')) rmSync(libraryRoot, { recursive: true, force: true })
})

test('八个工具全部注册', () => {
  const expected = [
    'promptlib_list',
    'promptlib_read',
    'promptlib_check',
    'promptlib_save',
    'promptlib_search',
    'promptlib_draft',
    'promptlib_finalize',
    'promptlib_diag',
  ]
  for (const name of expected) assert.ok(registered.has(name), `missing ${name}`)
})

test('库骨架被建立', () => {
  for (const sub of ['rules', 'samples', 'workspace', 'output', 'material']) {
    assert.ok(existsSync(join(libraryRoot, sub)), `missing dir ${sub}`)
  }
})

test('工坊卡注入且包含关键约束', () => {
  assert.ok(sections.length > 0, 'no section registered')
  assert.equal(sections[0].name, 'ai-prompt-kit:card')
  assert.ok(cardText.includes('七块'))
  assert.ok(cardText.includes('promptlib_check'))
  assert.ok(cardText.includes(libraryRoot), 'card should name the library root')
})

test('diag 报告卡片存在', async () => {
  const text = await callTool('promptlib_diag')
  assert.ok(text.includes('present'), text)
  assert.ok(text.includes(libraryRoot))
})

test('空库 list 返回空提示', async () => {
  const text = await callTool('promptlib_list')
  assert.ok(text.includes('目录为空') || text.includes('0 '), text)
})

test('save 落盘 markdown 与 jsonl', async () => {
  const text = await callTool('promptlib_save', {
    kind: 'sample',
    brief: '海边真实人物肖像',
    category: 'portrait',
    promptZh: '海边真实人物肖像，自然光',
    promptEn: 'A candid portrait on a beach, natural daylight',
    effect: '皮肤出来了，光从右侧来',
    verdict: 'partial',
    model: 'flux',
    tags: 'portrait, test',
  })
  assert.ok(text.includes('已保存'), text)
  const markdownFiles = readdirSync(join(libraryRoot, 'samples')).filter((n) => n.endsWith('.md'))
  assert.equal(markdownFiles.length, 1)
  assert.ok(existsSync(join(libraryRoot, 'samples', 'index.jsonl')))
  const record = JSON.parse(readFileSync(join(libraryRoot, 'samples', 'index.jsonl'), 'utf8').trim())
  assert.equal(record.kind, 'sample')
  assert.deepEqual(record.tags, ['portrait', 'test'])
})

test('list 能看到刚存的样本', async () => {
  const text = await callTool('promptlib_list', { section: 'samples' })
  assert.ok(text.includes('samples/'), text)
})

test('read 能读回刚存的样本', async () => {
  const listed = await callTool('promptlib_list', { section: 'samples' })
  const path = listed.match(/samples\/[^\s｜]+\.md/)?.[0]
  assert.ok(path, `no sample path in: ${listed}`)
  const text = await callTool('promptlib_read', { path })
  assert.ok(text.includes('海边真实人物肖像'), text)
})

test('read 拒绝路径越界', async () => {
  const text = await callTool('promptlib_read', { path: '../../../etc/passwd' })
  assert.ok(text.includes('越界'), text)
})

test('search 能命中刚存的样本', async () => {
  const text = await callTool('promptlib_search', { query: '海边 肖像 自然光' })
  assert.ok(/\d\.\d\d/.test(text), text)
})

test('check 对空话稿打低分', async () => {
  const text = await callTool('promptlib_check', { prompt: 'A girl, 8K, masterpiece' })
  assert.ok(text.includes('得分'), text)
  assert.ok(text.includes('FILLER_WORDS'), text)
})

test('check 对合格稿打满分', async () => {
  const prompt =
    'Live-action 35mm film still of an elderly craftsman painting a lion head in Suzhou, ' +
    'dim indoor light and natural window light, 85mm lens, close-up, documentary realism, ' +
    'muted colors, film grain, no CGI, no beauty retouching, no oversharpening, no text, no watermark. ' +
    '中文：实拍 35mm 胶片剧照，匠人在狮头上绘制细节，85mm，特写，纪实写实。'
  const text = await callTool('promptlib_check', { prompt })
  assert.ok(text.includes('100/100'), text)
})

test('draft 连续版本号递增', async () => {
  const first = await callTool('promptlib_draft', { task: '舞狮', content: 'v1 内容' })
  const second = await callTool('promptlib_draft', { task: '舞狮', content: 'v2 内容' })
  assert.ok(first.includes('v1.md'), first)
  assert.ok(second.includes('v2.md'), second)
  assert.ok(existsSync(join(libraryRoot, 'workspace', '舞狮', 'v2.md')))
})

test('finalize 默认只预演，不删文件', async () => {
  const text = await callTool('promptlib_finalize', { task: '舞狮' })
  assert.ok(text.includes('预演'), text)
  assert.ok(text.includes('v2.md'), text)
  assert.ok(existsSync(join(libraryRoot, 'workspace', '舞狮', 'v1.md')), 'dry run must not delete')
  assert.ok(existsSync(join(libraryRoot, 'workspace', '舞狮', 'v2.md')), 'dry run must not delete')
})

test('finalize confirm 后只留最终版并归档', async () => {
  const text = await callTool('promptlib_finalize', { task: '舞狮', confirm: true })
  assert.ok(text.includes('已收尾'), text)
  const left = readdirSync(join(libraryRoot, 'workspace', '舞狮'))
  assert.deepEqual(left, ['v2.md'])
  assert.ok(existsSync(join(libraryRoot, 'output', '舞狮.md')))
})

test('finalize 不会碰 tasks 之外的文件', async () => {
  await callTool('promptlib_draft', { task: '其他', content: 'x' })
  const before = readdirSync(join(libraryRoot, 'workspace'))
  await callTool('promptlib_finalize', { task: '不存在的任务', confirm: true })
  const after = readdirSync(join(libraryRoot, 'workspace'))
  assert.deepEqual(after, before)
})

test('英文语言下自检文案为英文', async () => {
  const englishRoot = mkdtempSync(join(tmpdir(), 'aipk-en-'))
  const toolMap = new Map()
  apply(
    {
      systemPrompt: {
        section: () => () => {},
        async assemble() {
          return { sections: [] }
        },
      },
      tools: { register: (d) => toolMap.set(d.name, d) },
      effect: (fn) => fn(),
    },
    { libraryRoot: englishRoot, language: 'en' },
  )
  const value = await toolMap.get('promptlib_check').execute({ prompt: '8K masterpiece' }, { agent: {} })
  assert.ok(String(value.text).includes('Score'), String(value.text))
  assert.ok(String(value.text).includes('filler'), String(value.text))
  rmSync(englishRoot, { recursive: true, force: true })
})

test('关闭 injectRules 时不注册卡片', () => {
  const toolMap = new Map()
  let sectionCalls = 0
  apply(
    {
      systemPrompt: {
        section: () => {
          sectionCalls += 1
          return () => {}
        },
        async assemble() {
          return { sections: [] }
        },
      },
      tools: { register: (d) => toolMap.set(d.name, d) },
      effect: (fn) => fn(),
    },
    { libraryRoot: mkdtempSync(join(tmpdir(), 'aipk-')), injectRules: false },
  )
  assert.equal(sectionCalls, 0)
  assert.ok(toolMap.has('promptlib_check'), 'tools should still register')
})

test('配置归一化：语言与上限收敛', () => {
  const normalized = normalizeConfig({ language: 'EN', maxSearchFiles: 999999 })
  assert.equal(normalized.language, 'en')
  assert.equal(normalized.maxSearchFiles, 5000)
  assert.equal(normalizeConfig({}).injectRules, true)
})
