import { Icon } from './Icon'
import { ModalityChip } from './ModalityIcon'
import { categoryOf, LEVEL_STYLES } from './tokens'
import { Arrow, Pill } from './ui'
import { blendedCost, formatCostUSD, getAnchorCost, tierOf } from '../lib/price'
import { allModels, companyLabel, companyShortLabel } from '../lib/data'
import type { Company, Model } from '../types'
import { formatDate } from '../lib/timeline'

interface TimelineCardProps {
  model: Model
  company?: Company
  onSelect: (model: Model) => void
}

/**
 * 列表卡：一张纸质档案卡。
 * 左侧「分级尺」用几何表达重要程度（实心墨块 / 半墨 / 细线 / 虚点），
 * 因此卡片本身不需要彩虹色，整页的层次只来自墨的多少。
 */
export function TimelineCard({ model, company, onSelect }: TimelineCardProps) {
  const level = LEVEL_STYLES[model.level]
  const isFlagship = model.level === 'flagship'
  const isMajor = model.level === 'major'
  const cat = categoryOf(model.category)

  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className={[
        'group relative flex w-full cursor-pointer items-stretch overflow-hidden rounded-md border text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        isFlagship
          ? 'border-[var(--line-ink)] bg-[var(--card)]'
          : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--line-2)]',
      ].join(' ')}
    >
      {/* 分级尺：一条 4px 的左侧轨道。旗舰填满整高，重要填 45%，常规一根竖线 */}
      <span aria-hidden="true" className="relative w-[4px] flex-none bg-[var(--sunken)]">
        {level.mark === 'solid' && (
          <span className="absolute inset-0" style={{ background: level.signal }} />
        )}
        {level.mark === 'half' && (
          <span className="absolute inset-x-0 top-0 h-[45%]" style={{ background: level.signal }} />
        )}
        {level.mark === 'line' && (
          <span
            className="absolute inset-x-0 top-1/2 h-2/5 -translate-y-1/2"
            style={{ background: level.signal }}
          />
        )}
        {level.mark === 'dot' && (
          <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <span className="h-1 w-1 rounded-full" style={{ background: level.signal }} />
          </span>
        )}
      </span>

      <div className="flex min-w-0 flex-1 items-stretch">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pl-2.5 sm:gap-3 sm:pl-3.5">
          {/* 品牌图标：白底圆角块，hairline 描边 */}
          <span className="mt-px inline-flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--card)]">
            <Icon
              name={model.icon ?? company?.icon ?? 'openai'}
              size={17}
              color={company?.color}
              preferColor
              title={company ? companyLabel(company, '') : undefined}
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                className={`min-w-0 truncate tracking-[-0.01em] ${
                  isFlagship
                    ? 'text-[14.5px] font-semibold text-[var(--ink)]'
                    : 'text-[14px] font-medium text-[var(--ink)]'
                }`}
                title={model.name}
              >
                {model.name}
              </h3>
              {(isFlagship || isMajor) && (
                <span
                  className="hidden flex-none rounded-xs px-1.5 py-px text-[9.5px] font-semibold tracking-wide sm:inline"
                  style={{
                    background: level.chipBg,
                    color: level.chipText,
                    border: `1px solid ${level.chipBorder}`,
                  }}
                >
                  {level.label}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="inline-flex min-w-0 items-center gap-1 text-[var(--ink-2)]">
                {company && <Icon name={company.icon} size={11} color={company.color} preferColor />}
                <span className="truncate">{companyShortLabel(company)}</span>
              </span>
              <span className="text-[var(--line-2)]">·</span>
              <span
                className="inline-flex items-center gap-1 rounded-xs px-1 py-px text-[10.5px]"
                style={{ background: cat.soft, color: cat.ink }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: cat.dot }} />
                {cat.label}
              </span>
              <PriceChip model={model} />
              {model.inputs.length > 0 && (
                <span className="flex shrink-0 items-center gap-0.5">
                  {model.inputs.slice(0, 3).map((m) => (
                    <ModalityChip key={m} id={m} iconOnly />
                  ))}
                  {model.inputs.length > 3 && (
                    <span className="tnum font-mono text-[9.5px] text-[var(--ink-4)]">
                      +{model.inputs.length - 3}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右侧信息栏：日期 + 翻开箭头。手机端紧凑为一行 */}
        <div className="flex flex-none items-center gap-2 pr-2.5 pl-1.5 sm:gap-2.5 sm:border-l sm:border-[var(--line)] sm:pr-3 sm:pl-3">
          <time
            dateTime={model.releaseDate}
            className="tnum hidden font-mono text-[11px] text-[var(--ink-4)] sm:inline"
          >
            {formatDate(model.releaseDate)}
          </time>
          <span className="text-[var(--ink-3)]">
            <Arrow size={9} />
          </span>
        </div>
      </div>
    </button>
  )
}

/** 价格：用「热量」色阶表达相对贵/便宜，是全站唯一的暖色来源 */
function PriceChip({ model }: { model: Model }) {
  const cost = blendedCost(model)
  const anchor = getAnchorCost(allModels)
  if (cost === null || !anchor) return null
  const mult = cost / anchor
  const tier = tierOf(mult)
  return (
    <Pill
      title={`${tier.label} · ${tier.relative}（百万 token 混合成本约 ${formatCostUSD(cost)}）`}
      className="!bg-transparent !px-0"
    >
      <span className="flex items-center gap-1" style={{ color: tier.color }}>
        <span className="tnum font-mono text-[9.5px] tracking-[-0.08em]">{tier.symbol}</span>
        <span className="text-[10px] font-medium">{tier.relative}</span>
      </span>
    </Pill>
  )
}
