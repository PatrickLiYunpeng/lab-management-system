import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Select, Input, DatePicker, TextArea, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { transferService } from '../../services/transferService';
import type { Personnel, Laboratory, BorrowRequestFormData } from '../../types';

interface TransferModalProps {
  visible: boolean;
  personnelList: Personnel[];
  laboratories: Laboratory[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface TransferFormValues {
  personnel_id: number;
  to_laboratory_id: number;
  start_date?: dayjs.Dayjs;
  end_date?: dayjs.Dayjs;
  reason?: string;
}

export function TransferModal({
  visible,
  personnelList,
  laboratories,
  onSuccess,
  onCancel,
}: TransferModalProps) {
  const [form] = useForm<TransferFormValues>({
    initialValues: {
      personnel_id: undefined as unknown as number,
      to_laboratory_id: undefined as unknown as number,
      start_date: undefined,
      end_date: undefined,
      reason: '',
    },
    rules: {
      personnel_id: [{ required: true, message: '请选择借调人员' }],
      to_laboratory_id: [{ required: true, message: '请选择目标实验室' }],
      start_date: [{ required: true, message: '请选择开始日期' }],
      end_date: [{ required: true, message: '请选择结束日期' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | undefined>();
  const toast = useToast();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedPersonnelId(undefined);
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const startDate = values.start_date as dayjs.Dayjs;
      const endDate = values.end_date as dayjs.Dayjs;

      const data: BorrowRequestFormData = {
        personnel_id: values.personnel_id,
        to_laboratory_id: values.to_laboratory_id,
        reason: values.reason,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      };

      await transferService.createBorrowRequest(data);
      toast.success('借调申请创建成功');
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error('创建借调申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonnelChange = (value: string | number | (string | number)[]) => {
    const id = Array.isArray(value) ? value[0] as number : value as number;
    setSelectedPersonnelId(id);
    form.setFieldValue('to_laboratory_id', undefined);
  };

  const selectedPersonnel = personnelList.find((p) => p.id === selectedPersonnelId);

  // Filter out the personnel's current laboratory from target options
  const targetLaboratories = laboratories.filter(
    (lab) => lab.id !== selectedPersonnel?.primary_laboratory_id
  );

  return (
    <Modal
      title="新建借调申请"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="提交申请"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <FormItem name="personnel_id" label="借调人员">
          <Select
            placeholder="请选择人员"
            showSearch
            onChange={handlePersonnelChange}
            options={personnelList.map((p) => ({
              label: `${p.user?.full_name || p.employee_id} (${p.employee_id})`,
              value: p.id,
            }))}
          />
        </FormItem>

        {selectedPersonnel && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              当前所属实验室
            </label>
            <Input
              disabled
              value={selectedPersonnel.primary_laboratory?.name || '未分配'}
            />
          </div>
        )}

        <FormItem name="to_laboratory_id" label="目标实验室">
          <Select
            placeholder="请选择目标实验室"
            disabled={!selectedPersonnelId}
            options={targetLaboratories.map((lab) => ({
              label: `${lab.name} (${lab.code})`,
              value: lab.id,
            }))}
          />
        </FormItem>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="start_date" label="开始日期">
            <DatePicker
              className="w-full"
              placeholder="选择开始日期"
            />
          </FormItem>
          <FormItem name="end_date" label="结束日期">
            <DatePicker
              className="w-full"
              placeholder="选择结束日期"
            />
          </FormItem>
        </div>

        <FormItem name="reason" label="借调原因">
          <TextArea rows={3} placeholder="请输入借调原因" />
        </FormItem>
      </Form>
    </Modal>
  );
}
