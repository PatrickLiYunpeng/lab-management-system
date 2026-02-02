import { useState, useEffect } from 'react';
import { Modal, TextArea, Select, useToast, useForm, Form, FormItem, type FormInstance } from '../ui';
import { transferService } from '../../services/transferService';
import type { BorrowRequest } from '../../types';

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
  const [form] = useForm<ApprovalFormValues>({
    initialValues: {
      decision: 'approve',
      rejection_reason: '',
    },
    rules: {
      decision: [{ required: true, message: '请选择审批决定' }],
    },
  });
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState('approve');
  const toast = useToast();

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
        toast.error('请输入拒绝原因');
        return;
      }

      setLoading(true);

      const approved = values.decision === 'approve';
      await transferService.approveBorrowRequest(
        borrowRequest.id,
        approved,
        values.rejection_reason
      );

      toast.success(approved ? '借调申请已批准' : '借调申请已拒绝');
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? String(value[0]) : String(value);
    setDecision(v);
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
      destroyOnClose
    >
      {borrowRequest && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-md text-sm">
          <p className="mb-1">
            <strong>人员:</strong>{' '}
            {borrowRequest.personnel?.user?.full_name || borrowRequest.personnel?.employee_id}
          </p>
          <p className="mb-1">
            <strong>调出实验室:</strong> {borrowRequest.from_laboratory?.name}
          </p>
          <p className="mb-1">
            <strong>调入实验室:</strong> {borrowRequest.to_laboratory?.name}
          </p>
          <p className="mb-1">
            <strong>借调时间:</strong> {borrowRequest.start_date} 至 {borrowRequest.end_date}
          </p>
          {borrowRequest.reason && (
            <p>
              <strong>借调原因:</strong> {borrowRequest.reason}
            </p>
          )}
        </div>
      )}

      <Form form={form as unknown as FormInstance} layout="vertical">
        <FormItem name="decision" label="审批决定">
          <Select
            options={decisionOptions}
            onChange={handleDecisionChange}
          />
        </FormItem>

        {decision === 'reject' && (
          <FormItem name="rejection_reason" label="拒绝原因" required>
            <TextArea rows={3} placeholder="请输入拒绝原因" />
          </FormItem>
        )}
      </Form>
    </Modal>
  );
}
