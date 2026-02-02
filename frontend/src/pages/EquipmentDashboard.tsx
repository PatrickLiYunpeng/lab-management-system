import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ToolOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  ReloadOutlined,
  CalendarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { Card, Button, Select, Spin, Progress, Alert, Tooltip, DatePicker, Space, Row, Col, Segmented, Typography, Tabs, Empty } from 'antd';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type { EquipmentDashboardResponse, EquipmentCategoryStats, GanttDataResponse, GanttEquipment } from '../services/dashboardService';
import type { Site, Laboratory } from '../types';

const { Text, Title } = Typography;

type Language = 'zh' | 'en';

const translations = {
  zh: {
    title: '设备仪表板',
    totalEquipment: '设备总数',
    availableEquipment: '可用设备',
    inUseEquipment: '使用中',
    maintenanceEquipment: '维护中',
    byCategory: '按类别分布',
    byStatus: '按状态分布',
    utilizationByCategory: '各类别利用率',
    allSites: '全部站点',
    allLaboratories: '全部实验室',
    refresh: '刷新',
    lastUpdated: '最后更新',
    loading: '加载中...',
    available: '可用',
    in_use: '使用中',
    maintenance: '维护中',
    out_of_service: '停用',
    reserved: '已预约',
    autonomous: '自主运行',
    operator_dependent: '操作员依赖',
    equipmentCount: '设备数量',
    utilizationRate: '利用率',
    ganttChart: '设备调度甘特图',
    dateRange: '日期范围',
    noSchedules: '该类别暂无调度数据',
    noEquipment: '该类别暂无设备',
    thermal: '热学设备',
    mechanical: '机械设备',
    electrical: '电学设备',
    optical: '光学设备',
    analytical: '分析设备',
    environmental: '环境设备',
    measurement: '测量设备',
    other: '其他设备',
    scheduled: '已安排',
    operator: '操作员',
    maxRangeWarning: '日期范围最大7天',
    categoryDetails: '各类别详情',
    units: '台',
  },
  en: {
    title: 'Equipment Dashboard',
    totalEquipment: 'Total Equipment',
    availableEquipment: 'Available',
    inUseEquipment: 'In Use',
    maintenanceEquipment: 'Maintenance',
    byCategory: 'Distribution by Category',
    byStatus: 'Distribution by Status',
    utilizationByCategory: 'Utilization by Category',
    allSites: 'All Sites',
    allLaboratories: 'All Laboratories',
    refresh: 'Refresh',
    lastUpdated: 'Last updated',
    loading: 'Loading...',
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service',
    reserved: 'Reserved',
    autonomous: 'Autonomous',
    operator_dependent: 'Operator Dependent',
    equipmentCount: 'Equipment Count',
    utilizationRate: 'Utilization Rate',
    ganttChart: 'Equipment Scheduling Gantt Chart',
    dateRange: 'Date Range',
    noSchedules: 'No schedules for this category',
    noEquipment: 'No equipment in this category',
    thermal: 'Thermal',
    mechanical: 'Mechanical',
    electrical: 'Electrical',
    optical: 'Optical',
    analytical: 'Analytical',
    environmental: 'Environmental',
    measurement: 'Measurement',
    other: 'Other',
    scheduled: 'Scheduled',
    operator: 'Operator',
    maxRangeWarning: 'Maximum range is 7 days',
    categoryDetails: 'Category Details',
    units: 'units',
  },
};

const STATUS_COLORS: Record<string, string> = {
  available: '#52c41a',
  in_use: '#1677ff',
  maintenance: '#faad14',
  out_of_service: '#ff4d4f',
  reserved: '#722ed1',
};

const CATEGORY_COLORS = [
  '#1677ff', '#52c41a', '#faad14', '#ff4d4f', 
  '#722ed1', '#13c2c2', '#eb2f96', '#a0d911',
];

const EQUIPMENT_CATEGORIES = [
  'thermal', 'mechanical', 'electrical', 'optical',
  'analytical', 'environmental', 'measurement', 'other'
] as const;

type EquipmentCategoryKey = typeof EQUIPMENT_CATEGORIES[number];

const SCHEDULE_STATUS_COLORS: Record<string, string> = {
  scheduled: '#1677ff',
  in_progress: '#52c41a',
  completed: '#8c8c8c',
  cancelled: '#ff4d4f',
};

interface GanttChartContentProps {
  equipment: GanttEquipment[];
  startDate: Dayjs;
  endDate: Dayjs;
  loading: boolean;
  language: Language;
  t: typeof translations['zh'];
}

function GanttChartContent({ equipment, startDate, endDate, loading, language, t }: GanttChartContentProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spin />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <Empty
        image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        description={t.noEquipment}
        style={{ padding: '48px 0' }}
      />
    );
  }

  const totalEquipmentWithSchedules = equipment.filter(eq => eq.schedules.length > 0);
  if (totalEquipmentWithSchedules.length === 0) {
    return (
      <Empty
        image={<CalendarOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        description={t.noSchedules}
        style={{ padding: '48px 0' }}
      />
    );
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const totalHours = end.diff(start, 'hour');
  const dayCount = end.diff(start, 'day') + 1;

  const timeLabels: { label: string; position: number }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const day = start.add(i, 'day');
    timeLabels.push({
      label: day.format('MM-DD'),
      position: (i * 24 / totalHours) * 100,
    });
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 8, paddingLeft: 144, position: 'relative', height: 24 }}>
        {timeLabels.map((item, index) => (
          <div
            key={index}
            style={{ position: 'absolute', fontSize: 12, color: '#8c8c8c', transform: 'translateX(-50%)', left: `calc(144px + ${item.position}%)` }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {equipment.map((eq) => (
        <div 
          key={eq.id}
          style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f5f5f5', minHeight: 36, padding: '4px 0' }}
        >
          <div style={{ width: 144, flexShrink: 0, paddingRight: 8, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Tooltip title={`${eq.name} (${eq.code})`}>
              <span>{eq.name}</span>
            </Tooltip>
          </div>

          <div style={{ flex: 1, position: 'relative', height: 28, backgroundColor: '#fafafa', borderRadius: 4 }}>
            {timeLabels.map((item, index) => (
              <div
                key={index}
                style={{ position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#f0f0f0', left: `${item.position}%` }}
              />
            ))}

            {eq.schedules.map((schedule) => {
              const scheduleStart = dayjs(schedule.start_time);
              const scheduleEnd = dayjs(schedule.end_time);
              
              const visibleStart = scheduleStart.isBefore(start) ? start : scheduleStart;
              const visibleEnd = scheduleEnd.isAfter(end) ? end : scheduleEnd;
              
              const startOffset = visibleStart.diff(start, 'hour', true);
              const duration = visibleEnd.diff(visibleStart, 'hour', true);
              
              const left = (startOffset / totalHours) * 100;
              const width = (duration / totalHours) * 100;

              if (width <= 0) return null;

              const barColor = SCHEDULE_STATUS_COLORS[schedule.status] || '#1677ff';

              return (
                <Tooltip
                  key={schedule.id}
                  title={
                    <div>
                      <div>{schedule.title}</div>
                      <div>{scheduleStart.format('MM-DD HH:mm')} - {scheduleEnd.format('MM-DD HH:mm')}</div>
                      {schedule.operator_name && <div>{t.operator}: {schedule.operator_name}</div>}
                    </div>
                  }
                >
                  <div
                    style={{
                      position: 'absolute',
                      height: 20,
                      top: 4,
                      borderRadius: 4,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 10,
                      color: '#fff',
                      padding: '0 4px',
                      lineHeight: '20px',
                      left: `${left}%`,
                      width: `${Math.max(width, 1)}%`,
                      backgroundColor: barColor,
                    }}
                  >
                    {width > 5 ? schedule.title : ''}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(SCHEDULE_STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {language === 'zh' ? 
                (status === 'scheduled' ? '已安排' : 
                 status === 'in_progress' ? '进行中' : 
                 status === 'completed' ? '已完成' : '已取消') :
                status.replace('_', ' ')
              }
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EquipmentDashboard() {
  const [language, setLanguage] = useState<Language>('zh');
  const [siteId, setSiteId] = useState<number | undefined>();
  const [laboratoryId, setLaboratoryId] = useState<number | undefined>();
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EquipmentDashboardResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [ganttData, setGanttData] = useState<GanttDataResponse | null>(null);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EquipmentCategoryKey>('thermal');
  const [ganttStartDate, setGanttStartDate] = useState<Dayjs>(dayjs().subtract(1, 'day'));
  const [ganttEndDate, setGanttEndDate] = useState<Dayjs>(dayjs().add(2, 'day'));

  const abortControllerRef = useRef<AbortController | null>(null);
  const ganttAbortControllerRef = useRef<AbortController | null>(null);

  const t = translations[language];

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [sitesData, labsData] = await Promise.all([
          siteService.getAllSites(),
          laboratoryService.getLaboratories({ page_size: 100 }),
        ]);
        setSites(sitesData);
        setLaboratories(labsData.items);
      } catch {
        console.error('Failed to load reference data');
      }
    };
    loadReferenceData();
  }, []);

  const filteredLaboratories = siteId
    ? laboratories.filter(lab => lab.site_id === siteId)
    : laboratories;

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, number | AbortSignal | undefined> = { signal };
      if (siteId) params.site_id = siteId;
      if (laboratoryId) params.laboratory_id = laboratoryId;
      
      const response = await dashboardService.getEquipmentDashboard(params);
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isAbortError(err)) {
        setError(language === 'zh' ? '加载设备数据失败' : 'Failed to load equipment data');
      }
    } finally {
      setLoading(false);
    }
  }, [siteId, laboratoryId, language]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  const fetchGanttData = useCallback(async (signal?: AbortSignal) => {
    setGanttLoading(true);
    try {
      const params: Record<string, string | number | AbortSignal | undefined> = {
        start_date: ganttStartDate.toISOString(),
        end_date: ganttEndDate.toISOString(),
        signal,
      };
      if (siteId) params.site_id = siteId;
      if (laboratoryId) params.laboratory_id = laboratoryId;
      
      const response = await dashboardService.getGanttData(params);
      setGanttData(response);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to load Gantt data');
      }
    } finally {
      setGanttLoading(false);
    }
  }, [ganttStartDate, ganttEndDate, siteId, laboratoryId]);

  useEffect(() => {
    if (ganttAbortControllerRef.current) {
      ganttAbortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    ganttAbortControllerRef.current = controller;
    
    fetchGanttData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchGanttData]);

  const getEquipmentByCategory = (category: EquipmentCategoryKey): GanttEquipment[] => {
    if (!ganttData) return [];
    return ganttData.equipment.filter(eq => eq.category === category);
  };

  const getCategoryName = (cat: EquipmentCategoryStats) => 
    language === 'zh' ? cat.category_name_zh : cat.category_name_en;

  const categoryPieData = data?.by_category.map((cat, index) => ({
    name: getCategoryName(cat),
    value: cat.total_count,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  })) || [];

  const statusPieData = data ? Object.entries(data.by_status).map(([status, count]) => ({
    name: t[status as keyof typeof t] || status,
    value: count,
    color: STATUS_COLORS[status] || '#999',
  })) : [];

  const utilizationBarData = data?.utilization_by_category.map(cat => ({
    name: language === 'zh' ? cat.category_name_zh : cat.category_name_en,
    utilization: cat.utilization_rate,
  })) || [];

  const tabItems = EQUIPMENT_CATEGORIES.map((category, index) => ({
    key: category,
    label: (
      <span style={{ color: activeCategory === category ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : undefined }}>
        {t[category as keyof typeof t]}
      </span>
    ),
    children: (
      <GanttChartContent
        equipment={getEquipmentByCategory(category)}
        startDate={ganttStartDate}
        endDate={ganttEndDate}
        loading={ganttLoading}
        language={language}
        t={t}
      />
    ),
  }));

  if (error) {
    return <Alert message={error} type="error" style={{ margin: 24 }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{t.title}</Title>
            {lastUpdated && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t.lastUpdated}: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </div>
          <Space wrap>
            <Segmented
              value={language}
              onChange={(value) => setLanguage(value as Language)}
              options={[
                { label: '中文', value: 'zh' },
                { label: 'EN', value: 'en' },
              ]}
            />

            <Select
              placeholder={t.allSites}
              value={siteId}
              onChange={(value) => {
                setSiteId(value);
                setLaboratoryId(undefined);
              }}
              allowClear
              style={{ width: 140 }}
              options={sites.map(s => ({ label: s.name, value: s.id }))}
            />

            <Select
              placeholder={t.allLaboratories}
              value={laboratoryId}
              onChange={setLaboratoryId}
              allowClear
              style={{ width: 180 }}
              options={filteredLaboratories.map(l => ({ label: l.name, value: l.id }))}
            />

            <Tooltip title={t.refresh}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchData()}
                loading={loading}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>{t.loading}</Text>
        </div>
      ) : data && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ToolOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>{t.totalEquipment}</Text>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.total_equipment}</div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>{t.availableEquipment}</Text>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.available_equipment}</div>
                  </div>
                </div>
                <Progress
                  percent={data.total_equipment ? Math.round((data.available_equipment / data.total_equipment) * 100) : 0}
                  size="small"
                  strokeColor="#52c41a"
                  showInfo={false}
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <SyncOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>{t.inUseEquipment}</Text>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.by_status['in_use'] || 0}</div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <SettingOutlined style={{ fontSize: 32, color: '#faad14' }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>{t.maintenanceEquipment}</Text>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.by_status['maintenance'] || 0}</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title={t.byCategory}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [value, t.equipmentCount]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title={t.byStatus}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [value, t.equipmentCount]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Card size="small" title={t.utilizationByCategory} style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={utilizationBarData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value) => [`${value}%`, t.utilizationRate]} />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                  {utilizationBarData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.utilization >= 80 ? '#52c41a' :
                        entry.utilization >= 50 ? '#1677ff' :
                        entry.utilization >= 30 ? '#faad14' : '#ff4d4f'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card size="small" title={t.categoryDetails} style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              {data.by_category.map((cat, index) => (
                <Col xs={24} sm={12} lg={6} key={cat.category}>
                  <Card 
                    size="small"
                    style={{ borderLeft: `4px solid ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}` }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 14 }}>{getCategoryName(cat)}</Text>
                      <span style={{ fontSize: 18, fontWeight: 600 }}>
                        {cat.total_count} <Text type="secondary" style={{ fontSize: 12 }}>{t.units}</Text>
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      {t.availableEquipment}: {cat.available_count} | {t.inUseEquipment}: {cat.in_use_count} | {t.maintenanceEquipment}: {cat.maintenance_count}
                    </Text>
                    <Progress
                      percent={cat.utilization_rate}
                      size="small"
                      status={cat.utilization_rate >= 80 ? 'success' : cat.utilization_rate >= 50 ? 'active' : 'exception'}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          <Card size="small">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <Space>
                <CalendarOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />
                <Text strong>{t.ganttChart}</Text>
              </Space>
              <Space wrap>
                <Text type="secondary" style={{ fontSize: 14 }}>{t.dateRange}:</Text>
                <DatePicker
                  value={ganttStartDate}
                  onChange={(date) => date && setGanttStartDate(date)}
                  size="small"
                />
                <span style={{ color: '#d9d9d9' }}>-</span>
                <DatePicker
                  value={ganttEndDate}
                  onChange={(date) => date && setGanttEndDate(date)}
                  size="small"
                />
                <Tooltip title={t.maxRangeWarning}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (max 7 {language === 'zh' ? '天' : 'days'})
                  </Text>
                </Tooltip>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => fetchGanttData()}
                  loading={ganttLoading}
                />
              </Space>
            </div>
            
            <Tabs
              activeKey={activeCategory}
              onChange={(key) => setActiveCategory(key as EquipmentCategoryKey)}
              items={tabItems}
            />
          </Card>
        </>
      )}
    </div>
  );
}
