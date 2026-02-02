import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
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
  const [form] = useForm<SiteFormData>({
    initialValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      country: '',
      timezone: 'Asia/Shanghai',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入站点名称' }],
      code: [{ required: true, message: '请输入站点代码' }],
      timezone: [{ required: true, message: '请选择时区' }],
      contact_email: [
        {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: '请输入有效的邮箱地址',
        },
      ],
    },
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

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
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue() as SiteFormData;

      if (site) {
        await siteService.updateSite(site.id, values);
        toast.success('更新成功');
      } else {
        await siteService.createSite(values);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(site ? '更新失败' : '创建失败');
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
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="name" label="站点名称">
            <Input placeholder="请输入站点名称" />
          </FormItem>
          <FormItem name="code" label="站点代码">
            <Input placeholder="请输入站点代码" />
          </FormItem>
        </div>

        <FormItem name="address" label="地址">
          <Input placeholder="请输入地址" />
        </FormItem>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="city" label="城市">
            <Input placeholder="请输入城市" />
          </FormItem>
          <FormItem name="country" label="国家">
            <Input placeholder="请输入国家" />
          </FormItem>
          <FormItem name="timezone" label="时区">
            <Select options={timezones} placeholder="请选择时区" />
          </FormItem>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="contact_name" label="联系人姓名">
            <Input placeholder="请输入联系人姓名" />
          </FormItem>
          <FormItem name="contact_email" label="联系人邮箱">
            <Input placeholder="请输入联系人邮箱" />
          </FormItem>
          <FormItem name="contact_phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </FormItem>
        </div>

        <FormItem name="is_active" label="状态">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </FormItem>
      </Form>
    </Modal>
  );
}
