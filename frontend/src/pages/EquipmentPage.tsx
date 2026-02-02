import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ListBulletIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Tag, Popconfirm, useToast, type TableColumn, type TablePagination } from '../components/ui';
import { equipmentService } from '../services/equipmentService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import { EquipmentModal } from '../components/equipment/EquipmentModal';
import { EquipmentScheduler } from '../components/equipment/EquipmentScheduler';
import { StatusTag } from '../components/common/StatusTag';
import type { Equipment, Site, Laboratory, EquipmentType, EquipmentStatus, EquipmentCategory } from '../types';

const equipmentTypeLabels: Record<EquipmentType, string> = {
  autonomous: '自主运行',
  operator_dependent: '操作员依赖',
};

const categoryLabels: Record<EquipmentCategory, string> = {
  thermal: '热学设备',
  mechanical: '机械设备',
  electrical: '电学设备',
  optical: '光学设备',
  analytical: '分析设备',
  environmental: '环境设备',
  measurement: '测量设备',
  other: '其他',
};

const statusLabels: Record<EquipmentStatus, { text: string; color: 'success' | 'blue' | 'warning' | 'red' | 'purple' | 'default' }> = {
  available: { text: '可用', color: 'success' },
  in_use: { text: '使用中', color: 'blue' },
  maintenance: { text: '维护中', color: 'warning' },
  out_of_service: { text: '停用', color: 'red' },
  reserved: { text: '已预约', color: 'purple' },
};

type TabKey = 'list' | 'schedule';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [pagination, setPagination] = useState<TablePagination>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    site_id?: number;
    laboratory_id?: number;
    equipment_type?: EquipmentType;
    category?: EquipmentCategory;
    status?: EquipmentStatus;
  }>({
    search: '',
  });
  const [searchValue, setSearchValue] = useState('');
  
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEquipment = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await equipmentService.getEquipment({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          site_id: filters.site_id,
          laboratory_id: filters.laboratory_id,
          equipment_type: filters.equipment_type,
          category: filters.category,
          status: filters.status,
          signal,
        });
        setEquipment(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          toast.error('获取设备列表失败');
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

  useEffect(() => {
    fetchSites();
    fetchLaboratories();
  }, [fetchSites, fetchLaboratories]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchEquipment(pagination.current, pagination.pageSize, controller.signal);
    
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
    
    fetchEquipment(page, pageSize, controller.signal);
  };

  const handleSiteFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, site_id: v as number | undefined, laboratory_id: undefined }));
  };

  const handleLabFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, laboratory_id: v as number | undefined }));
  };

  const handleTypeFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, equipment_type: v as EquipmentType | undefined }));
  };

  const handleCategoryFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, category: v as EquipmentCategory | undefined }));
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, status: v as EquipmentStatus | undefined }));
  };

  const handleAdd = () => {
    setEditingEquipment(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Equipment) => {
    setEditingEquipment(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await equipmentService.deleteEquipment(id);
      toast.success('删除成功');
      fetchEquipment(pagination.current, pagination.pageSize);
    } catch {
      toast.error('删除失败');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingEquipment(null);
    fetchEquipment(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingEquipment(null);
  };

  const getLabName = (labId: number) => {
    const lab = laboratories.find((l) => l.id === labId);
    return lab ? lab.name : '-';
  };

  const filteredLaboratories = filters.site_id
    ? laboratories.filter((lab) => lab.site_id === filters.site_id)
    : laboratories;

  const columns: TableColumn<Equipment>[] = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'equipment_type',
      key: 'equipment_type',
      width: 110,
      render: (value) => equipmentTypeLabels[value as EquipmentType] || (value as string),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (value) => value ? (categoryLabels[value as EquipmentCategory] || (value as string)) : '-',
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 100,
      render: (value) => getLabName(value as number),
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
      render: (value) => (value as string) || '-',
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value) => {
        const status = value as EquipmentStatus;
        const config = statusLabels[status] || { text: status, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 70,
      render: (value) => <StatusTag isActive={value as boolean} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="small"
            icon={<PencilIcon className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除设备 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okDanger
          >
            <Button variant="link" size="small" danger icon={<TrashIcon className="w-4 h-4" />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const tabs = [
    { key: 'list' as const, label: '设备列表', icon: ListBulletIcon },
    { key: 'schedule' as const, label: '排程甘特图', icon: CalendarDaysIcon },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-4 border-b border-neutral-200">
        <div className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Tab */}
      {activeTab === 'list' && (
        <div>
          <div className="mb-4 flex justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                placeholder="搜索设备名称、编号或型号"
                prefix={<MagnifyingGlassIcon className="w-4 h-4" />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-[220px]"
                allowClear
              />
              <Select
                placeholder="站点"
                value={filters.site_id}
                onChange={handleSiteFilterChange}
                className="w-[150px]"
                allowClear
                options={sites.map((site) => ({
                  label: `${site.name} (${site.code})`,
                  value: site.id,
                }))}
              />
              <Select
                placeholder="实验室"
                value={filters.laboratory_id}
                onChange={handleLabFilterChange}
                className="w-[180px]"
                allowClear
                options={filteredLaboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
              <Select
                placeholder="设备类型"
                value={filters.equipment_type}
                onChange={handleTypeFilterChange}
                className="w-[130px]"
                allowClear
                options={Object.entries(equipmentTypeLabels).map(([value, label]) => ({
                  label,
                  value,
                }))}
              />
              <Select
                placeholder="设备类别"
                value={filters.category}
                onChange={handleCategoryFilterChange}
                className="w-[120px]"
                allowClear
                options={Object.entries(categoryLabels).map(([value, label]) => ({
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
            </div>
            <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>
              新增设备
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={equipment}
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
          />

          <EquipmentModal
            visible={modalVisible}
            equipment={editingEquipment}
            sites={sites}
            laboratories={laboratories}
            onSuccess={handleModalSuccess}
            onCancel={handleModalCancel}
          />
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && <EquipmentScheduler />}
    </div>
  );
}
