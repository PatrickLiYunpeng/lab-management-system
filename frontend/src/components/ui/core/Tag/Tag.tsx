import { type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * 预设颜色类型
 */
export type TagColor =
  | 'default'
  | 'success'
  | 'processing'
  | 'error'
  | 'warning'
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

/**
 * Tag 组件属性接口
 */
export interface TagProps {
  /** 标签内容 */
  children: ReactNode
  /** 颜色 */
  color?: TagColor
  /** 自定义颜色（十六进制） */
  customColor?: string
  /** 是否可关闭 */
  closable?: boolean
  /** 关闭回调 */
  onClose?: () => void
  /** 图标 */
  icon?: ReactNode
  /** 是否有边框 */
  bordered?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 预设颜色样式映射
 */
const colorStyles: Record<TagColor, string> = {
  default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  processing: 'bg-primary-50 text-primary-700 border-primary-200',
  error: 'bg-error-50 text-error-700 border-error-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  magenta: 'bg-pink-50 text-pink-700 border-pink-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  volcano: 'bg-orange-50 text-orange-700 border-orange-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  lime: 'bg-lime-50 text-lime-700 border-lime-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  geekblue: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

/**
 * 关闭图标
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * Tag 标签组件
 * 
 * 用于标记和分类的小标签组件。
 * 
 * @example
 * // 基础用法
 * <Tag>标签</Tag>
 * 
 * // 带颜色
 * <Tag color="success">成功</Tag>
 * 
 * // 可关闭
 * <Tag closable onClose={() => console.log('关闭')}>标签</Tag>
 * 
 * // 带图标
 * <Tag icon={<UserIcon />}>用户</Tag>
 */
export function Tag({
  children,
  color = 'default',
  customColor,
  closable = false,
  onClose,
  icon,
  bordered = true,
  className,
}: TagProps) {
  // 使用自定义颜色或预设颜色
  const colorClassName = customColor ? '' : colorStyles[color]

  // 自定义颜色内联样式
  const customStyle = customColor
    ? {
        backgroundColor: `${customColor}15`,
        color: customColor,
        borderColor: `${customColor}40`,
      }
    : undefined

  return (
    <span
      className={cn(
        // 基础样式
        'inline-flex items-center gap-1',
        'px-2 py-0.5 text-xs font-medium',
        'rounded',
        // 边框
        bordered && 'border',
        // 颜色
        colorClassName,
        className
      )}
      style={customStyle}
    >
      {/* 图标 */}
      {icon && <span className="w-3 h-3 flex-shrink-0">{icon}</span>}

      {/* 内容 */}
      <span>{children}</span>

      {/* 关闭按钮 */}
      {closable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          className={cn(
            'ml-0.5 -mr-0.5',
            'hover:opacity-70 transition-opacity',
            'focus:outline-none'
          )}
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

Tag.displayName = 'Tag'

export default Tag
