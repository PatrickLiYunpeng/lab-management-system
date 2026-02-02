import { useEffect, useState, useCallback, useRef } from 'react';
import { SearchOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { Table, Button, Input, Tag, Switch, App, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { clientService } from '../services/clientService';
import { isAbortError } from '../services/api';
import { ClientModal } from '../components/clients/ClientModal';
import type { Client } from '../types';

const priorityLabels: Record<number, { text: string; color: 'red' | 'orange' | 'blue' | 'green' | 'default' }> = {
  1: { text: '最高', color: 'red' },
  2: { text: '高', color: 'orange' },
  3: { text: '中', color: 'blue' },
  4: { text: '低', color: 'green' },
  5: { text: '最低', color: 'default' },
};

const sourceCategoryLabels: Record<string, string> = {
  vip: 'VIP客户',
  internal: '内部测试',
  external: '外部客户',
  routine: '常规测试',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | undefined>(undefined);
  
  const { message } = App.useApp();
  // Ref to store abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await clientService.getClients({
          page,
          page_size: pageSize,
          search: searchText || undefined,
          is_active: showActiveOnly,
          signal,
        });
        setClients(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        // Ignore abort errors
        if (!isAbortError(err)) {
          message.error('获取客户列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [searchText, showActiveOnly, message]
  );

  // Clients fetch with AbortController for request cancellation
  useEffect(() => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchClients(pagination.current, pagination.pageSize, controller.signal);
    
    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, showActiveOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchClients(paginationConfig.current, paginationConfig.pageSize, controller.signal);
  };

  const handleAdd = () => {
    setEditingClient(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Client) => {
    setEditingClient(record);
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingClient(null);
    fetchClients(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingClient(null);
  };

  const handleActiveFilterChange = (checked: boolean) => {
    setShowActiveOnly(checked ? true : undefined);
  };

  const columns: ColumnsType<Client> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '客户代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '优先级',
      dataIndex: 'priority_level',
      key: 'priority_level',
      width: 90,
      render: (value) => {
        const level = value as number;
        const config = priorityLabels[level] || { text: `${level}`, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'SLA天数',
      dataIndex: 'default_sla_days',
      key: 'default_sla_days',
      width: 90,
      render: (value) => `${value as number} 天`,
    },
    {
      title: '来源类别',
      dataIndex: 'source_category',
      key: 'source_category',
      width: 100,
      render: (value) => sourceCategoryLabels[value as string] || (value as string),
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      key: 'contact_name',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      title: '联系邮箱',
      dataIndex: 'contact_email',
      key: 'contact_email',
      width: 180,
      render: (value) => (value as string) || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value) => (
        <Tag color={(value as boolean) ? 'success' : 'default'}>{(value as boolean) ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索客户名称或代码"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>仅启用:</span>
            <Switch checked={showActiveOnly === true} onChange={handleActiveFilterChange} size="small" />
          </Space>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增客户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={clients}
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

      <ClientModal
        visible={modalVisible}
        client={editingClient}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
