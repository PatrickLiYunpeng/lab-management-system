import { useEffect, useState, useCallback, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Table, Button, Select, Tag, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { transferService } from '../services/transferService';
import { personnelService } from '../services/personnelService';
import { laboratoryService } from '../services/laboratoryService';
import { TransferModal } from '../components/transfers/TransferModal';
import { ApprovalModal } from '../components/transfers/ApprovalModal';
import type { BorrowRequest, Personnel, Laboratory, BorrowRequestStatus } from '../types';

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'completed' },
];

const statusColors: Record<BorrowRequestStatus, 'processing' | 'success' | 'error' | 'default'> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
  completed: 'default',
};

const statusLabels: Record<BorrowRequestStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  completed: '已完成',
};

export default function Transfers() {
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);

  // Reference data
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  
  // Refs to prevent duplicate error messages and track mount state
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const { message } = App.useApp();

  const fetchBorrowRequests = useCallback(
    async (page = 1, pageSize = 10, status = '') => {
      setLoading(true);
      try {
        const response = await transferService.getBorrowRequests({
          page,
          page_size: pageSize,
          status: (status || undefined) as BorrowRequestStatus | undefined,
        });
        if (isMountedRef.current) {
          setBorrowRequests(response.items);
          setPagination({
            current: response.page,
            pageSize: response.page_size,
            total: response.total,
          });
          errorShownRef.current = false;
        }
      } catch {
        if (isMountedRef.current && !errorShownRef.current) {
          errorShownRef.current = true;
          message.error('获取借调申请列表失败');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [message]
  );

  const fetchReferenceData = useCallback(async () => {
    try {
      const [personnelRes, labRes] = await Promise.all([
        personnelService.getPersonnel({ page_size: 100 }),
        laboratoryService.getLaboratories({ page_size: 100 }),
      ]);
      if (isMountedRef.current) {
        setPersonnelList(personnelRes.items);
        setLaboratories(labRes.items);
      }
    } catch {
      // Silent error for reference data
      console.error('Failed to fetch reference data');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBorrowRequests();
    fetchReferenceData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchBorrowRequests, fetchReferenceData]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchBorrowRequests(paginationConfig.current || 1, paginationConfig.pageSize || 10, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    fetchBorrowRequests(1, pagination.pageSize, value);
  };

  const handleAdd = () => {
    setTransferModalVisible(true);
  };

  const handleApprove = (record: BorrowRequest) => {
    setSelectedRequest(record);
    setApprovalModalVisible(true);
  };

  const handleTransferModalSuccess = () => {
    setTransferModalVisible(false);
    fetchBorrowRequests(pagination.current, pagination.pageSize, statusFilter);
  };

  const handleApprovalModalSuccess = () => {
    setApprovalModalVisible(false);
    setSelectedRequest(null);
    fetchBorrowRequests(pagination.current, pagination.pageSize, statusFilter);
  };

  const columns: ColumnsType<BorrowRequest> = [
    {
      title: '人员',
      key: 'personnel',
      width: 150,
      render: (_, record) =>
        record.personnel?.user?.full_name || record.personnel?.employee_id || '-',
    },
    {
      title: '工号',
      key: 'employee_id',
      width: 100,
      render: (_, record) => record.personnel?.employee_id || '-',
    },
    {
      title: '调出实验室',
      key: 'from_laboratory',
      width: 150,
      render: (_, record) => record.from_laboratory?.name || '-',
    },
    {
      title: '调入实验室',
      key: 'to_laboratory',
      width: 150,
      render: (_, record) => record.to_laboratory?.name || '-',
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: BorrowRequestStatus) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '借调原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Button type="link" size="small" onClick={() => handleApprove(record)}>
              审批
            </Button>
          );
        }
        if (record.status === 'rejected' && record.rejection_reason) {
          return (
            <Tooltip title={record.rejection_reason}>
              <span style={{ color: '#ff4d4f', fontSize: 12, cursor: 'help' }}>
                查看原因
              </span>
            </Tooltip>
          );
        }
        return '-';
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          options={statusOptions}
          style={{ width: 160 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建借调申请
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={borrowRequests}
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
        scroll={{ x: 1300 }}
      />

      <TransferModal
        visible={transferModalVisible}
        personnelList={personnelList}
        laboratories={laboratories}
        onSuccess={handleTransferModalSuccess}
        onCancel={() => setTransferModalVisible(false)}
      />

      <ApprovalModal
        visible={approvalModalVisible}
        borrowRequest={selectedRequest}
        onSuccess={handleApprovalModalSuccess}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
