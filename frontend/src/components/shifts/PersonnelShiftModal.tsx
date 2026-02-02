import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Select, DatePicker, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { shiftService } from '../../services/shiftService';
import type { Personnel, PersonnelShift, PersonnelShiftFormData, PersonnelShiftUpdateData } from '../../types';

interface PersonnelShiftModalProps {
  visible: boolean;
  shiftId: number;
  personnelShift: PersonnelShift | null; // null for create, object for edit
  availablePersonnel: Personnel[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface PersonnelShiftFormValues {
  personnel_id: number;
  effective_date?: dayjs.Dayjs;
  end_date?: dayjs.Dayjs;
}

export function PersonnelShiftModal({
  visible,
  shiftId,
  personnelShift,
  availablePersonnel,
  onSuccess,
  onCancel,
}: PersonnelShiftModalProps) {
  const [form] = useForm<PersonnelShiftFormValues>({
    initialValues: {
      personnel_id: undefined as unknown as number,
      effective_date: undefined,
      end_date: undefined,
    },
    rules: {
      personnel_id: [{ required: true, message: '请选择人员' }],
      effective_date: [{ required: true, message: '请选择生效日期' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const isEdit = !!personnelShift;

  useEffect(() => {
    if (visible) {
      if (personnelShift) {
        form.setFieldsValue({
          personnel_id: personnelShift.personnel_id,
          effective_date: personnelShift.effective_date
            ? dayjs(personnelShift.effective_date)
            : undefined,
          end_date: personnelShift.end_date
            ? dayjs(personnelShift.end_date)
            : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldValue('effective_date', dayjs());
      }
    }
  }, [visible, personnelShift, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit && personnelShift) {
        const updateData: PersonnelShiftUpdateData = {
          effective_date: values.effective_date ? (values.effective_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          end_date: values.end_date ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        };
        await shiftService.updatePersonnelShift(
          personnelShift.personnel_id, 
          personnelShift.shift_id, 
          updateData
        );
        toast.success('班次分配更新成功');
      } else {
        const effectiveDate = values.effective_date as dayjs.Dayjs;
        const createData: PersonnelShiftFormData = {
          shift_id: shiftId,
          effective_date: effectiveDate.format('YYYY-MM-DD'),
          end_date: values.end_date ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        };
        await shiftService.assignShiftToPersonnel(values.personnel_id, createData);
        toast.success('班次分配成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error(isEdit ? '更新失败' : '分配失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑班次分配' : '分配人员'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={500}
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form as unknown as FormInstance} layout="vertical">
        <FormItem name="personnel_id" label="人员">
          <Select
            placeholder="请选择人员"
            disabled={isEdit}
            showSearch
            options={availablePersonnel.map((p) => ({
              label: `${p.user?.full_name || p.employee_id} (${p.employee_id})`,
              value: p.id,
            }))}
          />
        </FormItem>

        <div className="grid grid-cols-2 gap-4">
          <FormItem name="effective_date" label="生效日期">
            <DatePicker className="w-full" placeholder="选择生效日期" />
          </FormItem>
          <FormItem name="end_date" label="结束日期" extra="留空表示持续有效">
            <DatePicker className="w-full" placeholder="选择结束日期" />
          </FormItem>
        </div>
      </Form>
    </Modal>
  );
}
