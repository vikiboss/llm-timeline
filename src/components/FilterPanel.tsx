import { useState } from 'react'
import { Icon } from './Icon'
import { ModalityIcon } from './ModalityIcon'
import { MODALITY_ICONS } from './modalityIcons'
import { CATEGORY_META, LEVEL_STYLES } from './tokens'
import type { CategoryId, CategoryMeta, Company, Level, LevelId, Modality, ModalityId } from '../types'
import { companyLabel, companyShortLabel } from '../lib/data'

interface FilterPanelProps {
  companies: Company[]
  counts: {
    byCompany: Map<string, number>
    byLevel: Map<string, number>
    byModality: Map<string, number>
    byCategory: Map<string, number>
  }
  levels: Level[]
  modalities: Modality[]
  categories: CategoryMeta[]
  selectedCompanies: Set<string>
  selectedLevels: Set<LevelId>
  selectedModalities: Set<ModalityId>
  selectedCategories: Set<CategoryId>
  /** 当前筛选结果数 */
  total: number
  /** 全量事件数，用于形成「20 / 297」的分母 */
  totalAll: number
  onToggleCompany: (id: string) => void
  onToggleLevel: (id: LevelId) => void
  onToggleModality: (id: ModalityId) => void
  onToggleCategory: (id: CategoryId) => void
  onReset: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.16em] text-[var(--fg-4)] uppercase">
      {children}
      <span className="h-px flex-1 bg-[var(--line)]" />
    </h2>
  )
}

/** 公司列表默认展示条数：26 家全展开会把下面三组筛选挤出视口 */
const COMPANY_PREVIEW = 8

export function FilterPanel(props: FilterPanelProps) {
  const [companiesOpen, setCompaniesOpen] = useState(false)
  const {
    companies,
    counts,
    levels,
    modalities,
    categories,
    selectedCompanies,
    selectedLevels,
    selectedModalities,
    selectedCategories,
    total,
    totalAll,
    onToggleCompany,
    onToggleLevel,
    onToggleModality,
    onToggleCategory,
    onReset,
  } = props

  /**
   * 折叠态：已选中的公司永远排在最前（避免「选中了却看不见」），
   * 剩下的按原有实力排名补齐到 COMPANY_PREVIEW 家。
   */
  const visibleCompanies = companiesOpen
    ? companies
    : (() => {
        const picked = companies.filter((c) => selectedCompanies.has(c.id))
        const rest = companies.filter((c) => !selectedCompanies.has(c.id))
        return [...picked, ...rest].slice(0, Math.max(COMPANY_PREVIEW, picked.length))
      })()
  const hiddenCompanyCount = companies.length - visibleCompanies.length

  const hasFilters =
    selectedCompanies.size > 0 ||
    selectedLevels.size > 0 ||
    selectedModalities.size > 0 ||
    selectedCategories.size > 0

  return (
    <div className="flex flex-col gap-5">
      {/* 结果计数：高度锁死到与右侧月份标签一致（内边距 6+6 + 20.25 行高 ≈ 32px），
          两侧吸顶后同基线居中。shrink-0 是必需的：面板是 flex-col 且有限高，
          否则这行会被其他 section 挤缩、计数文字看起来“跑位”。 */}
      {/* 与右侧月份标签共用一行高度：leading-[20.25px] + py-1.5 = 32.25，
          两侧吸顶后文字基线一致。h 固定值太脆，用行高表达意图。 */}
      <div className="flex shrink-0 items-center justify-between gap-2 py-1.5 leading-[20.25px]">
        <span className="flex items-baseline gap-1 font-mono text-[11px] tabular-nums">
          <span className={hasFilters ? 'font-semibold text-[var(--accent)]' : 'text-[var(--fg-2)]'}>
            {total}
          </span>
          <span className="text-[var(--fg-4)]">/ {totalAll}</span>
        </span>
        {/* 始终占位，仅切换可见性，避免筛选时面板高度变化导致下方内容跳动 */}
        <button
          type="button"
          onClick={onReset}
          tabIndex={hasFilters ? 0 : -1}
          aria-hidden={!hasFilters}
          className={`shrink-0 cursor-pointer text-[11px] transition-colors hover:text-white ${
            hasFilters ? 'text-[var(--fg-3)] opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          清除筛选 ✕
        </button>
      </div>

      <section className="shrink-0">
        <SectionTitle>
          公司
          {!companiesOpen && selectedCompanies.size > 0 && (
            <span className="font-sans text-[10px] font-normal tracking-normal text-[var(--accent)]">
              已选 {selectedCompanies.size}
            </span>
          )}
        </SectionTitle>
        <ul className="flex flex-col">
          {visibleCompanies.map((c) => {
            const active = selectedCompanies.has(c.id)
            const count = counts.byCompany.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onToggleCompany(c.id)}
                  aria-pressed={active}
                  className={`relative flex w-full cursor-pointer items-center gap-2 rounded-xs px-2 py-[5px] text-left transition-colors ${
                    active
                      ? 'bg-[var(--surface-3)] text-white'
                      : 'text-[var(--fg-2)] hover:bg-[var(--surface-2)] hover:text-white'
                  }`}
                >
                  {active && (
                    <span
                      className="absolute inset-y-1 left-0 w-[2px] rounded-xs"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <Icon
                    name={c.icon}
                    size={15}
                    color={active ? c.color : undefined}
                    preferColor={active}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[12.5px]"
                    title={companyLabel(c)}
                  >
                    {companyShortLabel(c)}
                  </span>
                  <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-[var(--fg-3)]' : 'text-[var(--fg-4)]'}`}>
                    {count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {/* 展开 / 收起统一放在列表底部，标题栏保持干净 */}
        {(companiesOpen || hiddenCompanyCount > 0) && (
          <button
            type="button"
            onClick={() => setCompaniesOpen((v) => !v)}
            aria-expanded={companiesOpen}
            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1 rounded-xs border border-dashed border-[var(--line)] py-1 text-[10.5px] text-[var(--fg-3)] transition-colors hover:border-[var(--line-2)] hover:text-white"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 10 10"
              aria-hidden="true"
              className={`transition-transform duration-200 ${companiesOpen ? 'rotate-180' : ''}`}
            >
              <path
                d="M2 3.5l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
              />
            </svg>
            {companiesOpen ? '收起' : `还有 ${hiddenCompanyCount} 家`}
          </button>
        )}
      </section>

      <section className="shrink-0">
        <SectionTitle>模型分类</SectionTitle>
        {/* 按事件数倒序：对话常占绝大多数，把长尾（世界模型 / 向量）放最后但仍可见 */}
        <ul className="flex flex-col">
          {[...categories]
            .sort(
              (a, b) => (counts.byCategory.get(b.id) ?? 0) - (counts.byCategory.get(a.id) ?? 0),
            )
            .map((c) => {
              const active = selectedCategories.has(c.id)
              const count = counts.byCategory.get(c.id) ?? 0
              const meta = CATEGORY_META[c.id]
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onToggleCategory(c.id)}
                    aria-pressed={active}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-xs px-2 py-[5px] text-left transition-colors ${
                      active
                        ? 'bg-[var(--surface-3)] text-white'
                        : count === 0
                          ? 'text-[var(--fg-4)]/50'
                          : 'text-[var(--fg-2)] hover:bg-[var(--surface-2)] hover:text-white'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-xs"
                      style={{
                        background: active ? meta?.dot ?? 'var(--accent)' : 'var(--line-2)',
                      }}
                    />
                    <span className={`min-w-0 flex-1 truncate text-[12.5px] ${meta?.className ?? ''}`}>
                      {c.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--fg-4)] tabular-nums">
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>
      </section>

      <section className="shrink-0">
        <SectionTitle>输入类型</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {modalities.map((m) => {
            const active = selectedModalities.has(m.id)
            const meta = MODALITY_ICONS[m.id]
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggleModality(m.id)}
                aria-pressed={active}
                className={`flex cursor-pointer items-center gap-1 rounded-xs border px-1.5 py-1 text-[11.5px] transition-colors ${
                  active ? 'text-white' : 'border-[var(--line)] text-[var(--fg-2)] hover:border-[var(--line-2)]'
                }`}
                style={
                  active
                    ? {
                        borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`,
                        background: meta.soft,
                      }
                    : undefined
                }
              >
                <ModalityIcon id={m.id} size={12} />
                {m.name}
                <span className="font-mono text-[10px] text-[var(--fg-4)] tabular-nums">
                  {counts.byModality.get(m.id) ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="shrink-0">
        <SectionTitle>重要程度</SectionTitle>
        <div className="grid grid-cols-2 gap-1">
          {levels.map((l) => {
            const active = selectedLevels.has(l.id)
            const style = LEVEL_STYLES[l.id]
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onToggleLevel(l.id)}
                aria-pressed={active}
                className="flex cursor-pointer items-center gap-1.5 rounded-xs border px-2 py-1 text-[11.5px] transition-colors"
                style={{
                  borderColor: active ? style.chipBorder : 'var(--line)',
                  background: active ? style.chipBg : 'transparent',
                  color: active ? style.chipText : 'var(--fg-2)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 flex-none rounded-xs"
                  style={{ background: style.signal }}
                />
                {l.name}
                <span className="ml-auto font-mono text-[10px] text-[var(--fg-4)] tabular-nums">
                  {counts.byLevel.get(l.id) ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
