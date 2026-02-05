import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { App, Table, Button, Input, Select, Popconfirm, Tag } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { skillService } from '../services/skillService';
import { isAbortError } from '../services/api';
import { SkillModal } from '../components/skills/SkillModal';
import { StatusTag } from '../components/common/StatusTag';
import type { Skill, SkillCategory, SkillFilters } from '../types';

const categoryOptions = [
  { label: '全部类别', value: '' },
  { label: '设备操作', value: 'equipment_operation' },
  { label: '测试方法', value: 'testing_method' },
  { label: '分析技术', value: 'analysis_technique' },
  { label: '软件工具', value: 'software_tool' },
  { label: '安全程序', value: 'safety_procedure' },
  { label: '其他', value: 'other' },
];

const labTypeOptions = [
  { label: '全部实验室', value: '' },
  { label: '失效分析 (FA)', value: 'fa' },
  { label: '可靠性测试', value: 'reliability' },
];

const categoryLabels: Record<string, string> = {
  equipment_operation: '设备操作',
  testing_method: '测试方法',
  analysis_technique: '分析技术',
  software_tool: '软件工具',
  safety_procedure: '安全程序',
  other: '其他',
};

const labTypeLabels: Record<string, string> = {
  fa: 'FA',
  reliability: '可靠性',
};

const categoryColors: Record<string, 'processing' | 'success' | 'warning' | 'error' | 'default'> = {
  equipment_operation: 'processing',
  testing_method: 'success',
  analysis_technique: 'processing',
  software_tool: 'warning',
  safety_procedure: 'error',
  other: 'default',
};

export default function SkillsMatrix() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [labTypeFilter, setLabTypeFilter] = useState('');
  
  // Refs to prevent duplicate error messages and track mount state
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const { message } = App.useApp();

  const fetchSkills = useCallback(
    async (page = 1, pageSize = 10, search = '', category = '', labType = '') => {
      setLoading(true);
      try {
        const response = await skillService.getSkills({
          page,
          page_size: pageSize,
          search: search || undefined,
          category: (category || undefined) as SkillCategory | undefined,
          lab_type: labType || undefined,
        } as SkillFilters & { page?: number; page_size?: number });
        if (isMountedRef.current) {
          setSkills(response.items);
          setPagination({
            current: response.page,
            pageSize: response.page_size,
            total: response.total,
          });
          errorShownRef.current = false;
        }
      } catch (err) {
        if (!isAbortError(err)) {
          if (isMountedRef.current && !errorShownRef.current) {
            errorShownRef.current = true;
            message.error('获取技能列表失败');
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [message]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchSkills();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSkills]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
        fetchSkills(1, pagination.pageSize, searchValue, categoryFilter, labTypeFilter);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText, pagination.pageSize, categoryFilter, labTypeFilter, fetchSkills]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchSkills(paginationConfig.current || 1, paginationConfig.pageSize || 10, searchText, categoryFilter, labTypeFilter);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    fetchSkills(1, pagination.pageSize, searchText, value, labTypeFilter);
  };

  const handleLabTypeChange = (value: string) => {
    setLabTypeFilter(value);
    fetchSkills(1, pagination.pageSize, searchText, categoryFilter, value);
  };

  const handleAdd = () => {
    setEditingSkill(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Skill) => {
    setEditingSkill(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await skillService.deleteSkill(id);
      message.success('删除成功');
      fetchSkills(pagination.current, pagination.pageSize, searchText, categoryFilter, labTypeFilter);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingSkill(null);
    fetchSkills(pagination.current, pagination.pageSize, searchText, categoryFilter, labTypeFilter);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingSkill(null);
  };

  const columns: ColumnsType<Skill> = [
    {
      title: '技能代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '技能名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={categoryColors[category] || 'default'}>
          {categoryLabels[category] || category}
        </Tag>
      ),
    },
    {
      title: '适用实验室',
      dataIndex: 'lab_type',
      key: 'lab_type',
      width: 100,
      render: (labType: string) => (labType ? labTypeLabels[labType] || labType : '通用'),
    },
    {
      title: '需要认证',
      dataIndex: 'requires_certification',
      key: 'requires_certification',
      width: 100,
      render: (requires: boolean) => (
        <Tag color={requires ? 'warning' : 'default'}>
          {requires ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '认证有效期',
      dataIndex: 'certification_validity_days',
      key: 'certification_validity_days',
      width: 120,
      render: (days: number) => (days ? `${days}天` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => <StatusTag isActive={isActive} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            description={`确定要删除技能 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            placeholder="搜索技能名称或代码"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 256 }}
            allowClear
          />
          <Select
            value={categoryFilter}
            onChange={handleCategoryChange}
            options={categoryOptions}
            style={{ width: 144 }}
          />
          <Select
            value={labTypeFilter}
            onChange={handleLabTypeChange}
            options={labTypeOptions}
            style={{ width: 144 }}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增技能
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={skills}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
      />

      <SkillModal
        visible={modalVisible}
        skill={editingSkill}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
