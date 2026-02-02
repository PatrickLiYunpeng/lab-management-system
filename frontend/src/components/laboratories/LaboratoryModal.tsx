import { useEffect, useState } from 'react';
import { Modal, Input, TextArea, Select, Switch, InputNumber, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { laboratoryService } from '../../services/laboratoryService';
import type { Laboratory, LaboratoryFormData, Site } from '../../types';

interface LaboratoryModalProps {
  visible: boolean;
  laboratory: Laboratory | null;
  sites: Site[];
  sitesLoading?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LaboratoryModal({
  visible,
  laboratory,
  sites,
  onSuccess,
  onCancel,
}: LaboratoryModalProps) {
  const [form] = useForm<LaboratoryFormData>({
    initialValues: {
      name: '',
      code: '',
      lab_type: undefined as unknown as LaboratoryFormData['lab_type'],
      site_id: undefined as unknown as number,
      description: '',
      max_capacity: undefined,
      manager_name: '',
      manager_email: '',
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入实验室名称' }],
      code: [{ required: true, message: '请输入实验室代码' }],
      lab_type: [{ required: true, message: '请选择实验室类型' }],
      site_id: [{ required: true, message: '请选择所属站点' }],
      manager_email: [
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
      if (laboratory) {
        form.setFieldsValue(laboratory);
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [visible, laboratory, form]);

  const handleSubmit = async () => {
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue() as LaboratoryFormData;

      if (laboratory) {
        await laboratoryService.updateLaboratory(laboratory.id, values);
        toast.success('更新成功');
      } else {
        await laboratoryService.createLaboratory(values);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(laboratory ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={laboratory ? '编辑实验室' : '新增实验室'}
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
          <FormItem name="name" label="实验室名称">
            <Input placeholder="请输入实验室名称" />
          </FormItem>
          <FormItem name="code" label="实验室代码">
            <Input placeholder="请输入实验室代码" />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="lab_type" label="实验室类型">
            <Select
              placeholder="请选择实验室类型"
              options={[
                { label: 'FA (失效分析)', value: 'fa' },
                { label: '可靠性测试', value: 'reliability' },
              ]}
            />
          </FormItem>
          <FormItem name="site_id" label="所属站点">
            <Select
              placeholder="请选择所属站点"
              options={sites.map((site) => ({
                label: site.name,
                value: site.id,
              }))}
              showSearch
            />
          </FormItem>
        </div>

        <FormItem name="description" label="描述">
          <TextArea rows={3} placeholder="请输入实验室描述" />
        </FormItem>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="max_capacity" label="最大容量">
            <InputNumber min={1} placeholder="请输入" className="w-full" />
          </FormItem>
          <FormItem name="manager_name" label="负责人姓名">
            <Input placeholder="请输入负责人姓名" />
          </FormItem>
          <FormItem name="manager_email" label="负责人邮箱">
            <Input placeholder="请输入负责人邮箱" />
          </FormItem>
        </div>

        <FormItem name="is_active" label="状态">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </FormItem>
      </Form>
    </Modal>
  );
}
