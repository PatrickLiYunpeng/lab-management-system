import {
  forwardRef,
  useState,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type WheelEvent,
} from 'react'
import { cn } from '../../index'

/**
 * InputNumber 尺寸类型
 */
export type InputNumberSize = 'small' | 'middle' | 'large'

/**
 * InputNumber 组件属性接口
 */
export interface InputNumberProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange' | 'value' | 'defaultValue'> {
  /** 尺寸 */
  size?: InputNumberSize
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 步进值 */
  step?: number
  /** 小数精度 */
  precision?: number
  /** 显示控制按钮 */
  controls?: boolean
  /** 错误状态 */
  error?: boolean
  /** 当前值 */
  value?: number | null
  /** 默认值 */
  defaultValue?: number
  /** 值变化回调 */
  onChange?: (value: number | null) => void
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<InputNumberSize, string> = {
  small: 'h-6 text-xs',
  middle: 'h-8 text-sm',
  large: 'h-10 text-base',
}

/**
 * 控制按钮尺寸
 */
const controlSizes: Record<InputNumberSize, string> = {
  small: 'w-4 h-3',
  middle: 'w-5 h-4',
  large: 'w-6 h-5',
}

/**
 * 向上箭头图标
 */
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 向下箭头图标
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * InputNumber 数字输入框组件
 * 
 * 用于输入数字的组件，支持步进、范围限制和精度控制。
 * 
 * @example
 * // 基础用法
 * <InputNumber min={0} max={100} />
 * 
 * // 带精度
 * <InputNumber step={0.01} precision={2} />
 * 
 * // 无控制按钮
 * <InputNumber controls={false} />
 */
export const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(
  (
    {
      size = 'middle',
      min,
      max,
      step = 1,
      precision,
      controls = true,
      error = false,
      disabled,
      className,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [internalValue, setInternalValue] = useState<number | null>(defaultValue ?? null)
    const [inputText, setInputText] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : ''
    )

    const currentValue = value !== undefined ? value : internalValue

    // 格式化数值
    const formatValue = (val: number | null): string => {
      if (val === null) return ''
      if (precision !== undefined) {
        return val.toFixed(precision)
      }
      return String(val)
    }

    // 约束数值范围
    const clampValue = (val: number): number => {
      let result = val
      if (min !== undefined && result < min) result = min
      if (max !== undefined && result > max) result = max
      if (precision !== undefined) {
        result = Number(result.toFixed(precision))
      }
      return result
    }

    // 更新值
    const updateValue = (newValue: number | null) => {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      setInputText(formatValue(newValue))
      onChange?.(newValue)
    }

    // 处理输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value
      setInputText(text)

      if (text === '' || text === '-') {
        if (value === undefined) {
          setInternalValue(null)
        }
        if (text === '') {
          onChange?.(null)
        }
        return
      }

      const num = parseFloat(text)
      if (!isNaN(num)) {
        const clampedValue = clampValue(num)
        if (value === undefined) {
          setInternalValue(clampedValue)
        }
        onChange?.(clampedValue)
      }
    }

    // 处理失去焦点
    const handleBlur = () => {
      // 格式化显示值
      setInputText(formatValue(currentValue))
    }

    // 增加值
    const handleIncrease = () => {
      if (disabled) return
      const base = currentValue ?? 0
      const newValue = clampValue(base + step)
      updateValue(newValue)
    }

    // 减少值
    const handleDecrease = () => {
      if (disabled) return
      const base = currentValue ?? 0
      const newValue = clampValue(base - step)
      updateValue(newValue)
    }

    // 键盘事件
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleIncrease()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleDecrease()
      }
    }

    // 滚轮事件
    const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
      if (document.activeElement !== inputRef.current) return
      e.preventDefault()
      if (e.deltaY < 0) {
        handleIncrease()
      } else {
        handleDecrease()
      }
    }

    // 合并 ref
    const setRefs = (element: HTMLInputElement | null) => {
      inputRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    }

    // 判断是否可以增加/减少
    const canIncrease = max === undefined || (currentValue ?? 0) < max
    const canDecrease = min === undefined || (currentValue ?? 0) > min

    return (
      <div
        className={cn(
          // 容器样式
          'inline-flex items-center',
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
        {/* 输入框 */}
        <input
          ref={setRefs}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          className={cn(
            'flex-1 min-w-0 bg-transparent',
            'border-none outline-none',
            'px-3 text-right',
            'placeholder:text-neutral-400',
            'disabled:cursor-not-allowed'
          )}
          {...props}
        />

        {/* 控制按钮 */}
        {controls && (
          <div className="flex flex-col border-l border-neutral-300">
            <button
              type="button"
              onClick={handleIncrease}
              disabled={disabled || !canIncrease}
              className={cn(
                'flex items-center justify-center',
                'text-neutral-400 hover:text-neutral-600',
                'hover:bg-neutral-100 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-b border-neutral-300',
                controlSizes[size]
              )}
              tabIndex={-1}
            >
              <ChevronUpIcon className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDecrease}
              disabled={disabled || !canDecrease}
              className={cn(
                'flex items-center justify-center',
                'text-neutral-400 hover:text-neutral-600',
                'hover:bg-neutral-100 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                controlSizes[size]
              )}
              tabIndex={-1}
            >
              <ChevronDownIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }
)

InputNumber.displayName = 'InputNumber'

export default InputNumber
