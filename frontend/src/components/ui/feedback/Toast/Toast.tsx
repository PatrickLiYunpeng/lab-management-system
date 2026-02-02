/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { Transition } from '@headlessui/react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'
import { cn } from '../../index'

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

/**
 * Toast 位置
 */
export type ToastPlacement = 
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'

/**
 * Toast 配置
 */
export interface ToastConfig {
  /** 提示内容 */
  content: ReactNode
  /** 提示类型 */
  type?: ToastType
  /** 显示时长（毫秒），0 表示不自动关闭 */
  duration?: number
  /** 唯一标识 */
  key?: string
  /** 关闭回调 */
  onClose?: () => void
  /** 是否显示关闭按钮 */
  closable?: boolean
  /** 自定义图标 */
  icon?: ReactNode
  /** 自定义类名 */
  className?: string
}

/**
 * 内部 Toast 项
 */
interface ToastItem extends ToastConfig {
  id: string
  visible: boolean
}

/**
 * Toast 上下文
 */
interface ToastContextValue {
  /** 显示 toast */
  show: (config: ToastConfig | string) => string
  /** 成功提示 */
  success: (content: ReactNode, duration?: number) => string
  /** 错误提示 */
  error: (content: ReactNode, duration?: number) => string
  /** 警告提示 */
  warning: (content: ReactNode, duration?: number) => string
  /** 信息提示 */
  info: (content: ReactNode, duration?: number) => string
  /** 加载提示 */
  loading: (content: ReactNode, duration?: number) => string
  /** 关闭指定 toast */
  close: (key: string) => void
  /** 关闭所有 toast */
  closeAll: () => void
  /** 更新 toast */
  update: (key: string, config: Partial<ToastConfig>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * 类型图标映射
 */
const typeIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-success-500" />,
  error: <ExclamationCircleIcon className="w-5 h-5 text-error-500" />,
  warning: <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />,
  info: <InformationCircleIcon className="w-5 h-5 text-info-500" />,
  loading: (
    <svg
      className="w-5 h-5 text-primary-500 animate-spin"
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
  ),
}

/**
 * 位置样式映射
 */
const placementStyles: Record<ToastPlacement, string> = {
  top: 'top-4 left-1/2 -translate-x-1/2',
  topLeft: 'top-4 left-4',
  topRight: 'top-4 right-4',
  bottom: 'bottom-4 left-1/2 -translate-x-1/2',
  bottomLeft: 'bottom-4 left-4',
  bottomRight: 'bottom-4 right-4',
}

/**
 * Toast 提供者属性
 */
export interface ToastProviderProps {
  children: ReactNode
  /** 默认位置 */
  placement?: ToastPlacement
  /** 默认持续时间 */
  duration?: number
  /** 最大显示数量 */
  maxCount?: number
}

/**
 * 生成唯一 ID
 */
let toastId = 0
const generateId = () => `toast-${++toastId}`

/**
 * Toast 提供者组件
 * 
 * 提供全局 Toast 通知功能的上下文提供者。
 * 
 * @example
 * // 在应用根组件中使用
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * // 在子组件中使用
 * const toast = useToast()
 * toast.success('操作成功')
 * toast.error('操作失败')
 */
export function ToastProvider({
  children,
  placement = 'top',
  duration: defaultDuration = 3000,
  maxCount = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // 清除定时器
  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  // 关闭 toast
  const closeToast = useCallback((id: string) => {
    clearTimer(id)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    )
    // 延迟移除以等待动画完成
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [clearTimer])

  // 显示 toast
  const show = useCallback(
    (config: ToastConfig | string): string => {
      const normalizedConfig: ToastConfig =
        typeof config === 'string' ? { content: config } : config

      const id = normalizedConfig.key || generateId()
      const duration = normalizedConfig.duration ?? defaultDuration

      // 检查是否已存在相同 key 的 toast
      setToasts((prev) => {
        const existingIndex = normalizedConfig.key
          ? prev.findIndex((t) => t.key === normalizedConfig.key)
          : -1

        if (existingIndex >= 0) {
          // 更新现有 toast
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...normalizedConfig,
            id,
            visible: true,
          }
          return updated
        }

        // 添加新 toast（限制最大数量）
        const newToast: ToastItem = {
          ...normalizedConfig,
          id,
          visible: true,
        }
        const newToasts = [...prev, newToast]
        if (newToasts.length > maxCount) {
          newToasts.shift()
        }
        return newToasts
      })

      // 设置自动关闭定时器
      if (duration > 0) {
        clearTimer(id)
        const timer = setTimeout(() => {
          closeToast(id)
          normalizedConfig.onClose?.()
        }, duration)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [defaultDuration, maxCount, clearTimer, closeToast]
  )

  // 便捷方法
  const success = useCallback(
    (content: ReactNode, duration?: number) =>
      show({ content, type: 'success', duration }),
    [show]
  )

  const error = useCallback(
    (content: ReactNode, duration?: number) =>
      show({ content, type: 'error', duration }),
    [show]
  )

  const warning = useCallback(
    (content: ReactNode, duration?: number) =>
      show({ content, type: 'warning', duration }),
    [show]
  )

  const info = useCallback(
    (content: ReactNode, duration?: number) =>
      show({ content, type: 'info', duration }),
    [show]
  )

  const loading = useCallback(
    (content: ReactNode, duration?: number) =>
      show({ content, type: 'loading', duration: duration ?? 0 }),
    [show]
  )

  // 关闭指定 toast
  const close = useCallback(
    (key: string) => {
      const toast = toasts.find((t) => t.key === key || t.id === key)
      if (toast) {
        closeToast(toast.id)
        toast.onClose?.()
      }
    },
    [toasts, closeToast]
  )

  // 关闭所有 toast
  const closeAll = useCallback(() => {
    toasts.forEach((t) => {
      closeToast(t.id)
      t.onClose?.()
    })
  }, [toasts, closeToast])

  // 更新 toast
  const update = useCallback(
    (key: string, config: Partial<ToastConfig>) => {
      setToasts((prev) =>
        prev.map((t) =>
          t.key === key || t.id === key ? { ...t, ...config } : t
        )
      )
    },
    []
  )

  // 清理所有定时器
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const contextValue: ToastContextValue = {
    show,
    success,
    error,
    warning,
    info,
    loading,
    close,
    closeAll,
    update,
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast 容器 */}
      <div
        className={cn(
          'fixed z-[9999] flex flex-col gap-2',
          placementStyles[placement]
        )}
      >
        {toasts.map((toast) => (
          <Transition
            key={toast.id}
            show={toast.visible}
            enter="transition-all duration-300 ease-out"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition-all duration-200 ease-in"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                'bg-white rounded-lg shadow-lg',
                'border border-neutral-200',
                'min-w-[200px] max-w-[400px]',
                toast.className
              )}
              role="alert"
            >
              {/* 图标 */}
              {(toast.icon || toast.type) && (
                <span className="flex-shrink-0">
                  {toast.icon || (toast.type && typeIcons[toast.type])}
                </span>
              )}
              
              {/* 内容 */}
              <span className="flex-1 text-sm text-neutral-700">
                {toast.content}
              </span>
              
              {/* 关闭按钮 */}
              {toast.closable !== false && toast.type !== 'loading' && (
                <button
                  onClick={() => {
                    closeToast(toast.id)
                    toast.onClose?.()
                  }}
                  className="flex-shrink-0 p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </Transition>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * useToast Hook
 * 
 * 获取 Toast 上下文，用于显示通知。
 * 
 * @example
 * const toast = useToast()
 * 
 * // 显示成功提示
 * toast.success('保存成功')
 * 
 * // 显示错误提示
 * toast.error('保存失败')
 * 
 * // 显示自定义 toast
 * toast.show({
 *   content: '自定义内容',
 *   type: 'info',
 *   duration: 5000,
 * })
 * 
 * // 显示加载中（手动关闭）
 * const key = toast.loading('加载中...')
 * // ... 加载完成后
 * toast.close(key)
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * 全局 toast 实例（需要先渲染 ToastProvider）
 * 
 * @deprecated 推荐使用 useToast hook
 */
export const toast = {
  _context: null as ToastContextValue | null,
  
  _setContext(context: ToastContextValue) {
    this._context = context
  },
  
  show(config: ToastConfig | string) {
    if (!this._context) {
      console.warn('Toast: ToastProvider not found')
      return ''
    }
    return this._context.show(config)
  },
  
  success(content: ReactNode, duration?: number) {
    return this.show({ content, type: 'success', duration })
  },
  
  error(content: ReactNode, duration?: number) {
    return this.show({ content, type: 'error', duration })
  },
  
  warning(content: ReactNode, duration?: number) {
    return this.show({ content, type: 'warning', duration })
  },
  
  info(content: ReactNode, duration?: number) {
    return this.show({ content, type: 'info', duration })
  },
  
  loading(content: ReactNode, duration?: number) {
    return this.show({ content, type: 'loading', duration: duration ?? 0 })
  },
  
  close(key: string) {
    this._context?.close(key)
  },
  
  closeAll() {
    this._context?.closeAll()
  },
}

export default ToastProvider
