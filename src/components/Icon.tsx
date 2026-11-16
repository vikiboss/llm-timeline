import { useMemo } from 'react'
import { ICONS } from '../data/icons'
import { readableColor } from '../lib/color'

interface IconProps {
  /** icons.ts 中的 key，例如 openai / claude-color / kimi */
  name: string
  /** 像素尺寸 */
  size?: number
  className?: string
  /** 单色图标着色；-color / -brand 变体自带品牌色时忽略 */
  color?: string
  /** 优先使用 -color 变体（若有） */
  preferColor?: boolean
  title?: string
}

const DEFAULT_TINT = 'rgb(245 245 245)'

function resolve(name: string, preferColor: boolean): string | undefined {
  if (ICONS[name]) {
    if (preferColor && ICONS[`${name}-color`]) return `${name}-color`
    return name
  }
  if (ICONS[`${name}-color`]) return `${name}-color`
  return undefined
}

export function Icon({
  name,
  size = 20,
  className,
  color,
  preferColor = false,
  title,
}: IconProps) {
  const key = resolve(name, preferColor)
  const markup = useMemo(() => {
    if (!key) return null
    const asset = ICONS[key]
    // 去掉固定尺寸、内联样式与 <title>；尺寸交给容器，颜色交给 currentColor
    const html = asset.raw
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/\swidth="1em"/g, '')
      .replace(/\sheight="1em"/g, '')
      .replace(/\sstyle="flex:none;line-height:1"/g, '')
      .replace('<svg', '<svg aria-hidden="true" focusable="false"')
    return { html, mono: !(key.endsWith('-color') || key.endsWith('-brand')) }
  }, [key])

  if (!markup) {
    return (
      <span
        className={`icon ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="block h-full w-full rounded-[2px] bg-white/15" />
      </span>
    )
  }

  return (
    <span
      className={`icon ${className ?? ''}`}
      title={title}
      style={{
        width: size,
        height: size,
        color: markup.mono ? readableColor(color ?? DEFAULT_TINT, 0.62) : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: markup.html }}
    />
  )
}

/** 圆角品牌图标底座 */
export function IconBadge({
  name,
  size = 40,
  color,
  preferColor = false,
  className = '',
}: {
  name: string
  size?: number
  color?: string
  preferColor?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon
        name={name}
        size={Math.round(size * 0.56)}
        color={color}
        preferColor={preferColor}
      />
    </span>
  )
}
