import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * 容器：整站的「文件柜」。
 * max-sm 下页边距收窄到 10px，把宽度让给数据（卡片、图表）。
 * 一根墨色外框 + 中圆角，内部是纯白卡面；分区靠 hairline 分隔，不靠阴影。
 * 所有主要区块（概览 / 节拍图 / 竞速 / 时间轴）共用这一种容器，视觉上有唯一的骨架。
 */
export function Panel({
  children,
  className = '',
  label,
}: {
  children: ReactNode
  className?: string
  /** 无障碍用途的分区标题（屏读可见，视觉隐藏） */
  label?: string
}) {
  return (
    <section
      aria-label={label}
      className={`overflow-hidden rounded-lg border border-[var(--line-ink)] bg-[var(--card)] sm:rounded-xl ${className}`}
    >
      {children}
    </section>
  )
}

/** 分区头：左上角小节名 + 右侧说明。像档案页的页眉。 */
export function PanelHead({
  title,
  en,
  count,
  right,
  border = true,
}: {
  title: string
  en?: string
  count?: ReactNode
  right?: ReactNode
  border?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2.5 sm:px-5 ${
        border ? 'border-b border-[var(--line)]' : ''
      }`}
    >
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{title}</h2>
      {en && (
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--ink-4)] uppercase">
          {en}
        </span>
      )}
      {count !== undefined && (
        <span className="tnum font-mono text-[10.5px] text-[var(--ink-3)]">{count}</span>
      )}
      {right && (
        <span className="tnum ml-auto font-mono text-[10.5px] text-[var(--ink-4)]">{right}</span>
      )}
    </div>
  )
}

/** 通用圆角按钮：墨线描边，hover 反转为墨底白字。扁平的“按下即变色”。 */
export function Button({
  children,
  onClick,
  active = false,
  tone = 'line',
  size = 'sm',
  className = '',
  title,
  ariaPressed,
  ariaLabel,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  tone?: 'line' | 'ink' | 'ghost'
  size?: 'xs' | 'sm' | 'md'
  title?: string
  ariaPressed?: boolean
  ariaLabel?: string
}) {
  const pad =
    size === 'xs' ? 'px-2 py-[3px] text-[11px]' : size === 'md' ? 'px-4 py-2 text-[13px]' : 'px-2.5 py-[5px] text-[11.5px]'
  const base =
    tone === 'ink'
      ? 'border-[var(--ink)] bg-[var(--ink)] text-white hover:bg-[var(--ink-2)] hover:border-[var(--ink-2)]'
      : tone === 'ghost'
        ? 'border-transparent bg-transparent text-[var(--ink-3)] hover:bg-[var(--sunken)] hover:text-[var(--ink)]'
        : active
          ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
          : 'border-[var(--line-2)] bg-[var(--card)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
  return (
    <button
      {...rest}
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border font-medium transition-colors disabled:cursor-default disabled:opacity-40 ${pad} ${base} ${className}`}
    >
      {children}
    </button>
  )
}

/** 小指标胶囊（计数、单位、相对时间）。中性底色，不抢主信息。 */
export function Pill({
  children,
  tone = 'neutral',
  className = '',
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'outline' | 'ink'
  className?: string
  title?: string
}) {
  const t =
    tone === 'ink'
      ? 'bg-[var(--ink)] text-white'
      : tone === 'outline'
        ? 'border border-[var(--line-2)] text-[var(--ink-3)]'
        : 'bg-[var(--sunken)] text-[var(--ink-2)]'
  return (
    <span
      title={title}
      className={`tnum inline-flex items-center gap-1 rounded-xs px-1.5 py-[2px] font-mono text-[10px] leading-tight font-medium whitespace-nowrap ${t} ${className}`}
    >
      {children}
    </span>
  )
}

/** 小号箭头（右上、卡片角落、返回等） */
export function Arrow({ size = 10, dir = 'ne' }: { size?: number; dir?: 'ne' | 'right' | 'down' }) {
  const rot = dir === 'right' ? 'rotate-0' : dir === 'down' ? 'rotate-90' : '-rotate-45'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={rot}
    >
      <path d="M2 10L10 2M4 2h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Close({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** 搜索图标 */
export function SearchIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
