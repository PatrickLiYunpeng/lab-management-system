import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, DatePicker, Row, Col, App } from 'antd';
import { personnelService } from '../../services/personnelService';
import type { Personnel, PersonnelFormData, PersonnelUpdateData, Site, Laboratory, User } from '../../types';

interface PersonnelModalProps {
  visible: boolean;
  personnel: Personnel | null;
  sites: Site[];
  laboratories: Laboratory[];
  users: User[];
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = [
  { label: '可用', value: 'available' },
  { label: '忙碌', value: 'busy' },
  { label: '休假', value: 'on_leave' },
  { label: '借调中', value: 'borrowed' },
];

const departmentOptions = [
  { label: '失效分析部', value: '失效分析部' },
  { label: '可靠性测试部', value: '可靠性测试部' },
  { label: '质量管理部', value: '质量管理部' },
  { label: '研发部', value: '研发部' },
];

interface PersonnelFormValues {
  employee_id: string;
  user_id: number;
  primary_site_id: number;
  primary_laboratory_id: number;
  current_site_id?: number;
  current_laboratory_id?: number;
  job_title?: string;
  department?: string;
  hire_date?: dayjs.Dayjs;
  status?: string;
}

export function PersonnelModal({
  visible,
  personnel,
  sites,
  laboratories,
  users,
  onSuccess,
  onCancel,
}: PersonnelModalProps) {
  const [form] = Form.useForm<PersonnelFormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const { message } = App.useApp();

  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  const availableUsers = personnel
    ? users
    : users.filter((u) => u.role !== 'admin' && u.role !== 'viewer');

  useEffect(() => {
    if (visible) {
      if (personnel) {
        setSelectedSiteId(personnel.primary_site_id);
        form.setFieldsValue({
          ...personnel,
          hire_date: personnel.hire_date ? dayjs(personnel.hire_date) : undefined,
        } as PersonnelFormValues);
      } else {
        form.resetFields();
        setSelectedSiteId(undefined);
      }
    }
  }, [visible, personnel, form]);

  const handleSiteChange = (value: number) => {
    setSelectedSiteId(value);
    const currentLabId = form.getFieldValue('primary_laboratory_id');
    if (currentLabId) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== value) {
        form.setFieldValue('primary_laboratory_id', undefined);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = {
        ...values,
        hire_date: values.hire_date ? (values.hire_date as dayjs.Dayjs).toISOString() : undefined,
      };

      if (personnel) {
        await personnelService.updatePersonnel(personnel.id, formData as unknown as PersonnelUpdateData);
        message.success('更新成功');
      } else {
        await personnelService.createPersonnel(formData as unknown as PersonnelFormData);
        message.success('创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(personnel ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={personnel ? '编辑人员' : '新增人员'}
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
            <Form.Item name="employee_id" label="员工编号" rules={[{ required: true, message: '请输入员工编号' }]}>
              <Input placeholder="请输入员工编号" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="user_id" label="关联用户" rules={[{ required: true, message: '请选择关联用户' }]}>
              <Select
                placeholder="请选择关联用户"
                disabled={!!personnel}
                showSearch
                optionFilterProp="label"
                options={availableUsers.map((user) => ({
                  label: `${user.full_name || user.username} (${user.username})`,
                  value: user.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="primary_site_id" label="主站点" rules={[{ required: true, message: '请选择主站点' }]}>
              <Select
                placeholder="请选择主站点"
                onChange={handleSiteChange}
                showSearch
                optionFilterProp="label"
                options={sites.map((site) => ({
                  label: `${site.name} (${site.code})`,
                  value: site.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="primary_laboratory_id" label="主实验室" rules={[{ required: true, message: '请选择主实验室' }]}>
              <Select
                placeholder="请先选择主站点"
                disabled={!selectedSiteId}
                showSearch
                optionFilterProp="label"
                options={filteredLaboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {personnel && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="current_site_id" label="当前站点">
                <Select
                  placeholder="请选择当前站点"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={sites.map((site) => ({
                    label: `${site.name} (${site.code})`,
                    value: site.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="current_laboratory_id" label="当前实验室">
                <Select
                  placeholder="请选择当前实验室"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={laboratories.map((lab) => ({
                    label: `${lab.name} (${lab.code})`,
                    value: lab.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="job_title" label="职位">
              <Input placeholder="请输入职位" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="department" label="部门">
              <Select
                placeholder="请选择部门"
                allowClear
                options={departmentOptions}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="hire_date" label="入职日期">
              <DatePicker style={{ width: '100%' }} placeholder="请选择入职日期" />
            </Form.Item>
          </Col>
          {personnel && (
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" options={statusOptions} />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
