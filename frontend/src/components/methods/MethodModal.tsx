import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, InputNumber, Form, Row, Col, App } from 'antd';
import { methodService } from '../../services/methodService';
import { laboratoryService } from '../../services/laboratoryService';
import { equipmentService } from '../../services/equipmentService';
import type { Method, MethodFormData, Laboratory, Equipment } from '../../types';

const { TextArea } = Input;

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
  const [form] = Form.useForm<MethodFormValues>();
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [requiresEquipment, setRequiresEquipment] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const loadLaboratories = async () => {
      try {
        const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
        setLaboratories(response.items);
      } catch {
        message.error('加载实验室列表失败');
      }
    };
    loadLaboratories();
  }, [message]);

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
          message.error('加载设备列表失败');
        }
      } else {
        setEquipment([]);
      }
    };
    loadEquipment();
  }, [selectedLabId, message]);

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
    try {
      const values = await form.validateFields();
      setLoading(true);

      const submitData: MethodFormData = {
        ...values,
        category: values.category || null,
        laboratory_id: values.laboratory_id || null,
        default_equipment_id: values.default_equipment_id || null,
      } as MethodFormData;

      if (method) {
        await methodService.updateMethod(method.id, submitData);
        message.success('方法更新成功');
      } else {
        await methodService.createMethod(submitData);
        message.success('方法创建成功');
      }

      onSuccess();
    } catch {
      message.error(method ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLabChange = (value: number) => {
    setSelectedLabId(value || null);
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
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="方法名称" rules={[{ required: true, message: '请输入方法名称' }]}>
              <Input placeholder="请输入方法名称" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="code" label="方法代码" rules={[{ required: true, message: '请输入方法代码' }]}>
              <Input placeholder="如: XRF-001" disabled={!!method} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="method_type" label="方法类型" rules={[{ required: true, message: '请选择方法类型' }]}>
              <Select options={methodTypeOptions} placeholder="请选择" disabled={!!method} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="category" label="方法类别">
              <Select options={categoryOptions} placeholder="请选择类别" allowClear />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="laboratory_id" label="所属实验室">
              <Select
                placeholder="请选择实验室"
                allowClear
                onChange={handleLabChange}
                options={laboratories.map(lab => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="方法描述">
          <TextArea rows={2} placeholder="请输入方法描述" />
        </Form.Item>

        <Form.Item name="procedure_summary" label="操作流程摘要">
          <TextArea rows={3} placeholder="请简要描述操作流程" />
        </Form.Item>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#999' }}>周期时间设置</span>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="standard_cycle_hours" label="标准周期(小时)">
              <InputNumber
                min={0.1}
                max={1000}
                step={0.5}
                placeholder="标准时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="min_cycle_hours" label="最短周期(小时)">
              <InputNumber
                min={0.1}
                max={1000}
                step={0.5}
                placeholder="最短时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="max_cycle_hours" label="最长周期(小时)">
              <InputNumber
                min={0.1}
                max={1000}
                step={0.5}
                placeholder="最长时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#999' }}>设备要求</span>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="requires_equipment" label="需要设备" valuePropName="checked">
              <Switch 
                checkedChildren="是" 
                unCheckedChildren="否" 
                checked={requiresEquipment}
                onChange={handleRequiresEquipmentChange}
              />
            </Form.Item>
          </Col>
          {requiresEquipment && (
            <Col span={16}>
              <Form.Item name="default_equipment_id" label="默认设备">
                <Select
                  placeholder={selectedLabId ? '请选择默认设备' : '请先选择实验室'}
                  allowClear
                  disabled={!selectedLabId}
                  options={equipment.map(eq => ({
                    label: `${eq.name} (${eq.code})`,
                    value: eq.id,
                  }))}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
