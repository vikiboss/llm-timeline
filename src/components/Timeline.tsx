import { useEffect, useState } from 'react'
import { TimelineCard } from './TimelineCard'
import { LEVEL_STYLES } from './tokens'
import type { Company, Model, MonthGroup } from '../types'
import { formatDate } from '../lib/timeline'

interface TimelineProps {
  groups: MonthGroup[]
  companyOf: (id: string) => Company | undefined
  referenceDate: string
  onSelect: (model: Model) => void
  onReset: () => void
  totalModels: number
  /** 吸顶栏渲染钩子：把「当前月份」交还给上层年份条，两者共用一条吸顶层 */
  renderNav: (props: { retracted: boolean; activeMonth?: MonthGroup }) => React.ReactNode
}

export function Timeline({
  groups,
  companyOf,
  referenceDate,
  onSelect,
  onReset,
  totalModels,
  renderNav,
}: TimelineProps) {
  // 滚动方向 → 收起吸顶年份条（手机省高度）。只在这里维护一份状态，
  // 年份条与月份标签都从它派生，结构上不会出现「两层之间空一截」。
  const [retracted, setRetracted] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(groups[0]?.key ?? null)

  // 只在窄屏收起：桌面端年份条是常驻导航，收起反而让月份标签悬空
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    let lastY = window.scrollY
    const onScroll = () => {
      if (!mq.matches) {
        setRetracted(false)
        return
      }
      const y = window.scrollY
      const delta = y - lastY
      if (Math.abs(delta) < 8) return
      setRetracted(delta > 0 && y > 200)
      lastY = y
    }
    const onChange = () => setRetracted(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    mq.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', onChange)
    }
  }, [])

  // 当前月份：进入视口最靠上的那个月份标签
  useEffect(() => {
    if (groups.length === 0) return
    const nodes = groups
      .map((g) => document.getElementById(`month-${g.key}`))
      .filter((n): n is HTMLElement => Boolean(n))
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActiveKey(top.target.id.replace('month-', ''))
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [groups])

  const activeMonth = groups.find((g) => g.key === activeKey)
  if (groups.length === 0) {
    // 空状态不再用视口高度占位（46vh 与有结果时差异过大，会让上方内容突然“变短”），
    // 改为固定像素高度，与一屏时间轴大致相当。
    return (
      <div className="flex min-h-[560px] flex-col items-center justify-center rounded-sm border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
        <p className="text-[13px] text-[var(--fg-2)]">没有符合条件的发布</p>
        <p className="mt-1 text-[11.5px] text-[var(--fg-4)]">试试放宽公司、分级或输入类型</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 cursor-pointer rounded-xs border border-[var(--line-2)] px-2.5 py-1 text-[11.5px] text-[var(--fg-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          重置筛选
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {renderNav({ retracted, activeMonth })}
      {groups.map((group) => {
        const flagship = group.events.filter((e) => e.level === 'flagship').length
        const major = group.events.filter((e) => e.level === 'major').length
        return (
          <section
            key={group.key}
            id={`month-${group.key}`}
            aria-labelledby={`month-label-${group.key}`}
            style={{ scrollMarginTop: 'calc(var(--sticky-top) + 32px)' }}
          >
            {/* 月份刻度：桌面吸顶在年份条下方；手机不吸顶（当前月份已在年份条右侧显示），
                避免出现「年份条收起、月份标签仍悬空」的空档。 */}
            <div className="relative z-10 -mx-1 flex items-center gap-2 bg-[var(--bg)] px-1 py-1 lg:sticky lg:top-[var(--sticky-top)] lg:gap-2.5 lg:bg-[var(--bg)]/94 lg:py-1.5 lg:backdrop-blur-sm">
              <span
                className="h-2 w-2 flex-none rounded-xs"
                style={{
                  background: flagship > 0 ? LEVEL_STYLES.flagship.signal : 'var(--lv-minor)',
                }}
              />
              <h2
                id={`month-label-${group.key}`}
                className="text-[12.5px] font-semibold tracking-tight text-white tabular-nums sm:text-[13.5px]"
              >
                {group.label}
              </h2>
              <span className="font-mono text-[10.5px] text-[var(--fg-4)] tabular-nums">
                {String(group.events.length).padStart(2, '0')}
              </span>
              {flagship > 0 && (
                <span
                  className="rounded-xs border px-1 py-px text-[9.5px] font-medium"
                  style={{
                    borderColor: LEVEL_STYLES.flagship.chipBorder,
                    background: LEVEL_STYLES.flagship.chipBg,
                    color: LEVEL_STYLES.flagship.chipText,
                  }}
                >
                  {flagship} 旗舰
                </span>
              )}
              {major > 0 && (
                <span
                  className="rounded-xs border px-1 py-px text-[9.5px] font-medium"
                  style={{
                    borderColor: LEVEL_STYLES.major.chipBorder,
                    background: LEVEL_STYLES.major.chipBg,
                    color: LEVEL_STYLES.major.chipText,
                  }}
                >
                  {major} 重要
                </span>
              )}
              <span className="ml-auto hidden font-mono text-[10px] text-[var(--fg-4)] tabular-nums sm:inline">
                {formatDate(group.events[group.events.length - 1].releaseDate)} —{' '}
                {formatDate(group.events[0].releaseDate)}
              </span>
            </div>

            <ol className="mt-1.5 flex flex-col gap-1.5 border-l border-[var(--line)] pl-3">
              {group.events.map((model) => (
                <li key={model.id}>
                  <TimelineCard
                    model={model}
                    company={companyOf(model.company)}
                    referenceDate={referenceDate}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ol>
          </section>
        )
      })}

      <div className="flex items-center gap-2 border-t border-[var(--line)] pt-4 font-mono text-[10.5px] text-[var(--fg-4)]">
        <span className="h-1.5 w-1.5 rounded-xs bg-[var(--fg-4)]" />
        <span>时间轴起点</span>
        <span className="ml-auto tabular-nums">{totalModels} events</span>
      </div>
    </div>
  )
}
