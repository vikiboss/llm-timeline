import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FilterPanel } from './components/FilterPanel'
import { InsightsBar } from './components/InsightsBar'
import { ModelDetail } from './components/ModelDetail'
import { Timeline } from './components/Timeline'
import { ReleaseDensity } from './components/ReleaseDensity'
import { GenerationRace } from './components/GenerationRace'
import { YearNav } from './components/YearNav'
import { Icon } from './components/Icon'
import { LEVEL_STYLES } from './components/tokens'
import {
  allModels,
  companies,
  dataset,
  getActiveCompanies,
  getCompany,
  getCompanyRank,
  categories,
  levels,
  modalities,
} from './lib/data'
import { parseHash, serializeHash, type ViewState } from './lib/routing'
import { filterModels, groupByMonth, sortByDateDesc } from './lib/timeline'
import type { CategoryId, LevelId, ModalityId, Model } from './types'

const REFERENCE_DATE = dataset.lastUpdated

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const initial = parseHash(window.location.hash)

/** 移动端水平分段按钮：快捷套用一组等级筛选 */
function LevelQuickChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-xs border px-2.5 py-1 text-[11.5px] transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-white'
          : 'border-[var(--line)] text-[var(--fg-2)]'
      }`}
    >
      <span className="h-1.5 w-1.5 flex-none rounded-xs" style={{ background: color }} />
      {label}
      <span className="font-mono text-[10px] text-[var(--fg-4)] tabular-nums">{count}</span>
    </button>
  )
}

export default function App() {
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    () => new Set(initial.companies),
  )
  const [selectedLevels, setSelectedLevels] = useState<Set<LevelId>>(
    () => new Set(initial.levels),
  )
  const [selectedModalities, setSelectedModalities] = useState<Set<ModalityId>>(
    () => new Set(initial.modalities),
  )
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryId>>(
    () => new Set(initial.categories),
  )
  const [query, setQuery] = useState(initial.query)
  const [active, setActive] = useState<Model | null>(
    () => allModels.find((m) => m.id === initial.model) ?? null,
  )
  const [panelOpen, setPanelOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const deferredQuery = useDeferredValue(query)
  const activeCompanies = useMemo(() => getActiveCompanies(allModels), [])

  const filtered = useMemo(
    () =>
      sortByDateDesc(
        filterModels(allModels, {
          companies: selectedCompanies,
          levels: selectedLevels,
          modalities: selectedModalities,
          categories: selectedCategories,
          query: deferredQuery,
        }),
      ),
    [selectedCompanies, selectedLevels, selectedModalities, selectedCategories, deferredQuery],
  )

  const groups = useMemo(() => groupByMonth(filtered), [filtered])

  /** 计数基于“除自身维度外”的其余筛选 */
  const counts = useMemo(() => {
    const base = { query: deferredQuery }
    const byCompany = new Map<string, number>()
    const byLevel = new Map<string, number>()
    const byModality = new Map<string, number>()
    const byCategory = new Map<string, number>()

    for (const m of filterModels(allModels, {
      ...base,
      companies: new Set(),
      levels: selectedLevels,
      modalities: selectedModalities,
      categories: selectedCategories,
    }))
      byCompany.set(m.company, (byCompany.get(m.company) ?? 0) + 1)

    for (const m of filterModels(allModels, {
      ...base,
      companies: selectedCompanies,
      levels: new Set(),
      modalities: selectedModalities,
      categories: selectedCategories,
    }))
      byLevel.set(m.level, (byLevel.get(m.level) ?? 0) + 1)

    for (const m of filterModels(allModels, {
      ...base,
      companies: selectedCompanies,
      levels: selectedLevels,
      modalities: new Set(),
      categories: selectedCategories,
    }))
      for (const input of m.inputs) byModality.set(input, (byModality.get(input) ?? 0) + 1)

    for (const m of filterModels(allModels, {
      ...base,
      companies: selectedCompanies,
      levels: selectedLevels,
      modalities: selectedModalities,
      categories: new Set(),
    }))
      byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1)

    return { byCompany, byLevel, byModality, byCategory }
  }, [deferredQuery, selectedCompanies, selectedLevels, selectedModalities, selectedCategories])

  /** 已启用的筛选维度数（公司/等级/输入类型/搜索），用于移动端角标 */
  const activeFilterCount =
    (selectedCompanies.size > 0 ? 1 : 0) +
    (selectedLevels.size > 0 ? 1 : 0) +
    (selectedModalities.size > 0 ? 1 : 0) +
    (selectedCategories.size > 0 ? 1 : 0) +
    (query.trim() ? 1 : 0)

  const filteredActive =
    selectedCompanies.size > 0 ||
    selectedLevels.size > 0 ||
    selectedModalities.size > 0 ||
    selectedCategories.size > 0 ||
    query.trim().length > 0

  /* ---------------------------------------------------------------- URL 同步 */

  // 当前视图状态（不含 model，写入 hash 时单独合并），UI 状态始终是唯一真源
  const viewState = useMemo<ViewState>(
    () => ({
      companies: [...selectedCompanies],
      levels: [...selectedLevels],
      modalities: [...selectedModalities],
      categories: [...selectedCategories],
      query: query.trim(),
    }),
    [selectedCompanies, selectedLevels, selectedModalities, selectedCategories, query],
  )

  // 自身写入 history 时跳过回写，避免与 popstate 形成环
  const selfWrite = useRef(false)

  // 状态变化 → 写入 hash（replace，不污染后退栈）
  useEffect(() => {
    const hash = serializeHash({ ...viewState, model: active?.id })
    if (hash === window.location.hash) return
    selfWrite.current = true
    window.history.replaceState(null, '', hash || window.location.pathname + window.location.search)
    queueMicrotask(() => {
      selfWrite.current = false
    })
  }, [viewState, active])

  // 前进/后退或手动改 hash → 回灌状态
  useEffect(() => {
    const onHashChange = () => {
      if (selfWrite.current) return
      const next = parseHash(window.location.hash)
      setSelectedCompanies(new Set(next.companies))
      setSelectedLevels(new Set(next.levels))
      setSelectedModalities(new Set(next.modalities))
      setSelectedCategories(new Set(next.categories))
      setQuery(next.query)
      setActive(allModels.find((m) => m.id === next.model) ?? null)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // 移动端抽屉打开时：锁背景滚动 + Esc 关闭
  useEffect(() => {
    if (!panelOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [panelOpen])

  /* ---------------------------------------------------------------- 操作 */

  const reset = useCallback(() => {
    setSelectedCompanies(new Set())
    setSelectedLevels(new Set())
    setSelectedModalities(new Set())
    setSelectedCategories(new Set())
    setQuery('')
  }, [])

  const copyLink = async () => {
    const hash = serializeHash({ ...viewState, model: active?.id })
    const url = window.location.href.split('#')[0] + hash
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 剪贴板不可用（http / 权限）时静默失败，URL 本身已同步，用户可手动复制
      window.prompt('复制链接', url)
    }
  }

  const jumpToMonth = (key: string) => {
    const el = document.getElementById(`month-${key}`)
    // 目标月份没有渲染（例如筛选后被隐藏）：回退到时间上最近的有数据月份
    if (!el) {
      const nearest = groups
        .map((g) => ({ key: g.key, diff: Math.abs(Number(g.key.replace('-', '')) - Number(key.replace('-', ''))) }))
        .sort((a, b) => a.diff - b.diff)[0]
      const fallback = nearest ? document.getElementById(`month-${nearest.key}`) : null
      fallback?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // 高亮目标月份，帮助定位
    el.animate(
      [
        { boxShadow: 'inset 0 0 0 1px var(--accent)' },
        { boxShadow: 'inset 0 0 0 1px transparent' },
      ],
      { duration: 1400, easing: 'ease-out' },
    )
  }

  const companyOf = getCompany
  const flagshipCount = allModels.filter((m) => m.level === 'flagship').length
  const firstYear = Number(
    allModels.reduce((min, m) => (m.releaseDate < min ? m.releaseDate : min), '9999').slice(0, 4),
  )

  const panel = (
    <FilterPanel
      companies={activeCompanies}
      counts={counts}
      levels={levels}
      modalities={modalities}
      categories={categories}
      selectedCompanies={selectedCompanies}
      selectedLevels={selectedLevels}
      selectedModalities={selectedModalities}
      selectedCategories={selectedCategories}
      total={filtered.length}
      totalAll={allModels.length}
      onToggleCompany={(id) => setSelectedCompanies((s) => toggle(s, id))}
      onToggleLevel={(id) => setSelectedLevels((s) => toggle(s, id))}
      onToggleModality={(id) => setSelectedModalities((s) => toggle(s, id))}
      onToggleCategory={(id) => setSelectedCategories((s) => toggle(s, id))}
      onReset={reset}
    />
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-sm bg-[var(--accent)]">
              {/* 与 favicon 同一记号的紧凑版：亮底 + 深色阶梯，padding 与 favicon 一致 */}
              <svg
                width="15"
                height="15"
                viewBox="4 4 56 56"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <path
                  d="M10 44h14v-12h14V20h12"
                  fill="none"
                  stroke="var(--accent-ink)"
                  strokeWidth="12"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-white">群星纪年</span>
          </div>

          <nav className="hidden items-center gap-1 text-[11.5px] md:flex">
            <span className="rounded-xs px-2 py-1 text-[var(--fg-3)]">
              {activeCompanies.length} 厂商
            </span>
            <span className="text-[var(--fg-4)]">/</span>
            <span className="rounded-xs px-2 py-1 text-[var(--fg-3)]">
              {allModels.length} 模型
            </span>
            {filteredActive && (
              <>
                <span className="text-[var(--fg-4)]">/</span>
                <button
                  type="button"
                  onClick={reset}
                  className="cursor-pointer rounded-xs bg-[var(--surface-2)] px-2 py-1 text-[var(--accent)] transition-colors hover:bg-[var(--surface-3)]"
                  title="清除全部筛选"
                >
                  {filtered.length} 条结果 ✕
                </button>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <svg
                className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[var(--fg-4)]"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="6.8" cy="6.8" r="4.4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.2 10.2L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setQuery('')
                }}
                placeholder="搜索模型 / 公司"
                aria-label="搜索模型或公司"
                className="w-40 rounded-xs border border-[var(--line)] bg-[var(--surface)] py-1.5 pr-6 pl-7 text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-4)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none md:w-52"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="清空搜索"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer text-[var(--fg-4)] hover:text-white"
                >
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={copyLink}
              title="复制当前视图链接"
              aria-label="复制当前视图链接"
              className="hidden cursor-pointer items-center gap-1 rounded-xs border border-[var(--line)] px-2 py-1.5 text-[11.5px] text-[var(--fg-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:flex"
            >
              {copied ? (
                <span className="text-[var(--accent)]">已复制</span>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M6 10L10 6M5.5 12.5L3.5 14.5a3 3 0 01-4.2-4.2l3-3M10.5 3.5l2-2a3 3 0 014.2 4.2l-3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      transform="translate(0.5 0.5) scale(0.92)"
                    />
                  </svg>
                  分享
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xs border px-2.5 py-1.5 text-[11.5px] transition-colors lg:hidden ${
                activeFilterCount > 0
                  ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[var(--accent)]'
                  : 'border-[var(--line-2)] text-[var(--fg-2)]'
              }`}
            >
              筛选
              {activeFilterCount > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-xs bg-[var(--accent)] px-1 font-mono text-[10px] font-semibold text-[var(--accent-ink)] tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
        {/* Hero：大标题直接压在网格背景上 */}
        <section className="relative overflow-hidden border-b border-[var(--line)] pt-10 pb-6">
          <div aria-hidden="true" className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-white sm:text-[40px]">
                群星纪年
              </h1>
              <span className="hidden font-mono text-[11px] text-[var(--fg-4)] sm:inline">
                CHRONICLE OF STARS
              </span>
            </div>
            <p className="mt-2 text-[13px] font-medium text-[var(--fg-3)]">
              大模型发布全景 · 从 GPT-3.5 到 {REFERENCE_DATE.slice(0, 4)}
            </p>
            <p className="mt-2.5 max-w-[680px] text-[13px] leading-relaxed text-[var(--fg-2)]">
              收录 {allModels.length} 次模型发布，横跨 {activeCompanies.length} 家厂商与{' '}
              <span className="whitespace-nowrap" style={{ color: LEVEL_STYLES.flagship.chipText }}>
                {flagshipCount} 次旗舰
              </span>
              。
            </p>
            <p className="mt-1 max-w-[680px] text-[12px] leading-relaxed text-[var(--fg-3)]">
              筛选与详情会同步到网址，可直接把当前视图分享给同事。
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-sm border border-[var(--line-2)]">
                {(Object.keys(LEVEL_STYLES) as LevelId[]).map((id) => {
                  const style = LEVEL_STYLES[id]
                  const on = selectedLevels.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedLevels((s) => toggle(s, id))}
                      aria-pressed={on}
                      className={`flex cursor-pointer items-center gap-1.5 border-r border-[var(--line)] px-2.5 py-1.5 text-[11.5px] transition-colors last:border-r-0 ${
                        on
                          ? 'bg-[var(--surface-3)] text-white'
                          : 'bg-[var(--surface)] text-[var(--fg-2)] hover:bg-[var(--surface-2)] hover:text-white'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-xs" style={{ background: style.signal }} />
                      {style.label}
                      <span
                        className={`font-mono text-[10px] tabular-nums ${on ? 'text-[var(--fg-3)]' : 'text-[var(--fg-4)]'}`}
                      >
                        {allModels.filter((m) => m.level === id).length}
                      </span>
                    </button>
                  )
                })}
              </div>

              <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10.5px] text-[var(--fg-4)] sm:flex">
                <span className="h-1.5 w-1.5 rounded-xs bg-[var(--accent)]" />
                数据更新至 {dataset.lastUpdated}
              </span>
            </div>
          </div>
        </section>

        <div className="border-b border-[var(--line)] py-4">
          <InsightsBar
            models={filtered}
            companyOf={companyOf}
            referenceDate={REFERENCE_DATE}
            onSelect={setActive}
          />
        </div>

        <div className="border-b border-[var(--line)] py-4">
          <ReleaseDensity
            allModels={allModels}
            filtered={filtered}
            groups={groups}
            onJump={jumpToMonth}
          />
        </div>

        {/* 手机端专用：一眼切换「全部 / 旗舰 / 重要以上」，把 43 屏压到十几屏。
            桌面端左侧面板已提供同等能力，不重复出现。 */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--line)] py-2.5 lg:hidden">
          <LevelQuickChip
            active={selectedLevels.size === 0}
            onClick={() => setSelectedLevels(new Set())}
            label="全部"
            count={allModels.length}
            color="var(--fg-3)"
          />
          <LevelQuickChip
            active={selectedLevels.size === 1 && selectedLevels.has('flagship')}
            onClick={() => setSelectedLevels(new Set<LevelId>(['flagship']))}
            label="只看旗舰"
            count={allModels.filter((m) => m.level === 'flagship').length}
            color={LEVEL_STYLES.flagship.signal}
          />
          <LevelQuickChip
            active={
              selectedLevels.size === 2 &&
              selectedLevels.has('flagship') &&
              selectedLevels.has('major')
            }
            onClick={() => setSelectedLevels(new Set<LevelId>(['flagship', 'major']))}
            label="旗舰 + 重要"
            count={allModels.filter((m) => m.level === 'flagship' || m.level === 'major').length}
            color={LEVEL_STYLES.major.signal}
          />
        </div>

        <div className="border-b border-[var(--line)] py-4">
          <GenerationRace
            models={filtered}
            companyOf={companyOf}
            rankOf={getCompanyRank}
            onSelect={setActive}
            referenceDate={REFERENCE_DATE}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            {/* 吸顶纯 CSS：top = --sticky-top（页头 57 + 年份条 39），与右侧月份标签同一基准，
                因此「297 / 297」和月份标题上下自动对齐。
                底部再留 24px，滚动条末端不会贴着视口边。 */}
            <div className="sticky top-[var(--sticky-top)] max-h-[calc(100vh-var(--sticky-top)-24px)] overflow-y-auto overscroll-contain px-1 pb-4">
              {panel}
            </div>
          </aside>

          <main className="min-w-0">
            <Timeline
              groups={groups}
              companyOf={companyOf}
              referenceDate={REFERENCE_DATE}
              onSelect={setActive}
              onReset={reset}
              totalModels={filtered.length || 1}
              // 年份条与月份标签共用一份吸顶状态，避免两层之间出现空档
              renderNav={({ retracted, activeMonth }) => (
                <YearNav
                  groups={groups}
                  allModels={allModels}
                  onJump={jumpToMonth}
                  retracted={retracted}
                  activeMonth={activeMonth}
                />
              )}
            />
          </main>
        </div>

        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--line)] py-5 font-mono text-[10.5px] text-[var(--fg-4)]">
          <span className="flex items-center gap-1.5">
            <Icon name="openai" size={11} /> icons · lobehub (MIT)
          </span>
          <span className="text-[var(--line-2)]">|</span>
          <span>data · models.dev</span>
          <span className="text-[var(--line-2)]">|</span>
          <span>
            {companies.length} vendors · {allModels.length} models · since {firstYear}
          </span>
          <span className="ml-auto">URL 记录筛选状态，可直接分享</span>
        </footer>
      </div>

      {/* 移动端筛选抽屉 */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="关闭筛选"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 cursor-default bg-black/75"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="筛选"
            className="animate-fade-in absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l border-[var(--line-2)] bg-[var(--surface)]"
          >
            {/* 头部吸顶：滚动公司长列表时「完成」始终可达 */}
            <div className="flex-none border-b border-[var(--line)] bg-[var(--surface)] px-4 pt-3 pb-2.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-white">筛选</span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="cursor-pointer rounded-xs border border-[var(--line-2)] px-2 py-0.5 text-[11px] text-[var(--fg-2)]"
                >
                  完成
                </button>
              </div>
              <div className="relative sm:hidden">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索模型 / 公司"
                  aria-label="搜索模型或公司"
                  className="w-full rounded-xs border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 pr-8 text-[12.5px] text-[var(--fg)] placeholder:text-[var(--fg-4)] focus:border-[var(--accent)] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="清空搜索"
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--fg-4)]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{panel}</div>

            {/* 底部固定：实时结果数 + 一键应用，省去「关掉抽屉再数一下」 */}
            <div className="flex-none border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="w-full cursor-pointer rounded-sm bg-[var(--accent)] py-2 text-[12.5px] font-semibold text-[var(--accent-ink)] active:opacity-80"
              >
                查看 {filtered.length} 条结果
              </button>
            </div>
          </div>
        </div>
      )}

      <ModelDetail
        model={active}
        company={active ? companyOf(active.company) : undefined}
        referenceDate={REFERENCE_DATE}
        onClose={() => setActive(null)}
      />
    </div>
  )
}
