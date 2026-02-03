import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, App } from 'antd';
import { transferService } from '../../services/transferService';
import type { BorrowRequest } from '../../types';

const { TextArea } = Input;

interface ApprovalModalProps {
  visible: boolean;
  borrowRequest: BorrowRequest | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ApprovalFormValues {
  decision: string;
  rejection_reason?: string;
}

const decisionOptions = [
  { label: '批准', value: 'approve' },
  { label: '拒绝', value: 'reject' },
];

export function ApprovalModal({
  visible,
  borrowRequest,
  onSuccess,
  onCancel,
}: ApprovalModalProps) {
  const [form] = Form.useForm<ApprovalFormValues>();
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState('approve');
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldValue('decision', 'approve');
      setDecision('approve');
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    if (!borrowRequest) return;

    try {
      const values = await form.validateFields();
      
      // Validate rejection reason if rejecting
      if (values.decision === 'reject' && !values.rejection_reason) {
        message.error('请输入拒绝原因');
        return;
      }

      setLoading(true);

      const approved = values.decision === 'approve';
      await transferService.approveBorrowRequest(
        borrowRequest.id,
        approved,
        values.rejection_reason
      );

      message.success(approved ? '借调申请已批准' : '借调申请已拒绝');
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionChange = (value: string) => {
    setDecision(value);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="审批借调申请"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={500}
      okText="确认"
      cancelText="取消"
      destroyOnHidden
    >
      {borrowRequest && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 6, fontSize: 14 }}>
          <p style={{ marginBottom: 4 }}>
            <strong>人员:</strong>{' '}
            {borrowRequest.personnel?.user?.full_name || borrowRequest.personnel?.employee_id}
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>调出实验室:</strong> {borrowRequest.from_laboratory?.name}
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>调入实验室:</strong> {borrowRequest.to_laboratory?.name}
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>借调时间:</strong> {borrowRequest.start_date} 至 {borrowRequest.end_date}
          </p>
          {borrowRequest.reason && (
            <p style={{ marginBottom: 0 }}>
              <strong>借调原因:</strong> {borrowRequest.reason}
            </p>
          )}
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item name="decision" label="审批决定" rules={[{ required: true, message: '请选择审批决定' }]}>
          <Select
            options={decisionOptions}
            onChange={handleDecisionChange}
          />
        </Form.Item>

        {decision === 'reject' && (
          <Form.Item name="rejection_reason" label="拒绝原因" rules={[{ required: true, message: '请输入拒绝原因' }]}>
            <TextArea rows={3} placeholder="请输入拒绝原因" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
