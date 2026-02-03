import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, Form, Row, Col, App } from 'antd';
import { siteService } from '../../services/siteService';
import type { Site, SiteFormData } from '../../types';

interface SiteModalProps {
  visible: boolean;
  site: Site | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Shanghai (中国)', value: 'Asia/Shanghai' },
  { label: 'Asia/Taipei (台湾)', value: 'Asia/Taipei' },
  { label: 'Asia/Tokyo (日本)', value: 'Asia/Tokyo' },
  { label: 'Asia/Singapore (新加坡)', value: 'Asia/Singapore' },
  { label: 'America/New_York (美东)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (美西)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (伦敦)', value: 'Europe/London' },
  { label: 'Europe/Berlin (柏林)', value: 'Europe/Berlin' },
];

export function SiteModal({ visible, site, onSuccess, onCancel }: SiteModalProps) {
  const [form] = Form.useForm<SiteFormData>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (site) {
        form.setFieldsValue(site);
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true, timezone: 'Asia/Shanghai' });
      }
    }
  }, [visible, site, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (site) {
        await siteService.updateSite(site.id, values);
        message.success('更新成功');
      } else {
        await siteService.createSite(values);
        message.success('创建成功');
      }

      onSuccess();
    } catch {
      message.error(site ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={site ? '编辑站点' : '新增站点'}
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
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="站点名称" rules={[{ required: true, message: '请输入站点名称' }]}>
              <Input placeholder="请输入站点名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="站点代码" rules={[{ required: true, message: '请输入站点代码' }]}>
              <Input placeholder="请输入站点代码" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="地址">
          <Input placeholder="请输入地址" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="city" label="城市">
              <Input placeholder="请输入城市" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="country" label="国家">
              <Input placeholder="请输入国家" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="timezone" label="时区" rules={[{ required: true, message: '请选择时区' }]}>
              <Select options={timezones} placeholder="请选择时区" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="contact_name" label="联系人姓名">
              <Input placeholder="请输入联系人姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="contact_email"
              label="联系人邮箱"
              rules={[
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '请输入有效的邮箱地址',
                },
              ]}
            >
              <Input placeholder="请输入联系人邮箱" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="contact_phone" label="联系电话">
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
