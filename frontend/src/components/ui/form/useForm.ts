import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useMemo,
} from 'react'

/**
 * 表单验证规则
 */
export interface FormRule {
  /** 是否必填 */
  required?: boolean
  /** 必填提示信息 */
  message?: string
  /** 最小长度 */
  min?: number
  /** 最大长度 */
  max?: number
  /** 正则表达式 */
  pattern?: RegExp
  /** 类型验证 */
  type?: 'string' | 'number' | 'email' | 'url' | 'array'
  /** 自定义验证函数 */
  validator?: (value: unknown) => Promise<void> | void
  /** 异步验证器（返回错误消息或 undefined） */
  asyncValidator?: (value: unknown) => Promise<string | undefined>
}

/**
 * 字段错误信息
 */
export interface FieldError {
  name: string
  errors: string[]
}

/**
 * 表单状态
 */
export interface FormState {
  /** 表单值 */
  values: Record<string, unknown>
  /** 字段错误 */
  errors: Record<string, string[]>
  /** 字段触摸状态 */
  touched: Record<string, boolean>
  /** 是否正在提交 */
  isSubmitting: boolean
  /** 是否正在验证 */
  isValidating: boolean
  /** 表单是否有修改 */
  isDirty: boolean
  /** 表单是否有效 */
  isValid: boolean
}

/**
 * 表单实例接口
 * 兼容 Ant Design Form 实例 API
 */
export interface FormInstance<T = Record<string, unknown>> {
  /** 获取所有字段值 */
  getFieldsValue: () => T
  /** 获取单个字段值 */
  getFieldValue: (name: keyof T) => unknown
  /** 设置多个字段值 */
  setFieldsValue: (values: Partial<T>) => void
  /** 设置单个字段值 */
  setFieldValue: (name: keyof T, value: unknown) => void
  /** 验证所有字段 */
  validateFields: () => Promise<T>
  /** 验证指定字段 */
  validateField: (name: keyof T) => Promise<void>
  /** 重置表单 */
  resetFields: () => void
  /** 获取字段错误 */
  getFieldError: (name: keyof T) => string[]
  /** 获取所有字段错误 */
  getFieldsError: () => FieldError[]
  /** 设置字段错误 */
  setFieldError: (name: keyof T, errors: string[]) => void
  /** 判断字段是否被触摸 */
  isFieldTouched: (name: keyof T) => boolean
  /** 设置字段触摸状态 */
  setFieldTouched: (name: keyof T, touched?: boolean) => void
  /** 监听字段变化 */
  watch: (name: keyof T, callback: (value: unknown) => void) => () => void
  /** 获取表单状态 */
  getState: () => FormState
  /** 提交表单 */
  submit: () => Promise<void>
}

/**
 * useForm 配置选项
 */
export interface UseFormOptions<T = Record<string, unknown>> {
  /** 初始值 */
  initialValues?: Partial<T>
  /** 验证规则 */
  rules?: Partial<Record<keyof T, FormRule[]>>
  /** 提交处理函数 */
  onSubmit?: (values: T) => void | Promise<void>
  /** 值变化回调 */
  onValuesChange?: (changedValues: Partial<T>, allValues: T) => void
  /** 验证失败回调 */
  onValidationFailed?: (errors: FieldError[]) => void
}

/**
 * 内部验证函数
 */
function validateValue(value: unknown, rules: FormRule[]): string[] {
  const errors: string[] = []
  
  for (const rule of rules) {
    // 必填验证
    if (rule.required) {
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      
      if (isEmpty) {
        errors.push(rule.message || '此字段为必填项')
        continue
      }
    }

    // 如果值为空且非必填，跳过其他验证
    if (value === undefined || value === null || value === '') {
      continue
    }

    // 类型验证
    if (rule.type) {
      let isValid = true
      switch (rule.type) {
        case 'email':
          isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
          break
        case 'url':
          try {
            new URL(String(value))
          } catch {
            isValid = false
          }
          break
        case 'number':
          isValid = !isNaN(Number(value))
          break
        case 'array':
          isValid = Array.isArray(value)
          break
      }
      if (!isValid) {
        errors.push(rule.message || `请输入有效的${rule.type}`)
      }
    }

    // 长度验证
    if (rule.min !== undefined) {
      const len = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0
      if (len < rule.min) {
        errors.push(rule.message || `长度不能少于 ${rule.min}`)
      }
    }
    
    if (rule.max !== undefined) {
      const len = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0
      if (len > rule.max) {
        errors.push(rule.message || `长度不能超过 ${rule.max}`)
      }
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors.push(rule.message || '格式不正确')
    }

    // 自定义验证
    if (rule.validator) {
      try {
        rule.validator(value)
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }
  }

  return errors
}

/**
 * useForm Hook
 * 
 * 提供表单状态管理和验证功能，API 设计兼容 Ant Design Form.useForm()
 * 
 * @example
 * const [form] = useForm({
 *   initialValues: { name: '', email: '' },
 *   rules: {
 *     name: [{ required: true, message: '请输入姓名' }],
 *     email: [{ required: true }, { type: 'email' }],
 *   },
 *   onSubmit: async (values) => {
 *     await api.save(values)
 *   },
 * })
 * 
 * // 在组件中使用
 * <Form form={form}>
 *   <FormItem name="name">
 *     <Input />
 *   </FormItem>
 * </Form>
 */
export function useForm<T = Record<string, unknown>>(
  options: UseFormOptions<T> = {}
): [FormInstance<T>] {
  const { initialValues = {}, rules = {}, onSubmit, onValuesChange, onValidationFailed } = options
  
  // Cast rules to allow string indexing
  const rulesMap = rules as Record<string, FormRule[]>

  // 表单值
  const [values, setValues] = useState<Record<string, unknown>>({ ...initialValues })
  
  // 错误状态
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  
  // 触摸状态
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 验证状态
  const [isValidating, setIsValidating] = useState(false)

  // 监听器
  const watchersRef = useRef<Map<string, Set<(value: unknown) => void>>>(new Map())
  
  // 初始值引用（用于重置）
  const initialValuesRef = useRef(initialValues)

  // 获取所有字段值
  const getFieldsValue = useCallback(() => {
    return values as T
  }, [values])

  // 获取单个字段值
  const getFieldValue = useCallback(
    (name: keyof T) => {
      return values[name as string]
    },
    [values]
  )

  // 设置多个字段值
  const setFieldsValue = useCallback(
    (newValues: Partial<T>) => {
      setValues((prev) => {
        const updated = { ...prev, ...newValues }
        
        // 触发监听器
        Object.keys(newValues).forEach((key) => {
          const watchers = watchersRef.current.get(key)
          if (watchers) {
            watchers.forEach((callback) => callback(newValues[key as keyof T]))
          }
        })
        
        // 调用值变化回调
        onValuesChange?.(newValues, updated as T)
        
        return updated
      })
    },
    [onValuesChange]
  )

  // 设置单个字段值
  const setFieldValue = useCallback(
    (name: keyof T, value: unknown) => {
      setFieldsValue({ [name]: value } as Partial<T>)
    },
    [setFieldsValue]
  )

  // 验证单个字段
  const validateField = useCallback(
    async (name: keyof T): Promise<void> => {
      const fieldRules = rulesMap[name as string] as FormRule[] | undefined
      if (!fieldRules) return

      const value = values[name as string]
      const fieldErrors = validateValue(value, fieldRules)

      // 处理异步验证
      for (const rule of fieldRules) {
        if (rule.asyncValidator) {
          setIsValidating(true)
          try {
            const error = await rule.asyncValidator(value)
            if (error) {
              fieldErrors.push(error)
            }
          } catch (e) {
            fieldErrors.push(e instanceof Error ? e.message : String(e))
          } finally {
            setIsValidating(false)
          }
        }
      }

      setErrors((prev) => ({
        ...prev,
        [name]: fieldErrors,
      }))

      if (fieldErrors.length > 0) {
        throw { errorFields: [{ name, errors: fieldErrors }] }
      }
    },
    [rulesMap, values]
  )

  // 验证所有字段
  const validateFields = useCallback(async (): Promise<T> => {
    setIsValidating(true)
    const allErrors: Record<string, string[]> = {}
    const errorFields: FieldError[] = []

    try {
      for (const name of Object.keys(rulesMap)) {
        const fieldRules = rulesMap[name] as FormRule[] | undefined
        if (!fieldRules) continue

        const value = values[name]
        const fieldErrors = validateValue(value, fieldRules)

        // 处理异步验证
        for (const rule of fieldRules) {
          if (rule.asyncValidator) {
            try {
              const error = await rule.asyncValidator(value)
              if (error) {
                fieldErrors.push(error)
              }
            } catch (e) {
              fieldErrors.push(e instanceof Error ? e.message : String(e))
            }
          }
        }

        allErrors[name] = fieldErrors
        if (fieldErrors.length > 0) {
          errorFields.push({ name, errors: fieldErrors })
        }
      }

      setErrors(allErrors)

      if (errorFields.length > 0) {
        onValidationFailed?.(errorFields)
        throw { errorFields }
      }

      return values as T
    } finally {
      setIsValidating(false)
    }
  }, [rulesMap, values, onValidationFailed])

  // 重置表单
  const resetFields = useCallback(() => {
    setValues({ ...initialValuesRef.current })
    setErrors({})
    setTouched({})
  }, [])

  // 获取字段错误
  const getFieldError = useCallback(
    (name: keyof T): string[] => {
      return errors[name as string] || []
    },
    [errors]
  )

  // 获取所有字段错误
  const getFieldsError = useCallback((): FieldError[] => {
    return Object.entries(errors)
      .filter(([, errs]) => errs.length > 0)
      .map(([name, errs]) => ({ name, errors: errs }))
  }, [errors])

  // 设置字段错误
  const setFieldError = useCallback((name: keyof T, fieldErrors: string[]) => {
    setErrors((prev) => ({
      ...prev,
      [name]: fieldErrors,
    }))
  }, [])

  // 判断字段是否被触摸
  const isFieldTouched = useCallback(
    (name: keyof T): boolean => {
      return touched[name as string] || false
    },
    [touched]
  )

  // 设置字段触摸状态
  const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }))
  }, [])

  // 监听字段变化
  const watch = useCallback(
    (name: keyof T, callback: (value: unknown) => void): (() => void) => {
      const key = name as string
      if (!watchersRef.current.has(key)) {
        watchersRef.current.set(key, new Set())
      }
      watchersRef.current.get(key)!.add(callback)

      // 返回取消监听函数
      return () => {
        watchersRef.current.get(key)?.delete(callback)
      }
    },
    []
  )

  // 获取表单状态
  const getState = useCallback((): FormState => {
    const hasErrors = Object.values(errors).some((errs) => errs.length > 0)
    const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current)

    return {
      values,
      errors,
      touched,
      isSubmitting,
      isValidating,
      isDirty,
      isValid: !hasErrors,
    }
  }, [values, errors, touched, isSubmitting, isValidating])

  // 提交表单
  const submit = useCallback(async () => {
    try {
      setIsSubmitting(true)
      const validatedValues = await validateFields()
      await onSubmit?.(validatedValues)
    } finally {
      setIsSubmitting(false)
    }
  }, [validateFields, onSubmit])

  // 创建表单实例
  const formInstance = useMemo<FormInstance<T>>(
    () => ({
      getFieldsValue,
      getFieldValue,
      setFieldsValue,
      setFieldValue,
      validateFields,
      validateField,
      resetFields,
      getFieldError,
      getFieldsError,
      setFieldError,
      isFieldTouched,
      setFieldTouched,
      watch,
      getState,
      submit,
    }),
    [
      getFieldsValue,
      getFieldValue,
      setFieldsValue,
      setFieldValue,
      validateFields,
      validateField,
      resetFields,
      getFieldError,
      getFieldsError,
      setFieldError,
      isFieldTouched,
      setFieldTouched,
      watch,
      getState,
      submit,
    ]
  )

  return [formInstance]
}

/**
 * 表单上下文
 */
export interface FormContextValue<T = Record<string, unknown>> {
  form: FormInstance<T>
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelCol?: { span?: number }
  wrapperCol?: { span?: number }
}

export const FormContext = createContext<FormContextValue | null>(null)

/**
 * 使用表单上下文
 */
export function useFormContext<T = Record<string, unknown>>() {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context as FormContextValue<T>
}

/**
 * 字段上下文
 */
export interface FieldContextValue {
  name: string
  value: unknown
  error: string[]
  touched: boolean
  onChange: (value: unknown) => void
  onBlur: () => void
}

export const FieldContext = createContext<FieldContextValue | null>(null)

/**
 * 使用字段上下文
 */
export function useFieldContext() {
  const context = useContext(FieldContext)
  return context
}

/**
 * useFormField Hook
 * 
 * 用于在 FormItem 外部连接表单字段
 * 
 * @example
 * const { value, onChange, error } = useFormField('email')
 */
export function useFormField(name: string) {
  const formContext = useFormContext()
  const { form } = formContext

  const value = form.getFieldValue(name as never)
  const error = form.getFieldError(name as never)
  const touched = form.isFieldTouched(name as never)

  const onChange = useCallback(
    (newValue: unknown) => {
      form.setFieldValue(name as never, newValue)
    },
    [form, name]
  )

  const onBlur = useCallback(() => {
    form.setFieldTouched(name as never, true)
    form.validateField(name as never).catch(() => {})
  }, [form, name])

  return {
    name,
    value,
    error,
    touched,
    onChange,
    onBlur,
  }
}

export default useForm
