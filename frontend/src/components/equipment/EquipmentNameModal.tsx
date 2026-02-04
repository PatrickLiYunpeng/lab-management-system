import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, App } from 'antd';
import { equipmentService } from '../../services/equipmentService';
import type {
  EquipmentCategoryRecord,
  EquipmentNameWithCategory,
  EquipmentNameFormData,
  EquipmentNameUpdateData,
} from '../../types';

const { TextArea } = Input;

interface EquipmentNameModalProps {
  visible: boolean;
  equipmentName: EquipmentNameWithCategory | null;
  categories: EquipmentCategoryRecord[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface NameFormValues {
  category_id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export function EquipmentNameModal({
  visible,
  equipmentName,
  categories,
  onSuccess,
  onCancel,
}: EquipmentNameModalProps) {
  const [form] = Form.useForm<NameFormValues>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (equipmentName) {
        form.setFieldsValue({
          category_id: equipmentName.category_id,
          name: equipmentName.name,
          description: equipmentName.description,
          display_order: equipmentName.display_order,
          is_active: equipmentName.is_active,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ display_order: 0, is_active: true });
      }
    }
  }, [visible, equipmentName, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (equipmentName) {
        const updateData: EquipmentNameUpdateData = {
          name: values.name,
          description: values.description,
          display_order: values.display_order,
          is_active: values.is_active,
        };
        await equipmentService.updateEquipmentName(equipmentName.id, updateData);
        message.success('更新成功');
      } else {
        const formData: EquipmentNameFormData = {
          category_id: values.category_id,
          name: values.name,
          description: values.description,
          display_order: values.display_order,
          is_active: values.is_active,
        };
        await equipmentService.createEquipmentName(formData);
        message.success('创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const err = error as { response?: { data?: { detail?: string } } };
      const detail = err?.response?.data?.detail;
      message.error(detail || (equipmentName ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  // Filter active categories for selection
  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <Modal
      title={equipmentName ? '编辑设备名' : '新增设备名'}
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
          name="category_id"
          label="所属类别"
          rules={[{ required: true, message: '请选择所属类别' }]}
        >
          <Select
            placeholder="请选择所属类别"
            disabled={!!equipmentName}
            showSearch
            optionFilterProp="label"
            options={activeCategories.map((cat) => ({
              label: cat.name,
              value: cat.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="设备名"
          rules={[{ required: true, message: '请输入设备名' }]}
        >
          <Input placeholder="请输入设备名，如：万用表、示波器" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入设备名描述" />
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
