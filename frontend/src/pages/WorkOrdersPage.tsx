import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Table, Button, Input, Select, Tag, Switch, Progress, Popconfirm, App, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { workOrderService } from '../services/workOrderService';
import { laboratoryService } from '../services/laboratoryService';
import { siteService } from '../services/siteService';
import { materialService } from '../services/materialService';
import { reportService } from '../services/reportService';
import { isAbortError } from '../services/api';
import { WorkOrderModal } from '../components/work-orders/WorkOrderModal';
import { SubTaskManager } from '../components/work-orders/SubTaskManager';
import type { WorkOrder, Site, Laboratory, Client, WorkOrderType, WorkOrderStatus } from '../types';

const workOrderTypeLabels: Record<WorkOrderType, string> = {
  failure_analysis: '失效分析',
  reliability_test: '可靠性测试',
};

const statusLabels: Record<WorkOrderStatus, { text: string; color: 'default' | 'warning' | 'blue' | 'purple' | 'success' | 'orange' }> = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '待处理', color: 'orange' },
  assigned: { text: '已分配', color: 'blue' },
  in_progress: { text: '进行中', color: 'blue' },
  on_hold: { text: '暂停', color: 'warning' },
  review: { text: '待审核', color: 'purple' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'default' },
};

export default function WorkOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    laboratory_id?: number;
    client_id?: number;
    work_order_type?: WorkOrderType;
    status?: WorkOrderStatus;
    priority_level?: number;
    overdue_only?: boolean;
    work_order_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }>({
    search: '',
    overdue_only: false,
  });
  const [searchValue, setSearchValue] = useState('');
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  
  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);
  const expandHandledRef = useRef(false);
  
  // 在组件挂载时检查 expand 参数
  useEffect(() => {
    const expandId = searchParams.get('expand');
    if (expandId && !expandHandledRef.current) {
      const workOrderId = parseInt(expandId, 10);
      if (!isNaN(workOrderId)) {
        expandHandledRef.current = true;
        // 设置 work_order_id 过滤器，确保该工单出现在列表中
        setFilters((prev) => ({ ...prev, work_order_id: workOrderId }));
        // 预设展开键
        setExpandedRowKeys([workOrderId]);
        // 清除 URL 参数
        searchParams.delete('expand');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const fetchWorkOrders = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await workOrderService.getWorkOrders({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          work_order_id: filters.work_order_id,
          laboratory_id: filters.laboratory_id,
          client_id: filters.client_id,
          work_order_type: filters.work_order_type,
          status: filters.status,
          priority_level: filters.priority_level,
          overdue_only: filters.overdue_only,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
          signal,
        });
        setWorkOrders(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          message.error('获取工单列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, message]
  );

  const fetchSites = useCallback(async () => {
    try {
      const allSites = await siteService.getAllSites();
      setSites(allSites);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch sites');
      }
    }
  }, []);

  const fetchLaboratories = useCallback(async () => {
    try {
      const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
      setLaboratories(response.items);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch laboratories');
      }
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const allClients = await materialService.getAllClients();
      setClients(allClients);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch clients');
      }
    }
  }, []);

  useEffect(() => {
    fetchSites();
    fetchLaboratories();
    fetchClients();
  }, [fetchSites, fetchLaboratories, fetchClients]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchWorkOrders(1, pagination.pageSize, controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchWorkOrders, pagination.pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchValue }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search]);

  const handleTableChange = (
    paginationConfig: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<WorkOrder> | SorterResult<WorkOrder>[]
  ) => {
    // 翻页时清除 work_order_id 过滤，恢复正常列表
    if (filters.work_order_id) {
      setFilters((prev) => ({ ...prev, work_order_id: undefined }));
    }
    
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    let sortBy: string | undefined;
    let sortOrder: 'asc' | 'desc' | undefined;
    
    if (singleSorter?.field && singleSorter?.order) {
      const field = singleSorter.field as string;
      if (field === 'priority_score' || field === 'priority') {
        sortBy = 'priority_score';
      } else if (field === 'sla_deadline') {
        sortBy = 'sla_deadline';
      }
      sortOrder = singleSorter.order === 'ascend' ? 'asc' : 'desc';
    }
    
    setFilters((prev) => ({ ...prev, sort_by: sortBy, sort_order: sortOrder }));
    fetchWorkOrders(paginationConfig.current, paginationConfig.pageSize);
  };

  const handleLabFilterChange = (value: number | undefined) => {
    setFilters((prev) => ({ ...prev, laboratory_id: value }));
  };

  const handleClientFilterChange = (value: number | undefined) => {
    setFilters((prev) => ({ ...prev, client_id: value }));
  };

  const handleTypeFilterChange = (value: WorkOrderType | undefined) => {
    setFilters((prev) => ({ ...prev, work_order_type: value }));
  };

  const handleStatusFilterChange = (value: WorkOrderStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleOverdueFilterChange = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, overdue_only: checked }));
  };

  const handleAdd = () => {
    setEditingWorkOrder(null);
    setModalVisible(true);
  };

  const handleEdit = (record: WorkOrder) => {
    setEditingWorkOrder(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await workOrderService.deleteWorkOrder(id);
      message.success('删除成功');
      fetchWorkOrders(pagination.current, pagination.pageSize);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败,只能删除草稿或已取消的工单');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingWorkOrder(null);
    fetchWorkOrders(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingWorkOrder(null);
  };

  const handleExportPdf = async () => {
    try {
      message.info('正在生成PDF报告...');
      await reportService.exportWorkOrdersPdf({
        laboratory_id: filters.laboratory_id,
        work_order_type: filters.work_order_type,
        status: filters.status,
        client_id: filters.client_id,
      });
      message.success('PDF报告已下载');
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('导出PDF失败');
      }
    }
  };

  const handleExportSinglePdf = async (workOrderId: number) => {
    try {
      message.info('正在生成PDF报告...');
      await reportService.exportWorkOrderDetailPdf(workOrderId);
      message.success('PDF报告已下载');
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('导出PDF失败');
      }
    }
  };

  const getLabName = (labId: number) => {
    const lab = laboratories.find((l) => l.id === labId);
    return lab ? lab.name : '-';
  };

  const getClientName = (clientId?: number) => {
    if (!clientId) return '-';
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : '-';
  };

  const columns: ColumnsType<WorkOrder> = [
    {
      title: '工单号',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 160,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'work_order_type',
      key: 'work_order_type',
      width: 100,
      render: (value) => workOrderTypeLabels[value as WorkOrderType] || (value as string),
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 80,
      render: (value) => getLabName(value as number),
    },
    {
      title: '客户',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 100,
      render: (value) => getClientName(value as number | undefined),
    },
    {
      title: '优先级',
      key: 'priority',
      dataIndex: 'priority_score',
      width: 100,
      sorter: true,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={record.priority_score}
            size="small"
            status={record.priority_score > 70 ? 'exception' : record.priority_score > 50 ? 'active' : 'success'}
            style={{ width: 60 }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>P{record.priority_level}</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value) => {
        const status = value as WorkOrderStatus;
        const config = statusLabels[status] || { text: status, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '截止日',
      dataIndex: 'sla_deadline',
      key: 'sla_deadline',
      width: 110,
      sorter: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (value) => new Date(value as string).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExportSinglePdf(record.id)}
          >
            PDF
          </Button>
          {(record.status === 'draft' || record.status === 'cancelled') && (
            <Popconfirm
              title="确认删除"
              description={`确定要删除工单 "${record.order_number}" 吗？`}
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div data-testid="work-orders-page">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索工单号或标题"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
            allowClear
            data-testid="work-orders-search-input"
          />
          <Select
            placeholder="实验室"
            value={filters.laboratory_id}
            onChange={handleLabFilterChange}
            style={{ width: 160 }}
            allowClear
            options={laboratories.map((lab) => ({
              label: `${lab.name} (${lab.code})`,
              value: lab.id,
            }))}
            data-testid="work-orders-lab-filter"
          />
          <Select
            placeholder="客户"
            value={filters.client_id}
            onChange={handleClientFilterChange}
            style={{ width: 140 }}
            allowClear
            options={clients.map((client) => ({
              label: client.name,
              value: client.id,
            }))}
            data-testid="work-orders-client-filter"
          />
          <Select
            placeholder="类型"
            value={filters.work_order_type}
            onChange={handleTypeFilterChange}
            style={{ width: 110 }}
            allowClear
            options={Object.entries(workOrderTypeLabels).map(([value, label]) => ({
              label,
              value,
            }))}
            data-testid="work-orders-type-filter"
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={handleStatusFilterChange}
            style={{ width: 100 }}
            allowClear
            options={Object.entries(statusLabels).map(([value, config]) => ({
              label: config.text,
              value,
            }))}
            data-testid="work-orders-status-filter"
          />
          <Select
            placeholder="优先级"
            value={filters.priority_level}
            onChange={(value) => setFilters((prev) => ({ ...prev, priority_level: value || undefined }))}
            style={{ width: 100 }}
            allowClear
            options={[
              { value: 1, label: 'P1' },
              { value: 2, label: 'P2' },
              { value: 3, label: 'P3' },
              { value: 4, label: 'P4' },
              { value: 5, label: 'P5' },
            ]}
            data-testid="work-orders-priority-filter"
          />
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>仅逾期:</span>
            <Switch
              checked={filters.overdue_only}
              onChange={handleOverdueFilterChange}
              size="small"
              data-testid="work-orders-overdue-switch"
            />
          </Space>
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportPdf} data-testid="work-orders-export-button">
            导出PDF
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} data-testid="work-orders-add-button">
            新增工单
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={workOrders}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1300 }}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
          expandedRowRender: (record) => (
            <div style={{ padding: 8, backgroundColor: '#fafafa' }}>
              <SubTaskManager
                workOrder={record}
                onTasksChange={() => fetchWorkOrders(pagination.current, pagination.pageSize)}
              />
            </div>
          ),
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              onClick={(e) => onExpand(record, e)}
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              style={{ color: '#666' }}
            />
          ),
        }}
        data-testid="work-orders-table"
      />

      <WorkOrderModal
        visible={modalVisible}
        workOrder={editingWorkOrder}
        sites={sites}
        laboratories={laboratories}
        clients={clients}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
