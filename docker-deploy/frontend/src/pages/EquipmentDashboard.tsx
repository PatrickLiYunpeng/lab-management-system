import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ToolOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  ReloadOutlined,
  CalendarOutlined,
  InboxOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { Card, Button, Select, Spin, Progress, Alert, Tooltip, DatePicker, Space, Row, Col, Segmented, Typography, Tabs, Empty, Table } from 'antd';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type { EquipmentDashboardResponse, EquipmentCategoryStats, GanttDataResponse, GanttEquipment, GanttSchedule } from '../services/dashboardService';
import type { Site, Laboratory } from '../types';

const { Text, Title } = Typography;

type Language = 'zh' | 'en';

const translations = {
  zh: {
    title: '设备仪表板',
    overview: '概览',
    scheduling: '调度甘特图',
    criticalScheduling: '关键设备调度',
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
    criticalGanttChart: '关键设备调度甘特图',
    dateRange: '日期范围',
    noSchedules: '该类别暂无调度数据',
    noEquipment: '该类别暂无设备',
    noCriticalEquipment: '暂无关键设备',
    noCriticalSchedules: '关键设备暂无调度数据',
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
    upcomingReservations: '即将进行的预约',
    equipmentName: '设备名称',
    equipmentCode: '设备编号',
    taskTitle: '任务标题',
    startTime: '开始时间',
    endTime: '结束时间',
    priority: '优先级',
    noUpcomingReservations: '暂无即将进行的预约',
  },
  en: {
    title: 'Equipment Dashboard',
    overview: 'Overview',
    scheduling: 'Scheduling Gantt',
    criticalScheduling: 'Critical Equipment',
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
    criticalGanttChart: 'Critical Equipment Scheduling',
    dateRange: 'Date Range',
    noSchedules: 'No schedules for this category',
    noEquipment: 'No equipment in this category',
    noCriticalEquipment: 'No critical equipment',
    noCriticalSchedules: 'No schedules for critical equipment',
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
    upcomingReservations: 'Upcoming Reservations',
    equipmentName: 'Equipment Name',
    equipmentCode: 'Equipment Code',
    taskTitle: 'Task Title',
    startTime: 'Start Time',
    endTime: 'End Time',
    priority: 'Priority',
    noUpcomingReservations: 'No upcoming reservations',
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

// 优先级颜色定义（按priority_level: 1=最高优先级，5=最低优先级）
const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',  // 紧急 - 红色
  2: '#f97316',  // 高优先级 - 橙色
  3: '#3b82f6',  // 正常 - 蓝色
  4: '#22c55e',  // 低优先级 - 绿色
  5: '#6b7280',  // 常规 - 灰色
};

const PRIORITY_LABELS: Record<number, { zh: string; en: string }> = {
  1: { zh: '紧急', en: 'Urgent' },
  2: { zh: '高', en: 'High' },
  3: { zh: '正常', en: 'Normal' },
  4: { zh: '低', en: 'Low' },
  5: { zh: '常规', en: 'Routine' },
};

interface GanttChartContentProps {
  equipment: GanttEquipment[];
  startDate: Dayjs;
  endDate: Dayjs;
  loading: boolean;
  language: Language;
  t: typeof translations['zh'];
  onScheduleClick?: (schedule: GanttSchedule) => void;
}

function GanttChartContent({ equipment, startDate, endDate, loading, language, t, onScheduleClick }: GanttChartContentProps) {
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

              // 使用优先级颜色（priority_level 1-5，默认为3）
              const priorityLevel = schedule.priority_level || 3;
              const barColor = PRIORITY_COLORS[priorityLevel] || PRIORITY_COLORS[3];

              return (
                <Tooltip
                  key={schedule.id}
                  title={
                    <div>
                      <div>{schedule.title}</div>
                      <div>{scheduleStart.format('MM-DD HH:mm')} - {scheduleEnd.format('MM-DD HH:mm')}</div>
                      <div>{language === 'zh' ? '优先级' : 'Priority'}: {PRIORITY_LABELS[priorityLevel]?.[language] || PRIORITY_LABELS[3][language]}</div>
                      {schedule.operator_name && <div>{t.operator}: {schedule.operator_name}</div>}
                    </div>
                  }
                >
                  <div
                    onClick={() => onScheduleClick?.(schedule)}
                    style={{
                      position: 'absolute',
                      height: 20,
                      top: 4,
                      borderRadius: 4,
                      cursor: schedule.work_order_id ? 'pointer' : 'default',
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
        <Text type="secondary" style={{ fontSize: 12 }}>{language === 'zh' ? '优先级:' : 'Priority:'}</Text>
        {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {PRIORITY_LABELS[Number(level)]?.[language] || level}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EquipmentDashboard() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduling' | 'critical'>('overview');
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

  // 关键设备调度相关状态
  const [criticalGanttData, setCriticalGanttData] = useState<GanttDataResponse | null>(null);
  const [criticalGanttLoading, setCriticalGanttLoading] = useState(false);
  const [criticalStartDate, setCriticalStartDate] = useState<Dayjs>(dayjs().subtract(1, 'day'));
  const [criticalEndDate, setCriticalEndDate] = useState<Dayjs>(dayjs().add(5, 'day'));

  const abortControllerRef = useRef<AbortController | null>(null);
  const ganttAbortControllerRef = useRef<AbortController | null>(null);
  const criticalGanttAbortControllerRef = useRef<AbortController | null>(null);

  const t = translations[language];

  const handleScheduleClick = useCallback((schedule: GanttSchedule) => {
    if (schedule.work_order_id) {
      navigate(`/work-orders?expand=${schedule.work_order_id}`);
    }
  }, [navigate]);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [sitesData, labsData] = await Promise.all([
          siteService.getAllSites(),
          laboratoryService.getLaboratories({ page_size: 100 }),
        ]);
        setSites(sitesData);
        setLaboratories(labsData.items);
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Failed to load reference data');
        }
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
        start_date: ganttStartDate.format('YYYY-MM-DD'),
        end_date: ganttEndDate.format('YYYY-MM-DD'),
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

  // 获取关键设备甘特图数据
  const fetchCriticalGanttData = useCallback(async (signal?: AbortSignal) => {
    setCriticalGanttLoading(true);
    try {
      const params: Record<string, string | number | boolean | AbortSignal | undefined> = {
        start_date: criticalStartDate.format('YYYY-MM-DD'),
        end_date: criticalEndDate.format('YYYY-MM-DD'),
        is_critical: true,
        signal,
      };
      if (siteId) params.site_id = siteId;
      if (laboratoryId) params.laboratory_id = laboratoryId;
      
      const response = await dashboardService.getGanttData(params);
      setCriticalGanttData(response);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to load critical equipment Gantt data');
      }
    } finally {
      setCriticalGanttLoading(false);
    }
  }, [criticalStartDate, criticalEndDate, siteId, laboratoryId]);

  useEffect(() => {
    if (criticalGanttAbortControllerRef.current) {
      criticalGanttAbortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    criticalGanttAbortControllerRef.current = controller;
    
    fetchCriticalGanttData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchCriticalGanttData]);

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
        onScheduleClick={handleScheduleClick}
      />
    ),
  }));

  // 概览内容
  const overviewContent = data && (
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

      <Card size="small" title={t.categoryDetails}>
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
    </>
  );

  // 甘特图内容
  const schedulingContent = (
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
  );

  // 获取从当前时间开始的预约列表
  const getUpcomingReservations = useCallback(() => {
    if (!criticalGanttData) return [];
    const now = dayjs();
    const reservations: Array<{
      key: string;
      equipmentName: string;
      equipmentCode: string;
      title: string;
      startTime: string;
      endTime: string;
      priorityLevel: number;
      operatorName: string | null;
      workOrderId: number | null;
    }> = [];

    for (const eq of criticalGanttData.equipment) {
      for (const schedule of eq.schedules) {
        const scheduleEnd = dayjs(schedule.end_time);
        // 只包含尚未结束的预约
        if (scheduleEnd.isAfter(now)) {
          reservations.push({
            key: `${eq.id}-${schedule.id}`,
            equipmentName: eq.name,
            equipmentCode: eq.code,
            title: schedule.title,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            priorityLevel: schedule.priority_level || 3,
            operatorName: schedule.operator_name,
            workOrderId: schedule.work_order_id,
          });
        }
      }
    }

    // 按开始时间排序
    return reservations.sort((a, b) => 
      dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
    );
  }, [criticalGanttData]);

  // 预约列表列定义
  const reservationColumns = [
    {
      title: t.equipmentName,
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: t.equipmentCode,
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
    },
    {
      title: t.taskTitle,
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: t.startTime,
      dataIndex: 'startTime',
      key: 'startTime',
      width: 140,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: t.endTime,
      dataIndex: 'endTime',
      key: 'endTime',
      width: 140,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: t.priority,
      dataIndex: 'priorityLevel',
      key: 'priorityLevel',
      width: 80,
      render: (level: number) => (
        <span style={{ 
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          backgroundColor: PRIORITY_COLORS[level] || PRIORITY_COLORS[3],
          color: '#fff',
          fontSize: 12,
        }}>
          {PRIORITY_LABELS[level]?.[language] || PRIORITY_LABELS[3][language]}
        </span>
      ),
    },
    {
      title: t.operator,
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 100,
      render: (name: string | null) => name || '-',
    },
  ];

  // 关键设备调度内容
  const criticalSchedulingContent = (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <Space>
            <StarOutlined style={{ fontSize: 16, color: '#faad14' }} />
            <Text strong>{t.criticalGanttChart}</Text>
          </Space>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: 14 }}>{t.dateRange}:</Text>
            <DatePicker
              value={criticalStartDate}
              onChange={(date) => date && setCriticalStartDate(date)}
              size="small"
            />
            <span style={{ color: '#d9d9d9' }}>-</span>
            <DatePicker
              value={criticalEndDate}
              onChange={(date) => date && setCriticalEndDate(date)}
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
              onClick={() => fetchCriticalGanttData()}
              loading={criticalGanttLoading}
            />
          </Space>
        </div>

        <GanttChartContent
          equipment={criticalGanttData?.equipment || []}
          startDate={criticalStartDate}
          endDate={criticalEndDate}
          loading={criticalGanttLoading}
          language={language}
          t={{
            ...t,
            noEquipment: t.noCriticalEquipment,
            noSchedules: t.noCriticalSchedules,
          }}
          onScheduleClick={handleScheduleClick}
        />
      </Card>

      {/* 预约列表 */}
      <Card size="small" title={t.upcomingReservations}>
        <Table
          columns={reservationColumns}
          dataSource={getUpcomingReservations()}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} ${language === 'zh' ? '条记录' : 'records'}` }}
          locale={{ emptyText: t.noUpcomingReservations }}
          onRow={(record) => ({
            style: { cursor: record.workOrderId ? 'pointer' : 'default' },
            onClick: () => {
              if (record.workOrderId) {
                navigate(`/work-orders?expand=${record.workOrderId}`);
              }
            },
          })}
        />
      </Card>
    </div>
  );

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
                onClick={() => {
                  fetchData();
                  if (activeTab === 'scheduling') {
                    fetchGanttData();
                  } else if (activeTab === 'critical') {
                    fetchCriticalGanttData();
                  }
                }}
                loading={loading || ganttLoading || criticalGanttLoading}
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
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'overview' | 'scheduling' | 'critical')}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <ToolOutlined style={{ marginRight: 8 }} />
                  {t.overview}
                </span>
              ),
              children: overviewContent,
            },
            {
              key: 'scheduling',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  {t.scheduling}
                </span>
              ),
              children: schedulingContent,
            },
            {
              key: 'critical',
              label: (
                <span>
                  <StarOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  {t.criticalScheduling}
                </span>
              ),
              children: criticalSchedulingContent,
            },
          ]}
        />
      )}
    </div>
  );
}
