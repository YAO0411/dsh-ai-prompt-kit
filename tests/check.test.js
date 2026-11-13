/**
 * 自检规则的单元测试。零依赖，`node --test tests/` 直接跑。
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkPrompt } from '../lib/check.js'
import { tokenize, bestChunkMatch } from '../lib/search.js'
import { sanitizeSegment, safeJoin, resolveLibraryRoot } from '../lib/paths.js'

const codes = (result) => result.issues.map((issue) => issue.code)

test('空提示词得 0 分并报 EMPTY', () => {
  const result = checkPrompt({ prompt: '   ' })
  assert.equal(result.score, 0)
  assert.deepEqual(codes(result), ['EMPTY'])
})

test('空话词被抓出，且分数显著下降', () => {
  const result = checkPrompt({ prompt: 'A beautiful girl, 8K, ultra detailed, masterpiece, 85mm lens, soft window light' })
  assert.ok(codes(result).includes('FILLER_WORDS'))
  assert.ok(result.score < 100)
})

test('否定式排除不算空话：no CGI / no beauty retouching', () => {
  const prompt =
    'Live-action 35mm film still of an elderly craftsman painting a lion head in Suzhou, ' +
    'dim indoor light and natural window light, 85mm lens, close-up, documentary realism, ' +
    'muted colors, film grain, no CGI, no beauty retouching, no oversharpening, no text, no watermark.'
  const result = checkPrompt({ prompt })
  assert.equal(codes(result).includes('FILLER_WORDS'), false)
  assert.equal(result.score, 100)
})

test('中文否定式「无 CG 感」同样不触发空话', () => {
  const result = checkPrompt({
    prompt: '实拍 35mm 胶片剧照，匠人在狮头上绘制细节，室内昏暗环境光与自然窗光，85mm 镜头，特写，纪实写实，无 CG 感，无美颜磨皮，无文字，无水印。',
  })
  assert.equal(codes(result).includes('FILLER_WORDS'), false)
})

test('缺镜头与缺光线分别报出', () => {
  const result = checkPrompt({ prompt: 'A woman standing in a field, she looks calm and serene' })
  assert.ok(codes(result).includes('NO_CAMERA'))
  assert.ok(codes(result).includes('NO_LIGHT'))
})

test('运镜词视为镜头信息，不误报 NO_CAMERA', () => {
  const result = checkPrompt({
    prompt:
      'Locked-off static camera, the camera stays completely still, neither the position nor the focal length moves; ' +
      'only the characters\' movements, light and shadow change inside the frame. 中文：镜头完全静止，只有光影在变化。',
  })
  assert.equal(codes(result).includes('NO_CAMERA'), false)
  assert.equal(result.score, 100)
})

test('视频里写说话但没静音守卫 → 阻断', () => {
  const result = checkPrompt({
    prompt: 'A man slowly turns and speaks to the camera, 8 seconds video, 85mm lens, soft window light',
  })
  assert.ok(codes(result).includes('VIDEO_SPEECH'))
})

test('写转头会报 VIDEO_HEADTURN', () => {
  const result = checkPrompt({
    prompt: 'Animate the first frame: she turns her head slowly, 85mm lens, soft window light, silent, no dialogue',
  })
  assert.ok(codes(result).includes('VIDEO_HEADTURN'))
})

test('竖屏需求没写画幅 → 阻断', () => {
  const result = checkPrompt({ prompt: '竖屏短视频，一个女孩在雨天街头，35mm，浅景深，阴天柔光' })
  assert.ok(codes(result).includes('NO_VERTICAL_FRAMING'))
})

test('模型语法与模型不匹配 → 阻断', () => {
  const result = checkPrompt({
    prompt: 'A portrait, 85mm, soft window light, negative_prompt: blurry',
    model: 'midjourney',
  })
  assert.ok(codes(result).includes('MODEL_SYNTAX_MISMATCH'))
})

test('有语法但没声明模型 → 阻断', () => {
  const result = checkPrompt({ prompt: 'A portrait, 85mm, soft window light --ar 3:2' })
  assert.ok(codes(result).includes('MODEL_SYNTAX_NO_MODEL'))
})

test('语法与模型匹配时不再报错', () => {
  const result = checkPrompt({ prompt: 'A portrait, 85mm, soft window light --ar 3:2', model: 'midjourney' })
  assert.equal(codes(result).includes('MODEL_SYNTAX_MISMATCH'), false)
  assert.equal(codes(result).includes('MODEL_SYNTAX_NO_MODEL'), false)
})

test('英文文案可切换', () => {
  const result = checkPrompt({ prompt: '8K masterpiece', language: 'en' })
  const filler = result.issues.find((issue) => issue.code === 'FILLER_WORDS')
  assert.ok(filler.message.includes('Empty filler keywords'))
})

test('分词：英文按词、中文按二字符', () => {
  const tokens = tokenize('soft window light 柔和窗光')
  assert.ok(tokens.has('soft'))
  assert.ok(tokens.has('window'))
  assert.ok(tokens.has('柔和'))
  assert.ok(tokens.has('窗光'))
})

test('分段检索能命中相关段落', () => {
  const content = [
    '# 产品',
    '产品图要写落地表面、接触阴影、布光方向与角度。',
    '',
    '# 人像',
    '人像要写毛孔、细纹与自然窗光。',
  ].join('\n')
  const match = bestChunkMatch(tokenize('产品图 接触阴影 布光'), content)
  assert.ok(match.score > 0.3)
  assert.ok(match.chunk.includes('落地表面'))
})

test('路径越界被拒绝', () => {
  assert.throws(() => safeJoin('C:/lib', '../secret.txt'), /路径越界/)
  assert.throws(() => safeJoin('C:/lib', 'a/../../secret.txt'), /路径越界/)
})

test('正常相对路径可用', () => {
  const joined = safeJoin('C:/lib', 'rules/20_topics.md')
  assert.ok(joined.endsWith('20_topics.md'))
})

test('文件名清理去掉非法字符', () => {
  assert.equal(sanitizeSegment('a/b:c*d'), 'a-b-c-d')
  assert.equal(sanitizeSegment('   '), 'item')
  assert.ok(sanitizeSegment('x'.repeat(100)).length <= 48)
})

test('库根可用环境变量覆盖', () => {
  const previous = process.env.AI_PROMPT_KIT_DIR
  process.env.AI_PROMPT_KIT_DIR = 'D:/tmp/lib'
  try {
    assert.equal(resolveLibraryRoot(undefined).replaceAll('\\', '/'), 'D:/tmp/lib')
    assert.equal(resolveLibraryRoot('E:/other').replaceAll('\\', '/'), 'E:/other')
  } finally {
    if (previous === undefined) delete process.env.AI_PROMPT_KIT_DIR
    else process.env.AI_PROMPT_KIT_DIR = previous
  }
})
