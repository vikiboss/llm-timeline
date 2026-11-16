import { useCallback, useMemo, useRef, useState } from 'react'
import type { Model } from '../types'
import { parseDate } from '../lib/timeline'
import { Panel, PanelHead } from './ui'

interface HeatmapProps {
  allModels: Model[]
  filtered: Model[]
  onJump: (monthKey: string) => void
  referenceDate: string
}

const CELL_MAX = 14
const CELL_MIN = 9
const GAP = 3
const DAY = 86_400_000
/** 热度分档：0 / 1 / 2 / 3 / ≥4，用油墨浓度而不是色相 */
const RAMP = ['#f0efe9', '#bcd6b5', '#7bb178', '#3d7a48', '#12351c']

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function iso(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 发布节拍 · Heatmap
 *
 * 颠覆性的地方：不再把时间画成一条横轴，而是画成**一周七行的日历**。
 * 每一列是一周（周一 → 周日），每一格是一天。颜色越深 = 当天发布越多。
 *
 * 于是读者不需要读轴、不需要数刻度，只需要看图案：
 *  - 右侧越来越深 → 这个行业在加速；
 *  - 某几天整列发白 → 那是周末，发布几乎只发生在工作日。
 * 时间轴第一次同时回答了「何时」和「以什么节奏」。
 *
 * 交互：悬停看当天明细；点击跳到对应月份。
 */
export function ReleaseHeatmap({ allModels, filtered, onJump, referenceDate }: HeatmapProps) {
  const [hover, setHover] = useState<{ date: string; models: Model[] } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(CELL_MAX)

  const data = useMemo(() => {
    const byDate = new Map<string, Model[]>()
    for (const m of allModels) {
      const arr = byDate.get(m.releaseDate) ?? []
      arr.push(m)
      byDate.set(m.releaseDate, arr)
    }
    const shown = new Set(filtered.map((m) => m.id))

    // 域：从首条发布的所在周一起，到参考日期的周日为止
    const dates = allModels.map((m) => startOfDay(new Date(parseDate(m.releaseDate))))
    if (dates.length === 0) return null
    const first = new Date(Math.min(...dates))
    const last = new Date(Math.max(...dates, startOfDay(new Date(parseDate(referenceDate)))))
    const start = new Date(first)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)) // 回退到周一
    const end = new Date(last)
    end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7))) // 前进到周日

    const weeks: { start: number; days: { date: string; models: Model[]; dow: number }[] }[] = []
    for (let t = start.getTime(); t <= end.getTime(); t += 7 * DAY) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(t + i * DAY)
        const key = iso(d.getTime())
        return { date: key, models: byDate.get(key) ?? [], dow: d.getDay() }
      })
      weeks.push({ start: t, days })
    }

    // 时间刻度：每年起点标四位年份，季度起点标 3/6/9 月。
    // 只标季度，避免 48 个月标签糊成一片。
    const monthMarks: { week: number; label: string; major: boolean }[] = []
    let prevKey = ''
    weeks.forEach((w, i) => {
      const d = new Date(w.start)
      d.setDate(d.getDate() + 3) // 用周三判定归属月，避免月末周错位
      const m = d.getMonth()
      const key = `${d.getFullYear()}-${m}`
      if (key === prevKey) return
      prevKey = key
      if (m === 0) monthMarks.push({ week: i, label: String(d.getFullYear()), major: true })
      else if (m % 3 === 0) monthMarks.push({ week: i, label: `${m + 1}月`, major: false })
    })

    return { weeks, monthMarks, shown, total: allModels.length }
  }, [allModels, filtered, referenceDate])

  /** 容器宽度 → 格子边长：整段历史一次看全，才谈得上「看图案」 */
  const refit = useCallback((el: HTMLDivElement, weeks: number) => {
    const w = el.clientWidth - 22 // 扣掉星期刻度列
    const fit = Math.floor((w - weeks * GAP) / weeks)
    setCell(Math.max(CELL_MIN, Math.min(CELL_MAX, fit)))
  }, [])

  const fitRef = useCallback(
    (el: HTMLDivElement | null) => {
      wrapRef.current = el
      if (!el || !data) return
      refit(el, data.weeks.length)
      const ro = new ResizeObserver(() => refit(el, data.weeks.length))
      ro.observe(el)
      return () => ro.disconnect()
    },
    [data, refit],
  )

  if (!data) return null
  const { weeks, monthMarks, shown } = data

  const levelOf = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4)
  const busiest = [...data.weeks].flatMap((w) => w.days).reduce((a, b) => (b.models.length > a.models.length ? b : a))

  return (
    <Panel label="发布节拍">
      <PanelHead
        title="发布节拍"
        en="Weekly Rhythm"
        count={`${weeks.length} 周`}
        right={
          hover
            ? `${hover.date} · ${hover.models.length} 次发布`
            : '每列一周 · 色深 = 当天发布数'
        }
      />
      <div className="px-4 pt-3 pb-4 sm:px-5">
        {/* 图表本体：横向可滚，最右侧（最近）优先可见 */}
        <div ref={fitRef} className="no-scrollbar overflow-x-auto">
          <div className="relative inline-block">
            {/* 月份刻度 */}
            <div className="relative mb-1.5 h-3" style={{ width: weeks.length * (cell + GAP) }}>
              {monthMarks.map((m) => (
                <span
                  key={`${m.week}-${m.label}`}
                  className={`absolute top-0 text-[9px] whitespace-nowrap ${
                    m.major ? 'font-semibold text-[var(--ink-2)]' : 'text-[var(--ink-4)]'
                  }`}
                  style={{ left: m.week * (cell + GAP) }}
                >
                  {m.major ? `${new Date(weeks[m.week].start).getFullYear()}` : m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {/* 星期刻度：只标一 / 三 / 五，避免拥挤 */}
              <div className="mr-1 flex flex-col" style={{ gap: GAP }}>
                {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                  <span
                    key={d}
                    className="flex items-center justify-end text-[8.5px] leading-none text-[var(--ink-4)]"
                    style={{ height: cell }}
                  >
                    {i % 2 === 0 ? d : ''}
                  </span>
                ))}
              </div>

              {weeks.map((w) => (
                <div key={w.start} data-week="" className="flex flex-col" style={{ gap: GAP }}>
                  {w.days.map((day) => {
                    const n = day.models.length
                    const lv = levelOf(n)
                    const isShown = day.models.some((m) => shown.has(m.id))
                    const isHover = hover?.date === day.date
                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={n === 0}
                        onMouseEnter={() => n > 0 && setHover({ date: day.date, models: day.models })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => n > 0 && setHover({ date: day.date, models: day.models })}
                        onBlur={() => setHover(null)}
                        onClick={() => n > 0 && onJump(day.date.slice(0, 7))}
                        aria-label={`${day.date}，${n} 次发布`}
                        className={`rounded-[3px] transition-[outline,transform] ${
                          n > 0 ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                        }`}
                        style={{
                          width: cell,
                          height: cell,
                          background: RAMP[lv],
                          // 周末格保持同样的形状，但纸色略灰——读者会自己发现周日几乎全空
                          opacity: n === 0 || isShown || !hover ? 1 : 0.55,
                          outline: isHover ? '1.5px solid var(--ink)' : 'none',
                          outlineOffset: 1,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 图例 + 结论 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line)] pt-2.5 text-[10.5px] text-[var(--ink-3)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[var(--ink-4)]">少</span>
            {RAMP.map((c, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
            ))}
            <span className="text-[var(--ink-4)]">多</span>
          </span>
          <span className="hidden sm:inline">
            最忙的一天 ·{' '}
            <b className="font-semibold text-[var(--ink-2)]">
              {busiest.date.slice(5).replace('-', '/')}
            </b>{' '}
            <span className="tnum font-mono">{busiest.models.length}</span> 次发布
          </span>
          <button
            type="button"
            onClick={() => onJump(busiest.date.slice(0, 7))}
            className="ml-auto cursor-pointer rounded-xs px-1.5 py-0.5 text-[10.5px] text-[var(--ink-2)] underline decoration-[var(--line-2)] underline-offset-2 transition-colors hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
          >
            跳到最忙的一天
          </button>
        </div>
      </div>
    </Panel>
  )
}
