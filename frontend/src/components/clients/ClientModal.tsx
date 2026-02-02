import { useEffect, useState } from 'react';
import { Modal, Input, Select, InputNumber, Switch, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
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
  const [form] = useForm<ClientFormValues>({
    initialValues: {
      name: '',
      code: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      default_sla_days: 7,
      priority_level: 3,
      source_category: 'external',
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入客户名称' }],
      code: [{ required: true, message: '请输入客户代码' }],
      default_sla_days: [{ required: true, message: '请输入SLA天数' }],
      priority_level: [{ required: true, message: '请选择优先级' }],
      source_category: [{ required: true, message: '请选择来源类别' }],
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
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue();

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
        toast.success('客户更新成功');
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
        toast.success('客户创建成功');
      }

      onSuccess();
    } catch {
      toast.error(client ? '更新失败' : '创建失败');
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
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        {/* 基本信息 */}
        <div className="border-b border-neutral-200 pb-2 mb-4">
          <span className="text-sm text-neutral-500">基本信息</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="name" label="客户名称">
            <Input placeholder="请输入客户名称" />
          </FormItem>
          <FormItem name="code" label="客户代码">
            <Input placeholder="请输入客户代码" disabled={!!client} />
          </FormItem>
        </div>

        {/* 联系信息 */}
        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">联系信息</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="contact_name" label="联系人">
            <Input placeholder="请输入联系人姓名" />
          </FormItem>
          <FormItem name="contact_email" label="联系邮箱">
            <Input placeholder="请输入联系邮箱" />
          </FormItem>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="contact_phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </FormItem>
          <FormItem name="address" label="地址">
            <Input placeholder="请输入地址" />
          </FormItem>
        </div>

        {/* SLA配置 */}
        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">SLA配置</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="default_sla_days" label="默认SLA天数">
            <InputNumber min={1} max={90} className="w-full" placeholder="默认SLA天数" />
          </FormItem>
          <FormItem name="priority_level" label="优先级">
            <Select placeholder="请选择优先级" options={priorityOptions} />
          </FormItem>
          <FormItem name="source_category" label="来源类别">
            <Select placeholder="请选择来源类别" options={sourceCategoryOptions} />
          </FormItem>
        </div>

        {/* 状态（仅编辑时显示） */}
        {client && (
          <>
            <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
              <span className="text-sm text-neutral-500">状态</span>
            </div>
            <FormItem name="is_active" label="状态">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </FormItem>
          </>
        )}
      </Form>
    </Modal>
  );
}
