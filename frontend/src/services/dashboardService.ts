import api from './api';

export interface DashboardSummary {
  total_personnel: number;
  available_personnel: number;
  total_equipment: number;
  available_equipment: number;
  active_work_orders: number;
  overdue_work_orders: number;
  pending_materials: number;
  overdue_materials: number;
}

export interface EquipmentUtilization {
  equipment_id: number;
  equipment_name: string;
  equipment_type: string;
  total_hours: number;
  scheduled_hours: number;
  utilization_rate: number;
}

export interface PersonnelEfficiency {
  personnel_id: number;
  employee_id: string;
  total_tasks: number;
  completed_tasks: number;
  average_cycle_variance?: number;
  efficiency_rate: number;
}

export interface TaskCompletionStats {
  total_tasks: number;
  completed_tasks: number;
  on_time_tasks: number;
  delayed_tasks: number;
  completion_rate: number;
  on_time_rate: number;
}

export interface SLAPerformance {
  total_work_orders: number;
  on_time_count: number;
  overdue_count: number;
  sla_compliance_rate: number;
  average_days_to_complete?: number;
}

export interface WorkloadAnalysis {
  date: string;
  total_work_hours: number;
  personnel_count: number;
  average_hours_per_person: number;
  tasks_completed: number;
}

export interface CyclePerformance {
  task_category: string;
  standard_hours: number;
  average_actual_hours: number;
  min_hours: number;
  max_hours: number;
  variance: number;
  sample_count: number;
}

export interface EquipmentCategoryStats {
  category: string;
  category_name_zh: string;
  category_name_en: string;
  total_count: number;
  available_count: number;
  in_use_count: number;
  maintenance_count: number;
  utilization_rate: number;
}

export interface EquipmentDashboardResponse {
  total_equipment: number;
  available_equipment: number;
  by_category: EquipmentCategoryStats[];
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  utilization_by_category: Array<{
    category: string;
    category_name_zh: string;
    category_name_en: string;
    utilization_rate: number;
    total_hours: number;
    scheduled_hours: number;
  }>;
  generated_at: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  equipment_utilization: EquipmentUtilization[];
  personnel_efficiency: PersonnelEfficiency[];
  task_completion: TaskCompletionStats;
  sla_performance: SLAPerformance;
  generated_at: string;
}

export interface DashboardParams {
  laboratory_id?: number;
  site_id?: number;
  signal?: AbortSignal;
}

export interface DateRangeParams extends DashboardParams {
  start_date?: string;
  end_date?: string;
}

// Gantt chart data types
export interface GanttSchedule {
  id: number;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  work_order_id: number | null;
  task_id: number | null;
  operator_name: string | null;
}

export interface GanttEquipment {
  id: number;
  name: string;
  code: string;
  equipment_type: string;
  category: string;
  status: string;
  laboratory_id: number;
  schedules: GanttSchedule[];
}

export interface GanttDataResponse {
  start_date: string;
  end_date: string;
  equipment: GanttEquipment[];
  total_equipment: number;
  total_schedules: number;
}

// Personnel Gantt chart data types
export interface PersonnelGanttSchedule {
  id: number;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  work_order_id: number | null;
  work_order_number: string | null;
  task_number: string;
  equipment_name: string | null;
}

export interface PersonnelGanttItem {
  id: number;
  name: string;
  employee_id: string;
  role: string;
  department: string;
  status: string;
  laboratory_id: number;
  laboratory_name: string;
  schedules: PersonnelGanttSchedule[];
}

export interface PersonnelGanttDataResponse {
  start_date: string;
  end_date: string;
  personnel: PersonnelGanttItem[];
  total_personnel: number;
  total_schedules: number;
}

export const dashboardService = {
  async getDashboard(params: DashboardParams = {}): Promise<DashboardResponse> {
    const { signal, ...queryParams } = params;
    const response = await api.get<DashboardResponse>('/dashboard', { params: queryParams, signal });
    return response.data;
  },

  async getSummary(params: DashboardParams = {}): Promise<DashboardSummary> {
    const { signal, ...queryParams } = params;
    const response = await api.get<DashboardSummary>('/dashboard/summary', { params: queryParams, signal });
    return response.data;
  },

  async getEquipmentUtilization(params: DateRangeParams = {}): Promise<EquipmentUtilization[]> {
    const { signal, ...queryParams } = params;
    const response = await api.get<EquipmentUtilization[]>('/dashboard/equipment-utilization', { params: queryParams, signal });
    return response.data;
  },

  async getPersonnelEfficiency(params: DateRangeParams = {}): Promise<PersonnelEfficiency[]> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PersonnelEfficiency[]>('/dashboard/personnel-efficiency', { params: queryParams, signal });
    return response.data;
  },

  async getTaskCompletion(params: DateRangeParams = {}): Promise<TaskCompletionStats> {
    const { signal, ...queryParams } = params;
    const response = await api.get<TaskCompletionStats>('/dashboard/task-completion', { params: queryParams, signal });
    return response.data;
  },

  async getSLAPerformance(params: DateRangeParams = {}): Promise<SLAPerformance> {
    const { signal, ...queryParams } = params;
    const response = await api.get<SLAPerformance>('/dashboard/sla-performance', { params: queryParams, signal });
    return response.data;
  },

  async getWorkloadAnalysis(params: DateRangeParams = {}): Promise<WorkloadAnalysis[]> {
    const { signal, ...queryParams } = params;
    const response = await api.get<WorkloadAnalysis[]>('/dashboard/workload-analysis', { params: queryParams, signal });
    return response.data;
  },

  async getEquipmentDashboard(params: DateRangeParams = {}): Promise<EquipmentDashboardResponse> {
    const { signal, ...queryParams } = params;
    const response = await api.get<EquipmentDashboardResponse>('/dashboard/equipment-dashboard', { params: queryParams, signal });
    return response.data;
  },

  async getGanttData(params: DateRangeParams = {}): Promise<GanttDataResponse> {
    const { signal, ...queryParams } = params;
    const response = await api.get<GanttDataResponse>('/equipment/schedules/gantt', { params: queryParams, signal });
    return response.data;
  },

  async getPersonnelGanttData(params: DateRangeParams & { department?: string } = {}): Promise<PersonnelGanttDataResponse> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PersonnelGanttDataResponse>('/personnel/schedules/gantt', { params: queryParams, signal });
    return response.data;
  },

  // CSV Export helpers
  exportEquipmentUtilizationCSV(data: EquipmentUtilization[]): string {
    const headers = ['Equipment ID', 'Equipment Name', 'Type', 'Total Hours', 'Scheduled Hours', 'Utilization Rate (%)'];
    const rows = data.map(d => [
      d.equipment_id,
      d.equipment_name,
      d.equipment_type,
      d.total_hours.toFixed(2),
      d.scheduled_hours.toFixed(2),
      d.utilization_rate.toFixed(2),
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  exportPersonnelEfficiencyCSV(data: PersonnelEfficiency[]): string {
    const headers = ['Personnel ID', 'Employee ID', 'Total Tasks', 'Completed Tasks', 'Avg Cycle Variance (hrs)', 'Efficiency Rate (%)'];
    const rows = data.map(d => [
      d.personnel_id,
      d.employee_id,
      d.total_tasks,
      d.completed_tasks,
      d.average_cycle_variance?.toFixed(2) ?? '',
      d.efficiency_rate.toFixed(2),
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  exportWorkloadCSV(data: WorkloadAnalysis[]): string {
    const headers = ['Date', 'Total Work Hours', 'Personnel Count', 'Avg Hours/Person', 'Tasks Completed'];
    const rows = data.map(d => [
      d.date,
      d.total_work_hours.toFixed(2),
      d.personnel_count,
      d.average_hours_per_person.toFixed(2),
      d.tasks_completed,
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
