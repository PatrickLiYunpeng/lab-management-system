import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, Select, Switch, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { shiftService } from '../../services/shiftService';
import { laboratoryService } from '../../services/laboratoryService';
import type { Shift, ShiftFormData, Laboratory } from '../../types';

interface ShiftModalProps {
  visible: boolean;
  shift: Shift | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ShiftFormValues {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  laboratory_id?: number;
  is_active?: boolean;
}

export function ShiftModal({ visible, shift, onSuccess, onCancel }: ShiftModalProps) {
  const [form] = useForm<ShiftFormValues>({
    initialValues: {
      name: '',
      code: '',
      start_time: '',
      end_time: '',
      laboratory_id: undefined,
      is_active: true,
    },
    rules: {
      name: [{ required: true, message: '请输入班次名称' }],
      code: [{ required: true, message: '请输入班次代码' }],
      start_time: [{ required: true, message: '请选择开始时间' }],
      end_time: [{ required: true, message: '请选择结束时间' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (visible) {
      // Load laboratories for the dropdown
      laboratoryService.getLaboratories({ page_size: 100 }).then((res) => {
        setLaboratories(res.items.filter((lab) => lab.is_active));
      });

      if (shift) {
        // Convert HH:mm:ss to HH:mm for input[type="time"]
        const startTime = shift.start_time ? dayjs(shift.start_time, 'HH:mm:ss').format('HH:mm') : '';
        const endTime = shift.end_time ? dayjs(shift.end_time, 'HH:mm:ss').format('HH:mm') : '';
        
        form.setFieldsValue({
          name: shift.name,
          code: shift.code,
          start_time: startTime,
          end_time: endTime,
          laboratory_id: shift.laboratory_id || undefined,
          is_active: shift.is_active,
        });
      } else {
        form.resetFields();
        form.setFieldValue('is_active', true);
      }
    }
  }, [visible, shift, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const submitData: ShiftFormData = {
        name: values.name,
        code: values.code,
        start_time: values.start_time + ':00', // Convert HH:mm to HH:mm:ss
        end_time: values.end_time + ':00',
        laboratory_id: values.laboratory_id || undefined,
      };

      if (shift) {
        await shiftService.updateShift(shift.id, {
          ...submitData,
          is_active: values.is_active,
        });
        toast.success('班次更新成功');
      } else {
        await shiftService.createShift(submitData);
        toast.success('班次创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error(shift ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={shift ? '编辑班次' : '新增班次'}
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
          <FormItem name="name" label="班次名称">
            <Input placeholder="请输入班次名称" />
          </FormItem>
          <FormItem name="code" label="班次代码">
            <Input placeholder="请输入班次代码" disabled={!!shift} />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="start_time" label="开始时间">
            <Input type="time" className="w-full" />
          </FormItem>
          <FormItem name="end_time" label="结束时间" extra="支持跨午夜班次，如22:00-06:00">
            <Input type="time" className="w-full" />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="laboratory_id" label="适用实验室">
            <Select
              placeholder="全部实验室"
              allowClear
              options={laboratories.map((lab) => ({
                label: `${lab.name} (${lab.code})`,
                value: lab.id,
              }))}
            />
          </FormItem>
          {shift && (
            <FormItem name="is_active" label="状态" valuePropName="checked">
              <Switch />
            </FormItem>
          )}
        </div>
      </Form>
    </Modal>
  );
}
