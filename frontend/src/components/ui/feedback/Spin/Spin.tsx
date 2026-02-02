import { type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * Spin 尺寸类型
 */
export type SpinSize = 'small' | 'default' | 'large'

/**
 * Spin 组件属性接口
 */
export interface SpinProps {
  /** 是否为加载中状态 */
  spinning?: boolean
  /** 尺寸 */
  size?: SpinSize
  /** 自定义描述文案 */
  tip?: ReactNode
  /** 包裹内容 */
  children?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 延迟显示时间（毫秒） */
  delay?: number
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<SpinSize, { spinner: string; tip: string }> = {
  small: { spinner: 'w-4 h-4', tip: 'text-xs' },
  default: { spinner: 'w-6 h-6', tip: 'text-sm' },
  large: { spinner: 'w-8 h-8', tip: 'text-base' },
}

/**
 * 加载动画 SVG 组件
 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-primary-500', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Spin 加载中组件
 * 
 * 用于表示加载状态的旋转图标组件，可以包裹内容。
 * 
 * @example
 * // 单独使用
 * <Spin />
 * 
 * // 包裹内容
 * <Spin spinning={loading}>
 *   <div>内容区域</div>
 * </Spin>
 * 
 * // 带提示文案
 * <Spin tip="加载中..." />
 */
export function Spin({
  spinning = true,
  size = 'default',
  tip,
  children,
  className,
}: SpinProps) {
  const { spinner: spinnerSize, tip: tipSize } = sizeStyles[size]

  // 如果没有 children，只显示 spinner
  if (!children) {
    if (!spinning) return null

    return (
      <div className={cn('inline-flex flex-col items-center gap-2', className)}>
        <Spinner className={spinnerSize} />
        {tip && <span className={cn('text-neutral-600', tipSize)}>{tip}</span>}
      </div>
    )
  }

  // 有 children 时，作为容器使用
  return (
    <div className={cn('relative', className)}>
      {/* 子内容 */}
      <div
        className={cn(
          'transition-opacity duration-200',
          spinning && 'opacity-50 pointer-events-none'
        )}
      >
        {children}
      </div>

      {/* 加载遮罩层 */}
      {spinning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50">
          <Spinner className={spinnerSize} />
          {tip && (
            <span className={cn('mt-2 text-neutral-600', tipSize)}>{tip}</span>
          )}
        </div>
      )}
    </div>
  )
}

Spin.displayName = 'Spin'

export default Spin
