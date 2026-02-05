import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { StarFilled } from '@ant-design/icons';
import { App, Table, Button, Input, Popconfirm, Tag, Modal, InputNumber, Switch, Form, Row, Col, Tabs } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { productService } from '../services/productService';
import { isAbortError } from '../services/api';
import type {
  PackageFormOption,
  PackageFormOptionFormData,
  PackageTypeOption,
  PackageTypeOptionFormData,
  ApplicationScenario,
  ApplicationScenarioFormData,
} from '../types';

const { TextArea } = Input;

// Generic form values interface
interface ConfigFormValues {
  name: string;
  code: string;
  display_order: number;
  description?: string;
  color?: string;
  is_active: boolean;
  is_default: boolean;
}

type ConfigItem = PackageFormOption | PackageTypeOption | ApplicationScenario;

export default function ProductConfigPage() {
  const [activeTab, setActiveTab] = useState('package-forms');
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');

  const [form] = Form.useForm<ConfigFormValues>();
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const { message } = App.useApp();

  const fetchItems = useCallback(
    async (page = 1, pageSize = 50) => {
      setLoading(true);
      try {
        let response;
        const params = { page, page_size: pageSize, search: searchText || undefined };

        switch (activeTab) {
          case 'package-forms':
            response = await productService.getPackageForms(params);
            break;
          case 'package-types':
            response = await productService.getPackageTypes(params);
            break;
          case 'scenarios':
            response = await productService.getScenarios(params);
            break;
          default:
            return;
        }

        if (isMountedRef.current) {
          setItems(response.items);
          setPagination({ current: response.page, pageSize: response.page_size, total: response.total });
          errorShownRef.current = false;
        }
      } catch (err) {
        if (!isAbortError(err)) {
          if (isMountedRef.current && !errorShownRef.current) {
            errorShownRef.current = true;
            message.error('获取配置列表失败');
          }
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [activeTab, searchText, message]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setSearchValue('');
    setSearchText('');
    fetchItems();
  }, [activeTab, fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [searchText, fetchItems]);

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
    fetchItems(paginationConfig.current || 1, paginationConfig.pageSize || 50);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      display_order: 0,
      is_active: true,
      is_default: false,
      color: activeTab === 'scenarios' ? '#1890ff' : undefined,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: ConfigItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      display_order: record.display_order,
      description: record.description || '',
      color: 'color' in record ? record.color || '#1890ff' : undefined,
      is_active: record.is_active,
      is_default: record.is_default,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      switch (activeTab) {
        case 'package-forms':
          await productService.deletePackageForm(id);
          break;
        case 'package-types':
          await productService.deletePackageType(id);
          break;
        case 'scenarios':
          await productService.deleteScenario(id);
          break;
      }
      message.success('删除成功');
      fetchItems(pagination.current, pagination.pageSize);
    } catch (error: unknown) {
      const errorMsg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : '删除失败';
      message.error(errorMsg || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingItem) {
        switch (activeTab) {
          case 'package-forms':
            await productService.updatePackageForm(editingItem.id, values);
            break;
          case 'package-types':
            await productService.updatePackageType(editingItem.id, values);
            break;
          case 'scenarios':
            await productService.updateScenario(editingItem.id, values);
            break;
        }
        message.success('更新成功');
      } else {
        switch (activeTab) {
          case 'package-forms':
            await productService.createPackageForm(values as PackageFormOptionFormData);
            break;
          case 'package-types':
            await productService.createPackageType(values as PackageTypeOptionFormData);
            break;
          case 'scenarios':
            await productService.createScenario(values as ApplicationScenarioFormData);
            break;
        }
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchItems(pagination.current, pagination.pageSize);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(editingItem ? '更新失败' : '创建失败');
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'package-forms':
        return '封装形式';
      case 'package-types':
        return '封装产品类型';
      case 'scenarios':
        return '应用场景';
      default:
        return '配置项';
    }
  };

  const columns: ColumnsType<ConfigItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {'color' in record && record.color && (
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: record.color,
              }}
            />
          )}
          <span>{name}</span>
          {record.is_default && <StarFilled style={{ color: '#faad14' }} />}
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
      title: '显示顺序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => <Tag color={isActive ? 'success' : 'default'}>{isActive ? '启用' : '停用'}</Tag>,
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault: boolean) => (isDefault ? <Tag color="warning">默认</Tag> : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={record.is_default ? '默认配置无法删除' : '确定要删除此配置项吗？'}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.is_default}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const tabItems = [
    { key: 'package-forms', label: '封装形式' },
    { key: 'package-types', label: '封装产品类型' },
    { key: 'scenarios', label: '应用场景' },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ marginBottom: 16 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input
          placeholder="搜索名称或代码"
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 224 }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增{getTabTitle()}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={items}
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
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingItem ? `编辑${getTabTitle()}` : `新增${getTabTitle()}`}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="配置项名称" />
          </Form.Item>
          <Form.Item name="code" label="代码" rules={[{ required: true, message: '请输入代码' }]}>
            <Input placeholder="唯一代码，如: FC-BGA" disabled={!!editingItem} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="display_order" label="显示顺序">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            {activeTab === 'scenarios' && (
              <Col span={12}>
                <Form.Item name="color" label="颜色">
                  <Input type="color" style={{ width: 80, height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="配置项说明" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_active" label="状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_default" label="设为默认" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
