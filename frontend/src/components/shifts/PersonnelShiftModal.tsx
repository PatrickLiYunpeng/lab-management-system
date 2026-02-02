import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Select, DatePicker, Row, Col, App } from 'antd';
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
  const [form] = Form.useForm<PersonnelShiftFormValues>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
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
        message.success('班次分配更新成功');
      } else {
        const effectiveDate = values.effective_date as dayjs.Dayjs;
        const createData: PersonnelShiftFormData = {
          shift_id: shiftId,
          effective_date: effectiveDate.format('YYYY-MM-DD'),
          end_date: values.end_date ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        };
        await shiftService.assignShiftToPersonnel(values.personnel_id, createData);
        message.success('班次分配成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(isEdit ? '更新失败' : '分配失败');
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
      <Form form={form} layout="vertical">
        <Form.Item name="personnel_id" label="人员" rules={[{ required: true, message: '请选择人员' }]}>
          <Select
            placeholder="请选择人员"
            disabled={isEdit}
            showSearch
            optionFilterProp="label"
            options={availablePersonnel.map((p) => ({
              label: `${p.user?.full_name || p.employee_id} (${p.employee_id})`,
              value: p.id,
            }))}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="effective_date" label="生效日期" rules={[{ required: true, message: '请选择生效日期' }]}>
              <DatePicker style={{ width: '100%' }} placeholder="选择生效日期" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label="结束日期" extra="留空表示持续有效">
              <DatePicker style={{ width: '100%' }} placeholder="选择结束日期" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
