import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { workOrderService } from '../../services/workOrderService';
import type { WorkOrderTask, EligibleTechnician, EligibleTechniciansResponse, RequiredSkillInfo } from '../../types';
import {
  Button,
  Table,
  Tag,
  Progress,
  Tooltip,
  Modal,
  Spin,
  useToast,
  type TableColumn,
} from '../ui';

interface TechnicianMatcherProps {
  visible: boolean;
  workOrderId: number;
  task: WorkOrderTask | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const proficiencyColors: Record<string, 'default' | 'blue' | 'success' | 'warning'> = {
  beginner: 'default',
  intermediate: 'blue',
  advanced: 'success',
  expert: 'warning',
};

const proficiencyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家',
};

export function TechnicianMatcher({
  visible,
  workOrderId,
  task,
  onSuccess,
  onCancel,
}: TechnicianMatcherProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [data, setData] = useState<EligibleTechniciansResponse | null>(null);

  const fetchEligibleTechnicians = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const response = await workOrderService.getEligibleTechnicians(workOrderId, task.id);
      setData(response);
    } catch {
      toast.error('获取合格技术员列表失败');
    } finally {
      setLoading(false);
    }
  }, [workOrderId, task, toast]);

  useEffect(() => {
    if (visible && task) {
      fetchEligibleTechnicians();
    }
  }, [visible, task, fetchEligibleTechnicians]);

  const handleAssign = async (technicianId: number) => {
    if (!task) return;
    setAssigning(true);
    try {
      await workOrderService.assignTask(workOrderId, task.id, {
        technician_id: technicianId,
        equipment_id: task.required_equipment_id,
      });
      toast.success('任务分配成功');
      onSuccess();
    } catch {
      toast.error('任务分配失败');
    } finally {
      setAssigning(false);
    }
  };

  const columns: TableColumn<EligibleTechnician>[] = [
    {
      title: '技术员',
      dataIndex: 'name',
      key: 'name',
      render: (name: unknown, record) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-neutral-400" />
          <span>
            {String(name)}
            <span className="text-neutral-400 ml-2">({record.employee_id})</span>
          </span>
        </div>
      ),
    },
    {
      title: '职位',
      dataIndex: 'job_title',
      key: 'job_title',
      render: (title: unknown) => title ? String(title) : '-',
    },
    {
      title: '匹配度',
      dataIndex: 'match_score',
      key: 'match_score',
      sorter: (a, b) => a.match_score - b.match_score,
      render: (score: unknown) => {
        const scoreNum = Number(score);
        return (
          <Progress
            percent={Math.round(scoreNum)}
            size="small"
            status={scoreNum >= 80 ? 'success' : scoreNum >= 50 ? 'active' : 'exception'}
            className="w-24"
          />
        );
      },
    },
    {
      title: '当前任务数',
      dataIndex: 'current_workload',
      key: 'current_workload',
      sorter: (a, b) => a.current_workload - b.current_workload,
      render: (workload: unknown) => {
        const workloadNum = Number(workload);
        return (
          <Tag color={workloadNum >= 5 ? 'error' : workloadNum >= 3 ? 'warning' : 'success'}>
            {workloadNum}
          </Tag>
        );
      },
    },
    {
      title: '技能详情',
      key: 'skill_details',
      width: 280,
      render: (_: unknown, record) => (
        <div className="flex flex-wrap gap-1">
          {record.skill_details.map((skill) => (
            <Tooltip
              key={skill.skill_id}
              title={`等级: ${proficiencyLabels[skill.proficiency_level] || skill.proficiency_level}\n认证: ${skill.is_certified ? '已认证' : '未认证'}`}
            >
              <Tag
                color={skill.meets_requirement ? proficiencyColors[skill.proficiency_level] : 'default'}
              >
                <span className="flex items-center gap-1">
                  {skill.meets_requirement ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  {skill.skill_name}
                </span>
              </Tag>
            </Tooltip>
          ))}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_: unknown, record) => (
        <Button
          variant="primary"
          size="small"
          onClick={() => handleAssign(record.personnel_id)}
          loading={assigning}
          disabled={record.status !== 'available'}
        >
          分配
        </Button>
      ),
    },
  ];

  const renderRequiredSkills = (skills: RequiredSkillInfo[]) => {
    if (!skills || skills.length === 0) {
      return <Tag>无技能要求</Tag>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {skills.map((skill) => (
          <Tooltip
            key={skill.skill_id}
            title={`最低等级: ${skill.min_proficiency ? proficiencyLabels[skill.min_proficiency] : '无要求'}\n需要认证: ${skill.certification_required ? '是' : '否'}`}
          >
            <Tag color="blue">
              {skill.skill_name}
              {skill.certification_required && ' *'}
            </Tag>
          </Tooltip>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title={`分配技术员 - ${task?.title || ''}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      size="large"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {data && (
            <div className="mb-4 space-y-2">
              <div>
                <strong className="text-sm">所需设备: </strong>
                {data.required_equipment_name ? (
                  <Tag color="processing">{data.required_equipment_name}</Tag>
                ) : (
                  <span className="text-neutral-400">无</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-sm">技能要求: </strong>
                {renderRequiredSkills(data.required_skills)}
              </div>
            </div>
          )}

          {data?.eligible_technicians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>
                {data?.required_equipment_id
                  ? '暂无符合条件的技术员'
                  : '该任务未设置所需设备，无法进行技能匹配'}
              </span>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={data?.eligible_technicians || []}
              rowKey="personnel_id"
              size="small"
              scroll={{ x: 850 }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
