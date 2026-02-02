import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, Line,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { Card, Button, Select, Spin, Progress, Alert, Tooltip, DatePicker, Table, Tag, Space, Row, Col, Segmented, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { dashboardService } from '../services/dashboardService';
import { siteService } from '../services/siteService';
import { laboratoryService } from '../services/laboratoryService';
import { isAbortError } from '../services/api';
import type {
  DashboardSummary, EquipmentUtilization, PersonnelEfficiency,
  TaskCompletionStats, SLAPerformance, WorkloadAnalysis,
} from '../services/dashboardService';
import type { Site, Laboratory } from '../types';

const { Text, Title } = Typography;

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

  const taskPieData = taskStats
    ? [
        { name: 'Completed', value: taskStats.completed_tasks, color: '#52c41a' },
        { name: 'Pending', value: taskStats.total_tasks - taskStats.completed_tasks, color: '#1677ff' },
      ]
    : [];

  const slaPieData = slaPerf
    ? [
        { name: 'On Time', value: slaPerf.on_time_count, color: '#52c41a' },
        { name: 'Overdue', value: slaPerf.overdue_count, color: '#ff4d4f' },
      ]
    : [];

  const taskPerformanceData = taskStats
    ? [
        { name: 'On Time', value: taskStats.on_time_tasks, color: '#52c41a' },
        { name: 'Delayed', value: taskStats.delayed_tasks, color: '#faad14' },
      ]
    : [];

  const personnelColumns: ColumnsType<PersonnelEfficiency> = [
    { title: 'Employee ID', dataIndex: 'employee_id', width: 100 },
    { title: 'Tasks', dataIndex: 'total_tasks', width: 70, align: 'center' },
    { title: 'Completed', dataIndex: 'completed_tasks', width: 80, align: 'center' },
    {
      title: 'Cycle Variance',
      dataIndex: 'average_cycle_variance',
      width: 100,
      align: 'center',
      render: (value: number | undefined) => {
        if (value === null || value === undefined) return '-';
        const color = value <= 0 ? '#52c41a' : value <= 2 ? '#faad14' : '#ff4d4f';
        return <span style={{ color }}>{value > 0 ? '+' : ''}{value.toFixed(1)}h</span>;
      },
    },
    {
      title: 'Efficiency',
      dataIndex: 'efficiency_rate',
      width: 100,
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 90 ? 'success' : rate >= 70 ? 'active' : 'exception'}
          format={(p) => `${p?.toFixed(0)}%`}
        />
      ),
    },
  ];

  if (error) {
    return <Alert message={error} type="error" style={{ margin: 24 }} />;
  }

  return (
    <div>
      {/* Header with controls */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {viewMode === 'realtime' ? 'Real-time Dashboard' : 'Historical Analysis'}
            </Title>
            {lastUpdated && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </div>
          <Space wrap>
            {/* View Mode Toggle */}
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { label: <Space><BarChartOutlined />Real-time</Space>, value: 'realtime' },
                { label: <Space><HistoryOutlined />Historical</Space>, value: 'historical' },
              ]}
            />

            {viewMode === 'historical' && (
              <Space>
                <DatePicker
                  value={dateStart}
                  onChange={(date) => date && setDateStart(date)}
                  size="middle"
                />
                <span style={{ color: '#999' }}>-</span>
                <DatePicker
                  value={dateEnd}
                  onChange={(date) => date && setDateEnd(date)}
                  size="middle"
                />
              </Space>
            )}

            <Select
              placeholder="All Sites"
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
              placeholder="All Laboratories"
              value={laboratoryId}
              onChange={setLaboratoryId}
              allowClear
              style={{ width: 180 }}
              options={filteredLaboratories.map(l => ({ label: l.name, value: l.id }))}
            />

            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchDashboard()}
                loading={loading}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>Loading dashboard data...</Text>
        </div>
      ) : (
        <>
          {/* Real-time Summary Cards */}
          {viewMode === 'realtime' && summary && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Personnel</Text>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>
                        {summary.available_personnel}
                        <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>/ {summary.total_personnel}</Text>
                      </div>
                    </div>
                  </div>
                  <Progress
                    percent={summary.total_personnel ? Math.round((summary.available_personnel / summary.total_personnel) * 100) : 0}
                    size="small"
                    showInfo={false}
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>Available</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ToolOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Equipment</Text>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>
                        {summary.available_equipment}
                        <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>/ {summary.total_equipment}</Text>
                      </div>
                    </div>
                  </div>
                  <Progress
                    percent={summary.total_equipment ? Math.round((summary.available_equipment / summary.total_equipment) * 100) : 0}
                    size="small"
                    strokeColor="#52c41a"
                    showInfo={false}
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>Available</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileTextOutlined style={{ fontSize: 32, color: '#faad14' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Active Work Orders</Text>
                      <div style={{ fontSize: 24, fontWeight: 600, color: summary.overdue_work_orders ? '#ff4d4f' : undefined }}>
                        {summary.active_work_orders}
                      </div>
                    </div>
                  </div>
                  {summary.overdue_work_orders > 0 && (
                    <Tag color="error" style={{ marginTop: 8 }}>
                      <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                      {summary.overdue_work_orders} overdue
                    </Tag>
                  )}
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <InboxOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Pending Materials</Text>
                      <div style={{ fontSize: 24, fontWeight: 600, color: summary.overdue_materials ? '#ff4d4f' : undefined }}>
                        {summary.pending_materials}
                      </div>
                    </div>
                  </div>
                  {summary.overdue_materials > 0 && (
                    <Tag color="error" style={{ marginTop: 8 }}>
                      <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                      {summary.overdue_materials} overdue
                    </Tag>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* Historical Summary Stats */}
          {viewMode === 'historical' && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileTextOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Total Tasks</Text>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{taskStats?.total_tasks || 0}</div>
                    </div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>In period</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Completion Rate</Text>
                      <div style={{ fontSize: 24, fontWeight: 600, color: (taskStats?.completion_rate || 0) >= 80 ? '#52c41a' : '#faad14' }}>
                        {taskStats?.completion_rate || 0}%
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ClockCircleOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>SLA Compliance</Text>
                      <div style={{ fontSize: 24, fontWeight: 600, color: (slaPerf?.sla_compliance_rate || 0) >= 90 ? '#52c41a' : '#ff4d4f' }}>
                        {slaPerf?.sla_compliance_rate || 0}%
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HistoryOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 14 }}>Avg Completion Days</Text>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>
                        {slaPerf?.average_days_to_complete?.toFixed(1) || '-'}
                        <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>days</Text>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          {/* Task Completion & SLA Performance */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="Task Completion">
                <Row gutter={16}>
                  <Col span={12}>
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
                  </Col>
                  <Col span={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Completion Rate</Text>
                      <div style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        {taskStats?.completion_rate || 0}%
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>On-Time Rate</Text>
                      <div style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined style={{ color: '#1677ff' }} />
                        {taskStats?.on_time_rate || 0}%
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="SLA Performance">
                <Row gutter={16}>
                  <Col span={12}>
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
                  </Col>
                  <Col span={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>SLA Compliance</Text>
                      <div style={{ fontSize: 20, fontWeight: 600, color: (slaPerf?.sla_compliance_rate || 0) >= 90 ? '#52c41a' : '#ff4d4f' }}>
                        {slaPerf?.sla_compliance_rate || 0}%
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Avg Completion Days</Text>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>
                        {slaPerf?.average_days_to_complete?.toFixed(1) || '-'} days
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Cycle Performance & Workload Trend */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="Task Cycle Performance">
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
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12, display: 'flex', gap: 32 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>On-Time Tasks:</Text>{' '}
                    <span style={{ fontWeight: 500, color: '#52c41a' }}>{taskStats?.on_time_tasks || 0}</span>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Delayed Tasks:</Text>{' '}
                    <span style={{ fontWeight: 500, color: '#faad14' }}>{taskStats?.delayed_tasks || 0}</span>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                size="small" 
                title="Daily Workload Trend"
                extra={
                  <Tooltip title="Export CSV">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={handleExportWorkload}
                    />
                  </Tooltip>
                }
              >
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
                      stroke="#1677ff"
                      fill="#1677ff"
                      fillOpacity={0.3}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="tasks_completed"
                      name="Tasks Completed"
                      stroke="#52c41a"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Equipment Utilization & Personnel Efficiency */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card 
                size="small" 
                title={`Equipment Utilization ${viewMode === 'historical' ? '' : '(7 Days)'}`}
                extra={
                  <Tooltip title="Export CSV">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={handleExportEquipment}
                    />
                  </Tooltip>
                }
              >
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
                            entry.utilization_rate >= 80 ? '#52c41a' :
                            entry.utilization_rate >= 50 ? '#1677ff' :
                            entry.utilization_rate >= 30 ? '#faad14' : '#ff4d4f'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                size="small" 
                title={`Personnel Efficiency ${viewMode === 'historical' ? '' : '(30 Days)'}`}
                extra={
                  <Tooltip title="Export CSV">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={handleExportPersonnel}
                    />
                  </Tooltip>
                }
              >
                <Table
                  dataSource={personnelEff}
                  rowKey="personnel_id"
                  columns={personnelColumns}
                  size="small"
                  scroll={{ y: 300 }}
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
