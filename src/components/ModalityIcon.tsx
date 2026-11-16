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
  tone = 'soft',
}: {
  id: ModalityId
  size?: 'sm' | 'md'
  tone?: 'soft' | 'plain'
}) {
  const meta = MODALITY_ICONS[id]
  const pad = size === 'sm' ? 'px-1.5 py-[3px] text-[10.5px]' : 'px-2 py-[3px] text-[11.5px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${pad}`}
      style={{
        borderColor: tone === 'plain' ? 'transparent' : `color-mix(in oklab, ${meta.color} 28%, transparent)`,
        background: tone === 'plain' ? 'transparent' : meta.soft,
        color: meta.color,
      }}
      title={meta.title}
    >
      <ModalityIcon id={id} size={size === 'sm' ? 11 : 13} />
      {meta.label}
    </span>
  )
}
