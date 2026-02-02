import { useEffect, useState, useCallback } from 'react';
import {
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  permissionService,
  type PermissionMatrix,
  type PermissionChangeLog,
} from '../../services/permissionService';
import {
  Button,
  Table,
  Tag,
  Switch,
  Modal,
  Spin,
  Alert,
  Tooltip,
  Popconfirm,
  useToast,
  type TableColumn,
} from '../ui';

// Permission categories for grouping
const PERMISSION_CATEGORIES: Record<string, { label: string; permissions: string[] }> = {
  system: {
    label: '系统管理',
    permissions: ['manage_users', 'manage_sites', 'manage_laboratories', 'manage_locations'],
  },
  clients: {
    label: '客户与SLA',
    permissions: ['manage_clients', 'manage_client_sla', 'manage_source_categories'],
  },
  skills: {
    label: '技能管理',
    permissions: ['manage_skill_categories', 'manage_skills', 'assign_personnel_skills'],
  },
  personnel: {
    label: '人员管理',
    permissions: ['initiate_borrow', 'approve_borrow', 'manage_shifts'],
  },
  equipment: {
    label: '设备与方法',
    permissions: ['manage_equipment', 'manage_methods'],
  },
  work_orders: {
    label: '工单管理',
    permissions: [
      'create_work_order', 'assign_lead_engineer', 'create_subtask',
      'assign_technician', 'execute_subtask', 'verify_results', 'initiate_handover',
    ],
  },
  materials: {
    label: '材料管理',
    permissions: ['manage_materials', 'allocate_materials', 'handle_material_return', 'confirm_material_alerts'],
  },
  reports: {
    label: '仪表板与报表',
    permissions: [
      'view_lab_dashboard', 'view_all_dashboards', 'view_cycle_time_report',
      'view_skills_matrix', 'view_reports', 'view_audit_logs',
    ],
  },
};

// Role colors
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

interface PermissionRow {
  key: string;
  permission: string;
  permission_label: string;
  category: string;
  category_label: string;
  admin: boolean;
  manager: boolean;
  engineer: boolean;
  technician: boolean;
  viewer: boolean;
}

export function PermissionMatrixComponent() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [changeLogs, setChangeLogs] = useState<PermissionChangeLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionService.getPermissionMatrix();
      setMatrix(data);
    } catch {
      toast.error('获取权限矩阵失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const fetchChangeLogs = async () => {
    setHistoryLoading(true);
    try {
      const logs = await permissionService.getChangeLogs({ limit: 50 });
      setChangeLogs(logs);
    } catch {
      toast.error('获取变更历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePermissionChange = async (role: string, permission: string, enabled: boolean) => {
    // Admin permissions cannot be changed
    if (role === 'admin') {
      toast.warning('管理员权限不可修改');
      return;
    }

    const key = `${role}-${permission}`;
    setSaving(key);

    try {
      await permissionService.updatePermission(role, permission, enabled);
      toast.success('权限已更新');
      
      // Update local state
      if (matrix) {
        const newMatrix = { ...matrix };
        const roleData = newMatrix.roles.find(r => r.role === role);
        if (roleData) {
          const permData = roleData.permissions.find(p => p.permission === permission);
          if (permData) {
            permData.is_enabled = enabled;
          }
        }
        setMatrix(newMatrix);
      }
    } catch {
      toast.error('权限更新失败');
    } finally {
      setSaving(null);
    }
  };

  const handleResetToDefaults = async (role?: string) => {
    try {
      const result = await permissionService.resetToDefaults(role);
      toast.success(`已重置 ${result.reset_count} 个权限到默认值`);
      fetchMatrix();
    } catch {
      toast.error('重置失败');
    }
  };

  const showHistory = () => {
    setHistoryVisible(true);
    fetchChangeLogs();
  };

  // Transform matrix data into table rows
  const getTableData = (): PermissionRow[] => {
    if (!matrix) return [];

    const rows: PermissionRow[] = [];
    
    // Get permission labels from the first role (all roles have same permissions)
    const firstRole = matrix.roles[0];
    if (!firstRole) return [];

    for (const [catKey, catInfo] of Object.entries(PERMISSION_CATEGORIES)) {
      for (const permCode of catInfo.permissions) {
        const permItem = firstRole.permissions.find(p => p.permission === permCode);
        if (!permItem) continue;

        const row: PermissionRow = {
          key: permCode,
          permission: permCode,
          permission_label: permItem.permission_label,
          category: catKey,
          category_label: catInfo.label,
          admin: true, // Admin always has all permissions
          manager: false,
          engineer: false,
          technician: false,
          viewer: false,
        };

        // Fill in each role's permission status
        for (const roleData of matrix.roles) {
          const perm = roleData.permissions.find(p => p.permission === permCode);
          if (perm) {
            if (roleData.role === 'admin') row.admin = perm.is_enabled;
            else if (roleData.role === 'manager') row.manager = perm.is_enabled;
            else if (roleData.role === 'engineer') row.engineer = perm.is_enabled;
            else if (roleData.role === 'technician') row.technician = perm.is_enabled;
            else if (roleData.role === 'viewer') row.viewer = perm.is_enabled;
          }
        }

        rows.push(row);
      }
    }

    return rows;
  };

  const renderPermissionSwitch = (enabled: boolean, record: PermissionRow, role: string) => {
    const isAdmin = role === 'admin';
    const key = `${role}-${record.permission}`;
    const isSaving = saving === key;

    return (
      <Tooltip title={isAdmin ? '管理员权限不可修改' : undefined}>
        <div className="flex justify-center">
          <Switch
            checked={enabled}
            disabled={isAdmin || isSaving}
            onChange={(checked) => handlePermissionChange(role, record.permission, checked)}
            size="small"
          />
        </div>
      </Tooltip>
    );
  };

  const columns: TableColumn<PermissionRow>[] = [
    {
      title: '权限名称',
      dataIndex: 'permission_label',
      key: 'permission_label',
      width: 200,
      fixed: 'left',
      render: (text: unknown, record) => (
        <div>
          <div className="text-sm text-neutral-900">{String(text)}</div>
          <div className="text-xs text-neutral-500">{record.permission}</div>
        </div>
      ),
    },
    {
      title: <Tag color={ROLE_COLORS.admin}>{ROLE_LABELS.admin}</Tag>,
      dataIndex: 'admin',
      key: 'admin',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderPermissionSwitch(Boolean(enabled), record, 'admin'),
    },
    {
      title: <Tag color={ROLE_COLORS.manager}>{ROLE_LABELS.manager}</Tag>,
      dataIndex: 'manager',
      key: 'manager',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderPermissionSwitch(Boolean(enabled), record, 'manager'),
    },
    {
      title: <Tag color={ROLE_COLORS.engineer}>{ROLE_LABELS.engineer}</Tag>,
      dataIndex: 'engineer',
      key: 'engineer',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderPermissionSwitch(Boolean(enabled), record, 'engineer'),
    },
    {
      title: <Tag color={ROLE_COLORS.technician}>{ROLE_LABELS.technician}</Tag>,
      dataIndex: 'technician',
      key: 'technician',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderPermissionSwitch(Boolean(enabled), record, 'technician'),
    },
    {
      title: <Tag color={ROLE_COLORS.viewer}>{ROLE_LABELS.viewer}</Tag>,
      dataIndex: 'viewer',
      key: 'viewer',
      width: 90,
      align: 'center',
      render: (enabled: unknown, record) => renderPermissionSwitch(Boolean(enabled), record, 'viewer'),
    },
  ];

  // Group rows by category
  const tableData = getTableData();

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-900">权限矩阵管理</span>
          <Tag color="blue">仅管理员可见</Tag>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="small"
            icon={<ClockIcon className="w-4 h-4" />}
            onClick={showHistory}
          >
            变更历史
          </Button>
          <Popconfirm
            title="重置所有权限"
            description="确定要将所有角色的权限重置为默认值吗？"
            onConfirm={() => handleResetToDefaults()}
            okText="确定"
            cancelText="取消"
          >
            <Button
              variant="default"
              size="small"
              icon={<ArrowPathIcon className="w-4 h-4" />}
            >
              重置为默认
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="p-4">
        <Alert
          type="info"
          message="权限管理说明"
          description="在此页面可以配置每个角色对系统各功能模块的访问权限。管理员角色拥有所有权限且不可修改。权限变更将实时生效。"
          className="mb-4"
        />

        {loading ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          Object.entries(PERMISSION_CATEGORIES).map(([catKey, catInfo]) => {
            const categoryRows = tableData.filter(row => row.category === catKey);
            if (categoryRows.length === 0) return null;

            return (
              <div key={catKey} className="mb-6">
                <h3 className="text-base font-medium text-neutral-900 mb-3">
                  {catInfo.label}
                </h3>
                <Table
                  columns={columns}
                  dataSource={categoryRows}
                  rowKey="key"
                  size="small"
                  bordered
                />
              </div>
            );
          })
        )}
      </div>

      <Modal
        title="权限变更历史"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        size="large"
        footer={null}
      >
        {historyLoading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : changeLogs.length === 0 ? (
          <p className="text-neutral-500 text-center py-6">暂无变更记录</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {changeLogs.map((log, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {log.new_value ? (
                    <CheckCircleIcon className="w-5 h-5 text-success-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-error-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-900">
                      {ROLE_LABELS[log.role] || log.role}
                    </span>
                    <span className="text-neutral-500">的</span>
                    <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm">{log.permission}</code>
                    <span className="text-neutral-500">权限</span>
                    <Tag color={log.new_value ? 'success' : 'error'}>
                      {log.new_value ? '已启用' : '已禁用'}
                    </Tag>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {new Date(log.changed_at).toLocaleString('zh-CN')}
                    {log.reason && ` - ${log.reason}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
