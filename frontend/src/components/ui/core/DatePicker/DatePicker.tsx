import {
  useState,
  useRef,
  forwardRef,
  useMemo,
} from 'react'
import { Popover, Transition } from '@headlessui/react'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid'
import dayjs, { type Dayjs } from 'dayjs'
import { cn } from '../../index'

/**
 * DatePicker 选择器类型
 */
export type DatePickerType = 'date' | 'week' | 'month' | 'quarter' | 'year'

/**
 * DatePicker 尺寸类型
 */
export type DatePickerSize = 'small' | 'middle' | 'large'

/**
 * DatePicker 组件属性接口
 */
export interface DatePickerProps {
  /** 当前选中值 */
  value?: Dayjs | null
  /** 默认值 */
  defaultValue?: Dayjs | null
  /** 值变化回调 */
  onChange?: (date: Dayjs | null, dateString: string) => void
  /** 选择器类型 */
  picker?: DatePickerType
  /** 日期格式 */
  format?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否允许清除 */
  allowClear?: boolean
  /** 占位文本 */
  placeholder?: string
  /** 尺寸 */
  size?: DatePickerSize
  /** 是否有边框 */
  bordered?: boolean
  /** 自定义类名 */
  className?: string
  /** 弹出框类名 */
  popupClassName?: string
  /** 不可选择的日期 */
  disabledDate?: (current: Dayjs) => boolean
  /** 是否显示今天按钮 */
  showToday?: boolean
  /** 是否有错误状态 */
  error?: boolean
  /** 只读模式 */
  inputReadOnly?: boolean
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<DatePickerSize, string> = {
  small: 'h-6 text-xs px-2',
  middle: 'h-8 text-sm px-3',
  large: 'h-10 text-base px-4',
}

/**
 * 默认格式映射
 */
const defaultFormats: Record<DatePickerType, string> = {
  date: 'YYYY-MM-DD',
  week: 'YYYY-wo',
  month: 'YYYY-MM',
  quarter: 'YYYY-[Q]Q',
  year: 'YYYY',
}

/**
 * 星期名称
 */
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 月份名称
 */
const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

/**
 * 生成日历数据
 */
function generateCalendarDays(year: number, month: number): Array<{ date: Dayjs; isCurrentMonth: boolean }> {
  const firstDay = dayjs().year(year).month(month).startOf('month')
  const lastDay = dayjs().year(year).month(month).endOf('month')
  
  const days: Array<{ date: Dayjs; isCurrentMonth: boolean }> = []
  
  // 补充上个月的日期
  const firstDayOfWeek = firstDay.day()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: firstDay.subtract(i + 1, 'day'),
      isCurrentMonth: false,
    })
  }
  
  // 当月日期
  const daysInMonth = lastDay.date()
  for (let i = 0; i < daysInMonth; i++) {
    days.push({
      date: firstDay.add(i, 'day'),
      isCurrentMonth: true,
    })
  }
  
  // 补充下个月的日期（补满 6 行 42 天）
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: lastDay.add(i, 'day'),
      isCurrentMonth: false,
    })
  }
  
  return days
}

/**
 * DatePicker 日期选择器组件
 * 
 * 日期选择组件，支持日期、周、月、季度、年等多种选择模式。
 * 
 * @example
 * // 基础用法
 * <DatePicker value={date} onChange={setDate} />
 * 
 * // 月份选择
 * <DatePicker picker="month" format="YYYY年MM月" />
 * 
 * // 禁用特定日期
 * <DatePicker disabledDate={(current) => current.isBefore(dayjs(), 'day')} />
 */
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      picker = 'date',
      format,
      disabled = false,
      allowClear = true,
      placeholder,
      size = 'middle',
      bordered = true,
      className,
      popupClassName,
      disabledDate,
      showToday = true,
      error = false,
      inputReadOnly = false,
    },
    ref
  ) => {
    // 内部值状态
    const [internalValue, setInternalValue] = useState<Dayjs | null>(defaultValue ?? null)
    
    // 面板显示的年月（支持用户导航时的覆盖）
    const [panelYearOverride, setPanelYearOverride] = useState<number | null>(null)
    const [panelMonthOverride, setPanelMonthOverride] = useState<number | null>(null)
    
    // 面板模式（用于月/年选择器）
    const [panelMode, setPanelMode] = useState<'date' | 'month' | 'year'>('date')
    
    // 输入框引用
    const inputRef = useRef<HTMLInputElement>(null)

    // 当前值
    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    
    // 计算面板年月（优先使用覆盖值，否则根据当前值或默认值）
    const baseDate = currentValue ?? defaultValue ?? dayjs()
    const panelYear = panelYearOverride ?? baseDate.year()
    const panelMonth = panelMonthOverride ?? baseDate.month()
    
    // 包装 setter 函数（支持函数式更新）
    const setPanelYear = (yearOrUpdater: number | ((prev: number) => number)) => {
      if (typeof yearOrUpdater === 'function') {
        setPanelYearOverride((prev) => yearOrUpdater(prev ?? baseDate.year()))
      } else {
        setPanelYearOverride(yearOrUpdater)
      }
    }
    const setPanelMonth = (monthOrUpdater: number | ((prev: number) => number)) => {
      if (typeof monthOrUpdater === 'function') {
        setPanelMonthOverride((prev) => monthOrUpdater(prev ?? baseDate.month()))
      } else {
        setPanelMonthOverride(monthOrUpdater)
      }
    }
    
    // 日期格式
    const dateFormat = format ?? defaultFormats[picker]
    
    // 显示文本
    const displayText = currentValue ? currentValue.format(dateFormat) : ''
    
    // 占位符
    const effectivePlaceholder = placeholder ?? `请选择${picker === 'date' ? '日期' : picker === 'month' ? '月份' : picker === 'year' ? '年份' : '日期'}`

    // 日历数据
    const calendarDays = useMemo(
      () => generateCalendarDays(panelYear, panelMonth),
      [panelYear, panelMonth]
    )

    // 处理日期选择
    const handleSelectDate = (date: Dayjs, close: () => void) => {
      if (disabledDate?.(date)) return
      
      const newValue = date
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onChange?.(newValue, newValue.format(dateFormat))
      close()
    }

    // 处理月份选择
    const handleSelectMonth = (month: number, close?: () => void) => {
      if (picker === 'month') {
        const newValue = dayjs().year(panelYear).month(month)
        if (controlledValue === undefined) {
          setInternalValue(newValue)
        }
        onChange?.(newValue, newValue.format(dateFormat))
        close?.()
      } else {
        setPanelMonth(month)
        setPanelMode('date')
      }
    }

    // 处理年份选择
    const handleSelectYear = (year: number, close?: () => void) => {
      if (picker === 'year') {
        const newValue = dayjs().year(year)
        if (controlledValue === undefined) {
          setInternalValue(newValue)
        }
        onChange?.(newValue, newValue.format(dateFormat))
        close?.()
      } else {
        setPanelYear(year)
        setPanelMode(picker === 'month' ? 'month' : 'date')
      }
    }

    // 处理清除
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (controlledValue === undefined) {
        setInternalValue(null)
      }
      onChange?.(null, '')
    }

    // 渲染日期面板
    const renderDatePanel = (close: () => void) => (
      <div className="p-3">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelYear((y) => y - 1)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPanelMonth((m) => (m === 0 ? (setPanelYear((y) => y - 1), 11) : m - 1))}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-medium">
            <button
              onClick={() => setPanelMode('year')}
              className="hover:text-primary-500"
            >
              {panelYear}年
            </button>
            <button
              onClick={() => setPanelMode('month')}
              className="hover:text-primary-500"
            >
              {panelMonth + 1}月
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelMonth((m) => (m === 11 ? (setPanelYear((y) => y + 1), 0) : m + 1))}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPanelYear((y) => y + 1)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs text-neutral-500 font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const isToday = date.isSame(dayjs(), 'day')
            const isSelected = currentValue?.isSame(date, 'day')
            const isDisabled = disabledDate?.(date)

            return (
              <button
                key={index}
                onClick={() => !isDisabled && handleSelectDate(date, close)}
                disabled={isDisabled}
                className={cn(
                  'h-8 flex items-center justify-center text-sm rounded transition-colors',
                  !isCurrentMonth && 'text-neutral-300',
                  isCurrentMonth && !isSelected && !isToday && 'text-neutral-700 hover:bg-primary-50',
                  isToday && !isSelected && 'border border-primary-500 text-primary-500',
                  isSelected && 'bg-primary-500 text-white',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {date.date()}
              </button>
            )
          })}
        </div>

        {/* 今天按钮 */}
        {showToday && (
          <div className="mt-2 pt-2 border-t border-neutral-100">
            <button
              onClick={() => handleSelectDate(dayjs(), close)}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              今天
            </button>
          </div>
        )}
      </div>
    )

    // 渲染月份面板
    const renderMonthPanel = (close: () => void) => (
      <div className="p-3">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setPanelYear((y) => y - 1)}
            className="p-1 hover:bg-neutral-100 rounded"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setPanelMode('year')}
            className="text-sm font-medium hover:text-primary-500"
          >
            {panelYear}年
          </button>
          
          <button
            onClick={() => setPanelYear((y) => y + 1)}
            className="p-1 hover:bg-neutral-100 rounded"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 月份格子 */}
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((name, index) => {
            const isSelected = currentValue?.year() === panelYear && currentValue?.month() === index

            return (
              <button
                key={index}
                onClick={() => handleSelectMonth(index, close)}
                className={cn(
                  'py-2 text-sm rounded transition-colors',
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-primary-50 text-neutral-700'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    )

    // 渲染年份面板
    const renderYearPanel = (close: () => void) => {
      const startYear = Math.floor(panelYear / 10) * 10 - 1
      const years = Array.from({ length: 12 }, (_, i) => startYear + i)

      return (
        <div className="p-3">
          {/* 头部导航 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPanelYear((y) => y - 10)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-medium">
              {startYear + 1} - {startYear + 10}
            </span>
            
            <button
              onClick={() => setPanelYear((y) => y + 10)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 年份格子 */}
          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => {
              const isSelected = currentValue?.year() === year
              const isOutOfRange = year === startYear || year === startYear + 11

              return (
                <button
                  key={year}
                  onClick={() => handleSelectYear(year, close)}
                  className={cn(
                    'py-2 text-sm rounded transition-colors',
                    isOutOfRange && 'text-neutral-300',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : !isOutOfRange && 'hover:bg-primary-50 text-neutral-700'
                  )}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    // 渲染面板
    const renderPanel = (close: () => void) => {
      if (picker === 'year' || panelMode === 'year') {
        return renderYearPanel(close)
      }
      if (picker === 'month' || panelMode === 'month') {
        return renderMonthPanel(close)
      }
      return renderDatePanel(close)
    }

    return (
      <Popover className="relative" ref={ref}>
        {({ open, close }) => (
          <>
            <Popover.Button
              as="div"
              className={cn(
                'relative flex items-center cursor-pointer',
                'rounded-md bg-white',
                bordered && 'border',
                'transition-colors duration-200',
                // 正常状态
                !error && bordered && 'border-neutral-300',
                !error && 'focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-500',
                // 错误状态
                error && bordered && 'border-error-500',
                error && 'focus-within:ring-2 focus-within:ring-error-500/30',
                // 打开状态
                open && !error && bordered && 'border-primary-500 ring-2 ring-primary-500/30',
                // 禁用状态
                disabled && 'bg-neutral-50 cursor-not-allowed opacity-60',
                // 尺寸
                sizeStyles[size],
                className
              )}
            >
              <input
                ref={inputRef}
                type="text"
                value={displayText}
                placeholder={effectivePlaceholder}
                disabled={disabled}
                readOnly={inputReadOnly}
                onChange={(e) => {
                  if (!inputReadOnly) {
                    const parsed = dayjs(e.target.value, dateFormat)
                    if (parsed.isValid()) {
                      if (controlledValue === undefined) {
                        setInternalValue(parsed)
                      }
                      onChange?.(parsed, e.target.value)
                    }
                  }
                }}
                className={cn(
                  'flex-1 bg-transparent border-none outline-none',
                  'placeholder:text-neutral-400',
                  'disabled:cursor-not-allowed'
                )}
              />
              
              {/* 清除按钮 */}
              {allowClear && currentValue && !disabled && (
                <button
                  onClick={handleClear}
                  className="p-0.5 mr-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
              
              {/* 日历图标 */}
              <CalendarIcon className="w-4 h-4 text-neutral-400" />
            </Popover.Button>

            <Transition
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Popover.Panel
                className={cn(
                  'absolute z-50 mt-1',
                  'bg-white rounded-lg shadow-lg ring-1 ring-black/5',
                  'min-w-[280px]',
                  popupClassName
                )}
              >
                {renderPanel(close)}
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export default DatePicker
