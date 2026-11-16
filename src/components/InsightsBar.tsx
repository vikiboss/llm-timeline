import { Icon } from './Icon'
import { Arrow, Panel } from './ui'
import { LEVEL_STYLES } from './tokens'
import { companyLabel } from '../lib/data'
import { buildInsights } from '../lib/insights'
import type { Company, Model } from '../types'
import { relativeTime } from '../lib/timeline'

interface InsightsBarProps {
  models: Model[]
  companyOf: (id: string) => Company | undefined
  referenceDate: string
  onSelect: (model: Model) => void
}

function Stat({
  eyebrow,
  onClick,
  children,
  mark,
}: {
  eyebrow: string
  onClick?: () => void
  children: React.ReactNode
  mark?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`group relative flex min-w-0 flex-col justify-between gap-2 px-4 py-3.5 text-left sm:px-5 ${
        onClick ? 'cursor-pointer transition-colors hover:bg-[var(--sunken)]' : ''
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.1em] text-[var(--ink-4)] uppercase">
        {mark && <span className="h-1.5 w-1.5 rounded-full" style={{ background: mark }} />}
        {eyebrow}
      </span>
      {children}
    </Tag>
  )
}

/** 数字主信息：超大等宽数字，是整页的“结论区” */
function Big({ value, unit, tone }: { value: React.ReactNode; unit?: string; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className="tnum text-[30px] leading-none font-semibold tracking-[-0.04em] sm:text-[34px]"
        style={{ color: tone ?? 'var(--ink)' }}
      >
        {value}
      </span>
      {unit && <span className="text-[11.5px] font-medium text-[var(--ink-3)]">{unit}</span>}
    </span>
  )
}

/**
 * 此刻概览：四个大字结论。
 * 版面逻辑是「先结论、后细节」，所以数字用 30px+，而解释性文字压到 10.5px。
 */
export function InsightsBar({ models, companyOf, referenceDate, onSelect }: InsightsBarProps) {
  const insights = buildInsights(models, { companyOf, referenceDate })
  const { latestFlagship, cheapest, cadenceDays, last30, prev30, activeCompanies30, since } = insights

  const trend = last30 - prev30
  const trendLabel = trend === 0 ? '持平上月' : trend > 0 ? `↑ ${trend} 较上月` : `↓ ${-trend} 较上月`

  return (
    <Panel label="此刻概览">
      <div className="grid grid-cols-2 divide-[var(--line)] *:border-[var(--line)] max-sm:*:border-b max-sm:*:odd:border-r sm:grid-cols-4 sm:divide-x">
        {/* 1 · 最新旗舰 */}
        <Stat
          eyebrow="最新旗舰"
          mark={LEVEL_STYLES.flagship.signal}
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
                <span className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
                  {latestFlagship.model.name}
                </span>
                <span className="arrow-slide ml-auto text-[var(--ink-3)]">
                  <Arrow size={10} />
                </span>
              </span>
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--ink-4)]">
                {companyLabel(latestFlagship.company, '')} ·{' '}
                {relativeTime(latestFlagship.model.releaseDate, referenceDate)}
              </span>
            </>
          ) : (
            <span className="text-[12.5px] text-[var(--ink-4)]">当前筛选内无旗舰</span>
          )}
        </Stat>

        {/* 2 · 最便宜 */}
        <Stat eyebrow="最便宜的旗舰级">
          {cheapest ? (
            <>
              <button
                type="button"
                onClick={() => onSelect(cheapest.model)}
                className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left"
              >
                <span
                  className="flex-none rounded-xs px-1 py-px font-mono text-[10px] font-bold tracking-[-0.08em]"
                  style={{ background: `color-mix(in srgb, ${cheapest.color} 12%, transparent)`, color: cheapest.color }}
                >
                  {cheapest.symbol}
                </span>
                <span className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--accent)]">
                  {cheapest.model.name}
                </span>
              </button>
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--ink-4)]">
                {cheapest.tierLabel} · 对比基准价
              </span>
            </>
          ) : (
            <span className="text-[12.5px] text-[var(--ink-4)]">筛选内暂无公开定价</span>
          )}
        </Stat>

        {/* 3 · 最近 30 天 */}
        <Stat eyebrow="最近 30 天">
          <span className="flex items-baseline gap-2">
            <Big value={last30} unit="次发布" />
            <span
              className={`text-[10.5px] font-medium ${
                trend > 0 ? 'text-[var(--accent)]' : 'text-[var(--ink-4)]'
              }`}
            >
              {trendLabel}
            </span>
          </span>
          <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--ink-4)]">
            {activeCompanies30} 家出手 · 上月 {prev30}
          </span>
        </Stat>

        {/* 4 · 迭代节奏 */}
        <Stat eyebrow="迭代节奏" mark={LEVEL_STYLES.major.signal}>
          {cadenceDays === null ? (
            <span className="text-[12.5px] text-[var(--ink-4)]">样本不足</span>
          ) : (
            <>
              <Big value={cadenceDays} unit="天 / 次" />
              <span className="truncate font-mono text-[10.5px] whitespace-nowrap text-[var(--ink-4)]">
                {since ?? '—'} 年至今 · 全行业平均间隔
              </span>
            </>
          )}
        </Stat>
      </div>
    </Panel>
  )
}
