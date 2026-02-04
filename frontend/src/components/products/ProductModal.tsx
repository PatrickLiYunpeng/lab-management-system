import { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Select, Switch, Form, Row, Col, App, Button, Space, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { productService } from '../../services/productService';
import { clientService } from '../../services/clientService';
import type {
  Product,
  ProductFormData,
  ProductUpdateData,
  ProductConfig,
  Client,
} from '../../types';

interface ProductModalProps {
  visible: boolean;
  product: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProductFormValues {
  name: string;
  code?: string;
  client_id: number;
  package_form_id?: number;
  package_type_id?: number;
  scenario_ids?: number[];
  custom_info?: string[];
  is_active: boolean;
}

export function ProductModal({ visible, product, onSuccess, onCancel }: ProductModalProps) {
  const [form] = Form.useForm<ProductFormValues>();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const { message } = App.useApp();

  // Load configuration options and clients
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const [configData, clientsData] = await Promise.all([
        productService.getProductConfig(),
        clientService.getAllClients(),
      ]);
      setConfig(configData);
      setClients(clientsData);
    } catch {
      message.error('加载配置失败');
    } finally {
      setConfigLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (visible) {
      loadConfig();
      if (product) {
        form.setFieldsValue({
          name: product.name,
          code: product.code,
          client_id: product.client_id,
          package_form_id: product.package_form_id,
          package_type_id: product.package_type_id,
          scenario_ids: product.scenarios?.map((s) => s.id) || [],
          custom_info: product.custom_info || [],
          is_active: product.is_active,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          is_active: true,
          custom_info: [],
          scenario_ids: [],
        });
      }
    }
  }, [visible, product, form, loadConfig]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Filter out empty custom_info entries
      const customInfo = (values.custom_info || []).filter((item) => item && item.trim() !== '');

      if (product) {
        const updateData: ProductUpdateData = {
          name: values.name,
          code: values.code || undefined,
          client_id: values.client_id,
          package_form_id: values.package_form_id,
          package_type_id: values.package_type_id,
          scenario_ids: values.scenario_ids || [],
          custom_info: customInfo.length > 0 ? customInfo : undefined,
          is_active: values.is_active,
        };
        await productService.updateProduct(product.id, updateData);
        message.success('产品更新成功');
      } else {
        const createData: ProductFormData = {
          name: values.name,
          code: values.code || undefined,
          client_id: values.client_id,
          package_form_id: values.package_form_id,
          package_type_id: values.package_type_id,
          scenario_ids: values.scenario_ids || [],
          custom_info: customInfo.length > 0 ? customInfo : undefined,
        };
        await productService.createProduct(createData);
        message.success('产品创建成功');
      }

      onSuccess();
    } catch {
      message.error(product ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // Scenario tag render
  const scenarioTagRender = (props: { label: React.ReactNode; value: number; closable: boolean; onClose: () => void }) => {
    const { label, value, closable, onClose } = props;
    const scenario = config?.application_scenarios.find((s) => s.id === value);
    const color = scenario?.color || 'blue';
    return (
      <Tag color={color} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    );
  };

  return (
    <Modal
      title={product ? '编辑产品' : '新增产品'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={700}
      okText="确定"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {/* 基本信息 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#999' }}>基本信息</span>
        </div>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
              <Input placeholder="请输入产品名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="产品编码">
              <Input placeholder="请输入产品编码（可选）" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="client_id" label="所属客户" rules={[{ required: true, message: '请选择客户' }]}>
              <Select
                placeholder="请选择客户"
                loading={configLoading}
                showSearch
                optionFilterProp="label"
                options={clients.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 封装配置 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>封装配置</span>
        </div>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="package_form_id" label="封装形式">
              <Select
                placeholder="请选择封装形式"
                loading={configLoading}
                allowClear
                options={config?.package_forms.map((p) => ({ label: p.name, value: p.id })) || []}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="package_type_id" label="封装产品类型">
              <Select
                placeholder="请选择封装产品类型"
                loading={configLoading}
                allowClear
                options={config?.package_types.map((p) => ({ label: p.name, value: p.id })) || []}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 应用场景 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>应用场景</span>
        </div>
        <Form.Item name="scenario_ids" label="产品应用场景">
          <Select
            mode="multiple"
            placeholder="请选择应用场景（可多选）"
            loading={configLoading}
            tagRender={scenarioTagRender}
            options={config?.application_scenarios.map((s) => ({ label: s.name, value: s.id })) || []}
          />
        </Form.Item>

        {/* 自定义产品信息 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>自定义产品信息（最多5条，每条不超过200字）</span>
        </div>
        <Form.List name="custom_info">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={name}
                    rules={[
                      { max: 200, message: '不能超过200字' },
                    ]}
                    style={{ marginBottom: 0, width: 550 }}
                  >
                    <Input placeholder={`自定义信息 ${name + 1}`} maxLength={200} showCount />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                </Space>
              ))}
              {fields.length < 5 && (
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加自定义信息
                  </Button>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>

        {/* 状态（仅编辑时显示） */}
        {product && (
          <>
            <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
              <span style={{ fontSize: 14, color: '#999' }}>状态</span>
            </div>
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
