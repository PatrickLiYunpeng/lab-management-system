import { useEffect, useState } from 'react';
import { Modal, Input, Select, Switch, InputNumber, Form, Row, Col, App } from 'antd';
import { laboratoryService } from '../../services/laboratoryService';
import type { Laboratory, LaboratoryFormData, Site } from '../../types';

const { TextArea } = Input;

interface LaboratoryModalProps {
  visible: boolean;
  laboratory: Laboratory | null;
  sites: Site[];
  sitesLoading?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LaboratoryModal({
  visible,
  laboratory,
  sites,
  onSuccess,
  onCancel,
}: LaboratoryModalProps) {
  const [form] = Form.useForm<LaboratoryFormData>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (laboratory) {
        form.setFieldsValue(laboratory);
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [visible, laboratory, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (laboratory) {
        await laboratoryService.updateLaboratory(laboratory.id, values);
        message.success('更新成功');
      } else {
        await laboratoryService.createLaboratory(values);
        message.success('创建成功');
      }

      onSuccess();
    } catch {
      message.error(laboratory ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={laboratory ? '编辑实验室' : '新增实验室'}
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
            <Form.Item name="name" label="实验室名称" rules={[{ required: true, message: '请输入实验室名称' }]}>
              <Input placeholder="请输入实验室名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="实验室代码" rules={[{ required: true, message: '请输入实验室代码' }]}>
              <Input placeholder="请输入实验室代码" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lab_type" label="实验室类型" rules={[{ required: true, message: '请选择实验室类型' }]}>
              <Select
                placeholder="请选择实验室类型"
                options={[
                  { label: 'FA (失效分析)', value: 'fa' },
                  { label: '可靠性测试', value: 'reliability' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="site_id" label="所属站点" rules={[{ required: true, message: '请选择所属站点' }]}>
              <Select
                placeholder="请选择所属站点"
                options={sites.map((site) => ({
                  label: site.name,
                  value: site.id,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="请输入实验室描述" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="max_capacity" label="最大容量">
              <InputNumber min={1} placeholder="请输入" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="manager_name" label="负责人姓名">
              <Input placeholder="请输入负责人姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="manager_email"
              label="负责人邮箱"
              rules={[
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '请输入有效的邮箱地址',
                },
              ]}
            >
              <Input placeholder="请输入负责人邮箱" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
