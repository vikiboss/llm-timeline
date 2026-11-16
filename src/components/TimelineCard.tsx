import { Icon } from './Icon'
import { ModalityChip } from './ModalityIcon'
import { CATEGORY_META, LEVEL_STYLES } from './tokens'
import { ANCHOR_LABEL, blendedCost, formatCostUSD, getAnchorCost, tierOf } from '../lib/price'
import { allModels, companyLabel, companyShortLabel } from '../lib/data'
import type { Company, Model } from '../types'
import { formatDate, relativeTime } from '../lib/timeline'

interface TimelineCardProps {
  model: Model
  company?: Company
  referenceDate: string
  onSelect: (model: Model) => void
}

export function TimelineCard({ model, company, referenceDate, onSelect }: TimelineCardProps) {
  const level = LEVEL_STYLES[model.level]
  const isFlagship = model.level === 'flagship'
  const isMajor = model.level === 'major'
  const category = CATEGORY_META[model.category]

  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className={[
        'group relative flex w-full cursor-pointer items-stretch border bg-[var(--surface)] text-left transition-colors',
        'rounded-md',
        isFlagship
          ? 'border-[color-mix(in_oklab,var(--lv-flagship)_28%,var(--line))] hover:border-[color-mix(in_oklab,var(--lv-flagship)_50%,var(--line))]'
          : 'border-[var(--line)] hover:border-[var(--line-2)] hover:bg-[var(--surface-2)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
      ].join(' ')}
    >
      {/* 左侧分级色条：扁平直边，仅旗舰/重要着色 */}
      <span
        aria-hidden="true"
        className="w-[3px] flex-none"
        style={{ background: isFlagship || isMajor ? level.signal : 'transparent' }}
      />

      {/* 手机：更紧的内边距与图标；桌面保持原有呼吸感 */}
      <div className="flex min-w-0 flex-1 items-start gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        <span className="mt-px inline-flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-[var(--line-2)] bg-[var(--surface-2)] sm:h-8 sm:w-8">
          <Icon
            name={model.icon ?? company?.icon ?? 'openai'}
            size={17}
            color={company?.color}
            preferColor
            title={company ? companyLabel(company, '') : undefined}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className={`min-w-0 truncate tracking-tight ${
                isFlagship
                  ? 'text-[14.5px] font-semibold text-white'
                  : 'text-[14px] font-medium text-[var(--fg)]'
              }`}
              title={model.name}
            >
              {model.name}
            </h3>
            <time
              dateTime={model.releaseDate}
              className="flex-none font-mono text-[11px] text-[var(--fg-4)] tabular-nums"
            >
              {formatDate(model.releaseDate)}
            </time>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:mt-1 sm:gap-x-2 sm:text-[11.5px]">
            <span className="inline-flex min-w-0 items-center gap-1 text-[var(--fg-2)]">
              {company && (
                <Icon name={company.icon} size={11} color={company.color} preferColor />
              )}
              <span className="truncate">{companyShortLabel(company)}</span>
            </span>
            <span className="text-[var(--fg-4)]">·</span>
            <span className={category?.className ?? 'text-[var(--fg-3)]'}>{category?.label}</span>
            <PriceDot model={model} />
            {/* 常规/衍生不额外占位：手机端靠左侧色条表达，只有旗舰/重要需要文字强调 */}
            {(isFlagship || isMajor) && (
              <span
                className="ml-auto rounded-xs border px-1 py-px text-[9.5px] font-medium sm:px-1.5 sm:text-[10px]"
                style={{
                  background: level.chipBg,
                  color: level.chipText,
                  borderColor: level.chipBorder,
                }}
              >
                {level.label}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:mt-2">
            {model.inputs.map((m) => (
              <ModalityChip key={m} id={m} />
            ))}
            {/* 相对时间只在桌面 hover 时出现；手机没有 hover，恒不显示 */}
            <span className="ml-auto hidden text-[10px] text-[var(--fg-4)] opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
              {relativeTime(model.releaseDate, referenceDate)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

/** 卡片上的价格标记：中文相对描述，一眼看出贵不贵 */
function PriceDot({ model }: { model: Model }) {
  const cost = blendedCost(model)
  const anchor = getAnchorCost(allModels)
  if (cost === null || !anchor) return null
  const mult = cost / anchor
  const tier = tierOf(mult)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xs px-1 py-px text-[10px] leading-tight font-medium"
      style={{
        background: `color-mix(in srgb, ${tier.color} 14%, transparent)`,
        color: tier.color,
      }}
      title={`${tier.label} · ${tier.relative}（以 ${ANCHOR_LABEL} 为基准价，约 ${formatCostUSD(cost)} / 百万 token）`}
    >
      <span aria-hidden="true" className="font-mono" style={{ letterSpacing: '-0.06em' }}>
        {tier.symbol}
      </span>
      {tier.relative}
    </span>
  )
}
