import { useEffect, useState } from 'react';
import { Modal, Input, TextArea, Select, Switch, InputNumber, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { methodService } from '../../services/methodService';
import { laboratoryService } from '../../services/laboratoryService';
import { equipmentService } from '../../services/equipmentService';
import type { Method, MethodFormData, Laboratory, Equipment } from '../../types';

interface MethodModalProps {
  visible: boolean;
  method: Method | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const methodTypeOptions = [
  { label: '分析方法 (FA)', value: 'analysis' },
  { label: '可靠性测试方法', value: 'reliability' },
];

const categoryOptions = [
  { label: '电学分析', value: 'electrical' },
  { label: '物理分析', value: 'physical' },
  { label: '化学分析', value: 'chemical' },
  { label: '光学分析', value: 'optical' },
  { label: '热分析', value: 'thermal' },
  { label: '机械测试', value: 'mechanical' },
  { label: '环境测试', value: 'environmental' },
  { label: '寿命测试', value: 'lifetime' },
  { label: '其他', value: 'other' },
];

interface MethodFormValues {
  name: string;
  code: string;
  method_type: string;
  category?: string;
  laboratory_id?: number;
  is_active: boolean;
  description?: string;
  procedure_summary?: string;
  standard_cycle_hours?: number;
  min_cycle_hours?: number;
  max_cycle_hours?: number;
  requires_equipment: boolean;
  default_equipment_id?: number;
}

export function MethodModal({ visible, method, onSuccess, onCancel }: MethodModalProps) {
  const [form] = useForm<MethodFormValues>({
    initialValues: {
      name: '',
      code: '',
      method_type: '',
      category: undefined,
      laboratory_id: undefined,
      is_active: true,
      description: '',
      procedure_summary: '',
      standard_cycle_hours: undefined,
      min_cycle_hours: undefined,
      max_cycle_hours: undefined,
      requires_equipment: true,
      default_equipment_id: undefined,
    },
    rules: {
      name: [{ required: true, message: '请输入方法名称' }],
      code: [{ required: true, message: '请输入方法代码' }],
      method_type: [{ required: true, message: '请选择方法类型' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [requiresEquipment, setRequiresEquipment] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadLaboratories = async () => {
      try {
        const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
        setLaboratories(response.items);
      } catch {
        toast.error('加载实验室列表失败');
      }
    };
    loadLaboratories();
  }, [toast]);

  useEffect(() => {
    const loadEquipment = async () => {
      if (selectedLabId) {
        try {
          const response = await equipmentService.getEquipment({ 
            laboratory_id: selectedLabId, 
            page: 1, 
            page_size: 100 
          });
          setEquipment(response.items);
        } catch {
          toast.error('加载设备列表失败');
        }
      } else {
        setEquipment([]);
      }
    };
    loadEquipment();
  }, [selectedLabId, toast]);

  useEffect(() => {
    if (visible) {
      if (method) {
        form.setFieldsValue({
          ...method,
          category: method.category || undefined,
        } as MethodFormValues);
        setSelectedLabId(method.laboratory_id || null);
        setRequiresEquipment(method.requires_equipment);
      } else {
        form.resetFields();
        form.setFieldsValue({
          requires_equipment: true,
          is_active: true,
        });
        setSelectedLabId(null);
        setRequiresEquipment(true);
      }
    }
  }, [visible, method, form]);

  const handleSubmit = async () => {
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue();

      const submitData: MethodFormData = {
        ...values,
        category: values.category || null,
        laboratory_id: values.laboratory_id || null,
        default_equipment_id: values.default_equipment_id || null,
      } as MethodFormData;

      if (method) {
        await methodService.updateMethod(method.id, submitData);
        toast.success('方法更新成功');
      } else {
        await methodService.createMethod(submitData);
        toast.success('方法创建成功');
      }

      onSuccess();
    } catch {
      toast.error(method ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLabChange = (value: string | number | (string | number)[]) => {
    const labId = Array.isArray(value) ? value[0] as number : value as number;
    setSelectedLabId(labId || null);
    form.setFieldValue('default_equipment_id', undefined);
  };

  const handleRequiresEquipmentChange = (checked: boolean) => {
    setRequiresEquipment(checked);
    form.setFieldValue('requires_equipment', checked);
    if (!checked) {
      form.setFieldValue('default_equipment_id', undefined);
    }
  };

  return (
    <Modal
      title={method ? '编辑分析/测试方法' : '新增分析/测试方法'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={800}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <FormItem name="name" label="方法名称">
              <Input placeholder="请输入方法名称" />
            </FormItem>
          </div>
          <div className="col-span-3">
            <FormItem name="code" label="方法代码">
              <Input placeholder="如: XRF-001" disabled={!!method} />
            </FormItem>
          </div>
          <div className="col-span-3">
            <FormItem name="method_type" label="方法类型">
              <Select options={methodTypeOptions} placeholder="请选择" disabled={!!method} />
            </FormItem>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="category" label="方法类别">
            <Select options={categoryOptions} placeholder="请选择类别" allowClear />
          </FormItem>
          <FormItem name="laboratory_id" label="所属实验室">
            <Select
              placeholder="请选择实验室"
              allowClear
              onChange={handleLabChange}
              options={laboratories.map(lab => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
          <FormItem name="is_active" label="状态">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </FormItem>
        </div>

        <FormItem name="description" label="方法描述">
          <TextArea rows={2} placeholder="请输入方法描述" />
        </FormItem>

        <FormItem name="procedure_summary" label="操作流程摘要">
          <TextArea rows={3} placeholder="请简要描述操作流程" />
        </FormItem>

        <div className="border-b border-neutral-200 pb-2 mb-4">
          <span className="text-sm text-neutral-500">周期时间设置</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="standard_cycle_hours" label="标准周期(小时)">
            <InputNumber
              min={0.1}
              max={1000}
              step={0.5}
              placeholder="标准时间"
              className="w-full"
            />
          </FormItem>
          <FormItem name="min_cycle_hours" label="最短周期(小时)">
            <InputNumber
              min={0.1}
              max={1000}
              step={0.5}
              placeholder="最短时间"
              className="w-full"
            />
          </FormItem>
          <FormItem name="max_cycle_hours" label="最长周期(小时)">
            <InputNumber
              min={0.1}
              max={1000}
              step={0.5}
              placeholder="最长时间"
              className="w-full"
            />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4">
          <span className="text-sm text-neutral-500">设备要求</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="requires_equipment" label="需要设备">
            <Switch 
              checkedChildren="是" 
              unCheckedChildren="否" 
              checked={requiresEquipment}
              onChange={handleRequiresEquipmentChange}
            />
          </FormItem>
          {requiresEquipment && (
            <div className="col-span-2">
              <FormItem name="default_equipment_id" label="默认设备">
                <Select
                  placeholder={selectedLabId ? '请选择默认设备' : '请先选择实验室'}
                  allowClear
                  disabled={!selectedLabId}
                  options={equipment.map(eq => ({
                    label: `${eq.name} (${eq.code})`,
                    value: eq.id,
                  }))}
                />
              </FormItem>
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
}
