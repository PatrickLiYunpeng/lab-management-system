import { Fragment, type ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '../../index'
import { Button } from '../../core/Button'
import { Spin } from '../../feedback/Spin'

/**
 * Modal 尺寸类型
 */
export type ModalSize = 'small' | 'default' | 'large' | 'full'

/**
 * Modal 组件属性接口
 * 兼容 Ant Design Modal API
 */
export interface ModalProps {
  /** 对话框是否可见（Ant Design 兼容） */
  open?: boolean
  /** 对话框是否可见（旧版兼容） */
  visible?: boolean
  /** 标题 */
  title?: ReactNode
  /** 内容 */
  children?: ReactNode
  /** 宽度（数字为像素，字符串直接使用） */
  width?: number | string
  /** 预设尺寸 */
  size?: ModalSize
  /** 是否显示右上角关闭按钮 */
  closable?: boolean
  /** 点击蒙层是否可关闭 */
  maskClosable?: boolean
  /** 是否支持键盘 ESC 关闭 */
  keyboard?: boolean
  /** 垂直居中展示 */
  centered?: boolean
  /** 确认按钮文字 */
  okText?: ReactNode
  /** 取消按钮文字 */
  cancelText?: ReactNode
  /** 确认按钮 loading */
  confirmLoading?: boolean
  /** 确认按钮类型 */
  okType?: 'primary' | 'default' | 'dashed' | 'text' | 'link'
  /** 确认按钮是否危险 */
  okDanger?: boolean
  /** 是否隐藏底部按钮 */
  footer?: ReactNode | null
  /** 关闭时销毁子组件 */
  destroyOnClose?: boolean
  /** 自定义类名 */
  className?: string
  /** 弹窗外层容器类名 */
  wrapClassName?: string
  /** body 样式 */
  bodyStyle?: React.CSSProperties
  /** z-index */
  zIndex?: number
  /** 点击确定回调 */
  onOk?: () => void | Promise<void>
  /** 点击取消回调 */
  onCancel?: () => void
  /** 完全关闭后的回调 */
  afterClose?: () => void
}

/**
 * 尺寸宽度映射
 */
const sizeWidths: Record<ModalSize, string> = {
  small: 'max-w-md',
  default: 'max-w-lg',
  large: 'max-w-3xl',
  full: 'max-w-[90vw]',
}

/**
 * Modal 模态框组件
 * 
 * 基于 Headless UI Dialog 实现的模态框，提供 Ant Design 兼容的 API。
 * 
 * @example
 * // 基础用法
 * <Modal
 *   open={visible}
 *   title="对话框标题"
 *   onOk={handleOk}
 *   onCancel={handleCancel}
 * >
 *   <p>对话框内容</p>
 * </Modal>
 * 
 * // 确认加载状态
 * <Modal
 *   open={visible}
 *   confirmLoading={loading}
 *   onOk={handleSubmit}
 * >
 *   <Form>...</Form>
 * </Modal>
 * 
 * // 自定义底部
 * <Modal
 *   open={visible}
 *   footer={<Button onClick={onClose}>关闭</Button>}
 * >
 *   <p>内容</p>
 * </Modal>
 */
export function Modal({
  open,
  visible,
  title,
  children,
  width,
  size = 'default',
  closable = true,
  maskClosable = true,
  keyboard = true,
  centered = true,
  okText = '确定',
  cancelText = '取消',
  confirmLoading = false,
  okType = 'primary',
  okDanger = false,
  footer,
  destroyOnClose = false,
  className,
  wrapClassName,
  bodyStyle,
  zIndex = 1000,
  onOk,
  onCancel,
  afterClose,
}: ModalProps) {
  // 兼容 visible 和 open
  const isOpen = open ?? visible ?? false

  // 处理关闭
  const handleClose = () => {
    if (!confirmLoading) {
      onCancel?.()
    }
  }

  // 处理确认
  const handleOk = async () => {
    if (onOk) {
      await onOk()
    }
  }

  // 处理蒙层点击
  const handleBackdropClick = () => {
    if (maskClosable) {
      handleClose()
    }
  }

  // 计算宽度样式
  const widthStyle = width
    ? typeof width === 'number'
      ? { maxWidth: `${width}px` }
      : { maxWidth: width }
    : undefined

  // 默认底部按钮
  const defaultFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="default" onClick={handleClose} disabled={confirmLoading}>
        {cancelText}
      </Button>
      <Button
        variant={okType}
        danger={okDanger}
        onClick={handleOk}
        loading={confirmLoading}
      >
        {okText}
      </Button>
    </div>
  )

  // 渲染底部
  const renderFooter = () => {
    if (footer === null) return null
    if (footer !== undefined) return footer
    return defaultFooter
  }

  return (
    <Transition appear show={isOpen} as={Fragment} afterLeave={afterClose}>
      <Dialog
        as="div"
        className={cn('relative', wrapClassName)}
        style={{ zIndex }}
        onClose={keyboard ? handleClose : () => {}}
      >
        {/* 背景遮罩 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            onClick={handleBackdropClick}
          />
        </Transition.Child>

        {/* 对话框容器 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div
            className={cn(
              'flex min-h-full p-4',
              centered ? 'items-center justify-center' : 'items-start justify-center pt-20'
            )}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-lg bg-white shadow-xl transition-all',
                  !width && sizeWidths[size],
                  className
                )}
                style={widthStyle}
              >
                {/* 标题栏 */}
                {(title || closable) && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium text-neutral-900"
                      >
                        {title}
                      </Dialog.Title>
                    )}
                    {closable && (
                      <button
                        type="button"
                        className={cn(
                          'rounded-md p-1 text-neutral-400 hover:text-neutral-600',
                          'hover:bg-neutral-100 transition-colors',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                          !title && 'ml-auto'
                        )}
                        onClick={handleClose}
                        disabled={confirmLoading}
                      >
                        <span className="sr-only">关闭</span>
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {/* 内容区域 */}
                <div
                  className={cn(
                    'px-6 py-4',
                    confirmLoading && 'relative'
                  )}
                  style={bodyStyle}
                >
                  {/* 加载遮罩 */}
                  {confirmLoading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                      <Spin />
                    </div>
                  )}
                  
                  {/* destroyOnClose 实现 */}
                  {destroyOnClose ? (isOpen ? children : null) : children}
                </div>

                {/* 底部按钮 */}
                {renderFooter() && (
                  <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                    {renderFooter()}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

Modal.displayName = 'Modal'

export default Modal
