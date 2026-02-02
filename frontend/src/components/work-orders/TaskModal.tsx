import { useEffect, useState } from 'react';
import { workOrderService } from '../../services/workOrderService';
import { equipmentService } from '../../services/equipmentService';
import { methodService } from '../../services/methodService';
import type { WorkOrderTask, TaskFormData, TaskUpdateData, Equipment, Method, MethodType, TaskStatus } from '../../types';
import {
  Button,
  Input,
  TextArea,
  Select,
  InputNumber,
  Modal,
  Alert,
  useToast,
  useForm,
  Form,
  FormItem,
  type FormInstance,
} from '../ui';

interface TaskModalProps {
  visible: boolean;
  workOrderId: number;
  task: WorkOrderTask | null;
  laboratoryId?: number;
  workOrderType?: 'failure_analysis' | 'reliability_test';
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '已分配', value: 'assigned' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '阻塞', value: 'blocked' },
  { label: '已取消', value: 'cancelled' },
];

interface TaskFormValues {
  title?: string;
  description?: string;
  sequence?: number;
  method_id?: number;
  status?: TaskStatus;
  notes?: string;
  required_equipment_id?: number;
  required_capacity?: number;
  standard_cycle_hours?: number;
}

export function TaskModal({
  visible,
  workOrderId,
  task,
  laboratoryId,
  workOrderType,
  onSuccess,
  onCancel,
}: TaskModalProps) {
  const toast = useToast();
  const [form] = useForm();
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [capacityInfo, setCapacityInfo] = useState<{
    total: number;
    available: number;
    hasLimit: boolean;
  } | null>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  useEffect(() => {
    if (visible) {
      // Load equipment for the dropdown (filter by laboratory if provided)
      const equipParams = laboratoryId ? { laboratory_id: laboratoryId, page_size: 100 } : { page_size: 100 };
      equipmentService.getEquipment(equipParams).then((res) => {
        setEquipment(res.items.filter((eq) => eq.is_active));
      });

      // Load methods (filter by type if work order type is known)
      const methodType: MethodType | undefined = workOrderType === 'failure_analysis' ? 'analysis' : 
                        workOrderType === 'reliability_test' ? 'reliability' : undefined;
      const methodParams = {
        page_size: 100,
        is_active: true,
        ...(methodType && { method_type: methodType }),
        ...(laboratoryId && { laboratory_id: laboratoryId }),
      };
      methodService.getMethods(methodParams).then((res) => {
        setMethods(res.items);
      });

      if (task) {
        form.setFieldsValue({
          title: task.title,
          description: task.description,
          sequence: task.sequence,
          method_id: task.method_id,
          required_equipment_id: task.required_equipment_id,
          required_capacity: task.required_capacity,
          standard_cycle_hours: task.standard_cycle_hours,
          status: task.status,
          notes: task.notes,
        });
      } else {
        form.resetFields();
        setCapacityInfo(null);
      }
    }
  }, [visible, task, laboratoryId, workOrderType, form]);

  const handleMethodChange = (value: string | number | (string | number)[]) => {
    const methodId = Array.isArray(value) ? value[0] : value;
    if (methodId) {
      const selectedMethod = methods.find(m => m.id === Number(methodId));
      if (selectedMethod) {
        // Auto-populate from method
        if (selectedMethod.standard_cycle_hours) {
          form.setFieldValue('standard_cycle_hours', selectedMethod.standard_cycle_hours);
        }
        if (selectedMethod.default_equipment?.id) {
          form.setFieldValue('required_equipment_id', selectedMethod.default_equipment.id);
          handleEquipmentChange(selectedMethod.default_equipment.id);
        }
        // Auto-fill title if empty
        const currentTitle = form.getFieldValue('title');
        if (!currentTitle) {
          form.setFieldValue('title', selectedMethod.name);
        }
      }
    }
  };

  const handleEquipmentChange = async (value: string | number | (string | number)[]) => {
    const equipmentId = Array.isArray(value) ? value[0] : value;
    if (!equipmentId) {
      setCapacityInfo(null);
      return;
    }
    
    setLoadingCapacity(true);
    try {
      const capacity = await equipmentService.getEquipmentCapacity(Number(equipmentId));
      if (capacity.has_capacity_limit) {
        setCapacityInfo({
          total: capacity.total_capacity || 0,
          available: capacity.available_capacity || 0,
          hasLimit: true
        });
      } else {
        setCapacityInfo({ total: 0, available: 0, hasLimit: false });
      }
    } catch (error) {
      console.error('Failed to load capacity info:', error);
      setCapacityInfo(null);
    } finally {
      setLoadingCapacity(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const errors = await form.validateFields();
      if (errors && Object.keys(errors).length > 0) {
        return;
      }
      
      const values = form.getFieldsValue() as TaskFormValues;
      setLoading(true);

      if (task) {
        const updateData: TaskUpdateData = {
          title: values.title || '',
          description: values.description || undefined,
          sequence: values.sequence,
          method_id: values.method_id || undefined,
          status: values.status,
          notes: values.notes || undefined,
        };
        await workOrderService.updateTask(workOrderId, task.id, updateData);
        toast.success('任务更新成功');
      } else {
        const createData: TaskFormData = {
          title: values.title || '',
          description: values.description || undefined,
          sequence: values.sequence,
          method_id: values.method_id || undefined,
          required_equipment_id: values.required_equipment_id || undefined,
          required_capacity: values.required_capacity || undefined,
          standard_cycle_hours: values.standard_cycle_hours || undefined,
        };
        await workOrderService.createTask(workOrderId, createData);
        toast.success('任务创建成功');
      }

      onSuccess();
    } catch {
      toast.error(task ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const formValues = form.getFieldsValue();

  return (
    <Modal
      title={task ? '编辑任务' : '新增任务'}
      open={visible}
      onCancel={onCancel}
      size="large"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="default" onClick={onCancel}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>确定</Button>
        </div>
      }
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        {!task && (
          <>
            <FormItem 
              name="method_id" 
              label="分析/测试方法"
            >
              <Select
                placeholder="选择标准方法（可选）"
                allowClear
                onChange={handleMethodChange}
                options={methods.map((m) => ({
                  label: `${m.name} (${m.code}) - ${m.standard_cycle_hours || '?'}h`,
                  value: m.id,
                }))}
              />
            </FormItem>
            <p className="text-xs text-neutral-500 -mt-2 mb-3">选择标准方法可自动填充周期时间和设备</p>
            <hr className="border-neutral-200 my-4" />
          </>
        )}

        <FormItem
          name="title"
          label="任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="请输入任务名称" />
        </FormItem>

        <FormItem name="description" label="任务描述">
          <TextArea rows={3} placeholder="请输入任务描述" />
        </FormItem>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="sequence" label="执行顺序">
            <InputNumber min={1} placeholder="执行顺序" />
          </FormItem>
          <FormItem name="standard_cycle_hours" label="标准周期(小时)">
            <InputNumber
              min={0.1}
              step={0.5}
              placeholder="标准周期"
              disabled={!!task}
            />
          </FormItem>
        </div>

        <FormItem name="required_equipment_id" label="所需设备">
          <Select
            placeholder="请选择所需设备"
            allowClear
            disabled={!!task}
            onChange={handleEquipmentChange}
            options={equipment.map((eq) => ({
              label: `${eq.name} (${eq.code})`,
              value: eq.id,
            }))}
          />
        </FormItem>

        {!task && capacityInfo?.hasLimit && (
          <Alert
            type={capacityInfo.available > 0 ? 'info' : 'warning'}
            message={
              loadingCapacity ? (
                '加载中...'
              ) : (
                <span>
                  可用容量: <strong>{capacityInfo.available}/{capacityInfo.total}</strong> 槽位
                  {capacityInfo.available === 0 && (
                    <span className="text-error-500 ml-2">
                      (当前无可用容量)
                    </span>
                  )}
                </span>
              )
            }
            className="mb-4"
          />
        )}

        {!task && (
          <FormItem
            name="required_capacity"
            label="所需容量(样品槽位)"
          >
            <InputNumber
              min={1}
              placeholder="输入所需槽位数"
              disabled={!formValues.required_equipment_id}
            />
          </FormItem>
        )}

        {task && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormItem name="status" label="状态">
                <Select placeholder="请选择状态" options={statusOptions} />
              </FormItem>
            </div>
            <FormItem name="notes" label="备注">
              <TextArea rows={2} placeholder="请输入备注" />
            </FormItem>
          </>
        )}
      </Form>
    </Modal>
  );
}
