import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { Button, Tag, Modal, TextArea, Badge, Tooltip, Spin, useToast } from '../ui';
import { handoverService } from '../../services/handoverService';
import type { Handover, HandoverStatus, HandoverPriority } from '../../types';

interface HandoverPanelProps {
  mode?: 'incoming' | 'outgoing' | 'all';
  workOrderId?: number;
  onHandoverChange?: () => void;
}

const statusConfig: Record<HandoverStatus, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
  pending: { label: '待接收', color: 'warning' },
  accepted: { label: '已接收', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
};

const priorityConfig: Record<HandoverPriority, { label: string; color: 'default' | 'warning' | 'error' }> = {
  normal: { label: '普通', color: 'default' },
  urgent: { label: '紧急', color: 'warning' },
  critical: { label: '关键', color: 'error' },
};

export function HandoverPanel({ mode = 'incoming', workOrderId, onHandoverChange }: HandoverPanelProps) {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [acceptNotes, setAcceptNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const errorShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const toast = useToast();

  const fetchHandovers = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'incoming') {
        const data = await handoverService.getPendingHandovers();
        if (isMountedRef.current) {
          setHandovers(data);
          errorShownRef.current = false;
        }
      } else {
        const params: Record<string, unknown> = {};
        if (mode === 'outgoing') params.my_outgoing = true;
        if (workOrderId) params.work_order_id = workOrderId;
        const response = await handoverService.getHandovers(params);
        if (isMountedRef.current) {
          setHandovers(response.items);
          errorShownRef.current = false;
        }
      }
    } catch (error) {
      console.error('Failed to fetch handovers:', error);
      if (isMountedRef.current && !errorShownRef.current) {
        errorShownRef.current = true;
        toast.error('获取交接列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [mode, workOrderId, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHandovers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchHandovers]);

  const handleAccept = (handover: Handover) => {
    setSelectedHandover(handover);
    setAcceptNotes('');
    setAcceptModalVisible(true);
  };

  const handleReject = (handover: Handover) => {
    setSelectedHandover(handover);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleCancel = async (handover: Handover) => {
    try {
      await handoverService.cancelHandover(handover.id);
      toast.success('交接已取消');
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      toast.error('取消交接失败');
    }
  };

  const confirmAccept = async () => {
    if (!selectedHandover) return;
    setActionLoading(true);
    try {
      await handoverService.acceptHandover(selectedHandover.id, acceptNotes || undefined);
      toast.success('交接已接收');
      setAcceptModalVisible(false);
      setSelectedHandover(null);
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      toast.error('接收交接失败');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedHandover || !rejectReason.trim()) {
      toast.warning('请填写拒绝原因');
      return;
    }
    setActionLoading(true);
    try {
      await handoverService.rejectHandover(selectedHandover.id, rejectReason);
      toast.success('交接已拒绝');
      setRejectModalVisible(false);
      setSelectedHandover(null);
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      toast.error('拒绝交接失败');
    } finally {
      setActionLoading(false);
    }
  };

  const title = mode === 'incoming' ? '待接收交接' : mode === 'outgoing' ? '我的交接' : '所有交接';
  const pendingCount = handovers.filter((h) => h.status === 'pending').length;

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-neutral-800">{title}</h3>
            {pendingCount > 0 && <Badge count={pendingCount} />}
          </div>
          <Button size="small" onClick={fetchHandovers}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : handovers.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              暂无交接记录
            </div>
          ) : (
            <div className="space-y-3">
              {handovers.map((handover) => {
                const statusCfg = statusConfig[handover.status];
                const priorityCfg = priorityConfig[handover.priority];
                const isPending = handover.status === 'pending';

                return (
                  <div key={handover.id} className="border border-neutral-200 rounded-md p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-medium text-neutral-800">
                            {handover.task?.title || `任务 #${handover.task_id}`}
                          </span>
                          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                          {handover.priority !== 'normal' && (
                            <Tag color={priorityCfg.color}>
                              <ExclamationCircleIcon className="w-3 h-3 inline mr-1" />
                              {priorityCfg.label}
                            </Tag>
                          )}
                        </div>
                        
                        <div className="text-sm text-neutral-500 space-x-3">
                          <span>工单: {handover.work_order?.order_number || '-'}</span>
                          <span>来自: {handover.from_technician?.name || '-'}</span>
                          {handover.to_technician && (
                            <span>分配给: {handover.to_technician.name}</span>
                          )}
                        </div>

                        {handover.progress_summary && (
                          <p className="mt-2 text-sm text-neutral-600 line-clamp-2">
                            <span className="font-medium">已完成: </span>
                            {handover.progress_summary}
                          </p>
                        )}

                        {handover.pending_items && (
                          <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                            <span className="font-medium">待完成: </span>
                            {handover.pending_items}
                          </p>
                        )}

                        {handover.special_instructions && (
                          <p className="mt-1 text-sm text-warning-600 line-clamp-2">
                            <ExclamationCircleIcon className="w-4 h-4 inline mr-1" />
                            {handover.special_instructions}
                          </p>
                        )}

                        {handover.notes.length > 0 && (
                          <Tooltip title={`${handover.notes.length} 条备注`}>
                            <span>
                              <Tag className="mt-2">
                                <ChatBubbleLeftIcon className="w-3 h-3 inline mr-1" />
                                {handover.notes.length} 备注
                              </Tag>
                            </span>
                          </Tooltip>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2 ml-4">
                          {mode === 'incoming' && (
                            <>
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleAccept(handover)}
                              >
                                <CheckIcon className="w-4 h-4 mr-1" />
                                接收
                              </Button>
                              <Button
                                size="small"
                                danger
                                onClick={() => handleReject(handover)}
                              >
                                <XMarkIcon className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                            </>
                          )}
                          {mode === 'outgoing' && (
                            <Button size="small" onClick={() => handleCancel(handover)}>
                              取消
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accept Modal */}
      <Modal
        title="接收交接"
        open={acceptModalVisible}
        onOk={confirmAccept}
        onCancel={() => setAcceptModalVisible(false)}
        confirmLoading={actionLoading}
        okText="确认接收"
        cancelText="取消"
      >
        <p className="mb-3">确认接收此任务的交接？</p>
        <TextArea
          rows={3}
          placeholder="接收备注（可选）"
          value={acceptNotes}
          onChange={(e) => setAcceptNotes(e.target.value)}
        />
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="拒绝交接"
        open={rejectModalVisible}
        onOk={confirmReject}
        onCancel={() => setRejectModalVisible(false)}
        confirmLoading={actionLoading}
        okText="确认拒绝"
        cancelText="取消"
      >
        <p className="mb-3">请填写拒绝原因：</p>
        <TextArea
          rows={3}
          placeholder="拒绝原因（必填）"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </>
  );
}
