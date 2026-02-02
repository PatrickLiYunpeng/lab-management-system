import { useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { workOrderService } from '../../services/workOrderService';
import type { WorkOrder, WorkOrderFormData, WorkOrderUpdateData, Site, Laboratory, Client } from '../../types';
import {
  Button,
  Input,
  TextArea,
  Select,
  InputNumber,
  DatePicker,
  Modal,
  useToast,
  useForm,
  Form,
  FormItem,
  type FormInstance,
} from '../ui';

interface WorkOrderModalProps {
  visible: boolean;
  workOrder: WorkOrder | null;
  sites: Site[];
  laboratories: Laboratory[];
  clients: Client[];
  onSuccess: () => void;
  onCancel: () => void;
}

const workOrderTypeOptions = [
  { label: '失效分析', value: 'failure_analysis' },
  { label: '可靠性测试', value: 'reliability_test' },
];

const testingSourceOptions = [
  { label: 'VIP客户', value: 'vip' },
  { label: '内部测试', value: 'internal' },
  { label: '外部客户', value: 'external' },
  { label: '常规测试', value: 'routine' },
];

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待处理', value: 'pending' },
  { label: '已分配', value: 'assigned' },
  { label: '进行中', value: 'in_progress' },
  { label: '暂停', value: 'on_hold' },
  { label: '待审核', value: 'review' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

const priorityOptions = [
  { label: '最高 (1)', value: 1 },
  { label: '高 (2)', value: 2 },
  { label: '中 (3)', value: 3 },
  { label: '低 (4)', value: 4 },
  { label: '最低 (5)', value: 5 },
];

interface WorkOrderFormValues {
  title?: string;
  description?: string;
  work_order_type?: 'failure_analysis' | 'reliability_test';
  status?: string;
  priority?: number;
  testing_source?: string;
  site_id?: number;
  laboratory_id?: number;
  client_id?: number;
  sla_deadline?: Dayjs | null;
}

export function WorkOrderModal({
  visible,
  workOrder,
  sites,
  laboratories,
  clients,
  onSuccess,
  onCancel,
}: WorkOrderModalProps) {
  const toast = useToast();
  const [form] = useForm();
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();

  // Filter laboratories by selected site
  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  useEffect(() => {
    if (visible) {
      if (workOrder) {
        setSelectedSiteId(workOrder.site_id);
        form.setFieldsValue({
          ...workOrder,
          sla_deadline: workOrder.sla_deadline ? new Date(workOrder.sla_deadline) : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          work_order_type: 'failure_analysis',
          testing_source: 'external',
          priority_level: 3,
        });
        setSelectedSiteId(undefined);
      }
    }
  }, [visible, workOrder, form]);

  const handleSiteChange = (value: string | number | (string | number)[]) => {
    const siteId = Array.isArray(value) ? value[0] : value;
    setSelectedSiteId(siteId ? Number(siteId) : undefined);
    const currentLabId = form.getFieldValue('laboratory_id');
    if (currentLabId && siteId) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== Number(siteId)) {
        form.setFieldValue('laboratory_id', undefined);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const errors = await form.validateFields();
      if (errors && Object.keys(errors).length > 0) {
        return;
      }
      
      const values = form.getFieldsValue() as WorkOrderFormValues;
      setLoading(true);

      const slaDeadline = values.sla_deadline;
      const formData = {
        ...values,
        sla_deadline: slaDeadline && dayjs.isDayjs(slaDeadline) ? slaDeadline.toISOString() : undefined,
      };

      if (workOrder) {
        await workOrderService.updateWorkOrder(workOrder.id, formData as WorkOrderUpdateData);
        toast.success('更新成功');
      } else {
        await workOrderService.createWorkOrder(formData as WorkOrderFormData);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(workOrder ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={workOrder ? '编辑工单' : '新增工单'}
      open={visible}
      onCancel={onCancel}
      size="large"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="default" onClick={onCancel}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>确定</Button>
        </div>
      }
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="border-b border-neutral-200 pb-2 mb-4">
          <span className="text-sm text-neutral-500">基本信息</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FormItem
              name="title"
              label="工单标题"
              rules={[{ required: true, message: '请输入工单标题' }]}
            >
              <Input placeholder="请输入工单标题" />
            </FormItem>
          </div>
          <FormItem
            name="work_order_type"
            label="工单类型"
            rules={[{ required: true, message: '请选择工单类型' }]}
          >
            <Select 
              placeholder="请选择工单类型" 
              options={workOrderTypeOptions} 
              disabled={!!workOrder}
            />
          </FormItem>
        </div>

        <FormItem name="description" label="描述">
          <TextArea rows={3} placeholder="请输入工单描述" />
        </FormItem>

        <div className="grid grid-cols-2 gap-4">
          <FormItem
            name="site_id"
            label="所属站点"
            rules={[{ required: true, message: '请选择所属站点' }]}
          >
            <Select
              placeholder="请选择所属站点"
              onChange={handleSiteChange}
              disabled={!!workOrder}
              options={sites.map((site) => ({
                label: `${site.name} (${site.code})`,
                value: site.id,
              }))}
            />
          </FormItem>
          <FormItem
            name="laboratory_id"
            label="所属实验室"
            rules={[{ required: true, message: '请选择所属实验室' }]}
          >
            <Select
              placeholder="请先选择所属站点"
              disabled={!selectedSiteId || !!workOrder}
              options={filteredLaboratories.map((lab) => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">客户与优先级</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="client_id" label="客户">
            <Select
              placeholder="请选择客户"
              allowClear
              options={clients.map((client) => ({
                label: `${client.name} (${client.code})`,
                value: client.id,
              }))}
            />
          </FormItem>
          <FormItem name="testing_source" label="测试来源">
            <Select placeholder="请选择测试来源" options={testingSourceOptions} />
          </FormItem>
          <FormItem name="priority_level" label="优先级">
            <Select placeholder="请选择优先级" options={priorityOptions} />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">时间要求</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="sla_deadline" label="SLA截止时间">
            <DatePicker 
              placeholder="SLA截止时间"
            />
          </FormItem>
          <FormItem name="standard_cycle_hours" label="标准周期(小时)">
            <InputNumber 
              min={0.1} 
              step={0.5} 
              placeholder="标准周期"
            />
          </FormItem>
          {workOrder && (
            <FormItem name="status" label="状态">
              <Select placeholder="请选择状态" options={statusOptions} />
            </FormItem>
          )}
        </div>
      </Form>
    </Modal>
  );
}
