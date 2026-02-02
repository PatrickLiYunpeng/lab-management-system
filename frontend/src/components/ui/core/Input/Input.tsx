import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type ChangeEvent,
} from 'react'
import { cn } from '../../index'

/**
 * 输入框尺寸类型
 */
export type InputSize = 'small' | 'middle' | 'large'

/**
 * 输入框组件属性接口
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** 输入框尺寸 */
  size?: InputSize
  /** 前缀图标或文本 */
  prefix?: ReactNode
  /** 后缀图标或文本 */
  suffix?: ReactNode
  /** 允许清除内容 */
  allowClear?: boolean
  /** 错误状态 */
  error?: boolean
  /** 值变化回调 */
  onValueChange?: (value: string) => void
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<InputSize, string> = {
  small: 'h-6 px-2 text-xs',
  middle: 'h-8 px-3 text-sm',
  large: 'h-10 px-4 text-base',
}

/**
 * 清除按钮组件
 */
function ClearButton({ onClick, size }: { onClick: () => void; size: InputSize }) {
  const iconSize = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
      tabIndex={-1}
    >
      <svg className={iconSize} viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}

/**
 * Input 输入框组件
 * 
 * 基础文本输入组件，支持前后缀、清除按钮等功能。
 * 
 * @example
 * // 基础用法
 * <Input placeholder="请输入" />
 * 
 * // 带前缀图标
 * <Input prefix={<SearchIcon />} placeholder="搜索" />
 * 
 * // 允许清除
 * <Input allowClear value={value} onChange={setValue} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'middle',
      prefix,
      suffix,
      allowClear = false,
      error = false,
      disabled,
      className,
      value,
      defaultValue,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    // 内部状态管理（非受控模式）
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    const currentValue = value !== undefined ? value : internalValue

    // 处理值变化
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onChange?.(e)
      onValueChange?.(newValue)
    }

    // 处理清除
    const handleClear = () => {
      if (value === undefined) {
        setInternalValue('')
      }
      // 模拟 onChange 事件
      const event = {
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>
      onChange?.(event)
      onValueChange?.('')
    }

    // 是否显示清除按钮
    const showClear = allowClear && currentValue && !disabled

    return (
      <div
        className={cn(
          // 容器样式
          'inline-flex items-center w-full',
          'bg-white border rounded-md',
          'transition-all duration-200',
          // 焦点样式
          'focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500',
          // 错误状态
          error && 'border-error-500 focus-within:ring-error-500/20 focus-within:border-error-500',
          // 禁用状态
          disabled && 'bg-neutral-100 cursor-not-allowed',
          // 正常边框
          !error && 'border-neutral-300',
          // 尺寸
          sizeStyles[size],
          className
        )}
      >
        {/* 前缀 */}
        {prefix && (
          <span className="flex-shrink-0 text-neutral-400 mr-2">{prefix}</span>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          disabled={disabled}
          value={currentValue}
          onChange={handleChange}
          className={cn(
            'flex-1 min-w-0 bg-transparent',
            'border-none outline-none',
            'placeholder:text-neutral-400',
            'disabled:cursor-not-allowed',
            // 移除默认样式
            'appearance-none'
          )}
          {...props}
        />

        {/* 清除按钮 */}
        {showClear && <ClearButton onClick={handleClear} size={size} />}

        {/* 后缀 */}
        {suffix && (
          <span className="flex-shrink-0 text-neutral-400 ml-2">{suffix}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
