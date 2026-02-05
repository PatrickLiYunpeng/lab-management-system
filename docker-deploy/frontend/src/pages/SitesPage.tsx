import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Table, Button, Input, Popconfirm, Space, App } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { siteService } from '../services/siteService';
import { isAbortError } from '../services/api';
import { SiteModal } from '../components/sites/SiteModal';
import { StatusTag } from '../components/common/StatusTag';
import type { Site } from '../types';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [searchValue, setSearchValue] = useState('');
  
  const { message } = App.useApp();
  // Ref to prevent duplicate error messages in React StrictMode
  const errorShownRef = useRef(false);

  const fetchSites = useCallback(async (page = 1, pageSize = 10, search = '') => {
    setLoading(true);
    try {
      const response = await siteService.getSites({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      setSites(response.items);
      setPagination({
        current: response.page,
        pageSize: response.page_size,
        total: response.total,
      });
      errorShownRef.current = false; // Reset on success
    } catch (err) {
      if (!isAbortError(err)) {
        // Only show error message once (prevents duplicate in React StrictMode)
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          message.error('获取站点列表失败');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
        fetchSites(1, pagination.pageSize as number, searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText, pagination.pageSize, fetchSites]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchSites(paginationConfig.current, paginationConfig.pageSize, searchText);
  };

  const handleAdd = () => {
    setEditingSite(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Site) => {
    setEditingSite(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await siteService.deleteSite(id);
      message.success('删除成功');
      fetchSites(pagination.current, pagination.pageSize as number, searchText);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingSite(null);
    fetchSites(pagination.current, pagination.pageSize as number, searchText);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingSite(null);
  };

  const columns: ColumnsType<Site> = [
    {
      title: '站点名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '站点代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      key: 'contact_name',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: '时区',
      dataIndex: 'timezone',
      key: 'timezone',
      width: 150,
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
            description={`确定要删除站点 "${record.name}" 吗？`}
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
    <div data-testid="sites-page">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="搜索站点名称或代码"
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 300 }}
          allowClear
          data-testid="sites-search-input"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} data-testid="sites-add-button">
          新增站点
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sites}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        data-testid="sites-table"
      />

      <SiteModal
        visible={modalVisible}
        site={editingSite}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
