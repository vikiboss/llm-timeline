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
 * 列表场景的短名。两段式 nameZh 常把「公司名 + 产品品牌」并列，
 * 窄列里容易被截成「深度求索 De…」，所以在这里挑一段显示。
 *
 * 规则：产品品牌优先——用户谈模型时说「Kimi」「GLM」「MiMo」，很少说「月之暗面」。
 * 因此维护一份显式的品牌前缀白名单，而不是靠字符长度猜。
 */
const BRAND_FIRST = new Set([
  'kimi',
  'glm',
  'mimo',
  'longcat',
  'ling',
  'step',
  'ernie',
  'hunyuan',
  'qwen',
  'doubao',
  'pangu',
])

export function companyShortLabel(company: Company | undefined, fallback = '未知'): string {
  const full = companyLabel(company, fallback)
  const parts = full.split(/\s+/)
  if (parts.length < 2) return full
  const cjk = parts.filter((p) => /[\u4e00-\u9fa5]/.test(p))
  const latin = parts.filter((p) => /[A-Za-z]/.test(p))
  // 两段都是中文（腾讯 混元）：短名更含糊，保留全名
  if (cjk.length === 0 || latin.length === 0) return full
  const brand = latin.join(' ')
  if (BRAND_FIRST.has(brand.toLowerCase())) return brand
  const zh = cjk.join(' ')
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
