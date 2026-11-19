import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { ModalityChip } from './ModalityIcon'
import { categoryOf, LEVEL_STYLES } from './tokens'
import { Close } from './ui'
import type { Company, Model } from '../types'
import { daysSince, relativeTime } from '../lib/timeline'
import { blendedCost, formatCostUSD, formatMultiplier, getAnchorCost, tierOf } from '../lib/price'
import { allModels, companyLabel } from '../lib/data'

function neighbors(model: Model) {
  const sibs = allModels
    .filter((m) => m.company === model.company && m.id !== model.id && m.category === 'chat')
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  const prev = sibs.find((m) => m.releaseDate < model.releaseDate)
  const next = sibs.find((m) => m.releaseDate > model.releaseDate)
  return { prev, next }
}

interface ModelDetailProps {
  model: Model | null
  company?: Company
  referenceDate: string
  onClose: () => void
  onSelect?: (model: Model) => void
}

/** 字段名：等宽小字 + 宽字距，像档案页的栏头。 */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <dt className="font-mono text-[9.5px] leading-none font-medium tracking-[0.16em] text-[var(--ink-4)] uppercase">
      {children}
    </dt>
  )
}

/** 价格：分「结论 → 单价 → 参照」三层，读数本身用大字。 */
function PriceBlock({ model }: { model: Model }) {
  const cost = blendedCost(model)
  const anchor = getAnchorCost(allModels)
  if (cost === null || !anchor || !model.cost) {
    return <p className="text-[12.5px] text-[var(--ink-4)]">未公开定价</p>
  }
  const tier = tierOf(cost / anchor)
  return (
    <div className="flex flex-col gap-2.5">
      {/* 结论：档位 + 倍数，一句话说清贵不贵 */}
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold" style={{ color: tier.color }}>
          {tier.label}
        </span>
        <span className="tnum font-mono text-[11px] text-[var(--ink-3)]">
          {formatMultiplier(cost / anchor)} 基准
        </span>
      </div>

      {/* 单价表：输入 / 输出并排，数字右对齐，方便纵向比较 */}
      <div className="grid grid-cols-2 gap-x-4 rounded-sm bg-[var(--sunken)] px-3 py-2">
        {[
          ['输入', model.cost.input],
          ['输出', model.cost.output],
        ].map(([label, v], i) => (
          <div key={label as string} className={i === 0 ? 'border-r border-[var(--line)] pr-4' : ''}>
            <span className="block text-[9.5px] tracking-[0.1em] text-[var(--ink-4)]">{label}</span>
            <span className="tnum font-mono text-[15px] leading-tight font-semibold text-[var(--ink)]">
              ${v}
            </span>
          </div>
        ))}
        <span className="col-span-2 mt-1.5 border-t border-[var(--line)] pt-1.5 text-[9.5px] text-[var(--ink-4)]">
          USD / 百万 token · 混合成本约 {formatCostUSD(cost)}
        </span>
      </div>
    </div>
  )
}

/** 代际导航：页脚里左右各占一半，是看完一个模型后最自然的去向。 */
function NavHalf({
  model,
  dir,
  onSelect,
}: {
  model: Model
  dir: 'prev' | 'next'
  onSelect: (m: Model) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      title={`${model.name} · ${model.releaseDate}`}
      className={`group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-4 py-3 transition-colors hover:bg-[var(--sunken)] sm:px-5 ${
        dir === 'next' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {/* 左段：箭头 + 上一代/下一代，二者横排 */}
      <span className="flex flex-none items-center gap-1.5 text-[var(--ink-4)]">
        <span className="font-mono text-[12px] leading-none transition-transform group-hover:-translate-x-0.5">
          {dir === 'prev' ? '←' : '→'}
        </span>
        <span className="text-[10px] leading-none tracking-[0.1em] whitespace-nowrap">
          {dir === 'prev' ? '上一代' : '下一代'}
        </span>
      </span>

      {/* 中段：模型名在上，时间在下，竖向排列 */}
      <span className={`flex min-w-0 flex-1 flex-col gap-[3px] ${dir === 'next' ? 'items-end' : 'items-start'}`}>
        <span className="truncate text-[12px] leading-tight font-medium text-[var(--ink-2)] group-hover:text-[var(--ink)]">
          {model.name}
        </span>
        <span className="tnum font-mono text-[9.5px] leading-tight text-[var(--ink-4)]">
          {model.releaseDate.slice(0, 7).replace('-', '.')}
        </span>
      </span>
    </button>
  )
}

/**
 * 详情：一张展开的档案卡。
 * 桌面是「左身份 / 右规格」的双栏；手机是单栏，从底部升起。
 */
export function ModelDetail({ model, company, referenceDate, onClose, onSelect }: ModelDetailProps) {
  const [copiedFor, setCopiedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!model) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // 锁定滚动时补上滚动条占位，否则页面会向右跳一格
    const body = document.body
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    const gap = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`

    return () => {
      window.removeEventListener('keydown', onKey)
      body.style.overflow = prev.overflow
      body.style.paddingRight = prev.paddingRight
    }
  }, [model, onClose])

  if (!model) return null

  const level = LEVEL_STYLES[model.level]
  const cat = categoryOf(model.category)
  const { prev, next } = neighbors(model)
  const days = daysSince(model.releaseDate, referenceDate)
  const [year, month, day] = model.releaseDate.split('-')

  const share = async () => {
    const url = `${window.location.href.split('#')[0]}#model=${model.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedFor(model.id)
    } catch {
      setCopiedFor(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--ink)]/25 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-detail-title"
        className="animate-sheet-up relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg border border-[var(--line-2)] bg-[var(--card)] sm:max-h-[86vh] sm:w-full sm:max-w-[760px] sm:rounded-lg"
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-[var(--line-2)]" />
        </div>

        {/* 头部：整卡唯一带色带的位置，标明等级；右侧常驻关闭 */}
        <div className="relative flex-none border-b border-[var(--line)]">
          <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: level.signal }} aria-hidden="true" />
          <div className="flex items-center justify-between px-4 pt-3 pb-2.5 sm:px-6 sm:pt-3.5 sm:pb-3">
            <span className="flex items-center gap-2">
              <span
                className="rounded-xs px-1.5 py-[3px] text-[9.5px] font-semibold"
                style={{ background: level.chipBg, color: level.chipText, border: `1px solid ${level.chipBorder}` }}
              >
                {level.label}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-xs px-1.5 py-[3px] text-[10px] font-medium"
                style={{ background: cat.soft, color: cat.ink }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: cat.dot }} />
                {cat.label}
              </span>
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={share}
                className="-mr-0.5 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-[10.5px] font-medium text-[var(--ink-4)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)]"
              >
                <span className="font-mono text-[11px] leading-none">&#10697;</span>
                {copiedFor === model.id ? '已复制链接' : '分享'}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-[var(--ink-4)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)]"
              >
                <Close size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* 主体：左身份（深色块）/ 右规格。中间一根 hairline 分栏。 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="sm:grid sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)]">
            {/* ── 左：身份 + 日期 ── */}
            <div className="flex flex-col gap-4 border-b border-[var(--line)] px-4 py-4 sm:justify-between sm:border-r sm:border-b-0 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3.5">
                <span className="inline-flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--card)] p-2">
                  <Icon
                    name={model.icon ?? company?.icon ?? 'openai'}
                    size={30}
                    color={company?.color}
                    preferColor
                  />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3
                    id="model-detail-title"
                    className="text-[21px] leading-[1.15] font-semibold tracking-[-0.025em] text-[var(--ink)]"
                  >
                    {model.name}
                  </h3>
                  {company && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--ink-3)] transition-colors hover:text-[var(--accent)]"
                    >
                      <Icon name={company.icon} size={12} color={company.color} preferColor />
                      {companyLabel(company)}
                    </a>
                  )}
                </div>
              </div>

              {/* 日期：整卡唯一一处完整日期，压在左栏底部，把上方留白变成呼吸而不是空洞 */}
              <div className="flex items-end justify-between gap-3 border-t border-[var(--line)] pt-3.5">
                <div className="flex items-end gap-1.5">
                  <span className="tnum font-mono text-[40px] leading-[0.78] font-semibold tracking-[-0.045em] text-[var(--ink)]">
                    {day}
                  </span>
                  <span className="flex flex-col gap-[3px]">
                    <span className="tnum font-mono text-[12px] leading-none font-medium text-[var(--ink-2)]">
                      {Number(month)} 月
                    </span>
                    <span className="tnum font-mono text-[10px] leading-none text-[var(--ink-4)]">{year}</span>
                  </span>
                </div>
                <span className="pb-0.5 text-right">
                  <span className="block text-[11px] leading-tight text-[var(--ink-3)]">
                    {relativeTime(model.releaseDate, referenceDate)}
                  </span>
                  <span className="tnum mt-0.5 block font-mono text-[9.5px] leading-tight text-[var(--ink-4)]">
                    {days} 天前
                  </span>
                </span>
              </div>
            </div>

            {/* ── 右：规格 ── */}
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <FieldLabel>输入</FieldLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {model.inputs.map((m) => (
                    <ModalityChip key={m} id={m} />
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--line)] pt-3.5">
                <FieldLabel>价格</FieldLabel>
                <div className="mt-2">
                  <PriceBlock model={model} />
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-[var(--line)] pt-3.5">
                <span>
                  <FieldLabel>编号</FieldLabel>
                  <code className="mt-1.5 block font-mono text-[11px] text-[var(--ink-3)]">{model.id}</code>
                </span>
                <span className="font-mono text-[9px] leading-[1.6] text-[var(--ink-4)]">
                  models.dev · 官方公告
                  <br />
                  倍率以 GPT-5.2 混合成本为 1× 估算
                </span>
              </div>
            </div>
          </div>

          {model.note && (
            <p className="border-t border-[var(--line)] bg-[var(--sunken)] px-4 py-3 text-[12px] leading-[1.65] text-[var(--ink-2)] sm:px-6">
              {model.note}
            </p>
          )}
        </div>

        {/* 页脚：只放代际导航，它是看完一个模型后最自然的去向 */}
        <div className="flex flex-none items-stretch border-t border-[var(--line)] bg-[var(--sunken)] pb-[env(safe-area-inset-bottom)]">
          {prev && onSelect && <NavHalf model={prev} dir="prev" onSelect={onSelect} />}
          {prev && next && <span className="w-px flex-none bg-[var(--line)]" aria-hidden="true" />}
          {next && onSelect && <NavHalf model={next} dir="next" onSelect={onSelect} />}
        </div>
      </div>
    </div>
  )
}
