import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UsersIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon as HistoryIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, Line,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type {
  DashboardSummary, EquipmentUtilization, PersonnelEfficiency,
  TaskCompletionStats, SLAPerformance, WorkloadAnalysis,
} from '../services/dashboardService';
import type { Site, Laboratory } from '../types';
import { Button, Select, Spin, Progress, Alert, Tooltip, DatePicker, Table, Tag, type TableColumn } from '../components/ui';

type ViewMode = 'realtime' | 'historical';

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');

  const [siteId, setSiteId] = useState<number | undefined>();
  const [laboratoryId, setLaboratoryId] = useState<number | undefined>();
  const [dateStart, setDateStart] = useState<Dayjs>(dayjs().subtract(7, 'day'));
  const [dateEnd, setDateEnd] = useState<Dayjs>(dayjs());

  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [equipmentUtil, setEquipmentUtil] = useState<EquipmentUtilization[]>([]);
  const [personnelEff, setPersonnelEff] = useState<PersonnelEfficiency[]>([]);
  const [taskStats, setTaskStats] = useState<TaskCompletionStats | null>(null);
  const [slaPerf, setSLAPerf] = useState<SLAPerformance | null>(null);
  const [workload, setWorkload] = useState<WorkloadAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const getQueryParams = useCallback(() => {
    const params: Record<string, string | number | undefined> = {};
    if (laboratoryId) params.laboratory_id = laboratoryId;
    if (siteId) params.site_id = siteId;
    if (viewMode === 'historical') {
      params.start_date = dateStart.format('YYYY-MM-DD');
      params.end_date = dateEnd.format('YYYY-MM-DD');
    }
    return params;
  }, [laboratoryId, siteId, viewMode, dateStart, dateEnd]);

  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = getQueryParams();

      if (viewMode === 'realtime') {
        const results = await Promise.allSettled([
          dashboardService.getSummary({ ...params, signal }),
          dashboardService.getEquipmentUtilization({ ...params, start_date: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), signal }),
          dashboardService.getPersonnelEfficiency({ ...params, start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), signal }),
          dashboardService.getTaskCompletion({ ...params, start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), signal }),
          dashboardService.getSLAPerformance({ ...params, start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), signal }),
          dashboardService.getWorkloadAnalysis({ ...params, start_date: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), signal }),
        ]);

        const apiNames = ['摘要数据', '设备利用率', '人员效率', '任务完成率', 'SLA性能', '工作负载分析'];
        const failedApis: string[] = [];
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            if (!isAbortError(result.reason)) {
              failedApis.push(apiNames[index]);
              console.error(`Dashboard API error (${apiNames[index]}):`, result.reason);
            }
          }
        });

        if (failedApis.length > 0) {
          setError(`获取以下数据失败: ${failedApis.join(', ')}`);
        }

        if (results[0].status === 'fulfilled') setSummary(results[0].value);
        if (results[1].status === 'fulfilled') setEquipmentUtil(results[1].value.slice(0, 10));
        if (results[2].status === 'fulfilled') setPersonnelEff(results[2].value.slice(0, 10));
        if (results[3].status === 'fulfilled') setTaskStats(results[3].value);
        if (results[4].status === 'fulfilled') setSLAPerf(results[4].value);
        if (results[5].status === 'fulfilled') setWorkload(results[5].value);
      } else {
        const results = await Promise.allSettled([
          dashboardService.getEquipmentUtilization({ ...params, signal }),
          dashboardService.getPersonnelEfficiency({ ...params, signal }),
          dashboardService.getTaskCompletion({ ...params, signal }),
          dashboardService.getSLAPerformance({ ...params, signal }),
          dashboardService.getWorkloadAnalysis({ ...params, signal }),
        ]);

        const apiNames = ['设备利用率', '人员效率', '任务完成率', 'SLA性能', '工作负载分析'];
        const failedApis: string[] = [];
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            if (!isAbortError(result.reason)) {
              failedApis.push(apiNames[index]);
              console.error(`Dashboard API error (${apiNames[index]}):`, result.reason);
            }
          }
        });

        if (failedApis.length > 0) {
          setError(`获取以下数据失败: ${failedApis.join(', ')}`);
        }

        setSummary(null);
        if (results[0].status === 'fulfilled') setEquipmentUtil(results[0].value.slice(0, 15));
        if (results[1].status === 'fulfilled') setPersonnelEff(results[1].value.slice(0, 15));
        if (results[2].status === 'fulfilled') setTaskStats(results[2].value);
        if (results[3].status === 'fulfilled') setSLAPerf(results[3].value);
        if (results[4].status === 'fulfilled') setWorkload(results[4].value);
      }
      setLastUpdated(new Date());
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Dashboard fetch error:', err);
        setError('获取仪表板数据失败，请检查网络连接或刷新页面重试');
      }
    } finally {
      setLoading(false);
    }
  }, [getQueryParams, viewMode]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchDashboard(controller.signal);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (viewMode === 'realtime') {
      interval = setInterval(() => {
        const refreshController = new AbortController();
        abortControllerRef.current = refreshController;
        fetchDashboard(refreshController.signal);
      }, 5 * 60 * 1000);
    }
    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboard, viewMode]);

  const handleExportEquipment = () => {
    const csv = dashboardService.exportEquipmentUtilizationCSV(equipmentUtil);
    const filename = `equipment_utilization_${dayjs().format('YYYYMMDD')}.csv`;
    dashboardService.downloadCSV(csv, filename);
  };

  const handleExportPersonnel = () => {
    const csv = dashboardService.exportPersonnelEfficiencyCSV(personnelEff);
    const filename = `personnel_efficiency_${dayjs().format('YYYYMMDD')}.csv`;
    dashboardService.downloadCSV(csv, filename);
  };

  const handleExportWorkload = () => {
    const csv = dashboardService.exportWorkloadCSV(workload);
    const filename = `workload_analysis_${dayjs().format('YYYYMMDD')}.csv`;
    dashboardService.downloadCSV(csv, filename);
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

  const taskPieData = taskStats
    ? [
        { name: 'Completed', value: taskStats.completed_tasks, color: '#22c55e' },
        { name: 'Pending', value: taskStats.total_tasks - taskStats.completed_tasks, color: '#3b82f6' },
      ]
    : [];

  const slaPieData = slaPerf
    ? [
        { name: 'On Time', value: slaPerf.on_time_count, color: '#22c55e' },
        { name: 'Overdue', value: slaPerf.overdue_count, color: '#ef4444' },
      ]
    : [];

  const taskPerformanceData = taskStats
    ? [
        { name: 'On Time', value: taskStats.on_time_tasks, color: '#22c55e' },
        { name: 'Delayed', value: taskStats.delayed_tasks, color: '#f59e0b' },
      ]
    : [];

  const personnelColumns: TableColumn<PersonnelEfficiency>[] = [
    { title: 'Employee ID', dataIndex: 'employee_id', width: 100 },
    { title: 'Tasks', dataIndex: 'total_tasks', width: 70, align: 'center' },
    { title: 'Completed', dataIndex: 'completed_tasks', width: 80, align: 'center' },
    {
      title: 'Cycle Variance',
      dataIndex: 'average_cycle_variance',
      width: 100,
      align: 'center',
      render: (val: unknown) => {
        const value = val as number | undefined;
        if (value === null || value === undefined) return '-';
        const color = value <= 0 ? '#22c55e' : value <= 2 ? '#f59e0b' : '#ef4444';
        return <span style={{ color }}>{value > 0 ? '+' : ''}{value.toFixed(1)}h</span>;
      },
    },
    {
      title: 'Efficiency',
      dataIndex: 'efficiency_rate',
      width: 100,
      render: (rate: unknown) => (
        <Progress
          percent={rate as number}
          size="small"
          status={(rate as number) >= 90 ? 'success' : (rate as number) >= 70 ? 'active' : 'exception'}
          format={(p) => `${p?.toFixed(0)}%`}
        />
      ),
    },
  ];

  if (error) {
    return <Alert message={error} type="error" className="m-6" />;
  }

  return (
    <div>
      {/* Header with controls */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {viewMode === 'realtime' ? 'Real-time Dashboard' : 'Historical Analysis'}
            </h1>
            {lastUpdated && (
              <p className="text-xs text-neutral-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-md overflow-hidden border border-neutral-200">
              <button
                onClick={() => setViewMode('realtime')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'realtime' ? 'bg-primary-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                <ChartBarIcon className="w-4 h-4" />
                Real-time
              </button>
              <button
                onClick={() => setViewMode('historical')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'historical' ? 'bg-primary-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                <HistoryIcon className="w-4 h-4" />
                Historical
              </button>
            </div>

            {viewMode === 'historical' && (
              <div className="flex items-center gap-2">
                <DatePicker
                  value={dateStart}
                  onChange={(date) => date && setDateStart(date)}
                  size="small"
                />
                <span className="text-neutral-400">-</span>
                <DatePicker
                  value={dateEnd}
                  onChange={(date) => date && setDateEnd(date)}
                  size="small"
                />
              </div>
            )}

            <Select
              placeholder="All Sites"
              value={siteId}
              onChange={handleSiteChange}
              allowClear
              className="w-36"
              options={sites.map(s => ({ label: s.name, value: s.id }))}
            />

            <Select
              placeholder="All Laboratories"
              value={laboratoryId}
              onChange={handleLabChange}
              allowClear
              className="w-44"
              options={filteredLaboratories.map(l => ({ label: l.name, value: l.id }))}
            />

            <Tooltip title="Refresh">
              <Button
                variant="default"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={() => fetchDashboard()}
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Real-time Summary Cards */}
          {viewMode === 'realtime' && summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Personnel</p>
                    <p className="text-2xl font-semibold">
                      {summary.available_personnel}
                      <span className="text-sm text-neutral-400">/ {summary.total_personnel}</span>
                    </p>
                  </div>
                </div>
                <Progress
                  percent={summary.total_personnel ? Math.round((summary.available_personnel / summary.total_personnel) * 100) : 0}
                  size="small"
                  showInfo={false}
                  className="mt-2"
                />
                <p className="text-xs text-neutral-500 mt-1">Available</p>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <WrenchScrewdriverIcon className="w-8 h-8 text-success-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Equipment</p>
                    <p className="text-2xl font-semibold">
                      {summary.available_equipment}
                      <span className="text-sm text-neutral-400">/ {summary.total_equipment}</span>
                    </p>
                  </div>
                </div>
                <Progress
                  percent={summary.total_equipment ? Math.round((summary.available_equipment / summary.total_equipment) * 100) : 0}
                  size="small"
                  strokeColor="success"
                  showInfo={false}
                  className="mt-2"
                />
                <p className="text-xs text-neutral-500 mt-1">Available</p>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-warning-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Active Work Orders</p>
                    <p className={`text-2xl font-semibold ${summary.overdue_work_orders ? 'text-error-500' : ''}`}>
                      {summary.active_work_orders}
                    </p>
                  </div>
                </div>
                {summary.overdue_work_orders > 0 && (
                  <Tag color="error" className="mt-2">
                    <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />
                    {summary.overdue_work_orders} overdue
                  </Tag>
                )}
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <InboxIcon className="w-8 h-8 text-info-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Pending Materials</p>
                    <p className={`text-2xl font-semibold ${summary.overdue_materials ? 'text-error-500' : ''}`}>
                      {summary.pending_materials}
                    </p>
                  </div>
                </div>
                {summary.overdue_materials > 0 && (
                  <Tag color="error" className="mt-2">
                    <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />
                    {summary.overdue_materials} overdue
                  </Tag>
                )}
              </div>
            </div>
          )}

          {/* Historical Summary Stats */}
          {viewMode === 'historical' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Total Tasks</p>
                    <p className="text-2xl font-semibold">{taskStats?.total_tasks || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2">In period</p>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8 text-success-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Completion Rate</p>
                    <p className={`text-2xl font-semibold ${(taskStats?.completion_rate || 0) >= 80 ? 'text-success-500' : 'text-warning-500'}`}>
                      {taskStats?.completion_rate || 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">SLA Compliance</p>
                    <p className={`text-2xl font-semibold ${(slaPerf?.sla_compliance_rate || 0) >= 90 ? 'text-success-500' : 'text-error-500'}`}>
                      {slaPerf?.sla_compliance_rate || 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <HistoryIcon className="w-8 h-8 text-info-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Avg Completion Days</p>
                    <p className="text-2xl font-semibold">
                      {slaPerf?.average_days_to_complete?.toFixed(1) || '-'}
                      <span className="text-sm text-neutral-400 ml-1">days</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task Completion & SLA Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">Task Completion</h3>
              <div className="grid grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {taskPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center">
                  <div className="mb-4">
                    <p className="text-xs text-neutral-500">Completion Rate</p>
                    <p className="text-xl font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="w-5 h-5 text-success-500" />
                      {taskStats?.completion_rate || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">On-Time Rate</p>
                    <p className="text-xl font-semibold flex items-center gap-1">
                      <ClockIcon className="w-5 h-5 text-primary-500" />
                      {taskStats?.on_time_rate || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">SLA Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={slaPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {slaPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center">
                  <div className="mb-4">
                    <p className="text-xs text-neutral-500">SLA Compliance</p>
                    <p className={`text-xl font-semibold ${(slaPerf?.sla_compliance_rate || 0) >= 90 ? 'text-success-500' : 'text-error-500'}`}>
                      {slaPerf?.sla_compliance_rate || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Avg Completion Days</p>
                    <p className="text-xl font-semibold">
                      {slaPerf?.average_days_to_complete?.toFixed(1) || '-'} days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cycle Performance & Workload Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-4">Task Cycle Performance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={taskPerformanceData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {taskPerformanceData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <hr className="my-3 border-neutral-200" />
              <div className="flex gap-8">
                <div>
                  <span className="text-xs text-neutral-500">On-Time Tasks:</span>{' '}
                  <span className="font-medium text-success-500">{taskStats?.on_time_tasks || 0}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Delayed Tasks:</span>{' '}
                  <span className="font-medium text-warning-500">{taskStats?.delayed_tasks || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-neutral-700">Daily Workload Trend</h3>
                <Tooltip title="Export CSV">
                  <Button
                    variant="text"
                    size="small"
                    icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={handleExportWorkload}
                  />
                </Tooltip>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={workload}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => dayjs(date).format('MM/DD')}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip
                    labelFormatter={(date) => dayjs(date).format('YYYY-MM-DD')}
                    formatter={(value) => [(value as number).toFixed(1)]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_work_hours"
                    name="Work Hours"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tasks_completed"
                    name="Tasks Completed"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Equipment Utilization & Personnel Efficiency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-neutral-700">
                  Equipment Utilization {viewMode === 'historical' ? '' : '(7 Days)'}
                </h3>
                <Tooltip title="Export CSV">
                  <Button
                    variant="text"
                    size="small"
                    icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={handleExportEquipment}
                  />
                </Tooltip>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={equipmentUtil} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="equipment_name" width={100} tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Utilization']} />
                  <Bar dataKey="utilization_rate" radius={[0, 4, 4, 0]}>
                    {equipmentUtil.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.utilization_rate >= 80 ? '#22c55e' :
                          entry.utilization_rate >= 50 ? '#3b82f6' :
                          entry.utilization_rate >= 30 ? '#f59e0b' : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-neutral-700">
                  Personnel Efficiency {viewMode === 'historical' ? '' : '(30 Days)'}
                </h3>
                <Tooltip title="Export CSV">
                  <Button
                    variant="text"
                    size="small"
                    icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={handleExportPersonnel}
                  />
                </Tooltip>
              </div>
              <Table
                dataSource={personnelEff}
                rowKey="personnel_id"
                columns={personnelColumns}
                size="small"
                scroll={{ y: 300 }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
