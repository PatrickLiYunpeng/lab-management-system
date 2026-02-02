import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Select, Switch, Input, DatePicker, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { skillService } from '../../services/skillService';
import type { Skill, PersonnelSkill, PersonnelSkillFormData, PersonnelSkillUpdateData, ProficiencyLevel } from '../../types';

interface PersonnelSkillModalProps {
  visible: boolean;
  personnelId: number;
  personnelSkill: PersonnelSkill | null; // null for create, object for edit
  availableSkills: Skill[];
  onSuccess: () => void;
  onCancel: () => void;
}

const proficiencyOptions = [
  { label: '初级', value: 'beginner' },
  { label: '中级', value: 'intermediate' },
  { label: '高级', value: 'advanced' },
  { label: '专家', value: 'expert' },
];

interface PersonnelSkillFormValues {
  skill_id: number;
  proficiency_level: string;
  is_certified: boolean;
  certification_date?: dayjs.Dayjs;
  certification_expiry?: dayjs.Dayjs;
  certificate_number?: string;
}

export function PersonnelSkillModal({
  visible,
  personnelId,
  personnelSkill,
  availableSkills,
  onSuccess,
  onCancel,
}: PersonnelSkillModalProps) {
  const [form] = useForm<PersonnelSkillFormValues>({
    initialValues: {
      skill_id: undefined as unknown as number,
      proficiency_level: 'beginner',
      is_certified: false,
      certification_date: undefined,
      certification_expiry: undefined,
      certificate_number: '',
    },
    rules: {
      skill_id: [{ required: true, message: '请选择技能' }],
      proficiency_level: [{ required: true, message: '请选择熟练度' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [isCertified, setIsCertified] = useState(false);
  const toast = useToast();
  const isEdit = !!personnelSkill;

  useEffect(() => {
    if (visible) {
      if (personnelSkill) {
        form.setFieldsValue({
          skill_id: personnelSkill.skill_id,
          proficiency_level: personnelSkill.proficiency_level,
          is_certified: personnelSkill.is_certified,
          certification_date: personnelSkill.certification_date
            ? dayjs(personnelSkill.certification_date)
            : undefined,
          certification_expiry: personnelSkill.certification_expiry
            ? dayjs(personnelSkill.certification_expiry)
            : undefined,
          certificate_number: personnelSkill.certificate_number || '',
        });
        setIsCertified(personnelSkill.is_certified);
      } else {
        form.resetFields();
        form.setFieldsValue({
          proficiency_level: 'beginner',
          is_certified: false,
        });
        setIsCertified(false);
      }
    }
  }, [visible, personnelSkill, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit && personnelSkill) {
        const updateData: PersonnelSkillUpdateData = {
          proficiency_level: values.proficiency_level as ProficiencyLevel,
          is_certified: values.is_certified,
          certification_date: values.certification_date ? (values.certification_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          certification_expiry: values.certification_expiry ? (values.certification_expiry as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          certificate_number: values.certificate_number,
        };
        await skillService.updatePersonnelSkill(personnelId, personnelSkill.skill_id, updateData);
        toast.success('技能更新成功');
      } else {
        const createData: PersonnelSkillFormData = {
          skill_id: values.skill_id,
          proficiency_level: values.proficiency_level as ProficiencyLevel,
          is_certified: values.is_certified,
          certification_date: values.certification_date ? (values.certification_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          certification_expiry: values.certification_expiry ? (values.certification_expiry as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          certificate_number: values.certificate_number,
        };
        await skillService.assignSkillToPersonnel(personnelId, createData);
        toast.success('技能分配成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error(isEdit ? '更新失败' : '分配失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCertifiedChange = (checked: boolean) => {
    setIsCertified(checked);
  };

  return (
    <Modal
      title={isEdit ? '编辑技能' : '分配技能'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="skill_id" label="技能">
            <Select
              placeholder="请选择技能"
              disabled={isEdit}
              showSearch
              options={availableSkills.map((s) => ({
                label: `${s.name} (${s.code})`,
                value: s.id,
              }))}
            />
          </FormItem>
          <FormItem name="proficiency_level" label="熟练度">
            <Select options={proficiencyOptions} placeholder="请选择熟练度" />
          </FormItem>
        </div>

        <FormItem name="is_certified" label="已认证" valuePropName="checked">
          <Switch onChange={handleCertifiedChange} />
        </FormItem>

        {isCertified && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormItem name="certification_date" label="认证日期">
                <DatePicker className="w-full" placeholder="选择认证日期" />
              </FormItem>
              <FormItem name="certification_expiry" label="认证到期日">
                <DatePicker className="w-full" placeholder="选择到期日期" />
              </FormItem>
            </div>
            <FormItem name="certificate_number" label="证书编号">
              <Input placeholder="请输入证书编号" />
            </FormItem>
          </>
        )}
      </Form>
    </Modal>
  );
}
