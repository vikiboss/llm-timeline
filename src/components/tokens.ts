import type { LevelId } from '../types'

/** 重要程度分级视觉：扁平色块，无渐变无阴影 */
export const LEVEL_STYLES: Record<
  LevelId,
  {
    label: string
    /** 纯色信号（圆点、色条） */
    signal: string
    /** 标签底色（低透明度） */
    chipBg: string
    chipText: string
    chipBorder: string
  }
> = {
  flagship: {
    label: '旗舰',
    signal: 'var(--lv-flagship)',
    chipBg: 'color-mix(in oklab, var(--lv-flagship) 14%, transparent)',
    chipText: 'var(--lv-flagship)',
    chipBorder: 'color-mix(in oklab, var(--lv-flagship) 32%, transparent)',
  },
  major: {
    label: '重要',
    signal: 'var(--lv-major)',
    chipBg: 'color-mix(in oklab, var(--lv-major) 12%, transparent)',
    chipText: 'var(--lv-major)',
    chipBorder: 'color-mix(in oklab, var(--lv-major) 30%, transparent)',
  },
  minor: {
    label: '常规',
    signal: 'var(--lv-minor)',
    chipBg: 'var(--surface-3)',
    chipText: 'var(--fg-2)',
    chipBorder: 'var(--line-2)',
  },
  spinoff: {
    label: '衍生',
    signal: 'var(--lv-spinoff)',
    chipBg: 'transparent',
    chipText: 'var(--fg-3)',
    chipBorder: 'var(--line)',
  },
}

/** 模型分类视觉：dot 用于筛选列表的信号点，className 用于文字着色 */
export const CATEGORY_META: Record<string, { label: string; className: string; dot: string }> = {
  chat: { label: '对话', className: 'text-[var(--fg-3)]', dot: '#9aa3b2' },
  code: { label: '代码', className: 'text-teal-300', dot: '#5eead4' },
  image: { label: '图像', className: 'text-emerald-300', dot: '#6ee7b7' },
  video: { label: '视频', className: 'text-orange-300', dot: '#fdba74' },
  audio: { label: '音频', className: 'text-fuchsia-300', dot: '#f0abfc' },
  world: { label: '世界模型', className: 'text-violet-300', dot: '#c4b5fd' },
  speech: { label: '语音', className: 'text-rose-300', dot: '#fda4af' },
  embedding: { label: '向量', className: 'text-sky-300', dot: '#7dd3fc' },
}
