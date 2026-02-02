import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Popconfirm, useToast, type TableColumn, type TablePagination } from '../components/ui';
import { laboratoryService } from '../services/laboratoryService';
import { siteService } from '../services/siteService';
import { isAbortError } from '../services/api';
import { LaboratoryModal } from '../components/laboratories/LaboratoryModal';
import { StatusTag } from '../components/common/StatusTag';
import type { Laboratory, Site, LaboratoryType } from '../types';

const labTypeLabels: Record<LaboratoryType, string> = {
  fa: 'FA (失效分析)',
  reliability: '可靠性测试',
};

export default function LaboratoriesPage() {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
  const [pagination, setPagination] = useState<TablePagination>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    site_id?: number;
    lab_type?: LaboratoryType;
  }>({
    search: '',
  });
  const [searchValue, setSearchValue] = useState('');
  
  const toast = useToast();
  // Ref to store abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLaboratories = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await laboratoryService.getLaboratories({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          site_id: filters.site_id,
          lab_type: filters.lab_type,
          signal,
        });
        setLaboratories(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        // Ignore abort errors
        if (!isAbortError(err)) {
          toast.error('获取实验室列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, toast]
  );

  const fetchSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const allSites = await siteService.getAllSites();
      setSites(allSites);
    } catch {
      // Silently log error - don't show user-facing message for secondary data
      console.error('Failed to fetch sites');
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Laboratories fetch with AbortController for request cancellation
  useEffect(() => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchLaboratories(pagination.current, pagination.pageSize, controller.signal);
    
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

  const handlePaginationChange = (page: number, pageSize: number) => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchLaboratories(page, pageSize, controller.signal);
  };

  const handleSiteFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, site_id: v as number | undefined }));
  };

  const handleTypeFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, lab_type: v as LaboratoryType | undefined }));
  };

  const handleAdd = () => {
    setEditingLab(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Laboratory) => {
    setEditingLab(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await laboratoryService.deleteLaboratory(id);
      toast.success('删除成功');
      fetchLaboratories(pagination.current, pagination.pageSize);
    } catch {
      toast.error('删除失败');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingLab(null);
    fetchLaboratories(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingLab(null);
  };

  const getSiteName = (siteId: number) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || '-';
  };

  const columns: TableColumn<Laboratory>[] = [
    {
      title: '实验室名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'lab_type',
      key: 'lab_type',
      width: 130,
      render: (value) => labTypeLabels[value as LaboratoryType] || (value as string),
    },
    {
      title: '所属站点',
      dataIndex: 'site_id',
      key: 'site_id',
      width: 150,
      render: (value, record) => record.site?.name || getSiteName(value as number),
    },
    {
      title: '容量',
      dataIndex: 'max_capacity',
      key: 'max_capacity',
      width: 80,
      render: (value) => (value as number) || '-',
    },
    {
      title: '负责人',
      dataIndex: 'manager_name',
      key: 'manager_name',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
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
            description={`确定要删除实验室 "${record.name}" 吗？`}
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

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索实验室名称或代码"
            prefix={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-[250px]"
            allowClear
          />
          <Select
            placeholder="所属站点"
            value={filters.site_id}
            onChange={handleSiteFilterChange}
            className="w-[180px]"
            allowClear
            options={sites.map((site) => ({
              label: site.name,
              value: site.id,
            }))}
          />
          <Select
            placeholder="实验室类型"
            value={filters.lab_type}
            onChange={handleTypeFilterChange}
            className="w-[150px]"
            allowClear
            options={[
              { label: 'FA (失效分析)', value: 'fa' },
              { label: '可靠性测试', value: 'reliability' },
            ]}
          />
        </div>
        <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>
          新增实验室
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={laboratories}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: handlePaginationChange,
        }}
      />

      <LaboratoryModal
        visible={modalVisible}
        laboratory={editingLab}
        sites={sites}
        sitesLoading={sitesLoading}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
