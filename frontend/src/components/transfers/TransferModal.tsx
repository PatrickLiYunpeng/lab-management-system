import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Select, Input, DatePicker, Row, Col, App } from 'antd';
import { transferService } from '../../services/transferService';
import type { Personnel, Laboratory, BorrowRequestFormData } from '../../types';

const { TextArea } = Input;

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
  const [form] = Form.useForm<TransferFormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | undefined>();
  const { message } = App.useApp();

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
      message.success('借调申请创建成功');
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error('创建借调申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonnelChange = (value: number) => {
    setSelectedPersonnelId(value);
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
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="personnel_id" label="借调人员" rules={[{ required: true, message: '请选择借调人员' }]}>
          <Select
            placeholder="请选择人员"
            showSearch
            optionFilterProp="label"
            onChange={handlePersonnelChange}
            options={personnelList.map((p) => ({
              label: `${p.user?.full_name || p.employee_id} (${p.employee_id})`,
              value: p.id,
            }))}
          />
        </Form.Item>

        {selectedPersonnel && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
              当前所属实验室
            </label>
            <Input
              disabled
              value={selectedPersonnel.primary_laboratory?.name || '未分配'}
            />
          </div>
        )}

        <Form.Item name="to_laboratory_id" label="目标实验室" rules={[{ required: true, message: '请选择目标实验室' }]}>
          <Select
            placeholder="请选择目标实验室"
            disabled={!selectedPersonnelId}
            optionFilterProp="label"
            options={targetLaboratories.map((lab) => ({
              label: `${lab.name} (${lab.code})`,
              value: lab.id,
            }))}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="start_date" label="开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择开始日期"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label="结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择结束日期"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="reason" label="借调原因">
          <TextArea rows={3} placeholder="请输入借调原因" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
