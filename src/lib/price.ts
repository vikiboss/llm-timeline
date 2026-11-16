import type { Model } from '../types'

/** 换算锚点：GPT-5.2 的混合成本记为 1×，便于用户建立参照 */
const ANCHOR_NAME = 'GPT 5.2'
/** 基准价模型的中文展示名 */
export const ANCHOR_LABEL = 'GPT-5.2'

/** 混合成本估算：典型对话场景下输出 token 约为输入的 1/3，故 input×3 + output */
export function blendedCost(m: Model): number | null {
  if (!m.cost) return null
  const { input, output } = m.cost
  if (typeof input !== 'number' || typeof output !== 'number') return null
  const v = input * 3 + output
  return v > 0 ? v : null
}

let anchorCache: number | null | undefined
export function getAnchorCost(models: Model[]): number | null {
  if (anchorCache !== undefined) return anchorCache
  const a = models.find((m) => m.name === ANCHOR_NAME && m.cost)
  anchorCache = a ? blendedCost(a) : null
  return anchorCache
}

export interface PriceTier {
  /** 倍率下限（含） */
  min: number
  /** 倍率上限（不含） */
  max: number
  label: string
  /** 色阶，从廉到贵 */
  color: string
  /** 美元符号档位，便于快速感知 */
  symbol: string
  /** 中文相对描述，用于列表内快速感知（对标 GPT-5.2 基准价） */
  relative: string
}

/** 七档倍率：对数分布，覆盖 0.01× ~ 50× */
export const PRICE_TIERS: PriceTier[] = [
  { min: 0, max: 0.05, label: '极廉价', color: '#4cc9f0', symbol: '$', relative: '仅约 1/20 价' },
  { min: 0.05, max: 0.15, label: '很便宜', color: '#5ec8b0', symbol: '$', relative: '约 1/10 价' },
  { min: 0.15, max: 0.4, label: '便宜', color: '#8ed36a', symbol: '$$', relative: '约 1/3 价' },
  { min: 0.4, max: 0.9, label: '适中', color: '#c6f24e', symbol: '$$', relative: '低于基准价' },
  { min: 0.9, max: 2.5, label: '基准价', color: '#ffd23f', symbol: '$$$', relative: '接近基准价' },
  { min: 2.5, max: 8, label: '偏贵', color: '#ff9f45', symbol: '$$$$', relative: '基准价 2–8 倍' },
  { min: 8, max: Infinity, label: '昂贵', color: '#ff6b6b', symbol: '$$$$$', relative: '基准价 10 倍以上' },
]

export function tierOf(mult: number): PriceTier {
  return PRICE_TIERS.find((t) => mult >= t.min && mult < t.max) ?? PRICE_TIERS[PRICE_TIERS.length - 1]
}

/** 倍率格式化：小于 0.1 保留两位小数，其余保留一位 */
export function formatMultiplier(mult: number): string {
  if (mult < 0.01) return '<0.01×'
  if (mult < 0.1) return `${mult.toFixed(2)}×`
  if (mult < 10) return `${mult.toFixed(1)}×`
  return `${Math.round(mult)}×`
}

/** 混合成本换算成「约 $X / 百万 token」，便于建立绝对量级感知 */
export function formatCostUSD(cost: number): string {
  if (cost < 0.1) return `$${cost.toFixed(2)}`
  if (cost < 10) return `$${cost.toFixed(1)}`
  return `$${Math.round(cost)}`
}
