import { type ReactNode } from 'react'
import { cn } from '../../index'

/**
 * 进度条类型
 */
export type ProgressType = 'line' | 'circle'

/**
 * 进度条状态
 */
export type ProgressStatus = 'normal' | 'success' | 'exception' | 'active'

/**
 * 进度条尺寸
 */
export type ProgressSize = 'small' | 'default'

/**
 * Progress 组件属性接口
 */
export interface ProgressProps {
  /** 进度百分比 (0-100) */
  percent?: number
  /** 进度条类型：线形或环形 */
  type?: ProgressType
  /** 进度条状态 */
  status?: ProgressStatus
  /** 是否显示进度数值 */
  showInfo?: boolean
  /** 自定义格式化函数 */
  format?: (percent: number) => ReactNode
  /** 进度条颜色（自定义） */
  strokeColor?: string
  /** 进度条背景色 */
  trailColor?: string
  /** 线形进度条宽度 */
  strokeWidth?: number
  /** 环形进度条宽度 */
  width?: number
  /** 组件尺寸 */
  size?: ProgressSize
  /** 自定义类名 */
  className?: string
}

/**
 * 状态颜色映射
 */
const statusColors: Record<ProgressStatus, string> = {
  normal: 'bg-primary-500',
  success: 'bg-success-500',
  exception: 'bg-error-500',
  active: 'bg-primary-500',
}

/**
 * 状态文本颜色映射
 */
const statusTextColors: Record<ProgressStatus, string> = {
  normal: 'text-neutral-600',
  success: 'text-success-500',
  exception: 'text-error-500',
  active: 'text-primary-500',
}

/**
 * 圆环 SVG 颜色（stroke）
 */
const statusStrokeColors: Record<ProgressStatus, string> = {
  normal: '#1677ff',
  success: '#52c41a',
  exception: '#ff4d4f',
  active: '#1677ff',
}

/**
 * 默认格式化函数
 */
const defaultFormat = (percent: number): ReactNode => `${percent}%`

/**
 * 线形进度条组件
 */
function LineProgress({
  percent = 0,
  status = 'normal',
  showInfo = true,
  format = defaultFormat,
  strokeColor,
  trailColor,
  strokeWidth,
  size = 'default',
  className,
}: ProgressProps) {
  // 限制百分比范围
  const normalizedPercent = Math.min(100, Math.max(0, percent))
  
  // 根据进度自动判断状态
  const effectiveStatus = normalizedPercent >= 100 && status === 'normal' ? 'success' : status
  
  // 进度条高度
  const height = strokeWidth ?? (size === 'small' ? 6 : 8)
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 进度条轨道 */}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{
          height: `${height}px`,
          backgroundColor: trailColor ?? '#f5f5f5',
        }}
      >
        {/* 进度条填充 */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            !strokeColor && statusColors[effectiveStatus],
            // 活动状态动画
            effectiveStatus === 'active' && 'animate-progress-active'
          )}
          style={{
            width: `${normalizedPercent}%`,
            backgroundColor: strokeColor,
          }}
        />
      </div>
      
      {/* 进度信息 */}
      {showInfo && (
        <span
          className={cn(
            'text-sm min-w-[40px] text-right',
            statusTextColors[effectiveStatus]
          )}
        >
          {format(normalizedPercent)}
        </span>
      )}
    </div>
  )
}

/**
 * 环形进度条组件
 */
function CircleProgress({
  percent = 0,
  status = 'normal',
  showInfo = true,
  format = defaultFormat,
  strokeColor,
  trailColor = '#f5f5f5',
  strokeWidth = 6,
  width = 120,
  className,
}: ProgressProps) {
  // 限制百分比范围
  const normalizedPercent = Math.min(100, Math.max(0, percent))
  
  // 根据进度自动判断状态
  const effectiveStatus = normalizedPercent >= 100 && status === 'normal' ? 'success' : status
  
  // SVG 参数计算
  const radius = (width - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference
  
  // 获取描边颜色
  const strokeColorValue = strokeColor ?? statusStrokeColors[effectiveStatus]
  
  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width, height: width }}
    >
      <svg
        className="transform -rotate-90"
        width={width}
        height={width}
      >
        {/* 背景轨道 */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={trailColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度弧线 */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={strokeColorValue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* 中心文字 */}
      {showInfo && (
        <span
          className={cn(
            'absolute text-lg font-medium',
            statusTextColors[effectiveStatus]
          )}
        >
          {format(normalizedPercent)}
        </span>
      )}
    </div>
  )
}

/**
 * Progress 进度条组件
 * 
 * 展示操作的当前进度，支持线形和环形两种形态。
 * 
 * @example
 * // 基础线形进度条
 * <Progress percent={30} />
 * 
 * // 带状态的进度条
 * <Progress percent={70} status="active" />
 * <Progress percent={100} status="success" />
 * <Progress percent={50} status="exception" />
 * 
 * // 环形进度条
 * <Progress type="circle" percent={75} />
 * 
 * // 自定义格式
 * <Progress percent={100} format={(p) => p === 100 ? '完成' : `${p}%`} />
 */
export function Progress(props: ProgressProps) {
  const { type = 'line' } = props
  
  if (type === 'circle') {
    return <CircleProgress {...props} />
  }
  
  return <LineProgress {...props} />
}

Progress.displayName = 'Progress'

export default Progress
