import { useEffect, useState, useCallback } from 'react';
import {
  UsersIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
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
import type { PersonnelGanttDataResponse, PersonnelGanttItem, PersonnelEfficiency } from '../services/dashboardService';
import type { Site, Laboratory } from '../types';
import { Button, Select, Spin, Progress, Alert, Tooltip, DatePicker } from '../components/ui';

type Language = 'zh' | 'en';

// Translations
const translations = {
  zh: {
    title: '人员仪表板',
    totalPersonnel: '人员总数',
    availablePersonnel: '可用人员',
    busyPersonnel: '忙碌人员',
    onLeavePersonnel: '休假人员',
    byRole: '按角色分布',
    byStatus: '按状态分布',
    efficiencyByRole: '各角色效率',
    allSites: '全部站点',
    allLaboratories: '全部实验室',
    refresh: '刷新',
    lastUpdated: '最后更新',
    loading: '加载中...',
    available: '可用',
    busy: '忙碌',
    on_leave: '休假',
    borrowed: '借调中',
    admin: '管理员',
    manager: '经理',
    engineer: '工程师',
    technician: '技术员',
    viewer: '访客',
    personnelCount: '人员数量',
    efficiencyRate: '效率',
    ganttChart: '人员调度甘特图',
    dateRange: '日期范围',
    noSchedules: '该角色暂无调度数据',
    noPersonnel: '该角色暂无人员',
    scheduled: '已安排',
    workOrder: '工单',
    task: '任务',
    equipment: '设备',
    maxRangeWarning: '日期范围最大7天',
    pending: '待处理',
    assigned: '已分配',
    in_progress: '进行中',
    completed: '已完成',
    blocked: '阻塞',
    cancelled: '已取消',
  },
  en: {
    title: 'Personnel Dashboard',
    totalPersonnel: 'Total Personnel',
    availablePersonnel: 'Available',
    busyPersonnel: 'Busy',
    onLeavePersonnel: 'On Leave',
    byRole: 'Distribution by Role',
    byStatus: 'Distribution by Status',
    efficiencyByRole: 'Efficiency by Role',
    allSites: 'All Sites',
    allLaboratories: 'All Laboratories',
    refresh: 'Refresh',
    lastUpdated: 'Last updated',
    loading: 'Loading...',
    available: 'Available',
    busy: 'Busy',
    on_leave: 'On Leave',
    borrowed: 'Borrowed',
    admin: 'Admin',
    manager: 'Manager',
    engineer: 'Engineer',
    technician: 'Technician',
    viewer: 'Viewer',
    personnelCount: 'Personnel Count',
    efficiencyRate: 'Efficiency',
    ganttChart: 'Personnel Scheduling Gantt Chart',
    dateRange: 'Date Range',
    noSchedules: 'No schedules for this role',
    noPersonnel: 'No personnel in this role',
    scheduled: 'Scheduled',
    workOrder: 'Work Order',
    task: 'Task',
    equipment: 'Equipment',
    maxRangeWarning: 'Maximum range is 7 days',
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
  },
};

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  busy: '#3b82f6',
  on_leave: '#f59e0b',
  borrowed: '#8b5cf6',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  manager: '#f97316',
  engineer: '#3b82f6',
  technician: '#22c55e',
  viewer: '#6b7280',
};

const PERSONNEL_ROLES = ['engineer', 'technician', 'manager', 'admin'] as const;
type PersonnelRoleKey = typeof PERSONNEL_ROLES[number];

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  in_progress: '#22c55e',
  completed: '#6b7280',
  blocked: '#ef4444',
  cancelled: '#d1d5db',
};

interface GanttChartContentProps {
  personnel: PersonnelGanttItem[];
  startDate: Dayjs;
  endDate: Dayjs;
  loading: boolean;
  t: typeof translations['zh'];
}

function GanttChartContent({ personnel, startDate, endDate, loading, t }: GanttChartContentProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }

  if (personnel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span>{t.noPersonnel}</span>
      </div>
    );
  }

  const totalPersonnelWithSchedules = personnel.filter(p => p.schedules.length > 0);
  if (totalPersonnelWithSchedules.length === 0) {
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
      {/* Time axis header */}
      <div className="flex border-b border-neutral-200 mb-2 pl-44 relative h-6">
        {timeLabels.map((item, index) => (
          <div
            key={index}
            className="absolute text-xs text-neutral-500 -translate-x-1/2"
            style={{ left: `calc(176px + ${item.position}%)` }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Personnel rows with schedules */}
      {personnel.map((p) => (
        <div 
          key={p.id}
          className="flex items-center border-b border-neutral-100 min-h-[36px] py-1"
        >
          {/* Personnel name */}
          <div className="w-44 flex-shrink-0 pr-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
            <Tooltip title={`${p.name} (${p.employee_id}) - ${p.laboratory_name}`}>
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" style={{ color: ROLE_COLORS[p.role] || '#666' }} />
                {p.name}
              </span>
            </Tooltip>
          </div>

          {/* Schedule bars container */}
          <div className="flex-1 relative h-7 bg-neutral-50 rounded">
            {/* Day separator lines */}
            {timeLabels.map((item, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-px bg-neutral-200"
                style={{ left: `${item.position}%` }}
              />
            ))}

            {/* Schedule bars */}
            {p.schedules.map((schedule) => {
              const scheduleStart = dayjs(schedule.start_time);
              const scheduleEnd = dayjs(schedule.end_time);
              
              const visibleStart = scheduleStart.isBefore(start) ? start : scheduleStart;
              const visibleEnd = scheduleEnd.isAfter(end) ? end : scheduleEnd;
              
              const startOffset = visibleStart.diff(start, 'hour', true);
              const duration = visibleEnd.diff(visibleStart, 'hour', true);
              
              const left = (startOffset / totalHours) * 100;
              const width = (duration / totalHours) * 100;

              if (width <= 0) return null;

              const barColor = TASK_STATUS_COLORS[schedule.status] || '#3b82f6';

              return (
                <Tooltip
                  key={schedule.id}
                  title={`${schedule.title}\n${scheduleStart.format('MM-DD HH:mm')} - ${scheduleEnd.format('MM-DD HH:mm')}${schedule.work_order_number ? `\n${t.workOrder}: ${schedule.work_order_number}` : ''}\n${t.task}: ${schedule.task_number}${schedule.equipment_name ? `\n${t.equipment}: ${schedule.equipment_name}` : ''}`}
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

      {/* Legend */}
      <div className="mt-4 flex gap-4 flex-wrap">
        {Object.entries(TASK_STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-neutral-500">
              {t[status as keyof typeof t] || status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonnelDashboard() {
  const [language, setLanguage] = useState<Language>('zh');
  const [siteId, setSiteId] = useState<number | undefined>();
  const [laboratoryId, setLaboratoryId] = useState<number | undefined>();
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<PersonnelEfficiency[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [ganttData, setGanttData] = useState<PersonnelGanttDataResponse | null>(null);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<PersonnelRoleKey>('technician');
  const [ganttStartDate, setGanttStartDate] = useState<Dayjs>(dayjs().subtract(1, 'day'));
  const [ganttEndDate, setGanttEndDate] = useState<Dayjs>(dayjs().add(2, 'day'));

  const [personnelSummary, setPersonnelSummary] = useState({
    total: 0,
    available: 0,
    busy: 0,
    on_leave: 0,
    borrowed: 0,
    by_role: {} as Record<string, number>,
  });

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, number | string | undefined> = {};
      if (siteId) params.site_id = siteId;
      if (laboratoryId) params.laboratory_id = laboratoryId;
      
      const efficiency = await dashboardService.getPersonnelEfficiency(params);
      setEfficiencyData(efficiency);
      setLastUpdated(new Date());
    } catch {
      setError(language === 'zh' ? '加载人员数据失败' : 'Failed to load personnel data');
    } finally {
      setLoading(false);
    }
  }, [siteId, laboratoryId, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchGanttData = useCallback(async () => {
    setGanttLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        start_date: ganttStartDate.toISOString(),
        end_date: ganttEndDate.toISOString(),
      };
      if (siteId) params.site_id = siteId;
      if (laboratoryId) params.laboratory_id = laboratoryId;
      
      const response = await dashboardService.getPersonnelGanttData(params);
      setGanttData(response);
      
      const summary = {
        total: response.personnel.length,
        available: 0,
        busy: 0,
        on_leave: 0,
        borrowed: 0,
        by_role: {} as Record<string, number>,
      };
      
      response.personnel.forEach(p => {
        if (p.status === 'available') summary.available++;
        else if (p.status === 'busy') summary.busy++;
        else if (p.status === 'on_leave') summary.on_leave++;
        else if (p.status === 'borrowed') summary.borrowed++;
        
        summary.by_role[p.role] = (summary.by_role[p.role] || 0) + 1;
      });
      
      setPersonnelSummary(summary);
    } catch {
      console.error('Failed to load Gantt data');
    } finally {
      setGanttLoading(false);
    }
  }, [ganttStartDate, ganttEndDate, siteId, laboratoryId]);

  useEffect(() => {
    fetchGanttData();
  }, [fetchGanttData]);

  const getPersonnelByRole = (role: PersonnelRoleKey): PersonnelGanttItem[] => {
    if (!ganttData) return [];
    return ganttData.personnel.filter(p => p.role === role);
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

  const rolePieData = Object.entries(personnelSummary.by_role).map(([role, count]) => ({
    name: t[role as keyof typeof t] || role,
    value: count,
    color: ROLE_COLORS[role] || '#999',
  }));

  const statusPieData = [
    { name: t.available, value: personnelSummary.available, color: STATUS_COLORS.available },
    { name: t.busy, value: personnelSummary.busy, color: STATUS_COLORS.busy },
    { name: t.on_leave, value: personnelSummary.on_leave, color: STATUS_COLORS.on_leave },
    { name: t.borrowed, value: personnelSummary.borrowed, color: STATUS_COLORS.borrowed },
  ].filter(d => d.value > 0);

  const efficiencyBarData = efficiencyData.slice(0, 10).map(p => ({
    name: p.employee_id,
    efficiency: p.efficiency_rate,
    tasks: p.completed_tasks,
  }));

  if (error) {
    return <Alert message={error} type="error" className="m-6" />;
  }

  return (
    <div>
      {/* Header with controls */}
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
            {/* Language Toggle */}
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
                onClick={() => { fetchData(); fetchGanttData(); }}
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {loading && !ganttData ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">{t.loading}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.totalPersonnel}</p>
                  <p className="text-2xl font-semibold">{personnelSummary.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-success-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.availablePersonnel}</p>
                  <p className="text-2xl font-semibold">{personnelSummary.available}</p>
                </div>
              </div>
              <Progress
                percent={personnelSummary.total ? Math.round((personnelSummary.available / personnelSummary.total) * 100) : 0}
                size="small"
                strokeColor="success"
                showInfo={false}
                className="mt-2"
              />
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.busyPersonnel}</p>
                  <p className="text-2xl font-semibold">{personnelSummary.busy}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-warning-500" />
                <div>
                  <p className="text-sm text-neutral-500">{t.onLeavePersonnel}</p>
                  <p className="text-2xl font-semibold">{personnelSummary.on_leave}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Role and Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.byRole}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rolePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {rolePieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [value, t.personnelCount]} />
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
                  <RechartsTooltip formatter={(value) => [value, t.personnelCount]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2: Efficiency by Personnel */}
          {efficiencyBarData.length > 0 && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">{t.efficiencyByRole}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={efficiencyBarData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value, name) => [
                    name === 'efficiency' ? `${value}%` : value,
                    name === 'efficiency' ? t.efficiencyRate : language === 'zh' ? '完成任务' : 'Tasks'
                  ]} />
                  <Bar dataKey="efficiency" radius={[0, 4, 4, 0]}>
                    {efficiencyBarData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.efficiency >= 80 ? '#22c55e' :
                          entry.efficiency >= 60 ? '#3b82f6' :
                          entry.efficiency >= 40 ? '#f59e0b' : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Personnel Scheduling Gantt Chart */}
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
                  onClick={fetchGanttData}
                  loading={ganttLoading}
                />
              </div>
            </div>
            <div className="p-4">
              {/* Tab Navigation */}
              <div className="flex gap-1 border-b border-neutral-200 mb-4">
                {PERSONNEL_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeRole === role
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                    style={{ color: activeRole === role ? ROLE_COLORS[role] : undefined }}
                  >
                    {t[role as keyof typeof t]}
                    <span className="ml-1 text-neutral-400">
                      ({getPersonnelByRole(role).length})
                    </span>
                  </button>
                ))}
              </div>
              
              <GanttChartContent
                personnel={getPersonnelByRole(activeRole)}
                startDate={ganttStartDate}
                endDate={ganttEndDate}
                loading={ganttLoading}
                t={t}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
