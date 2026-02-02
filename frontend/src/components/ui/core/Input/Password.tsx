import { forwardRef, useState } from 'react'
import { Input, type InputProps } from './Input'
import { cn } from '../../index'

/**
 * 密码输入框属性接口
 */
export interface PasswordProps extends Omit<InputProps, 'type' | 'suffix'> {
  /** 是否显示切换按钮 */
  visibilityToggle?: boolean
}

/**
 * 眼睛图标（可见状态）
 */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path
        fillRule="evenodd"
        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 眼睛关闭图标（隐藏状态）
 */
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
        clipRule="evenodd"
      />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  )
}

/**
 * Password 密码输入框组件
 * 
 * 带可见性切换的密码输入组件。
 * 
 * @example
 * // 基础用法
 * <Password placeholder="请输入密码" />
 * 
 * // 禁用切换按钮
 * <Password visibilityToggle={false} />
 */
export const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ visibilityToggle = true, size = 'middle', disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    // 图标尺寸
    const iconSize = size === 'small' ? 'w-3.5 h-3.5' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'

    // 切换按钮
    const toggleButton = visibilityToggle ? (
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 text-neutral-400',
          'hover:text-neutral-600 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        tabIndex={-1}
      >
        {visible ? (
          <EyeIcon className={iconSize} />
        ) : (
          <EyeOffIcon className={iconSize} />
        )}
      </button>
    ) : null

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        size={size}
        disabled={disabled}
        suffix={toggleButton}
        {...props}
      />
    )
  }
)

Password.displayName = 'Password'

export default Password
