import { useEffect, useRef, useState } from 'react'
import { TimelineCard } from './TimelineCard'
import { LEVEL_STYLES } from './tokens'
import { Button, Pill } from './ui'
import type { Company, Model, MonthGroup } from '../types'
import { formatDate } from '../lib/timeline'

interface TimelineProps {
  groups: MonthGroup[]
  companyOf: (id: string) => Company | undefined
  onSelect: (model: Model) => void
  onReset: () => void
  renderNav: (props: { retracted: boolean; activeMonth?: MonthGroup }) => React.ReactNode
}

/**
 * 时间轴：一条中轴上挂着按月的档案卡。
 *
 * 中轴是一条「由页面在替你写字」：向下滚动时，上方部分被墨填满，
 * 即视口当前阅读位置以下仍是空轴。读者不看数字也知道读到哪。
 * 这条进度轴用 scroll 事件直接写 CSS 变量，不触发 React 重渲染。
 */
export function Timeline({ groups, companyOf, onSelect, onReset, renderNav }: TimelineProps) {
  const [retracted, setRetracted] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(groups[0]?.key ?? null)
  const listRef = useRef<HTMLDivElement>(null)

  // 窄屏滚动向下时收起年份条，把高度让给内容
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
      setRetracted(delta > 0 && y > 220)
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

  // 墨线进度：写到 CSS 变量 --spine-fill（0–1），避免逐帧 React 更新
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const anchor = window.innerHeight * 0.45
      const pct = Math.min(1, Math.max(0, (anchor - r.top) / Math.max(1, r.height)))
      el.style.setProperty('--spine-fill', pct.toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [groups])

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
      { rootMargin: '-40% 0px -52% 0px', threshold: 0 },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [groups])

  const activeMonth = groups.find((g) => g.key === activeKey)

  if (groups.length === 0) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line-2)] bg-[var(--card)] px-6 py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-[var(--sunken)] text-[var(--ink-4)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <p className="mt-3 text-[14px] font-medium text-[var(--ink)]">没有符合条件的发布</p>
        <p className="mt-1 text-[12px] text-[var(--ink-3)]">试试放宽公司、分级或输入类型</p>
        <Button onClick={onReset} tone="ink" className="mt-4">
          重置筛选
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {renderNav({ retracted, activeMonth })}

      <div ref={listRef} className="relative pl-[18px] sm:pl-[26px]">
        {/* 中轴：槽 + 墨 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 bottom-0 left-[3px] w-[2px] overflow-hidden rounded-full bg-[var(--line)] sm:left-[5px]"
        >
          <div
            className="w-full rounded-full bg-[var(--ink)] transition-[height] duration-150 ease-out"
            style={{ height: 'calc(var(--spine-fill, 0) * 100%)' }}
          />
        </div>

        {groups.map((group, gi) => {
          const flagship = group.events.filter((e) => e.level === 'flagship').length
          const major = group.events.filter((e) => e.level === 'major').length
          return (
            <section
              key={group.key}
              id={`month-${group.key}`}
              aria-labelledby={`month-label-${group.key}`}
              style={{ scrollMarginTop: 'calc(var(--sticky-top) + 20px)' }}
              className={gi > 0 ? 'mt-5' : ''}
            >
              {/* 月份刻度：节点 + 标题，桌面吸顶 */}
              <div className="relative z-10 -ml-[18px] flex items-center gap-2 bg-[var(--paper)] pt-2.5 pb-2 pl-[18px] sm:-ml-[26px] sm:pl-[26px] lg:sticky lg:top-[var(--sticky-top)]">
                {/* 吸顶时的纸色遮罩：允许卡片从下方滑过而不透出 */}
                <span aria-hidden="true" className="absolute inset-y-0 right-0 -left-[18px] -z-10 bg-[var(--paper)] sm:-left-[26px]" />
                <span
                  className="absolute top-1/2 left-[4px] h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--paper)] sm:left-[6px]"
                  style={{
                    background: flagship > 0 ? 'var(--ink)' : 'var(--line-2)',
                    boxShadow: '0 0 0 1px var(--line-2)',
                  }}
                />
                <h2
                  id={`month-label-${group.key}`}
                  className="tnum text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
                >
                  {group.label}
                </h2>
                <Pill>{group.events.length}</Pill>
                {flagship > 0 && (
                  <span
                    className="rounded-xs px-1.5 py-px text-[9.5px] font-semibold text-white"
                    style={{ background: LEVEL_STYLES.flagship.signal }}
                  >
                    {flagship} 旗舰
                  </span>
                )}
                {major > 0 && (
                  <span className="rounded-xs border border-[var(--line-2)] px-1.5 py-px text-[9.5px] font-medium text-[var(--ink-3)]">
                    {major} 重要
                  </span>
                )}
                <span className="tnum ml-auto hidden font-mono text-[10px] text-[var(--ink-4)] sm:inline">
                  {formatDate(group.events[group.events.length - 1].releaseDate)} —{' '}
                  {formatDate(group.events[0].releaseDate)}
                </span>
              </div>

              <ol className="mt-1 flex flex-col gap-1.5">
                {group.events.map((model) => (
                  <li key={model.id}>
                    <TimelineCard
                      model={model}
                      company={companyOf(model.company)}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ol>
            </section>
          )
        })}

      </div>
    </div>
  )
}
