import { useEffect, useRef, useState } from 'react'
import type { Model, MonthGroup } from '../types'

interface YearNavProps {
  groups: MonthGroup[]
  allModels: Model[]
  onJump: (monthKey: string) => void
  /** 向下滚动时收起年份条（桌面不收起） */
  retracted: boolean
  /** 当前视口所在月份，手机端与年份合并显示在同一行 */
  activeMonth?: MonthGroup
}

/**
 * 年份刻度条：把「滚到某一年」变成一次点击。
 * 同时充当阅读进度条——当前视口所在年份高亮。
 */
export function YearNav({ groups, allModels, onJump, retracted, activeMonth }: YearNavProps) {
  const years = [...new Set(allModels.map((m) => Number(m.releaseDate.slice(0, 4))))].sort()
  const visibleYears = new Set(groups.map((g) => g.year))
  const [activeYear, setActiveYear] = useState<number | null>(
    groups.length ? groups[0].year : null,
  )
  const navRef = useRef<HTMLDivElement>(null)

  // 用 IntersectionObserver 跟随滚动：进入视口上 1/3 的月份决定当前年份
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

  // 当前年份按钮滚动到可视区
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeYear])

  // 年份条高度固定在 --year-nav-h（见 index.css），下面所有吸顶层只管 top: --sticky-top。
  // 这里不再做任何尺寸测量：不读布局、不写根变量，滚动路径上零开销。

  if (years.length === 0) return null

  return (
    // 年份条常驻在页头下，层级高于月份标签（月份标签的吸顶偏移由父级统一给出）
    // 高度固定（box-border，含 1px 下边框），收起时只隐内容不改高，避免吸顶偏移跟着变
    <div
      className={`sticky z-30 box-border -mx-4 border-b border-[var(--line)] bg-[var(--bg)]/95 px-4 backdrop-blur-sm transition-opacity duration-150 lg:-mx-6 lg:px-6 ${
        retracted ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ top: 'var(--header-h)', height: 'var(--year-nav-h)' }}
    >
      <div ref={navRef} className="flex h-full items-center gap-1 overflow-x-auto">
        <span className="mr-1 hidden text-[10px] font-semibold tracking-[0.14em] text-[var(--fg-4)] uppercase sm:inline">
          跳到
        </span>
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
              className={`cursor-pointer rounded-xs px-2 py-1 font-mono text-[11.5px] tabular-nums transition-colors ${
                !has
                  ? 'cursor-default text-[var(--fg-4)]/35'
                  : active
                    ? 'bg-[var(--accent)] font-semibold text-[var(--accent-ink)]'
                    : 'text-[var(--fg-3)] hover:bg-[var(--surface-2)] hover:text-white'
              }`}
              title={has ? `${y} 年 · ${count} 次发布` : `${y} 年（当前筛选无发布）`}
            >
              {y}
            </button>
          )
        })}
        {/* 手机：年份与当前月份合并成一条，省掉一层吸顶 */}
        {activeMonth && (
          <button
            type="button"
            onClick={() => onJump(activeMonth.key)}
            className="ml-auto flex flex-none cursor-pointer items-center gap-1.5 rounded-xs bg-[var(--surface-2)] px-2 py-0.5 text-[11.5px] text-white lg:hidden"
          >
            <span className="font-mono tabular-nums">{activeMonth.month} 月</span>
            <span className="font-mono text-[10px] text-[var(--fg-4)] tabular-nums">
              {activeMonth.events.length}
            </span>
          </button>
        )}
        <span className="ml-auto hidden pl-3 font-mono text-[10px] text-[var(--fg-4)] tabular-nums lg:inline">
          {groups.reduce((n, g) => n + g.events.length, 0)} / {allModels.length}
        </span>
      </div>
    </div>
  )
}
