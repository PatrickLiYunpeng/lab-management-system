import { useEffect, useState, useCallback } from 'react';
import {
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Table,
  Tag,
  App,
  Space,
  Divider,
  Empty,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { workOrderService } from '../../services/workOrderService';
import { materialService } from '../../services/materialService';
import type {
  Consumption,
  ConsumptionStatus,
  ConsumptionCreateItem,
  PaginatedResponse,
} from '../../types';

const { TextArea } = Input;

interface ConsumptionEditorProps {
  workOrderId: number;
  taskId: number;
  taskNumber: string;
}

interface MaterialOption {
  id: number;
  material_code: string;
  name: string;
  quantity: number;
  unit: string;
}

interface NewConsumptionRow {
  key: string;
  material_id?: number;
  quantity_consumed?: number;
  unit_price?: number;
  notes?: string;
}

const statusLabels: Record<ConsumptionStatus, { text: string; color: string }> = {
  registered: { text: '已登记', color: 'blue' },
  voided: { text: '已作废', color: 'default' },
};

export function ConsumptionEditor({
  workOrderId,
  taskId,
  taskNumber,
}: ConsumptionEditorProps) {
  const { message, modal } = App.useApp();
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [newRows, setNewRows] = useState<NewConsumptionRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Load existing consumption records
  const loadConsumptions = useCallback(async () => {
    setLoading(true);
    try {
      const res: PaginatedResponse<Consumption> = await workOrderService.getConsumptions(
        workOrderId,
        taskId,
        { page_size: 100 }
      );
      setConsumptions(res.items);
    } catch (error) {
      console.error('Failed to load consumptions:', error);
      message.error('加载消耗记录失败');
    } finally {
      setLoading(false);
    }
  }, [workOrderId, taskId, message]);

  // Load available materials (non-sample only)
  const loadMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const res = await materialService.getMaterials({
        page_size: 100,
      });
      console.log('Materials API response:', res);
      // Filter out sample type materials (only show consumable, reagent, tool, other)
      const filtered = res.items.filter((m) => m.material_type !== 'sample');
      console.log('Filtered materials (non-sample):', filtered.length);
      setMaterials(
        filtered.map((m) => ({
            id: m.id,
            material_code: m.material_code,
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
          }))
      );
    } catch (error) {
      console.error('Failed to load materials:', error);
      message.error('加载材料列表失败');
    } finally {
      setLoadingMaterials(false);
    }
  }, [message]);

  useEffect(() => {
    loadConsumptions();
    loadMaterials();
  }, [loadConsumptions, loadMaterials]);

  // Add a new row for entering consumption
  const handleAddRow = () => {
    setNewRows([
      ...newRows,
      {
        key: `new-${Date.now()}`,
        material_id: undefined,
        quantity_consumed: undefined,
        unit_price: undefined,
        notes: undefined,
      },
    ]);
  };

  // Remove a pending row
  const handleRemoveRow = (key: string) => {
    setNewRows(newRows.filter((r) => r.key !== key));
  };

  // Update a pending row
  const handleRowChange = (key: string, field: keyof NewConsumptionRow, value: unknown) => {
    setNewRows(
      newRows.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  // Save all new consumption records
  const handleSave = async () => {
    // Validate new rows
    const validRows = newRows.filter(
      (r) => r.material_id && r.quantity_consumed && r.quantity_consumed > 0
    );

    if (validRows.length === 0) {
      message.warning('请填写至少一条有效的消耗记录');
      return;
    }

    // Check stock availability
    for (const row of validRows) {
      const material = materials.find((m) => m.id === row.material_id);
      if (material && row.quantity_consumed! > material.quantity) {
        message.error(`材料 "${material.name}" 库存不足 (当前: ${material.quantity})`);
        return;
      }
    }

    setSaving(true);
    try {
      const items: ConsumptionCreateItem[] = validRows.map((r) => ({
        material_id: r.material_id!,
        quantity_consumed: r.quantity_consumed!,
        unit_price: r.unit_price,
        notes: r.notes,
      }));

      await workOrderService.createConsumptions(workOrderId, taskId, { consumptions: items });
      message.success(`成功登记 ${items.length} 条消耗记录`);
      setNewRows([]);
      loadConsumptions();
      loadMaterials(); // Refresh stock
    } catch (error: unknown) {
      const errMsg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : '保存失败';
      message.error(errMsg || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Void a consumption record
  const handleVoid = (record: Consumption) => {
    let voidReason = '';

    modal.confirm({
      title: '作废消耗记录',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            确定要作废消耗记录 <strong>CON-{record.id}</strong> 吗？
          </p>
          <p>
            材料: {record.material?.name} | 数量: {record.quantity_consumed}{' '}
            {record.material?.unit}
          </p>
          <p style={{ color: '#666', fontSize: 12 }}>
            作废后将自动补充库存，此操作不可撤销。
          </p>
          <TextArea
            placeholder="请输入作废原因（必填）"
            rows={2}
            onChange={(e) => {
              voidReason = e.target.value;
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '确认作废',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!voidReason.trim()) {
          message.error('请输入作废原因');
          throw new Error('Void reason required');
        }
        try {
          await workOrderService.voidConsumption(record.id, { void_reason: voidReason.trim() });
          message.success('消耗记录已作废，库存已恢复');
          loadConsumptions();
          loadMaterials();
        } catch (error) {
          message.error('作废失败');
          throw error;
        }
      },
    });
  };

  // Table columns for existing records
  const columns = [
    {
      title: '材料',
      dataIndex: ['material', 'name'],
      key: 'material',
      render: (_: string, record: Consumption) =>
        record.material ? (
          <span>
            {record.material.name}
            <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>
              ({record.material.material_code})
            </span>
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '数量',
      dataIndex: 'quantity_consumed',
      key: 'quantity',
      width: 100,
      render: (val: number, record: Consumption) =>
        `${val} ${record.material?.unit || ''}`,
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      render: (val: number | undefined) => (val !== undefined ? `¥${val}` : '-'),
    },
    {
      title: '总成本',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 100,
      render: (val: number | undefined) => (val !== undefined ? `¥${val}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (val: ConsumptionStatus) => {
        const cfg = statusLabels[val] || { text: val, color: 'default' };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '登记时间',
      dataIndex: 'consumed_at',
      key: 'consumed_at',
      width: 150,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Consumption) =>
        record.status === 'registered' ? (
          <Button type="link" danger size="small" onClick={() => handleVoid(record)}>
            作废
          </Button>
        ) : (
          <span style={{ color: '#999', fontSize: 12 }}>
            {record.void_reason && `原因: ${record.void_reason}`}
          </span>
        ),
    },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <Divider orientation="left">材料消耗 ({taskNumber})</Divider>

      {/* Existing consumption records */}
      <Table
        columns={columns}
        dataSource={consumptions}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无消耗记录" /> }}
        style={{ marginBottom: 16 }}
        rowClassName={(record) => (record.status === 'voided' ? 'consumption-voided' : '')}
      />

      {/* New consumption entry section */}
      <div
        style={{
          background: '#fafafa',
          padding: 16,
          borderRadius: 4,
          border: '1px dashed #d9d9d9',
        }}
      >
        <div style={{ marginBottom: 12, fontWeight: 500 }}>新增消耗</div>

        {newRows.length === 0 ? (
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddRow}>
            添加材料消耗
          </Button>
        ) : (
          <>
            {/* Debug info */}
            <div style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
              材料加载状态: {loadingMaterials ? '加载中...' : `已加载 ${materials.length} 种材料`}
            </div>
            {newRows.map((row) => {
              const selectedMaterial = materials.find((m) => m.id === row.material_id);
              return (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <Form.Item style={{ flex: 3, marginBottom: 0 }}>
                    <Select
                      placeholder="选择材料"
                      value={row.material_id}
                      onChange={(val) => handleRowChange(row.key, 'material_id', val)}
                      loading={loadingMaterials}
                      showSearch
                      optionFilterProp="label"
                      options={materials.map((m) => ({
                        label: `${m.name} (${m.material_code}) - 库存: ${m.quantity} ${m.unit}`,
                        value: m.id,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                    <InputNumber
                      placeholder="数量"
                      min={1}
                      max={selectedMaterial?.quantity}
                      value={row.quantity_consumed}
                      onChange={(val) => handleRowChange(row.key, 'quantity_consumed', val)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                    <InputNumber
                      placeholder="单价(可选)"
                      min={0}
                      precision={2}
                      value={row.unit_price}
                      onChange={(val) => handleRowChange(row.key, 'unit_price', val)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item style={{ flex: 2, marginBottom: 0 }}>
                    <Input
                      placeholder="备注(可选)"
                      value={row.notes}
                      onChange={(e) => handleRowChange(row.key, 'notes', e.target.value)}
                    />
                  </Form.Item>

                  <Button
                    type="text"
                    icon={<MinusCircleOutlined />}
                    danger
                    onClick={() => handleRemoveRow(row.key)}
                  />
                </div>
              );
            })}

            <Space style={{ marginTop: 8 }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddRow}>
                添加更多
              </Button>
              <Button type="primary" onClick={handleSave} loading={saving}>
                保存消耗记录
              </Button>
            </Space>
          </>
        )}
      </div>

      <style>{`
        .consumption-voided {
          background-color: #f5f5f5 !important;
          opacity: 0.6;
        }
        .consumption-voided td {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  );
}
