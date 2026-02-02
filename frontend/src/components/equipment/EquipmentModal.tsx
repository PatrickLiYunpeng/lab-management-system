import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, TextArea, Select, InputNumber, DatePicker, Switch, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { equipmentService } from '../../services/equipmentService';
import type { Equipment, EquipmentFormData, EquipmentUpdateData, Site, Laboratory } from '../../types';

interface EquipmentModalProps {
  visible: boolean;
  equipment: Equipment | null;
  sites: Site[];
  laboratories: Laboratory[];
  onSuccess: () => void;
  onCancel: () => void;
}

const equipmentTypeOptions = [
  { label: '自主运行设备', value: 'autonomous' },
  { label: '操作员依赖设备', value: 'operator_dependent' },
];

const categoryOptions = [
  { label: '热学设备', value: 'thermal' },
  { label: '机械设备', value: 'mechanical' },
  { label: '电学设备', value: 'electrical' },
  { label: '光学设备', value: 'optical' },
  { label: '分析设备', value: 'analytical' },
  { label: '环境设备', value: 'environmental' },
  { label: '测量设备', value: 'measurement' },
  { label: '其他', value: 'other' },
];

const statusOptions = [
  { label: '可用', value: 'available' },
  { label: '使用中', value: 'in_use' },
  { label: '维护中', value: 'maintenance' },
  { label: '停用', value: 'out_of_service' },
  { label: '已预约', value: 'reserved' },
];

interface EquipmentFormValues {
  name: string;
  code: string;
  equipment_type: string;
  category?: string;
  site_id: number;
  laboratory_id: number;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  description?: string;
  capacity?: number;
  uph?: number;
  max_concurrent_tasks: number;
  status?: string;
  purchase_date?: dayjs.Dayjs;
  warranty_expiry?: dayjs.Dayjs;
  maintenance_interval_days?: number;
  calibration_interval_days?: number;
  is_active: boolean;
}

export function EquipmentModal({
  visible,
  equipment,
  sites,
  laboratories,
  onSuccess,
  onCancel,
}: EquipmentModalProps) {
  const [form] = useForm<EquipmentFormValues>({
    initialValues: {
      name: '',
      code: '',
      equipment_type: '',
      category: undefined,
      site_id: undefined as unknown as number,
      laboratory_id: undefined as unknown as number,
      model: '',
      manufacturer: '',
      serial_number: '',
      description: '',
      capacity: undefined,
      uph: undefined,
      max_concurrent_tasks: 1,
      status: undefined,
      purchase_date: undefined,
      warranty_expiry: undefined,
      maintenance_interval_days: undefined,
      calibration_interval_days: undefined,
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入设备名称' }],
      code: [{ required: true, message: '请输入设备编号' }],
      equipment_type: [{ required: true, message: '请选择设备类型' }],
      site_id: [{ required: true, message: '请选择所属站点' }],
      laboratory_id: [{ required: true, message: '请选择所属实验室' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const toast = useToast();

  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  useEffect(() => {
    if (visible) {
      if (equipment) {
        setSelectedSiteId(equipment.site_id);
        form.setFieldsValue({
          ...equipment,
          purchase_date: equipment.purchase_date ? dayjs(equipment.purchase_date) : undefined,
          warranty_expiry: equipment.warranty_expiry ? dayjs(equipment.warranty_expiry) : undefined,
        } as EquipmentFormValues);
      } else {
        form.resetFields();
        form.setFieldsValue({ max_concurrent_tasks: 1, is_active: true });
        setSelectedSiteId(undefined);
      }
    }
  }, [visible, equipment, form]);

  const handleSiteChange = (value: string | number | (string | number)[]) => {
    const siteId = Array.isArray(value) ? value[0] as number : value as number;
    setSelectedSiteId(siteId);
    const currentLabId = form.getFieldValue('laboratory_id');
    if (currentLabId) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== siteId) {
        form.setFieldValue('laboratory_id', undefined);
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
        purchase_date: values.purchase_date ? (values.purchase_date as dayjs.Dayjs).toISOString() : undefined,
        warranty_expiry: values.warranty_expiry ? (values.warranty_expiry as dayjs.Dayjs).toISOString() : undefined,
      };

      if (equipment) {
        await equipmentService.updateEquipment(equipment.id, formData as unknown as EquipmentUpdateData);
        toast.success('更新成功');
      } else {
        await equipmentService.createEquipment(formData as unknown as EquipmentFormData);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(equipment ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={equipment ? '编辑设备' : '新增设备'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={800}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <div className="border-b border-neutral-200 pb-2 mb-4">
          <span className="text-sm text-neutral-500">基本信息</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <FormItem name="name" label="设备名称">
            <Input placeholder="请输入设备名称" />
          </FormItem>
          <FormItem name="code" label="设备编号">
            <Input placeholder="请输入设备编号" />
          </FormItem>
          <FormItem name="equipment_type" label="设备类型">
            <Select placeholder="请选择设备类型" options={equipmentTypeOptions} />
          </FormItem>
          <FormItem name="category" label="设备类别">
            <Select placeholder="请选择设备类别" options={categoryOptions} allowClear />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="site_id" label="所属站点">
            <Select
              placeholder="请选择所属站点"
              onChange={handleSiteChange}
              showSearch
              options={sites.map((site) => ({
                label: `${site.name} (${site.code})`,
                value: site.id,
              }))}
            />
          </FormItem>
          <FormItem name="laboratory_id" label="所属实验室">
            <Select
              placeholder="请先选择所属站点"
              disabled={!selectedSiteId}
              showSearch
              options={filteredLaboratories.map((lab) => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">设备详情</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="model" label="型号">
            <Input placeholder="请输入型号" />
          </FormItem>
          <FormItem name="manufacturer" label="制造商">
            <Input placeholder="请输入制造商" />
          </FormItem>
          <FormItem name="serial_number" label="序列号">
            <Input placeholder="请输入序列号" />
          </FormItem>
        </div>

        <FormItem name="description" label="描述">
          <TextArea rows={2} placeholder="请输入设备描述" />
        </FormItem>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">性能参数</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <FormItem name="capacity" label="容量">
            <InputNumber min={1} placeholder="最大容量" className="w-full" />
          </FormItem>
          <FormItem name="uph" label="UPH (每小时产能)">
            <InputNumber min={0} step={0.1} placeholder="每小时产能" className="w-full" />
          </FormItem>
          <FormItem name="max_concurrent_tasks" label="最大并发任务">
            <InputNumber min={1} placeholder="并发任务数" className="w-full" />
          </FormItem>
          {equipment && (
            <FormItem name="status" label="状态">
              <Select placeholder="请选择状态" options={statusOptions} />
            </FormItem>
          )}
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">维保信息</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="purchase_date" label="采购日期">
            <DatePicker className="w-full" placeholder="请选择采购日期" />
          </FormItem>
          <FormItem name="warranty_expiry" label="保修到期日">
            <DatePicker className="w-full" placeholder="请选择保修到期日" />
          </FormItem>
          <FormItem name="maintenance_interval_days" label="维护周期(天)">
            <InputNumber min={1} placeholder="维护周期" className="w-full" />
          </FormItem>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormItem name="calibration_interval_days" label="校准周期(天)">
            <InputNumber min={1} placeholder="校准周期" className="w-full" />
          </FormItem>
          {equipment && (
            <FormItem name="is_active" label="启用状态">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </FormItem>
          )}
        </div>
      </Form>
    </Modal>
  );
}
