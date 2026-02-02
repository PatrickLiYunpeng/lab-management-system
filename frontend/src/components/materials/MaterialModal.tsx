import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, TextArea, Select, InputNumber, DatePicker, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { materialService } from '../../services/materialService';
import type { Material, MaterialFormData, MaterialUpdateData, Site, Laboratory, Client } from '../../types';

interface MaterialModalProps {
  visible: boolean;
  material: Material | null;
  sites: Site[];
  laboratories: Laboratory[];
  clients: Client[];
  onSuccess: () => void;
  onCancel: () => void;
}

const materialTypeOptions = [
  { label: '样品', value: 'sample' },
  { label: '耗材', value: 'consumable' },
  { label: '试剂', value: 'reagent' },
  { label: '工具', value: 'tool' },
  { label: '其他', value: 'other' },
];

const statusOptions = [
  { label: '已接收', value: 'received' },
  { label: '入库', value: 'in_storage' },
  { label: '已分配', value: 'allocated' },
  { label: '使用中', value: 'in_use' },
  { label: '待返还', value: 'pending_return' },
  { label: '已返还', value: 'returned' },
  { label: '已处置', value: 'disposed' },
  { label: '遗失', value: 'lost' },
];

const unitOptions = [
  { label: '件', value: 'piece' },
  { label: '个', value: 'unit' },
  { label: '片', value: 'slice' },
  { label: '组', value: 'set' },
  { label: '批', value: 'batch' },
  { label: '毫升', value: 'ml' },
  { label: '克', value: 'g' },
];

interface MaterialFormValues {
  material_code: string;
  name: string;
  material_type: string;
  site_id: number;
  laboratory_id: number;
  description?: string;
  storage_location?: string;
  quantity: number;
  unit: string;
  client_id?: number;
  client_reference?: string;
  storage_deadline?: dayjs.Dayjs;
  processing_deadline?: dayjs.Dayjs;
  status?: string;
}

export function MaterialModal({
  visible,
  material,
  sites,
  laboratories,
  clients,
  onSuccess,
  onCancel,
}: MaterialModalProps) {
  const [form] = useForm<MaterialFormValues>({
    initialValues: {
      material_code: '',
      name: '',
      material_type: 'sample',
      site_id: undefined as unknown as number,
      laboratory_id: undefined as unknown as number,
      description: '',
      storage_location: '',
      quantity: 1,
      unit: 'piece',
      client_id: undefined,
      client_reference: '',
      storage_deadline: undefined,
      processing_deadline: undefined,
      status: undefined,
    },
    rules: {
      material_code: [{ required: true, message: '请输入物料编码' }],
      name: [{ required: true, message: '请输入物料名称' }],
      material_type: [{ required: true, message: '请选择物料类型' }],
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
      if (material) {
        setSelectedSiteId(material.site_id);
        form.setFieldsValue({
          ...material,
          storage_deadline: material.storage_deadline ? dayjs(material.storage_deadline) : undefined,
          processing_deadline: material.processing_deadline ? dayjs(material.processing_deadline) : undefined,
        } as MaterialFormValues);
      } else {
        form.resetFields();
        form.setFieldsValue({ quantity: 1, unit: 'piece', material_type: 'sample' });
        setSelectedSiteId(undefined);
      }
    }
  }, [visible, material, form]);

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
        storage_deadline: values.storage_deadline ? (values.storage_deadline as dayjs.Dayjs).toISOString() : undefined,
        processing_deadline: values.processing_deadline ? (values.processing_deadline as dayjs.Dayjs).toISOString() : undefined,
      };

      if (material) {
        await materialService.updateMaterial(material.id, formData as unknown as MaterialUpdateData);
        toast.success('更新成功');
      } else {
        await materialService.createMaterial(formData as unknown as MaterialFormData);
        toast.success('创建成功');
      }

      onSuccess();
    } catch {
      toast.error(material ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={material ? '编辑物料' : '新增物料'}
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
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="material_code" label="物料编码">
            <Input placeholder="请输入物料编码" disabled={!!material} />
          </FormItem>
          <FormItem name="name" label="物料名称">
            <Input placeholder="请输入物料名称" />
          </FormItem>
          <FormItem name="material_type" label="物料类型">
            <Select placeholder="请选择物料类型" options={materialTypeOptions} disabled={!!material} />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="site_id" label="所属站点">
            <Select
              placeholder="请选择所属站点"
              onChange={handleSiteChange}
              disabled={!!material}
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
              disabled={!selectedSiteId || !!material}
              showSearch
              options={filteredLaboratories.map((lab) => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
        </div>

        <FormItem name="description" label="描述">
          <TextArea rows={2} placeholder="请输入物料描述" />
        </FormItem>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">存储与数量</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="storage_location" label="存储位置">
            <Input placeholder="请输入存储位置" />
          </FormItem>
          <FormItem name="quantity" label="数量">
            <InputNumber min={1} placeholder="数量" className="w-full" />
          </FormItem>
          <FormItem name="unit" label="单位">
            <Select placeholder="请选择单位" options={unitOptions} />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">客户信息</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormItem name="client_id" label="客户">
            <Select
              placeholder="请选择客户"
              allowClear
              showSearch
              options={clients.map((client) => ({
                label: `${client.name} (${client.code})`,
                value: client.id,
              }))}
            />
          </FormItem>
          <FormItem name="client_reference" label="客户参考号">
            <Input placeholder="客户的参考编号" />
          </FormItem>
        </div>

        <div className="border-b border-neutral-200 pb-2 mb-4 mt-6">
          <span className="text-sm text-neutral-500">时间要求</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormItem name="storage_deadline" label="存储期限">
            <DatePicker className="w-full" placeholder="存储截止日期" />
          </FormItem>
          <FormItem name="processing_deadline" label="处理期限">
            <DatePicker className="w-full" placeholder="处理截止日期" />
          </FormItem>
          {material && (
            <FormItem name="status" label="状态">
              <Select placeholder="请选择状态" options={statusOptions} />
            </FormItem>
          )}
        </div>
      </Form>
    </Modal>
  );
}
