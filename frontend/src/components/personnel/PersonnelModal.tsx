import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, Select, DatePicker, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
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
  const [form] = useForm<PersonnelFormValues>({
    initialValues: {
      employee_id: '',
      user_id: undefined as unknown as number,
      primary_site_id: undefined as unknown as number,
      primary_laboratory_id: undefined as unknown as number,
      current_site_id: undefined,
      current_laboratory_id: undefined,
      job_title: '',
      department: '',
      hire_date: undefined,
      status: undefined,
    },
    rules: {
      employee_id: [{ required: true, message: '请输入员工编号' }],
      user_id: [{ required: true, message: '请选择关联用户' }],
      primary_site_id: [{ required: true, message: '请选择主站点' }],
      primary_laboratory_id: [{ required: true, message: '请选择主实验室' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const toast = useToast();

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

  const handleSiteChange = (value: string | number | (string | number)[]) => {
    const siteId = Array.isArray(value) ? value[0] as number : value as number;
    setSelectedSiteId(siteId);
    const currentLabId = form.getFieldValue('primary_laboratory_id');
    if (currentLabId) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== siteId) {
        form.setFieldValue('primary_laboratory_id', undefined);
      }
    }
  };

  const handleSubmit = async () => {
    const isValid = await form.validateFields();
    if (!isValid) return;

    try {
      setLoading(true);
      const values = form.getFieldsValue();

      const formData = {
        ...values,
        hire_date: values.hire_date ? (values.hire_date as dayjs.Dayjs).toISOString() : undefined,
      };

      if (personnel) {
        await personnelService.updatePersonnel(personnel.id, formData as unknown as PersonnelUpdateData);
        toast.success('更新成功');
      } else {
        await personnelService.createPersonnel(formData as unknown as PersonnelFormData);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(personnel ? '更新失败' : '创建失败');
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
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="employee_id" label="员工编号">
            <Input placeholder="请输入员工编号" />
          </FormItem>
          <FormItem name="user_id" label="关联用户">
            <Select
              placeholder="请选择关联用户"
              disabled={!!personnel}
              showSearch
              options={availableUsers.map((user) => ({
                label: `${user.full_name || user.username} (${user.username})`,
                value: user.id,
              }))}
            />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="primary_site_id" label="主站点">
            <Select
              placeholder="请选择主站点"
              onChange={handleSiteChange}
              showSearch
              options={sites.map((site) => ({
                label: `${site.name} (${site.code})`,
                value: site.id,
              }))}
            />
          </FormItem>
          <FormItem name="primary_laboratory_id" label="主实验室">
            <Select
              placeholder="请先选择主站点"
              disabled={!selectedSiteId}
              showSearch
              options={filteredLaboratories.map((lab) => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
        </div>

        {personnel && (
          <div className="grid grid-cols-2 gap-4">
            <FormItem name="current_site_id" label="当前站点">
              <Select
                placeholder="请选择当前站点"
                allowClear
                showSearch
                options={sites.map((site) => ({
                  label: `${site.name} (${site.code})`,
                  value: site.id,
                }))}
              />
            </FormItem>
            <FormItem name="current_laboratory_id" label="当前实验室">
              <Select
                placeholder="请选择当前实验室"
                allowClear
                showSearch
                options={laboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </FormItem>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="job_title" label="职位">
            <Input placeholder="请输入职位" />
          </FormItem>
          <FormItem name="department" label="部门">
            <Select
              placeholder="请选择部门"
              allowClear
              options={departmentOptions}
            />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="hire_date" label="入职日期">
            <DatePicker className="w-full" placeholder="请选择入职日期" />
          </FormItem>
          {personnel && (
            <FormItem name="status" label="状态">
              <Select placeholder="请选择状态" options={statusOptions} />
            </FormItem>
          )}
        </div>
      </Form>
    </Modal>
  );
}
