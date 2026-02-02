import { Fragment, useState, type ReactNode, type ReactElement, cloneElement } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '../../index'
import { Button } from '../../core/Button'

/**
 * Popconfirm 位置类型
 */
export type PopconfirmPlacement = 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight'

/**
 * Popconfirm 组件属性接口
 */
export interface PopconfirmProps {
  /** 标题 */
  title: ReactNode
  /** 描述内容 */
  description?: ReactNode
  /** 确认按钮文字 */
  okText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认按钮类型 */
  okType?: 'primary' | 'default' | 'dashed' | 'text' | 'link'
  /** 确认按钮是否危险 */
  okDanger?: boolean
  /** 自定义图标 */
  icon?: ReactNode
  /** 是否显示图标 */
  showIcon?: boolean
  /** 确认回调 */
  onConfirm?: () => void | Promise<void>
  /** 取消回调 */
  onCancel?: () => void
  /** 触发元素 */
  children: ReactElement
  /** 位置 */
  placement?: PopconfirmPlacement
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 位置样式映射
 */
const placementStyles: Record<PopconfirmPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  topLeft: 'bottom-full left-0 mb-2',
  topRight: 'bottom-full right-0 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  bottomLeft: 'top-full left-0 mt-2',
  bottomRight: 'top-full right-0 mt-2',
}

/**
 * Popconfirm 气泡确认框组件
 * 
 * 点击元素弹出气泡确认框，用于二次确认操作。
 * 
 * @example
 * <Popconfirm
 *   title="确认删除"
 *   description="确定要删除这条记录吗？"
 *   onConfirm={handleDelete}
 * >
 *   <Button danger>删除</Button>
 * </Popconfirm>
 */
export function Popconfirm({
  title,
  description,
  okText = '确定',
  cancelText = '取消',
  okType = 'primary',
  okDanger = false,
  icon,
  showIcon = true,
  onConfirm,
  onCancel,
  children,
  placement = 'top',
  disabled = false,
  className,
}: PopconfirmProps) {
  const [loading, setLoading] = useState(false)

  // 处理确认
  const handleConfirm = async (close: () => void) => {
    if (onConfirm) {
      try {
        setLoading(true)
        await onConfirm()
      } finally {
        setLoading(false)
      }
    }
    close()
  }

  // 处理取消
  const handleCancel = (close: () => void) => {
    onCancel?.()
    close()
  }

  if (disabled) {
    return children
  }

  return (
    <Popover className={cn('relative inline-block', className)}>
      {({ open, close }) => (
        <>
          <Popover.Button as={Fragment}>
            {cloneElement(children, {
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                // 原有的 onClick 不触发，由 Popover 控制
              },
            } as React.HTMLAttributes<HTMLElement>)}
          </Popover.Button>

          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Popover.Panel
              className={cn(
                'absolute z-50',
                'bg-white rounded-lg shadow-lg',
                'ring-1 ring-black/5',
                'min-w-[200px] max-w-[300px]',
                'p-4',
                placementStyles[placement]
              )}
            >
              {/* 内容 */}
              <div className="flex gap-3">
                {/* 图标 */}
                {showIcon && (
                  <span className="flex-shrink-0 mt-0.5">
                    {icon || (
                      <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />
                    )}
                  </span>
                )}

                {/* 文本 */}
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-900">
                    {title}
                  </div>
                  {description && (
                    <div className="mt-1 text-sm text-neutral-500">
                      {description}
                    </div>
                  )}
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="default"
                  size="small"
                  onClick={() => handleCancel(close)}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
                <Button
                  variant={okType}
                  size="small"
                  danger={okDanger}
                  loading={loading}
                  onClick={() => handleConfirm(close)}
                >
                  {okText}
                </Button>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

Popconfirm.displayName = 'Popconfirm'

export default Popconfirm
