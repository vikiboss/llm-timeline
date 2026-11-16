import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FilterPanel } from './components/FilterPanel'
import { InsightsBar } from './components/InsightsBar'
import { ModelDetail } from './components/ModelDetail'
import { Timeline } from './components/Timeline'
import { ReleaseHeatmap } from './components/ReleaseHeatmap'
import { GenerationRace } from './components/GenerationRace'
import { YearNav } from './components/YearNav'
import { Icon } from './components/Icon'
import { LEVEL_STYLES } from './components/tokens'
import { Button, Close, SearchIcon } from './components/ui'
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

/** 品牌记号：一条持续抬升的阶梯（时间向右，能力向上），每一级台阶 = 一次发布 */
function Logomark({ size = 26 }: { size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-sm bg-[var(--ink)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="4 4 56 56" shapeRendering="crispEdges">
        <path
          d="M10 44h14v-12h14V20h12"
          fill="none"
          stroke="#fff"
          strokeWidth="12"
          strokeLinejoin="miter"
        />
      </svg>
    </span>
  )
}

/** 手机端快捷分段：全部 / 只看旗舰 / 旗舰 + 重要 */
function QuickSegment({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
        active ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
      <span className={`tnum font-mono text-[10px] ${active ? 'text-white/60' : 'text-[var(--ink-4)]'}`}>
        {count}
      </span>
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
      fallback?.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
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
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* ---------------------------------------------------------------- 页头 */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/88 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[1360px] items-center gap-3 px-4 lg:px-6">
          <a href="#" className="flex items-center gap-2" aria-label="群星纪年 · 回到顶部">
            <Logomark />
            <span className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
                群星纪年
              </span>
              <span className="mt-1 hidden font-mono text-[8.5px] tracking-[0.18em] text-[var(--ink-4)] uppercase sm:block">
                Chronicle of Stars
              </span>
            </span>
          </a>

          <span className="mx-1 hidden h-5 w-px bg-[var(--line-2)] sm:block" />

          <nav className="hidden items-center gap-2 text-[11px] text-[var(--ink-3)] md:flex">
            <span className="tnum">
              <b className="font-mono font-semibold text-[var(--ink-2)]">{activeCompanies.length}</b> 厂商
            </span>
            <span className="text-[var(--line-2)]">/</span>
            <span className="tnum">
              <b className="font-mono font-semibold text-[var(--ink-2)]">{allModels.length}</b> 模型
            </span>
            {filteredActive && (
              <>
                <span className="text-[var(--line-2)]">/</span>
                <button
                  type="button"
                  onClick={reset}
                  className="tnum flex cursor-pointer items-center gap-1 rounded-xs bg-[var(--ink)] px-1.5 py-0.5 font-mono text-[10.5px] text-white transition-colors hover:bg-[var(--ink-2)]"
                  title="清除全部筛选"
                >
                  {filtered.length} 条
                  <Close size={7} />
                </button>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ink-4)]">
                <SearchIcon size={13} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setQuery('')
                }}
                placeholder="搜索模型 / 厂商"
                aria-label="搜索模型或厂商"
                className="w-44 rounded-sm border border-[var(--line-2)] bg-[var(--card)] py-1.5 pr-7 pl-8 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:border-[var(--ink)] focus:outline-none md:w-56"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="清空搜索"
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--ink-4)] hover:text-[var(--ink)]"
                >
                  <Close size={9} />
                </button>
              )}
            </div>
            <Button onClick={copyLink} title="复制当前视图链接" ariaLabel="复制当前视图链接" className="hidden sm:inline-flex">
              <ShareIcon />
              {copied ? '已复制' : '分享'}
            </Button>
            <Button
              onClick={() => setPanelOpen(true)}
              active={activeFilterCount > 0}
              className="lg:hidden"
            >
              筛选
              {activeFilterCount > 0 && (
                <span className="tnum grid h-4 min-w-4 place-items-center rounded-xs bg-white/20 px-1 font-mono text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1360px] px-4 lg:px-6">
        {/* ---------------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden pt-9 pb-6 sm:pt-12">
          <div aria-hidden="true" className="dot-paper pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[var(--ink-3)]">
                <span className="tnum font-mono tracking-[0.04em] text-[var(--ink-4)]">
                  {firstYear}
                </span>
                <span className="h-px w-6 bg-[var(--line-2)]" />
                <span className="tnum font-mono tracking-[0.04em] text-[var(--ink-4)]">
                  {REFERENCE_DATE.slice(0, 4)}
                </span>
                <span className="ml-1">大模型发布编年史</span>
              </div>
              <h1 className="mt-3 text-[40px] leading-[0.92] font-semibold tracking-[-0.045em] text-[var(--ink)] sm:text-[64px]">
                群星纪年
              </h1>
              <p className="mt-4 max-w-[560px] text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                <span className="tnum font-semibold text-[var(--ink)]">{allModels.length}</span> 次模型发布，
                横跨 <span className="tnum font-semibold text-[var(--ink)]">{activeCompanies.length}</span> 家厂商、
                <span className="tnum font-semibold text-[var(--ink)]">{flagshipCount}</span> 次旗舰。
              </p>
            </div>

            {/* 三枚大数字：给整页一个“报头” */}
            <dl className="flex shrink-0 gap-px overflow-hidden rounded-lg border border-[var(--line-ink)] bg-[var(--line-ink)]">
              {[
                { k: '收录厂商', v: activeCompanies.length, u: '家' },
                { k: '旗舰发布', v: flagshipCount, u: '次' },
                { k: '数据更新', v: dataset.lastUpdated.slice(5).replace('-', '/'), u: '' },
              ].map((x) => (
                <div key={x.k} className="flex-1 bg-[var(--card)] px-4 py-3 lg:min-w-[104px]">
                  <dt className="text-[9.5px] font-medium tracking-[0.08em] text-[var(--ink-4)] uppercase">
                    {x.k}
                  </dt>
                  <dd className="tnum mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-[24px] leading-none font-semibold tracking-[-0.04em] text-[var(--ink)]">
                      {x.v}
                    </span>
                    {x.u && <span className="text-[10.5px] text-[var(--ink-4)]">{x.u}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 分级快捷条：分段控件形态 */}
          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-md bg-[var(--sunken)] p-0.5">
              {(Object.keys(LEVEL_STYLES) as LevelId[]).map((id) => {
                const style = LEVEL_STYLES[id]
                const on = selectedLevels.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedLevels((s) => toggle(s, id))}
                    aria-pressed={on}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                      on ? 'bg-[var(--card)] text-[var(--ink)] shadow-[0_0_0_1px_var(--line)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.signal }} />
                    {style.label}
                    <span className="tnum font-mono text-[10px] text-[var(--ink-4)]">
                      {allModels.filter((m) => m.level === id).length}
                    </span>
                  </button>
                )
              })}
            </div>
            <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-[var(--ink-4)] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              筛选与详情同步到网址，可直接分享
            </span>
          </div>
        </section>

        {/* ---------------------------------------------------------------- 结论区 */}
        <div className="flex flex-col gap-3 pb-3">
          <InsightsBar
            models={filtered}
            companyOf={companyOf}
            referenceDate={REFERENCE_DATE}
            onSelect={setActive}
          />
          <ReleaseHeatmap
            allModels={allModels}
            filtered={filtered}
            referenceDate={REFERENCE_DATE}
            onJump={jumpToMonth}
          />
        </div>

        {/* 手机快捷分段 */}
        <div className="mb-3 flex items-center gap-0.5 rounded-md border border-[var(--line)] bg-[var(--sunken)] p-0.5 lg:hidden">
          <QuickSegment
            active={selectedLevels.size === 0}
            onClick={() => setSelectedLevels(new Set())}
            label="全部"
            count={allModels.length}
          />
          <QuickSegment
            active={selectedLevels.size === 1 && selectedLevels.has('flagship')}
            onClick={() => setSelectedLevels(new Set<LevelId>(['flagship']))}
            label="只看旗舰"
            count={allModels.filter((m) => m.level === 'flagship').length}
          />
          <QuickSegment
            active={
              selectedLevels.size === 2 && selectedLevels.has('flagship') && selectedLevels.has('major')
            }
            onClick={() => setSelectedLevels(new Set<LevelId>(['flagship', 'major']))}
            label="旗舰 + 重要"
            count={allModels.filter((m) => m.level === 'flagship' || m.level === 'major').length}
          />
        </div>

        <div className="pb-3">
          <GenerationRace
            models={filtered}
            companyOf={companyOf}
            rankOf={getCompanyRank}
            onSelect={setActive}
            referenceDate={REFERENCE_DATE}
          />
        </div>

        {/* ---------------------------------------------------------------- 主体网格 */}
        <div className="grid grid-cols-1 gap-5 pt-2 pb-16 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-[var(--sticky-top)] max-h-[calc(100vh-var(--sticky-top)-24px)] overflow-y-auto overscroll-contain px-1 pb-4">
              {panel}
            </div>
          </aside>

          <main className="min-w-0">
            <Timeline
              groups={groups}
              companyOf={companyOf}
              onSelect={setActive}
              onReset={reset}
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

        {/* ---------------------------------------------------------------- 页脚 */}
        <footer className="relative -mx-4 border-t border-[var(--line)] px-4 pt-6 pb-10 lg:-mx-6 lg:px-6">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Logomark size={22} />
                <span className="text-[13px] font-semibold tracking-[-0.01em]">群星纪年</span>
              </div>
              <p className="mt-2 max-w-[300px] text-[11px] leading-relaxed text-[var(--ink-3)]">
                所有时间、价格与分级均来自公开公告与 models.dev。
                数据更新即基准日，页面上的「相对时间」以此为准。
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10.5px] text-[var(--ink-4)]">
              <span className="flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.12em] text-[var(--ink-4)] uppercase">Data</span>
                <span className="text-[var(--ink-2)]">{dataset.lastUpdated}</span>
                <span>models.dev</span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.12em] uppercase">Icons</span>
                <span className="flex items-center gap-1 text-[var(--ink-2)]">
                  <Icon name="openai" size={11} /> lobehub · MIT
                </span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.12em] uppercase">Scale</span>
                <span className="text-[var(--ink-2)]">
                  {companies.length} vendors
                </span>
                <span>{allModels.length} models · since {firstYear}</span>
              </span>
            </div>
            <span className="ml-auto self-end text-[10.5px] text-[var(--ink-4)]">
              URL 记录筛选状态 · 可直接分享
            </span>
          </div>
        </footer>
      </div>

      {/* ---------------------------------------------------------------- 移动端筛选抽屉 */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="关闭筛选"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 cursor-default bg-[var(--ink)]/25 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="筛选"
            className="animate-ink-in absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col border-l border-[var(--line-ink)] bg-[var(--card)]"
          >
            <div className="flex-none border-b border-[var(--line)] px-4 pt-3 pb-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold">筛选</span>
                <Button onClick={() => setPanelOpen(false)} size="xs">
                  完成
                </Button>
              </div>
              <div className="relative sm:hidden">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ink-4)]">
                  <SearchIcon size={13} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索模型 / 厂商"
                  aria-label="搜索模型或厂商"
                  className="w-full rounded-sm border border-[var(--line-2)] bg-[var(--card)] py-1.5 pr-8 pl-8 text-[12.5px] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:border-[var(--ink)] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="清空搜索"
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--ink-4)]"
                  >
                    <Close size={9} />
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">{panel}</div>

            <div className="flex-none border-t border-[var(--line)] bg-[var(--sunken)] px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <Button onClick={() => setPanelOpen(false)} tone="ink" size="md" className="w-full">
                查看 {filtered.length} 条结果
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModelDetail
        model={active}
        company={active ? companyOf(active.company) : undefined}
        referenceDate={REFERENCE_DATE}
        onClose={() => setActive(null)}
        onSelect={setActive}
      />
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5l3-3M7 12.2l-1.6 1.6a2.8 2.8 0 01-4-4l2.4-2.4M9 3.8l1.6-1.6a2.8 2.8 0 014 4l-2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
