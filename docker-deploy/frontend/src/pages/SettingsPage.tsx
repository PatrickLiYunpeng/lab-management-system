import { useState } from 'react';
import {
  SettingOutlined,
  InfoCircleOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LockOutlined,
  CheckOutlined,
  CloseOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { App, Button, Select, Switch, Tag, Card, Tabs } from 'antd';
import { useAuthStore } from '../stores/authStore';
import {
  permissionLabels,
  permissionCategories,
  hasPermission,
  Permission,
} from '../utils/permissions';
import { PermissionMatrixComponent } from '../components/settings/PermissionMatrix';
import { ModulePermissionMatrix } from '../components/settings/ModulePermissionMatrix';
import { UserRole } from '../types';

// Role labels in Chinese
const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  manager: '经理',
  engineer: '工程师',
  technician: '技术员',
  viewer: '访客',
};

// Role colors
const roleColors: Record<string, 'error' | 'warning' | 'blue' | 'success' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  engineer: 'blue',
  technician: 'success',
  viewer: 'default',
};

type TabKey = 'general' | 'my-permissions' | 'permission-management' | 'module-permission-management';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [compactMode, setCompactMode] = useState(false);
  const [tableSize, setTableSize] = useState<'small' | 'middle' | 'large'>('middle');

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleSavePreferences = () => {
    // In a real app, these would be persisted to localStorage or backend
    localStorage.setItem('lab_settings', JSON.stringify({
      compactMode,
      tableSize,
    }));
    message.success('偏好设置已保存');
  };

  const handleTableSizeChange = (value: string) => {
    setTableSize(value as 'small' | 'middle' | 'large');
  };

  // Tab items with inline content to avoid ESLint react-hooks/static-components error
  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined />
          常规设置
        </span>
      ),
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {/* System Information */}
          <Card
            title={
              <span>
                <InfoCircleOutlined style={{ marginRight: 8, color: '#999' }} />
                系统信息
              </span>
            }
            size="small"
          >
            <dl style={{ margin: 0 }}>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>应用名称</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>实验室管理系统</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>版本号</dt>
                <dd style={{ margin: 0 }}><Tag color="blue">v1.0.0</Tag></dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>API版本</dt>
                <dd style={{ margin: 0 }}><Tag color="success">v1</Tag></dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>前端框架</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>React 19 + TypeScript</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>UI组件库</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>Ant Design 5.x</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>后端框架</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>FastAPI + SQLAlchemy</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex' }}>
                <dt style={{ width: 128, flexShrink: 0, fontSize: 14, color: '#999' }}>系统状态</dt>
                <dd style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontSize: 14, color: '#52c41a' }}>运行正常</span>
                </dd>
              </div>
            </dl>
          </Card>

          {/* User Profile */}
          <Card
            title={
              <span>
                <UserOutlined style={{ marginRight: 8, color: '#999' }} />
                当前用户
              </span>
            }
            size="small"
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, margin: '0 auto', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserOutlined style={{ fontSize: 40, color: '#999' }} />
              </div>
              <h3 style={{ marginTop: 12, fontSize: 18, fontWeight: 500, color: '#333' }}>
                {user?.full_name || user?.username}
              </h3>
              <Tag color={roleColors[user?.role || 'viewer']} style={{ marginTop: 4 }}>
                {roleLabels[user?.role || 'viewer']}
              </Tag>
            </div>

            <dl style={{ margin: 0 }}>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>用户名</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>{user?.username}</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>邮箱</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>{user?.email || '-'}</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>账号状态</dt>
                <dd style={{ margin: 0 }}>
                  {user?.is_active ? (
                    <Tag color="success">已激活</Tag>
                  ) : (
                    <Tag color="error">已禁用</Tag>
                  )}
                </dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>超级管理员</dt>
                <dd style={{ margin: 0 }}>
                  {user?.is_superuser ? (
                    <Tag color="error">是</Tag>
                  ) : (
                    <Tag>否</Tag>
                  )}
                </dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>最后登录</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>
                  {user?.last_login
                    ? new Date(user.last_login).toLocaleString()
                    : '-'}
                </dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>创建时间</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : '-'}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Display Preferences */}
          <Card
            title={
              <span>
                <BgColorsOutlined style={{ marginRight: 8, color: '#999' }} />
                显示偏好
              </span>
            }
            size="small"
          >
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>紧凑模式</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Switch
                  checked={compactMode}
                  onChange={setCompactMode}
                />
                <span style={{ fontSize: 14, color: '#999' }}>
                  {compactMode ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>表格大小</label>
              <Select
                value={tableSize}
                onChange={handleTableSizeChange}
                style={{ width: 192 }}
                options={[
                  { label: '小', value: 'small' },
                  { label: '中', value: 'middle' },
                  { label: '大', value: 'large' },
                ]}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '16px 0' }} />

            <Button type="primary" onClick={handleSavePreferences}>
              保存偏好设置
            </Button>
          </Card>

          {/* Security Settings */}
          <Card
            title={
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 8, color: '#999' }} />
                安全设置
              </span>
            }
            size="small"
          >
            <dl style={{ margin: 0 }}>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>认证方式</dt>
                <dd style={{ margin: 0 }}><Tag color="blue">JWT Token</Tag></dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>Token有效期</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>24 小时</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>密码策略</dt>
                <dd style={{ fontSize: 14, color: '#333', margin: 0 }}>最少8位字符</dd>
              </div>
              <div style={{ padding: '8px 0', display: 'flex' }}>
                <dt style={{ width: 112, flexShrink: 0, fontSize: 14, color: '#999' }}>会话状态</dt>
                <dd style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontSize: 14, color: '#52c41a' }}>已认证</span>
                </dd>
              </div>
            </dl>

            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '16px 0' }} />

            <p style={{ fontSize: 14, color: '#999', margin: 0 }}>
              如需修改密码或其他安全设置，请联系系统管理员。
            </p>
          </Card>
        </div>
      ),
    },
    {
      key: 'my-permissions',
      label: (
        <span>
          <LockOutlined />
          我的权限
        </span>
      ),
      children: (
        <Card
          title={
            <span>
              <LockOutlined style={{ marginRight: 8, color: '#999' }} />
              权限列表
              <Tag color={roleColors[user?.role || 'viewer']} style={{ marginLeft: 8 }}>
                {roleLabels[user?.role || 'viewer']}
              </Tag>
            </span>
          }
        >
          <p style={{ fontSize: 14, color: '#999', marginBottom: 16 }}>
            以下是您当前角色所拥有的系统权限：
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {Object.entries(permissionCategories).map(([key, category]) => (
              <div key={key} style={{ backgroundColor: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>{category.label}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {category.permissions.map((permission: Permission) => {
                    const has = hasPermission(user?.role, permission);
                    return (
                      <li key={permission} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {has ? (
                          <CheckOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseOutlined style={{ color: '#ff7875' }} />
                        )}
                        <span style={{ fontSize: 12, color: has ? '#333' : '#bfbfbf' }}>
                          {permissionLabels[permission]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    ...(isAdmin ? [{
      key: 'permission-management',
      label: (
        <span>
          <SafetyCertificateOutlined />
          操作权限管理
          <Tag color="error" style={{ marginLeft: 4, fontSize: 11 }}>管理员</Tag>
        </span>
      ),
      children: <PermissionMatrixComponent />,
    }, {
      key: 'module-permission-management',
      label: (
        <span>
          <AppstoreOutlined />
          模块权限管理
          <Tag color="error" style={{ marginLeft: 4, fontSize: 11 }}>管理员</Tag>
        </span>
      ),
      children: <ModulePermissionMatrix />,
    }] : []),
  ];

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#333', marginBottom: 24 }}>系统设置</h1>
      
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />
    </div>
  );
}
