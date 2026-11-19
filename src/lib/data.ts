import companiesJson from '../data/companies.json'
import modelsJson from '../data/models.json'
import modalitiesJson from '../data/modalities.json'
import levelsJson from '../data/levels.json'
import type { Category, Company, Dataset, Level, Modality, Model } from '../types'

export const dataset = modelsJson as unknown as Dataset
export const companies = companiesJson as Company[]
export const modalities = modalitiesJson as Modality[]
export const levels = levelsJson as Level[]

export const categories: Category[] = [
  { id: 'chat', name: '对话', nameEn: 'Chat' },
  { id: 'code', name: '代码', nameEn: 'Code' },
  { id: 'image', name: '图像', nameEn: 'Image' },
  { id: 'video', name: '视频', nameEn: 'Video' },
  { id: 'audio', name: '音频', nameEn: 'Audio' },
  { id: 'world', name: '世界模型', nameEn: 'World' },
  { id: 'speech', name: '语音', nameEn: 'Speech' },
  { id: 'embedding', name: '向量', nameEn: 'Embedding' },
  { id: 'decision', name: '决策', nameEn: 'Decision' },
]

const companyMap = new Map(companies.map((c) => [c.id, c]))
const levelMap = new Map(levels.map((l) => [l.id, l]))
const modalityMap = new Map(modalities.map((m) => [m.id, m]))
const categoryMap = new Map(categories.map((c) => [c.id, c]))

export function getCompany(id: string): Company | undefined {
  return companyMap.get(id)
}

/**
 * 公司展示名：中文语境下优先用 nameZh（如「腾讯 混元」），
 * 海外厂商的 nameZh 与 name 相同，自然回落为英文品牌。
 */
export function companyLabel(company: Company | undefined, fallback = '未知'): string {
  if (!company) return fallback
  return company.nameZh?.trim() || company.name
}

/**
 * 国内厂商默认名（拉丁品牌名，小写）——即使用户更熟悉品牌，也优先用中文。
 * 例：DeepSeek 用「DeepSeek」（公司仍叫深度求索）、MiniMax 用「MiniMax」。
 * 不在表内的中文厂商按「中文优先 + 知名度」取段，通常就是公司名本身。
 */
const LATIN_FIRST = new Set(['deepseek', 'minimax'])

/**
 * 列表场景的短名。两段式 nameZh 常把「公司名 + 产品品牌」并列，
 * 窄列里容易被截成「深度求索 De…」，所以在这里挑一段显示。
 *
 * 原则：尊重原名——不改写、不音译、不造词，优先用数据里真实写过的名字。
 * 国内厂商按「中文优先 + 知名度」取值（蚂蚁 / 腾讯 / 通义千问 / 文心 …），
 * 只有品牌名本身更响且无需翻译时才保留拉丁（DeepSeek / MiniMax）。
 *
 * 优先级：
 * 1. companies.json 显式声明的 shortNameZh —— 唯一权威来源；
 * 2. 名称本身就是单段 / 纯拉丁 → 原样返回，不做任何缩写；
 * 3. 两段式「中文 + 拉丁」→ 中文厂商取中文段（多段时取最短、最知名的那段），
 *    仅当拉丁品牌属于 LATIN_FIRST 时才保留拉丁；
 * 4. 其余混合情况 → 保留全名（宁长勿错）。
 */
export function companyShortLabel(company: Company | undefined, fallback = '未知'): string {
  if (!company) return fallback
  const full = companyLabel(company, fallback)

  const declared = company.shortNameZh?.trim()
  if (declared) return declared

  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return full

  const cjk = parts.filter((p) => /[\u4e00-\u9fa5]/.test(p))
  const latin = parts.filter((p) => /[A-Za-z]/.test(p))

  // 纯拉丁名称（OpenAI / Mistral AI）：原样保留，避免凭空缩写
  if (cjk.length === 0) return full
  // 两段都是中文（腾讯 混元）：短名更含糊，保留全名
  if (latin.length === 0) return full

  const brand = latin.join(' ')
  if (LATIN_FIRST.has(brand.toLowerCase())) return brand

  // 中文厂商：取最短的中文段（通常是公司/品牌本身），再长就保留全名
  const zh = cjk.reduce((a, b) => (b.length < a.length ? b : a))
  return zh.length >= 2 ? zh : brand
}

/** 厂商实力排名（缺省则排到最后） */
export function getCompanyRank(id: string): number {
  return getCompany(id)?.rank ?? 999
}

/** 按 id 取等级 / 输入类型 / 分类定义 */
export function getLevel(id: string): Level | undefined {
  return levelMap.get(id as Level['id'])
}

export function getModality(id: string): Modality | undefined {
  return modalityMap.get(id as Modality['id'])
}

export function getCategory(id: string): Category | undefined {
  return categoryMap.get(id as Category['id'])
}

/** 仅保留数据中实际出现过的公司，并按公认实力排名排序 */

export function getActiveCompanies(models: Model[]): Company[] {
  const latest = new Map<string, string>()
  for (const m of models) {
    const cur = latest.get(m.company)
    if (!cur || m.releaseDate > cur) latest.set(m.company, m.releaseDate)
  }
  // 统一按公认实力排名排序，避免“筛选后顺序突变”
  return companies
    .filter((c) => latest.has(c.id))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}

export const allModels = dataset.models

/**
 * 是否为第一方（原厂）发布。
 * 本地数据集只收录原厂首发，因此无法区分时按第一方处理；
 * 主要留作未来收录转售平台 / 社区微调时的扩展点。
 */
export function isFirstParty(model: Model): boolean {
  return model.source !== 'third-party'
}

/** 最早一条数据所属年份，用于「从哪一年开始」的文案 */
export function launchYear(): number {
  const years = allModels.map((m) => Number(m.releaseDate.slice(0, 4)))
  return years.length ? Math.min(...years) : new Date().getFullYear()
}
