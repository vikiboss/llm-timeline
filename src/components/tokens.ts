import type { LevelId } from '../types'

/**
 * 卡片档位：所有卡片左缘严格对齐（同一把尺子），只用「外框墨度 + 中性底色 + 描边方向」
 * 表达重要程度，绝不靠缩进或单侧色条——单侧的东西一定带来左右失衡。
 *   旗舰 = 墨框 + 白纸 + 投影（最“凸”）
 *   重要 = 灰框（虚线）+ 白纸
 *   常规 = 无边框，白纸，hover 才浮出 hairline（最“静”）
 *   衍生 = 无边框 + 内凹底色（最“平”）
 * hover 统一规则：只加深描边颜色，不改线型、不移动 1px 边框占位，也不新增位移。
 */
export const LEVEL_CARD_SHAPE: Record<LevelId, string> = {
  // 旗舰：墨框 + 投影，hover 仅加深投影
  flagship:
    'rounded-sm border border-[var(--line-ink)] bg-[var(--card)] shadow-[0_1px_2px_rgba(21,23,26,0.08)] hover:shadow-[0_2px_6px_rgba(21,23,26,0.14)]',
  // 重要：虚线灰框，hover 只加深颜色，保持虚线
  major:
    'rounded-sm border border-dashed border-[var(--line-2)] bg-[var(--card)] hover:border-[var(--ink-4)]',
  // 常规：无框，hover 才浮出实线 hairline
  minor:
    'rounded-sm border border-transparent bg-[var(--card)] hover:border-[var(--line)]',
  // 衍生：无框 + 内凹，hover 浮出虚线，线型与「衍生」身份一致
  spinoff:
    'rounded-sm border border-transparent bg-[var(--sunken)] hover:border-dashed hover:border-[var(--line-2)]',
}

/**
 * 重要程度视觉：不再用彩虹分类色，而是用「油墨浓度」表达稀缺度。
 * 旗舰 = 实心墨块（最重），衍生 = 纸色虚线（最轻）。
 * 这样在任何平面上，读者只需理解“越黑越重要”一条规则。
 */
export const LEVEL_STYLES: Record<
  LevelId,
  {
    label: string
    /** 纯色信号（圆点、色条） */
    signal: string
    /** 标签底色 */
    chipBg: string
    chipText: string
    chipBorder: string
  }
> = {
  flagship: {
    label: '旗舰',
    signal: 'var(--lv-flagship)',
    chipBg: 'var(--ink)',
    chipText: '#ffffff',
    chipBorder: 'var(--ink)',
  },
  major: {
    label: '重要',
    signal: 'var(--lv-major)',
    chipBg: 'var(--sunken)',
    chipText: 'var(--ink-2)',
    chipBorder: 'var(--line-2)',
  },
  minor: {
    label: '常规',
    signal: 'var(--lv-minor)',
    chipBg: 'transparent',
    chipText: 'var(--ink-3)',
    chipBorder: 'var(--line)',
  },
  spinoff: {
    label: '衍生',
    signal: 'var(--lv-spinoff)',
    chipBg: 'transparent',
    chipText: 'var(--ink-4)',
    chipBorder: 'var(--line)',
  },
}

/**
 * 模型分类：8 个语义色相，统一压到中低饱和，落在暖白纸面上不刺眼。
 * `ink` 是文字色（≥4.5:1），`dot` 是信号点，`soft` 是选中底色。
 */
export const CATEGORY_META: Record<
  string,
  { label: string; ink: string; dot: string; soft: string }
> = {
  chat: { label: '对话', ink: '#3f444c', dot: '#6b7078', soft: '#f1f0eb' },
  code: { label: '代码', ink: '#1f7a83', dot: '#2a8f99', soft: '#e6f2f2' },
  image: { label: '图像', ink: '#2f7a3e', dot: '#3b9150', soft: '#e8f1e6' },
  video: { label: '视频', ink: '#9a5a12', dot: '#b8801f', soft: '#f8efe0' },
  audio: { label: '音频', ink: '#7d3a7a', dot: '#9a4b96', soft: '#f6ebf4' },
  world: { label: '世界模型', ink: '#4a4a9c', dot: '#5f5fb5', soft: '#eeedf8' },
  speech: { label: '语音', ink: '#a0453f', dot: '#bd5a52', soft: '#faebea' },
  embedding: { label: '向量', ink: '#3d6b93', dot: '#4f84b0', soft: '#eaf1f7' },
  decision: { label: '决策', ink: '#6a5a2a', dot: '#8a7a35', soft: '#f3efe0' },
}

export function categoryOf(id: string) {
  return CATEGORY_META[id] ?? CATEGORY_META.chat
}
