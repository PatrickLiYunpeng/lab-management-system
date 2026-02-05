import { useEffect, useState, useCallback } from 'react';
import {
  ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  modulePermissionService,
  type ModuleMatrix,
} from '../../services/modulePermissionService';
import {
  Button,
  Table,
  Tag,
  Switch,
  Spin,
  Alert,
  Tooltip,
  Popconfirm,
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

// 模块类别定义
const MODULE_CATEGORIES: Record<string, string> = {
  core: '核心业务',
  resource: '资源管理',
  analytics: '分析报表',
  admin: '系统管理',
};

// 角色颜色
const ROLE_COLORS: Record<string, 'error' | 'warning' | 'blue' | 'success' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  engineer: 'blue',
  technician: 'success',
  viewer: 'default',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  manager: '经理',
  engineer: '工程师',
  technician: '技术员',
  viewer: '访客',
};

interface ModuleRow {
  key: string;
  module_code: string;
  module_label: string;
  category: string;
  admin: boolean;
  manager: boolean;
  engineer: boolean;
  technician: boolean;
  viewer: boolean;
}

export function ModulePermissionMatrix() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<ModuleMatrix | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modulePermissionService.getModuleMatrix();
      setMatrix(data);
    } catch {
      message.error('获取模块权限矩阵失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const handleModulePermissionChange = async (role: string, moduleCode: string, canAccess: boolean) => {
    // Admin permissions cannot be changed
    if (role === 'admin') {
      message.warning('管理员权限不可修改');
      return;
    }

    const key = `${role}-${moduleCode}`;
    setSaving(key);

    try {
      await modulePermissionService.updateModulePermission(role, moduleCode, canAccess);
      message.success('模块权限已更新');
      
      // Update local state
      if (matrix) {
        const newMatrix = { ...matrix };
        const roleData = newMatrix.roles.find(r => r.role === role);
        if (roleData) {
          const moduleData = roleData.modules.find(m => m.module_code === moduleCode);
          if (moduleData) {
            moduleData.can_access = canAccess;
          }
        }
        setMatrix(newMatrix);
      }
    } catch {
      message.error('模块权限更新失败');
    } finally {
      setSaving(null);
    }
  };

  const handleResetToDefaults = async (role?: string) => {
    try {
      const result = await modulePermissionService.resetModulePermissionsToDefaults(role);
      message.success(`已重置 ${result.reset_count} 个模块权限到默认值`);
      fetchMatrix();
    } catch {
      message.error('重置失败');
    }
  };

  // Transform matrix data into table rows
  const getTableData = (): ModuleRow[] => {
    if (!matrix) return [];

    const rows: ModuleRow[] = [];
    
    // Get module list from the first role (all roles have same modules)
    const firstRole = matrix.roles[0];
    if (!firstRole) return [];

    for (const module of firstRole.modules) {
      const row: ModuleRow = {
        key: module.module_code,
        module_code: module.module_code,
        module_label: module.module_label,
        category: module.category,
        admin: true, // Admin always has all permissions
        manager: false,
        engineer: false,
        technician: false,
        viewer: false,
      };

      // Fill in each role's module permission status
      for (const roleData of matrix.roles) {
        const mod = roleData.modules.find(m => m.module_code === module.module_code);
        if (mod) {
          if (roleData.role === 'admin') row.admin = mod.can_access;
          else if (roleData.role === 'manager') row.manager = mod.can_access;
          else if (roleData.role === 'engineer') row.engineer = mod.can_access;
          else if (roleData.role === 'technician') row.technician = mod.can_access;
          else if (roleData.role === 'viewer') row.viewer = mod.can_access;
        }
      }

      rows.push(row);
    }

    return rows;
  };

  const renderModuleSwitch = (enabled: boolean, record: ModuleRow, role: string) => {
    const isAdmin = role === 'admin';
    const key = `${role}-${record.module_code}`;
    const isSaving = saving === key;

    return (
      <Tooltip title={isAdmin ? '管理员权限不可修改' : undefined}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Switch
            checked={enabled}
            disabled={isAdmin || isSaving}
            onChange={(checked) => handleModulePermissionChange(role, record.module_code, checked)}
            size="small"
          />
        </div>
      </Tooltip>
    );
  };

  const columns: ColumnsType<ModuleRow> = [
    {
      title: '模块名称',
      dataIndex: 'module_label',
      key: 'module_label',
      width: 180,
      fixed: 'left',
      render: (text: unknown, record) => (
        <div>
          <div style={{ fontSize: 14, color: '#171717' }}>{String(text)}</div>
          <div style={{ fontSize: 12, color: '#737373' }}>{record.module_code}</div>
        </div>
      ),
    },
    {
      title: <Tag color={ROLE_COLORS.admin}>{ROLE_LABELS.admin}</Tag>,
      dataIndex: 'admin',
      key: 'admin',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderModuleSwitch(Boolean(enabled), record, 'admin'),
    },
    {
      title: <Tag color={ROLE_COLORS.manager}>{ROLE_LABELS.manager}</Tag>,
      dataIndex: 'manager',
      key: 'manager',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderModuleSwitch(Boolean(enabled), record, 'manager'),
    },
    {
      title: <Tag color={ROLE_COLORS.engineer}>{ROLE_LABELS.engineer}</Tag>,
      dataIndex: 'engineer',
      key: 'engineer',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderModuleSwitch(Boolean(enabled), record, 'engineer'),
    },
    {
      title: <Tag color={ROLE_COLORS.technician}>{ROLE_LABELS.technician}</Tag>,
      dataIndex: 'technician',
      key: 'technician',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderModuleSwitch(Boolean(enabled), record, 'technician'),
    },
    {
      title: <Tag color={ROLE_COLORS.viewer}>{ROLE_LABELS.viewer}</Tag>,
      dataIndex: 'viewer',
      key: 'viewer',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderModuleSwitch(Boolean(enabled), record, 'viewer'),
    },
  ];

  // Group rows by category
  const tableData = getTableData();

  // Get unique categories in order
  const categories = ['core', 'resource', 'analytics', 'admin'];

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e5e5', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined style={{ fontSize: 16, color: '#3b82f6' }} />
          <span style={{ fontWeight: 500, color: '#171717' }}>模块访问权限管理</span>
          <Tag color="blue">仅管理员可见</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Popconfirm
            title="重置所有模块权限"
            description="确定要将所有角色的模块权限重置为默认值吗？"
            onConfirm={() => handleResetToDefaults()}
            okText="确定"
            cancelText="取消"
          >
            <Button
              size="small"
              icon={<ReloadOutlined />}
            >
              重置为默认
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Alert
          type="info"
          message="模块权限管理说明"
          description="在此页面可以配置每个角色对系统各功能模块的访问权限。管理员角色拥有所有模块访问权限且不可修改。模块权限与操作权限并行生效，用户需要同时具有模块访问权限和操作权限才能执行相应操作。"
          style={{ marginBottom: 16 }}
        />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          categories.map((catKey) => {
            const categoryRows = tableData.filter(row => row.category === catKey);
            if (categoryRows.length === 0) return null;

            return (
              <div key={catKey} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#171717', marginBottom: 12 }}>
                  {MODULE_CATEGORIES[catKey] || catKey}
                </h3>
                <Table
                  columns={columns}
                  dataSource={categoryRows}
                  rowKey="key"
                  size="small"
                  bordered
                  pagination={false}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
