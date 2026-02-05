import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Table, Tag, Tooltip, App, Empty } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { materialService } from '../../services/materialService';
import { isAbortError } from '../../services/api';
import type { Material, Replenishment, NonSapSource } from '../../types';

interface ReplenishmentHistoryModalProps {
  visible: boolean;
  material: Material | null;
  onClose: () => void;
}

const nonSapSourceLabels: Record<NonSapSource, { text: string; color: string }> = {
  internal_transfer: { text: '内部转移', color: 'blue' },
  emergency_purchase: { text: '紧急采购', color: 'orange' },
  gift_sample: { text: '赠品/样品', color: 'green' },
  inventory_adjustment: { text: '库存盘点调整', color: 'purple' },
  other: { text: '其他', color: 'default' },
};

export function ReplenishmentHistoryModal({
  visible,
  material,
  onClose,
}: ReplenishmentHistoryModalProps) {
  const [replenishments, setReplenishments] = useState<Replenishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const { message } = App.useApp();

  useEffect(() => {
    if (visible && material) {
      fetchReplenishments(1, 10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, material]);

  const fetchReplenishments = async (page: number, pageSize: number) => {
    if (!material) return;
    
    setLoading(true);
    try {
      const response = await materialService.getReplenishments(material.id, {
        page,
        page_size: pageSize,
      });
      setReplenishments(response.items);
      setPagination({
        current: response.page,
        pageSize: response.page_size,
        total: response.total,
      });
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('获取补充履历失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchReplenishments(paginationConfig.current || 1, paginationConfig.pageSize || 10);
  };

  const columns: ColumnsType<Replenishment> = [
    {
      title: '收货日期',
      dataIndex: 'received_date',
      key: 'received_date',
      width: 120,
      render: (value) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '增加数量',
      dataIndex: 'quantity_added',
      key: 'quantity_added',
      width: 100,
      render: (value) => (
        <span style={{ fontWeight: 600, color: '#52c41a' }}>
          +{value} {material?.unit}
        </span>
      ),
    },
    {
      title: 'SAP订单号',
      dataIndex: 'sap_order_no',
      key: 'sap_order_no',
      width: 130,
      render: (value) => value || '-',
    },
    {
      title: '非SAP来源',
      dataIndex: 'non_sap_source',
      key: 'non_sap_source',
      width: 120,
      render: (value: NonSapSource | undefined) => {
        if (!value) return '-';
        const config = nonSapSourceLabels[value];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作人',
      key: 'created_by',
      width: 100,
      render: (_, record) => record.created_by?.full_name || record.created_by?.username || '-',
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      ellipsis: true,
      render: (value) => 
        value ? (
          <Tooltip title={value}>
            <span>{value}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <Modal
      title={`补充履历 - ${material?.name || ''}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
    >
      {material && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
          <span style={{ marginRight: 24 }}>
            <strong>物料编码:</strong> {material.material_code}
          </span>
          <span style={{ marginRight: 24 }}>
            <strong>当前库存:</strong>{' '}
            <span style={{ color: '#1677ff', fontWeight: 600 }}>
              {material.quantity} {material.unit}
            </span>
          </span>
        </div>
      )}

      {replenishments.length === 0 && !loading ? (
        <Empty description="暂无补充记录" />
      ) : (
        <Table
          columns={columns}
          dataSource={replenishments}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
          size="small"
        />
      )}
    </Modal>
  );
}
