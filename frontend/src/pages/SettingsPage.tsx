import { useState } from 'react';
import {
  Cog6ToothIcon,
  InformationCircleIcon,
  SwatchIcon,
  ShieldCheckIcon,
  UserIcon,
  CheckCircleIcon,
  LockClosedIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import {
  permissionLabels,
  permissionCategories,
  hasPermission,
  Permission,
} from '../utils/permissions';
import { PermissionMatrixComponent } from '../components/settings/PermissionMatrix';
import { UserRole } from '../types';
import { Button, Select, Switch, Tag, useToast } from '../components/ui';

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

type TabKey = 'general' | 'my-permissions' | 'permission-management';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const toast = useToast();
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
    toast.success('偏好设置已保存');
  };

  const handleTableSizeChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTableSize(v as 'small' | 'middle' | 'large');
  };

  // Tab definitions
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    {
      key: 'general',
      label: '常规设置',
      icon: <Cog6ToothIcon className="w-4 h-4" />,
    },
    {
      key: 'my-permissions',
      label: '我的权限',
      icon: <LockClosedIcon className="w-4 h-4" />,
    },
    ...(isAdmin ? [{
      key: 'permission-management' as TabKey,
      label: '权限管理',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      adminOnly: true,
    }] : []),
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">系统设置</h1>
      
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.adminOnly && <Tag color="error" className="text-xs ml-1">管理员</Tag>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Information */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
              <InformationCircleIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-900">系统信息</span>
            </div>
            <div className="p-4">
              <dl className="divide-y divide-neutral-100">
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">应用名称</dt>
                  <dd className="text-sm text-neutral-900">实验室管理系统</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">版本号</dt>
                  <dd><Tag color="blue">v1.0.0</Tag></dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">API版本</dt>
                  <dd><Tag color="success">v1</Tag></dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">前端框架</dt>
                  <dd className="text-sm text-neutral-900">React 19 + TypeScript</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">UI组件库</dt>
                  <dd className="text-sm text-neutral-900">Tailwind CSS + Headless UI</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">后端框架</dt>
                  <dd className="text-sm text-neutral-900">FastAPI + SQLAlchemy</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-32 flex-shrink-0 text-sm text-neutral-500">系统状态</dt>
                  <dd className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-success-500" />
                    <span className="text-sm text-success-600">运行正常</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* User Profile */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
              <UserIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-900">当前用户</span>
            </div>
            <div className="p-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-neutral-200 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-neutral-500" />
                </div>
                <h3 className="mt-3 text-lg font-medium text-neutral-900">
                  {user?.full_name || user?.username}
                </h3>
                <Tag color={roleColors[user?.role || 'viewer']} className="mt-1">
                  {roleLabels[user?.role || 'viewer']}
                </Tag>
              </div>

              <dl className="divide-y divide-neutral-100">
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">用户名</dt>
                  <dd className="text-sm text-neutral-900">{user?.username}</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">邮箱</dt>
                  <dd className="text-sm text-neutral-900">{user?.email || '-'}</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">账号状态</dt>
                  <dd>
                    {user?.is_active ? (
                      <Tag color="success">已激活</Tag>
                    ) : (
                      <Tag color="error">已禁用</Tag>
                    )}
                  </dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">超级管理员</dt>
                  <dd>
                    {user?.is_superuser ? (
                      <Tag color="error">是</Tag>
                    ) : (
                      <Tag>否</Tag>
                    )}
                  </dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">最后登录</dt>
                  <dd className="text-sm text-neutral-900">
                    {user?.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : '-'}
                  </dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">创建时间</dt>
                  <dd className="text-sm text-neutral-900">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : '-'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
              <SwatchIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-900">显示偏好</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">紧凑模式</label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={compactMode}
                    onChange={setCompactMode}
                  />
                  <span className="text-sm text-neutral-500">
                    {compactMode ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">表格大小</label>
                <Select
                  value={tableSize}
                  onChange={handleTableSizeChange}
                  className="w-48"
                  options={[
                    { label: '小', value: 'small' },
                    { label: '中', value: 'middle' },
                    { label: '大', value: 'large' },
                  ]}
                />
              </div>

              <hr className="border-neutral-200" />

              <Button variant="primary" onClick={handleSavePreferences}>
                保存偏好设置
              </Button>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
              <ShieldCheckIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-900">安全设置</span>
            </div>
            <div className="p-4">
              <dl className="divide-y divide-neutral-100">
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">认证方式</dt>
                  <dd><Tag color="blue">JWT Token</Tag></dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">Token有效期</dt>
                  <dd className="text-sm text-neutral-900">24 小时</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">密码策略</dt>
                  <dd className="text-sm text-neutral-900">最少8位字符</dd>
                </div>
                <div className="py-2 flex">
                  <dt className="w-28 flex-shrink-0 text-sm text-neutral-500">会话状态</dt>
                  <dd className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-success-500" />
                    <span className="text-sm text-success-600">已认证</span>
                  </dd>
                </div>
              </dl>

              <hr className="my-4 border-neutral-200" />

              <p className="text-sm text-neutral-500">
                如需修改密码或其他安全设置，请联系系统管理员。
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'my-permissions' && (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
            <LockClosedIcon className="w-5 h-5 text-neutral-500" />
            <span className="font-medium text-neutral-900">权限列表</span>
            <Tag color={roleColors[user?.role || 'viewer']}>
              {roleLabels[user?.role || 'viewer']}
            </Tag>
          </div>
          <div className="p-4">
            <p className="text-sm text-neutral-500 mb-4">
              以下是您当前角色所拥有的系统权限：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(permissionCategories).map(([key, category]) => (
                <div key={key} className="bg-neutral-50 rounded-lg border border-neutral-200 p-3">
                  <h4 className="text-sm font-medium text-neutral-900 mb-2">{category.label}</h4>
                  <ul className="space-y-1">
                    {category.permissions.map((permission: Permission) => {
                      const has = hasPermission(user?.role, permission);
                      return (
                        <li key={permission} className="flex items-center gap-2">
                          {has ? (
                            <CheckIcon className="w-4 h-4 text-success-500" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 text-error-400" />
                          )}
                          <span className={`text-xs ${has ? 'text-neutral-700' : 'text-neutral-400'}`}>
                            {permissionLabels[permission]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permission-management' && isAdmin && (
        <PermissionMatrixComponent />
      )}
    </div>
  );
}
