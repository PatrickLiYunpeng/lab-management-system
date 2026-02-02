import { useEffect, useState, useCallback, useRef } from 'react';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined,
  UserOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { App, Table, Button, Input, Select, Tag, Modal, Tooltip, DatePicker, Card } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { auditLogService } from '../services/auditLogService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type { AuditLog } from '../services/auditLogService';
import type { Laboratory } from '../types';

const actionLabels: Record<string, { text: string; color: 'success' | 'processing' | 'error' | 'default' | 'warning' }> = {
  create: { text: '创建', color: 'success' },
  update: { text: '更新', color: 'processing' },
  delete: { text: '删除', color: 'error' },
  login: { text: '登录', color: 'processing' },
  logout: { text: '登出', color: 'default' },
  view: { text: '查看', color: 'default' },
  export: { text: '导出', color: 'processing' },
  approve: { text: '批准', color: 'success' },
  reject: { text: '拒绝', color: 'warning' },
  assign: { text: '分配', color: 'processing' },
  complete: { text: '完成', color: 'success' },
  cancel: { text: '取消', color: 'default' },
};

const entityTypeLabels: Record<string, string> = {
  work_order: '工单',
  user: '用户',
  personnel: '人员',
  equipment: '设备',
  material: '材料',
  laboratory: '实验室',
  site: '站点',
  skill: '技能',
  method: '方法',
  handover: '交接',
  client: '客户',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  const [filters, setFilters] = useState<{
    search: string;
    action?: string;
    entity_type?: string;
    laboratory_id?: number;
    startDate?: Dayjs;
    endDate?: Dayjs;
  }>({
    search: '',
  });
  
  const [searchValue, setSearchValue] = useState('');
  
  // Ref to store abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const { message } = App.useApp();

  const fetchLogs = useCallback(async (page = 1, pageSize = 20, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
        signal,
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.laboratory_id) params.laboratory_id = filters.laboratory_id;
      if (filters.startDate) params.start_date = filters.startDate.format('YYYY-MM-DD');
      if (filters.endDate) params.end_date = filters.endDate.format('YYYY-MM-DD');
      
      const response = await auditLogService.getAuditLogs(params);
      setLogs(response.items);
      setPagination({
        current: response.page,
        pageSize: response.page_size,
        total: response.total,
      });
    } catch (err) {
      // Ignore abort errors
      if (!isAbortError(err)) {
        message.error('获取审计日志失败');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, message]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [labsResponse, actionsResponse, typesResponse] = await Promise.all([
        laboratoryService.getLaboratories({ page_size: 100 }),
        auditLogService.getAuditActions(),
        auditLogService.getEntityTypes(),
      ]);
      setLaboratories(labsResponse.items);
      setActions(actionsResponse);
      setEntityTypes(typesResponse);
    } catch {
      console.error('Failed to fetch reference data');
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // Audit logs fetch with AbortController for request cancellation
  useEffect(() => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchLogs(pagination.current, pagination.pageSize, controller.signal);
    
    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchValue }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchLogs(paginationConfig.current || 1, paginationConfig.pageSize || 20, controller.signal);
  };

  const handleViewDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const getLabName = (labId?: number) => {
    if (!labId) return '-';
    const lab = laboratories.find((l) => l.id === labId);
    return lab ? lab.name : '-';
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserOutlined style={{ color: '#999' }} />
          <span>{username || '-'}</span>
          {record.user_role && (
            <Tag style={{ fontSize: 11 }}>{record.user_role}</Tag>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: (action: string) => {
        const config = actionLabels[action] || { text: action, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '实体类型',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 100,
      render: (type: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileTextOutlined style={{ color: '#999' }} />
          <span>{entityTypeLabels[type] || type}</span>
        </div>
      ),
    },
    {
      title: '实体名称',
      dataIndex: 'entity_name',
      key: 'entity_name',
      width: 180,
      render: (name: string, record) => (
        <Tooltip title={`ID: ${record.entity_id || '-'}`}>
          <span style={{ cursor: 'help' }}>{name || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 140,
      render: (labId: number) => getLabName(labId),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="审计日志"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>
            刷新
          </Button>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Input
            placeholder="搜索用户名、实体名称或描述"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 256 }}
            allowClear
          />
          <Select
            placeholder="操作类型"
            value={filters.action}
            onChange={(value) => handleFilterChange('action', value)}
            style={{ width: 128 }}
            allowClear
            options={actions.map((action) => ({
              label: actionLabels[action]?.text || action,
              value: action,
            }))}
          />
          <Select
            placeholder="实体类型"
            value={filters.entity_type}
            onChange={(value) => handleFilterChange('entity_type', value)}
            style={{ width: 128 }}
            allowClear
            options={entityTypes.map((type) => ({
              label: entityTypeLabels[type] || type,
              value: type,
            }))}
          />
          <Select
            placeholder="实验室"
            value={filters.laboratory_id}
            onChange={(value) => handleFilterChange('laboratory_id', value)}
            style={{ width: 176 }}
            allowClear
            options={laboratories.map((lab) => ({
              label: lab.name,
              value: lab.id,
            }))}
          />
          <DatePicker
            placeholder="开始日期"
            value={filters.startDate}
            onChange={(date) => handleFilterChange('startDate', date)}
            style={{ width: 144 }}
          />
          <DatePicker
            placeholder="结束日期"
            value={filters.endDate}
            onChange={(date) => handleFilterChange('endDate', date)}
            style={{ width: 144 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="审计日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 1, 
            backgroundColor: '#e5e5e5', 
            border: '1px solid #e5e5e5', 
            borderRadius: 6, 
            overflow: 'hidden' 
          }}>
            <DescriptionItem label="ID">{selectedLog.id}</DescriptionItem>
            <DescriptionItem label="时间">
              {dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </DescriptionItem>
            <DescriptionItem label="用户">{selectedLog.username || '-'}</DescriptionItem>
            <DescriptionItem label="角色">{selectedLog.user_role || '-'}</DescriptionItem>
            <DescriptionItem label="操作">
              <Tag color={actionLabels[selectedLog.action]?.color || 'default'}>
                {actionLabels[selectedLog.action]?.text || selectedLog.action}
              </Tag>
            </DescriptionItem>
            <DescriptionItem label="实体类型">
              {entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}
            </DescriptionItem>
            <DescriptionItem label="实体ID">{selectedLog.entity_id || '-'}</DescriptionItem>
            <DescriptionItem label="实体名称">{selectedLog.entity_name || '-'}</DescriptionItem>
            <DescriptionItem label="实验室" span={2}>{getLabName(selectedLog.laboratory_id)}</DescriptionItem>
            <DescriptionItem label="描述" span={2}>{selectedLog.description || '-'}</DescriptionItem>
            <DescriptionItem label="IP地址">{selectedLog.ip_address || '-'}</DescriptionItem>
            <DescriptionItem label="请求路径">{selectedLog.request_path || '-'}</DescriptionItem>
            {selectedLog.old_values && (
              <DescriptionItem label="旧值" span={2}>
                <pre style={{ 
                  fontSize: 12, 
                  fontFamily: 'monospace', 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  maxHeight: 160, 
                  overflow: 'auto' 
                }}>
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </DescriptionItem>
            )}
            {selectedLog.new_values && (
              <DescriptionItem label="新值" span={2}>
                <pre style={{ 
                  fontSize: 12, 
                  fontFamily: 'monospace', 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  maxHeight: 160, 
                  overflow: 'auto' 
                }}>
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </DescriptionItem>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Helper component for descriptions
function DescriptionItem({ 
  label, 
  children, 
  span = 1 
}: { 
  label: string; 
  children: React.ReactNode; 
  span?: 1 | 2;
}) {
  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: 12, 
      gridColumn: span === 2 ? 'span 2' : undefined 
    }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#333' }}>{children}</div>
    </div>
  );
}
