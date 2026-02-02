import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, Form, App } from 'antd';
import { userService, type UserFormData, type UserUpdateData } from '../../services/userService';
import { siteService } from '../../services/siteService';
import { laboratoryService } from '../../services/laboratoryService';
import type { User, Site, Laboratory } from '../../types';
import { UserRole } from '../../types';

interface UserModalProps {
  visible: boolean;
  user: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const roleOptions = [
  { value: UserRole.ADMIN, label: '管理员' },
  { value: UserRole.MANAGER, label: '经理' },
  { value: UserRole.ENGINEER, label: '工程师' },
  { value: UserRole.TECHNICIAN, label: '技术员' },
  { value: UserRole.VIEWER, label: '访客' },
];

interface UserFormValues {
  username: string;
  email: string;
  password?: string;
  full_name?: string;
  role: string;
  primary_site_id?: number;
  primary_laboratory_id?: number;
  is_active?: boolean;
}

export function UserModal({ visible, user, onSuccess, onCancel }: UserModalProps) {
  const [form] = Form.useForm<UserFormValues>();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const { message } = App.useApp();

  const isEditing = !!user;

  const loadSites = async () => {
    try {
      const response = await siteService.getSites({ page_size: 100 });
      setSites(response.items);
    } catch {
      message.error('获取站点列表失败');
    }
  };

  const loadLaboratories = async (siteId: number) => {
    try {
      const response = await laboratoryService.getLaboratories({ 
        site_id: siteId, 
        page_size: 100 
      });
      setLaboratories(response.items);
    } catch {
      message.error('获取实验室列表失败');
    }
  };

  useEffect(() => {
    if (visible) {
      loadSites();
      if (user) {
        form.setFieldsValue({
          username: user.username,
          email: user.email,
          full_name: user.full_name || '',
          role: user.role,
          primary_site_id: user.primary_site_id,
          primary_laboratory_id: user.primary_laboratory_id,
          is_active: user.is_active,
        });
        setSelectedSiteId(user.primary_site_id);
        if (user.primary_site_id) {
          loadLaboratories(user.primary_site_id);
        }
      } else {
        form.resetFields();
        form.setFieldValue('role', UserRole.VIEWER);
        form.setFieldValue('is_active', true);
        setSelectedSiteId(undefined);
        setLaboratories([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user]);

  const handleSiteChange = (value: number) => {
    setSelectedSiteId(value);
    form.setFieldValue('primary_laboratory_id', undefined);
    if (value) {
      loadLaboratories(value);
    } else {
      setLaboratories([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEditing) {
        const updateData: UserUpdateData = {
          username: values.username,
          email: values.email,
          full_name: values.full_name || undefined,
          role: values.role as UserRole,
          primary_site_id: values.primary_site_id || undefined,
          primary_laboratory_id: values.primary_laboratory_id || undefined,
          is_active: values.is_active,
        };
        await userService.updateUser(user.id, updateData);
        message.success('用户更新成功');
      } else {
        if (!values.password || values.password.length < 8) {
          message.error('密码至少8个字符');
          setLoading(false);
          return;
        }
        const createData: UserFormData = {
          username: values.username,
          email: values.email,
          password: values.password,
          full_name: values.full_name || undefined,
          role: values.role as UserRole,
          primary_site_id: values.primary_site_id || undefined,
          primary_laboratory_id: values.primary_laboratory_id || undefined,
        };
        await userService.createUser(createData);
        message.success('用户创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const msg = error instanceof Error ? error.message : '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEditing ? '编辑用户' : '新增用户'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEditing ? '保存' : '创建'}
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 50, message: '用户名最多50个字符' },
          ]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码（至少8个字符）" />
          </Form.Item>
        )}

        <Form.Item name="full_name" label="姓名">
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
          <Select placeholder="请选择角色" options={roleOptions} />
        </Form.Item>

        <Form.Item name="primary_site_id" label="所属站点">
          <Select
            placeholder="请选择站点"
            allowClear
            onChange={handleSiteChange}
            options={sites.map(site => ({
              value: site.id,
              label: site.name,
            }))}
          />
        </Form.Item>

        <Form.Item name="primary_laboratory_id" label="所属实验室">
          <Select
            placeholder={selectedSiteId ? '请选择实验室' : '请先选择站点'}
            allowClear
            disabled={!selectedSiteId}
            options={laboratories.map(lab => ({
              value: lab.id,
              label: lab.name,
            }))}
          />
        </Form.Item>

        {isEditing && (
          <Form.Item name="is_active" label="账户状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
