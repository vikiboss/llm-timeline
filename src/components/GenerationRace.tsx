import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { LEVEL_STYLES } from './tokens'
import { buildRaceLanes } from '../lib/race'
import { parseDate } from '../lib/timeline'
import { companyLabel, companyShortLabel } from '../lib/data'
import type { Company, Model } from '../types'

interface RaceProps {
  models: Model[]
  companyOf: (id: string) => Company | undefined
  rankOf: (id: string) => number
  onSelect: (m: Model) => void
  referenceDate: string
}

/** 单行泳道高度（px），须与下方 li 的 py-[7px] + h-5 保持一致 */
const ROW_H = 34
const LABEL_H = 20
const BOX_BORDER = 2
/** 折叠开关行高度（py-6px + 11px 字号行高 ≈ 24） */
const TOGGLE_H = 25

/** 默认展示的厂商泳道数：留头部 10 家，兼顾信息量与下方时间轴篇幅 */
const LANE_PREVIEW = 10

/**
 * 代际竞速：横轴是真实时间，每条泳道是一家厂商的主力模型迭代轨迹。
 * 点的疏密 = 迭代节奏，黄金点 = 旗舰，浅色点 = 重要。
 * 一眼看出“谁在加速，谁在掉队”。
 */
/** 桌面宽度断点：与 Tailwind 的 lg 一致，窄屏压缩泳道两侧列宽 */
function useWideLayout() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide
}

export function GenerationRace({ models, companyOf, rankOf, onSelect, referenceDate }: RaceProps) {
  const wide = useWideLayout()
  const [hover, setHover] = useState<Model | null>(null)
  const [expanded, setExpanded] = useState(false)
  // 全量泳道（已按排名排序），折叠态从这里取前 N 条
  const allLanes = useMemo(
    () => buildRaceLanes(models, rankOf, referenceDate),
    [models, rankOf, referenceDate],
  )

  // 折叠态：严格只展示排名前 LANE_PREVIEW 条，把篇幅让给下方时间轴。
  // 需要看全量（或对比靠后厂商）时展开即可。
  const lanes = useMemo(() => {
    if (expanded) return allLanes
    return allLanes.slice(0, LANE_PREVIEW)
  }, [allLanes, expanded])

  const hiddenCount = allLanes.length - lanes.length

  const domain = useMemo(() => {
    const times = lanes.flatMap((l) => l.models.map((m) => parseDate(m.releaseDate)))
    if (times.length === 0) return null
    const min = Math.min(...times)
    const max = Math.max(...times)
    return { min, max, span: Math.max(1, max - min) }
  }, [lanes])

  // 锁高：折叠态恒为 LANE_PREVIEW 行，展开展开态交给内容自然撑高。
  // 这样筛选公司时（泳道变少）下方时间轴不会上下跳动。
  const lockedRows = expanded ? lanes.length : Math.max(lanes.length, LANE_PREVIEW)
  const padRows = expanded ? 0 : Math.max(0, lockedRows - lanes.length)
  const toggleH = allLanes.length > LANE_PREVIEW ? TOGGLE_H : 0
  const minBoxH =
    lockedRows > 0 ? lockedRows * ROW_H + toggleH + LABEL_H + BOX_BORDER : undefined

  if (!domain || lanes.length === 0) return null

  /**
   * 同一天发布的多个模型 pct 完全相同，原先会叠成一个点看不出差异。
   * 现在把它们合并成一根“竖塔”：塔高 = 当天款数（最高 20px 轨迹区），
   * 这样「一天发多款」直接表现为更长的刻度，而不是一堆散点，
   * 既无重叠又不靠颜色分辨；悬停/点击时按日期展开列出全部名字。
   */
  const towersOf = new Map<string, { date: string; pct: number; models: Model[] }[]>()
  for (const lane of lanes) {
    const byDate = new Map<string, Model[]>()
    for (const m of lane.models) {
      const arr = byDate.get(m.releaseDate) ?? []
      arr.push(m)
      byDate.set(m.releaseDate, arr)
    }
    const towers = [...byDate.entries()]
      .map(([date, ms]) => ({
        date,
        models: ms,
        pct: ((parseDate(date) - domain.min) / domain.span) * 100,
      }))
      .sort((a, b) => a.pct - b.pct)
    towersOf.set(lane.company, towers)
  }

  // 年份刻度线
  const years: { label: string; pct: number }[] = []
  const startYear = new Date(domain.min).getFullYear()
  const endYear = new Date(domain.max).getFullYear()
  for (let y = startYear; y <= endYear; y++) {
    const pct = ((new Date(y, 0, 1).getTime() - domain.min) / domain.span) * 100
    if (pct >= 0 && pct <= 100) years.push({ label: String(y), pct })
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.16em] text-[var(--fg-4)] uppercase">
          代际竞速
        </span>
        <span className="font-mono text-[10px] text-[var(--fg-4)]">
          {expanded ? `全部 ${lanes.length}` : `Top ${lanes.length}`} 家厂商 · 按综合实力排序
        </span>
        <span className="ml-auto hidden font-mono text-[10px] text-[var(--fg-4)] sm:inline">
          {hover ? `${hover.name} · ${hover.releaseDate}` : '每根短针 = 一次发布 · 越高 = 当天款数越多'}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--surface)]"
        style={{
          ...(minBoxH ? { minHeight: minBoxH } : undefined),
          // 两侧列宽随视口收缩：小屏优先保证轨迹区（横向时间轴）可读
          ['--lane-label' as string]: wide ? '124px' : '104px',
          ['--lane-meta' as string]: wide ? '136px' : '56px',
        }}
      >
        <ul className="relative">
          {lanes.map((lane, i) => {
            const company = companyOf(lane.company)
            return (
              <li
                key={lane.company}
                className={`flex items-center gap-3 px-3 py-[7px] ${
                  i > 0 ? 'border-t border-[var(--line)]' : ''
                }`}
              >
                <span className="relative z-10 flex w-[var(--lane-label)] flex-none items-center gap-1.5 bg-[var(--surface)] pr-2">
                  <Icon name={company?.icon ?? 'openai'} size={13} color={company?.color} preferColor />
                  <span
                    className="min-w-0 truncate text-[11.5px] text-[var(--fg-2)]"
                    title={companyLabel(company, lane.company)}
                  >
                    {companyShortLabel(company, lane.company)}
                  </span>
                </span>

                <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
                  {/* 年份竖线：只画在轨迹区内，不侵入左右文字列 */}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                    {years.map((y) => (
                      <span
                        key={y.label}
                        className="absolute inset-y-0 w-px bg-[var(--line)]"
                        style={{ left: `${y.pct}%` }}
                      />
                    ))}
                  </span>
                  {/* 连接线：体现连续迭代 */}
                  <span
                    className="absolute top-1/2 h-px bg-[var(--line-2)]"
                    style={{
                      left: `${((parseDate(lane.models[0].releaseDate) - domain.min) / domain.span) * 100}%`,
                      right: `${
                        100 - ((parseDate(lane.models[lane.models.length - 1].releaseDate) - domain.min) / domain.span) * 100
                      }%`,
                    }}
                  />
                  {towersOf.get(lane.company)?.map((t) => {
                    const isF = t.models.some((m) => m.level === 'flagship')
                    const isHover =
                      hover !== null && t.models.some((m) => m.id === hover.id)
                    // 刻度高度表示“当天几款”：1 款 = 8px细针，多款向上长高，最 18px
                    const h = t.models.length === 1 ? 8 : Math.min(18, 8 + t.models.length * 3)
                    const names = t.models.map((m) => m.name).join(' / ')
                    return (
                      <button
                        key={t.date}
                        type="button"
                        onClick={() => onSelect(t.models[t.models.length - 1])}
                        onMouseEnter={() => setHover(t.models[t.models.length - 1])}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(t.models[t.models.length - 1])}
                        onBlur={() => setHover(null)}
                        aria-label={
                          t.models.length > 1
                            ? `${t.date} · ${names}（同日 ${t.models.length} 款）`
                            : `${names} · ${t.date}`
                        }
                        title={
                          t.models.length > 1 ? `${t.date} · ${names}` : `${names} · ${t.date}`
                        }
                        // 刻度用 1.5 宽竖条：细到不会互相叠成一片，又比圆点更好瞄准
                        className="absolute bottom-1/2 -translate-x-1/2 cursor-pointer rounded-[1px] transition-transform hover:z-10 hover:scale-x-150"
                        style={{
                          left: `${t.pct}%`,
                          width: t.models.length > 1 ? 3 : 2,
                          height: h,
                          background: isF
                            ? LEVEL_STYLES.flagship.signal
                            : LEVEL_STYLES.major.signal,
                          opacity: isHover ? 1 : t.models.length > 1 ? 1 : 0.85,
                          outline: isHover ? '1px solid var(--fg)' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    )
                  })}
                </span>

                {/* 右侧不再只给一个“X 天/代”：把“几代”和“多快”用文字并列，
                    避免用户看一排散点还要自己数 */}
                <span
                  className="relative z-10 flex w-[var(--lane-meta)] flex-none items-baseline justify-end gap-2 bg-[var(--surface)] pl-2 whitespace-nowrap"
                  title={`${lane.family} · 最新 ${lane.latest}（${lane.models.length} 代）`}
                >
                  {wide && <span className="text-[10.5px] text-[var(--fg-3)]">{lane.family}</span>}
                  <span className="font-mono text-[9.5px] whitespace-nowrap text-[var(--fg-4)]">
                    <span className="text-[var(--fg-2)]">{lane.models.length}</span> 代 ·{' '}
                    {lane.cadenceDays === null ? '—' : `${lane.cadenceDays}天`}
                  </span>
                </span>
              </li>
            )
          })}
          {/* 占位行：保持与全量数据一致的高度，防止筛选时下方内容跳动 */}
          {Array.from({ length: padRows }, (_, k) => (
            <li
              key={`pad-${k}`}
              aria-hidden="true"
              className={`flex items-center gap-3 px-3 py-[7px] ${
                lanes.length + k > 0 ? 'border-t border-[var(--line)]' : ''
              }`}
            >
              <span className="w-[var(--lane-label)] flex-none" />
              <span className="h-5 min-w-0 flex-1" />
              <span className="w-[var(--lane-meta)] flex-none" />
            </li>
          ))}
        </ul>

        {/* 展开/收起：紧贴最后一条泳道下方，整行可点，样式沿用泳道分隔 */}
        {allLanes.length > LANE_PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="group flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-[var(--line)] bg-[var(--surface-2)] px-3 py-[6px] text-[11px] text-[var(--fg-3)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--fg)]"
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              aria-hidden="true"
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            >
              <path
                d="M2 3.5l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
              />
            </svg>
            {expanded ? '收起' : `还有 ${hiddenCount} 家 · 展开全部`}
          </button>
        )}

        {/* 年份标签：与轨迹区左右两侧各对齐（左侧列宽 124/152 + gap 12，右侧 136 + gap 12） */}
        <div className="relative h-5 border-t border-[var(--line)] bg-[var(--surface-2)] pl-[calc(var(--lane-label)+1.5rem)] pr-[calc(var(--lane-meta)+1.5rem)]">
          <div className="relative h-full">
            {years.map((y) => (
              <span
                key={y.label}
                className="absolute top-0.5 -translate-x-1/2 font-mono text-[9.5px] text-[var(--fg-4)]"
                style={{ left: `${Math.min(97, Math.max(3, y.pct))}%` }}
              >
                {y.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
