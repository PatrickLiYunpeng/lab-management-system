import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Switch, Row, Col, App } from 'antd';
import { equipmentService } from '../../services/equipmentService';
import type {
  Equipment,
  EquipmentFormData,
  EquipmentUpdateData,
  Site,
  Laboratory,
  EquipmentCategoryRecord,
  EquipmentNameRecord,
} from '../../types';

const { TextArea } = Input;

interface EquipmentModalProps {
  visible: boolean;
  equipment: Equipment | null;
  sites: Site[];
  laboratories: Laboratory[];
  onSuccess: () => void;
  onCancel: () => void;
}

const equipmentTypeOptions = [
  { label: '自主运行设备', value: 'autonomous' },
  { label: '操作员依赖设备', value: 'operator_dependent' },
];

const statusOptions = [
  { label: '可用', value: 'available' },
  { label: '使用中', value: 'in_use' },
  { label: '维护中', value: 'maintenance' },
  { label: '停用', value: 'out_of_service' },
  { label: '已预约', value: 'reserved' },
];

interface EquipmentFormValues {
  name: string;
  code: string;
  equipment_type: string;
  category_id?: number;
  equipment_name_id?: number;
  site_id: number;
  laboratory_id: number;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  description?: string;
  capacity?: number;
  uph?: number;
  max_concurrent_tasks: number;
  status?: string;
  purchase_date?: dayjs.Dayjs;
  warranty_expiry?: dayjs.Dayjs;
  maintenance_interval_days?: number;
  calibration_interval_days?: number;
  is_active: boolean;
}

export function EquipmentModal({
  visible,
  equipment,
  sites,
  laboratories,
  onSuccess,
  onCancel,
}: EquipmentModalProps) {
  const [form] = Form.useForm<EquipmentFormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const [categories, setCategories] = useState<EquipmentCategoryRecord[]>([]);
  const [equipmentNames, setEquipmentNames] = useState<EquipmentNameRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const { message } = App.useApp();

  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  // Load categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await equipmentService.getEquipmentCategories(true);
      setCategories(data);
    } catch {
      console.error('Failed to fetch categories');
    }
  }, []);

  // Load equipment names by category
  const fetchEquipmentNames = useCallback(async (categoryId: number) => {
    try {
      const data = await equipmentService.getEquipmentNamesByCategory(categoryId);
      setEquipmentNames(data.filter((n) => n.is_active));
    } catch {
      console.error('Failed to fetch equipment names');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible, fetchCategories]);

  // Load equipment names when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchEquipmentNames(selectedCategoryId);
    } else {
      setEquipmentNames([]);
    }
  }, [selectedCategoryId, fetchEquipmentNames]);

  useEffect(() => {
    if (visible) {
      if (equipment) {
        setSelectedSiteId(equipment.site_id);
        setSelectedCategoryId(equipment.category_id);
        form.setFieldsValue({
          ...equipment,
          purchase_date: equipment.purchase_date ? dayjs(equipment.purchase_date) : undefined,
          warranty_expiry: equipment.warranty_expiry ? dayjs(equipment.warranty_expiry) : undefined,
        } as EquipmentFormValues);
      } else {
        form.resetFields();
        form.setFieldsValue({ max_concurrent_tasks: 1, is_active: true });
        setSelectedSiteId(undefined);
        setSelectedCategoryId(undefined);
        setEquipmentNames([]);
      }
    }
  }, [visible, equipment, form]);

  const handleSiteChange = (value: number) => {
    setSelectedSiteId(value);
    const currentLabId = form.getFieldValue('laboratory_id');
    if (currentLabId) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== value) {
        form.setFieldValue('laboratory_id', undefined);
      }
    }
  };

  const handleCategoryChange = (value: number | undefined) => {
    setSelectedCategoryId(value);
    // Clear equipment name when category changes
    form.setFieldValue('equipment_name_id', undefined);
    form.setFieldValue('name', undefined);
  };

  const handleEquipmentNameChange = (value: number | undefined) => {
    if (value) {
      const selectedName = equipmentNames.find((en) => en.id === value);
      if (selectedName) {
        form.setFieldValue('name', selectedName.name);
      }
    } else {
      form.setFieldValue('name', undefined);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = {
        ...values,
        purchase_date: values.purchase_date ? (values.purchase_date as dayjs.Dayjs).toISOString() : undefined,
        warranty_expiry: values.warranty_expiry ? (values.warranty_expiry as dayjs.Dayjs).toISOString() : undefined,
      };

      if (equipment) {
        await equipmentService.updateEquipment(equipment.id, formData as unknown as EquipmentUpdateData);
        message.success('更新成功');
      } else {
        await equipmentService.createEquipment(formData as unknown as EquipmentFormData);
        message.success('创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(equipment ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={equipment ? '编辑设备' : '新增设备'}
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
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#999' }}>基本信息</span>
        </div>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="category_id" label="设备类别" rules={[{ required: true, message: '请选择设备类别' }]}>
              <Select
                placeholder="请选择设备类别"
                showSearch
                optionFilterProp="label"
                onChange={handleCategoryChange}
                options={categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="equipment_name_id" label="设备名称" rules={[{ required: true, message: '请选择设备名称' }]}>
              <Select
                placeholder={selectedCategoryId ? '请选择设备名称' : '请先选择类别'}
                disabled={!selectedCategoryId}
                showSearch
                optionFilterProp="label"
                onChange={handleEquipmentNameChange}
                options={equipmentNames.map((en) => ({
                  label: en.name,
                  value: en.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="code" label="设备编号" rules={[{ required: true, message: '请输入设备编号' }]}>
              <Input placeholder="请输入设备编号" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="equipment_type" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
              <Select placeholder="请选择设备类型" options={equipmentTypeOptions} />
            </Form.Item>
          </Col>
        </Row>

        {/* Hidden field for name - auto-filled from equipment_name_id */}
        <Form.Item name="name" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="site_id" label="所属站点" rules={[{ required: true, message: '请选择所属站点' }]}>
              <Select
                placeholder="请选择所属站点"
                onChange={handleSiteChange}
                showSearch
                optionFilterProp="label"
                options={sites.map((site) => ({
                  label: `${site.name} (${site.code})`,
                  value: site.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="laboratory_id" label="所属实验室" rules={[{ required: true, message: '请选择所属实验室' }]}>
              <Select
                placeholder="请先选择所属站点"
                disabled={!selectedSiteId}
                showSearch
                optionFilterProp="label"
                options={filteredLaboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>设备详情</span>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="model" label="型号">
              <Input placeholder="请输入型号" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="manufacturer" label="制造商">
              <Input placeholder="请输入制造商" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="serial_number" label="序列号">
              <Input placeholder="请输入序列号" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入设备描述" />
        </Form.Item>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>性能参数</span>
        </div>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="capacity" label="容量">
              <InputNumber min={1} placeholder="最大容量" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="uph" label="UPH (每小时产能)">
              <InputNumber min={0} step={0.1} placeholder="每小时产能" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="max_concurrent_tasks" label="最大并发任务">
              <InputNumber min={1} placeholder="并发任务数" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          {equipment && (
            <Col span={6}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" options={statusOptions} />
              </Form.Item>
            </Col>
          )}
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>维保信息</span>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="purchase_date" label="采购日期">
              <DatePicker style={{ width: '100%' }} placeholder="请选择采购日期" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="warranty_expiry" label="保修到期日">
              <DatePicker style={{ width: '100%' }} placeholder="请选择保修到期日" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="maintenance_interval_days" label="维护周期(天)">
              <InputNumber min={1} placeholder="维护周期" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="calibration_interval_days" label="校准周期(天)">
              <InputNumber min={1} placeholder="校准周期" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          {equipment && (
            <Col span={8}>
              <Form.Item name="is_active" label="启用状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
