import { useEffect, useState, useCallback } from 'react';
import { workOrderService } from '../../services/workOrderService';
import { equipmentService } from '../../services/equipmentService';
import { methodService } from '../../services/methodService';
import { materialService } from '../../services/materialService';
import type { WorkOrderTask, TaskFormData, TaskUpdateData, Equipment, Method, MethodType, TaskStatus, ConsumptionCreateItem } from '../../types';
import { Modal, Form, Input, Select, InputNumber, Alert, Row, Col, Button, App, Spin, Collapse, Divider, Checkbox } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { ConsumptionEditor } from './ConsumptionEditor';
import { CriticalEquipmentScheduler } from './CriticalEquipmentScheduler';
import { getEquipmentCategoriesForMethod } from '../../utils/categoryMapping';
import type { Dayjs } from 'dayjs';

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

interface MaterialOption {
  id: number;
  material_code: string;
  name: string;
  quantity: number;
  unit: string;
}

interface PendingConsumptionRow {
  key: string;
  material_id?: number;
  quantity_consumed?: number;
  unit_price?: number;
  notes?: string;
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
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [capacityInfo, setCapacityInfo] = useState<{
    total: number;
    available: number;
    hasLimit: boolean;
  } | null>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);
  
  // 关键设备调度状态
  const [isCriticalEquipment, setIsCriticalEquipment] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<{
    equipmentId: number;
    equipmentCode: string;
    startTime: Dayjs;
    endTime: Dayjs;
  } | null>(null);
  // 编辑模式下：是否要调整设备预约
  const [wantUpdateSchedule, setWantUpdateSchedule] = useState(false);
  // 编辑模式下：任务关联的设备名称 ID（用于显示调度器）
  const [taskEquipmentNameId, setTaskEquipmentNameId] = useState<number | null>(null);

  // 材料消耗状态（用于创建模式）
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [pendingConsumptions, setPendingConsumptions] = useState<PendingConsumptionRow[]>([]);

  // Debug: 监控 materials 状态变化
  useEffect(() => {
    console.log('TaskModal: materials state updated:', materials.length, 'items');
    if (materials.length > 0) {
      console.log('TaskModal: First 3 materials in state:', materials.slice(0, 3));
    }
  }, [materials]);

  // 根据方法分类加载匹配的设备
  const loadEquipmentForMethod = useCallback(async (method: Method | null) => {
    if (!siteId) {
      // 如果没有 siteId，加载所有设备（回退到原逻辑）
      const equipParams: { laboratory_id?: number; site_id?: number; page_size: number } = { page_size: 100 };
      if (laboratoryId) equipParams.laboratory_id = laboratoryId;
      const res = await equipmentService.getEquipment(equipParams);
      setEquipment(res.items.filter((eq) => eq.is_active));
      return;
    }

    setLoadingEquipment(true);
    try {
      // 根据方法分类获取匹配的设备分类
      const categories = method?.category ? getEquipmentCategoriesForMethod(method.category) : undefined;
      
      const equipParams: { site_id: number; category?: string[]; page_size: number } = {
        site_id: siteId,
        page_size: 100
      };
      
      // 如果有方法分类，则按分类筛选设备
      if (categories && categories.length > 0 && categories[0] !== 'other') {
        equipParams.category = categories;
      }
      
      const res = await equipmentService.getEquipment(equipParams);
      setEquipment(res.items.filter((eq) => eq.is_active));
    } catch (error) {
      console.error('Failed to load equipment:', error);
      setEquipment([]);
    } finally {
      setLoadingEquipment(false);
    }
  }, [siteId, laboratoryId]);

  useEffect(() => {
    if (visible) {
      // 加载方法列表（使用 site_id 而不是 laboratory_id）
      const methodType: MethodType | undefined = workOrderType === 'failure_analysis' ? 'analysis' : 
                        workOrderType === 'reliability_test' ? 'reliability' : undefined;
      const methodParams: { page_size: number; is_active: boolean; method_type?: MethodType; site_id?: number } = {
        page_size: 100,
        is_active: true,
      };
      if (methodType) methodParams.method_type = methodType;
      if (siteId) methodParams.site_id = siteId;
      
      methodService.getMethods(methodParams).then((res) => {
        setMethods(res.items);
      });

      // 加载可用材料列表（非样品类型）
      setLoadingMaterials(true);
      console.log('TaskModal: Starting materials API call...');
      materialService.getMaterials({ page_size: 100 }).then((res) => {
        console.log('TaskModal: Materials API raw response:', res);
        console.log('TaskModal: Response type:', typeof res);
        console.log('TaskModal: Has items?', !!res?.items);
        console.log('TaskModal: Items length:', res?.items?.length);
        if (!res || !res.items) {
          console.error('TaskModal: Invalid response structure - missing items array');
          return;
        }
        const filtered = res.items.filter((m) => m.material_type !== 'sample');
        console.log('TaskModal: Filtered materials (non-sample):', filtered.length);
        console.log('TaskModal: First few materials:', filtered.slice(0, 3).map(m => ({ id: m.id, name: m.name, type: m.material_type })));
        const mappedMaterials = filtered.map((m) => ({
            id: m.id,
            material_code: m.material_code,
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
          }));
        console.log('TaskModal: Setting materials state with', mappedMaterials.length, 'items');
        setMaterials(mappedMaterials);
      }).catch((error) => {
        console.error('TaskModal: Failed to load materials:', error);
        console.error('TaskModal: Error details:', error?.response?.status, error?.response?.data);
      }).finally(() => {
        console.log('TaskModal: Materials loading finished');
        setLoadingMaterials(false);
      });

      // 初始加载设备（不按方法分类筛选）
      loadEquipmentForMethod(null);

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
        // 如果编辑模式有选中的方法，设置 selectedMethod
        if (task.method_id) {
          methodService.getMethods({ page_size: 100, is_active: true }).then((res) => {
            const method = res.items.find(m => m.id === task.method_id);
            if (method) setSelectedMethod(method);
          });
        }
        // 编辑模式：检查任务是否使用关键设备（依据设备名管理表中的 is_critical 字段）
        if (task.required_equipment_id) {
          equipmentService.getEquipment({ page_size: 100 }).then((res) => {
            const eq = res.items.find(e => e.id === task.required_equipment_id);
            // 通过设备关联的设备名判断是否为关键设备
            if (eq?.equipment_name?.is_critical) {
              setIsCriticalEquipment(true);
              setTaskEquipmentNameId(eq.equipment_name_id || null);
            }
          });
        }
        // 重置编辑模式的调度更新状态
        setWantUpdateSchedule(false);
        setScheduledTime(null);
      } else {
        form.resetFields();
        setCapacityInfo(null);
        setSelectedMethod(null);
        setIsCriticalEquipment(false);
        setScheduledTime(null);
        setPendingConsumptions([]);
        setWantUpdateSchedule(false);
        setTaskEquipmentNameId(null);
      }
    }
  }, [visible, task, siteId, workOrderType, form, loadEquipmentForMethod]);

  const handleMethodChange = async (value: number | undefined) => {
    // 清空已选设备，因为设备列表会根据方法分类重新加载
    form.setFieldValue('required_equipment_id', undefined);
    setCapacityInfo(null);
    
    if (value) {
      const method = methods.find(m => m.id === value);
      setSelectedMethod(method || null);
      
      if (method) {
        // 根据方法分类重新加载匹配的设备
        await loadEquipmentForMethod(method);
        
        // Auto-populate from method
        if (method.standard_cycle_hours) {
          form.setFieldValue('standard_cycle_hours', method.standard_cycle_hours);
        }
        // 如果方法有默认设备，且该设备在新加载的设备列表中，则自动选中
        if (method.default_equipment?.id) {
          // 等待设备加载完成后再设置
          setTimeout(() => {
            const equipmentList = equipment;
            const hasDefaultEquipment = equipmentList.some(eq => eq.id === method.default_equipment?.id);
            if (hasDefaultEquipment) {
              form.setFieldValue('required_equipment_id', method.default_equipment!.id);
              handleEquipmentChange(method.default_equipment!.id);
            }
          }, 100);
        }
        // Auto-fill title if empty
        const currentTitle = form.getFieldValue('title');
        if (!currentTitle) {
          form.setFieldValue('title', method.name);
        }
      }
    } else {
      setSelectedMethod(null);
      // 清空方法选择时，恢复到不筛选分类的设备列表
      await loadEquipmentForMethod(null);
    }
  };

  const handleEquipmentChange = async (value: number) => {
    if (!value) {
      setCapacityInfo(null);
      setIsCriticalEquipment(false);
      setScheduledTime(null);
      return;
    }
    
    // 检查是否为关键设备
    const selectedEquipment = equipment.find(eq => eq.id === value);
    const isCritical = selectedEquipment?.equipment_name?.is_critical === true;
    setIsCriticalEquipment(isCritical);
    
    // 如果切换设备，清除之前的调度时间
    if (scheduledTime && scheduledTime.equipmentId !== value) {
      setScheduledTime(null);
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

  // 材料消耗行操作函数
  const handleAddConsumptionRow = () => {
    setPendingConsumptions([
      ...pendingConsumptions,
      {
        key: `pending-${Date.now()}`,
        material_id: undefined,
        quantity_consumed: undefined,
        unit_price: undefined,
        notes: undefined,
      },
    ]);
  };

  const handleRemoveConsumptionRow = (key: string) => {
    setPendingConsumptions(pendingConsumptions.filter((r) => r.key !== key));
  };

  const handleConsumptionRowChange = (key: string, field: keyof PendingConsumptionRow, value: unknown) => {
    setPendingConsumptions(
      pendingConsumptions.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 如果是关键设备，必须选择调度时间（新建模式或编辑模式选择调整预约）
      if (isCriticalEquipment && !scheduledTime) {
        if (!task) {
          message.warning('请为关键设备选择调度时间');
          return;
        } else if (wantUpdateSchedule) {
          message.warning('请选择新的调度时间');
          return;
        }
      }
      
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
        // 如果选择了调整设备预约
        if (wantUpdateSchedule && scheduledTime) {
          updateData.update_schedule = true;
          updateData.schedule_start_time = scheduledTime.startTime.toISOString();
          updateData.schedule_end_time = scheduledTime.endTime.toISOString();
        }
        await workOrderService.updateTask(workOrderId, task.id, updateData);
        message.success(wantUpdateSchedule && scheduledTime ? '任务更新成功，设备预约已调整' : '任务更新成功');
      } else {
        const createData: TaskFormData = {
          title: values.title || '',
          description: values.description || undefined,
          sequence: values.sequence,
          method_id: values.method_id || undefined,
          required_equipment_id: values.required_equipment_id || undefined,
          required_capacity: values.required_capacity || undefined,
          standard_cycle_hours: values.standard_cycle_hours || undefined,
          // 关键设备调度时间
          schedule_start_time: scheduledTime?.startTime.toISOString(),
          schedule_end_time: scheduledTime?.endTime.toISOString(),
        };
        const createdTask = await workOrderService.createTask(workOrderId, createData);
        
        // 如果有待添加的材料消耗，自动提交
        const validConsumptions = pendingConsumptions.filter(
          (r) => r.material_id && r.quantity_consumed && r.quantity_consumed > 0
        );
        if (validConsumptions.length > 0 && createdTask.id) {
          try {
            const consumptionItems: ConsumptionCreateItem[] = validConsumptions.map((r) => ({
              material_id: r.material_id!,
              quantity_consumed: r.quantity_consumed!,
              unit_price: r.unit_price,
              notes: r.notes,
            }));
            await workOrderService.createConsumptions(workOrderId, createdTask.id, { consumptions: consumptionItems });
            message.success(`任务创建成功，已登记 ${consumptionItems.length} 条材料消耗`);
          } catch (consumptionError) {
            console.error('Failed to create consumptions:', consumptionError);
            message.warning('任务已创建，但材料消耗登记失败，请稍后在编辑页面添加');
          }
        } else {
          message.success('任务创建成功');
        }
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      // 尝试从 API 错误中提取详细信息
      let errorMessage = task ? '更新失败' : '创建失败';
      if (error && typeof error === 'object') {
        const apiError = error as { response?: { data?: { detail?: string }, status?: number } };
        if (apiError.response?.data?.detail) {
          errorMessage = apiError.response.data.detail;
        } else if (apiError.response?.status === 409) {
          errorMessage = '设备调度时间冲突，请选择其他时间段';
        }
      }
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 使用 Form.useWatch 监听表单字段变化，避免 getFieldsValue 引起的问题
  const requiredEquipmentId = Form.useWatch('required_equipment_id', form);

  return (
    <Modal
      title={task ? '编辑任务' : '新增任务'}
      open={visible}
      onCancel={onCancel}
      width={isCriticalEquipment ? 1200 : 700}
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
            placeholder={loadingEquipment ? "加载设备中..." : (selectedMethod ? `选择适用于 ${selectedMethod.name} 的设备` : "请选择所需设备")}
            allowClear
            disabled={!!task || loadingEquipment}
            loading={loadingEquipment}
            onChange={handleEquipmentChange}
            optionFilterProp="label"
            notFoundContent={loadingEquipment ? <Spin size="small" /> : (selectedMethod ? "没有匹配的设备" : "暂无设备")}
            options={equipment.map((eq) => ({
              label: `${eq.name} (${eq.code})`,
              value: eq.id,
            }))}
          />
        </Form.Item>
        {selectedMethod && !loadingEquipment && equipment.length === 0 && (
          <Alert
            type="warning"
            message={`当前站点没有适用于 "${selectedMethod.name}" 方法的设备`}
            style={{ marginTop: -8, marginBottom: 16 }}
          />
        )}

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

        {/* 关键设备调度组件 */}
        {!task && isCriticalEquipment && siteId && requiredEquipmentId && (
          <Collapse
            defaultActiveKey={['scheduler']}
            style={{ marginBottom: 16 }}
            items={[{
              key: 'scheduler',
              label: (
                <span style={{ color: '#ef4444', fontWeight: 500 }}>
                  关键设备 - 必须选择调度时间
                </span>
              ),
              children: (
                <CriticalEquipmentScheduler
                  equipmentNameId={equipment.find(eq => eq.id === requiredEquipmentId)?.equipment_name_id || 0}
                  siteId={siteId}
                  onTimeSelected={(selection) => setScheduledTime(selection)}
                  initialSelection={scheduledTime ? {
                    equipmentId: scheduledTime.equipmentId,
                    startTime: scheduledTime.startTime.toISOString(),
                    endTime: scheduledTime.endTime.toISOString(),
                  } : undefined}
                />
              ),
            }]}
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
              disabled={!requiredEquipmentId}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {/* 编辑模式：关键设备调整预约选项（依据设备名管理表中的 is_critical 字段） */}
        {task && isCriticalEquipment && siteId && taskEquipmentNameId && (
          <div style={{ marginBottom: 16 }}>
            <Checkbox
              checked={wantUpdateSchedule}
              onChange={(e) => {
                setWantUpdateSchedule(e.target.checked);
                if (!e.target.checked) {
                  setScheduledTime(null);
                }
              }}
            >
              <span style={{ color: '#ef4444', fontWeight: 500 }}>
                调整设备预约时间
              </span>
            </Checkbox>
            {wantUpdateSchedule && (
              <div style={{ marginTop: 12 }}>
                <CriticalEquipmentScheduler
                  equipmentNameId={taskEquipmentNameId}
                  siteId={siteId}
                  onTimeSelected={(selection) => setScheduledTime(selection)}
                  initialSelection={scheduledTime ? {
                    equipmentId: scheduledTime.equipmentId,
                    startTime: scheduledTime.startTime.toISOString(),
                    endTime: scheduledTime.endTime.toISOString(),
                  } : undefined}
                />
              </div>
            )}
          </div>
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

        {/* 创建模式下的材料消耗选择 */}
        {!task && (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left" style={{ marginTop: 0 }}>材料消耗（可选）</Divider>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
              {loadingMaterials ? '材料加载中...' : `已加载 ${materials.length} 种可消耗材料`}
            </div>
            <div
              style={{
                background: '#fafafa',
                padding: 16,
                borderRadius: 4,
                border: '1px dashed #d9d9d9',
              }}
            >
              {pendingConsumptions.length === 0 ? (
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddConsumptionRow}>
                  添加材料消耗
                </Button>
              ) : (
                <>
                  {pendingConsumptions.map((row) => {
                    const selectedMaterial = materials.find((m) => m.id === row.material_id);
                    return (
                      <div
                        key={row.key}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginBottom: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Form.Item style={{ flex: 3, marginBottom: 0 }}>
                          <Select
                            placeholder={loadingMaterials ? "加载材料中..." : (materials.length === 0 ? "暂无可用材料" : "选择材料")}
                            value={row.material_id}
                            onChange={(val) => handleConsumptionRowChange(row.key, 'material_id', val)}
                            loading={loadingMaterials}
                            showSearch
                            optionFilterProp="label"
                            notFoundContent={loadingMaterials ? <Spin size="small" /> : "暂无可用材料"}
                            options={materials.map((m) => ({
                              label: `${m.name} (${m.material_code}) - 库存: ${m.quantity} ${m.unit}`,
                              value: m.id,
                            }))}
                          />
                        </Form.Item>

                        <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                          <InputNumber
                            placeholder="数量"
                            min={1}
                            max={selectedMaterial?.quantity}
                            value={row.quantity_consumed}
                            onChange={(val) => handleConsumptionRowChange(row.key, 'quantity_consumed', val)}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>

                        <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                          <InputNumber
                            placeholder="单价(可选)"
                            min={0}
                            precision={2}
                            value={row.unit_price}
                            onChange={(val) => handleConsumptionRowChange(row.key, 'unit_price', val)}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>

                        <Form.Item style={{ flex: 2, marginBottom: 0 }}>
                          <Input
                            placeholder="备注(可选)"
                            value={row.notes}
                            onChange={(e) => handleConsumptionRowChange(row.key, 'notes', e.target.value)}
                          />
                        </Form.Item>

                        <Button
                          type="text"
                          icon={<MinusCircleOutlined />}
                          danger
                          onClick={() => handleRemoveConsumptionRow(row.key)}
                        />
                      </div>
                    );
                  })}

                  <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddConsumptionRow} style={{ marginTop: 8 }}>
                    添加更多
                  </Button>
                </>
              )}
            </div>
          </div>
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
