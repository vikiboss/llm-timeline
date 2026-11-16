import { Icon } from './Icon'
import { LEVEL_STYLES } from './tokens'
import { companyLabel } from '../lib/data'
import { buildInsights } from '../lib/insights'
import type { Company, Model } from '../types'
import { formatMonth, relativeTime } from '../lib/timeline'

interface InsightsBarProps {
  /** 当前筛选结果 */
  models: Model[]
  companyOf: (id: string) => Company | undefined
  referenceDate: string
  onSelect: (model: Model) => void
}

/** 单个指标卡：标签 + 主信息 + 次信息，整体可点击 */
function Stat({
  eyebrow,
  onClick,
  children,
  accent,
}: {
  eyebrow: string
  onClick?: () => void
  children: React.ReactNode
  accent?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  // button 的默认 type 是 submit，统一显式声明，避免将来嵌进表单时意外提交
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`group relative flex min-w-0 flex-col justify-between gap-2 bg-[var(--surface)] px-3 py-2.5 text-left sm:px-3.5 sm:py-3 ${
        onClick ? 'cursor-pointer transition-colors hover:bg-[var(--surface-2)]' : ''
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-[var(--fg-4)] uppercase">
        {accent && <span className="h-1.5 w-1.5 rounded-xs" style={{ background: accent }} />}
        {eyebrow}
      </span>
      {children}
    </Tag>
  )
}

/**
 * 此刻概览：回答「最新旗舰是谁 / 谁最便宜 / 发布有多快」三个问题。
 * 与筛选联动，因此筛选中国厂商时数字会跟着变。
 */
export function InsightsBar({
  models,
  companyOf,
  referenceDate,
  onSelect,
}: InsightsBarProps) {
  const insights = buildInsights(models, { companyOf, referenceDate })
  const { latestFlagship, cheapest, cadenceDays, last30, prev30, activeCompanies30, since } = insights

  const trend = last30 - prev30
  const trendLabel =
    trend === 0 ? '与上月持平' : trend > 0 ? `较上月 +${trend}` : `较上月 ${trend}`
  // 峰值月份：统计当前筛选下的发布密度（文案带年份，避免「9 月」指代不明）
  const monthCounts = new Map<string, { count: number; label: string }>()
  for (const m of models) {
    const key = m.releaseDate.slice(0, 7)
    const cur = monthCounts.get(key)
    if (cur) cur.count++
    else monthCounts.set(key, { count: 1, label: formatMonth(key, { alwaysYear: true }) })
  }
  const busiest = [...monthCounts.values()].sort((a, b) => b.count - a.count)[0]
  return (
    <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--surface)]">
      {/* 桌面四格等宽；小屏 2×2，避免把「19 次发布」挤成竖排 */}
      <div className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
        {/* 1. 最新旗舰 */}
        <Stat
          eyebrow="最新旗舰"
          accent={LEVEL_STYLES.flagship.signal}
          onClick={latestFlagship ? () => onSelect(latestFlagship.model) : undefined}
        >
          {latestFlagship ? (
            <>
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon
                  name={latestFlagship.model.icon ?? latestFlagship.company?.icon ?? 'openai'}
                  size={15}
                  color={latestFlagship.company?.color}
                  preferColor
                />
                <span className="min-w-0 truncate text-[13.5px] font-semibold text-white group-hover:text-[var(--accent)]">
                  {latestFlagship.model.name}
                </span>
              </span>
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--fg-4)]">
                {companyLabel(latestFlagship.company, '')} ·{' '}
                {relativeTime(latestFlagship.model.releaseDate, referenceDate)}
              </span>
            </>
          ) : (
            <span className="text-[12px] text-[var(--fg-4)]">当前筛选内无旗舰</span>
          )}
        </Stat>

        {/* 2. 最便宜 */}
        <Stat eyebrow="最便宜的旗舰级选择">
          {cheapest ? (
            <>
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="rounded-xs px-1 py-px font-mono text-[10px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${cheapest.color} 16%, transparent)`,
                    color: cheapest.color,
                  }}
                >
                  {cheapest.symbol}
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(cheapest.model)}
                  className="min-w-0 cursor-pointer truncate text-[13.5px] font-semibold text-white hover:text-[var(--accent)]"
                >
                  {cheapest.model.name}
                </button>
              </span>
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--fg-4)]">
                {cheapest.tierLabel} · 对比基准价
              </span>
            </>
          ) : (
            <span className="text-[12px] text-[var(--fg-4)]">筛选内暂无公开定价</span>
          )}
        </Stat>

        {/* 3. 发布节奏（含密集度趋势，回答「现在是不是更卷了」） */}
        <Stat eyebrow="最近 30 天">
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-mono text-[19px] leading-none font-semibold text-white tabular-nums">
              {last30}
            </span>
            <span className="text-[11px] whitespace-nowrap text-[var(--fg-3)]">次发布</span>
            <span
              className={`text-[10.5px] whitespace-nowrap ${
                trend > 0 ? 'text-[var(--accent)]' : 'text-[var(--fg-4)]'
              }`}
            >
              {trendLabel}
            </span>
          </span>
          <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--fg-4)]">
            {activeCompanies30} 家出手 · 上月 {prev30} 次
          </span>
        </Stat>

        {/* 4. 迭代速度：各家推出新一版的平均间隔，回答「行业节奏有多快」 */}
        <Stat eyebrow="迭代节奏" accent={LEVEL_STYLES.major.signal}>
          {cadenceDays === null ? (
            <span className="text-[12px] text-[var(--fg-4)]">样本不足</span>
          ) : (
            <>
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-[19px] leading-none font-semibold text-white tabular-nums">
                  {cadenceDays}
                </span>
                <span className="text-[11px] whitespace-nowrap text-[var(--fg-3)]">天 / 次</span>
              </span>
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--fg-4)]">
                {since ?? '—'} 年至今 · 峰值 {busiest ? `${busiest.count} 次` : '—'}
              </span>
            </>
          )}
        </Stat>
      </div>
    </div>
  )
}
