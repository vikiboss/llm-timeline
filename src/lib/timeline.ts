import type { CategoryId, LevelId, ModalityId, Model, MonthGroup } from '../types'
import { getCompany, getLevel } from './data'

export const MONTH_NAMES = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

/** 解析 YYYY-MM-DD 为本地时间戳（避免时区偏移） */
export function parseDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime()
}

/**
 * YYYY-MM → 2026 年 9 月。
 * 默认在「与数据基准年相同」时省略年份；需要绝对时间（如统计峰值）时传 alwaysYear。
 */
export function formatMonth(key: string, opts?: { alwaysYear?: boolean }): string {
  const [y, m] = key.split('-').map(Number)
  const thisYear = new Date().getFullYear()
  if (opts?.alwaysYear || y !== thisYear) return `${y} 年 ${m} 月`
  return `${m} 月`
}

export function formatDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export function formatFullDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

/** 本地「今天」的 YYYY-MM-DD（不受时区/UTC 偏移影响） */
export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 距参照日的天数：reference 晚于 date 为正数 */
export function daysSince(date: string, reference: string): number {
  return Math.round((parseDate(reference) - parseDate(date)) / 86_400_000)
}

export function relativeTime(date: string, reference: string): string {
  const days = daysSince(date, reference)
  // 未来日期（尚未发布）不做相对描述，直接给绝对日期
  if (days < 0) return formatDate(date)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.round(days / 7)} 周前`
  if (days < 365) return `${Math.round(days / 30)} 个月前`
  return `${(days / 365).toFixed(1)} 年前`
}

export function levelWeight(level: LevelId): number {
  return getLevel(level)?.weight ?? 0
}

export interface ModelFilters {
  /** 空集合表示不限制 */
  companies: Set<string>
  levels: Set<LevelId>
  modalities: Set<ModalityId>
  /** 模型分类；空集合表示不限制 */
  categories: Set<CategoryId>
  query: string
}

export function filterModels(models: Model[], f: ModelFilters): Model[] {
  const q = f.query.trim().toLowerCase()
  return models.filter((m) => {
    if (f.companies.size && !f.companies.has(m.company)) return false
    if (f.levels.size && !f.levels.has(m.level)) return false
    if (f.modalities.size && !m.inputs.some((i) => f.modalities.has(i)))
      return false
    if (f.categories.size && !f.categories.has(m.category)) return false
    if (q && !matchesQuery(m, q)) return false
    return true
  })
}

/** 搜索命中：模型名 / id / 厂商中英文名 / 家族别名，忽略空格与连字符 */
function matchesQuery(m: Model, q: string): boolean {
  const company = getCompany(m.company)
  const parts = [m.name, m.id, company?.name ?? '', company?.nameZh ?? '']
  // 统一分隔符：让 "qwen4"、"qwen 4"、"qwen-4" 都能命中同一个模型
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
  const needle = norm(q)
  if (parts.some((h) => h.toLowerCase().includes(q))) return true
  if (norm(parts.join(' ')).includes(needle)) return true
  // 备注仅做单词级匹配，避免长句稀释命中精度
  return needle.length >= 3 && (m.note ?? '').toLowerCase().includes(q)
}

/** 按发布时间倒序排序 */
export function sortByDateDesc(models: Model[]): Model[] {
  return [...models].sort(
    (a, b) =>
      b.releaseDate.localeCompare(a.releaseDate) ||
      levelWeight(b.level) - levelWeight(a.level) ||
      a.name.localeCompare(b.name),
  )
}

/** 按月份分组（保持输入顺序） */
export function groupByMonth(models: Model[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  const index = new Map<string, MonthGroup>()
  for (const m of models) {
    const [y, mo] = m.releaseDate.split('-').map(Number)
    const key = `${y}-${String(mo).padStart(2, '0')}`
    let g = index.get(key)
    if (!g) {
      g = { key, year: y, month: mo, label: `${y} 年 ${MONTH_NAMES[mo - 1]}`, events: [] }
      index.set(key, g)
      groups.push(g)
    }
    g.events.push(m)
  }
  return groups
}

export function uniqueDates(models: Model[]): string[] {
  return [...new Set(models.map((m) => m.releaseDate))].sort((a, b) => b.localeCompare(a))
}
