import { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, App } from 'antd';
import { handoverService } from '../../services/handoverService';
import { personnelService } from '../../services/personnelService';
import type { WorkOrderTask, Personnel, HandoverPriority } from '../../types';

const { TextArea } = Input;

interface HandoverModalProps {
  visible: boolean;
  task: WorkOrderTask | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const priorityOptions = [
  { label: '普通', value: 'normal' },
  { label: '紧急', value: 'urgent' },
  { label: '关键', value: 'critical' },
];

interface HandoverFormValues {
  to_technician_id?: number;
  priority: string;
  progress_summary?: string;
  pending_items?: string;
  special_instructions?: string;
}

export function HandoverModal({ visible, task, onSuccess, onCancel }: HandoverModalProps) {
  const [form] = Form.useForm<HandoverFormValues>();
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Personnel[]>([]);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldValue('priority', 'normal');

      // Load available technicians
      personnelService.getPersonnel({ status: 'available', page_size: 100 }).then((res) => {
        setTechnicians(res.items);
      });
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    if (!task) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      await handoverService.createHandover({
        task_id: task.id,
        to_technician_id: values.to_technician_id || undefined,
        priority: values.priority as HandoverPriority,
        progress_summary: values.progress_summary || undefined,
        pending_items: values.pending_items || undefined,
        special_instructions: values.special_instructions || undefined,
      });

      message.success('交接创建成功');
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error('创建交接失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`创建任务交接 - ${task?.title || ''}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="创建交接"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="to_technician_id" label="接收技术员">
          <Select
            placeholder="选择接收技术员（可留空由他人认领）"
            allowClear
            showSearch
            optionFilterProp="label"
            options={technicians.map((tech) => ({
              label: `${tech.user?.full_name || tech.employee_id} (${tech.employee_id})`,
              value: tech.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
          <Select placeholder="选择优先级" options={priorityOptions} />
        </Form.Item>

        <Form.Item name="progress_summary" label="已完成工作">
          <TextArea rows={3} placeholder="描述已经完成的工作内容..." />
        </Form.Item>

        <Form.Item name="pending_items" label="待完成事项">
          <TextArea rows={3} placeholder="描述还需要完成的工作..." />
        </Form.Item>

        <Form.Item name="special_instructions" label="特别说明">
          <TextArea rows={2} placeholder="任何重要的注意事项或说明..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
