import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Tag, Popconfirm, Tooltip, useToast, type TableColumn } from '../components/ui';
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
  
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadLaboratories = async () => {
      try {
        const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
        setLaboratories(response.items);
      } catch {
        // Ignore - secondary data
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
        method_type: filters.method_type || undefined,
        category: filters.category || undefined,
        laboratory_id: filters.laboratory_id || undefined,
        is_active: filters.is_active,
        signal,
      });
      setMethods(response.items);
      setTotal(response.total);
    } catch (err) {
      if (!isAbortError(err)) {
        toast.error('获取方法列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, toast]);

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

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
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
      toast.success('方法已删除');
      fetchMethods();
    } catch {
      toast.error('删除失败');
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

  const handleFilterChange = (key: keyof MethodFilters, value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters(prev => ({ ...prev, [key]: v }));
    setPage(1);
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (v === undefined || v === '') {
      setFilters(prev => ({ ...prev, is_active: undefined }));
    } else {
      setFilters(prev => ({ ...prev, is_active: v === 'true' }));
    }
    setPage(1);
  };

  const columns: TableColumn<Method>[] = [
    {
      title: '方法代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (value) => <span className="font-semibold">{value as string}</span>,
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
      title: '标准周期',
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
            description={`确定要删除方法 "${record.name}" 吗？`}
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">分析/测试方法管理</h2>
        <div className="flex gap-2">
          <Button icon={<ArrowPathIcon className="w-4 h-4" />} onClick={() => fetchMethods()}>
            刷新
          </Button>
          <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>
            新增方法
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Input
          placeholder="搜索方法名称/代码"
          prefix={<MagnifyingGlassIcon className="w-4 h-4" />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-[200px]"
          allowClear
        />
        <Select
          placeholder="方法类型"
          className="w-[140px]"
          allowClear
          value={filters.method_type}
          onChange={(v) => handleFilterChange('method_type', v)}
          options={[
            { label: '分析方法', value: 'analysis' },
            { label: '可靠性测试', value: 'reliability' },
          ]}
        />
        <Select
          placeholder="方法类别"
          className="w-[120px]"
          allowClear
          value={filters.category}
          onChange={(v) => handleFilterChange('category', v)}
          options={Object.entries(categoryLabels).map(([value, label]) => ({ label, value }))}
        />
        <Select
          placeholder="所属实验室"
          className="w-[160px]"
          allowClear
          value={filters.laboratory_id}
          onChange={(v) => handleFilterChange('laboratory_id', v)}
          options={laboratories.map(lab => ({ label: lab.name, value: lab.id }))}
        />
        <Select
          placeholder="状态"
          className="w-[100px]"
          allowClear
          value={filters.is_active === undefined ? undefined : (filters.is_active ? 'true' : 'false')}
          onChange={handleStatusFilterChange}
          options={[
            { label: '启用', value: 'true' },
            { label: '停用', value: 'false' },
          ]}
        />
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
          onChange: handlePaginationChange,
        }}
      />

      <MethodModal
        visible={modalVisible}
        method={editingMethod}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
