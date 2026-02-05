import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input, Select, InputNumber, DatePicker, Form, Row, Col, App, Descriptions } from 'antd';
import { materialService } from '../../services/materialService';
import type { Material, NonSapSource, ReplenishmentFormData } from '../../types';

const { TextArea } = Input;

interface ReplenishmentModalProps {
  visible: boolean;
  material: Material | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const nonSapSourceOptions = [
  { label: '内部转移', value: 'internal_transfer' },
  { label: '紧急采购', value: 'emergency_purchase' },
  { label: '赠品/样品', value: 'gift_sample' },
  { label: '库存盘点调整', value: 'inventory_adjustment' },
  { label: '其他', value: 'other' },
];

interface ReplenishmentFormValues {
  received_date: dayjs.Dayjs;
  quantity_added: number;
  sap_order_no?: string;
  non_sap_source?: NonSapSource;
  notes?: string;
}

export function ReplenishmentModal({
  visible,
  material,
  onSuccess,
  onCancel,
}: ReplenishmentModalProps) {
  const [form] = Form.useForm<ReplenishmentFormValues>();
  const [loading, setLoading] = useState(false);
  const [sapOrderNo, setSapOrderNo] = useState<string>('');
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        received_date: dayjs(),
        quantity_added: 1,
      });
      setSapOrderNo('');
    }
  }, [visible, form]);

  const handleSapOrderNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSapOrderNo(value);
    form.setFieldValue('sap_order_no', value);
    // Re-validate non_sap_source when sap_order_no changes
    form.validateFields(['non_sap_source']);
  };

  const handleSubmit = async () => {
    if (!material) return;

    try {
      const values = await form.validateFields();
      
      // Custom validation: at least one source must be provided
      if (!values.sap_order_no && !values.non_sap_source) {
        message.error('SAP订单号和非SAP来源至少填写一个');
        return;
      }

      setLoading(true);

      const formData: ReplenishmentFormData = {
        received_date: values.received_date.toISOString(),
        quantity_added: values.quantity_added,
        sap_order_no: values.sap_order_no || undefined,
        non_sap_source: values.non_sap_source || undefined,
        notes: values.notes || undefined,
      };

      await materialService.replenishMaterial(material.id, formData);
      message.success(`补充成功，库存已更新为 ${material.quantity + values.quantity_added} ${material.unit}`);
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message || '补充失败');
      } else {
        message.error('补充失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="补充物料"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="确定补充"
      cancelText="取消"
      destroyOnHidden
    >
      {material && (
        <>
          <Descriptions
            bordered
            size="small"
            column={2}
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="物料编码">{material.material_code}</Descriptions.Item>
            <Descriptions.Item label="名称">{material.name}</Descriptions.Item>
            <Descriptions.Item label="当前库存" span={2}>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1677ff' }}>
                {material.quantity} {material.unit}
              </span>
            </Descriptions.Item>
          </Descriptions>

          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="received_date"
                  label="收货日期"
                  rules={[{ required: true, message: '请选择收货日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} placeholder="请选择收货日期" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="quantity_added"
                  label={`增加数量 (${material.unit})`}
                  rules={[
                    { required: true, message: '请输入增加数量' },
                    { type: 'number', min: 1, message: '数量必须大于0' },
                  ]}
                >
                  <InputNumber
                    min={1}
                    placeholder="请输入增加数量"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: '#999' }}>来源信息（至少填写一项）</span>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="sap_order_no"
                  label="SAP订单号"
                >
                  <Input
                    placeholder="请输入SAP订单号"
                    maxLength={100}
                    onChange={handleSapOrderNoChange}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="non_sap_source"
                  label="非SAP来源"
                  rules={[
                    {
                      validator: (_, value) => {
                        const currentSapOrderNo = form.getFieldValue('sap_order_no');
                        if (!currentSapOrderNo && !value) {
                          return Promise.reject(new Error('当SAP订单号为空时，必须选择非SAP来源'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Select
                    placeholder={sapOrderNo ? '选填' : '请选择来源'}
                    allowClear
                    options={nonSapSourceOptions}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="notes" label="备注">
              <TextArea rows={3} placeholder="请输入备注信息（可选）" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
