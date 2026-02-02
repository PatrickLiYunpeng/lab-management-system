import { useState } from 'react';
import { Modal, Input, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { userService } from '../../services/userService';
import type { User } from '../../types';

interface PasswordResetModalProps {
  visible: boolean;
  user: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PasswordFormValues {
  new_password: string;
  confirm_password: string;
}

export function PasswordResetModal({ visible, user, onSuccess, onCancel }: PasswordResetModalProps) {
  const [form] = useForm<PasswordFormValues>({
    initialValues: {
      new_password: '',
      confirm_password: '',
    },
    rules: {
      new_password: [
        { required: true, message: '请输入新密码' },
        { min: 8, message: '密码至少8个字符' },
      ],
      confirm_password: [
        { required: true, message: '请确认新密码' },
      ],
    },
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();
      
      // Custom validation for password confirmation
      if (values.new_password !== values.confirm_password) {
        toast.error('两次输入的密码不一致');
        return;
      }

      setLoading(true);

      await userService.resetPassword(user.id, values.new_password);
      toast.success('密码重置成功');
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const msg = error instanceof Error ? error.message : '密码重置失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={`重置密码 - ${user?.username || ''}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认重置"
      cancelText="取消"
      width={400}
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <FormItem name="new_password" label="新密码">
          <Input type="password" placeholder="请输入新密码" />
        </FormItem>

        <FormItem name="confirm_password" label="确认密码">
          <Input type="password" placeholder="请再次输入新密码" />
        </FormItem>
      </Form>
    </Modal>
  );
}
