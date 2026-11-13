/**
 * 常量：词表、模板、默认状态。
 *
 * 所有启发式规则集中在这里，方便社区改词表而不必碰逻辑。
 * @module ai-prompt-kit/constants
 */

/** 默认库根目录（相对用户 home，跨平台）。 */
export const DEFAULT_LIBRARY_DIRNAME = 'ai-prompt-library'

/** 库内子目录。 */
export const DIRS = {
  rules: 'rules',
  samples: 'samples',
  workspace: 'workspace',
  output: 'output',
  material: 'material',
}

/** 参与索引与读取的文本后缀。 */
export const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.jsonl', '.json'])

/** 递归扫描深度上限。 */
export const MAX_SCAN_DEPTH = 4

/**
 * 空话词：单独使用会拉低真实感或拉低信息量。
 * 命中即视为 blocker（除非出现在否定式短语里，见 NEGATION_PATTERNS）。
 */
export const FILLER_WORDS = [
  '8k', '4k', 'ultra detailed', 'ultra-detailed', 'hyperrealistic', 'hyper-realistic',
  'masterpiece', 'best quality', 'award-winning', 'award winning', 'highly detailed',
  'ultra realistic', 'flawless', 'airbrushed', 'plastic skin', 'cgi', '3d render',
  'trending on artstation', 'sharp focus', 'insanely detailed',
  '杰作', '超高清', '极致细节', '画质巅峰', '大师作品', '超精细',
]

/**
 * 否定式短语：其中的空话词是「主动排除」，属良性约束，不计入 FILLER。
 * 例：no CGI / no beauty retouching / 无 CG 感 / 不美化
 */
export const NEGATION_PATTERNS = [
  /\bno\s+(cgi|3d render|beauty retouch\w*|retouch\w*|photoshop|oversharpen\w*|over-satur\w*|airbrush\w*|flawless|plastic skin|plastic surface|glossy\w*|smooth\w*|glow|bloom|halation|hdr|filter\w*|sharpening)\b/g,
  /\bnot\s+(beautified|retouched|glossy|smoothed|flawless|saturated)\b/g,
  /\bwithout\s+(cgi|retouching|oversharpening|beauty filter)\b/g,
  /无\s*(cg\s*感|cg|3d|美颜|磨皮|过度锐化|塑料感|油光|柔光晕|光晕)/g,
  /(不美化|不重度修图|不磨皮|不做美颜)/g,
]

/** 镜头/视角线索：命中任一即认为写了「怎么拍」。 */
export const CAMERA_HINTS = [
  // 焦段、光圈、景深
  'mm', 'f/', 'depth of field', 'dof', 'bokeh', '景深', '光圈', '焦段',
  // 景别
  'close-up', 'closeup', 'wide shot', 'medium shot', 'full shot', 'extreme close',
  '中景', '近景', '特写', '全景', '远景',
  // 机位
  'eye level', 'low angle', 'high angle', 'overhead', 'bird', 'worm',
  '俯拍', '仰拍', '平视', '航拍',
  // 画幅
  'aspect', '画幅', 'vertical', 'horizontal', '9:16', '16:9', '2.35:1',
  // 运镜（视频）
  'locked-off', 'static camera', 'fixed camera', 'dolly', 'tracking shot',
  'handheld', 'crash in', 'pan', 'tilt', 'zoom', 'whip',
  '固定机位', '静止镜头', '推镜', '拉镜', '运镜', '手持',
]

/** 光线线索：命中任一即认为写了「光从哪来」。 */
export const LIGHT_HINTS = [
  'light', 'lighting', 'lit by', 'backlight', 'backlit', 'rim', 'kicker',
  'softbox', 'overcast', 'window light', 'golden hour', 'blue hour',
  'practical', 'lantern', 'candle', 'neon', 'diffused', 'hard light',
  '光影', '光线', '逆光', '轮廓光', '主光', '窗光', '阴天', '漫射', '侧光',
]

/** 模型专属语法：写错模型会失效或报错。 */
export const MODEL_SYNTAX = [
  { token: '--ar', model: 'midjourney' },
  { token: '--style raw', model: 'midjourney' },
  { token: '--no', model: 'midjourney' },
  { token: '--sref', model: 'midjourney' },
  { token: '--oref', model: 'midjourney' },
  { token: '--stylize', model: 'midjourney' },
  { token: 'negative_prompt', model: 'sd' },
  { token: 'guidance_scale', model: 'local' },
]

/** 题材判定：人文/民俗类需要「反 CG」收尾。 */
export const DOCUMENTARY_PATTERN =
  /纪实|民俗|手艺人|匠人|传统|庙会|老街|乡村|documentary|film still|craftsman|artisan|folk/i

/** 视频任务判定。 */
export const VIDEO_TASK_PATTERN =
  /animate|first frame|image-to-video|text-to-video|motion|seconds|duration|视频|图生视频|文生视频|镜头运动|运镜|秒/i

/** 开口说话类描述：会让视频模型真配音。 */
export const SPEECH_PATTERN =
  /\b(speak\w*|talk\w*|say\w*|said|whisper\w*|dialogue|voice|mouth open|opens? (?:her|his|their) mouth)\b|说话|开口|讲话|对话|嘴微张|嘴唇动/i

/** 静音守卫句。 */
export const SILENCE_GUARD_PATTERN =
  /(no dialogue|no voice|no speech|no audio|silent|mouth (?:stays? )?closed|no lip movement)|无声|静音|不发声/i

/** 头部动作：图生视频会重画脸。 */
export const HEAD_TURN_PATTERN =
  /\b(turns? (?:her|his|their) head|tilts? (?:her|his) head|lifts? (?:her|his) head|turns? around|raises? (?:her|his) head)\b|转头|抬头|转身/i

/** 尘雾诱饵词。 */
export const ATMOSPHERE_BAIT_PATTERN = /(dust shifts?|dust lifts?|dust drifts?|haze|smoke|plume|fog)/i

/** 尘雾禁止句。 */
export const ATMOSPHERE_GUARD_PATTERN = /(no (?:dust|steam|smoke|haze|plume|fog)|no dust cloud)/i

/** 竖屏需求线索。 */
export const VERTICAL_WANT_PATTERN = /抖音|douyin|竖屏|vertical|9:16|9：16/i

/** 竖屏画幅已写。 */
export const VERTICAL_HAVE_PATTERN = /(vertical|9:16|9：16|portrait|1080x1920|1080×1920)/i

/** 序数指认图片（不可靠）。 */
export const ORDINAL_IMAGE_PATTERN = /第[一二三四五六七八九十\d]+张(图|照片)|image\s*[1-9]\b/i

/** 允许作为开头的镜头/介质型词：这类开门句本身就在指定拍摄方式。 */
export const SHOT_OPENER_PATTERN =
  /^(live-action|documentary|candid|cinematic|close-up|closeup|medium|wide|full|editorial|studio|product|street|architectural|macro|aerial|locked-off|handheld|static)\b/i

/** 版本文件名模式。 */
export const VERSION_FILE_PATTERN = /^v(\d+)\.md$/i

/** 危险路径段（目录穿越）。 */
export const RESERVED_SEGMENTS = new Set(['', '.', '..'])
