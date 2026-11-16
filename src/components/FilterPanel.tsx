import { useState } from 'react'
import { Icon } from './Icon'
import { ModalityIcon } from './ModalityIcon'
import { MODALITY_ICONS } from './modalityIcons'
import { categoryOf, LEVEL_STYLES } from './tokens'
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
  total: number
  totalAll: number
  onToggleCompany: (id: string) => void
  onToggleLevel: (id: LevelId) => void
  onToggleModality: (id: ModalityId) => void
  onToggleCategory: (id: CategoryId) => void
  onReset: () => void
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink-4)] uppercase">
      {children}
      <span className="h-px flex-1 bg-[var(--line)]" />
      {aside}
    </h2>
  )
}

const COMPANY_PREVIEW = 8

/**
 * 筛选面板。
 * 选中态不用彩色底：一条 3px 的墨色竖标 + 实心墨字，和全站「油墨浓度 = 权重」一致。
 */
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
      {/* 结果计数：与右侧月份刻度同基线 */}
      <div className="flex shrink-0 items-baseline justify-between gap-2 px-2">
        <span className="tnum flex items-baseline gap-1 font-mono">
          <span className="text-[22px] leading-none font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {total}
          </span>
          <span className="text-[11px] text-[var(--ink-4)]">/ {totalAll}</span>
        </span>
        <button
          type="button"
          onClick={onReset}
          tabIndex={hasFilters ? 0 : -1}
          aria-hidden={!hasFilters}
          className={`shrink-0 text-[11px] text-[var(--ink-3)] transition-colors hover:text-[var(--accent)] ${
            hasFilters ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          清除筛选
        </button>
      </div>

      <section className="shrink-0">
        <SectionTitle
          aside={
            !companiesOpen && selectedCompanies.size > 0 ? (
              <span className="rounded-xs bg-[var(--ink)] px-1 py-px font-mono text-[9px] font-medium tracking-normal text-white">
                {selectedCompanies.size}
              </span>
            ) : undefined
          }
        >
          厂商
        </SectionTitle>
        <ul className="flex flex-col gap-px">
          {visibleCompanies.map((c) => {
            const active = selectedCompanies.has(c.id)
            const count = counts.byCompany.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onToggleCompany(c.id)}
                  aria-pressed={active}
                  className={`relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-[5px] text-left transition-colors ${
                    active
                      ? 'bg-[var(--sunken)] text-[var(--ink)]'
                      : 'text-[var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[var(--ink)]'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-[5px] left-0 w-[3px] rounded-full bg-[var(--ink)]" />
                  )}
                  <Icon
                    name={c.icon}
                    size={15}
                    color={active ? c.color : undefined}
                    preferColor={active}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium" title={companyLabel(c)}>
                    {companyShortLabel(c)}
                  </span>
                  <span
                    className={`tnum font-mono text-[10px] ${
                      active ? 'text-[var(--ink-2)]' : 'text-[var(--ink-4)]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {(companiesOpen || hiddenCompanyCount > 0) && (
          <button
            type="button"
            onClick={() => setCompaniesOpen((v) => !v)}
            aria-expanded={companiesOpen}
            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm py-1 text-[10.5px] text-[var(--ink-3)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)]"
          >
            <Caret open={companiesOpen} />
            {companiesOpen ? '收起' : `还有 ${hiddenCompanyCount} 家`}
          </button>
        )}
      </section>

      <section className="shrink-0">
        <SectionTitle>分类</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {[...categories]
            .sort((a, b) => (counts.byCategory.get(b.id) ?? 0) - (counts.byCategory.get(a.id) ?? 0))
            .map((c) => {
              const active = selectedCategories.has(c.id)
              const count = counts.byCategory.get(c.id) ?? 0
              const meta = categoryOf(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCategory(c.id)}
                  aria-pressed={active}
                  className={`flex cursor-pointer items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[11px] transition-colors ${
                    active
                      ? 'border-[var(--ink)] text-[var(--ink)]'
                      : count === 0
                        ? 'border-[var(--line)] text-[var(--ink-4)]'
                        : 'border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:text-[var(--ink)]'
                  }`}
                  style={active ? { background: meta.soft } : undefined}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? meta.dot : 'var(--line-2)' }} />
                  {c.name}
                  <span className="tnum font-mono text-[9.5px] text-[var(--ink-4)]">{count}</span>
                </button>
              )
            })}
        </div>
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
                className={`flex cursor-pointer items-center gap-1 rounded-sm border px-1.5 py-[3px] text-[11px] transition-colors ${
                  active ? 'border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-2)]'
                }`}
                style={{ background: active ? meta.soft : 'transparent', color: active ? meta.color : 'var(--ink-2)' }}
              >
                <ModalityIcon id={m.id} size={11} />
                {m.name}
                <span className="tnum font-mono text-[9.5px] text-[var(--ink-4)]">
                  {counts.byModality.get(m.id) ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="shrink-0">
        <SectionTitle>重要程度</SectionTitle>
        <div className="flex flex-col gap-px">
          {levels.map((l) => {
            const active = selectedLevels.has(l.id)
            const style = LEVEL_STYLES[l.id]
            const count = counts.byLevel.get(l.id) ?? 0
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onToggleLevel(l.id)}
                aria-pressed={active}
                className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-[5px] text-[12px] transition-colors ${
                  active
                    ? 'bg-[var(--sunken)] text-[var(--ink)]'
                    : 'text-[var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[var(--ink)]'
                }`}
              >
                {/* 与列表卡同一套分级几何 */}
                <span className="relative h-3.5 w-[10px] shrink-0 overflow-hidden rounded-[2px] bg-[var(--sunken-2)]">
                  <span
                    className="absolute inset-x-0"
                    style={{
                      background: style.signal,
                      top: style.mark === 'solid' ? 0 : style.mark === 'dot' ? '45%' : '28%',
                      height:
                        style.mark === 'solid' ? '100%' : style.mark === 'dot' ? '10%' : style.mark === 'half' ? '44%' : '44%',
                    }}
                  />
                </span>
                <span className="flex-1 text-left font-medium">{l.name}</span>
                <span className="tnum font-mono text-[10px] text-[var(--ink-4)]">{count}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
