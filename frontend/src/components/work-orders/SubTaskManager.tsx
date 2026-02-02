import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { workOrderService } from '../../services/workOrderService';
import { personnelService } from '../../services/personnelService';
import { equipmentService } from '../../services/equipmentService';
import { TaskModal } from './TaskModal';
import { TechnicianMatcher } from './TechnicianMatcher';
import { HandoverModal } from '../handovers/HandoverModal';
import type { WorkOrder, WorkOrderTask, TaskStatus, Personnel, Equipment } from '../../types';
import {
  Button,
  Table,
  Tag,
  Tooltip,
  Popconfirm,
  useToast,
  type TableColumn,
} from '../ui';

interface SubTaskManagerProps {
  workOrder: WorkOrder;
  onTasksChange?: () => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: 'default' | 'blue' | 'processing' | 'success' | 'error' }> = {
  pending: { label: '待处理', color: 'default' },
  assigned: { label: '已分配', color: 'blue' },
  in_progress: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  blocked: { label: '阻塞', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
};

export function SubTaskManager({ workOrder, onTasksChange }: SubTaskManagerProps) {
  const toast = useToast();
  const [tasks, setTasks] = useState<WorkOrderTask[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [matcherVisible, setMatcherVisible] = useState(false);
  const [handoverVisible, setHandoverVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkOrderTask | null>(null);
  
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workOrderService.getTasks(workOrder.id);
      if (isMountedRef.current) {
        setTasks(data);
        errorShownRef.current = false;
      }
    } catch {
      if (isMountedRef.current && !errorShownRef.current) {
        errorShownRef.current = true;
        toast.error('获取任务列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [workOrder.id, toast]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [personnelRes, equipmentRes] = await Promise.all([
        personnelService.getPersonnel({ page: 1, page_size: 100 }),
        equipmentService.getEquipment({ page: 1, page_size: 100 }),
      ]);
      if (isMountedRef.current) {
        setPersonnel(personnelRes.items);
        setEquipment(equipmentRes.items);
      }
    } catch {
      console.error('Failed to fetch reference data');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTasks();
    fetchReferenceData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTasks, fetchReferenceData]);

  // Helper functions to get names from IDs
  const getTechnicianDisplay = (technicianId?: number) => {
    if (!technicianId) return <span className="text-neutral-400">未分配</span>;
    const tech = personnel.find(p => p.id === technicianId);
    if (tech) {
      const name = tech.user?.full_name || tech.user?.username || '';
      return <Tag color="success">{name} ({tech.employee_id})</Tag>;
    }
    return <Tag color="success">ID: {technicianId}</Tag>;
  };

  const getEquipmentDisplay = (equipmentId?: number) => {
    if (!equipmentId) return '-';
    const equip = equipment.find(e => e.id === equipmentId);
    if (equip) {
      return <Tag color="processing">{equip.code}</Tag>;
    }
    return <Tag color="processing">ID: {equipmentId}</Tag>;
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setTaskModalVisible(true);
  };

  const handleEditTask = (task: WorkOrderTask) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await workOrderService.deleteTask(workOrder.id, taskId);
      toast.success('任务删除成功');
      fetchTasks();
      onTasksChange?.();
    } catch {
      toast.error('任务删除失败');
    }
  };

  const handleAssignTask = (task: WorkOrderTask) => {
    setSelectedTask(task);
    setMatcherVisible(true);
  };

  const handleTaskModalSuccess = () => {
    setTaskModalVisible(false);
    setSelectedTask(null);
    fetchTasks();
    onTasksChange?.();
  };

  const handleMatcherSuccess = () => {
    setMatcherVisible(false);
    setSelectedTask(null);
    fetchTasks();
    onTasksChange?.();
  };

  const handleHandover = (task: WorkOrderTask) => {
    setSelectedTask(task);
    setHandoverVisible(true);
  };

  const handleHandoverSuccess = () => {
    setHandoverVisible(false);
    setSelectedTask(null);
    fetchTasks();
    onTasksChange?.();
  };

  const columns: TableColumn<WorkOrderTask>[] = [
    {
      title: '序号',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 60,
      sorter: (a, b) => a.sequence - b.sequence,
    },
    {
      title: '任务编号',
      dataIndex: 'task_number',
      key: 'task_number',
      width: 120,
    },
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: unknown) => {
        const statusStr = String(status) as TaskStatus;
        const config = statusConfig[statusStr] || { label: statusStr, color: 'default' as const };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '所需设备',
      dataIndex: 'required_equipment_id',
      key: 'required_equipment_id',
      width: 120,
      render: (id: unknown) => getEquipmentDisplay(id ? Number(id) : undefined),
    },
    {
      title: '所需容量',
      dataIndex: 'required_capacity',
      key: 'required_capacity',
      width: 100,
      render: (capacity: unknown) => capacity ? `${capacity} 槽位` : '-',
    },
    {
      title: '分配技术员',
      dataIndex: 'assigned_technician_id',
      key: 'assigned_technician_id',
      width: 150,
      render: (id: unknown) => getTechnicianDisplay(id ? Number(id) : undefined),
    },
    {
      title: '周期(小时)',
      key: 'cycle_hours',
      width: 100,
      render: (_: unknown, record) => (
        <span>
          {record.actual_cycle_hours !== undefined && record.actual_cycle_hours !== null
            ? record.actual_cycle_hours
            : record.standard_cycle_hours || '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record) => (
        <div className="flex items-center gap-1">
          <Tooltip title="编辑">
            <Button
              variant="text"
              size="small"
              icon={<PencilSquareIcon className="w-4 h-4" />}
              onClick={() => handleEditTask(record)}
            />
          </Tooltip>
          <Tooltip title="分配技术员">
            <Button
              variant="text"
              size="small"
              icon={<UserPlusIcon className="w-4 h-4" />}
              onClick={() => handleAssignTask(record)}
              disabled={record.status === 'completed' || record.status === 'cancelled'}
            />
          </Tooltip>
          <Tooltip title="交接任务">
            <Button
              variant="text"
              size="small"
              icon={<ArrowsRightLeftIcon className="w-4 h-4" />}
              onClick={() => handleHandover(record)}
              disabled={!record.assigned_technician_id || record.status === 'completed' || record.status === 'cancelled'}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此任务吗？"
            onConfirm={() => handleDeleteTask(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                variant="text"
                size="small"
                icon={<TrashIcon className="w-4 h-4 text-error-500" />}
                disabled={record.status !== 'pending'}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <span className="font-medium text-neutral-900">任务列表</span>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="small"
              icon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={fetchTasks}
            >
              刷新
            </Button>
            <Button
              variant="primary"
              size="small"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={handleAddTask}
            >
              新增任务
            </Button>
          </div>
        </div>
        <div className="p-4">
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 900 }}
          />
        </div>
      </div>

      <TaskModal
        visible={taskModalVisible}
        workOrderId={workOrder.id}
        task={selectedTask}
        laboratoryId={workOrder.laboratory_id}
        workOrderType={workOrder.work_order_type}
        onSuccess={handleTaskModalSuccess}
        onCancel={() => {
          setTaskModalVisible(false);
          setSelectedTask(null);
        }}
      />

      <TechnicianMatcher
        visible={matcherVisible}
        workOrderId={workOrder.id}
        task={selectedTask}
        onSuccess={handleMatcherSuccess}
        onCancel={() => {
          setMatcherVisible(false);
          setSelectedTask(null);
        }}
      />

      <HandoverModal
        visible={handoverVisible}
        task={selectedTask}
        onSuccess={handleHandoverSuccess}
        onCancel={() => {
          setHandoverVisible(false);
          setSelectedTask(null);
        }}
      />
    </>
  );
}
