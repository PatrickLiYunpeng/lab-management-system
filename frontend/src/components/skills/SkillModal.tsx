import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, InputNumber, TextArea, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { skillService } from '../../services/skillService';
import type { Skill, SkillFormData, SkillCategory } from '../../types';

interface SkillModalProps {
  visible: boolean;
  skill: Skill | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const categoryOptions = [
  { label: '设备操作', value: 'equipment_operation' },
  { label: '测试方法', value: 'testing_method' },
  { label: '分析技术', value: 'analysis_technique' },
  { label: '软件工具', value: 'software_tool' },
  { label: '安全程序', value: 'safety_procedure' },
  { label: '其他', value: 'other' },
];

const labTypeOptions = [
  { label: '通用', value: '' },
  { label: '失效分析 (FA)', value: 'fa' },
  { label: '可靠性测试', value: 'reliability' },
];

interface SkillFormValues {
  name: string;
  code: string;
  category: string;
  lab_type?: string;
  description?: string;
  requires_certification: boolean;
  certification_validity_days?: number;
  is_active: boolean;
}

export function SkillModal({ visible, skill, onSuccess, onCancel }: SkillModalProps) {
  const [form] = useForm<SkillFormValues>({
    initialValues: {
      name: '',
      code: '',
      category: '',
      lab_type: '',
      description: '',
      requires_certification: false,
      certification_validity_days: undefined,
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入技能名称' }],
      code: [{ required: true, message: '请输入技能代码' }],
      category: [{ required: true, message: '请选择技能类别' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [requiresCertification, setRequiresCertification] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (visible) {
      if (skill) {
        form.setFieldsValue({
          name: skill.name,
          code: skill.code,
          category: skill.category,
          lab_type: skill.lab_type || '',
          description: skill.description || '',
          requires_certification: skill.requires_certification,
          certification_validity_days: skill.certification_validity_days,
          is_active: skill.is_active,
        });
        setRequiresCertification(skill.requires_certification);
      } else {
        form.resetFields();
        form.setFieldsValue({
          is_active: true,
          requires_certification: false,
          lab_type: '',
        });
        setRequiresCertification(false);
      }
    }
  }, [visible, skill, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const submitData: SkillFormData = {
        name: values.name,
        code: values.code,
        category: values.category as SkillCategory,
        description: values.description,
        requires_certification: values.requires_certification,
        certification_validity_days: values.certification_validity_days,
        lab_type: values.lab_type || undefined,
      };

      if (skill) {
        await skillService.updateSkill(skill.id, submitData);
        toast.success('技能更新成功');
      } else {
        await skillService.createSkill(submitData);
        toast.success('技能创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error(skill ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRequiresCertificationChange = (checked: boolean) => {
    setRequiresCertification(checked);
  };

  return (
    <Modal
      title={skill ? '编辑技能' : '新增技能'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={700}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="name" label="技能名称">
            <Input placeholder="请输入技能名称" />
          </FormItem>
          <FormItem name="code" label="技能代码">
            <Input placeholder="请输入技能代码" disabled={!!skill} />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="category" label="技能类别">
            <Select options={categoryOptions} placeholder="请选择技能类别" />
          </FormItem>
          <FormItem name="lab_type" label="适用实验室">
            <Select options={labTypeOptions} placeholder="请选择适用实验室" allowClear />
          </FormItem>
        </div>

        <FormItem name="description" label="描述">
          <TextArea rows={3} placeholder="请输入技能描述" />
        </FormItem>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="requires_certification" label="需要认证" valuePropName="checked">
            <Switch onChange={handleRequiresCertificationChange} />
          </FormItem>
          {requiresCertification && (
            <FormItem name="certification_validity_days" label="认证有效期(天)">
              <InputNumber
                min={1}
                max={3650}
                placeholder="认证有效天数"
                className="w-full"
              />
            </FormItem>
          )}
          <FormItem name="is_active" label="状态" valuePropName="checked">
            <Switch />
          </FormItem>
        </div>
      </Form>
    </Modal>
  );
}
