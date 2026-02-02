import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Button, Tag, Modal, Input, Badge, Tooltip, Spin, App } from 'antd';
import { handoverService } from '../../services/handoverService';
import type { Handover, HandoverStatus, HandoverPriority } from '../../types';

const { TextArea } = Input;

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
  const { message } = App.useApp();

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
        message.error('获取交接列表失败');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [mode, workOrderId, message]);

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
      message.success('交接已取消');
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      message.error('取消交接失败');
    }
  };

  const confirmAccept = async () => {
    if (!selectedHandover) return;
    setActionLoading(true);
    try {
      await handoverService.acceptHandover(selectedHandover.id, acceptNotes || undefined);
      message.success('交接已接收');
      setAcceptModalVisible(false);
      setSelectedHandover(null);
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      message.error('接收交接失败');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedHandover || !rejectReason.trim()) {
      message.warning('请填写拒绝原因');
      return;
    }
    setActionLoading(true);
    try {
      await handoverService.rejectHandover(selectedHandover.id, rejectReason);
      message.success('交接已拒绝');
      setRejectModalVisible(false);
      setSelectedHandover(null);
      fetchHandovers();
      onHandoverChange?.();
    } catch {
      message.error('拒绝交接失败');
    } finally {
      setActionLoading(false);
    }
  };

  const title = mode === 'incoming' ? '待接收交接' : mode === 'outgoing' ? '我的交接' : '所有交接';
  const pendingCount = handovers.filter((h) => h.status === 'pending').length;

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: '#1f2937', margin: 0 }}>{title}</h3>
            {pendingCount > 0 && <Badge count={pendingCount} />}
          </div>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchHandovers}>
            刷新
          </Button>
        </div>
        
        <div style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Spin />
            </div>
          ) : handovers.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#999' }}>
              暂无交接记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {handovers.map((handover) => {
                const statusCfg = statusConfig[handover.status];
                const priorityCfg = priorityConfig[handover.priority];
                const isPending = handover.status === 'pending';

                return (
                  <div key={handover.id} style={{ border: '1px solid #e5e5e5', borderRadius: 6, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: '#1f2937' }}>
                            {handover.task?.title || `任务 #${handover.task_id}`}
                          </span>
                          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                          {handover.priority !== 'normal' && (
                            <Tag color={priorityCfg.color}>
                              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                              {priorityCfg.label}
                            </Tag>
                          )}
                        </div>
                        
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          <span style={{ marginRight: 12 }}>工单: {handover.work_order?.order_number || '-'}</span>
                          <span style={{ marginRight: 12 }}>来自: {handover.from_technician?.name || '-'}</span>
                          {handover.to_technician && (
                            <span>分配给: {handover.to_technician.name}</span>
                          )}
                        </div>

                        {handover.progress_summary && (
                          <p style={{ marginTop: 8, fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            <span style={{ fontWeight: 500 }}>已完成: </span>
                            {handover.progress_summary}
                          </p>
                        )}

                        {handover.pending_items && (
                          <p style={{ marginTop: 4, fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            <span style={{ fontWeight: 500 }}>待完成: </span>
                            {handover.pending_items}
                          </p>
                        )}

                        {handover.special_instructions && (
                          <p style={{ marginTop: 4, fontSize: 14, color: '#d97706', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                            {handover.special_instructions}
                          </p>
                        )}

                        {handover.notes.length > 0 && (
                          <Tooltip title={`${handover.notes.length} 条备注`}>
                            <Tag style={{ marginTop: 8 }}>
                              <MessageOutlined style={{ marginRight: 4 }} />
                              {handover.notes.length} 备注
                            </Tag>
                          </Tooltip>
                        )}
                      </div>

                      {isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                          {mode === 'incoming' && (
                            <>
                              <Button
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => handleAccept(handover)}
                              >
                                接收
                              </Button>
                              <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => handleReject(handover)}
                              >
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
        <p style={{ marginBottom: 12 }}>确认接收此任务的交接？</p>
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
        <p style={{ marginBottom: 12 }}>请填写拒绝原因：</p>
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
