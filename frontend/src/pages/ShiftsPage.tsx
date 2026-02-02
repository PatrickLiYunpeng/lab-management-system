import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Table, Button, Input, Select, Popconfirm, Tag, useToast, Spin, type TableColumn } from '../components/ui';
import { shiftService } from '../services/shiftService';
import { personnelService } from '../services/personnelService';
import { laboratoryService } from '../services/laboratoryService';
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
  
  const toast = useToast();

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
    } catch {
      if (isMountedRef.current && !shiftsErrorShownRef.current) {
        shiftsErrorShownRef.current = true;
        toast.error('获取班次列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setShiftsLoading(false);
      }
    }
  }, [toast]);

  const fetchPersonnelShifts = useCallback(async (shiftId: number) => {
    setPersonnelShiftsLoading(true);
    try {
      const response = await shiftService.getPersonnelByShift(shiftId);
      if (isMountedRef.current) {
        setPersonnelShifts(response);
        personnelShiftsErrorShownRef.current = false;
      }
    } catch {
      if (isMountedRef.current && !personnelShiftsErrorShownRef.current) {
        personnelShiftsErrorShownRef.current = true;
        toast.error('获取人员班次失败');
      }
    } finally {
      if (isMountedRef.current) {
        setPersonnelShiftsLoading(false);
      }
    }
  }, [toast]);

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
    } catch {
      // Silent error for reference data
      console.error('Failed to fetch reference data');
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

  const handleLaboratoryChange = (value: string | number | (string | number)[]) => {
    const labId = Array.isArray(value) ? value[0] as number : value as number;
    setLaboratoryFilter(labId);
    fetchShifts(searchText, labId);
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
      toast.success('删除成功');
      fetchShifts(searchText, laboratoryFilter);
      if (selectedShift?.id === id) {
        setSelectedShift(null);
      }
    } catch {
      toast.error('删除失败');
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
      toast.success('移除成功');
      if (selectedShift) {
        fetchPersonnelShifts(selectedShift.id);
      }
    } catch {
      toast.error('移除失败');
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

  const personnelColumns: TableColumn<PersonnelShift>[] = [
    {
      title: '人员姓名',
      key: 'name',
      render: (_: unknown, record: PersonnelShift) => record.personnel?.user?.full_name || '-',
    },
    {
      title: '工号',
      key: 'employee_id',
      render: (_: unknown, record: PersonnelShift) => record.personnel?.employee_id || '-',
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
      render: (text: unknown) => (text as string) || '持续有效',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: PersonnelShift) => (
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="small"
            onClick={() => handleEditPersonnelShift(record)}
          >
            <PencilIcon className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Popconfirm
            title="确认移除"
            description="确定要移除该人员的班次分配吗？"
            onConfirm={() => handleRemovePersonnelShift(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button variant="link" size="small" danger>
              <TrashIcon className="w-4 h-4 mr-1" />
              移除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex gap-4">
      {/* Left Panel - Shifts List */}
      <div className="w-1/3">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="text-base font-medium text-neutral-800">班次列表</h3>
            <Button
              variant="primary"
              size="small"
              onClick={handleAddShift}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              新增
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <Input
              placeholder="搜索班次名称或代码"
              prefix={<MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
            <Select
              placeholder="全部实验室"
              allowClear
              className="w-full"
              value={laboratoryFilter}
              onChange={handleLaboratoryChange}
              options={laboratories.map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />

            {shiftsLoading ? (
              <div className="flex justify-center py-8">
                <Spin />
              </div>
            ) : (
              <div className="max-h-[500px] overflow-auto space-y-2">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedShift?.id === shift.id
                        ? 'bg-primary-50 border-primary-300'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-800 truncate">
                            {shift.name}
                          </span>
                          {!shift.is_active && (
                            <Tag color="default">已停用</Tag>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 space-y-0.5">
                          <div>代码: {shift.code}</div>
                          <div>时间: {formatTimeRange(shift)}</div>
                          {shift.laboratory && (
                            <div>实验室: {shift.laboratory.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="text"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditShift(shift);
                          }}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Popconfirm
                          title="确认删除"
                          description={`确定要删除班次 "${shift.name}" 吗？`}
                          onConfirm={() => handleDeleteShift(shift.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            variant="text"
                            size="small"
                            danger
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
                {shifts.length === 0 && (
                  <div className="py-8 text-center text-neutral-400">
                    暂无班次数据
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Assigned Personnel */}
      <div className="flex-1">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="text-base font-medium text-neutral-800">
              {selectedShift
                ? `已分配人员 - ${selectedShift.name}`
                : '已分配人员'}
            </h3>
            {selectedShift && (
              <Button
                variant="primary"
                size="small"
                onClick={handleAddPersonnel}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                分配人员
              </Button>
            )}
          </div>
          <div className="p-4">
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
              <div className="py-12 text-center text-neutral-400">
                请从左侧选择一个班次
              </div>
            )}
          </div>
        </div>
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
