import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { LEVEL_STYLES } from './tokens'
import { buildRaceLanes } from '../lib/race'
import { Panel, PanelHead } from './ui'
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
    <Panel label="代际竞速">
      <PanelHead
        title="代际竞速"
        en="Generation Race"
        count={`${expanded ? `全部 ${lanes.length}` : `Top ${lanes.length}`} 家 · 按实力排序`}
        right="每根短针 = 一次发布 · 悬停查看"
      />
      <div
        className="relative"
        style={{
          ...(minBoxH ? { minHeight: minBoxH } : undefined),
          ['--lane-label' as string]: wide ? '132px' : '104px',
          ['--lane-meta' as string]: wide ? '128px' : '58px',
        }}
      >
        <ul className="relative">
          {lanes.map((lane, i) => {
            const company = companyOf(lane.company)
            // 本泳道被悬停的那根针 → 读数钉在它上方；其他泳道不显示
            const hoverOfLane =
              hover && hover.company === lane.company
                ? (() => {
                    const tower = towersOf
                      .get(lane.company)
                      ?.find((t) => t.models.some((m) => m.id === hover.id))
                    return tower ? { pct: tower.pct, model: hover } : null
                  })()
                : null
            return (
              <li
                key={lane.company}
                className={`group flex items-center gap-3 px-3 py-[7px] transition-colors hover:bg-[var(--sunken)] ${
                  i > 0 ? 'border-t border-[var(--line)]' : ''
                }`}
              >
                <span className="relative z-10 flex w-[var(--lane-label)] flex-none items-center gap-1.5 pr-2">
                  <Icon name={company?.icon ?? 'openai'} size={13} color={company?.color} preferColor />
                  <span
                    className="min-w-0 truncate text-[11.5px] font-medium text-[var(--ink-2)] group-hover:text-[var(--ink)]"
                    title={companyLabel(company, lane.company)}
                  >
                    {companyShortLabel(company, lane.company)}
                  </span>
                </span>

                <span className="relative h-5 min-w-0 flex-1">
                  {/* 年份竖线：只画在轨迹区内，不侵入左右文字列 */}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                    {years.map((y) => (
                      <span
                        key={y.label}
                        className="absolute inset-y-0 w-px bg-[var(--line-2)]/50"
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
                  {/* 悬停读数：钉在针上方，随行移动；clamp 在轨迹区内避免溢出 */}
                  {hoverOfLane && (
                    <span
                      className="pointer-events-none absolute top-4 z-20 -translate-x-1/2 rounded-sm border border-[var(--ink)] bg-[var(--card)] px-1.5 py-0.5"
                      style={{ left: `${Math.min(88, Math.max(12, hoverOfLane.pct))}%` }}
                    >
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className="h-1.5 w-1.5 flex-none rounded-full"
                          style={{
                            background:
                              hoverOfLane.model.level === 'flagship'
                                ? LEVEL_STYLES.flagship.signal
                                : LEVEL_STYLES.major.signal,
                          }}
                        />
                        <span className="text-[11px] font-medium text-[var(--ink)]">
                          {hoverOfLane.model.name}
                        </span>
                        <span className="tnum font-mono text-[9.5px] text-[var(--ink-4)]">
                          {hoverOfLane.model.releaseDate.slice(0, 7).replace('-', '.')}
                        </span>
                      </span>
                    </span>
                  )}
                  {towersOf.get(lane.company)?.map((t) => {
                    const isF = t.models.some((m) => m.level === 'flagship')
                    const isHover = hover !== null && t.models.some((m) => m.id === hover.id)
                    // 悬停时把整条泳道的其他针压暗，突出当前这一根
                    const laneDim = hover !== null && !t.models.some((m) => m.id === hover.id)
                    // 刻度高度表示“当天几款”：1 款 = 8px细针，多款向上长高，最 18px
                    const h = t.models.length === 1 ? 8 : Math.min(18, 8 + t.models.length * 3)
                    const names = t.models.map((m) => m.name).join(' / ')
                    // 命中区比视觉针宽得多：8px 的透明热区，鼠标不用瞄准
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
                        className="group/needle absolute bottom-1/2 flex -translate-x-1/2 cursor-pointer items-end justify-center"
                        style={{ left: `${t.pct}%`, width: 10, height: 20 }}
                      >
                        {/* 视针：只改颜色与高度，不做缩放/描边，避免抖动 */}
                        <span
                          className="block rounded-[2px] transition-[width,opacity] duration-100"
                          style={{
                            width: isHover ? 4 : t.models.length > 1 ? 3 : 2,
                            height: h,
                            background: isHover ? 'var(--accent)' : isF ? LEVEL_STYLES.flagship.signal : LEVEL_STYLES.major.signal,
                            opacity: laneDim ? 0.28 : 1,
                          }}
                        />
                      </button>
                    )
                  })}
                </span>

                {/* 右侧不再只给一个“X 天/代”：把“几代”和“多快”用文字并列，
                    避免用户看一排散点还要自己数 */}
                <span
                  className="relative z-10 flex w-[var(--lane-meta)] flex-none items-baseline justify-end gap-2 pl-2 whitespace-nowrap"
                  title={`${lane.family} · 最新 ${lane.latest}（${lane.models.length} 代）`}
                >
                  {wide && <span className="text-[10.5px] text-[var(--ink-3)]">{lane.family}</span>}
                  <span className="tnum font-mono text-[9.5px] whitespace-nowrap text-[var(--ink-4)]">
                    <span className="font-semibold text-[var(--ink-2)]">{lane.models.length}</span> 代 ·{' '}
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
            className="group flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-[var(--line)] bg-[var(--sunken)] px-3 py-[7px] text-[11px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--sunken-2)] hover:text-[var(--ink)]"
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
        <div className="relative h-5 border-t border-[var(--line)] bg-[var(--sunken)] pl-[calc(var(--lane-label)+1.5rem)] pr-[calc(var(--lane-meta)+1.5rem)]">
          <div className="relative h-full">
            {years.map((y) => (
              <span
                key={y.label}
                className="tnum absolute top-0.5 -translate-x-1/2 font-mono text-[9.5px] text-[var(--ink-4)]"
                style={{ left: `${Math.min(97, Math.max(3, y.pct))}%` }}
              >
                {y.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
