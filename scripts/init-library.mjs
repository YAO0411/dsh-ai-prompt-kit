/**
 * 把 seed/ 复制进一个库目录（幂等：已存在则不覆盖）。
 *
 * 用法：
 *   node scripts/init-library.mjs            # 初始化默认库 ~/ai-prompt-library
 *   node scripts/init-library.mjs D:/mylib   # 指定目录
 *   node scripts/init-library.mjs D:/mylib --force        # 覆盖已有同名文件
 *   node scripts/init-library.mjs D:/mylib --no-samples   # 只铺规则，不复制示例图片（省 ~7 MB）
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const seedDir = resolve(here, '..', 'seed')
const args = process.argv.slice(2)
const force = args.includes('--force')
const skipSamples = args.includes('--no-samples')
const positional = args.filter((arg) => !arg.startsWith('--'))
const target = resolve(positional[0] ?? process.env.AI_PROMPT_KIT_DIR ?? join(homedir(), 'ai-prompt-library'))

if (!existsSync(seedDir)) {
  console.error(`seed directory missing: ${seedDir}`)
  process.exit(1)
}

mkdirSync(target, { recursive: true })

let copied = 0
let skipped = 0

/**
 * 递归复制，按需跳过同名文件。
 * @param {string} from 源
 * @param {string} to 目标
 */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    if (skipSamples && from === seedDir && name === 'samples') {
      skipped += 1
      continue
    }
    const source = join(from, name)
    const destination = join(to, name)
    if (statSync(source).isDirectory()) {
      copyTree(source, destination)
      continue
    }
    if (existsSync(destination) && !force) {
      skipped += 1
      continue
    }
    cpSync(source, destination, { overwrite: true })
    copied += 1
  }
}

copyTree(seedDir, target)

for (const sub of ['workspace', 'output']) {
  mkdirSync(join(target, sub), { recursive: true })
}

console.log(`library: ${target}`)
console.log(`copied ${copied} file(s), skipped ${skipped} existing/omitted${force ? ' (force)' : ''}`)
console.log('next: point the plugin at this path with config.libraryRoot, then start a new session.')
