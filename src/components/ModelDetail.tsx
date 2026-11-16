import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { ModalityChip } from './ModalityIcon'
import { CATEGORY_META, LEVEL_STYLES } from './tokens'
import type { Company, Model } from '../types'
import { daysSince, formatFullDate, relativeTime } from '../lib/timeline'
import { blendedCost, formatCostUSD, getAnchorCost, tierOf } from '../lib/price'
import { allModels, companyLabel } from '../lib/data'

/** 同厂商最接近的前后两次发布，帮助把单个模型放回自家演进脉络里 */
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
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-start gap-3 py-2">
      <dt className="pt-px text-[11.5px] text-[var(--fg-4)]">{label}</dt>
      <dd className="min-w-0 text-[12.5px] text-[var(--fg)]">{children}</dd>
    </div>
  )
}

/** 价格档位 + 中文相对描述，缺价时如实留空 */
function PriceCell({ model }: { model: Model }) {
  const cost = blendedCost(model)
  const anchor = getAnchorCost(allModels)
  if (cost === null || !anchor) {
    return <span className="text-[var(--fg-4)]">未公开</span>
  }
  const mult = cost / anchor
  const tier = tierOf(mult)
  const { input, output } = model.cost!
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-semibold"
          style={{ background: `color-mix(in srgb, ${tier.color} 16%, transparent)`, color: tier.color }}
        >
          {tier.symbol}
          <span className="font-sans text-[10.5px] font-medium">{tier.label}</span>
        </span>
        <span className="text-[11.5px] font-medium" style={{ color: tier.color }}>
          {tier.relative}
        </span>
      </span>
      <span className="font-mono text-[10.5px] tabular-nums text-[var(--fg-4)]">
        ${input} / ${output} 每百万 token · 约 {formatCostUSD(cost)} 混合成本
      </span>
    </span>
  )
}

export function ModelDetail({ model, company, referenceDate, onClose }: ModelDetailProps) {
  const [shareState, setShareState] = useState<string | null>(null)
  useEffect(() => {
    if (!model) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [model, onClose])

  if (!model) return null

  const level = LEVEL_STYLES[model.level]
  const category = CATEGORY_META[model.category]
  const { prev, next } = neighbors(model)
  const days = daysSince(model.releaseDate, referenceDate)
  // 深链：把当前模型写进 URL，方便贴给同事
  const share = async () => {
    const url = `${window.location.href.split('#')[0]}#model=${model.id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareState('已复制')
    } catch {
      setShareState(url)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/75"
      />
      {/* 手机：底部抽屉，最高 92vh 且内部可滚，长备注不会顶出屏幕；桌面：居中卡片 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-detail-title"
        className="animate-fade-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-md border border-[var(--line-2)] bg-[var(--surface)] sm:max-h-[85vh] sm:m-4 sm:max-w-md sm:rounded-md"
      >
        {/* 顶部分级色条 */}
        <span className="block h-[3px] w-full" style={{ background: level.signal }} />

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex flex-none items-center justify-center rounded-sm border border-[var(--line-2)] bg-[var(--surface-2)]"
              style={{ width: 46, height: 46 }}
            >
              <Icon
                name={model.icon ?? company?.icon ?? 'openai'}
                size={27}
                color={company?.color}
                preferColor
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="rounded-xs border px-1.5 py-px text-[10px] font-medium"
                  style={{
                    borderColor: level.chipBorder,
                    background: level.chipBg,
                    color: level.chipText,
                  }}
                >
                  {level.label}
                </span>
                <span className={`text-[10.5px] ${category?.className ?? 'text-[var(--fg-3)]'}`}>
                  {category?.label}
                </span>
              </div>
              <h3
                id="model-detail-title"
                className="mt-1 truncate text-[17px] font-semibold tracking-tight text-white"
              >
                {model.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="-mr-1 -mt-1 inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-xs text-[var(--fg-3)] transition-colors hover:bg-[var(--surface-3)] hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </button>
          </div>

          <dl className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            <Row label="公司">
              {company ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--accent)]"
                >
                  <Icon name={company.icon} size={13} color={company.color} preferColor />
                  {companyLabel(company)}
                  {company.nameZh !== company.name && (
                    <span className="text-[var(--fg-3)]">{company.name}</span>
                  )}
                </a>
              ) : (
                '—'
              )}
            </Row>
            <Row label="发布时间">
              <span className="tabular-nums">{formatFullDate(model.releaseDate)}</span>
              <span className="ml-1.5 text-[11px] text-[var(--fg-4)]">
                {relativeTime(model.releaseDate, referenceDate)}
                {days > 0 && <span className="ml-1 opacity-60">（{days} 天）</span>}
              </span>
            </Row>
            {(prev || next) && (
              <Row label="同厂前后">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
                  {prev && (
                    <span className="text-[var(--fg-3)]">
                      ← {prev.name}
                      <span className="ml-1 font-mono text-[10px] text-[var(--fg-4)]">
                        {prev.releaseDate.slice(5).replace('-', '/')}
                      </span>
                    </span>
                  )}
                  {next && (
                    <span className="text-[var(--fg-3)]">
                      {next.name} →
                      <span className="ml-1 font-mono text-[10px] text-[var(--fg-4)]">
                        {next.releaseDate.slice(5).replace('-', '/')}
                      </span>
                    </span>
                  )}
                </span>
              </Row>
            )}
            <Row label="输入类型">
              <span className="flex flex-wrap gap-1">
                {model.inputs.map((m) => (
                  <ModalityChip key={m} id={m} />
                ))}
              </span>
            </Row>
            <Row label="价格">
              <PriceCell model={model} />
            </Row>
            <Row label="模型 ID">
              <code className="rounded-xs bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--fg-2)]">
                {model.id}
              </code>
            </Row>
          </dl>

          {model.note && (
            <p className="mt-3 border-l-2 border-[var(--line-2)] pl-2.5 text-[11.5px] leading-relaxed text-[var(--fg-2)]">
              {model.note}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] leading-relaxed text-[var(--fg-4)]">
            数据来源 models.dev · 官方发布公告
            <br />
            价格为 USD / 百万 token，倍率以 GPT-5.2 混合成本（输入×3 + 输出）为 1× 估算
          </p>

          <div className="mt-3 flex items-center gap-2 border-t border-[var(--line)] pt-3">
            <button
              type="button"
              onClick={share}
              className="cursor-pointer rounded-xs border border-[var(--line-2)] px-2 py-1 text-[11px] text-[var(--fg-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {shareState === '已复制' ? '已复制 ✓' : '复制此模型链接'}
            </button>
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--fg-4)]">
              {shareState && shareState !== '已复制' ? shareState : `#model=${model.id}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xs bg-[var(--surface-3)] px-2.5 py-1 text-[11px] text-[var(--fg)] transition-colors hover:bg-[var(--line-2)] hover:text-white"
            >
              关闭
              <span className="ml-1 hidden font-mono text-[10px] text-[var(--fg-4)] sm:inline">Esc</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
