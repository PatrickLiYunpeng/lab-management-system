import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, Switch, Row, Col, App } from 'antd';
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
  const [form] = Form.useForm<ShiftFormValues>();
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const { message } = App.useApp();

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
        message.success('班次更新成功');
      } else {
        await shiftService.createShift(submitData);
        message.success('班次创建成功');
      }

      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error(shift ? '更新失败' : '创建失败');
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
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="班次名称" rules={[{ required: true, message: '请输入班次名称' }]}>
              <Input placeholder="请输入班次名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="班次代码" rules={[{ required: true, message: '请输入班次代码' }]}>
              <Input placeholder="请输入班次代码" disabled={!!shift} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="start_time" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
              <Input type="time" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_time" label="结束时间" extra="支持跨午夜班次，如22:00-06:00" rules={[{ required: true, message: '请选择结束时间' }]}>
              <Input type="time" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="laboratory_id" label="适用实验室">
              <Select
                placeholder="全部实验室"
                allowClear
                optionFilterProp="label"
                options={laboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </Form.Item>
          </Col>
          {shift && (
            <Col span={12}>
              <Form.Item name="is_active" label="状态" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
