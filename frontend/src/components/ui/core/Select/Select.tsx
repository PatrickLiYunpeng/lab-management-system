import { Fragment, useState, useMemo, forwardRef, type ReactNode } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { cn } from '../../index'

/**
 * 选项数据接口
 */
export interface SelectOption {
  /** 选项值 */
  value: string | number
  /** 选项显示文本 */
  label: ReactNode
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * Select 组件尺寸类型
 */
export type SelectSize = 'small' | 'middle' | 'large'

/**
 * Select 组件属性接口
 */
export interface SelectProps {
  /** 选项列表 */
  options: SelectOption[]
  /** 当前选中值（受控模式） */
  value?: string | number | (string | number)[]
  /** 默认选中值（非受控模式） */
  defaultValue?: string | number | (string | number)[]
  /** 值变化回调 */
  onChange?: (value: string | number | (string | number)[], option: SelectOption | SelectOption[]) => void
  /** 占位文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否允许清空 */
  allowClear?: boolean
  /** 是否支持搜索 */
  showSearch?: boolean
  /** 搜索过滤函数 */
  filterOption?: (inputValue: string, option: SelectOption) => boolean
  /** 组件尺寸 */
  size?: SelectSize
  /** 是否多选 */
  multiple?: boolean
  /** 自定义类名 */
  className?: string
  /** 下拉框类名 */
  dropdownClassName?: string
  /** 是否有错误状态 */
  error?: boolean
  /** 最大选择数量（多选时有效） */
  maxTagCount?: number
  /** 无数据时显示的内容 */
  notFoundContent?: ReactNode
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<SelectSize, string> = {
  small: 'h-6 text-xs px-2',
  middle: 'h-8 text-sm px-3',
  large: 'h-10 text-base px-4',
}

/**
 * 默认搜索过滤函数
 */
const defaultFilterOption = (inputValue: string, option: SelectOption): boolean => {
  const label = typeof option.label === 'string' ? option.label : String(option.value)
  return label.toLowerCase().includes(inputValue.toLowerCase())
}

/**
 * Select 选择器组件
 * 
 * 基于 Headless UI Listbox 实现的下拉选择器，支持单选、多选、搜索等功能。
 * 
 * @example
 * // 基础用法
 * <Select
 *   options={[
 *     { value: '1', label: '选项一' },
 *     { value: '2', label: '选项二' },
 *   ]}
 *   placeholder="请选择"
 * />
 * 
 * // 多选
 * <Select multiple options={options} />
 * 
 * // 支持搜索
 * <Select showSearch options={options} />
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = '请选择',
      disabled = false,
      allowClear = false,
      showSearch = false,
      filterOption = defaultFilterOption,
      size = 'middle',
      multiple = false,
      className,
      dropdownClassName,
      error = false,
      maxTagCount,
      notFoundContent = '暂无数据',
    },
    ref
  ) => {
    // 内部状态管理（非受控模式）
    const [internalValue, setInternalValue] = useState<string | number | (string | number)[]>(
      defaultValue ?? (multiple ? [] : '')
    )
    
    // 搜索关键词
    const [searchValue, setSearchValue] = useState('')
    
    // 判断是否为受控模式
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue

    // 过滤后的选项
    const filteredOptions = useMemo(() => {
      if (!showSearch || !searchValue) return options
      return options.filter((opt) => filterOption(searchValue, opt))
    }, [options, showSearch, searchValue, filterOption])

    // 获取选中的选项对象
    const getSelectedOption = (val: string | number): SelectOption | undefined => {
      return options.find((opt) => opt.value === val)
    }

    // 获取显示文本
    const getDisplayText = (): ReactNode => {
      if (multiple) {
        const values = Array.isArray(currentValue) ? currentValue : []
        if (values.length === 0) return null
        
        const selectedOptions = values
          .map(getSelectedOption)
          .filter(Boolean) as SelectOption[]
        
        // 限制显示数量
        if (maxTagCount !== undefined && selectedOptions.length > maxTagCount) {
          const visibleOptions = selectedOptions.slice(0, maxTagCount)
          const restCount = selectedOptions.length - maxTagCount
          return (
            <div className="flex flex-wrap gap-1">
              {visibleOptions.map((opt) => (
                <span
                  key={String(opt.value)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 rounded text-xs"
                >
                  {opt.label}
                </span>
              ))}
              <span className="inline-flex items-center px-1.5 py-0.5 bg-neutral-100 rounded text-xs">
                +{restCount}...
              </span>
            </div>
          )
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((opt) => (
              <span
                key={String(opt.value)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 rounded text-xs"
              >
                {opt.label}
              </span>
            ))}
          </div>
        )
      } else {
        const option = getSelectedOption(currentValue as string | number)
        return option?.label ?? null
      }
    }

    // 处理值变化
    const handleChange = (newValue: string | number | (string | number)[]) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      
      // 清空搜索
      setSearchValue('')
      
      // 调用回调
      if (onChange) {
        if (multiple) {
          const values = Array.isArray(newValue) ? newValue : [newValue]
          const selectedOptions = values
            .map(getSelectedOption)
            .filter(Boolean) as SelectOption[]
          onChange(newValue, selectedOptions)
        } else {
          const option = getSelectedOption(newValue as string | number)
          if (option) {
            onChange(newValue, option)
          }
        }
      }
    }

    // 处理清空
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      const emptyValue = multiple ? [] : ''
      handleChange(emptyValue as string | number | (string | number)[])
    }

    // 判断是否有值
    const hasValue = multiple
      ? Array.isArray(currentValue) && currentValue.length > 0
      : currentValue !== '' && currentValue !== undefined

    const displayText = getDisplayText()

    return (
      <div ref={ref} className={cn('relative', className)}>
        <Listbox
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          multiple={multiple}
        >
          {({ open }) => (
            <>
              <Listbox.Button
                className={cn(
                  'relative w-full rounded-md border bg-white text-left',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
                  'transition-colors duration-200',
                  sizeStyles[size],
                  // 错误状态
                  error
                    ? 'border-error-500 focus:ring-error-500/30 focus:border-error-500'
                    : 'border-neutral-300',
                  // 禁用状态
                  disabled && 'bg-neutral-50 cursor-not-allowed opacity-60',
                  // 打开状态
                  open && !error && 'border-primary-500 ring-2 ring-primary-500/30'
                )}
              >
                <span
                  className={cn(
                    'block truncate pr-8',
                    !displayText && 'text-neutral-400'
                  )}
                >
                  {displayText || placeholder}
                </span>
                
                {/* 清空按钮 */}
                {allowClear && hasValue && !disabled && (
                  <span
                    className="absolute inset-y-0 right-6 flex items-center cursor-pointer text-neutral-400 hover:text-neutral-600"
                    onClick={handleClear}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </span>
                )}
                
                {/* 下拉图标 */}
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronUpDownIcon
                    className={cn(
                      'h-5 w-5 text-neutral-400',
                      open && 'text-primary-500'
                    )}
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>

              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options
                  className={cn(
                    'absolute z-50 mt-1 w-full rounded-md bg-white',
                    'shadow-lg ring-1 ring-black/5',
                    'max-h-60 overflow-auto',
                    'focus:outline-none',
                    'py-1',
                    dropdownClassName
                  )}
                >
                  {/* 搜索框 */}
                  {showSearch && (
                    <div className="px-2 py-1.5 border-b border-neutral-100">
                      <input
                        type="text"
                        className={cn(
                          'w-full px-2 py-1 text-sm rounded border border-neutral-200',
                          'focus:outline-none focus:border-primary-500'
                        )}
                        placeholder="搜索..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  
                  {/* 选项列表 */}
                  {filteredOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                      {notFoundContent}
                    </div>
                  ) : (
                    filteredOptions.map((option) => (
                      <Listbox.Option
                        key={String(option.value)}
                        value={option.value}
                        disabled={option.disabled}
                        className={({ active, selected }) =>
                          cn(
                            'relative cursor-pointer select-none py-2 pl-3 pr-9',
                            'transition-colors duration-100',
                            active && 'bg-primary-50',
                            selected && 'bg-primary-50 text-primary-600',
                            option.disabled && 'cursor-not-allowed opacity-50'
                          )
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={cn(
                                'block truncate',
                                selected ? 'font-medium' : 'font-normal'
                              )}
                            >
                              {option.label}
                            </span>
                            
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))
                  )}
                </Listbox.Options>
              </Transition>
            </>
          )}
        </Listbox>
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
