import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Table, Button, Input, Select, Popconfirm, Space, App } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
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
  const [pagination, setPagination] = useState<TablePaginationConfig>({
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
  
  const { message } = App.useApp();
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
          message.error('获取实验室列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, message]
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
    
    fetchLaboratories(pagination.current as number, pagination.pageSize as number, controller.signal);
    
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
    
    fetchLaboratories(paginationConfig.current, paginationConfig.pageSize, controller.signal);
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
      message.success('删除成功');
      fetchLaboratories(pagination.current as number, pagination.pageSize as number);
    } catch {
      message.error('删除失败');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingLab(null);
    fetchLaboratories(pagination.current as number, pagination.pageSize as number);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingLab(null);
  };

  const getSiteName = (siteId: number) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || '-';
  };

  const columns: ColumnsType<Laboratory> = [
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
      render: (value) => labTypeLabels[value as LaboratoryType] || value,
    },
    {
      title: '所属站点',
      dataIndex: 'site_id',
      key: 'site_id',
      width: 150,
      render: (value, record) => record.site?.name || getSiteName(value),
    },
    {
      title: '容量',
      dataIndex: 'max_capacity',
      key: 'max_capacity',
      width: 80,
      render: (value) => value || '-',
    },
    {
      title: '负责人',
      dataIndex: 'manager_name',
      key: 'manager_name',
      width: 100,
      render: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value) => <StatusTag isActive={value} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
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
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索实验室名称或代码"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="所属站点"
            value={filters.site_id}
            onChange={(value) => setFilters((prev) => ({ ...prev, site_id: value }))}
            style={{ width: 180 }}
            allowClear
            loading={sitesLoading}
            options={sites.map((site) => ({
              label: site.name,
              value: site.id,
            }))}
          />
          <Select
            placeholder="实验室类型"
            value={filters.lab_type}
            onChange={(value) => setFilters((prev) => ({ ...prev, lab_type: value }))}
            style={{ width: 150 }}
            allowClear
            options={[
              { label: 'FA (失效分析)', value: 'fa' },
              { label: '可靠性测试', value: 'reliability' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
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
        }}
        onChange={handleTableChange}
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
