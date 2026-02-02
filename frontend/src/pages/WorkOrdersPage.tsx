import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Tag, Switch, Progress, Popconfirm, useToast, type TableColumn, type TablePagination } from '../components/ui';
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
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [pagination, setPagination] = useState<TablePagination>({
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
    overdue_only?: boolean;
  }>({
    search: '',
    overdue_only: false,
  });
  const [searchValue, setSearchValue] = useState('');
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWorkOrders = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await workOrderService.getWorkOrders({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          laboratory_id: filters.laboratory_id,
          client_id: filters.client_id,
          work_order_type: filters.work_order_type,
          status: filters.status,
          overdue_only: filters.overdue_only,
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
          toast.error('获取工单列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, toast]
  );

  const fetchSites = useCallback(async () => {
    try {
      const allSites = await siteService.getAllSites();
      setSites(allSites);
    } catch {
      console.error('Failed to fetch sites');
    }
  }, []);

  const fetchLaboratories = useCallback(async () => {
    try {
      const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
      setLaboratories(response.items);
    } catch {
      console.error('Failed to fetch laboratories');
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const allClients = await materialService.getAllClients();
      setClients(allClients);
    } catch {
      console.error('Failed to fetch clients');
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

  const handlePaginationChange = (page: number, pageSize: number) => {
    fetchWorkOrders(page, pageSize);
  };

  const handleLabFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, laboratory_id: v as number | undefined }));
  };

  const handleClientFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, client_id: v as number | undefined }));
  };

  const handleTypeFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, work_order_type: v as WorkOrderType | undefined }));
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, status: v as WorkOrderStatus | undefined }));
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
      toast.success('删除成功');
      fetchWorkOrders(pagination.current, pagination.pageSize);
    } catch {
      toast.error('删除失败，只能删除草稿或已取消的工单');
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
      toast.info('正在生成PDF报告...');
      await reportService.exportWorkOrdersPdf({
        laboratory_id: filters.laboratory_id,
        work_order_type: filters.work_order_type,
        status: filters.status,
        client_id: filters.client_id,
      });
      toast.success('PDF报告已下载');
    } catch {
      toast.error('导出PDF失败');
    }
  };

  const handleExportSinglePdf = async (workOrderId: number) => {
    try {
      toast.info('正在生成PDF报告...');
      await reportService.exportWorkOrderDetailPdf(workOrderId);
      toast.success('PDF报告已下载');
    } catch {
      toast.error('导出PDF失败');
    }
  };

  const toggleRowExpanded = (id: number) => {
    setExpandedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((key) => key !== id) : [...prev, id]
    );
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

  const columns: TableColumn<WorkOrder>[] = [
    {
      title: '',
      key: 'expand',
      width: 40,
      render: (_, record) => (
        <button
          onClick={() => toggleRowExpanded(record.id)}
          className="p-1 hover:bg-neutral-100 rounded"
        >
          {expandedRowKeys.includes(record.id) ? (
            <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-neutral-500" />
          )}
        </button>
      ),
    },
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
      width: 100,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={record.priority_score}
            size="small"
            status={record.priority_score > 70 ? 'exception' : record.priority_score > 50 ? 'active' : 'success'}
          />
          <span className="text-xs text-neutral-500">P{record.priority_level}</span>
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
        <div className="flex items-center gap-1">
          <Button
            variant="link"
            size="small"
            icon={<PencilIcon className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            variant="link"
            size="small"
            icon={<DocumentArrowDownIcon className="w-4 h-4" />}
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
              okDanger
            >
              <Button variant="link" size="small" danger icon={<TrashIcon className="w-4 h-4" />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="搜索工单号或标题"
            prefix={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-[200px]"
            allowClear
          />
          <Select
            placeholder="实验室"
            value={filters.laboratory_id}
            onChange={handleLabFilterChange}
            className="w-[160px]"
            allowClear
            options={laboratories.map((lab) => ({
              label: `${lab.name} (${lab.code})`,
              value: lab.id,
            }))}
          />
          <Select
            placeholder="客户"
            value={filters.client_id}
            onChange={handleClientFilterChange}
            className="w-[140px]"
            allowClear
            options={clients.map((client) => ({
              label: client.name,
              value: client.id,
            }))}
          />
          <Select
            placeholder="类型"
            value={filters.work_order_type}
            onChange={handleTypeFilterChange}
            className="w-[110px]"
            allowClear
            options={Object.entries(workOrderTypeLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={handleStatusFilterChange}
            className="w-[100px]"
            allowClear
            options={Object.entries(statusLabels).map(([value, config]) => ({
              label: config.text,
              value,
            }))}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">仅逾期:</span>
            <Switch
              checked={filters.overdue_only}
              onChange={handleOverdueFilterChange}
              size="small"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<DocumentArrowDownIcon className="w-4 h-4" />} onClick={handleExportPdf}>
            导出PDF
          </Button>
          <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>
            新增工单
          </Button>
        </div>
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
          onChange: handlePaginationChange,
        }}
        scroll={{ x: 1300 }}
        expandable={{
          expandedRowKeys: expandedRowKeys.map(String),
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(Number)),
          expandedRowRender: (record) => (
            <div className="p-2 bg-neutral-50">
              <SubTaskManager
                workOrder={record}
                onTasksChange={() => fetchWorkOrders(pagination.current, pagination.pageSize)}
              />
            </div>
          ),
        }}
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
