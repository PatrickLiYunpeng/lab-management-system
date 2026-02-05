import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, App } from 'antd';
import { equipmentService } from '../../services/equipmentService';
import type { EquipmentCategoryRecord, EquipmentCategoryFormData } from '../../types';

const { TextArea } = Input;

interface EquipmentCategoryModalProps {
  visible: boolean;
  category: EquipmentCategoryRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CategoryFormValues {
  name: string;
  code: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export function EquipmentCategoryModal({
  visible,
  category,
  onSuccess,
  onCancel,
}: EquipmentCategoryModalProps) {
  const [form] = Form.useForm<CategoryFormValues>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (category) {
        form.setFieldsValue({
          name: category.name,
          code: category.code,
          description: category.description,
          display_order: category.display_order,
          is_active: category.is_active,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ display_order: 0, is_active: true });
      }
    }
  }, [visible, category, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData: EquipmentCategoryFormData = {
        name: values.name,
        code: values.code,
        description: values.description,
        display_order: values.display_order,
        is_active: values.is_active,
      };

      if (category) {
        await equipmentService.updateEquipmentCategory(category.id, formData);
        message.success('更新成功');
      } else {
        await equipmentService.createEquipmentCategory(formData);
        message.success('创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const err = error as { response?: { data?: { detail?: string } } };
      const detail = err?.response?.data?.detail;
      message.error(detail || (category ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={category ? '编辑设备类别' : '新增设备类别'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={500}
      okText="确定"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="类别名称"
          rules={[{ required: true, message: '请输入类别名称' }]}
        >
          <Input placeholder="请输入类别名称，如：电学分析" />
        </Form.Item>

        <Form.Item
          name="code"
          label="类别编码"
          rules={[
            { required: true, message: '请输入类别编码' },
            { pattern: /^[a-z_]+$/, message: '编码只能包含小写字母和下划线' },
          ]}
        >
          <Input placeholder="请输入类别编码，如：electrical_analysis" disabled={!!category} />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入类别描述" />
        </Form.Item>

        <Form.Item name="display_order" label="排序序号">
          <InputNumber min={0} placeholder="排序序号" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="is_active" label="启用状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
