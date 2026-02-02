import { useEffect, useState, useCallback, useRef } from 'react';
import {
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ArrowPathIcon as SyncIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type { EquipmentDashboardResponse, EquipmentCategoryStats, GanttDataResponse, GanttEquipment } from '../services/dashboardService';
import type { Site, Laboratory } from '../types';
import { Button, Select, Spin, Progress, Alert, Tooltip, DatePicker } from '../components/ui';

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
  available: '#22c55e',
  in_use: '#3b82f6',
  maintenance: '#f59e0b',
  out_of_service: '#ef4444',
  reserved: '#8b5cf6',
};

const CATEGORY_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#14b8a6', '#ec4899', '#a3e635',
];

const EQUIPMENT_CATEGORIES = [
  'thermal', 'mechanical', 'electrical', 'optical',
  'analytical', 'environmental', 'measurement', 'other'
] as const;

type EquipmentCategoryKey = typeof EQUIPMENT_CATEGORIES[number];

const SCHEDULE_STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#22c55e',
  completed: '#6b7280',
  cancelled: '#ef4444',
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
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span>{t.noEquipment}</span>
      </div>
    );
  }

  const totalEquipmentWithSchedules = equipment.filter(eq => eq.schedules.length > 0);
  if (totalEquipmentWithSchedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{t.noSchedules}</span>
      </div>
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
    <div className="overflow-x-auto">
      <div className="flex border-b border-neutral-200 mb-2 pl-36 relative h-6">
        {timeLabels.map((item, index) => (
          <div
            key={index}
            className="absolute text-xs text-neutral-500 -translate-x-1/2"
            style={{ left: `calc(144px + ${item.position}%)` }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {equipment.map((eq) => (
        <div 
          key={eq.id}
          className="flex items-center border-b border-neutral-100 min-h-[36px] py-1"
        >
          <div className="w-36 flex-shrink-0 pr-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
            <Tooltip title={`${eq.name} (${eq.code})`}>
              <span>{eq.name}</span>
            </Tooltip>
          </div>

          <div className="flex-1 relative h-7 bg-neutral-50 rounded">
            {timeLabels.map((item, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-px bg-neutral-200"
                style={{ left: `${item.position}%` }}
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

              const barColor = SCHEDULE_STATUS_COLORS[schedule.status] || '#3b82f6';

              return (
                <Tooltip
                  key={schedule.id}
                  title={`${schedule.title}\n${scheduleStart.format('MM-DD HH:mm')} - ${scheduleEnd.format('MM-DD HH:mm')}${schedule.operator_name ? `\n${t.operator}: ${schedule.operator_name}` : ''}`}
                >
                  <div
                    className="absolute h-5 top-1 rounded cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-white px-1 leading-5"
                    style={{
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

      <div className="mt-4 flex gap-4 flex-wrap">
        {Object.entries(SCHEDULE_STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-neutral-500">
              {language === 'zh' ? 
                (status === 'scheduled' ? '已安排' : 
                 status === 'in_progress' ? '进行中' : 
                 status === 'completed' ? '已完成' : '已取消') :
                status.replace('_', ' ')
              }
            </span>
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

  const handleSiteChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setSiteId(v ? Number(v) : undefined);
    setLaboratoryId(undefined);
  };

  const handleLabChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setLaboratoryId(v ? Number(v) : undefined);
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

  if (error) {
    return <Alert message={error} type="error" className="m-6" />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{t.title}</h1>
            {lastUpdated && (
              <p className="text-xs text-neutral-500">
                {t.lastUpdated}: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md overflow-hidden border border-neutral-200">
              <button
                onClick={() => setLanguage('zh')}
                className={`px-3 py-1.5 text-sm ${language === 'zh' ? 'bg-primary-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-sm ${language === 'en' ? 'bg-primary-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                EN
              </button>
            </div>

            <Select
              placeholder={t.allSites}
              value={siteId}
              onChange={handleSiteChange}
              allowClear
              className="w-36"
              options={sites.map(s => ({ label: s.name, value: s.id }))}
            />

            <Select
              placeholder={t.allLaboratories}
              value={laboratoryId}
              onChange={handleLabChange}
              allowClear
              className="w-44"
              options={filteredLaboratories.map(l => ({ label: l.name, value: l.id }))}
            />

            <Tooltip title={t.refresh}>
              <Button
                variant="default"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={() => fetchData()}
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">{t.loading}</p>
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <WrenchScrewdriverIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.totalEquipment}</p>
                  <p className="text-2xl font-semibold">{data.total_equipment}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-success-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.availableEquipment}</p>
                  <p className="text-2xl font-semibold">{data.available_equipment}</p>
                </div>
              </div>
              <Progress
                percent={data.total_equipment ? Math.round((data.available_equipment / data.total_equipment) * 100) : 0}
                size="small"
                strokeColor="success"
                showInfo={false}
                className="mt-2"
              />
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <SyncIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.inUseEquipment}</p>
                  <p className="text-2xl font-semibold">{data.by_status['in_use'] || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <Cog6ToothIcon className="w-8 h-8 text-warning-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.maintenanceEquipment}</p>
                  <p className="text-2xl font-semibold">{data.by_status['maintenance'] || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.byCategory}</h3>
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
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.byStatus}</h3>
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
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.utilizationByCategory}</h3>
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
                        entry.utilization >= 80 ? '#22c55e' :
                        entry.utilization >= 50 ? '#3b82f6' :
                        entry.utilization >= 30 ? '#f59e0b' : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.categoryDetails}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.by_category.map((cat, index) => (
                <div
                  key={cat.category}
                  className="bg-white rounded-lg border border-neutral-200 p-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-900">{getCategoryName(cat)}</span>
                    <span className="text-lg font-semibold">{cat.total_count} <span className="text-xs text-neutral-400">{t.units}</span></span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-2">
                    {t.availableEquipment}: {cat.available_count} | {t.inUseEquipment}: {cat.in_use_count} | {t.maintenanceEquipment}: {cat.maintenance_count}
                  </div>
                  <Progress
                    percent={cat.utilization_rate}
                    size="small"
                    status={cat.utilization_rate >= 80 ? 'success' : cat.utilization_rate >= 50 ? 'active' : 'exception'}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200">
            <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50 gap-3">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-neutral-500" />
                <span className="font-medium text-neutral-900">{t.ganttChart}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-neutral-500">{t.dateRange}:</span>
                <DatePicker
                  value={ganttStartDate}
                  onChange={(date) => date && setGanttStartDate(date)}
                  size="small"
                />
                <span className="text-neutral-400">-</span>
                <DatePicker
                  value={ganttEndDate}
                  onChange={(date) => date && setGanttEndDate(date)}
                  size="small"
                />
                <Tooltip title={t.maxRangeWarning}>
                  <span className="text-xs text-neutral-400">
                    (max 7 {language === 'zh' ? '天' : 'days'})
                  </span>
                </Tooltip>
                <Button
                  variant="default"
                  size="small"
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                  onClick={() => fetchGanttData()}
                  loading={ganttLoading}
                />
              </div>
            </div>
            <div className="p-4">
              <div className="flex gap-1 border-b border-neutral-200 mb-4 overflow-x-auto">
                {EQUIPMENT_CATEGORIES.map((category, index) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeCategory === category
                        ? 'border-primary-500'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                    style={{ color: activeCategory === category ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : undefined }}
                  >
                    {t[category as keyof typeof t]}
                  </button>
                ))}
              </div>
              
              <GanttChartContent
                equipment={getEquipmentByCategory(activeCategory)}
                startDate={ganttStartDate}
                endDate={ganttEndDate}
                loading={ganttLoading}
                language={language}
                t={t}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
