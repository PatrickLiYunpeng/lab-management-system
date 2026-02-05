import { useEffect, useState, useCallback } from 'react';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
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
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

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
      'assign_technician', 'execute_subtask', 'verify_results', 
      'view_work_order_query', 'initiate_handover',
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
  const { message } = App.useApp();
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
      message.error('获取权限矩阵失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const fetchChangeLogs = async () => {
    setHistoryLoading(true);
    try {
      const logs = await permissionService.getChangeLogs({ limit: 50 });
      setChangeLogs(logs);
    } catch {
      message.error('获取变更历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePermissionChange = async (role: string, permission: string, enabled: boolean) => {
    // Admin permissions cannot be changed
    if (role === 'admin') {
      message.warning('管理员权限不可修改');
      return;
    }

    const key = `${role}-${permission}`;
    setSaving(key);

    try {
      await permissionService.updatePermission(role, permission, enabled);
      message.success('权限已更新');
      
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
      message.error('权限更新失败');
    } finally {
      setSaving(null);
    }
  };

  const handleResetToDefaults = async (role?: string) => {
    try {
      const result = await permissionService.resetToDefaults(role);
      message.success(`已重置 ${result.reset_count} 个权限到默认值`);
      fetchMatrix();
    } catch {
      message.error('重置失败');
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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
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

  const columns: ColumnsType<PermissionRow> = [
    {
      title: '权限名称',
      dataIndex: 'permission_label',
      key: 'permission_label',
      width: 200,
      fixed: 'left',
      render: (text: unknown, record) => (
        <div>
          <div style={{ fontSize: 14, color: '#171717' }}>{String(text)}</div>
          <div style={{ fontSize: 12, color: '#737373' }}>{record.permission}</div>
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
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e5e5', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500, color: '#171717' }}>权限矩阵管理</span>
          <Tag color="blue">仅管理员可见</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            size="small"
            icon={<ClockCircleOutlined />}
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
          message="权限管理说明"
          description="在此页面可以配置每个角色对系统各功能模块的访问权限。管理员角色拥有所有权限且不可修改。权限变更将实时生效。"
          style={{ marginBottom: 16 }}
        />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          Object.entries(PERMISSION_CATEGORIES).map(([catKey, catInfo]) => {
            const categoryRows = tableData.filter(row => row.category === catKey);
            if (categoryRows.length === 0) return null;

            return (
              <div key={catKey} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#171717', marginBottom: 12 }}>
                  {catInfo.label}
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

      <Modal
        title="权限变更历史"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        width={800}
        footer={null}
      >
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : changeLogs.length === 0 ? (
          <p style={{ color: '#737373', textAlign: 'center', padding: '24px 0' }}>暂无变更记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 384, overflowY: 'auto' }}>
            {changeLogs.map((log, index) => (
              <div key={index} style={{ display: 'flex', gap: 12 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {log.new_value ? (
                    <CheckCircleOutlined style={{ fontSize: 20, color: '#22c55e' }} />
                  ) : (
                    <CloseCircleOutlined style={{ fontSize: 20, color: '#ef4444' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500, color: '#171717' }}>
                      {ROLE_LABELS[log.role] || log.role}
                    </span>
                    <span style={{ color: '#737373' }}>的</span>
                    <code style={{ padding: '2px 6px', background: '#f5f5f5', borderRadius: 4, fontSize: 14 }}>{log.permission}</code>
                    <span style={{ color: '#737373' }}>权限</span>
                    <Tag color={log.new_value ? 'success' : 'error'}>
                      {log.new_value ? '已启用' : '已禁用'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 4 }}>
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
