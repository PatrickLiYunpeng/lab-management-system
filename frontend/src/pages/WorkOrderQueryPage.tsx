import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { workOrderService } from '../services/workOrderService';
import { laboratoryService } from '../services/laboratoryService';
import { materialService } from '../services/materialService';
import type { WorkOrder, Laboratory, Client, WorkOrderType, WorkOrderStatus, WorkOrderTask } from '../types';
import {
  Button,
  Input,
  Select,
  Switch,
  Table,
  Tag,
  Modal,
  Tooltip,
  Progress,
  useToast,
  type TableColumn,
  type TablePagination,
} from '../components/ui';

const workOrderTypeLabels: Record<WorkOrderType, string> = {
  failure_analysis: '失效分析',
  reliability_test: '可靠性测试',
};

const statusLabels: Record<WorkOrderStatus, { text: string; color: 'default' | 'warning' | 'blue' | 'processing' | 'success' | 'error' }> = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '待处理', color: 'warning' },
  assigned: { text: '已分配', color: 'blue' },
  in_progress: { text: '进行中', color: 'processing' },
  on_hold: { text: '暂停', color: 'warning' },
  review: { text: '待审核', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'default' },
};

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'failure_analysis', label: '失效分析' },
  { value: 'reliability_test', label: '可靠性测试' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待处理' },
  { value: 'assigned', label: '已分配' },
  { value: 'in_progress', label: '进行中' },
  { value: 'on_hold', label: '暂停' },
  { value: 'review', label: '待审核' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export default function WorkOrderQueryPage() {
  const toast = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
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
    overdue_only: boolean;
  }>({
    search: '',
    overdue_only: false,
  });
  const [searchValue, setSearchValue] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [tasks, setTasks] = useState<WorkOrderTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchWorkOrders = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page,
          page_size: pageSize,
        };
        if (filters.search) params.search = filters.search;
        if (filters.laboratory_id) params.laboratory_id = filters.laboratory_id;
        if (filters.client_id) params.client_id = filters.client_id;
        if (filters.work_order_type) params.work_order_type = filters.work_order_type;
        if (filters.status) params.status = filters.status;
        if (filters.overdue_only) params.overdue_only = filters.overdue_only;

        const response = await workOrderService.getWorkOrders(params);
        if (isMountedRef.current) {
          setWorkOrders(response.items);
          setPagination({
            current: response.page,
            pageSize: response.page_size,
            total: response.total,
          });
          errorShownRef.current = false;
        }
      } catch {
        if (isMountedRef.current && !errorShownRef.current) {
          errorShownRef.current = true;
          toast.error('获取工单列表失败');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [filters, toast]
  );

  const fetchLaboratories = useCallback(async () => {
    try {
      const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
      if (isMountedRef.current) {
        setLaboratories(response.items);
      }
    } catch {
      console.error('Failed to fetch laboratories');
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const allClients = await materialService.getAllClients();
      if (isMountedRef.current) {
        setClients(allClients);
      }
    } catch {
      console.error('Failed to fetch clients');
    }
  }, []);

  const fetchTasks = useCallback(async (workOrderId: number) => {
    setTasksLoading(true);
    try {
      const taskList = await workOrderService.getTasks(workOrderId);
      setTasks(taskList);
    } catch {
      toast.error('获取任务列表失败');
    } finally {
      setTasksLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLaboratories();
    fetchClients();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLaboratories, fetchClients]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchValue }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search]);

  const handleTableChange = (paginationConfig: TablePagination) => {
    fetchWorkOrders(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 10
    );
  };

  const handleLabFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, laboratory_id: v ? Number(v) : undefined }));
  };

  const handleClientFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, client_id: v ? Number(v) : undefined }));
  };

  const handleTypeFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ 
      ...prev, 
      work_order_type: v ? String(v) as WorkOrderType : undefined 
    }));
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ 
      ...prev, 
      status: v ? String(v) as WorkOrderStatus : undefined 
    }));
  };

  const handleOverdueFilterChange = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, overdue_only: checked }));
  };

  const handleViewDetail = (record: WorkOrder) => {
    setSelectedWorkOrder(record);
    setDetailModalVisible(true);
    fetchTasks(record.id);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedWorkOrder(null);
    setTasks([]);
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

  const isOverdue = (record: WorkOrder) => {
    if (!record.sla_deadline) return false;
    if (record.status === 'completed' || record.status === 'cancelled') return false;
    return new Date(record.sla_deadline) < new Date();
  };

  const columns: TableColumn<WorkOrder>[] = [
    {
      title: '工单号',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 160,
      render: (text: unknown, record) => (
        <div className="flex items-center gap-1.5">
          {isOverdue(record) && (
            <Tooltip title="已逾期">
              <ExclamationCircleIcon className="w-4 h-4 text-error-500" />
            </Tooltip>
          )}
          <span className="font-medium text-neutral-900">{String(text)}</span>
        </div>
      ),
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
      render: (type: unknown) => (
        <Tag color={type === 'failure_analysis' ? 'warning' : 'blue'}>
          {workOrderTypeLabels[type as WorkOrderType] || String(type)}
        </Tag>
      ),
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 120,
      render: (labId: unknown) => getLabName(Number(labId)),
    },
    {
      title: '客户',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 120,
      render: (clientId: unknown) => getClientName(clientId ? Number(clientId) : undefined),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 100,
      render: (_: unknown, record) => (
        <Progress
          percent={record.priority_score}
          size="small"
          format={() => `P${record.priority_level}`}
          strokeColor={
            record.priority_score > 70
              ? 'error'
              : record.priority_score > 50
              ? 'warning'
              : 'success'
          }
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: unknown) => {
        const config = statusLabels[status as WorkOrderStatus] || { text: String(status), color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'SLA截止',
      dataIndex: 'sla_deadline',
      key: 'sla_deadline',
      width: 110,
      render: (date: unknown, record) => {
        if (!date) return '-';
        const formattedDate = new Date(String(date)).toLocaleDateString('zh-CN');
        const overdue = isOverdue(record);
        return (
          <span className={overdue ? 'text-error-500 flex items-center gap-1' : ''}>
            {overdue && <ClockIcon className="w-3.5 h-3.5" />}
            {formattedDate}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: unknown) => new Date(String(date)).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Button
          variant="link"
          size="small"
          icon={<InformationCircleIcon className="w-4 h-4" />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const taskColumns: TableColumn<WorkOrderTask>[] = [
    {
      title: '任务号',
      dataIndex: 'task_number',
      key: 'task_number',
      width: 120,
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: unknown) => {
        const colors: Record<string, 'warning' | 'blue' | 'processing' | 'success' | 'error' | 'default'> = {
          pending: 'warning',
          assigned: 'blue',
          in_progress: 'processing',
          completed: 'success',
          blocked: 'error',
          cancelled: 'default',
        };
        const labels: Record<string, string> = {
          pending: '待处理',
          assigned: '已分配',
          in_progress: '进行中',
          completed: '已完成',
          blocked: '已阻塞',
          cancelled: '已取消',
        };
        const statusStr = String(status);
        return <Tag color={colors[statusStr] || 'default'}>{labels[statusStr] || statusStr}</Tag>;
      },
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 150,
      render: (_: unknown, record) => (record.method as { name?: string } | undefined)?.name || '-',
    },
  ];

  return (
    <div>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <Input
              placeholder="搜索工单号或标题"
              prefix={<MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
          </div>
          <div>
            <Select
              placeholder="选择实验室"
              value={filters.laboratory_id}
              onChange={handleLabFilterChange}
              allowClear
              options={[
                { value: '', label: '全部实验室' },
                ...laboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                })),
              ]}
            />
          </div>
          <div>
            <Select
              placeholder="选择客户"
              value={filters.client_id}
              onChange={handleClientFilterChange}
              allowClear
              options={[
                { value: '', label: '全部客户' },
                ...clients.map((client) => ({
                  label: client.name,
                  value: client.id,
                })),
              ]}
            />
          </div>
          <div>
            <Select
              value={filters.work_order_type || ''}
              onChange={handleTypeFilterChange}
              options={typeOptions}
            />
          </div>
          <div>
            <Select
              value={filters.status || ''}
              onChange={handleStatusFilterChange}
              options={statusOptions}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">仅显示逾期:</span>
            <Switch
              checked={filters.overdue_only}
              onChange={handleOverdueFilterChange}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={workOrders}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条工单`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={`工单详情 - ${selectedWorkOrder?.order_number || ''}`}
        open={detailModalVisible}
        onCancel={handleCloseDetail}
        footer={null}
        size="large"
      >
        {selectedWorkOrder && (
          <div>
            <div className="grid grid-cols-2 gap-4 border border-neutral-200 rounded-lg overflow-hidden">
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">工单号</div>
                <div className="flex-1 px-3 py-2 text-sm">{selectedWorkOrder.order_number}</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">标题</div>
                <div className="flex-1 px-3 py-2 text-sm">{selectedWorkOrder.title}</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">类型</div>
                <div className="flex-1 px-3 py-2">
                  <Tag color={selectedWorkOrder.work_order_type === 'failure_analysis' ? 'warning' : 'blue'}>
                    {workOrderTypeLabels[selectedWorkOrder.work_order_type]}
                  </Tag>
                </div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">状态</div>
                <div className="flex-1 px-3 py-2">
                  <Tag color={statusLabels[selectedWorkOrder.status]?.color}>
                    {statusLabels[selectedWorkOrder.status]?.text}
                  </Tag>
                </div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">实验室</div>
                <div className="flex-1 px-3 py-2 text-sm">{getLabName(selectedWorkOrder.laboratory_id)}</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">客户</div>
                <div className="flex-1 px-3 py-2 text-sm">{getClientName(selectedWorkOrder.client_id)}</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">优先级</div>
                <div className="flex-1 px-3 py-2 text-sm">P{selectedWorkOrder.priority_level} ({selectedWorkOrder.priority_score}分)</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">SLA截止</div>
                <div className="flex-1 px-3 py-2 text-sm">
                  {selectedWorkOrder.sla_deadline
                    ? new Date(selectedWorkOrder.sla_deadline).toLocaleString('zh-CN')
                    : '-'}
                </div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">创建时间</div>
                <div className="flex-1 px-3 py-2 text-sm">{new Date(selectedWorkOrder.created_at).toLocaleString('zh-CN')}</div>
              </div>
              <div className="flex border-b border-neutral-200">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">更新时间</div>
                <div className="flex-1 px-3 py-2 text-sm">{new Date(selectedWorkOrder.updated_at).toLocaleString('zh-CN')}</div>
              </div>
              <div className="flex col-span-2">
                <div className="w-24 px-3 py-2 bg-neutral-50 text-sm text-neutral-500 font-medium">描述</div>
                <div className="flex-1 px-3 py-2 text-sm">{selectedWorkOrder.description || '-'}</div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-neutral-900 mb-3">关联任务</h4>
              <Table
                columns={taskColumns}
                dataSource={tasks}
                rowKey="id"
                loading={tasksLoading}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
