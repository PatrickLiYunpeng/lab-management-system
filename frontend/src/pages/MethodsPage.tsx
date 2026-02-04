import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Table, Button, Input, Select, Tag, Popconfirm, Tooltip, App, Card, Space, Tabs } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { methodService } from '../services/methodService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import { MethodModal } from '../components/methods/MethodModal';
import type { Method, Laboratory, MethodFilters } from '../types';

const methodTypeLabels: Record<string, string> = {
  analysis: '分析方法',
  reliability: '可靠性测试',
};

const methodTypeColors: Record<string, 'blue' | 'purple' | 'default'> = {
  analysis: 'blue',
  reliability: 'purple',
};

const categoryLabels: Record<string, string> = {
  electrical: '电学分析',
  physical: '物理分析',
  chemical: '化学分析',
  optical: '光学分析',
  thermal: '热分析',
  mechanical: '机械测试',
  environmental: '环境测试',
  lifetime: '寿命测试',
  other: '其他',
};

export default function MethodsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<MethodFilters>({});
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'reliability'>('analysis');
  
  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadLaboratories = async () => {
      try {
        const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
        setLaboratories(response.items);
      } catch (err) {
        if (!isAbortError(err)) {
          // Ignore - secondary data
        }
      }
    };
    loadLaboratories();
  }, []);

  const fetchMethods = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await methodService.getMethods({
        page,
        page_size: pageSize,
        search: filters.search || undefined,
        method_type: activeTab,
        category: filters.category || undefined,
        laboratory_id: filters.laboratory_id || undefined,
        is_active: filters.is_active,
        signal,
      });
      setMethods(response.items);
      setTotal(response.total);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('获取方法列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, activeTab, message]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchMethods(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchMethods]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchValue || undefined }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    setPage(paginationConfig.current || 1);
    setPageSize(paginationConfig.pageSize || 20);
  };

  const handleAdd = () => {
    setEditingMethod(null);
    setModalVisible(true);
  };

  const handleEdit = (method: Method) => {
    setEditingMethod(method);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await methodService.deleteMethod(id);
      message.success('方法已删除');
      fetchMethods();
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingMethod(null);
    fetchMethods();
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingMethod(null);
  };

  const handleFilterChange = (key: keyof MethodFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'analysis' | 'reliability');
    setPage(1);
    setSearchValue('');
    setFilters({});
  };

  const handleStatusFilterChange = (value: string | undefined) => {
    if (value === undefined || value === '') {
      setFilters(prev => ({ ...prev, is_active: undefined }));
    } else {
      setFilters(prev => ({ ...prev, is_active: value === 'true' }));
    }
    setPage(1);
  };

  const columns: ColumnsType<Method> = [
    {
      title: '方法代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (value) => <span style={{ fontWeight: 600 }}>{value as string}</span>,
    },
    {
      title: '方法名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'method_type',
      key: 'method_type',
      width: 120,
      render: (value) => {
        const type = value as string;
        return <Tag color={methodTypeColors[type] || 'default'}>{methodTypeLabels[type] || type}</Tag>;
      },
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (value) => value ? (categoryLabels[value as string] || (value as string)) : '-',
    },
    {
      title: '所属实验室',
      key: 'laboratory',
      width: 150,
      render: (_, record) => record.laboratory?.name || '-',
    },
    {
      title: '预计周期',
      dataIndex: 'standard_cycle_hours',
      key: 'standard_cycle_hours',
      width: 100,
      render: (value) => value ? `${value as number}h` : '-',
    },
    {
      title: '技能要求',
      key: 'skills',
      width: 100,
      render: (_, record) => (
        <Tooltip 
          title={record.skill_requirements.length > 0 
            ? record.skill_requirements.map(sr => sr.skill?.name).join(', ')
            : '无技能要求'}
        >
          <Tag>{record.skill_requirements.length} 项技能</Tag>
        </Tooltip>
      ),
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
            description={`确定要删除方法 "${record.name}" 吗？`}
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
    <Card>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: 'analysis', label: '分析方法管理' },
          { key: 'reliability', label: '可靠性测试方法管理' },
        ]}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索方法名称/代码"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="方法类别"
            style={{ width: 120 }}
            allowClear
            value={filters.category}
            onChange={(v) => handleFilterChange('category', v)}
            options={Object.entries(categoryLabels).map(([value, label]) => ({ label, value }))}
          />
          <Select
            placeholder="所属实验室"
            style={{ width: 160 }}
            allowClear
            value={filters.laboratory_id}
            onChange={(v) => handleFilterChange('laboratory_id', v)}
            options={laboratories.map(lab => ({ label: lab.name, value: lab.id }))}
          />
          <Select
            placeholder="状态"
            style={{ width: 100 }}
            allowClear
            value={filters.is_active === undefined ? undefined : (filters.is_active ? 'true' : 'false')}
            onChange={handleStatusFilterChange}
            options={[
              { label: '启用', value: 'true' },
              { label: '停用', value: 'false' },
            ]}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchMethods()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {activeTab === 'analysis' ? '新增分析方法' : '新增测试方法'}
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={methods}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
        onChange={handleTableChange}
      />

      <MethodModal
        visible={modalVisible}
        method={editingMethod}
        defaultMethodType={activeTab}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </Card>
  );
}
