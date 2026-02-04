import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Table, Button, Input, Select, Tag, Popconfirm, App, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { personnelService } from '../services/personnelService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import { PersonnelModal } from '../components/personnel/PersonnelModal';
import type { Personnel, Site, Laboratory, User, PersonnelStatus } from '../types';

const statusLabels: Record<PersonnelStatus, { text: string; color: 'success' | 'blue' | 'warning' | 'purple' | 'default' }> = {
  available: { text: '可用', color: 'success' },
  busy: { text: '忙碌', color: 'blue' },
  on_leave: { text: '休假', color: 'warning' },
  borrowed: { text: '借调中', color: 'purple' },
};

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [users] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    search: string;
    site_id?: number;
    laboratory_id?: number;
    status?: PersonnelStatus;
  }>({
    search: '',
  });
  const [searchValue, setSearchValue] = useState('');
  
  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPersonnel = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await personnelService.getPersonnel({
          page,
          page_size: pageSize,
          search: filters.search || undefined,
          site_id: filters.site_id,
          laboratory_id: filters.laboratory_id,
          status: filters.status,
          signal,
        });
        setPersonnel(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          message.error('获取人员列表失败');
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
    
    fetchPersonnel(1, pagination.pageSize, controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchPersonnel, pagination.pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchValue }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchPersonnel(paginationConfig.current, paginationConfig.pageSize);
  };

  const handleSiteFilterChange = (value: number | undefined) => {
    setFilters((prev) => ({ ...prev, site_id: value, laboratory_id: undefined }));
  };

  const handleLabFilterChange = (value: number | undefined) => {
    setFilters((prev) => ({ ...prev, laboratory_id: value }));
  };

  const handleStatusFilterChange = (value: PersonnelStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleAdd = () => {
    setEditingPersonnel(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Personnel) => {
    setEditingPersonnel(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await personnelService.deletePersonnel(id);
      message.success('删除成功');
      fetchPersonnel(pagination.current, pagination.pageSize);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingPersonnel(null);
    fetchPersonnel(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingPersonnel(null);
  };

  const getSiteName = (siteId: number) => {
    const site = sites.find((s) => s.id === siteId);
    return site ? `${site.name} (${site.code})` : '-';
  };

  const getLabName = (labId: number) => {
    const lab = laboratories.find((l) => l.id === labId);
    return lab ? `${lab.name} (${lab.code})` : '-';
  };

  const filteredLaboratories = filters.site_id
    ? laboratories.filter((lab) => lab.site_id === filters.site_id)
    : laboratories;

  const columns: ColumnsType<Personnel> = [
    {
      title: '员工编号',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 120,
    },
    {
      title: '姓名',
      key: 'name',
      width: 100,
      render: (_, record) => record.user?.full_name || record.user?.username || '-',
    },
    {
      title: '职位',
      dataIndex: 'job_title',
      key: 'job_title',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (value) => (value as string) || '-',
    },
    {
      title: '主站点',
      dataIndex: 'primary_site_id',
      key: 'primary_site_id',
      width: 150,
      render: (value, record) =>
        record.primary_site ? `${record.primary_site.name} (${record.primary_site.code})` : getSiteName(value as number),
    },
    {
      title: '主实验室',
      dataIndex: 'primary_laboratory_id',
      key: 'primary_laboratory_id',
      width: 180,
      render: (value, record) =>
        record.primary_laboratory ? `${record.primary_laboratory.name}` : getLabName(value as number),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value) => {
        const status = value as PersonnelStatus;
        const config = statusLabels[status] || { text: status, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
            description={`确定要删除员工 "${record.employee_id}" 吗？`}
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
    <div data-testid="personnel-page">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索员工编号或职位"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
            allowClear
            data-testid="personnel-search-input"
          />
          <Select
            placeholder="站点"
            value={filters.site_id}
            onChange={handleSiteFilterChange}
            style={{ width: 150 }}
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
            style={{ width: 180 }}
            allowClear
            options={filteredLaboratories.map((lab) => ({
              label: `${lab.name} (${lab.code})`,
              value: lab.id,
            }))}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={handleStatusFilterChange}
            style={{ width: 120 }}
            allowClear
            options={Object.entries(statusLabels).map(([value, config]) => ({
              label: config.text,
              value,
            }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} data-testid="personnel-add-button">
          新增人员
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={personnel}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        data-testid="personnel-table"
      />

      <PersonnelModal
        visible={modalVisible}
        personnel={editingPersonnel}
        sites={sites}
        laboratories={laboratories}
        users={users}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
