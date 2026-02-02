import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Tag, Switch, useToast, type TableColumn, type TablePagination } from '../components/ui';
import { materialService } from '../services/materialService';
import { laboratoryService } from '../services/laboratoryService';
import { siteService } from '../services/siteService';
import { isAbortError } from '../services/api';
import { MaterialModal } from '../components/materials/MaterialModal';
import type { Material, Site, Laboratory, Client, MaterialType, MaterialStatus } from '../types';

const materialTypeLabels: Record<MaterialType, string> = {
  sample: '样品',
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

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [pagination, setPagination] = useState<TablePagination>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    laboratory_id?: number;
    client_id?: number;
    material_type?: MaterialType;
    status?: MaterialStatus;
    overdue_only?: boolean;
  }>({
    search: '',
    overdue_only: false,
  });
  const [searchValue, setSearchValue] = useState('');
  
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMaterials = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await materialService.getMaterials({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          laboratory_id: filters.laboratory_id,
          client_id: filters.client_id,
          material_type: filters.material_type,
          status: filters.status,
          overdue_only: filters.overdue_only,
          signal,
        });
        setMaterials(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          toast.error('获取物料列表失败');
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

  const handlePaginationChange = (page: number, pageSize: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchMaterials(page, pageSize, controller.signal);
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
    setFilters((prev) => ({ ...prev, material_type: v as MaterialType | undefined }));
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, status: v as MaterialStatus | undefined }));
  };

  const handleOverdueFilterChange = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, overdue_only: checked }));
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Material) => {
    setEditingMaterial(record);
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingMaterial(null);
    fetchMaterials(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingMaterial(null);
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

  const columns: TableColumn<Material>[] = [
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
      render: (value) => materialTypeLabels[value as MaterialType] || (value as string),
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 90,
      render: (value) => getLabName(value as number),
    },
    {
      title: '客户',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 120,
      render: (value) => getClientName(value as number | undefined),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 80,
      render: (_, record) => `${record.quantity} ${record.unit}`,
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
      width: 80,
      render: (_, record) => (
        <Button
          variant="link"
          size="small"
          icon={<PencilIcon className="w-4 h-4" />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="搜索物料编码或名称"
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
            className="w-[150px]"
            allowClear
            options={clients.map((client) => ({
              label: client.name,
              value: client.id,
            }))}
          />
          <Select
            placeholder="类型"
            value={filters.material_type}
            onChange={handleTypeFilterChange}
            className="w-[100px]"
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
        <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>
          新增物料
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
          onChange: handlePaginationChange,
        }}
        scroll={{ x: 1200 }}
      />

      <MaterialModal
        visible={modalVisible}
        material={editingMaterial}
        sites={sites}
        laboratories={laboratories}
        clients={clients}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
