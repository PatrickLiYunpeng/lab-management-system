/**
 * UI Component Library
 * 
 * This is the barrel export file for all custom UI components
 * built with Tailwind CSS and Headless UI.
 * 
 * Components will be exported here as they are implemented.
 */

// Utilities
export { cn } from '../../lib/utils/cn'

// Core Components (Phase 2) - COMPLETE
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './core/Button'
export { Input, Password, TextArea, InputNumber, type InputProps, type InputSize, type PasswordProps, type TextAreaProps, type TextAreaSize, type AutoSizeConfig, type InputNumberProps, type InputNumberSize } from './core/Input'
export { Select, type SelectProps, type SelectOption, type SelectSize } from './core/Select'
export { Switch, type SwitchProps, type SwitchSize } from './core/Switch'
export { Tag, type TagProps, type TagColor } from './core/Tag'
export { Badge, type BadgeProps, type BadgeStatus } from './core/Badge'
export { Progress, type ProgressProps, type ProgressType, type ProgressStatus, type ProgressSize } from './core/Progress'
export { Tooltip, type TooltipProps, type TooltipPlacement, type TooltipTrigger } from './core/Tooltip'
export { DatePicker, type DatePickerProps, type DatePickerType, type DatePickerSize } from './core/DatePicker'

// Feedback Components (Phase 2-3) - COMPLETE
export { Spin, type SpinProps, type SpinSize } from './feedback/Spin'
export { Alert, type AlertProps, type AlertType } from './feedback/Alert'
export { ToastProvider, useToast, toast, type ToastConfig, type ToastType, type ToastPlacement, type ToastProviderProps } from './feedback/Toast'

// Overlay Components (Phase 3) - COMPLETE
export { Modal, type ModalProps, type ModalSize } from './overlay/Modal'
export { Popconfirm, type PopconfirmProps, type PopconfirmPlacement } from './overlay/Popconfirm'
// export { Dropdown } from './overlay/Dropdown/Dropdown'
// export { Popover } from './overlay/Popover/Popover'

// Data Display Components (Phase 3) - IN PROGRESS
export { Table, type TableProps, type TableColumn, type TableSize, type TablePagination, type TableRowSelection, type TableExpandable } from './data-display/Table'
// export { Card } from './data-display/Card/Card'
// export { Descriptions } from './data-display/Descriptions/Descriptions'
// export { Empty } from './data-display/Empty/Empty'

// Form Components (Phase 3) - COMPLETE
export {
  useForm,
  useFormContext,
  useFieldContext,
  useFormField,
  FormContext,
  FieldContext,
  type FormInstance,
  type FormRule,
  type FieldError,
  type FormState,
  type UseFormOptions,
  type FormContextValue,
  type FieldContextValue,
  Form,
  FormItem,
  FormLabel,
  FormError,
  FormDescription,
  type FormProps,
  type FormItemProps,
  type FormLabelProps,
  type FormErrorProps,
  type FormDescriptionProps,
  type FormLayout,
} from './form'

// Layout Components (Phase 3-4)
// export { Layout, Header, Sider, Content, Footer } from './layout/Layout'
// export { Row } from './layout/Row/Row'
// export { Col } from './layout/Col/Col'
// export { Space } from './layout/Space/Space'
// export { Divider } from './layout/Divider/Divider'
// export { Tabs, TabPane } from './layout/Tabs'

// Navigation Components (Phase 4)
// export { Menu, MenuItem, SubMenu } from './navigation/Menu'
