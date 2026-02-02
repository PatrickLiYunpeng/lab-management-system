import { type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * Alert 类型
 */
export type AlertType = 'success' | 'info' | 'warning' | 'error'

/**
 * Alert 组件属性接口
 */
export interface AlertProps {
  /** 警告类型 */
  type?: AlertType
  /** 消息内容 */
  message: ReactNode
  /** 辅助描述内容 */
  description?: ReactNode
  /** 是否显示图标 */
  showIcon?: boolean
  /** 自定义图标 */
  icon?: ReactNode
  /** 是否可关闭 */
  closable?: boolean
  /** 关闭时的回调 */
  onClose?: () => void
  /** 自定义类名 */
  className?: string
  /** 无边框样式 */
  banner?: boolean
}

/**
 * 类型样式映射
 */
const typeStyles: Record<AlertType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-success-50',
    border: 'border-success-200',
    icon: 'text-success-500',
  },
  info: {
    bg: 'bg-info-50',
    border: 'border-info-200',
    icon: 'text-info-500',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    icon: 'text-warning-500',
  },
  error: {
    bg: 'bg-error-50',
    border: 'border-error-200',
    icon: 'text-error-500',
  },
}

/**
 * 成功图标
 */
function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 信息图标
 */
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 警告图标
 */
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * 错误图标
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  )
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
 * 获取默认图标
 */
function getDefaultIcon(type: AlertType, className: string) {
  const icons: Record<AlertType, ReactNode> = {
    success: <SuccessIcon className={className} />,
    info: <InfoIcon className={className} />,
    warning: <WarningIcon className={className} />,
    error: <ErrorIcon className={className} />,
  }
  return icons[type]
}

/**
 * Alert 警告提示组件
 * 
 * 用于展示重要的提示信息，支持多种类型和样式。
 * 
 * @example
 * // 成功提示
 * <Alert type="success" message="操作成功" />
 * 
 * // 带描述的错误提示
 * <Alert 
 *   type="error" 
 *   message="提交失败" 
 *   description="请检查网络连接后重试"
 *   showIcon
 * />
 * 
 * // 可关闭的警告
 * <Alert 
 *   type="warning" 
 *   message="警告" 
 *   closable 
 *   onClose={() => console.log('关闭')} 
 * />
 */
export function Alert({
  type = 'info',
  message,
  description,
  showIcon = false,
  icon,
  closable = false,
  onClose,
  className,
  banner = false,
}: AlertProps) {
  const styles = typeStyles[type]
  const hasDescription = !!description
  const iconSize = hasDescription ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <div
      role="alert"
      className={cn(
        // 基础样式
        'flex items-start gap-3 p-4',
        styles.bg,
        // 边框样式
        !banner && 'border rounded-md',
        !banner && styles.border,
        // banner 样式
        banner && 'border-b',
        banner && styles.border,
        className
      )}
    >
      {/* 图标 */}
      {showIcon && (
        <span className={cn('flex-shrink-0', styles.icon)}>
          {icon || getDefaultIcon(type, iconSize)}
        </span>
      )}

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {/* 消息标题 */}
        <div
          className={cn(
            'text-neutral-800',
            hasDescription ? 'font-medium' : 'text-sm'
          )}
        >
          {message}
        </div>

        {/* 描述内容 */}
        {description && (
          <div className="mt-1 text-sm text-neutral-600">{description}</div>
        )}
      </div>

      {/* 关闭按钮 */}
      {closable && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-0.5',
            'text-neutral-400 hover:text-neutral-600',
            'transition-colors rounded',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
          )}
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

Alert.displayName = 'Alert'

export default Alert
