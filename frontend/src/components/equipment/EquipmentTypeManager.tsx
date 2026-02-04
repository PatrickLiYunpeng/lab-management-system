import { useEffect, useState, useCallback } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Popconfirm,
  App,
  Space,
  Row,
  Col,
  Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { equipmentService } from '../../services/equipmentService';
import { StatusTag } from '../common/StatusTag';
import { EquipmentCategoryModal } from './EquipmentCategoryModal';
import { EquipmentNameModal } from './EquipmentNameModal';
import type {
  EquipmentCategoryRecord,
  EquipmentNameWithCategory,
} from '../../types';

export function EquipmentTypeManager() {
  const [categories, setCategories] = useState<EquipmentCategoryRecord[]>([]);
  const [equipmentNames, setEquipmentNames] = useState<EquipmentNameWithCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingNames, setLoadingNames] = useState(false);

  // Category modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EquipmentCategoryRecord | null>(null);

  // Equipment name modal state
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [editingName, setEditingName] = useState<EquipmentNameWithCategory | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [nameSearchValue, setNameSearchValue] = useState('');

  const { message } = App.useApp();

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await equipmentService.getEquipmentCategories();
      setCategories(data);
    } catch {
      message.error('获取设备类别失败');
    } finally {
      setLoadingCategories(false);
    }
  }, [message]);

  // Fetch equipment names
  const fetchEquipmentNames = useCallback(async () => {
    setLoadingNames(true);
    try {
      const data = await equipmentService.getEquipmentNames({
        category_id: categoryFilter,
        search: nameSearchValue || undefined,
      });
      setEquipmentNames(data);
    } catch {
      message.error('获取设备名列表失败');
    } finally {
      setLoadingNames(false);
    }
  }, [categoryFilter, nameSearchValue, message]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchEquipmentNames();
  }, [fetchEquipmentNames]);

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (record: EquipmentCategoryRecord) => {
    setEditingCategory(record);
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await equipmentService.deleteEquipmentCategory(id);
      message.success('删除成功');
      fetchCategories();
      fetchEquipmentNames();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const detail = err?.response?.data?.detail;
      message.error(detail || '删除失败');
    }
  };

  const handleCategoryModalSuccess = () => {
    setCategoryModalVisible(false);
    setEditingCategory(null);
    fetchCategories();
  };

  // Equipment name handlers
  const handleAddName = () => {
    setEditingName(null);
    setNameModalVisible(true);
  };

  const handleEditName = (record: EquipmentNameWithCategory) => {
    setEditingName(record);
    setNameModalVisible(true);
  };

  const handleDeleteName = async (id: number) => {
    try {
      await equipmentService.deleteEquipmentName(id);
      message.success('删除成功');
      fetchEquipmentNames();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const detail = err?.response?.data?.detail;
      message.error(detail || '删除失败');
    }
  };

  const handleNameModalSuccess = () => {
    setNameModalVisible(false);
    setEditingName(null);
    fetchEquipmentNames();
  };

  // Category columns
  const categoryColumns: ColumnsType<EquipmentCategoryRecord> = [
    {
      title: '类别名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '类别编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '排序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80,
      align: 'center',
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
            onClick={() => handleEditCategory(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除类别 "${record.name}" 吗？删除后该类别下的设备名将无法关联。`}
            onConfirm={() => handleDeleteCategory(record.id)}
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

  // Equipment name columns
  const nameColumns: ColumnsType<EquipmentNameWithCategory> = [
    {
      title: '设备名',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '所属类别',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (_, record) => record.category?.name || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '关键设备',
      dataIndex: 'is_critical',
      key: 'is_critical',
      width: 90,
      align: 'center',
      render: (value) => (value ? <span style={{ color: '#f5222d' }}>是</span> : <span style={{ color: '#8c8c8c' }}>否</span>),
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
            onClick={() => handleEditName(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除设备名 "${record.name}" 吗？`}
            onConfirm={() => handleDeleteName(record.id)}
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
      <Row gutter={16}>
        {/* Left: Category List */}
        <Col span={10}>
          <Card
            title="设备类别管理"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
                新增类别
              </Button>
            }
          >
            <Table
              columns={categoryColumns}
              dataSource={categories}
              rowKey="id"
              loading={loadingCategories}
              pagination={false}
              size="small"
              scroll={{ y: 500 }}
            />
          </Card>
        </Col>

        {/* Right: Equipment Name List */}
        <Col span={14}>
          <Card
            title="设备名管理"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddName}>
                新增设备名
              </Button>
            }
          >
            <Space style={{ marginBottom: 16 }} wrap>
              <Input
                placeholder="搜索设备名"
                prefix={<SearchOutlined />}
                value={nameSearchValue}
                onChange={(e) => setNameSearchValue(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="按类别筛选"
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 150 }}
                allowClear
                options={categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                }))}
              />
            </Space>
            <Table
              columns={nameColumns}
              dataSource={equipmentNames}
              rowKey="id"
              loading={loadingNames}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
              size="small"
              scroll={{ y: 400 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Category Modal */}
      <EquipmentCategoryModal
        visible={categoryModalVisible}
        category={editingCategory}
        onSuccess={handleCategoryModalSuccess}
        onCancel={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
        }}
      />

      {/* Equipment Name Modal */}
      <EquipmentNameModal
        visible={nameModalVisible}
        equipmentName={editingName}
        categories={categories}
        onSuccess={handleNameModalSuccess}
        onCancel={() => {
          setNameModalVisible(false);
          setEditingName(null);
        }}
      />
    </div>
  );
}
