import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Table, Button, Input, Select, Popconfirm, Tag, App, Spin, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { shiftService } from '../services/shiftService';
import { personnelService } from '../services/personnelService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import { ShiftModal } from '../components/shifts/ShiftModal';
import { PersonnelShiftModal } from '../components/shifts/PersonnelShiftModal';
import type { Shift, PersonnelShift, Personnel, Laboratory } from '../types';

export default function ShiftsPage() {
  // Shift list state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [laboratoryFilter, setLaboratoryFilter] = useState<number | undefined>();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);

  // Selected shift state
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [personnelShifts, setPersonnelShifts] = useState<PersonnelShift[]>([]);
  const [personnelShiftsLoading, setPersonnelShiftsLoading] = useState(false);

  // Modal state
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [personnelModalVisible, setPersonnelModalVisible] = useState(false);
  const [editingPersonnelShift, setEditingPersonnelShift] = useState<PersonnelShift | null>(null);

  // Reference data
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  
  // Refs to prevent duplicate error messages and track mount state
  const shiftsErrorShownRef = useRef(false);
  const personnelShiftsErrorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const { message } = App.useApp();

  const fetchShifts = useCallback(async (search = '', labId?: number) => {
    setShiftsLoading(true);
    try {
      const response = await shiftService.getShifts({
        page_size: 100,
        search: search || undefined,
        laboratory_id: labId,
      });
      if (isMountedRef.current) {
        setShifts(response.items);
        shiftsErrorShownRef.current = false;
      }
    } catch (err) {
      if (!isAbortError(err)) {
        if (isMountedRef.current && !shiftsErrorShownRef.current) {
          shiftsErrorShownRef.current = true;
          message.error('获取班次列表失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setShiftsLoading(false);
      }
    }
  }, [message]);

  const fetchPersonnelShifts = useCallback(async (shiftId: number) => {
    setPersonnelShiftsLoading(true);
    try {
      const response = await shiftService.getPersonnelByShift(shiftId);
      if (isMountedRef.current) {
        setPersonnelShifts(response);
        personnelShiftsErrorShownRef.current = false;
      }
    } catch (err) {
      if (!isAbortError(err)) {
        if (isMountedRef.current && !personnelShiftsErrorShownRef.current) {
          personnelShiftsErrorShownRef.current = true;
          message.error('获取人员班次失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setPersonnelShiftsLoading(false);
      }
    }
  }, [message]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [personnelRes, labRes] = await Promise.all([
        personnelService.getPersonnel({ page_size: 100 }),
        laboratoryService.getLaboratories({ page_size: 100 }),
      ]);
      if (isMountedRef.current) {
        setAllPersonnel(personnelRes.items);
        setLaboratories(labRes.items.filter((lab) => lab.is_active));
      }
    } catch (err) {
      if (!isAbortError(err)) {
        // Silent error for reference data
        console.error('Failed to fetch reference data');
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchShifts();
    fetchReferenceData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchShifts, fetchReferenceData]);

  // Load personnel shifts when a shift is selected
  useEffect(() => {
    if (selectedShift) {
      fetchPersonnelShifts(selectedShift.id);
    } else {
      setPersonnelShifts([]);
    }
  }, [selectedShift, fetchPersonnelShifts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
        fetchShifts(searchValue, laboratoryFilter);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText, laboratoryFilter, fetchShifts]);

  const handleLaboratoryChange = (value: number | undefined) => {
    setLaboratoryFilter(value);
    fetchShifts(searchText, value);
  };

  const handleAddShift = () => {
    setEditingShift(null);
    setShiftModalVisible(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftModalVisible(true);
  };

  const handleDeleteShift = async (id: number) => {
    try {
      await shiftService.deleteShift(id);
      message.success('删除成功');
      fetchShifts(searchText, laboratoryFilter);
      if (selectedShift?.id === id) {
        setSelectedShift(null);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('删除失败');
      }
    }
  };

  const handleShiftModalSuccess = () => {
    setShiftModalVisible(false);
    setEditingShift(null);
    fetchShifts(searchText, laboratoryFilter);
  };

  const handleAddPersonnel = () => {
    setEditingPersonnelShift(null);
    setPersonnelModalVisible(true);
  };

  const handleEditPersonnelShift = (ps: PersonnelShift) => {
    setEditingPersonnelShift(ps);
    setPersonnelModalVisible(true);
  };

  const handleRemovePersonnelShift = async (ps: PersonnelShift) => {
    try {
      await shiftService.removePersonnelShift(ps.personnel_id, ps.shift_id);
      message.success('移除成功');
      if (selectedShift) {
        fetchPersonnelShifts(selectedShift.id);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('移除失败');
      }
    }
  };

  const handlePersonnelModalSuccess = () => {
    setPersonnelModalVisible(false);
    setEditingPersonnelShift(null);
    if (selectedShift) {
      fetchPersonnelShifts(selectedShift.id);
    }
  };

  const formatTimeRange = (shift: Shift) => {
    const start = shift.start_time?.substring(0, 5) || '';
    const end = shift.end_time?.substring(0, 5) || '';
    return `${start} - ${end}`;
  };

  // Filter out personnel already assigned to this shift
  const availablePersonnel = allPersonnel.filter(
    (p) => !personnelShifts.some((ps) => ps.personnel_id === p.id)
  );

  const personnelColumns: ColumnsType<PersonnelShift> = [
    {
      title: '人员姓名',
      key: 'name',
      render: (_, record) => record.personnel?.user?.full_name || '-',
    },
    {
      title: '工号',
      key: 'employee_id',
      render: (_, record) => record.personnel?.employee_id || '-',
    },
    {
      title: '生效日期',
      dataIndex: 'effective_date',
      key: 'effective_date',
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (text) => (text as string) || '持续有效',
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
            onClick={() => handleEditPersonnelShift(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认移除"
            description="确定要移除该人员的班次分配吗？"
            onConfirm={() => handleRemovePersonnelShift(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left Panel - Shifts List */}
      <div style={{ width: '33%' }}>
        <Card
          title="班次列表"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddShift}
            >
              新增
            </Button>
          }
          styles={{ body: { padding: 16 } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              placeholder="搜索班次名称或代码"
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
            <Select
              placeholder="全部实验室"
              allowClear
              style={{ width: '100%' }}
              value={laboratoryFilter}
              onChange={handleLaboratoryChange}
              options={laboratories.map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />

            {shiftsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spin />
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      border: `1px solid ${selectedShift?.id === shift.id ? '#1677ff' : '#d9d9d9'}`,
                      backgroundColor: selectedShift?.id === shift.id ? '#e6f4ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, color: '#333' }}>
                            {shift.name}
                          </span>
                          {!shift.is_active && (
                            <Tag color="default">已停用</Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          <div>代码: {shift.code}</div>
                          <div>时间: {formatTimeRange(shift)}</div>
                          {shift.laboratory && (
                            <div>实验室: {shift.laboratory.name}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditShift(shift);
                          }}
                        />
                        <Popconfirm
                          title="确认删除"
                          description={`确定要删除班次 "${shift.name}" 吗？`}
                          onConfirm={() => handleDeleteShift(shift.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
                {shifts.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
                    暂无班次数据
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Panel - Assigned Personnel */}
      <div style={{ flex: 1 }}>
        <Card
          title={selectedShift ? `已分配人员 - ${selectedShift.name}` : '已分配人员'}
          extra={
            selectedShift && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddPersonnel}
              >
                分配人员
              </Button>
            )
          }
          styles={{ body: { padding: 16 } }}
        >
          {selectedShift ? (
            <Table
              columns={personnelColumns}
              dataSource={personnelShifts}
              rowKey="id"
              loading={personnelShiftsLoading}
              pagination={false}
              size="small"
            />
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>
              请从左侧选择一个班次
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <ShiftModal
        visible={shiftModalVisible}
        shift={editingShift}
        onSuccess={handleShiftModalSuccess}
        onCancel={() => {
          setShiftModalVisible(false);
          setEditingShift(null);
        }}
      />

      {selectedShift && (
        <PersonnelShiftModal
          visible={personnelModalVisible}
          shiftId={selectedShift.id}
          personnelShift={editingPersonnelShift}
          availablePersonnel={editingPersonnelShift ? allPersonnel : availablePersonnel}
          onSuccess={handlePersonnelModalSuccess}
          onCancel={() => {
            setPersonnelModalVisible(false);
            setEditingPersonnelShift(null);
          }}
        />
      )}
    </div>
  );
}
