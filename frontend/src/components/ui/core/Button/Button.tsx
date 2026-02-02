import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * 按钮变体类型
 * primary: 主要按钮，用于主要操作
 * default: 默认按钮，用于次要操作
 * dashed: 虚线按钮
 * text: 文本按钮，无背景
 * link: 链接按钮
 */
export type ButtonVariant = 'primary' | 'default' | 'dashed' | 'text' | 'link'

/**
 * 按钮尺寸类型
 */
export type ButtonSize = 'small' | 'middle' | 'large'

/**
 * 按钮组件属性接口
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体样式 */
  variant?: ButtonVariant
  /** 按钮尺寸 */
  size?: ButtonSize
  /** 加载状态 */
  loading?: boolean
  /** 图标元素 */
  icon?: ReactNode
  /** 危险按钮样式（红色） */
  danger?: boolean
  /** 块级按钮（宽度100%） */
  block?: boolean
  /** 子元素 */
  children?: ReactNode
}

/**
 * 按钮变体样式映射
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary-500 text-white border-primary-500
    hover:bg-primary-400 hover:border-primary-400
    active:bg-primary-600 active:border-primary-600
    focus:ring-primary-500/30
  `,
  default: `
    bg-white text-neutral-700 border-neutral-300
    hover:text-primary-500 hover:border-primary-500
    active:text-primary-600 active:border-primary-600
    focus:ring-primary-500/20
  `,
  dashed: `
    bg-white text-neutral-700 border-neutral-300 border-dashed
    hover:text-primary-500 hover:border-primary-500
    active:text-primary-600 active:border-primary-600
    focus:ring-primary-500/20
  `,
  text: `
    bg-transparent text-neutral-700 border-transparent
    hover:bg-neutral-100
    active:bg-neutral-200
    focus:ring-neutral-500/20
  `,
  link: `
    bg-transparent text-primary-500 border-transparent
    hover:text-primary-400
    active:text-primary-600
    focus:ring-primary-500/20
  `,
}

/**
 * 危险按钮变体样式映射（覆盖默认样式）
 */
const dangerVariantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-error-500 text-white border-error-500
    hover:bg-error-400 hover:border-error-400
    active:bg-error-600 active:border-error-600
    focus:ring-error-500/30
  `,
  default: `
    bg-white text-error-500 border-error-500
    hover:text-error-400 hover:border-error-400
    active:text-error-600 active:border-error-600
    focus:ring-error-500/20
  `,
  dashed: `
    bg-white text-error-500 border-error-500 border-dashed
    hover:text-error-400 hover:border-error-400
    active:text-error-600 active:border-error-600
    focus:ring-error-500/20
  `,
  text: `
    bg-transparent text-error-500 border-transparent
    hover:bg-error-50
    active:bg-error-100
    focus:ring-error-500/20
  `,
  link: `
    bg-transparent text-error-500 border-transparent
    hover:text-error-400
    active:text-error-600
    focus:ring-error-500/20
  `,
}

/**
 * 按钮尺寸样式映射
 */
const sizeStyles: Record<ButtonSize, string> = {
  small: 'h-6 px-2 text-xs gap-1',
  middle: 'h-8 px-4 text-sm gap-1.5',
  large: 'h-10 px-5 text-base gap-2',
}

/**
 * 加载动画组件
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
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
 * Button 按钮组件
 * 
 * 用于触发操作的交互组件，支持多种变体、尺寸和状态。
 * 
 * @example
 * // 主要按钮
 * <Button variant="primary">提交</Button>
 * 
 * // 带图标的按钮
 * <Button icon={<PlusIcon />}>新增</Button>
 * 
 * // 加载状态
 * <Button loading>加载中</Button>
 * 
 * // 危险按钮
 * <Button danger>删除</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'middle',
      loading = false,
      icon,
      danger = false,
      block = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // 获取变体样式（危险状态使用危险样式）
    const variantClassName = danger
      ? dangerVariantStyles[variant]
      : variantStyles[variant]

    // 确定图标尺寸
    const iconSize = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // 基础样式
          'inline-flex items-center justify-center',
          'font-medium rounded-md border',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // 变体样式
          variantClassName,
          // 尺寸样式
          sizeStyles[size],
          // 块级按钮
          block && 'w-full',
          // 自定义类名
          className
        )}
        {...props}
      >
        {/* 加载动画或图标 */}
        {loading ? (
          <LoadingSpinner className={iconSize} />
        ) : icon ? (
          <span className={cn('flex-shrink-0', iconSize)}>{icon}</span>
        ) : null}
        
        {/* 按钮文本 */}
        {children && <span>{children}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
