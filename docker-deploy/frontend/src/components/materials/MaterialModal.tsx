import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, Select, InputNumber, DatePicker, Form, Row, Col, App } from 'antd';
import { materialService } from '../../services/materialService';
import type { Material, MaterialFormData, MaterialUpdateData, Site, Laboratory, Client } from '../../types';

const { TextArea } = Input;

interface MaterialModalProps {
  visible: boolean;
  material: Material | null;
  sites: Site[];
  laboratories: Laboratory[];
  clients: Client[];
  defaultMaterialType?: 'sample' | 'consumable' | 'reagent' | 'tool' | 'other';
  onSuccess: () => void;
  onCancel: () => void;
}

const materialTypeOptions = [
  { label: '样品', value: 'sample' },
  { label: '耗材', value: 'consumable' },
  { label: '试剂', value: 'reagent' },
  { label: '工具', value: 'tool' },
  { label: '其他', value: 'other' },
];

const statusOptions = [
  { label: '已接收', value: 'received' },
  { label: '入库', value: 'in_storage' },
  { label: '已分配', value: 'allocated' },
  { label: '使用中', value: 'in_use' },
  { label: '待返还', value: 'pending_return' },
  { label: '已返还', value: 'returned' },
  { label: '已处置', value: 'disposed' },
  { label: '遗失', value: 'lost' },
];

const unitOptions = [
  { label: '件', value: 'piece' },
  { label: '个', value: 'unit' },
  { label: '片', value: 'slice' },
  { label: '组', value: 'set' },
  { label: '批', value: 'batch' },
  { label: '毫升', value: 'ml' },
  { label: '克', value: 'g' },
];

interface MaterialFormValues {
  material_code: string;
  name: string;
  material_type: string;
  site_id: number;
  laboratory_id: number;
  description?: string;
  storage_location?: string;
  quantity: number;
  unit: string;
  client_id?: number;
  client_reference?: string;
  storage_deadline?: dayjs.Dayjs;
  processing_deadline?: dayjs.Dayjs;
  status?: string;
}

export function MaterialModal({
  visible,
  material,
  sites,
  laboratories,
  clients,
  defaultMaterialType = 'sample',
  onSuccess,
  onCancel,
}: MaterialModalProps) {
  const [form] = Form.useForm<MaterialFormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const [currentMaterialType, setCurrentMaterialType] = useState<string>(defaultMaterialType);
  const { message } = App.useApp();

  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  useEffect(() => {
    if (visible) {
      if (material) {
        setSelectedSiteId(material.site_id);
        setCurrentMaterialType(material.material_type);
        form.setFieldsValue({
          ...material,
          storage_deadline: material.storage_deadline ? dayjs(material.storage_deadline) : undefined,
          processing_deadline: material.processing_deadline ? dayjs(material.processing_deadline) : undefined,
        } as MaterialFormValues);
      } else {
        form.resetFields();
        form.setFieldsValue({ quantity: 1, unit: 'piece', material_type: defaultMaterialType });
        setSelectedSiteId(undefined);
        setCurrentMaterialType(defaultMaterialType);
      }
    }
  }, [visible, material, form, defaultMaterialType]);

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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = {
        ...values,
        storage_deadline: values.storage_deadline ? values.storage_deadline.toISOString() : undefined,
        processing_deadline: values.processing_deadline ? values.processing_deadline.toISOString() : undefined,
      };

      if (material) {
        await materialService.updateMaterial(material.id, formData as unknown as MaterialUpdateData);
        message.success('更新成功');
      } else {
        await materialService.createMaterial(formData as unknown as MaterialFormData);
        message.success('创建成功');
      }

      onSuccess();
    } catch {
      message.error(material ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={material ? '编辑物料' : '新增物料'}
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
          <Col span={8}>
            <Form.Item name="material_code" label="物料编码" rules={[{ required: true, message: '请输入物料编码' }]}>
              <Input placeholder="请输入物料编码" disabled={!!material} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="name" label="物料名称" rules={[{ required: true, message: '请输入物料名称' }]}>
              <Input placeholder="请输入物料名称" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="material_type" label="物料类型" rules={[{ required: true, message: '请选择物料类型' }]}>
              <Select 
                placeholder="请选择物料类型" 
                options={materialTypeOptions} 
                disabled={!!material}
                onChange={(value) => setCurrentMaterialType(value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="site_id" label="所属站点" rules={[{ required: true, message: '请选择所属站点' }]}>
              <Select
                placeholder="请选择所属站点"
                onChange={handleSiteChange}
                disabled={!!material}
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
                disabled={!selectedSiteId || !!material}
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

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入物料描述" />
        </Form.Item>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>存储与数量</span>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="storage_location" label="存储位置">
              <Input placeholder="请输入存储位置" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="quantity" label="数量">
              <InputNumber min={1} placeholder="数量" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="unit" label="单位">
              <Select placeholder="请选择单位" options={unitOptions} />
            </Form.Item>
          </Col>
        </Row>

        {currentMaterialType === 'sample' && (
          <>
            <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
              <span style={{ fontSize: 14, color: '#999' }}>客户信息</span>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="client_id" label="客户">
                  <Select
                    placeholder="请选择客户"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={clients.map((client) => ({
                      label: `${client.name} (${client.code})`,
                      value: client.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="client_reference" label="客户参考号">
                  <Input placeholder="客户的参考编号" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>时间要求</span>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="storage_deadline" label="存储期限">
              <DatePicker style={{ width: '100%' }} placeholder="存储截止日期" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="processing_deadline" label="处理期限">
              <DatePicker style={{ width: '100%' }} placeholder="处理截止日期" />
            </Form.Item>
          </Col>
          {material && (
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" options={statusOptions} />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
