import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Row, Col, App } from 'antd';
import { skillService } from '../../services/skillService';
import type { Skill, SkillFormData, SkillCategory } from '../../types';

const { TextArea } = Input;

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
  const [form] = Form.useForm<SkillFormValues>();
  const [loading, setLoading] = useState(false);
  const [requiresCertification, setRequiresCertification] = useState(false);
  const { message } = App.useApp();

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
        message.success('技能更新成功');
      } else {
        await skillService.createSkill(submitData);
        message.success('技能创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(skill ? '更新失败' : '创建失败');
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
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="技能名称" rules={[{ required: true, message: '请输入技能名称' }]}>
              <Input placeholder="请输入技能名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="技能代码" rules={[{ required: true, message: '请输入技能代码' }]}>
              <Input placeholder="请输入技能代码" disabled={!!skill} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="技能类别" rules={[{ required: true, message: '请选择技能类别' }]}>
              <Select options={categoryOptions} placeholder="请选择技能类别" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lab_type" label="适用实验室">
              <Select options={labTypeOptions} placeholder="请选择适用实验室" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="请输入技能描述" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="requires_certification" label="需要认证" valuePropName="checked">
              <Switch onChange={handleRequiresCertificationChange} />
            </Form.Item>
          </Col>
          {requiresCertification && (
            <Col span={8}>
              <Form.Item name="certification_validity_days" label="认证有效期(天)">
                <InputNumber
                  min={1}
                  max={3650}
                  placeholder="认证有效天数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          )}
          <Col span={8}>
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
