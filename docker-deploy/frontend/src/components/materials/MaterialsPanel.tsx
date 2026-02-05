import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, SearchOutlined, HistoryOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Table, Button, Input, Select, Tag, Switch, App, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { materialService } from '../../services/materialService';
import { isAbortError } from '../../services/api';
import { ReplenishmentModal } from './ReplenishmentModal';
import { ReplenishmentHistoryModal } from './ReplenishmentHistoryModal';
import type { Material, Laboratory, MaterialType, MaterialStatus } from '../../types';

const materialTypeLabels: Record<string, string> = {
  consumable: '耗材',
  reagent: '试剂',
  tool: '工具',
  other: '其他',
};

const statusLabels: Record<MaterialStatus, { text: string; color: 'blue' | 'cyan' | 'purple' | 'warning' | 'success' | 'default' | 'red' }> = {
  received: { text: '已接收', color: 'blue' },
  in_storage: { text: '入库', color: 'cyan' },
  allocated: { text: '已分配', color: 'purple' },
  in_use: { text: '使用中', color: 'blue' },
  pending_return: { text: '待返还', color: 'warning' },
  returned: { text: '已返还', color: 'success' },
  disposed: { text: '已处置', color: 'default' },
  lost: { text: '遗失', color: 'red' },
};

interface MaterialsPanelProps {
  laboratories: Laboratory[];
  onAdd: () => void;
  onEdit: (material: Material) => void;
}

export function MaterialsPanel({
  laboratories,
  onAdd,
  onEdit,
}: MaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    laboratory_id?: number;
    material_type?: MaterialType;
    status?: MaterialStatus;
    overdue_only?: boolean;
  }>({
    search: '',
    overdue_only: false,
  });
  const [searchValue, setSearchValue] = useState('');
  
  // Modal states
  const [replenishmentModalVisible, setReplenishmentModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMaterials = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        // Build query params - exclude 'sample' type
        const response = await materialService.getMaterials({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          laboratory_id: filters.laboratory_id,
          material_type: filters.material_type,
          status: filters.status,
          overdue_only: filters.overdue_only,
          signal,
        });
        // Filter out samples on client side if no specific type is selected
        const filteredItems = filters.material_type
          ? response.items
          : response.items.filter(m => m.material_type !== 'sample');
        setMaterials(filteredItems);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: filters.material_type ? response.total : filteredItems.length,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          message.error('获取材料列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, message]
  );

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchMaterials(pagination.current, pagination.pageSize, controller.signal);
    
    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchValue }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchMaterials(paginationConfig.current, paginationConfig.pageSize, controller.signal);
  };

  const handleLabFilterChange = (value: number | undefined) => {
    setFilters((prev) => ({ ...prev, laboratory_id: value }));
  };

  const handleTypeFilterChange = (value: MaterialType | undefined) => {
    setFilters((prev) => ({ ...prev, material_type: value }));
  };

  const handleStatusFilterChange = (value: MaterialStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleOverdueFilterChange = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, overdue_only: checked }));
  };

  const handleReplenish = (material: Material) => {
    setSelectedMaterial(material);
    setReplenishmentModalVisible(true);
  };

  const handleViewHistory = (material: Material) => {
    setSelectedMaterial(material);
    setHistoryModalVisible(true);
  };

  const handleReplenishmentSuccess = () => {
    setReplenishmentModalVisible(false);
    setSelectedMaterial(null);
    fetchMaterials(pagination.current, pagination.pageSize);
  };

  const getLabName = (labId: number) => {
    const lab = laboratories.find((l) => l.id === labId);
    return lab ? lab.name : '-';
  };

  const columns: ColumnsType<Material> = [
    {
      title: '物料编码',
      dataIndex: 'material_code',
      key: 'material_code',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'material_type',
      key: 'material_type',
      width: 80,
      render: (value) => materialTypeLabels[value as string] || value,
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 90,
      render: (value) => getLabName(value as number),
    },
    {
      title: '库存',
      key: 'quantity',
      width: 100,
      render: (_, record) => (
        <span style={{ fontWeight: 600 }}>
          {record.quantity} {record.unit}
        </span>
      ),
    },
    {
      title: '存储位置',
      dataIndex: 'storage_location',
      key: 'storage_location',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value) => {
        const status = value as MaterialStatus;
        const config = statusLabels[status] || { text: status, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => handleReplenish(record)}
          >
            补充
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
          >
            履历
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索物料编码或名称"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
            allowClear
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
          />
          <Select
            placeholder="类型"
            value={filters.material_type}
            onChange={handleTypeFilterChange}
            style={{ width: 100 }}
            allowClear
            options={Object.entries(materialTypeLabels).map(([value, label]) => ({
              label,
              value,
            }))}
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
          />
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>仅逾期:</span>
            <Switch
              checked={filters.overdue_only}
              onChange={handleOverdueFilterChange}
              size="small"
            />
          </Space>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          新增材料
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={materials}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
      />

      <ReplenishmentModal
        visible={replenishmentModalVisible}
        material={selectedMaterial}
        onSuccess={handleReplenishmentSuccess}
        onCancel={() => {
          setReplenishmentModalVisible(false);
          setSelectedMaterial(null);
        }}
      />

      <ReplenishmentHistoryModal
        visible={historyModalVisible}
        material={selectedMaterial}
        onClose={() => {
          setHistoryModalVisible(false);
          setSelectedMaterial(null);
        }}
      />
    </div>
  );
}
