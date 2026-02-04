import { useEffect, useState, useCallback } from 'react';
import {
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  InboxOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { isAbortError } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { Card, Button, Select, Spin, Progress, Alert, Tooltip, DatePicker, Space, Row, Col, Segmented, Typography, Tabs, Empty } from 'antd';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import type { PersonnelGanttDataResponse, PersonnelGanttItem, PersonnelEfficiency, PersonnelGanttSchedule } from '../services/dashboardService';
import type { Site, Laboratory } from '../types';

const { Text, Title } = Typography;

type Language = 'zh' | 'en';

// Translations
const translations = {
  zh: {
    title: '人员仪表板',
    dashboardTab: '统计仪表板',
    ganttTab: '人员调度甘特图',
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
    dashboardTab: 'Statistics Dashboard',
    ganttTab: 'Personnel Scheduling Gantt',
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
  available: '#52c41a',
  busy: '#1677ff',
  on_leave: '#faad14',
  borrowed: '#722ed1',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#ff4d4f',
  manager: '#fa8c16',
  engineer: '#1677ff',
  technician: '#52c41a',
  viewer: '#8c8c8c',
};

const PERSONNEL_ROLES = ['engineer', 'technician', 'manager', 'admin'] as const;
type PersonnelRoleKey = typeof PERSONNEL_ROLES[number];

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#faad14',
  assigned: '#1677ff',
  in_progress: '#52c41a',
  completed: '#8c8c8c',
  blocked: '#ff4d4f',
  cancelled: '#d9d9d9',
};

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
  personnel: PersonnelGanttItem[];
  startDate: Dayjs;
  endDate: Dayjs;
  loading: boolean;
  t: typeof translations['zh'];
  onScheduleClick?: (schedule: PersonnelGanttSchedule) => void;
}

function GanttChartContent({ personnel, startDate, endDate, loading, t, onScheduleClick }: GanttChartContentProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spin />
      </div>
    );
  }

  if (personnel.length === 0) {
    return (
      <Empty
        image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        description={t.noPersonnel}
        style={{ padding: '48px 0' }}
      />
    );
  }

  const totalPersonnelWithSchedules = personnel.filter(p => p.schedules.length > 0);
  if (totalPersonnelWithSchedules.length === 0) {
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
      {/* Time axis header */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 8, paddingLeft: 176, position: 'relative', height: 24 }}>
        {timeLabels.map((item, index) => (
          <div
            key={index}
            style={{ position: 'absolute', fontSize: 12, color: '#8c8c8c', transform: 'translateX(-50%)', left: `calc(176px + ${item.position}%)` }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Personnel rows with schedules */}
      {personnel.map((p) => (
        <div 
          key={p.id}
          style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f5f5f5', minHeight: 36, padding: '4px 0' }}
        >
          {/* Personnel name */}
          <div style={{ width: 176, flexShrink: 0, paddingRight: 8, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Tooltip title={`${p.name} (${p.employee_id}) - ${p.laboratory_name}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <UserOutlined style={{ fontSize: 12, color: ROLE_COLORS[p.role] || '#666' }} />
                {p.name}
              </span>
            </Tooltip>
          </div>

          {/* Schedule bars container */}
          <div style={{ flex: 1, position: 'relative', height: 28, backgroundColor: '#fafafa', borderRadius: 4 }}>
            {/* Day separator lines */}
            {timeLabels.map((item, index) => (
              <div
                key={index}
                style={{ position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#f0f0f0', left: `${item.position}%` }}
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
                      <div>{t.pending === '待处理' ? '优先级' : 'Priority'}: {PRIORITY_LABELS[priorityLevel]?.[t.pending === '待处理' ? 'zh' : 'en'] || PRIORITY_LABELS[3][t.pending === '待处理' ? 'zh' : 'en']}</div>
                      {schedule.work_order_number && <div>{t.workOrder}: {schedule.work_order_number}</div>}
                      <div>{t.task}: {schedule.task_number}</div>
                      {schedule.equipment_code && <div>{t.equipment}: {schedule.equipment_code}</div>}
                      {schedule.equipment_name && !schedule.equipment_code && <div>{t.equipment}: {schedule.equipment_name}</div>}
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
                    {width > 5 ? (schedule.equipment_code || schedule.title) : ''}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{t.pending === '待处理' ? '优先级:' : 'Priority:'}</Text>
        {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {PRIORITY_LABELS[Number(level)]?.[t.pending === '待处理' ? 'zh' : 'en'] || level}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonnelDashboard() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('zh');
  const [mainTab, setMainTab] = useState<'dashboard' | 'gantt'>('dashboard');
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
    } catch (err) {
      if (!isAbortError(err)) {
        setError(language === 'zh' ? '加载人员数据失败' : 'Failed to load personnel data');
      }
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
        start_date: ganttStartDate.format('YYYY-MM-DD'),
        end_date: ganttEndDate.format('YYYY-MM-DD'),
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
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to load Gantt data');
      }
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

  const handleScheduleClick = (schedule: PersonnelGanttSchedule) => {
    if (schedule.work_order_id) {
      // 跳转到工单页面并展开对应工单的子任务
      navigate(`/work-orders?expand=${schedule.work_order_id}`);
    }
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

  const roleTabItems = PERSONNEL_ROLES.map((role) => ({
    key: role,
    label: (
      <span style={{ color: activeRole === role ? ROLE_COLORS[role] : undefined }}>
        {t[role as keyof typeof t]}
        <Text type="secondary" style={{ marginLeft: 4 }}>
          ({getPersonnelByRole(role).length})
        </Text>
      </span>
    ),
    children: (
      <GanttChartContent
        personnel={getPersonnelByRole(role)}
        startDate={ganttStartDate}
        endDate={ganttEndDate}
        loading={ganttLoading}
        t={t}
        onScheduleClick={handleScheduleClick}
      />
    ),
  }));

  if (error) {
    return <Alert message={error} type="error" style={{ margin: 24 }} />;
  }

  // 统计仪表板内容
  const dashboardContent = (
    <>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TeamOutlined style={{ fontSize: 32, color: '#1677ff' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>{t.totalPersonnel}</Text>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{personnelSummary.total}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>{t.availablePersonnel}</Text>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{personnelSummary.available}</div>
              </div>
            </div>
            <Progress
              percent={personnelSummary.total ? Math.round((personnelSummary.available / personnelSummary.total) * 100) : 0}
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
              <ClockCircleOutlined style={{ fontSize: 32, color: '#1677ff' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>{t.busyPersonnel}</Text>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{personnelSummary.busy}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserOutlined style={{ fontSize: 32, color: '#faad14' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>{t.onLeavePersonnel}</Text>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{personnelSummary.on_leave}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1: Role and Status Distribution */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title={t.byRole}>
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
                <RechartsTooltip formatter={(value) => [value, t.personnelCount]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2: Efficiency by Personnel */}
      {efficiencyBarData.length > 0 && (
        <Card size="small" title={t.efficiencyByRole}>
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
                      entry.efficiency >= 80 ? '#52c41a' :
                      entry.efficiency >= 60 ? '#1677ff' :
                      entry.efficiency >= 40 ? '#faad14' : '#ff4d4f'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );

  // 甘特图内容
  const ganttContent = (
    <Card size="small">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
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
            onClick={fetchGanttData}
            loading={ganttLoading}
          />
        </Space>
      </div>
      
      <Tabs
        activeKey={activeRole}
        onChange={(key) => setActiveRole(key as PersonnelRoleKey)}
        items={roleTabItems}
      />
    </Card>
  );

  // 主 Tab 配置
  const mainTabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <BarChartOutlined />
          {t.dashboardTab}
        </span>
      ),
      children: dashboardContent,
    },
    {
      key: 'gantt',
      label: (
        <span>
          <CalendarOutlined />
          {t.ganttTab}
        </span>
      ),
      children: ganttContent,
    },
  ];

  return (
    <div>
      {/* Header with controls */}
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
            {/* Language Toggle */}
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
                onClick={() => { fetchData(); fetchGanttData(); }}
                loading={loading}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {loading && !ganttData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>{t.loading}</Text>
        </div>
      ) : (
        <Tabs
          activeKey={mainTab}
          onChange={(key) => setMainTab(key as 'dashboard' | 'gantt')}
          items={mainTabItems}
          size="large"
        />
      )}
    </div>
  );
}
