import { useEffect, useState, useCallback, useRef } from 'react';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Button, Input, Tag, Switch, App, Space, Select, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { productService } from '../services/productService';
import { clientService } from '../services/clientService';
import { isAbortError } from '../services/api';
import { ProductModal } from '../components/products/ProductModal';
import type { Product, Client } from '../types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | undefined>(undefined);
  const [clientFilter, setClientFilter] = useState<number | undefined>(undefined);
  const [clients, setClients] = useState<Client[]>([]);

  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load clients for filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const clientsData = await clientService.getAllClients();
        setClients(clientsData);
      } catch {
        // Ignore errors for filter loading
      }
    };
    loadFilters();
  }, []);

  const fetchProducts = useCallback(
    async (page = 1, pageSize = 10, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await productService.getProducts({
          page,
          page_size: pageSize,
          search: searchText || undefined,
          is_active: showActiveOnly,
          client_id: clientFilter,
          signal,
        });
        setProducts(response.items);
        setPagination({
          current: response.page,
          pageSize: response.page_size,
          total: response.total,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          message.error('获取产品列表失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [searchText, showActiveOnly, clientFilter, message]
  );

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchProducts(pagination.current, pagination.pageSize, controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, showActiveOnly, clientFilter]);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchProducts(paginationConfig.current, paginationConfig.pageSize, controller.signal);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await productService.deleteProduct(id);
      message.success('删除成功');
      fetchProducts(pagination.current, pagination.pageSize);
    } catch {
      message.error('删除失败');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingProduct(null);
    fetchProducts(pagination.current, pagination.pageSize);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handleActiveFilterChange = (checked: boolean) => {
    setShowActiveOnly(checked ? true : undefined);
  };

  const columns: ColumnsType<Product> = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '产品编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: '所属客户',
      key: 'client',
      width: 150,
      render: (_, record) => record.client?.name || '-',
    },
    {
      title: '封装形式',
      key: 'package_form',
      width: 120,
      render: (_, record) => record.package_form?.name || '-',
    },
    {
      title: '封装类型',
      key: 'package_type',
      width: 140,
      render: (_, record) => record.package_type?.name || '-',
    },
    {
      title: '应用场景',
      key: 'scenarios',
      width: 200,
      render: (_, record) => {
        const scenarios = record.scenarios || [];
        if (scenarios.length === 0) return '-';
        return (
          <Space wrap size={[4, 4]}>
            {scenarios.map((s) => (
              <Tag key={s.id} color={s.color || 'blue'}>
                {s.name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '自定义信息',
      key: 'custom_info',
      width: 150,
      render: (_, record) => {
        const info = record.custom_info || [];
        if (info.length === 0) return '-';
        return (
          <Tooltip
            title={
              <div>
                {info.map((item, idx) => (
                  <div key={idx}>{item}</div>
                ))}
              </div>
            }
          >
            <Tag color="cyan">{info.length} 条信息</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此产品?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
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
        <Space wrap>
          <Input
            placeholder="搜索产品名称或编码"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="按客户筛选"
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={clientFilter}
            onChange={setClientFilter}
            options={clients.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>仅启用:</span>
            <Switch checked={showActiveOnly === true} onChange={handleActiveFilterChange} size="small" />
          </Space>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增产品
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
      />

      <ProductModal
        visible={modalVisible}
        product={editingProduct}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
