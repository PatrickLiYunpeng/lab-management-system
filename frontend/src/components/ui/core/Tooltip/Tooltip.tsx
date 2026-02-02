import { useState, useRef, useEffect, type ReactNode, type ReactElement } from 'react'
import { cn } from '../../index'

/**
 * Tooltip 位置类型
 */
export type TooltipPlacement = 
  | 'top' 
  | 'topLeft' 
  | 'topRight'
  | 'bottom' 
  | 'bottomLeft' 
  | 'bottomRight'
  | 'left' 
  | 'leftTop' 
  | 'leftBottom'
  | 'right' 
  | 'rightTop' 
  | 'rightBottom'

/**
 * Tooltip 触发方式
 */
export type TooltipTrigger = 'hover' | 'focus' | 'click'

/**
 * Tooltip 组件属性接口
 */
export interface TooltipProps {
  /** 提示文字内容 */
  title: ReactNode
  /** 子元素（触发器） */
  children: ReactElement
  /** 气泡位置 */
  placement?: TooltipPlacement
  /** 触发方式 */
  trigger?: TooltipTrigger | TooltipTrigger[]
  /** 是否默认可见（受控模式） */
  open?: boolean
  /** 默认是否可见 */
  defaultOpen?: boolean
  /** 可见性变化回调 */
  onOpenChange?: (open: boolean) => void
  /** 背景色 */
  color?: string
  /** 箭头是否指向目标元素中心 */
  arrowPointAtCenter?: boolean
  /** 鼠标移入后延时显示（毫秒） */
  mouseEnterDelay?: number
  /** 鼠标移出后延时隐藏（毫秒） */
  mouseLeaveDelay?: number
  /** 自定义类名 */
  className?: string
  /** 浮层类名 */
  overlayClassName?: string
}

/**
 * 位置样式映射
 */
const placementStyles: Record<TooltipPlacement, { tooltip: string; arrow: string }> = {
  top: {
    tooltip: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800 border-l-transparent border-r-transparent border-b-transparent',
  },
  topLeft: {
    tooltip: 'bottom-full left-0 mb-2',
    arrow: 'top-full left-3 border-t-neutral-800 border-l-transparent border-r-transparent border-b-transparent',
  },
  topRight: {
    tooltip: 'bottom-full right-0 mb-2',
    arrow: 'top-full right-3 border-t-neutral-800 border-l-transparent border-r-transparent border-b-transparent',
  },
  bottom: {
    tooltip: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800 border-l-transparent border-r-transparent border-t-transparent',
  },
  bottomLeft: {
    tooltip: 'top-full left-0 mt-2',
    arrow: 'bottom-full left-3 border-b-neutral-800 border-l-transparent border-r-transparent border-t-transparent',
  },
  bottomRight: {
    tooltip: 'top-full right-0 mt-2',
    arrow: 'bottom-full right-3 border-b-neutral-800 border-l-transparent border-r-transparent border-t-transparent',
  },
  left: {
    tooltip: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-800 border-t-transparent border-b-transparent border-r-transparent',
  },
  leftTop: {
    tooltip: 'right-full top-0 mr-2',
    arrow: 'left-full top-2 border-l-neutral-800 border-t-transparent border-b-transparent border-r-transparent',
  },
  leftBottom: {
    tooltip: 'right-full bottom-0 mr-2',
    arrow: 'left-full bottom-2 border-l-neutral-800 border-t-transparent border-b-transparent border-r-transparent',
  },
  right: {
    tooltip: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-800 border-t-transparent border-b-transparent border-l-transparent',
  },
  rightTop: {
    tooltip: 'left-full top-0 ml-2',
    arrow: 'right-full top-2 border-r-neutral-800 border-t-transparent border-b-transparent border-l-transparent',
  },
  rightBottom: {
    tooltip: 'left-full bottom-0 ml-2',
    arrow: 'right-full bottom-2 border-r-neutral-800 border-t-transparent border-b-transparent border-l-transparent',
  },
}

/**
 * Tooltip 文字提示组件
 * 
 * 简单的文字提示气泡框，鼠标悬停时显示。
 * 
 * @example
 * // 基础用法
 * <Tooltip title="提示文字">
 *   <span>鼠标移入</span>
 * </Tooltip>
 * 
 * // 不同位置
 * <Tooltip title="上方提示" placement="top">
 *   <Button>上</Button>
 * </Tooltip>
 * 
 * // 点击触发
 * <Tooltip title="点击显示" trigger="click">
 *   <Button>点击</Button>
 * </Tooltip>
 */
export function Tooltip({
  title,
  children,
  placement = 'top',
  trigger = 'hover',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  color,
  mouseEnterDelay = 100,
  mouseLeaveDelay = 100,
  className,
  overlayClassName,
}: TooltipProps) {
  // 可见状态
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  
  // 延时定时器
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // 判断是否受控
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  
  // 获取触发方式数组
  const triggers = Array.isArray(trigger) ? trigger : [trigger]
  
  // 清除定时器
  useEffect(() => {
    return () => {
      if (enterTimerRef.current !== null) clearTimeout(enterTimerRef.current)
      if (leaveTimerRef.current !== null) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  // 设置可见状态
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }

  // 显示 tooltip
  const show = () => {
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    enterTimerRef.current = setTimeout(() => {
      setOpen(true)
    }, mouseEnterDelay)
  }

  // 隐藏 tooltip
  const hide = () => {
    if (enterTimerRef.current !== null) {
      clearTimeout(enterTimerRef.current)
      enterTimerRef.current = null
    }
    leaveTimerRef.current = setTimeout(() => {
      setOpen(false)
    }, mouseLeaveDelay)
  }

  // 切换显示
  const toggle = () => {
    setOpen(!isOpen)
  }

  // 构建事件处理器
  const eventHandlers: Record<string, () => void> = {}
  
  if (triggers.includes('hover')) {
    eventHandlers.onMouseEnter = show
    eventHandlers.onMouseLeave = hide
  }
  
  if (triggers.includes('focus')) {
    eventHandlers.onFocus = show
    eventHandlers.onBlur = hide
  }
  
  if (triggers.includes('click')) {
    eventHandlers.onClick = toggle
  }

  // 位置样式
  const styles = placementStyles[placement]

  // 如果没有 title，直接返回 children
  if (!title) {
    return children
  }

  return (
    <div 
      className={cn('relative inline-block', className)}
      {...eventHandlers}
    >
      {/* 触发元素 */}
      {children}
      
      {/* Tooltip 浮层 */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 pointer-events-none',
            styles.tooltip,
            overlayClassName
          )}
          role="tooltip"
        >
          {/* 内容 */}
          <div
            className={cn(
              'px-2 py-1 text-xs text-white rounded whitespace-nowrap',
              'animate-fade-in'
            )}
            style={{ backgroundColor: color ?? '#404040' }}
          >
            {title}
          </div>
          
          {/* 箭头 */}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              styles.arrow
            )}
            style={color ? {
              borderTopColor: placement.startsWith('top') ? color : 'transparent',
              borderBottomColor: placement.startsWith('bottom') ? color : 'transparent',
              borderLeftColor: placement.startsWith('left') ? color : 'transparent',
              borderRightColor: placement.startsWith('right') ? color : 'transparent',
            } : undefined}
          />
        </div>
      )}
    </div>
  )
}

Tooltip.displayName = 'Tooltip'

export default Tooltip
