import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Table, Button, Input, Popconfirm, Tag, Modal, InputNumber, Switch, useToast, useForm, Form, FormItem, TextArea, type TableColumn, type FormInstance } from '../components/ui';
import { clientSlaService } from '../services/clientSlaService';
import type { TestingSourceCategory, TestingSourceCategoryFormData } from '../types';

interface CategoryFormValues {
  name: string;
  code: string;
  priority_weight: number;
  display_order: number;
  description?: string;
  color?: string;
  is_active: boolean;
  is_default: boolean;
}

export default function TestingSourceCategoriesPage() {
  const [categories, setCategories] = useState<TestingSourceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TestingSourceCategory | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');
  
  const [form] = useForm<CategoryFormValues>({
    initialValues: {
      name: '',
      code: '',
      priority_weight: 10,
      display_order: 0,
      description: '',
      color: '#1890ff',
      is_active: true,
      is_default: false,
    },
    rules: {
      name: [{ required: true, message: '请输入名称' }],
      code: [{ required: true, message: '请输入代码' }],
    },
  });

  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const toast = useToast();

  const fetchCategories = useCallback(async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const response = await clientSlaService.getSourceCategories({
        page,
        page_size: pageSize,
        search: searchText || undefined,
      });
      if (isMountedRef.current) {
        setCategories(response.items);
        setPagination({ current: response.page, pageSize: response.page_size, total: response.total });
        errorShownRef.current = false;
      }
    } catch {
      if (isMountedRef.current && !errorShownRef.current) {
        errorShownRef.current = true;
        toast.error('获取来源类别列表失败');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [searchText, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText]);

  const handleTableChange = (page: number, pageSize: number) => {
    fetchCategories(page, pageSize);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ priority_weight: 10, display_order: 0, is_active: true, is_default: false, color: '#1890ff' });
    setModalVisible(true);
  };

  const handleEdit = (record: TestingSourceCategory) => {
    setEditingCategory(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      priority_weight: record.priority_weight,
      display_order: record.display_order,
      description: record.description || '',
      color: record.color || '#1890ff',
      is_active: record.is_active,
      is_default: record.is_default,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await clientSlaService.deleteSourceCategory(id);
      toast.success('删除成功');
      fetchCategories(pagination.current, pagination.pageSize);
    } catch (error: unknown) {
      const errorMsg = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail 
        : '删除失败';
      toast.error(errorMsg || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCategory) {
        await clientSlaService.updateSourceCategory(editingCategory.id, values);
        toast.success('更新成功');
      } else {
        await clientSlaService.createSourceCategory(values as TestingSourceCategoryFormData);
        toast.success('创建成功');
      }
      setModalVisible(false);
      fetchCategories(pagination.current, pagination.pageSize);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      toast.error(editingCategory ? '更新失败' : '创建失败');
    }
  };

  const getPriorityColor = (weight: number): 'error' | 'warning' | 'processing' | 'default' => {
    if (weight >= 25) return 'error';
    if (weight >= 15) return 'warning';
    if (weight >= 10) return 'processing';
    return 'default';
  };

  const columns: TableColumn<TestingSourceCategory>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: unknown, record: TestingSourceCategory) => (
        <div className="flex items-center gap-2">
          {record.color && (
            <span 
              className="inline-block w-3 h-3 rounded-sm" 
              style={{ backgroundColor: record.color }} 
            />
          )}
          <span>{name as string}</span>
          {record.is_default && <StarIconSolid className="w-4 h-4 text-warning-500" />}
        </div>
      ),
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '优先权重',
      dataIndex: 'priority_weight',
      key: 'priority_weight',
      width: 100,
      render: (weight: unknown) => (
        <Tag color={getPriorityColor(weight as number)}>{weight as number}</Tag>
      ),
    },
    {
      title: '显示顺序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: unknown) => (text as string) || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: unknown) => (
        <Tag color={(isActive as boolean) ? 'success' : 'default'}>
          {(isActive as boolean) ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault: unknown) => (isDefault as boolean) ? <Tag color="warning">默认</Tag> : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: TestingSourceCategory) => (
        <div className="flex items-center gap-2">
          <Button variant="link" size="small" onClick={() => handleEdit(record)}>
            <PencilIcon className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={record.is_default ? "默认类别无法删除" : "确定要删除此来源类别吗？"}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button variant="link" size="small" danger disabled={record.is_default}>
              <TrashIcon className="w-4 h-4 mr-1" />
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="搜索名称或代码"
          prefix={<MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-56"
          allowClear
        />
        <Button variant="primary" onClick={handleAdd}>
          <PlusIcon className="w-4 h-4 mr-1" />
          新增来源类别
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: handleTableChange,
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        title={editingCategory ? '编辑来源类别' : '新增来源类别'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form form={form as unknown as FormInstance} layout="vertical">
          <FormItem name="name" label="名称">
            <Input placeholder="类别名称" />
          </FormItem>
          <FormItem name="code" label="代码">
            <Input placeholder="唯一代码，如: vip, internal" disabled={!!editingCategory} />
          </FormItem>
          <div className="grid grid-cols-2 gap-4">
            <FormItem name="priority_weight" label="优先权重" extra="0-30，数值越高优先级越高">
              <InputNumber min={0} max={30} className="w-full" />
            </FormItem>
            <FormItem name="display_order" label="显示顺序">
              <InputNumber min={0} className="w-full" />
            </FormItem>
          </div>
          <FormItem name="color" label="颜色">
            <Input type="color" className="w-20 h-8 p-0 border-0" />
          </FormItem>
          <FormItem name="description" label="描述">
            <TextArea rows={2} placeholder="类别说明" />
          </FormItem>
          <div className="grid grid-cols-2 gap-4">
            <FormItem name="is_active" label="状态" valuePropName="checked">
              <Switch />
            </FormItem>
            <FormItem name="is_default" label="设为默认" valuePropName="checked" extra="新工单默认使用此类别">
              <Switch />
            </FormItem>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
