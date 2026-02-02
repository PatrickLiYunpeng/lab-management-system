import {
  type ReactNode,
  type FormEvent,
  type ReactElement,
  cloneElement,
  isValidElement,
  Children,
  useContext,
} from 'react'
import { cn } from '../index'
import {
  FormContext,
  FieldContext,
  type FormInstance,
  type FormRule,
  type FieldContextValue,
} from './useForm'

/**
 * Form 布局类型
 */
export type FormLayout = 'horizontal' | 'vertical' | 'inline'

/**
 * Form 组件属性接口
 */
export interface FormProps {
  /** 表单实例 */
  form: FormInstance
  /** 子元素 */
  children?: ReactNode
  /** 表单布局 */
  layout?: FormLayout
  /** label 列配置（horizontal 布局有效） */
  labelCol?: { span?: number }
  /** 输入控件列配置（horizontal 布局有效） */
  wrapperCol?: { span?: number }
  /** 提交表单回调 */
  onFinish?: (values: Record<string, unknown>) => void
  /** 提交失败回调 */
  onFinishFailed?: (errorInfo: { errorFields: Array<{ name: string; errors: string[] }> }) => void
  /** 自定义类名 */
  className?: string
  /** 是否禁用所有表单项 */
  disabled?: boolean
}

/**
 * Form 表单组件
 * 
 * 表单容器组件，提供表单上下文和布局功能。
 * 
 * @example
 * const [form] = useForm()
 * 
 * <Form form={form} layout="vertical" onFinish={handleSubmit}>
 *   <FormItem name="name" label="姓名" rules={[{ required: true }]}>
 *     <Input />
 *   </FormItem>
 *   <Button type="submit">提交</Button>
 * </Form>
 */
export function Form({
  form,
  children,
  layout = 'vertical',
  labelCol,
  wrapperCol,
  onFinish,
  onFinishFailed,
  className,
  disabled,
}: FormProps) {
  // 处理表单提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    try {
      const values = await form.validateFields()
      onFinish?.(values)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        onFinishFailed?.(error as { errorFields: Array<{ name: string; errors: string[] }> })
      }
    }
  }

  return (
    <FormContext.Provider
      value={{
        form: form as FormInstance,
        layout,
        labelCol,
        wrapperCol,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          // 布局样式
          layout === 'inline' && 'flex flex-wrap gap-4 items-start',
          layout === 'vertical' && 'space-y-4',
          // 禁用样式
          disabled && 'opacity-60 pointer-events-none',
          className
        )}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

Form.displayName = 'Form'

/**
 * FormItem 组件属性接口
 */
export interface FormItemProps {
  /** 字段名 */
  name?: string
  /** 标签文本 */
  label?: ReactNode
  /** 验证规则 */
  rules?: FormRule[]
  /** 子元素 */
  children?: ReactNode
  /** 是否必填（仅用于显示 * 标记） */
  required?: boolean
  /** label 列配置 */
  labelCol?: { span?: number }
  /** 输入控件列配置 */
  wrapperCol?: { span?: number }
  /** 自定义类名 */
  className?: string
  /** 提示信息 */
  tooltip?: ReactNode
  /** 额外的提示信息 */
  extra?: ReactNode
  /** 值属性名（默认 value） */
  valuePropName?: string
  /** 触发事件名（默认 onChange） */
  trigger?: string
  /** 验证触发时机 */
  validateTrigger?: string | string[]
  /** 是否隐藏 */
  hidden?: boolean
  /** 是否不保留字段值 */
  noStyle?: boolean
}

/**
 * FormItem 表单项组件
 * 
 * 表单项容器，处理字段的值绑定、验证和错误显示。
 * 
 * @example
 * <FormItem name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
 *   <Input />
 * </FormItem>
 */
export function FormItem({
  name,
  label,
  rules = [],
  children,
  required,
  labelCol,
  wrapperCol,
  className,
  tooltip,
  extra,
  valuePropName = 'value',
  trigger = 'onChange',
  validateTrigger = 'onBlur',
  hidden,
  noStyle,
}: FormItemProps) {
  // 获取表单上下文
  const formContext = useContext(FormContext)

  // 如果没有 name，只渲染布局
  if (!name || !formContext) {
    if (noStyle) return <>{children}</>
    
    return (
      <div className={cn('form-item', hidden && 'hidden', className)}>
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        <div>{children}</div>
        {extra && <div className="mt-1 text-xs text-neutral-500">{extra}</div>}
      </div>
    )
  }

  const { form, layout } = formContext
  const effectiveLabelCol = labelCol ?? formContext.labelCol
  const effectiveWrapperCol = wrapperCol ?? formContext.wrapperCol

  // 获取字段状态
  const value = form.getFieldValue(name as never)
  const errors = form.getFieldError(name as never)
  const touched = form.isFieldTouched(name as never)

  // 判断是否必填
  const isRequired = required ?? rules.some((rule) => rule.required)

  // 是否显示错误
  const showError = errors.length > 0 && touched

  // 构建字段上下文
  const fieldContextValue: FieldContextValue = {
    name,
    value,
    error: errors,
    touched,
    onChange: (newValue: unknown) => {
      form.setFieldValue(name as never, newValue)
    },
    onBlur: () => {
      form.setFieldTouched(name as never, true)
      form.validateField(name as never).catch(() => {})
    },
  }

  // 克隆子元素并注入属性
  const renderChildren = () => {
    if (!isValidElement(children)) {
      return children
    }

    const child = Children.only(children) as ReactElement<Record<string, unknown>>
    const childProps = child.props as Record<string, unknown>

    // 构建注入的属性
    const injectedProps: Record<string, unknown> = {
      [valuePropName]: value,
      [trigger]: (newValue: unknown) => {
        // 处理事件对象
        const finalValue =
          newValue && typeof newValue === 'object' && 'target' in newValue
            ? (newValue as { target: { value: unknown } }).target.value
            : newValue

        form.setFieldValue(name as never, finalValue)

        // 调用原有的 onChange
        const originalHandler = childProps[trigger]
        if (typeof originalHandler === 'function') {
          originalHandler(newValue)
        }
      },
    }

    // 添加验证触发
    const triggers = Array.isArray(validateTrigger) ? validateTrigger : [validateTrigger]
    triggers.forEach((t) => {
      if (t === trigger) return // 已在上面处理
      
      injectedProps[t] = () => {
        form.setFieldTouched(name as never, true)
        form.validateField(name as never).catch(() => {})

        // 调用原有的处理器
        const originalHandler = childProps[t]
        if (typeof originalHandler === 'function') {
          originalHandler()
        }
      }
    })

    // 添加错误状态
    if (showError) {
      injectedProps.error = true
      injectedProps['aria-invalid'] = true
      injectedProps['aria-describedby'] = `${name}-error`
    }

    return cloneElement(child, injectedProps)
  }

  // noStyle 模式
  if (noStyle) {
    return (
      <FieldContext.Provider value={fieldContextValue}>
        {renderChildren()}
      </FieldContext.Provider>
    )
  }

  // 水平布局
  if (layout === 'horizontal') {
    const labelSpan = effectiveLabelCol?.span ?? 6
    const wrapperSpan = effectiveWrapperCol?.span ?? 18

    return (
      <FieldContext.Provider value={fieldContextValue}>
        <div
          className={cn(
            'form-item grid grid-cols-24 gap-2 items-start',
            hidden && 'hidden',
            className
          )}
        >
          {/* Label */}
          <div
            className="text-right"
            style={{ gridColumn: `span ${labelSpan}` }}
          >
            {label && (
              <label
                htmlFor={name}
                className={cn(
                  'inline-block text-sm font-medium text-neutral-700 pt-1.5',
                  isRequired && "after:content-['*'] after:ml-0.5 after:text-error-500"
                )}
              >
                {label}
                {tooltip && (
                  <span className="ml-1 text-neutral-400 cursor-help">ⓘ</span>
                )}
              </label>
            )}
          </div>

          {/* Control */}
          <div style={{ gridColumn: `span ${wrapperSpan}` }}>
            {renderChildren()}
            {showError && (
              <div
                id={`${name}-error`}
                className="mt-1 text-xs text-error-500"
                role="alert"
              >
                {errors[0]}
              </div>
            )}
            {extra && <div className="mt-1 text-xs text-neutral-500">{extra}</div>}
          </div>
        </div>
      </FieldContext.Provider>
    )
  }

  // 垂直布局（默认）
  return (
    <FieldContext.Provider value={fieldContextValue}>
      <div className={cn('form-item', hidden && 'hidden', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={name}
            className={cn(
              'block text-sm font-medium text-neutral-700 mb-1',
              isRequired && "after:content-['*'] after:ml-0.5 after:text-error-500"
            )}
          >
            {label}
            {tooltip && (
              <span className="ml-1 text-neutral-400 cursor-help">ⓘ</span>
            )}
          </label>
        )}

        {/* Control */}
        {renderChildren()}

        {/* Error */}
        {showError && (
          <div
            id={`${name}-error`}
            className="mt-1 text-xs text-error-500"
            role="alert"
          >
            {errors[0]}
          </div>
        )}

        {/* Extra */}
        {extra && <div className="mt-1 text-xs text-neutral-500">{extra}</div>}
      </div>
    </FieldContext.Provider>
  )
}

FormItem.displayName = 'FormItem'

/**
 * FormLabel 组件
 */
export interface FormLabelProps {
  children: ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
}

export function FormLabel({ children, required, htmlFor, className }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium text-neutral-700 mb-1',
        required && "after:content-['*'] after:ml-0.5 after:text-error-500",
        className
      )}
    >
      {children}
    </label>
  )
}

FormLabel.displayName = 'FormLabel'

/**
 * FormError 组件
 */
export interface FormErrorProps {
  children?: ReactNode
  className?: string
}

export function FormError({ children, className }: FormErrorProps) {
  if (!children) return null
  
  return (
    <div className={cn('mt-1 text-xs text-error-500', className)} role="alert">
      {children}
    </div>
  )
}

FormError.displayName = 'FormError'

/**
 * FormDescription 组件
 */
export interface FormDescriptionProps {
  children: ReactNode
  className?: string
}

export function FormDescription({ children, className }: FormDescriptionProps) {
  return (
    <div className={cn('mt-1 text-xs text-neutral-500', className)}>
      {children}
    </div>
  )
}

FormDescription.displayName = 'FormDescription'

export default Form
