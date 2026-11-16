import type { CategoryId, LevelId, ModalityId } from '../types'

/**
 * 可分享的视图状态，全部同步到 location.hash：
 *   #year=2026&companies=openai,google&levels=flagship&cats=chat&q=claude&model=gemini-4-hydrogen
 *
 * 目的：链接可以分享、刷新后可恢复、浏览器的前进/后退键可用。
 * 只在 hash 中保留「非默认」字段，默认视图的 URL 保持干净。
 */
export interface ViewState {
  companies: string[]
  levels: LevelId[]
  modalities: ModalityId[]
  /** 模型分类：对话 / 图像 / 世界模型 … */
  categories: CategoryId[]
  query: string
  /** 时间轴目前滚动到的年份，用于分享「从哪年看起」 */
  year?: number
  /** 打开详情的模型 id */
  model?: string
}

export const EMPTY_STATE: ViewState = {
  companies: [],
  levels: [],
  modalities: [],
  categories: [],
  query: '',
}

function param(search: URLSearchParams, key: string): string[] {
  const raw = search.get(key)
  if (!raw) return []
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]
}

export function parseHash(hash: string): ViewState {
  const search = new URLSearchParams(hash.replace(/^#/, ''))
  const year = Number(search.get('year'))
  return {
    companies: param(search, 'companies'),
    levels: param(search, 'levels') as LevelId[],
    modalities: param(search, 'inputs') as ModalityId[],
    categories: param(search, 'cats') as CategoryId[],
    query: search.get('q') ?? '',
    year: Number.isFinite(year) && year > 1900 ? year : undefined,
    model: search.get('model') ?? undefined,
  }
}

export function serializeHash(state: ViewState): string {
  const search = new URLSearchParams()
  if (state.companies.length) search.set('companies', state.companies.join(','))
  if (state.levels.length) search.set('levels', state.levels.join(','))
  if (state.modalities.length) search.set('inputs', state.modalities.join(','))
  if (state.categories.length) search.set('cats', state.categories.join(','))
  const q = state.query.trim()
  if (q) search.set('q', q)
  if (state.year) search.set('year', String(state.year))
  if (state.model) search.set('model', state.model)
  const s = search.toString()
  return s ? `#${s}` : ''
}
