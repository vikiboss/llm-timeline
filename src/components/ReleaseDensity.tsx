import { useMemo, useRef, useState } from 'react'
import type { Model, MonthGroup } from '../types'
import { MONTH_NAMES } from '../lib/timeline'

interface DensityProps {
  /** 全量（未筛选）事件，用于形成“真实发布节奏”的背景 */
  allModels: Model[]
  /** 当前筛选后的事件 */
  filtered: Model[]
  groups: MonthGroup[]
  onJump: (monthKey: string) => void
}

/**
 * 发布密度条：把整个时间轴的发布次数压缩成一排柱子。
 * 既是数据可视化（哪几个月是发布高峰），也是导航（点击跳转）。
 */
export function ReleaseDensity({ allModels, filtered, groups, onJump }: DensityProps) {
  const [hover, setHover] = useState<string | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)

  const months = useMemo(() => {
    const all = new Map<string, number>()
    for (const m of allModels) {
      const k = m.releaseDate.slice(0, 7)
      all.set(k, (all.get(k) ?? 0) + 1)
    }
    const vis = new Map<string, number>()
    for (const m of filtered) {
      const k = m.releaseDate.slice(0, 7)
      vis.set(k, (vis.get(k) ?? 0) + 1)
    }
    const keys = [...all.keys()].sort()
    if (keys.length === 0) return []
    // 补齐空月份，保证柱状图时间间隔真实
    const [sy, sm] = keys[0].split('-').map(Number)
    const [ey, em] = keys[keys.length - 1].split('-').map(Number)
    const out: { key: string; total: number; shown: number; label: string }[] = []
    let y = sy
    let m = sm
    while (y < ey || (y === ey && m <= em)) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      out.push({
        key,
        total: all.get(key) ?? 0,
        shown: vis.get(key) ?? 0,
        label: `${y} 年 ${MONTH_NAMES[m - 1]}`,
      })
      m++
      if (m > 12) {
        m = 1
        y++
      }
    }
    return out
  }, [allModels, filtered])

  // 键盘无障碍：方向键移动高亮，回车跳转
  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = months.findIndex((m) => m.key === hover)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const target = months[Math.min(months.length - 1, Math.max(0, idx + dir))]
      if (target) setHover(target.key)
    }
  }

  const max = Math.max(1, ...months.map((m) => m.total))
  const visibleKeys = new Set(groups.map((g) => g.key))
  const hoverMonth = months.find((m) => m.key === hover)

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.16em] text-[var(--fg-4)] uppercase">
          发布密度
        </span>
        <span className="font-mono text-[10px] text-[var(--fg-4)]">
          {months.length} 个月 · 峰值 {max}
        </span>
        <span className="ml-auto font-mono text-[10px] text-[var(--fg-4)]">
          {hoverMonth ? `${hoverMonth.label} · ${hoverMonth.shown}/${hoverMonth.total}` : '点击柱子跳转'}
        </span>
      </div>

      <div
        ref={wrapRef}
        role="group"
        aria-label="发布密度，按月份"
        onKeyDown={onKeyDown}
        className="grid h-14 items-end gap-[2px] border-b border-[var(--line)] pb-px"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, months.length)}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHover(null)}
      >
        {months.map((m) => {
          const h = m.total === 0 ? 2 : Math.max(4, Math.round((m.total / max) * 52))
          const isShown = visibleKeys.has(m.key)
          const isHover = hover === m.key
          const inactive = m.shown === 0
          return (
            <button
              key={m.key}
              type="button"
              onMouseEnter={() => setHover(m.key)}
              onFocus={() => setHover(m.key)}
              onClick={() => m.shown > 0 && onJump(m.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (m.shown > 0) onJump(m.key)
                }
              }}
              disabled={m.shown === 0}
              title={m.shown === 0 ? `${m.label} 无发布` : `${m.label} · 点击跳转`}
              aria-label={`${m.label}，${m.shown} 个发布`}
              className={`group relative ${m.shown === 0 ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ height: '100%' }}
            >
              <span
                className="absolute bottom-0 left-0 w-full transition-colors"
                style={{
                  height: h,
                  background: inactive
                    ? 'var(--line-2)'
                    : isHover
                      ? 'var(--accent)'
                      : isShown
                        ? 'color-mix(in oklab, var(--accent) 55%, var(--surface-3))'
                        : 'var(--surface-3)',
                }}
              />
            </button>
          )
        })}
      </div>

      {/* 年份刻度 */}
      <div className="mt-1 flex justify-between font-mono text-[9.5px] text-[var(--fg-4)]">
        {[...new Set(months.map((m) => m.key.slice(0, 4)))].map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  )
}
