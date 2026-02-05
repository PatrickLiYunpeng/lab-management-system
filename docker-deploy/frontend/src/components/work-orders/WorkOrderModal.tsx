import { useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Row, Col, Button, App, Alert } from 'antd';
import { workOrderService } from '../../services/workOrderService';
import { productService } from '../../services/productService';
import { clientSlaService } from '../../services/clientSlaService';
import type { WorkOrder, WorkOrderFormData, WorkOrderUpdateData, Site, Laboratory, Client, Product, TestingSourceCategory, ClientSLA } from '../../types';

const { TextArea } = Input;

interface WorkOrderModalProps {
  visible: boolean;
  workOrder: WorkOrder | null;
  sites: Site[];
  laboratories: Laboratory[];
  clients: Client[];
  onSuccess: () => void;
  onCancel: () => void;
}

const workOrderTypeOptions = [
  { label: '失效分析', value: 'failure_analysis' },
  { label: '可靠性测试', value: 'reliability_test' },
];

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待处理', value: 'pending' },
  { label: '已分配', value: 'assigned' },
  { label: '进行中', value: 'in_progress' },
  { label: '暂停', value: 'on_hold' },
  { label: '待审核', value: 'review' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

const priorityOptions = [
  { label: '最高 (1)', value: 1 },
  { label: '高 (2)', value: 2 },
  { label: '中 (3)', value: 3 },
  { label: '低 (4)', value: 4 },
  { label: '最低 (5)', value: 5 },
];

interface WorkOrderFormValues {
  title?: string;
  description?: string;
  work_order_type?: 'failure_analysis' | 'reliability_test';
  status?: string;
  priority?: number;
  testing_source?: string;
  site_id?: number;
  laboratory_id?: number;
  client_id?: number;
  product_id?: number;
  material_ids?: number[];
  sla_deadline?: Dayjs | null;
}

// 可选材料类型
interface AvailableMaterial {
  id: number;
  material_code: string;
  name: string;
  status: string;
  material_type: string;
  storage_location: string;
  quantity: number;
  unit: string;
  client_id: number | null;
  product_id: number | null;
}

export function WorkOrderModal({
  visible,
  workOrder,
  sites,
  laboratories,
  clients,
  onSuccess,
  onCancel,
}: WorkOrderModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<WorkOrderFormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>();
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [sourceCategories, setSourceCategories] = useState<TestingSourceCategory[]>([]);
  const [sourceCategoriesLoading, setSourceCategoriesLoading] = useState(false);
  const [selectedTestingSource, setSelectedTestingSource] = useState<string | undefined>();
  const [matchedSla, setMatchedSla] = useState<ClientSLA | null>(null);
  const [slaLoading, setSlaLoading] = useState(false);

  // Filter laboratories by selected site
  const filteredLaboratories = selectedSiteId
    ? laboratories.filter((lab) => lab.site_id === selectedSiteId)
    : laboratories;

  // Load source categories on mount
  useEffect(() => {
    setSourceCategoriesLoading(true);
    clientSlaService.getAllSourceCategories()
      .then((categories) => {
        setSourceCategories(categories || []);
      })
      .catch(() => {
        setSourceCategories([]);
        message.error('加载来源类别失败');
      })
      .finally(() => {
        setSourceCategoriesLoading(false);
      });
  }, []);

  // Query ClientSLA when client and testing source are selected
  useEffect(() => {
    if (selectedClientId && selectedTestingSource && sourceCategories.length > 0) {
      // Find the source category ID from the code
      const sourceCategory = sourceCategories.find(cat => cat.code === selectedTestingSource);
      if (sourceCategory) {
        setSlaLoading(true);
        clientSlaService.getClientSLAs({
          client_id: selectedClientId,
          source_category_id: sourceCategory.id,
          is_active: true,
          page_size: 1
        })
          .then((res) => {
            if (res.items && res.items.length > 0) {
              setMatchedSla(res.items[0]);
            } else {
              setMatchedSla(null);
            }
          })
          .catch(() => {
            setMatchedSla(null);
            message.error('查询SLA配置失败');
          })
          .finally(() => {
            setSlaLoading(false);
          });
      } else {
        setMatchedSla(null);
      }
    } else {
      setMatchedSla(null);
    }
  }, [selectedClientId, selectedTestingSource, sourceCategories]);

  // Load products when client changes
  useEffect(() => {
    if (selectedClientId) {
      setProductsLoading(true);
      productService.getProducts({ client_id: selectedClientId, is_active: true, page_size: 100 })
        .then((res) => {
          setProducts(res.items || []);
        })
        .catch(() => {
          setProducts([]);
          message.error('加载产品列表失败');
        })
        .finally(() => {
          setProductsLoading(false);
        });
    } else {
      setProducts([]);
    }
  }, [selectedClientId]);

  // Load available materials when modal opens and filters change
  // 样品必须匹配：同站点、同客户、同产品
  useEffect(() => {
    if (visible && selectedSiteId && selectedClientId && selectedProductId) {
      setMaterialsLoading(true);
      workOrderService.getAvailableMaterials({ 
        page_size: 100, 
        site_id: selectedSiteId,
        client_id: selectedClientId,
        product_id: selectedProductId
      })
        .then((res) => {
          setAvailableMaterials(res.items || []);
        })
        .catch(() => {
          setAvailableMaterials([]);
          message.error('加载可用样品失败');
        })
        .finally(() => {
          setMaterialsLoading(false);
        });
    } else if (visible) {
      // 未选择完整过滤条件时清空样品列表
      setAvailableMaterials([]);
    }
  }, [visible, selectedSiteId, selectedClientId, selectedProductId]);

  useEffect(() => {
    if (visible) {
      if (workOrder) {
        setSelectedSiteId(workOrder.site_id);
        setSelectedClientId(workOrder.client_id ?? undefined);
        setSelectedProductId(workOrder.product_id ?? undefined);
        setSelectedTestingSource(workOrder.testing_source ?? undefined);
        form.setFieldsValue({
          ...workOrder,
          material_ids: workOrder.material_ids || [],
          sla_deadline: workOrder.sla_deadline ? dayjs(workOrder.sla_deadline) : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          work_order_type: 'failure_analysis',
          priority: 3,
          material_ids: [],
        });
        setSelectedSiteId(undefined);
        setSelectedClientId(undefined);
        setSelectedProductId(undefined);
        setSelectedTestingSource(undefined);
        setMatchedSla(null);
        setProducts([]);
      }
    }
  }, [visible, workOrder, form]);

  const handleSiteChange = (value: number) => {
    setSelectedSiteId(value);
    const currentLabId = form.getFieldValue('laboratory_id');
    if (currentLabId && value) {
      const lab = laboratories.find((l) => l.id === currentLabId);
      if (lab && lab.site_id !== value) {
        form.setFieldValue('laboratory_id', undefined);
      }
    }
  };

  const handleClientChange = (value: number | undefined) => {
    setSelectedClientId(value);
    setSelectedProductId(undefined);
    // Clear product and material selection when client changes
    form.setFieldValue('product_id', undefined);
    form.setFieldValue('material_ids', []);
  };

  const handleProductChange = (value: number | undefined) => {
    setSelectedProductId(value);
    // Clear material selection when product changes
    form.setFieldValue('material_ids', []);
  };

  const handleTestingSourceChange = (value: string | undefined) => {
    setSelectedTestingSource(value);
  };

  // Get SLA priority color and label based on priority_weight
  const getSlaAlertType = (priorityWeight: number): 'error' | 'warning' | 'info' | 'success' => {
    if (priorityWeight >= 20) return 'error';      // High priority - red
    if (priorityWeight >= 10) return 'warning';    // Medium priority - orange
    if (priorityWeight >= 5) return 'info';        // Normal priority - blue
    return 'success';                               // Low priority - green
  };

  const getSlaMessage = (sla: ClientSLA): string => {
    const priorityLabel = sla.priority_weight >= 20 ? '紧急' 
      : sla.priority_weight >= 10 ? '优先' 
      : sla.priority_weight >= 5 ? '标准' 
      : '常规';
    
    let message = `SLA建议: ${priorityLabel}处理`;
    message += ` | 承诺时间: ${sla.commitment_hours}小时`;
    if (sla.max_hours) {
      message += ` | 最长时间: ${sla.max_hours}小时`;
    }
    if (sla.description) {
      message += ` | ${sla.description}`;
    }
    return message;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const slaDeadline = values.sla_deadline;
      const formData = {
        ...values,
        sla_deadline: slaDeadline && dayjs.isDayjs(slaDeadline) ? slaDeadline.toISOString() : undefined,
      };

      if (workOrder) {
        await workOrderService.updateWorkOrder(workOrder.id, formData as WorkOrderUpdateData);
        message.success('更新成功');
      } else {
        await workOrderService.createWorkOrder(formData as WorkOrderFormData);
        message.success('创建成功');
      }

      onSuccess();
    } catch {
      message.error(workOrder ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={workOrder ? '编辑工单' : '新增工单'}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>确定</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#999' }}>基本信息</span>
        </div>
        
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="title"
              label="工单标题"
              rules={[{ required: true, message: '请输入工单标题' }]}
            >
              <Input placeholder="请输入工单标题" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="work_order_type"
              label="工单类型"
              rules={[{ required: true, message: '请选择工单类型' }]}
            >
              <Select 
                placeholder="请选择工单类型" 
                options={workOrderTypeOptions} 
                disabled={!!workOrder}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="请输入工单描述" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="site_id"
              label="所属站点"
              rules={[{ required: true, message: '请选择所属站点' }]}
            >
              <Select
                placeholder="请选择所属站点"
                onChange={handleSiteChange}
                disabled={!!workOrder}
                options={sites.map((site) => ({
                  label: `${site.name} (${site.code})`,
                  value: site.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="laboratory_id"
              label="所属实验室"
              rules={[{ required: true, message: '请选择所属实验室' }]}
            >
              <Select
                placeholder="请先选择所属站点"
                disabled={!selectedSiteId || !!workOrder}
                options={filteredLaboratories.map((lab) => ({
                  label: `${lab.name} (${lab.code})`,
                  value: lab.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>客户与优先级</span>
        </div>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="client_id" label="客户">
              <Select
                placeholder="请选择客户"
                allowClear
                onChange={handleClientChange}
                options={clients.map((client) => ({
                  label: `${client.name} (${client.code})`,
                  value: client.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="product_id" label="产品名称">
              <Select
                placeholder={selectedClientId ? "请选择产品" : "请先选择客户"}
                allowClear
                disabled={!selectedClientId}
                loading={productsLoading}
                onChange={handleProductChange}
                options={products.map((product) => ({
                  label: `${product.name} (${product.code})`,
                  value: product.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="testing_source" label="任务来源">
              <Select 
                placeholder="请选择任务来源" 
                loading={sourceCategoriesLoading}
                onChange={handleTestingSourceChange}
                options={sourceCategories.map((cat) => ({
                  label: cat.name,
                  value: cat.code,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="priority_level" label="优先级">
              <Select placeholder="请选择优先级" options={priorityOptions} />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>样品选择</span>
        </div>
        
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              name="material_ids" 
              label="选择样品"
              tooltip="请先选择客户和产品，样品列表会自动过滤为同客户、同产品的样品"
            >
              <Select
                mode="multiple"
                placeholder={
                  !selectedClientId 
                    ? "请先选择客户" 
                    : !selectedProductId 
                      ? "请先选择产品" 
                      : "请选择样品（可多选）"
                }
                allowClear
                disabled={!selectedClientId || !selectedProductId}
                loading={materialsLoading}
                optionFilterProp="label"
                showSearch
                options={availableMaterials.map((m) => ({
                  label: `${m.name} (${m.material_code}) - ${m.storage_location || '未知位置'}`,
                  value: m.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>
          <span style={{ fontSize: 14, color: '#999' }}>时间要求</span>
        </div>

        {/* SLA Suggestion Alert */}
        {slaLoading && (
          <Alert 
            message="正在查询SLA配置..." 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
        )}
        {!slaLoading && matchedSla && (
          <Alert 
            message={getSlaMessage(matchedSla)}
            type={getSlaAlertType(matchedSla.priority_weight)}
            showIcon 
            style={{ marginBottom: 16 }} 
          />
        )}
        {!slaLoading && selectedClientId && selectedTestingSource && !matchedSla && (
          <Alert 
            message="未找到匹配的SLA配置，请根据实际情况设置时间要求" 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
        )}
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="sla_deadline" label="截止日">
              <DatePicker 
                placeholder="截止日"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="standard_cycle_hours" label="预计周期(小时)">
              <InputNumber 
                min={0.1} 
                step={0.5} 
                placeholder="预计周期"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          {workOrder && (
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" options={statusOptions} />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
