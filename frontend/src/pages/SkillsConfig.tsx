import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Table, Button, Input, Popconfirm, Tag, Spin, useToast, type TableColumn } from '../components/ui';
import { personnelService } from '../services/personnelService';
import { skillService } from '../services/skillService';
import { PersonnelSkillModal } from '../components/skills/PersonnelSkillModal';
import { SkillBadge } from '../components/common/SkillBadge';
import type { Personnel, PersonnelSkill, Skill } from '../types';

const proficiencyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家',
};

const proficiencyColors: Record<string, 'default' | 'processing' | 'success' | 'warning'> = {
  beginner: 'default',
  intermediate: 'processing',
  advanced: 'success',
  expert: 'warning',
};

export default function SkillsConfig() {
  // Personnel list state
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchText, setSearchText] = useState('');

  // Selected personnel state
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [personnelSkills, setPersonnelSkills] = useState<PersonnelSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<PersonnelSkill | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  
  // Refs to prevent duplicate error messages and track mount state
  const personnelErrorShownRef = useRef(false);
  const skillsErrorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const toast = useToast();

  // Fetch personnel list
  const fetchPersonnel = useCallback(async (search = '') => {
    setPersonnelLoading(true);
    try {
      const response = await personnelService.getPersonnel({
        search: search || undefined,
        page_size: 100, // Load more for side panel
      });
      if (isMountedRef.current) {
        setPersonnelList(response.items);
        personnelErrorShownRef.current = false;
      }
    } catch {
      if (isMountedRef.current && !personnelErrorShownRef.current) {
        personnelErrorShownRef.current = true;
        toast.error('获取人员列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setPersonnelLoading(false);
      }
    }
  }, [toast]);

  // Fetch skills for selected personnel
  const fetchPersonnelSkills = useCallback(async (personnelId: number) => {
    setSkillsLoading(true);
    try {
      const skills = await skillService.getPersonnelSkills(personnelId);
      if (isMountedRef.current) {
        setPersonnelSkills(skills);
        skillsErrorShownRef.current = false;
      }
    } catch {
      if (isMountedRef.current && !skillsErrorShownRef.current) {
        skillsErrorShownRef.current = true;
        toast.error('获取技能列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setSkillsLoading(false);
      }
    }
  }, [toast]);

  // Fetch all available skills
  const fetchAvailableSkills = useCallback(async () => {
    try {
      const response = await skillService.getSkills({ page_size: 100, is_active: true });
      if (isMountedRef.current) {
        setAvailableSkills(response.items);
      }
    } catch {
      // Silent error for secondary data
      console.error('Failed to fetch available skills');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPersonnel();
    fetchAvailableSkills();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPersonnel, fetchAvailableSkills]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchText) {
        setSearchText(searchValue);
        fetchPersonnel(searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchText, fetchPersonnel]);

  // Fetch skills when personnel is selected
  useEffect(() => {
    if (selectedPersonnel) {
      fetchPersonnelSkills(selectedPersonnel.id);
    } else {
      setPersonnelSkills([]);
    }
  }, [selectedPersonnel, fetchPersonnelSkills]);

  const handleSelectPersonnel = (personnel: Personnel) => {
    setSelectedPersonnel(personnel);
  };

  const handleAddSkill = () => {
    setEditingSkill(null);
    setModalVisible(true);
  };

  const handleEditSkill = (personnelSkill: PersonnelSkill) => {
    setEditingSkill(personnelSkill);
    setModalVisible(true);
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!selectedPersonnel) return;
    try {
      await skillService.removePersonnelSkill(selectedPersonnel.id, skillId);
      toast.success('技能已移除');
      fetchPersonnelSkills(selectedPersonnel.id);
    } catch {
      toast.error('移除技能失败');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingSkill(null);
    if (selectedPersonnel) {
      fetchPersonnelSkills(selectedPersonnel.id);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingSkill(null);
  };

  // Filter out already assigned skills for the add modal
  const unassignedSkills = availableSkills.filter(
    (skill) => !personnelSkills.some((ps) => ps.skill_id === skill.id)
  );

  const skillColumns: TableColumn<PersonnelSkill>[] = [
    {
      title: '技能',
      key: 'skill',
      render: (_: unknown, record: PersonnelSkill) => <SkillBadge personnelSkill={record} />,
    },
    {
      title: '熟练度',
      dataIndex: 'proficiency_level',
      key: 'proficiency_level',
      width: 100,
      render: (level: unknown) => (
        <Tag color={proficiencyColors[level as string]}>{proficiencyLabels[level as string]}</Tag>
      ),
    },
    {
      title: '认证状态',
      key: 'certification',
      width: 120,
      render: (_: unknown, record: PersonnelSkill) => {
        if (!record.is_certified) return <Tag>未认证</Tag>;
        if (record.certification_expiry) {
          const isExpired = new Date(record.certification_expiry) < new Date();
          return isExpired ? (
            <Tag color="error">已过期</Tag>
          ) : (
            <Tag color="success">已认证</Tag>
          );
        }
        return <Tag color="success">已认证</Tag>;
      },
    },
    {
      title: '到期日',
      dataIndex: 'certification_expiry',
      key: 'certification_expiry',
      width: 120,
      render: (date: unknown) => (date as string) || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: PersonnelSkill) => (
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="small"
            onClick={() => handleEditSkill(record)}
          >
            <PencilIcon className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Popconfirm
            title="确认移除"
            description={`确定要移除技能 "${record.skill?.name}" 吗？`}
            onConfirm={() => handleDeleteSkill(record.skill_id)}
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
      {/* Left Panel - Personnel List */}
      <div className="w-1/3">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="text-base font-medium text-neutral-800">人员列表</h3>
            <Input
              placeholder="搜索人员"
              prefix={<MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-36"
              allowClear
            />
          </div>
          <div className="p-2">
            {personnelLoading ? (
              <div className="flex justify-center py-8">
                <Spin />
              </div>
            ) : (
              <div className="max-h-[calc(100vh-280px)] overflow-auto space-y-1">
                {personnelList.map((personnel) => (
                  <div
                    key={personnel.id}
                    onClick={() => handleSelectPersonnel(personnel)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedPersonnel?.id === personnel.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-5 h-5 text-neutral-400" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-800 truncate">
                          {personnel.user?.full_name || personnel.employee_id}
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span>{personnel.employee_id}</span>
                          {personnel.job_title && <span>{personnel.job_title}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {personnelList.length === 0 && (
                  <div className="py-8 text-center text-neutral-400">
                    暂无人员数据
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Personnel Skills */}
      <div className="flex-1">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="text-base font-medium text-neutral-800">
              {selectedPersonnel
                ? `${selectedPersonnel.user?.full_name || selectedPersonnel.employee_id} 的技能`
                : '人员技能'}
            </h3>
            {selectedPersonnel && (
              <Button
                variant="primary"
                size="small"
                onClick={handleAddSkill}
                disabled={unassignedSkills.length === 0}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                添加技能
              </Button>
            )}
          </div>
          <div className="p-4">
            {selectedPersonnel ? (
              <Table
                columns={skillColumns}
                dataSource={personnelSkills}
                rowKey="id"
                loading={skillsLoading}
                pagination={false}
                size="small"
              />
            ) : (
              <div className="py-12 text-center text-neutral-400">
                请从左侧选择一名人员查看其技能
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for adding/editing skills */}
      {selectedPersonnel && (
        <PersonnelSkillModal
          visible={modalVisible}
          personnelId={selectedPersonnel.id}
          personnelSkill={editingSkill}
          availableSkills={editingSkill ? availableSkills : unassignedSkills}
          onSuccess={handleModalSuccess}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}
