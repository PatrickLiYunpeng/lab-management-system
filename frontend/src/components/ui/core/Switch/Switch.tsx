import { forwardRef, type ReactNode } from 'react'
import { Switch as HeadlessSwitch } from '@headlessui/react'
import { cn } from '../../index'

/**
 * Switch 尺寸类型
 */
export type SwitchSize = 'small' | 'default'

/**
 * Switch 组件属性接口
 */
export interface SwitchProps {
  /** 是否选中 */
  checked?: boolean
  /** 默认是否选中 */
  defaultChecked?: boolean
  /** 变化回调 */
  onChange?: (checked: boolean) => void
  /** 加载状态 */
  loading?: boolean
  /** 禁用状态 */
  disabled?: boolean
  /** 尺寸 */
  size?: SwitchSize
  /** 选中时的内容 */
  checkedChildren?: ReactNode
  /** 非选中时的内容 */
  unCheckedChildren?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 名称 */
  name?: string
}

/**
 * 尺寸样式映射
 */
const sizeStyles = {
  small: {
    switch: 'h-4 w-7',
    handle: 'h-3 w-3',
    translate: 'translate-x-3',
  },
  default: {
    switch: 'h-[22px] w-11',
    handle: 'h-[18px] w-[18px]',
    translate: 'translate-x-5',
  },
}

/**
 * 加载图标
 */
function LoadingIcon({ className }: { className?: string }) {
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
 * Switch 开关组件
 * 
 * 切换状态的开关选择器，基于 Headless UI 实现。
 * 
 * @example
 * // 基础用法
 * <Switch checked={checked} onChange={setChecked} />
 * 
 * // 带文字
 * <Switch checkedChildren="开" unCheckedChildren="关" />
 * 
 * // 加载状态
 * <Switch loading />
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked = false,
      onChange,
      loading = false,
      disabled,
      size = 'default',
      checkedChildren,
      unCheckedChildren,
      className,
      name,
    },
    ref
  ) => {
    const styles = sizeStyles[size]
    const isDisabled = disabled || loading

    return (
      <HeadlessSwitch
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={isDisabled}
        name={name}
        className={cn(
          // 基础样式
          'relative inline-flex items-center',
          'rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2',
          // 尺寸
          styles.switch,
          // 状态颜色
          'data-[checked]:bg-primary-500',
          'data-[checked=false]:bg-neutral-300',
          // 禁用状态
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'cursor-pointer',
          className
        )}
      >
        {/* 内容文字 */}
        {(checkedChildren || unCheckedChildren) && (
          <>
            <span
              className={cn(
                'absolute text-white text-xs',
                'transition-opacity duration-200',
                'left-1.5',
                // 使用 data 属性控制显示
                'opacity-0 data-[checked]:opacity-100'
              )}
              data-checked={checked}
            >
              {checkedChildren}
            </span>
            <span
              className={cn(
                'absolute text-neutral-600 text-xs',
                'transition-opacity duration-200',
                'right-1.5',
                // 使用 data 属性控制显示
                'opacity-100 data-[checked]:opacity-0'
              )}
              data-checked={checked}
            >
              {unCheckedChildren}
            </span>
          </>
        )}

        {/* 滑块 */}
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'bg-white rounded-full shadow',
            'transform transition-transform duration-200 ease-in-out',
            'translate-x-0.5',
            styles.handle,
            // 选中时移动
            'data-[checked]:translate-x-0',
            checked && styles.translate
          )}
        >
          {/* 加载图标 */}
          {loading && (
            <LoadingIcon
              className={cn(
                'text-primary-500',
                size === 'small' ? 'w-2 h-2' : 'w-3 h-3'
              )}
            />
          )}
        </span>
      </HeadlessSwitch>
    )
  }
)

Switch.displayName = 'Switch'

export default Switch
