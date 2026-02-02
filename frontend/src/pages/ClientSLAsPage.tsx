import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  Table, Button, Select, Tag, Popconfirm, useToast, Modal, Input, TextArea, InputNumber, Switch,
  useForm, Form, FormItem, type FormInstance, type TableColumn, type TablePagination,
} from '../components/ui';
import { clientSlaService } from '../services/clientSlaService';
import { clientService } from '../services/clientService';
import { laboratoryService } from '../services/laboratoryService';
import type { ClientSLA, ClientSLAFormData, Client, Laboratory } from '../types';

interface SLAFormValues {
  client_id: number;
  laboratory_id?: number;
  service_type: string;
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
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSLA, setEditingSLA] = useState<ClientSLA | null>(null);
  const [pagination, setPagination] = useState<TablePagination>({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<{ client_id?: number; laboratory_id?: number; is_active?: boolean }>({});

  const [form] = useForm<SLAFormValues>({
    initialValues: {
      client_id: undefined as unknown as number,
      laboratory_id: undefined,
      service_type: '',
      commitment_hours: undefined as unknown as number,
      max_hours: undefined,
      priority_weight: 0,
      description: '',
      is_active: true,
    },
    rules: {
      client_id: [{ required: true, message: '请选择客户' }],
      service_type: [{ required: true, message: '请输入服务类型' }],
      commitment_hours: [{ required: true, message: '请输入承诺时间' }],
    },
  });

  const toast = useToast();
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
    } catch {
      if (isMountedRef.current && !errorShownRef.current) {
        errorShownRef.current = true;
        toast.error('获取SLA配置列表失败');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [filters, toast]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [clientsData, labsData] = await Promise.all([
        clientService.getAllClients(),
        laboratoryService.getLaboratories({ page_size: 100 }),
      ]);
      if (isMountedRef.current) {
        setClients(clientsData);
        setLaboratories(labsData.items);
      }
    } catch {
      console.error('Failed to fetch reference data');
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

  const handlePaginationChange = (page: number, pageSize: number) => {
    fetchSLAs(page, pageSize);
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
      service_type: record.service_type,
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
      toast.success('删除成功');
      fetchSLAs(pagination.current, pagination.pageSize);
    } catch {
      toast.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      const values = form.getFieldsValue();
      if (editingSLA) {
        await clientSlaService.updateClientSLA(editingSLA.id, values);
        toast.success('更新成功');
      } else {
        await clientSlaService.createClientSLA(values as ClientSLAFormData);
        toast.success('创建成功');
      }
      setModalVisible(false);
      fetchSLAs(pagination.current, pagination.pageSize);
    } catch {
      toast.error(editingSLA ? '更新失败' : '创建失败');
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

  const handleClientFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters(prev => ({ ...prev, client_id: v as number | undefined }));
  };

  const handleLabFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setFilters(prev => ({ ...prev, laboratory_id: v as number | undefined }));
  };

  const handleStatusFilterChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (v === undefined || v === '') {
      setFilters(prev => ({ ...prev, is_active: undefined }));
    } else {
      setFilters(prev => ({ ...prev, is_active: v === 'true' }));
    }
  };

  const columns: TableColumn<ClientSLA>[] = [
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
      title: '服务类型',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 120,
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
        <div className="flex items-center gap-2">
          <Button variant="link" size="small" icon={<PencilIcon className="w-4 h-4" />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除此SLA配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okDanger
          >
            <Button variant="link" size="small" danger icon={<TrashIcon className="w-4 h-4" />}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <Select
            placeholder="客户"
            value={filters.client_id}
            onChange={handleClientFilterChange}
            className="w-[180px]"
            allowClear
            options={clients.map(c => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="实验室"
            value={filters.laboratory_id}
            onChange={handleLabFilterChange}
            className="w-[180px]"
            allowClear
            options={laboratories.map(l => ({ label: l.name, value: l.id }))}
          />
          <Select
            placeholder="状态"
            value={filters.is_active === undefined ? undefined : (filters.is_active ? 'true' : 'false')}
            onChange={handleStatusFilterChange}
            className="w-[100px]"
            allowClear
            options={[
              { label: '启用', value: 'true' },
              { label: '停用', value: 'false' },
            ]}
          />
        </div>
        <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleAdd}>新增SLA配置</Button>
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
          onChange: handlePaginationChange,
        }}
        scroll={{ x: 1100 }}
      />

      <Modal
        title={editingSLA ? '编辑SLA配置' : '新增SLA配置'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form as unknown as FormInstance} layout="vertical">
          <FormItem name="client_id" label="客户">
            <Select
              placeholder="选择客户"
              options={clients.map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))}
              disabled={!!editingSLA}
            />
          </FormItem>
          <FormItem name="laboratory_id" label="实验室" extra="留空则适用于所有实验室">
            <Select
              placeholder="选择实验室（可选）"
              allowClear
              options={laboratories.map(l => ({ label: l.name, value: l.id }))}
            />
          </FormItem>
          <FormItem name="service_type" label="服务类型">
            <Input placeholder="如：standard, express, priority" />
          </FormItem>
          <div className="grid grid-cols-2 gap-4">
            <FormItem name="commitment_hours" label="承诺时间(小时)">
              <InputNumber min={1} className="w-full" placeholder="目标完成时间" />
            </FormItem>
            <FormItem name="max_hours" label="最大时间(小时)">
              <InputNumber min={1} className="w-full" placeholder="最长允许时间" />
            </FormItem>
          </div>
          <FormItem name="priority_weight" label="优先权重" extra="0-30，数值越高优先级越高">
            <InputNumber min={0} max={30} className="w-full" />
          </FormItem>
          <FormItem name="description" label="描述">
            <TextArea rows={2} placeholder="SLA配置说明" />
          </FormItem>
          {editingSLA && (
            <FormItem name="is_active" label="状态">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </FormItem>
          )}
        </Form>
      </Modal>
    </div>
  );
}
