import { useEffect, useState } from 'react';
import { Modal, Input, Select, InputNumber, Switch, Form, Row, Col, App } from 'antd';
import { clientService } from '../../services/clientService';
import type { Client, ClientFormData, ClientUpdateData } from '../../types';

interface ClientModalProps {
  visible: boolean;
  client: Client | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const priorityOptions = [
  { label: '最高 (1)', value: 1 },
  { label: '高 (2)', value: 2 },
  { label: '中 (3)', value: 3 },
  { label: '低 (4)', value: 4 },
  { label: '最低 (5)', value: 5 },
];

const sourceCategoryOptions = [
  { label: 'VIP客户', value: 'vip' },
  { label: '内部测试', value: 'internal' },
  { label: '外部客户', value: 'external' },
  { label: '常规测试', value: 'routine' },
];

interface ClientFormValues {
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  default_sla_days: number;
  priority_level: number;
  source_category: string;
  is_active: boolean;
}

export function ClientModal({ visible, client, onSuccess, onCancel }: ClientModalProps) {
  const [form] = Form.useForm<ClientFormValues>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (client) {
        form.setFieldsValue(client as unknown as ClientFormValues);
      } else {
        form.resetFields();
        form.setFieldsValue({
          default_sla_days: 7,
          priority_level: 3,
          source_category: 'external',
          is_active: true,
        });
      }
    }
  }, [visible, client, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (client) {
        const updateData: ClientUpdateData = {
          name: values.name,
          contact_name: values.contact_name || undefined,
          contact_email: values.contact_email || undefined,
          contact_phone: values.contact_phone || undefined,
          address: values.address || undefined,
          default_sla_days: values.default_sla_days,
          priority_level: values.priority_level,
          source_category: values.source_category,
          is_active: values.is_active,
        };
        await clientService.updateClient(client.id, updateData);
        message.success('客户更新成功');
      } else {
        const createData: ClientFormData = {
          name: values.name,
          code: values.code,
          contact_name: values.contact_name || undefined,
          contact_email: values.contact_email || undefined,
          contact_phone: values.contact_phone || undefined,
          address: values.address || undefined,
          default_sla_days: values.default_sla_days,
          priority_level: values.priority_level,
          source_category: values.source_category,
        };
        await clientService.createClient(createData);
        message.success('客户创建成功');
      }

      onSuccess();
    } catch {
      message.error(client ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={client ? '编辑客户' : '新增客户'}
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
            <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
              <Input placeholder="请输入客户名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="客户代码" rules={[{ required: true, message: '请输入客户代码' }]}>
              <Input placeholder="请输入客户代码" disabled={!!client} />
            </Form.Item>
          </Col>
        </Row>

        {/* 联系信息 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>联系信息</span>
        </div>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="contact_name" label="联系人">
              <Input placeholder="请输入联系人姓名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contact_email"
              label="联系邮箱"
              rules={[
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '请输入有效的邮箱地址',
                },
              ]}
            >
              <Input placeholder="请输入联系邮箱" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="contact_phone" label="联系电话">
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="address" label="地址">
              <Input placeholder="请输入地址" />
            </Form.Item>
          </Col>
        </Row>

        {/* SLA配置 */}
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>SLA配置</span>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="default_sla_days" label="默认SLA天数" rules={[{ required: true, message: '请输入SLA天数' }]}>
              <InputNumber min={1} max={90} style={{ width: '100%' }} placeholder="默认SLA天数" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="priority_level" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
              <Select placeholder="请选择优先级" options={priorityOptions} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="source_category" label="来源类别" rules={[{ required: true, message: '请选择来源类别' }]}>
              <Select placeholder="请选择来源类别" options={sourceCategoryOptions} />
            </Form.Item>
          </Col>
        </Row>

        {/* 状态（仅编辑时显示） */}
        {client && (
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
