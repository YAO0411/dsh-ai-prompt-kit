/**
 * 文案：所有面向模型/用户的提示文本，中英双语。
 * 规则代码（code）保持语言无关，文案按 language 取。
 * @module ai-prompt-kit/i18n
 */

/** 支持的语言。 */
export const LANGUAGES = ['zh', 'en']

/**
 * @typedef {object} MessageTable
 * @property {Record<string, string>} issue 问题文案
 * @property {Record<string, string>} note 提示文案
 * @property {Record<string, string>} ui 界面文案
 */

/** @type {Record<string, MessageTable>} */
export const MESSAGES = {
  zh: {
    issue: {
      EMPTY: '提示词为空。',
      FILLER_WORDS: '出现空话关键词：{words}；换成可见的具体描述。',
      NO_CAMERA: '缺少镜头信息（焦段/光圈/景别/机位/画幅至少一项）。',
      NO_LIGHT: '缺少光线信息（光源/方向/软硬至少一项）。',
      NO_ANTI_CG: '人文/民俗/纪实题材缺「无 CG 感」类收尾句：补 no CGI / no beauty retouching / no oversharpening 这一组。',
      VIDEO_SPEECH: '视频提示词里出现「说话/开口」类描述，模型会真的生成语音（默认英语）。删掉 speak/talk/mouth open 一类词，改成正向句 mouth stays closed and still，并加 silent, no audio track, no dialogue, no voice。',
      VIDEO_HEADTURN: '图生视频写「转头/抬头/转身」会让模型重建面部三维关系，必然重画成另一张脸。改成眨眼、呼吸、发丝、蒸汽、水、尘土、风这类微小运动。',
      NO_VERTICAL_FRAMING: '这是竖屏需求却没写画幅，会出横图。开头必须写 VERTICAL FRAMING, 9:16 portrait, 1080x1920。',
      MODEL_SYNTAX_NO_MODEL: '出现模型专属语法（{tokens}），但未声明目标模型。',
      MODEL_SYNTAX_MISMATCH: '语法与模型不匹配：{pairs}（目标是 {model}）。',
      TOO_LONG: '总长度超过 {limit} 字符，模型对后半段的注意力会衰减；删掉不改变画面的内容。',
    },
    note: {
      NO_TEXT_GUARD: '纪实题材建议补「无文字、无水印」。',
      VIDEO_SILENCE: '视频任务建议补「silent, no audio track, no dialogue, no voice」——避免模型自作主张配音。',
      ATMOSPHERE_GUARD: '写了 dust/haze/smoke 却没写禁止项，模型会凭空加一大块尘雾。补「no steam plume, no smoke, no haze, no dust cloud」。',
      ORDINAL_IMAGE: '用「第一张/第二张」指认图片时，用户发给模型的顺序未必一致。建议改用画面特征指认。',
      ONLY_CJK: '只有中文：若目标是出图模型，建议补一份英文版。',
      ONLY_LATIN: '只有英文：建议补一份中文版便于理解。',
      TOO_SHORT: '英文约 {words} 词，偏短；除非是快速概念（10–30 词可接受），否则补到 80–150 词。',
      TOO_LONG_WORDS: '英文约 {words} 词，偏长；按「只加会改变画面的内容」删减。',
      SUBJECT_NOT_FIRST: '英文未以主体或镜头类型开头，主体应尽量放最前。',
    },
    ui: {
      score: '自检得分',
      blockers: '阻断项',
      none: '无',
      issues: '问题',
      notes: '提示',
      emptyLibrary: '目录为空',
      libraryRoot: '知识库根目录',
      fileCount: '个文件',
      listFailed: '列出失败',
      readFailed: '读取失败',
      noSuchFile: '文件不存在',
      truncatedHint: '已截断，共 {total} 行；用 offset 继续读',
      checkNotRun: '自检未执行',
      saveFailed: '保存失败',
      saved: '已保存',
      searchNone: '没有找到相似内容，可以按新题材写。',
      searchFailed: '检索失败',
      draftMissingTask: '缺少任务名。',
      draftFailed: '写入失败',
      draftOk: '已写入 {path}（该任务当前共 {version} 版；任务完成后用 promptlib_finalize 只留最终版）',
      finalizeMissingTask: '缺少任务名。',
      finalizeNoWorkspace: '没有这个任务的工作区：{dir}',
      finalizeNoVersions: '该工作区里没有版本文件，无需清理。现有文件：{files}',
      finalizeNoKeep: '找不到要保留的版本：{name}。现有：{names}',
      finalizeDryRun: '【预演，未删除任何文件】任务「{task}」',
      finalizeKeep: '保留：{name}',
      finalizeNothingToDelete: '没有需要删除的中间版本。',
      finalizeWillDelete: '将删除 {count} 个：{names}',
      finalizeConfirmHint: '要真正执行，请确认后传 confirm=true。',
      finalizeDone: '任务「{task}」已收尾。',
      finalizeDeleted: '已删除 {count} 个中间版本{named}。',
      finalizeFailedDelete: '删除失败 {count} 个：{names}',
      finalizePromoted: '已归档到 {path}',
      finalizePromoteFailed: '归档失败：{reason}',
      finalizeFailed: '清理失败',
      diagFailed: '诊断失败',
    },
  },
  en: {
    issue: {
      EMPTY: 'The prompt is empty.',
      FILLER_WORDS: 'Empty filler keywords found: {words}. Replace them with visible, concrete description.',
      NO_CAMERA: 'No camera information (lens, aperture, shot size, angle, or aspect at least one).',
      NO_LIGHT: 'No lighting information (source, direction, or hardness at least one).',
      NO_ANTI_CG: 'Documentary/folk subjects need the anti-CG closing clause: no CGI / no beauty retouching / no oversharpening.',
      VIDEO_SPEECH: 'A video prompt describes speaking/opening the mouth; the model will generate actual audio (English by default). Remove speak/talk/mouth open and add "mouth stays closed and still" plus "silent, no audio track, no dialogue, no voice".',
      VIDEO_HEADTURN: '"turns head / tilts head / turns around" forces the model to rebuild the face and it will redraw a different person. Use micro motion instead: blinking, breathing, hair, steam, water, dust, wind.',
      NO_VERTICAL_FRAMING: 'This is a vertical request but no framing is written, so a landscape image comes out. Start with VERTICAL FRAMING, 9:16 portrait, 1080x1920.',
      MODEL_SYNTAX_NO_MODEL: 'Model-specific syntax found ({tokens}) but no target model declared.',
      MODEL_SYNTAX_MISMATCH: 'Syntax/model mismatch: {pairs} (target is {model}).',
      TOO_LONG: 'Length exceeds {limit} characters; attention over the tail degrades. Remove anything that does not change the frame.',
    },
    note: {
      NO_TEXT_GUARD: 'Documentary subjects usually want "no text, no watermark".',
      VIDEO_SILENCE: 'Video tasks benefit from "silent, no audio track, no dialogue, no voice" so the model does not invent audio.',
      ATMOSPHERE_GUARD: 'dust/haze/smoke is described without a guard clause, so the model may add a large dust plume. Add "no steam plume, no smoke, no haze, no dust cloud".',
      ORDINAL_IMAGE: 'Referring to images as "the first/second image" is unreliable because the order the model receives them may differ. Identify them by visible features instead.',
      ONLY_CJK: 'Chinese only: for image models, add an English version.',
      ONLY_LATIN: 'English only: add a Chinese version for the reader.',
      TOO_SHORT: 'About {words} English words, which is short; unless it is a quick concept (10–30 words), aim for 80–150.',
      TOO_LONG_WORDS: 'About {words} English words, which is long; keep only what changes the frame.',
      SUBJECT_NOT_FIRST: 'The English does not open with the subject or a shot type; the subject should come first.',
    },
    ui: {
      score: 'Score',
      blockers: 'Blockers',
      none: 'none',
      issues: 'Issues',
      notes: 'Notes',
      emptyLibrary: 'Directory is empty',
      libraryRoot: 'Library root',
      fileCount: 'files',
      listFailed: 'Listing failed',
      readFailed: 'Read failed',
      noSuchFile: 'No such file',
      truncatedHint: 'Truncated at {total} lines total; continue with offset',
      checkNotRun: 'Check did not run',
      saveFailed: 'Save failed',
      saved: 'Saved',
      searchNone: 'No similar content found; this is a new subject.',
      searchFailed: 'Search failed',
      draftMissingTask: 'Missing task name.',
      draftFailed: 'Write failed',
      draftOk: 'Wrote {path} (task now has {version} version(s); after finishing use promptlib_finalize to keep only the final one)',
      finalizeMissingTask: 'Missing task name.',
      finalizeNoWorkspace: 'No workspace for this task: {dir}',
      finalizeNoVersions: 'No version files in this workspace; nothing to clean. Existing files: {files}',
      finalizeNoKeep: 'Cannot find the version to keep: {name}. Existing: {names}',
      finalizeDryRun: '[Dry run, nothing deleted] task "{task}"',
      finalizeKeep: 'Keep: {name}',
      finalizeNothingToDelete: 'No intermediate versions to delete.',
      finalizeWillDelete: 'Would delete {count}: {names}',
      finalizeConfirmHint: 'To really run it, call again with confirm=true.',
      finalizeDone: 'Task "{task}" finalized.',
      finalizeDeleted: 'Deleted {count} intermediate version(s){named}.',
      finalizeFailedDelete: 'Failed to delete {count}: {names}',
      finalizePromoted: 'Archived to {path}',
      finalizePromoteFailed: 'Archive failed: {reason}',
      finalizeFailed: 'Cleanup failed',
      diagFailed: 'Diagnostics failed',
    },
  },
}

/**
 * 选一张文案表。
 * @param {string} [language] 语言代码，缺省 zh
 * @returns {MessageTable} 文案表
 */
export function tableFor(language) {
  return MESSAGES[String(language ?? '').toLowerCase()] ?? MESSAGES.zh
}

/**
 * 取一条文案并填充占位符。
 * @param {string} language 语言
 * @param {'issue'|'note'|'ui'} group 分组
 * @param {string} key 键
 * @param {Record<string, string | number>} [vars] 占位符值
 * @returns {string} 填好的文案；未知键返回键名
 */
export function t(language, group, key, vars = {}) {
  const table = tableFor(language)
  const template = table[group]?.[key]
  if (!template) return key
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? `{${name}}`))
}
