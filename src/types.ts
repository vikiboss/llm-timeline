export type ModalityId = 'text' | 'image' | 'audio' | 'video' | 'pdf'

export type LevelId = 'flagship' | 'major' | 'minor' | 'spinoff'

export type CategoryId =
  | 'chat'
  | 'code'
  | 'image'
  | 'video'
  | 'audio'
  | 'world'
  | 'speech'
  | 'embedding'

/** 时间轴上的单个模型发布事件 */
export interface Model {
  /** 稳定 id，用于 key / 深链 */
  id: string
  name: string
  /** 对应 companies.json 中的 id */
  company: string
  /** YYYY-MM-DD */
  releaseDate: string
  /** 支持的输入模态 */
  inputs: ModalityId[]
  category: CategoryId
  /** 重要程度分级 */
  level: LevelId
  /** 模型图标 key，缺省时回退到公司图标 */
  icon?: string
  /** 一句话说明（可选） */
  note?: string
  /** 官方定价，单位 USD / 百万 token；缺失表示未公开或非 token 计价 */
  cost?: {
    input: number
    output: number
    cacheRead?: number
  }
  /** 数据来源；缺省视为原厂（第一方）。第三方转售/社区微调需显式标注 */
  source?: 'first-party' | 'third-party'
}

export interface Company {
  id: string
  name: string
  nameZh: string
  country: string
  website: string
  icon: string
  /** 品牌色，用于图标着色与强调 */
  color: string
  /** 1 = 一线头部，2 = 重要厂商，3 = 其他 */
  tier: 1 | 2 | 3
  /** 公认实力排名（1 最强），用于默认排序 */
  rank: number
  /** 排名理由，展示在 tooltip */
  rankNote?: string
}

/** 模型分类（对话 / 图像 / 世界模型 …），用于筛选与着色 */
export interface CategoryMeta {
  id: CategoryId
  name: string
  nameEn: string
}

export interface Modality {
  id: ModalityId
  name: string
  icon: string
}

export interface Level {
  id: LevelId
  name: string
  nameEn: string
  /** 数值越大越重要，用于排序 */
  weight: number
}

export interface Category {
  id: CategoryId
  name: string
  nameEn: string
}

export interface DatasetSource {
  lastUpdated: string
  sources: string[]
  models: Model[]
}

export interface Dataset {
  lastUpdated: string
  sources: string[]
  models: Model[]
}

/** 时间轴分组：按月 */
export interface MonthGroup {
  key: string
  year: number
  month: number
  label: string
  events: Model[]
}
