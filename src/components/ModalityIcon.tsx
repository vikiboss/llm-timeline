import type { ModalityId } from '../types'
import { MODALITY_ICONS } from './modalityIcons'

export function ModalityIcon({
  id,
  size = 14,
  className,
}: {
  id: ModalityId
  size?: number
  className?: string
}) {
  const meta = MODALITY_ICONS[id]
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: meta.color }}
      role="img"
      aria-label={meta.title}
    >
      <title>{meta.title}</title>
      <g dangerouslySetInnerHTML={{ __html: meta.paths }} />
    </svg>
  )
}

/** 输入类型标签：图标 + 文字，主题色描边与底色 */
export function ModalityChip({
  id,
  size = 'sm',
  iconOnly = false,
  tone = 'soft',
}: {
  id: ModalityId
  size?: 'sm' | 'md'
  /** 只显示图标（列表卡内使用，省宽度；title 提供读屏文字） */
  iconOnly?: boolean
  tone?: 'soft' | 'plain'
}) {
  const meta = MODALITY_ICONS[id]
  const pad = iconOnly
    ? size === 'sm'
      ? 'p-[3px]'
      : 'p-[4px]'
    : size === 'sm'
      ? 'px-1.5 py-[2px] text-[10.5px]'
      : 'px-2 py-[3px] text-[11.5px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xs font-medium ${pad}`}
      style={{
        background: tone === 'plain' ? 'transparent' : meta.soft,
        color: meta.color,
      }}
      title={meta.title}
    >
      <ModalityIcon id={id} size={iconOnly ? 12 : size === 'sm' ? 11 : 13} />
      {!iconOnly && meta.label}
    </span>
  )
}
