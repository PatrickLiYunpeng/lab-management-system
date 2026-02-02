import {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useMemo,
  type TextareaHTMLAttributes,
  type ChangeEvent,
} from 'react'
import { cn } from '../../index'

/**
 * TextArea 尺寸类型
 */
export type TextAreaSize = 'small' | 'middle' | 'large'

/**
 * 自动调整高度配置
 */
export interface AutoSizeConfig {
  minRows?: number
  maxRows?: number
}

/**
 * TextArea 组件属性接口
 */
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** 尺寸 */
  size?: TextAreaSize
  /** 自动调整高度 */
  autoSize?: boolean | AutoSizeConfig
  /** 显示字数统计 */
  showCount?: boolean
  /** 错误状态 */
  error?: boolean
  /** 值变化回调 */
  onValueChange?: (value: string) => void
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<TextAreaSize, string> = {
  small: 'px-2 py-1 text-xs',
  middle: 'px-3 py-1.5 text-sm',
  large: 'px-4 py-2 text-base',
}

/**
 * 计算行高（像素）
 */
const lineHeights: Record<TextAreaSize, number> = {
  small: 18,
  middle: 22,
  large: 26,
}

/**
 * TextArea 多行文本输入组件
 * 
 * 支持自动高度调整和字数统计的多行文本输入。
 * 
 * @example
 * // 基础用法
 * <TextArea placeholder="请输入内容" />
 * 
 * // 自动调整高度
 * <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
 * 
 * // 显示字数统计
 * <TextArea showCount maxLength={200} />
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      size = 'middle',
      autoSize = false,
      showCount = false,
      error = false,
      disabled,
      className,
      value,
      defaultValue,
      maxLength,
      onChange,
      onValueChange,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    const currentValue = value !== undefined ? value : internalValue

    // 解析 autoSize 配置（用 useMemo 稳定引用）
    const autoSizeConfig = useMemo<AutoSizeConfig | null>(() => {
      if (autoSize === true) {
        return { minRows: 1, maxRows: undefined }
      }
      if (autoSize === false) {
        return null
      }
      return autoSize
    }, [autoSize])

    // 计算当前字符数
    const charCount = String(currentValue).length

    // 处理值变化
    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onChange?.(e)
      onValueChange?.(newValue)
    }

    // 自动调整高度
    useEffect(() => {
      if (!autoSizeConfig || !textareaRef.current) return

      const textarea = textareaRef.current
      const lineHeight = lineHeights[size]
      const paddingY = size === 'small' ? 8 : size === 'large' ? 16 : 12

      // 重置高度以获取真实 scrollHeight
      textarea.style.height = 'auto'

      // 计算新高度
      const minHeight = autoSizeConfig.minRows
        ? autoSizeConfig.minRows * lineHeight + paddingY
        : undefined
      const maxHeight = autoSizeConfig.maxRows
        ? autoSizeConfig.maxRows * lineHeight + paddingY
        : undefined

      let newHeight = textarea.scrollHeight
      if (minHeight && newHeight < minHeight) newHeight = minHeight
      if (maxHeight && newHeight > maxHeight) newHeight = maxHeight

      textarea.style.height = `${newHeight}px`
    }, [currentValue, autoSizeConfig, size])

    // 合并 ref
    const setRefs = (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    }

    return (
      <div className="relative">
        <textarea
          ref={setRefs}
          disabled={disabled}
          value={currentValue}
          onChange={handleChange}
          maxLength={maxLength}
          rows={autoSizeConfig ? undefined : rows}
          className={cn(
            // 基础样式
            'w-full bg-white border rounded-md',
            'transition-all duration-200',
            'resize-none',
            // 焦点样式
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            // 错误状态
            error && 'border-error-500 focus:ring-error-500/20 focus:border-error-500',
            // 禁用状态
            disabled && 'bg-neutral-100 cursor-not-allowed',
            // 正常边框
            !error && 'border-neutral-300',
            // 占位符
            'placeholder:text-neutral-400',
            // 尺寸
            sizeStyles[size],
            // 字数统计留空间
            showCount && 'pb-6',
            className
          )}
          {...props}
        />

        {/* 字数统计 */}
        {showCount && (
          <span
            className={cn(
              'absolute bottom-1.5 right-3',
              'text-xs text-neutral-400',
              charCount > (maxLength ?? Infinity) && 'text-error-500'
            )}
          >
            {maxLength ? `${charCount}/${maxLength}` : charCount}
          </span>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export default TextArea
