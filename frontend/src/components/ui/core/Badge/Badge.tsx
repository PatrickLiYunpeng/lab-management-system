import { type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * Badge 状态类型
 */
export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning'

/**
 * Badge 组件属性接口
 */
export interface BadgeProps {
  /** 展示的数字 */
  count?: number
  /** 是否显示为小圆点 */
  dot?: boolean
  /** 状态点 */
  status?: BadgeStatus
  /** 状态文本 */
  text?: ReactNode
  /** 封顶数字 */
  overflowCount?: number
  /** 当数值为 0 时是否展示 Badge */
  showZero?: boolean
  /** 自定义小圆点的颜色 */
  color?: string
  /** 包裹的子元素 */
  children?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 设置 Badge 的偏移 */
  offset?: [number, number]
}

/**
 * 状态颜色映射
 */
const statusColors: Record<BadgeStatus, string> = {
  success: 'bg-success-500',
  processing: 'bg-primary-500 animate-pulse',
  default: 'bg-neutral-400',
  error: 'bg-error-500',
  warning: 'bg-warning-500',
}

/**
 * Badge 徽标组件
 * 
 * 用于显示数量或状态标记的徽标组件。
 * 
 * @example
 * // 显示数量
 * <Badge count={5}>
 *   <Button>消息</Button>
 * </Badge>
 * 
 * // 显示小圆点
 * <Badge dot>
 *   <BellIcon />
 * </Badge>
 * 
 * // 独立状态点
 * <Badge status="success" text="成功" />
 */
export function Badge({
  count,
  dot = false,
  status,
  text,
  overflowCount = 99,
  showZero = false,
  color,
  children,
  className,
  offset,
}: BadgeProps) {
  // 是否显示徽标
  const showBadge = dot || (count !== undefined && (count > 0 || showZero))

  // 显示的数字文本
  const displayCount =
    count !== undefined && count > overflowCount ? `${overflowCount}+` : count

  // 如果是独立的状态点（没有 children）
  if (status && !children) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <span
          className={cn('w-2 h-2 rounded-full', statusColors[status])}
          style={color ? { backgroundColor: color } : undefined}
        />
        {text && <span className="text-sm text-neutral-700">{text}</span>}
      </span>
    )
  }

  // 计算偏移样式
  const offsetStyle = offset
    ? {
        right: -offset[0],
        top: offset[1],
      }
    : undefined

  return (
    <span className={cn('relative inline-flex', className)}>
      {/* 子元素 */}
      {children}

      {/* 徽标 */}
      {showBadge && (
        <span
          className={cn(
            'absolute flex items-center justify-center',
            'transform translate-x-1/2 -translate-y-1/2',
            // 圆点样式
            dot && 'w-2 h-2 rounded-full',
            dot && (status ? statusColors[status] : 'bg-error-500'),
            // 数字样式
            !dot && 'min-w-[18px] h-[18px] px-1.5',
            !dot && 'text-xs text-white font-medium',
            !dot && 'rounded-full bg-error-500',
            // 位置
            offset ? '' : 'right-0 top-0'
          )}
          style={{
            ...(color && !status ? { backgroundColor: color } : {}),
            ...offsetStyle,
          }}
        >
          {!dot && displayCount}
        </span>
      )}
    </span>
  )
}

Badge.displayName = 'Badge'

export default Badge
