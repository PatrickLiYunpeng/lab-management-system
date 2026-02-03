import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Table, Button, Input, Select, Tag, Popconfirm, Tooltip, App, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { userService } from '../services/userService';
import { isAbortError } from '../services/api';
import { UserModal } from '../components/users/UserModal';
import { PasswordResetModal } from '../components/users/PasswordResetModal';
import type { User } from '../types';
import { UserRole } from '../types';
import { useAuthStore } from '../stores/authStore';

const roleLabels: Record<string, { label: string; color: 'red' | 'orange' | 'blue' | 'green' | 'default' }> = {
  admin: { label: '管理员', color: 'red' },
  manager: { label: '经理', color: 'orange' },
  engineer: { label: '工程师', color: 'blue' },
  technician: { label: '技术员', color: 'green' },
  viewer: { label: '访客', color: 'default' },
};

const roleOptions = [
  { value: '', label: '全部角色' },
  { value: UserRole.ADMIN, label: '管理员' },
  { value: UserRole.MANAGER, label: '经理' },
  { value: UserRole.ENGINEER, label: '工程师' },
  { value: UserRole.TECHNICIAN, label: '技术员' },
  { value: UserRole.VIEWER, label: '访客' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'true', label: '启用' },
  { value: 'false', label: '禁用' },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { message } = App.useApp();
  const errorShownRef = useRef(false);
  const { user: currentUser } = useAuthStore();

  const fetchUsers = useCallback(
    async (page = 1, pageSize = 10, search = '', role = '', status = '') => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page,
          page_size: pageSize,
        };
        if (search) params.search = search;
        if (role) params.role = role;
        if (status !== '') params.is_active = status === 'true';

        const response = await userService.getUsers(params);
        setUsers(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
        errorShownRef.current = false;
      } catch (err) {
        if (!isAbortError(err)) {
          if (!errorShownRef.current) {
            errorShownRef.current = true;
            message.error('获取用户列表失败');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
        fetchUsers(1, pagination.pageSize, searchValue, roleFilter, statusFilter);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText, pagination.pageSize, roleFilter, statusFilter, fetchUsers]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchUsers(paginationConfig.current || 1, paginationConfig.pageSize || 10, searchText, roleFilter, statusFilter);
  };

  const handleRoleFilterChange = (value: string | undefined) => {
    const v = value || '';
    setRoleFilter(v);
    fetchUsers(1, pagination.pageSize, searchText, v, statusFilter);
  };

  const handleStatusFilterChange = (value: string | undefined) => {
    const v = value || '';
    setStatusFilter(v);
    fetchUsers(1, pagination.pageSize, searchText, roleFilter, v);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    setModalVisible(true);
  };

  const handleResetPassword = (record: User) => {
    setSelectedUser(record);
    setPasswordModalVisible(true);
  };

  const handleToggleStatus = async (record: User) => {
    try {
      if (record.is_active) {
        await userService.deactivateUser(record.id);
        message.success('用户已禁用');
      } else {
        await userService.activateUser(record.id);
        message.success('用户已启用');
      }
      fetchUsers(pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('操作失败');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await userService.deleteUser(id);
      message.success('删除成功');
      fetchUsers(pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingUser(null);
    fetchUsers(pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingUser(null);
  };

  const handlePasswordModalSuccess = () => {
    setPasswordModalVisible(false);
    setSelectedUser(null);
  };

  const handlePasswordModalCancel = () => {
    setPasswordModalVisible(false);
    setSelectedUser(null);
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 120,
      render: (value) => (value as string) || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (value) => {
        const role = value as string;
        const roleInfo = roleLabels[role] || { label: role, color: 'default' as const };
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value) => (
        <Tag color={(value as boolean) ? 'success' : 'red'}>
          {(value as boolean) ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (value) => new Date(value as string).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => {
        const isSelf = currentUser?.id === record.id;
        return (
          <Space size={4}>
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Tooltip title="重置密码">
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => handleResetPassword(record)}
              />
            </Tooltip>
            <Tooltip title={record.is_active ? '禁用' : '启用'}>
              <Button
                type="link"
                size="small"
                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggleStatus(record)}
                disabled={isSelf}
                style={{ color: record.is_active ? '#faad14' : '#52c41a' }}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除"
              description={`确定要删除用户 "${record.username}" 吗？`}
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? '不能删除自己' : '删除'}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isSelf}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户名、姓名或邮箱"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={roleFilter || undefined}
            onChange={handleRoleFilterChange}
            options={roleOptions}
            style={{ width: 120 }}
            placeholder="全部角色"
            allowClear
          />
          <Select
            value={statusFilter || undefined}
            onChange={handleStatusFilterChange}
            options={statusOptions}
            style={{ width: 120 }}
            placeholder="全部状态"
            allowClear
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />

      <UserModal
        visible={modalVisible}
        user={editingUser}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />

      <PasswordResetModal
        visible={passwordModalVisible}
        user={selectedUser}
        onSuccess={handlePasswordModalSuccess}
        onCancel={handlePasswordModalCancel}
      />
    </div>
  );
}
