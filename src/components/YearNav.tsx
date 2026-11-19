import { useEffect, useRef, useState } from 'react'
import type { Model, MonthGroup } from '../types'

interface YearNavProps {
  groups: MonthGroup[]
  allModels: Model[]
  onJump: (monthKey: string) => void
  retracted: boolean
  activeMonth?: MonthGroup
}

/**
 * 年份刻度：把「滚到某一年」变成一次点击，同时兼任阅读进度。
 * 选中态是一枚实心墨块——与页面其他选中态保持同一语言。
 */
export function YearNav({ groups, allModels, onJump, retracted, activeMonth }: YearNavProps) {
  const years = [...new Set(allModels.map((m) => Number(m.releaseDate.slice(0, 4))))].sort()
  const visibleYears = new Set(groups.map((g) => g.year))
  const [activeYear, setActiveYear] = useState<number | null>(groups.length ? groups[0].year : null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (groups.length === 0) return
    const nodes = groups
      .map((g) => document.getElementById(`month-${g.key}`))
      .filter((n): n is HTMLElement => Boolean(n))
    if (nodes.length === 0) return
    const yearOf = new Map(nodes.map((n) => [n.id, Number(n.id.replace('month-', '').slice(0, 4))]))
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveYear(yearOf.get(visible[0].target.id) ?? null)
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [groups])

  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeYear])

  if (years.length === 0) return null

  return (
    <div
      className={`sticky z-30 box-border -mx-4 border-b border-[var(--line)] bg-[var(--paper)]/92 px-4 backdrop-blur-md transition-opacity duration-150 lg:-mx-6 lg:px-6 ${
        retracted ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ top: 'var(--header-h)', height: 'var(--nav-h)' }}
    >
      <div ref={navRef} className="no-scrollbar flex h-full items-center gap-1 overflow-x-auto">
        <span className="mr-2 hidden text-[10px] font-medium tracking-[0.08em] text-[var(--ink-4)] sm:inline">
          跳至
        </span>

        {/* 年份：连成一枚分段控件 */}
        <div className="flex items-center gap-1 rounded-sm bg-[var(--sunken)] p-0.5">
          {years.map((y) => {
            const has = visibleYears.has(y)
            const active = activeYear === y
            const count = groups.filter((g) => g.year === y).reduce((n, g) => n + g.events.length, 0)
            return (
              <button
                key={y}
                type="button"
                data-active={active}
                disabled={!has}
                onClick={() => {
                  const first = groups.find((g) => g.year === y)
                  if (first) onJump(first.key)
                }}
                aria-current={active ? 'true' : undefined}
                className={`tnum cursor-pointer rounded-sm px-2.5 py-1 font-mono text-[11.5px] transition-colors ${
                  !has
                    ? 'cursor-default text-[var(--ink-4)]/40'
                    : active
                      ? 'bg-[var(--ink)] font-semibold text-white'
                      : 'text-[var(--ink-3)] hover:bg-[var(--card)] hover:text-[var(--ink)]'
                }`}
                title={has ? `${y} 年 · ${count} 次发布` : `${y} 年（当前筛选无发布）`}
              >
                {y}
              </button>
            )
          })}
        </div>

        {/* 手机：当前月份合并进这一行 */}
        {activeMonth && (
          <button
            type="button"
            onClick={() => onJump(activeMonth.key)}
            className="ml-auto flex flex-none cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--ink)] lg:hidden"
          >
            <span className="tnum font-mono">{activeMonth.month} 月</span>
            <span className="tnum font-mono text-[10px] text-[var(--ink-4)]">
              {activeMonth.events.length}
            </span>
          </button>
        )}
        <span className="tnum ml-auto hidden pl-3 font-mono text-[10px] text-[var(--ink-4)] lg:inline">
          {groups.reduce((n, g) => n + g.events.length, 0)} / {allModels.length}
        </span>
      </div>
    </div>
  )
}
