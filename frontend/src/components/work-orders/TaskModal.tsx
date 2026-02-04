import { useEffect, useState } from 'react';
import { workOrderService } from '../../services/workOrderService';
import { equipmentService } from '../../services/equipmentService';
import { methodService } from '../../services/methodService';
import type { WorkOrderTask, TaskFormData, TaskUpdateData, Equipment, Method, MethodType, TaskStatus } from '../../types';
import { Modal, Form, Input, Select, InputNumber, Alert, Row, Col, Button, App } from 'antd';
import { ConsumptionEditor } from './ConsumptionEditor';

const { TextArea } = Input;

interface TaskModalProps {
  visible: boolean;
  workOrderId: number;
  task: WorkOrderTask | null;
  laboratoryId?: number;
  siteId?: number;
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
  siteId,
  workOrderType,
  onSuccess,
  onCancel,
}: TaskModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TaskFormValues>();
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
      // Load equipment for the dropdown (filter by site and/or laboratory)
      const equipParams: { laboratory_id?: number; site_id?: number; page_size: number } = { page_size: 100 };
      if (siteId) equipParams.site_id = siteId;
      if (laboratoryId) equipParams.laboratory_id = laboratoryId;
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
  }, [visible, task, laboratoryId, siteId, workOrderType, form]);

  const handleMethodChange = (value: number) => {
    if (value) {
      const selectedMethod = methods.find(m => m.id === value);
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

  const handleEquipmentChange = async (value: number) => {
    if (!value) {
      setCapacityInfo(null);
      return;
    }
    
    setLoadingCapacity(true);
    try {
      const capacity = await equipmentService.getEquipmentCapacity(value);
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
      const values = await form.validateFields();
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
        message.success('任务更新成功');
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
        message.success('任务创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(task ? '更新失败' : '创建失败');
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
      width={700}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>确定</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        {!task && (
          <>
            <Form.Item 
              name="method_id" 
              label="分析/测试方法"
            >
              <Select
                placeholder="选择标准方法（可选）"
                allowClear
                onChange={handleMethodChange}
                optionFilterProp="label"
                options={methods.map((m) => ({
                  label: `${m.name} (${m.code}) - ${m.standard_cycle_hours || '?'}h`,
                  value: m.id,
                }))}
              />
            </Form.Item>
            <p style={{ fontSize: 12, color: '#999', marginTop: -8, marginBottom: 12 }}>选择标准方法可自动填充周期时间和设备</p>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '16px 0' }} />
          </>
        )}

        <Form.Item
          name="title"
          label="任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="请输入任务名称" />
        </Form.Item>

        <Form.Item name="description" label="任务描述">
          <TextArea rows={3} placeholder="请输入任务描述" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sequence" label="执行顺序">
              <InputNumber min={1} placeholder="执行顺序" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="standard_cycle_hours" label="预计周期(小时)">
              <InputNumber
                min={0.1}
                step={0.5}
                placeholder="预计周期"
                disabled={!!task}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="required_equipment_id" label="所需设备">
          <Select
            placeholder="请选择所需设备"
            allowClear
            disabled={!!task}
            onChange={handleEquipmentChange}
            optionFilterProp="label"
            options={equipment.map((eq) => ({
              label: `${eq.name} (${eq.code})`,
              value: eq.id,
            }))}
          />
        </Form.Item>

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
                    <span style={{ color: '#ef4444', marginLeft: 8 }}>
                      (当前无可用容量)
                    </span>
                  )}
                </span>
              )
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {!task && (
          <Form.Item
            name="required_capacity"
            label="所需容量(样品槽位)"
          >
            <InputNumber
              min={1}
              placeholder="输入所需槽位数"
              disabled={!formValues.required_equipment_id}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {task && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label="状态">
                  <Select placeholder="请选择状态" options={statusOptions} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="备注">
              <TextArea rows={2} placeholder="请输入备注" />
            </Form.Item>
          </>
        )}
      </Form>

      {/* Material Consumption Editor - only show in edit mode */}
      {task && (
        <ConsumptionEditor
          workOrderId={workOrderId}
          taskId={task.id}
          taskNumber={task.task_number}
        />
      )}
    </Modal>
  );
}
