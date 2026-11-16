import type { Model } from '../types'
import dataset from '../data/models.json'
import { parseDate } from './timeline'

export interface RaceLane {
  company: string
  /** 最新一代模型名 */
  latest: string
  /** 世代家族名，例如 Muse Spark、Claude、GPT */
  family: string
  /** 相邻两代的间隔中位数（天）：越小说明迭代越快 */
  cadenceDays: number | null
  /** 最近一次发布距参考日期的天数 */
  daysSinceLast: number
  /** 本泳道最新旗舰 */
  flagship?: Model
  /** 该厂商在时间轴上的主力模型序列（按时间升序） */
  models: Model[]
}

/**
 * 世代主线：每家头部厂商取“主力对话模型”序列，
 * 用于对比各家的迭代节奏（版本号递增 + 时间间隔）。
 * 只挑代表性旗舰/重要模型，避免 Flash / Image 等分支干扰叙事。
 */
const MAINLINE: Record<string, RegExp> = {
  // 每条正则对应一家厂商的“主力对话模型主线”，从早期版本一直到当前旗舰
  openai: /^(GPT-3\.5|GPT-4|GPT-5|GPT_5|GPT 5|GPT 6|OpenAI o1)/i,
  anthropic: /^Claude /i,
  google: /^Gemini \d/,
  xai: /^Grok ?\d/,
  deepseek: /^DeepSeek (V|R)/,
  moonshot: /^Kimi K/,
  zhipu: /^GLM[- ]?[45]/,   // GLM-4.7 与 GLM 5.3 两种写法
  xiaomi: /^MiMo V2\.(5|6)/,
  alibaba: /^Qwen(-| )?[1234]/,
  minimax: /^MiniMax M/,
  tencent: /^Hy\d/,
  meta: /^(Llama |Muse )/,   // 2026 年起由 Llama 改名 Muse 系列
  mistral: /^(Mistral|Mixtral)/,
  bytedance: /^Doubao Seed/,
  baidu: /^ERNIE /,
  stepfun: /^Step \d/,
  nvidia: /^Nemotron \d/,
  cohere: /^(Command|North) /,
  sakana: /^(Fugu|Sakana Namazu)/,
  inception: /^Mercury /,
  huawei: /^openPangu /,
  meituan: /^LongCat /,
  inclusionai: /^Ling /,
  thinkingmachines: /^Inkling/,
}

/** 已知的双词家族名：这些前缀必须连在一起才可识别 */
const TWO_WORD_FAMILY = ['Muse Spark', 'Doubao Seed', 'MiniMax M', 'Mistral Large']

/**
 * 推导世代家族名（右侧标签）。统一规则：取最新模型名的“前两个非版本词”，
 * 但若第二个词只是修饰语（Turbo / Flash / Pro / Preview / Omni 等），则丢弃。
 * - "Muse Ember"        → head="Muse", tail="Ember" → 命中 TWO_WORD_FAMILY → "Muse Spark"
 * - "Claude Fable 5.2"  → "Claude"
 * - "Kimi K3.1"         → "Kimi"
 */
function familyName(sorted: Model[]): string {
  const newest = sorted[sorted.length - 1].name
  const head = newest.split(/\s+/)[0]
  const family = TWO_WORD_FAMILY.find((f) => f.split(' ')[0].toLowerCase() === head.toLowerCase())
  return family ?? head
}

export function buildRaceLanes(
  models: Model[],
  rankOf: (id: string) => number,
  /** 参考日期（YYYY-MM-DD），默认取数据集 lastUpdated */
  referenceDate: string = dataset.lastUpdated,
): RaceLane[] {
  const refMs = parseDate(referenceDate)
  const byCompany = new Map<string, Model[]>()
  for (const m of models) {
    if (m.category !== 'chat') continue
    const re = MAINLINE[m.company]
    if (!re || !re.test(m.name)) continue
    const list = byCompany.get(m.company) ?? []
    list.push(m)
    byCompany.set(m.company, list)
  }

  const lanes: RaceLane[] = []
  for (const [company, list] of byCompany) {
    const sorted = [...list].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    const newestModel = sorted[sorted.length - 1]
    const newest = newestModel?.name ?? ''

    // 家族名：取所有名字共有的前缀词（忽略版本号），
    // 例如 Llama 2/Llama 4/Muse Spark/Muse Ember → "Muse"，GPT 4/GPT 6 → "GPT"。
    // 遇到改名（Llama → Muse）时以最新一代为准，所以从 newest 往前取词。
    const family = familyName(sorted)

    // 迭代节奏：相邻两代的间隔中位数，比“总代数”更能反映真实的研发速度
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const d = (parseDate(sorted[i].releaseDate) - parseDate(sorted[i - 1].releaseDate)) / 86400000
      if (d > 0) gaps.push(d)
    }
    gaps.sort((a, b) => a - b)
    const cadenceDays = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null
    const daysSinceLast = Math.round((refMs - parseDate(newestModel.releaseDate)) / 86400000)

    lanes.push({
      company,
      latest: newest,
      family,
      cadenceDays,
      daysSinceLast,
      flagship: [...sorted].reverse().find((m) => m.level === 'flagship'),
      models: sorted,
    })
  }
  // 按公认实力排名排序，符合用户对“谁更强”的直觉
  return lanes.sort((a, b) => rankOf(a.company) - rankOf(b.company))
}
