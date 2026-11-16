import type { Company, LevelId, Model } from '../types'
import { isFirstParty, companyLabel } from './data'
import { blendedCost, getAnchorCost, tierOf } from './price'
import { daysSince, parseDate } from './timeline'

/**
 * 「此刻概览」的计算：把用户最想问的三个问题直接从数据里回答出来，
 * 全部基于当前排序后的模型列表（已筛选），因此会和筛选条件联动。
 */
export interface HotTake {
  model: Model
  company?: Company
  /** 距今多少天 */
  days: number
}

export interface Insights {
  /** 最新一次旗舰发布 */
  latestFlagship?: HotTake
  /** 当前最便宜的第一方模型（按倍率） */
  cheapest?: { model: Model; tierLabel: string; symbol: string; color: string }
  /** 平均多少天就有一次第一方发布 */
  cadenceDays: number | null
  /** 过去 30 天的发布数 */
  last30: number
  /** 前 30 天对应的上一个月发布数，用于给出变化 */
  prev30: number
  /** 梯队分布 */
  byLevel: Record<'flagship' | 'major', number>
  /** 当前筛选覆盖的公司数 */
  companies: number
  /** 最近 30 天有发布的公司数 */
  activeCompanies30: number
  since: number | null
}

export function buildInsights(
  models: Model[],
  opts: {
    companyOf: (id: string) => Company | undefined
    referenceDate: string
  },
): Insights {
  const { companyOf, referenceDate } = opts
  const ref = parseDate(referenceDate)
  const day = 86_400_000

  const latestFlagshipModel = models
    .filter((m) => m.level === 'flagship')
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0]

  const anchor = getAnchorCost(models.length ? models : [])
  let cheapest: Insights['cheapest']
  if (anchor) {
    for (const m of models) {
      if (!isFirstParty(m)) continue
      const cost = blendedCost(m)
      if (cost === null) continue
      const tier = tierOf(cost / anchor)
      if (!cheapest || cost < blendedCost(cheapest.model)!) cheapest = { model: m, tierLabel: tier.label, symbol: tier.symbol, color: tier.color }
    }
  }

  const firstParty = models.filter(isFirstParty)
  const span = firstParty.length
    ? (ref - parseDate(firstParty[firstParty.length - 1].releaseDate)) / day
    : 0
  const cadenceDays =
    firstParty.length > 1 && span > 0 ? Math.round(span / (firstParty.length - 1)) : null

  const last30 = models.filter((m) => daysSince(m.releaseDate, referenceDate) < 30).length
  const prev30 = models.filter((m) => {
    const d = daysSince(m.releaseDate, referenceDate)
    return d >= 30 && d < 60
  }).length

  const byLevel = { flagship: 0, major: 0 } as Record<'flagship' | 'major', number>
  for (const m of models) {
    if (m.level === 'flagship') byLevel.flagship++
    else if (m.level === 'major') byLevel.major++
  }

  const years = models.map((m) => Number(m.releaseDate.slice(0, 4)))
  const companies = new Set(models.map((m) => m.company)).size
  // 近 30 天真正有动作的厂商数：比“总数”更能说明当下谁在卷
  const activeCompanies30 = new Set(
    models
      .filter((m) => daysSince(m.releaseDate, referenceDate) < 30)
      .map((m) => m.company),
  ).size

  return {
    latestFlagship: latestFlagshipModel
      ? {
          model: latestFlagshipModel,
          company: companyOf(latestFlagshipModel.company),
          days: daysSince(latestFlagshipModel.releaseDate, referenceDate),
        }
      : undefined,
    cheapest,
    cadenceDays,
    last30,
    prev30,
    byLevel,
    companies,
    activeCompanies30,
    since: years.length ? Math.min(...years) : null,
  }
}

export function companyName(company: Company | undefined, fallback = '未知厂商'): string {
  return companyLabel(company, fallback)
}

export type { LevelId }
