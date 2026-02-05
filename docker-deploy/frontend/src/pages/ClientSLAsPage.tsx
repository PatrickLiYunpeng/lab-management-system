import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Table, Button, Select, Tag, Popconfirm, App, Modal, Input, InputNumber, Switch, Form, Row, Col,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { clientSlaService } from '../services/clientSlaService';
import { clientService } from '../services/clientService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type { ClientSLA, ClientSLAFormData, Client, Laboratory, TestingSourceCategory, MethodType } from '../types';
import { MethodType as MethodTypeEnum } from '../types';

const { TextArea } = Input;

// 方法类型标签显示配置
const methodTypeLabels: Record<MethodType, string> = {
  [MethodTypeEnum.ANALYSIS]: '分析',
  [MethodTypeEnum.RELIABILITY]: '可靠性',
};

interface SLAFormValues {
  client_id: number;
  laboratory_id?: number;
  method_type?: MethodType;
  source_category_id?: number;
  commitment_hours: number;
  max_hours?: number;
  priority_weight: number;
  description?: string;
  is_active: boolean;
}

export default function ClientSLAsPage() {
  const [slas, setSlas] = useState<ClientSLA[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [sourceCategories, setSourceCategories] = useState<TestingSourceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSLA, setEditingSLA] = useState<ClientSLA | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<{ client_id?: number; laboratory_id?: number; is_active?: boolean }>({});

  const [form] = Form.useForm<SLAFormValues>();

  const { message } = App.useApp();
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchSLAs = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await clientSlaService.getClientSLAs({
        page,
        page_size: pageSize,
        ...filters,
      });
      if (isMountedRef.current) {
        setSlas(response.items);
        setPagination({ current: response.page, pageSize: response.page_size, total: response.total });
        errorShownRef.current = false;
      }
    } catch (err) {
      if (!isAbortError(err)) {
        if (isMountedRef.current && !errorShownRef.current) {
          errorShownRef.current = true;
          message.error('获取SLA配置列表失败');
        }
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [filters, message]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [clientsData, labsData, sourceCatsData] = await Promise.all([
        clientService.getAllClients(),
        laboratoryService.getLaboratories({ page_size: 100 }),
        clientSlaService.getAllSourceCategories(),
      ]);
      if (isMountedRef.current) {
        setClients(clientsData);
        setLaboratories(labsData.items);
        setSourceCategories(sourceCatsData);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch reference data');
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchReferenceData();
    return () => { isMountedRef.current = false; };
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchSLAs();
  }, [fetchSLAs]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchSLAs(paginationConfig.current, paginationConfig.pageSize);
  };

  const handleAdd = () => {
    setEditingSLA(null);
    form.resetFields();
    form.setFieldsValue({ priority_weight: 0, is_active: true });
    setModalVisible(true);
  };

  const handleEdit = (record: ClientSLA) => {
    setEditingSLA(record);
    form.setFieldsValue({
      client_id: record.client_id,
      laboratory_id: record.laboratory_id,
      method_type: record.method_type,
      source_category_id: record.source_category_id,
      commitment_hours: record.commitment_hours,
      max_hours: record.max_hours,
      priority_weight: record.priority_weight,
      description: record.description,
      is_active: record.is_active,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await clientSlaService.deleteClientSLA(id);
      message.success('删除成功');
      fetchSLAs(pagination.current, pagination.pageSize);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingSLA) {
        await clientSlaService.updateClientSLA(editingSLA.id, values);
        message.success('更新成功');
      } else {
        await clientSlaService.createClientSLA(values as ClientSLAFormData);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchSLAs(pagination.current, pagination.pageSize);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error(editingSLA ? '更新失败' : '创建失败');
      }
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : '-';
  };

  const getLabName = (labId?: number) => {
    if (!labId) return '所有实验室';
    const lab = laboratories.find(l => l.id === labId);
    return lab ? lab.name : '-';
  };

  const handleClientFilterChange = (value: number | undefined) => {
    setFilters(prev => ({ ...prev, client_id: value }));
  };

  const handleLabFilterChange = (value: number | undefined) => {
    setFilters(prev => ({ ...prev, laboratory_id: value }));
  };

  const handleStatusFilterChange = (value: string | undefined) => {
    if (value === undefined || value === '') {
      setFilters(prev => ({ ...prev, is_active: undefined }));
    } else {
      setFilters(prev => ({ ...prev, is_active: value === 'true' }));
    }
  };

  const columns: ColumnsType<ClientSLA> = [
    {
      title: '客户',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 150,
      render: (_, record) => record.client?.name || getClientName(record.client_id),
    },
    {
      title: '实验室',
      dataIndex: 'laboratory_id',
      key: 'laboratory_id',
      width: 150,
      render: (_, record) => record.laboratory?.name || getLabName(record.laboratory_id),
    },
    {
      title: '分析/测试方法',
      dataIndex: 'method_type',
      key: 'method_type',
      width: 120,
      render: (value: MethodType | undefined) => value ? (
        <Tag color={value === MethodTypeEnum.ANALYSIS ? 'blue' : 'green'}>
          {methodTypeLabels[value]}
        </Tag>
      ) : '-',
    },
    {
      title: '任务种类',
      dataIndex: 'source_category_id',
      key: 'source_category_id',
      width: 120,
      render: (_, record) => record.source_category ? (
        <Tag color={record.source_category.color || 'default'}>
          {record.source_category.name}
        </Tag>
      ) : '-',
    },
    {
      title: '承诺时间(小时)',
      dataIndex: 'commitment_hours',
      key: 'commitment_hours',
      width: 130,
      render: (value) => `${value as number}h`,
    },
    {
      title: '最大时间(小时)',
      dataIndex: 'max_hours',
      key: 'max_hours',
      width: 130,
      render: (value) => value ? `${value as number}h` : '-',
    },
    {
      title: '优先权重',
      dataIndex: 'priority_weight',
      key: 'priority_weight',
      width: 100,
      render: (value) => {
        const weight = value as number;
        return <Tag color={weight > 15 ? 'red' : weight > 5 ? 'orange' : 'default'}>{weight}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value) => <Tag color={(value as boolean) ? 'success' : 'default'}>{(value as boolean) ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除此SLA配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div data-testid="client-slas-page">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Select
            placeholder="客户"
            value={filters.client_id}
            onChange={handleClientFilterChange}
            style={{ width: 180 }}
            allowClear
            options={clients.map(c => ({ label: c.name, value: c.id }))}
            data-testid="slas-client-filter"
          />
          <Select
            placeholder="实验室"
            value={filters.laboratory_id}
            onChange={handleLabFilterChange}
            style={{ width: 180 }}
            allowClear
            options={laboratories.map(l => ({ label: l.name, value: l.id }))}
            data-testid="slas-lab-filter"
          />
          <Select
            placeholder="状态"
            value={filters.is_active === undefined ? undefined : (filters.is_active ? 'true' : 'false')}
            onChange={handleStatusFilterChange}
            style={{ width: 100 }}
            allowClear
            options={[
              { label: '启用', value: 'true' },
              { label: '停用', value: 'false' },
            ]}
            data-testid="slas-status-filter"
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} data-testid="slas-add-button">新增SLA配置</Button>
      </div>

      <Table
        columns={columns}
        dataSource={slas}
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
        data-testid="slas-table"
      />

      <Modal
        title={editingSLA ? '编辑SLA配置' : '新增SLA配置'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="client_id" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
            <Select
              placeholder="选择客户"
              options={clients.map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))}
              disabled={!!editingSLA}
            />
          </Form.Item>
          <Form.Item name="laboratory_id" label="实验室" extra="留空则适用于所有实验室">
            <Select
              placeholder="选择实验室（可选）"
              allowClear
              options={laboratories.map(l => ({ label: l.name, value: l.id }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method_type" label="分析/测试方法">
                <Select
                  placeholder="选择方法类型"
                  allowClear
                  options={[
                    { label: '分析', value: MethodTypeEnum.ANALYSIS },
                    { label: '可靠性', value: MethodTypeEnum.RELIABILITY },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source_category_id" label="任务种类">
                <Select
                  placeholder="选择来源类别"
                  allowClear
                  options={sourceCategories.map(sc => ({ label: sc.name, value: sc.id }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="commitment_hours" label="承诺时间(小时)" rules={[{ required: true, message: '请输入承诺时间' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="目标完成时间" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="max_hours" label="最大时间(小时)">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="最长允许时间" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="priority_weight" label="优先权重" extra="0-30，数值越高优先级越高">
            <InputNumber min={0} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="SLA配置说明" />
          </Form.Item>
          {editingSLA && (
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
