import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Table, Button, Input, Popconfirm, Tag, Spin, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { personnelService } from '../services/personnelService';
import { skillService } from '../services/skillService';
import { isAbortError } from '../services/api';
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
  const { message } = App.useApp();

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
    } catch (err) {
      if (!isAbortError(err)) {
        if (isMountedRef.current && !personnelErrorShownRef.current) {
          personnelErrorShownRef.current = true;
          message.error('获取人员列表失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setPersonnelLoading(false);
      }
    }
  }, [message]);

  // Fetch skills for selected personnel
  const fetchPersonnelSkills = useCallback(async (personnelId: number) => {
    setSkillsLoading(true);
    try {
      const skills = await skillService.getPersonnelSkills(personnelId);
      if (isMountedRef.current) {
        setPersonnelSkills(skills);
        skillsErrorShownRef.current = false;
      }
    } catch (err) {
      if (!isAbortError(err)) {
        if (isMountedRef.current && !skillsErrorShownRef.current) {
          skillsErrorShownRef.current = true;
          message.error('获取技能列表失败');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setSkillsLoading(false);
      }
    }
  }, [message]);

  // Fetch all available skills
  const fetchAvailableSkills = useCallback(async () => {
    try {
      const response = await skillService.getSkills({ page_size: 100, is_active: true });
      if (isMountedRef.current) {
        setAvailableSkills(response.items);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        // Silent error for secondary data
        console.error('Failed to fetch available skills');
      }
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
      message.success('技能已移除');
      fetchPersonnelSkills(selectedPersonnel.id);
    } catch (err) {
      if (!isAbortError(err)) {
        message.error('移除技能失败');
      }
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

  const skillColumns: ColumnsType<PersonnelSkill> = [
    {
      title: '技能',
      key: 'skill',
      render: (_, record) => <SkillBadge personnelSkill={record} />,
    },
    {
      title: '熟练度',
      dataIndex: 'proficiency_level',
      key: 'proficiency_level',
      width: 100,
      render: (level: string) => (
        <Tag color={proficiencyColors[level]}>{proficiencyLabels[level]}</Tag>
      ),
    },
    {
      title: '认证状态',
      key: 'certification',
      width: 120,
      render: (_, record) => {
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
      render: (date: string) => date || '-',
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
            onClick={() => handleEditSkill(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认移除"
            description={`确定要移除技能 "${record.skill?.name}" 吗？`}
            onConfirm={() => handleDeleteSkill(record.skill_id)}
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
      {/* Left Panel - Personnel List */}
      <div style={{ width: '33%' }}>
        <Card
          title="人员列表"
          extra={
            <Input
              placeholder="搜索人员"
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ width: 144 }}
              allowClear
            />
          }
          styles={{ body: { padding: 8 } }}
        >
          {personnelLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spin />
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
              {personnelList.map((personnel) => (
                <div
                  key={personnel.id}
                  onClick={() => handleSelectPersonnel(personnel)}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    cursor: 'pointer',
                    marginBottom: 4,
                    transition: 'all 0.2s',
                    backgroundColor: selectedPersonnel?.id === personnel.id ? '#e6f7ff' : undefined,
                    border: selectedPersonnel?.id === personnel.id ? '1px solid #91d5ff' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPersonnel?.id !== personnel.id) {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPersonnel?.id !== personnel.id) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserOutlined style={{ color: '#999' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {personnel.user?.full_name || personnel.employee_id}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{personnel.employee_id}</span>
                        {personnel.job_title && <span>{personnel.job_title}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {personnelList.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
                  暂无人员数据
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel - Personnel Skills */}
      <div style={{ flex: 1 }}>
        <Card
          title={
            selectedPersonnel
              ? `${selectedPersonnel.user?.full_name || selectedPersonnel.employee_id} 的技能`
              : '人员技能'
          }
          extra={
            selectedPersonnel && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddSkill}
                disabled={unassignedSkills.length === 0}
              >
                添加技能
              </Button>
            )
          }
          styles={{ body: { padding: 16 } }}
        >
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
            <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>
              请从左侧选择一名人员查看其技能
            </div>
          )}
        </Card>
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
