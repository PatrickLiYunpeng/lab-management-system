export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  ENGINEER: 'engineer',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  primary_laboratory_id?: number;
  primary_site_id?: number;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Site {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const LaboratoryType = {
  FA: 'fa',
  RELIABILITY: 'reliability',
} as const;
export type LaboratoryType = typeof LaboratoryType[keyof typeof LaboratoryType];

export interface Laboratory {
  id: number;
  name: string;
  code: string;
  lab_type: LaboratoryType;
  description?: string;
  site_id: number;
  max_capacity?: number;
  manager_name?: string;
  manager_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  site?: Site;
}

export const PersonnelStatus = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  ON_LEAVE: 'on_leave',
  BORROWED: 'borrowed',
} as const;
export type PersonnelStatus = typeof PersonnelStatus[keyof typeof PersonnelStatus];

export const ProficiencyLevel = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;
export type ProficiencyLevel = typeof ProficiencyLevel[keyof typeof ProficiencyLevel];

export interface Personnel {
  id: number;
  employee_id: string;
  user_id: number;
  primary_laboratory_id: number;
  primary_site_id: number;
  current_laboratory_id?: number;
  current_site_id?: number;
  job_title?: string;
  department?: string;
  status: PersonnelStatus;
  hire_date?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  primary_laboratory?: Laboratory;
  primary_site?: Site;
}

export interface Skill {
  id: number;
  name: string;
  code: string;
  category: string;
  description?: string;
  requires_certification: boolean;
  certification_validity_days?: number;
  lab_type?: string;
  is_active: boolean;
}

export interface PersonnelSkill {
  id: number;
  personnel_id: number;
  skill_id: number;
  proficiency_level: ProficiencyLevel;
  is_certified: boolean;
  certification_date?: string;
  certification_expiry?: string;
  certificate_number?: string;
  skill?: Skill;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Site form types
export interface SiteFormData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active?: boolean;
}

// Laboratory form types
export interface LaboratoryFormData {
  name: string;
  code: string;
  lab_type: LaboratoryType;
  site_id: number;
  description?: string;
  max_capacity?: number;
  manager_name?: string;
  manager_email?: string;
  is_active?: boolean;
}

// Laboratory filter types
export interface LaboratoryFilters {
  site_id?: number;
  lab_type?: LaboratoryType;
  search?: string;
}

// Personnel form types
export interface PersonnelFormData {
  employee_id: string;
  user_id: number;
  primary_laboratory_id: number;
  primary_site_id: number;
  job_title?: string;
  department?: string;
  hire_date?: string;
}

// Personnel update form types
export interface PersonnelUpdateData {
  employee_id?: string;
  primary_laboratory_id?: number;
  primary_site_id?: number;
  current_laboratory_id?: number;
  current_site_id?: number;
  job_title?: string;
  department?: string;
  status?: PersonnelStatus;
  hire_date?: string;
}

// Personnel filter types
export interface PersonnelFilters {
  laboratory_id?: number;
  site_id?: number;
  status?: PersonnelStatus;
  search?: string;
}

// Equipment types
export const EquipmentType = {
  AUTONOMOUS: 'autonomous',
  OPERATOR_DEPENDENT: 'operator_dependent',
} as const;
export type EquipmentType = typeof EquipmentType[keyof typeof EquipmentType];

export const EquipmentStatus = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
  RESERVED: 'reserved',
} as const;
export type EquipmentStatus = typeof EquipmentStatus[keyof typeof EquipmentStatus];

export const EquipmentCategory = {
  THERMAL: 'thermal',
  MECHANICAL: 'mechanical',
  ELECTRICAL: 'electrical',
  OPTICAL: 'optical',
  ANALYTICAL: 'analytical',
  ENVIRONMENTAL: 'environmental',
  MEASUREMENT: 'measurement',
  OTHER: 'other',
} as const;
export type EquipmentCategory = typeof EquipmentCategory[keyof typeof EquipmentCategory];

// New database-backed equipment category and name types (设备类别和设备名 - 数据库管理)
export interface EquipmentCategoryRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCategoryWithNames extends EquipmentCategoryRecord {
  equipment_names: EquipmentNameRecord[];
}

export interface EquipmentNameRecord {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentNameWithCategory extends EquipmentNameRecord {
  category?: EquipmentCategoryRecord;
}

// Equipment category form types
export interface EquipmentCategoryFormData {
  name: string;
  code: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface EquipmentCategoryUpdateData extends Partial<EquipmentCategoryFormData> {}

// Equipment name form types
export interface EquipmentNameFormData {
  category_id: number;
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface EquipmentNameUpdateData extends Partial<Omit<EquipmentNameFormData, 'category_id'>> {}

export interface Equipment {
  id: number;
  name: string;
  code: string;
  equipment_type: EquipmentType;
  category?: EquipmentCategory;
  category_id?: number;
  equipment_name_id?: number;
  laboratory_id: number;
  site_id: number;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  description?: string;
  capacity?: number;
  uph?: number;
  max_concurrent_tasks: number;
  status: EquipmentStatus;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_days?: number;
  last_calibration_date?: string;
  next_calibration_date?: string;
  calibration_interval_days?: number;
  purchase_date?: string;
  warranty_expiry?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  laboratory?: Laboratory;
  site?: Site;
  equipment_category?: EquipmentCategoryRecord;
  equipment_name?: EquipmentNameRecord;
}

// Equipment form types
export interface EquipmentFormData {
  name: string;
  code: string;
  equipment_type: EquipmentType;
  category?: EquipmentCategory;
  category_id?: number;
  equipment_name_id?: number;
  laboratory_id: number;
  site_id: number;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  description?: string;
  capacity?: number;
  uph?: number;
  max_concurrent_tasks?: number;
  maintenance_interval_days?: number;
  calibration_interval_days?: number;
  purchase_date?: string;
  warranty_expiry?: string;
}

// Equipment update form types
export interface EquipmentUpdateData extends Partial<EquipmentFormData> {
  status?: EquipmentStatus;
  is_active?: boolean;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  last_calibration_date?: string;
  next_calibration_date?: string;
}

// Equipment filter types
export interface EquipmentFilters {
  laboratory_id?: number;
  site_id?: number;
  equipment_type?: EquipmentType;
  category?: EquipmentCategory;
  category_id?: number;
  equipment_name_id?: number;
  status?: EquipmentStatus;
  search?: string;
}

// Equipment capacity types
export interface EquipmentCapacity {
  equipment_id: number;
  equipment_name: string;
  has_capacity_limit: boolean;
  total_capacity?: number;
  available_capacity?: number;
  used_capacity?: number;
  utilization_percentage?: number;
}

// Material types
export const MaterialType = {
  SAMPLE: 'sample',
  CONSUMABLE: 'consumable',
  REAGENT: 'reagent',
  TOOL: 'tool',
  OTHER: 'other',
} as const;
export type MaterialType = typeof MaterialType[keyof typeof MaterialType];

export const MaterialStatus = {
  RECEIVED: 'received',
  IN_STORAGE: 'in_storage',
  ALLOCATED: 'allocated',
  IN_USE: 'in_use',
  PENDING_RETURN: 'pending_return',
  RETURNED: 'returned',
  DISPOSED: 'disposed',
  LOST: 'lost',
} as const;
export type MaterialStatus = typeof MaterialStatus[keyof typeof MaterialStatus];

export const DisposalMethod = {
  RETURN_TO_CLIENT: 'return_to_client',
  ARCHIVE: 'archive',
  RECYCLE: 'recycle',
  HAZARDOUS_DISPOSAL: 'hazardous_disposal',
  STANDARD_DISPOSAL: 'standard_disposal',
} as const;
export type DisposalMethod = typeof DisposalMethod[keyof typeof DisposalMethod];

export interface Material {
  id: number;
  material_code: string;
  name: string;
  material_type: MaterialType;
  description?: string;
  laboratory_id: number;
  site_id: number;
  storage_location?: string;
  client_id?: number;
  client_reference?: string;
  quantity: number;
  unit: string;
  status: MaterialStatus;
  received_at: string;
  storage_deadline?: string;
  processing_deadline?: string;
  current_work_order_id?: number;
  current_task_id?: number;
  current_equipment_id?: number;
  disposal_method?: DisposalMethod;
  disposed_at?: string;
  returned_at?: string;
  created_at: string;
  updated_at: string;
  laboratory?: Laboratory;
  site?: Site;
  client?: Client;
}

export interface Client {
  id: number;
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  default_sla_days: number;
  priority_level: number;
  source_category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Client form types
export interface ClientFormData {
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  default_sla_days?: number;
  priority_level?: number;
  source_category?: string;
}

export interface ClientUpdateData extends Partial<ClientFormData> {
  is_active?: boolean;
}

export interface ClientFilters {
  search?: string;
  is_active?: boolean;
}

// Material form types
export interface MaterialFormData {
  material_code: string;
  name: string;
  material_type: MaterialType;
  description?: string;
  laboratory_id: number;
  site_id: number;
  storage_location?: string;
  client_id?: number;
  client_reference?: string;
  quantity?: number;
  unit?: string;
  storage_deadline?: string;
  processing_deadline?: string;
}

// Material update form types
export interface MaterialUpdateData {
  name?: string;
  description?: string;
  storage_location?: string;
  quantity?: number;
  unit?: string;
  status?: MaterialStatus;
  storage_deadline?: string;
  processing_deadline?: string;
}

// Material filter types
export interface MaterialFilters {
  laboratory_id?: number;
  client_id?: number;
  material_type?: MaterialType;
  status?: MaterialStatus;
  search?: string;
  overdue_only?: boolean;
}

// Non-SAP source types for material replenishment
export const NonSapSource = {
  INTERNAL_TRANSFER: 'internal_transfer',
  EMERGENCY_PURCHASE: 'emergency_purchase',
  GIFT_SAMPLE: 'gift_sample',
  INVENTORY_ADJUSTMENT: 'inventory_adjustment',
  OTHER: 'other',
} as const;
export type NonSapSource = typeof NonSapSource[keyof typeof NonSapSource];

// Replenishment types
export interface Replenishment {
  id: number;
  material_id: number;
  received_date: string;
  quantity_added: number;
  sap_order_no?: string;
  non_sap_source?: NonSapSource;
  notes?: string;
  created_by_id: number;
  created_at: string;
  created_by?: {
    id: number;
    username: string;
    full_name?: string;
  };
}

export interface ReplenishmentFormData {
  received_date: string;
  quantity_added: number;
  sap_order_no?: string;
  non_sap_source?: NonSapSource;
  notes?: string;
}

// Consumption types (材料消耗)
export const ConsumptionStatus = {
  REGISTERED: 'registered',   // 已登记
  VOIDED: 'voided',           // 已作废
} as const;
export type ConsumptionStatus = typeof ConsumptionStatus[keyof typeof ConsumptionStatus];

export interface MaterialBrief {
  id: number;
  material_code: string;
  name: string;
  material_type: MaterialType;
  quantity: number;
  unit: string;
}

export interface Consumption {
  id: number;
  material_id: number;
  task_id: number;
  quantity_consumed: number;
  unit_price?: number;
  total_cost?: number;
  status: ConsumptionStatus;
  notes?: string;
  consumed_at: string;
  created_by_id: number;
  voided_at?: string;
  voided_by_id?: number;
  void_reason?: string;
  replenishment_id?: number;
  material?: MaterialBrief;
  created_by?: {
    id: number;
    username: string;
    full_name?: string;
  };
  voided_by?: {
    id: number;
    username: string;
    full_name?: string;
  };
}

export interface ConsumptionCreateItem {
  material_id: number;
  quantity_consumed: number;
  unit_price?: number;
  notes?: string;
}

export interface ConsumptionBatchCreate {
  consumptions: ConsumptionCreateItem[];
}

export interface ConsumptionVoid {
  void_reason: string;
}

// Work Order types
export const WorkOrderType = {
  FAILURE_ANALYSIS: 'failure_analysis',
  RELIABILITY_TEST: 'reliability_test',
} as const;
export type WorkOrderType = typeof WorkOrderType[keyof typeof WorkOrderType];

export const WorkOrderStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type WorkOrderStatus = typeof WorkOrderStatus[keyof typeof WorkOrderStatus];

export const TaskStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export interface WorkOrder {
  id: number;
  order_number: string;
  title: string;
  description?: string;
  work_order_type: WorkOrderType;
  laboratory_id: number;
  site_id: number;
  client_id?: number;
  product_id?: number;
  material_ids?: number[];
  testing_source?: string;
  sla_deadline?: string;
  priority_score: number;
  priority_level: number;
  assigned_engineer_id?: number;
  status: WorkOrderStatus;
  standard_cycle_hours?: number;
  actual_cycle_hours?: number;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  laboratory?: Laboratory;
  site?: Site;
  client?: Client;
}

export interface MethodBrief {
  id: number;
  name: string;
  code: string;
  method_type: string;
  standard_cycle_hours?: number;
}

export interface WorkOrderTask {
  id: number;
  work_order_id: number;
  task_number: string;
  title: string;
  description?: string;
  sequence: number;
  method_id?: number;
  method?: MethodBrief;
  assigned_technician_id?: number;
  assigned_technician?: PersonnelBrief;
  required_equipment_id?: number;
  required_equipment?: EquipmentBrief;
  scheduled_equipment_id?: number;
  required_capacity?: number;
  status: TaskStatus;
  standard_cycle_hours?: number;
  actual_cycle_hours?: number;
  notes?: string;
  results?: string;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
}

// Work Order form types
export interface WorkOrderFormData {
  title: string;
  description?: string;
  work_order_type: WorkOrderType;
  laboratory_id: number;
  site_id: number;
  client_id?: number;
  product_id?: number;
  material_ids?: number[];
  testing_source?: string;
  sla_deadline?: string;
  standard_cycle_hours?: number;
}

// Work Order update form types
export interface WorkOrderUpdateData {
  title?: string;
  description?: string;
  client_id?: number;
  product_id?: number;
  material_ids?: number[];
  testing_source?: string;
  sla_deadline?: string;
  status?: WorkOrderStatus;
  standard_cycle_hours?: number;
  priority_level?: number;
}

// Work Order filter types
export interface WorkOrderFilters {
  work_order_id?: number;
  laboratory_id?: number;
  client_id?: number;
  work_order_type?: WorkOrderType;
  status?: WorkOrderStatus;
  assigned_engineer_id?: number;
  search?: string;
  overdue_only?: boolean;
}

// Skill types
export const SkillCategory = {
  EQUIPMENT_OPERATION: 'equipment_operation',
  TESTING_METHOD: 'testing_method',
  ANALYSIS_TECHNIQUE: 'analysis_technique',
  SOFTWARE_TOOL: 'software_tool',
  SAFETY_PROCEDURE: 'safety_procedure',
  OTHER: 'other',
} as const;
export type SkillCategory = typeof SkillCategory[keyof typeof SkillCategory];

// Skill form types
export interface SkillFormData {
  name: string;
  code: string;
  category: SkillCategory;
  description?: string;
  requires_certification: boolean;
  certification_validity_days?: number;
  lab_type?: string;
}

// Skill update form types
export interface SkillUpdateData extends Partial<SkillFormData> {
  is_active?: boolean;
}

// Skill filter types
export interface SkillFilters {
  category?: SkillCategory;
  lab_type?: string;
  is_active?: boolean;
  search?: string;
}

// Personnel Skill form types
export interface PersonnelSkillFormData {
  skill_id: number;
  proficiency_level: ProficiencyLevel;
  is_certified?: boolean;
  certification_date?: string;
  certification_expiry?: string;
  certificate_number?: string;
}

// Personnel Skill update form types
export interface PersonnelSkillUpdateData {
  proficiency_level?: ProficiencyLevel;
  is_certified?: boolean;
  certification_date?: string;
  certification_expiry?: string;
  certificate_number?: string;
  assessment_score?: number;
  notes?: string;
}

// Borrow Request types
export const BorrowRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;
export type BorrowRequestStatus = typeof BorrowRequestStatus[keyof typeof BorrowRequestStatus];

export interface BorrowRequest {
  id: number;
  personnel_id: number;
  from_laboratory_id: number;
  to_laboratory_id: number;
  reason?: string;
  start_date: string;
  end_date: string;
  status: BorrowRequestStatus;
  requested_by_id: number;
  approved_by_id?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  personnel?: Personnel;
  from_laboratory?: Laboratory;
  to_laboratory?: Laboratory;
}

// Borrow Request form types
export interface BorrowRequestFormData {
  personnel_id: number;
  to_laboratory_id: number;
  reason?: string;
  start_date: string;
  end_date: string;
}

// Borrow Request filter types
export interface BorrowRequestFilters {
  status?: BorrowRequestStatus;
  laboratory_id?: number;
}

// Shift types
export interface Shift {
  id: number;
  name: string;
  code: string;
  start_time: string;  // "HH:MM:SS" format
  end_time: string;
  laboratory_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  laboratory?: Laboratory;
}

export interface PersonnelShift {
  id: number;
  personnel_id: number;
  shift_id: number;
  effective_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  shift?: Shift;
  personnel?: Personnel;
}

// Shift form types
export interface ShiftFormData {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  laboratory_id?: number;
}

export interface ShiftUpdateData extends Partial<ShiftFormData> {
  is_active?: boolean;
}

export interface ShiftFilters {
  laboratory_id?: number;
  is_active?: boolean;
  search?: string;
}

// PersonnelShift form types
export interface PersonnelShiftFormData {
  shift_id: number;
  effective_date: string;
  end_date?: string;
}

export interface PersonnelShiftUpdateData {
  effective_date?: string;
  end_date?: string;
}

// Work Order Task types (defined above with WorkOrder types)

export interface TaskFormData {
  title: string;
  description?: string;
  sequence?: number;
  method_id?: number;
  required_equipment_id?: number;
  required_capacity?: number;
  standard_cycle_hours?: number;
}

export interface TaskUpdateData {
  title?: string;
  description?: string;
  sequence?: number;
  method_id?: number;
  assigned_technician_id?: number;
  scheduled_equipment_id?: number;
  status?: TaskStatus;
  notes?: string;
  results?: string;
}

// Technician matching types
export interface SkillMatchDetail {
  skill_id: number;
  skill_name: string;
  proficiency_level: string;
  is_certified: boolean;
  meets_requirement: boolean;
}

export interface RequiredSkillInfo {
  skill_id: number;
  skill_name: string;
  min_proficiency?: string;
  certification_required: boolean;
}

export interface EligibleTechnician {
  personnel_id: number;
  employee_id: string;
  name: string;
  job_title?: string;
  status: string;
  match_score: number;
  current_workload: number;
  skill_details: SkillMatchDetail[];
}

export interface EligibleTechniciansResponse {
  task_id: number;
  required_equipment_id?: number;
  required_equipment_name?: string;
  required_skills: RequiredSkillInfo[];
  eligible_technicians: EligibleTechnician[];
}

// Handover types
export const HandoverStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type HandoverStatus = typeof HandoverStatus[keyof typeof HandoverStatus];

export const HandoverPriority = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  CRITICAL: 'critical',
} as const;
export type HandoverPriority = typeof HandoverPriority[keyof typeof HandoverPriority];

export interface PersonnelBrief {
  id: number;
  employee_id: string;
  name: string;
  job_title?: string;
}

export interface TaskBrief {
  id: number;
  task_number: string;
  title: string;
  status: string;
}

export interface WorkOrderBrief {
  id: number;
  order_number: string;
  title: string;
}

export interface ShiftBrief {
  id: number;
  name: string;
  code: string;
}

export interface HandoverNote {
  id: number;
  handover_id: number;
  author_id: number;
  content: string;
  is_important: boolean;
  created_at: string;
  author?: PersonnelBrief;
}

export interface Handover {
  id: number;
  task_id: number;
  work_order_id: number;
  from_technician_id: number;
  to_technician_id?: number;
  from_shift_id?: number;
  to_shift_id?: number;
  status: HandoverStatus;
  priority: HandoverPriority;
  task_status_at_handover?: string;
  progress_summary?: string;
  pending_items?: string;
  special_instructions?: string;
  rejection_reason?: string;
  acceptance_notes?: string;
  created_at: string;
  accepted_at?: string;
  rejected_at?: string;
  task?: TaskBrief;
  work_order?: WorkOrderBrief;
  from_technician?: PersonnelBrief;
  to_technician?: PersonnelBrief;
  from_shift?: ShiftBrief;
  to_shift?: ShiftBrief;
  notes: HandoverNote[];
}

export interface HandoverFormData {
  task_id: number;
  to_technician_id?: number;
  from_shift_id?: number;
  to_shift_id?: number;
  priority?: HandoverPriority;
  progress_summary?: string;
  pending_items?: string;
  special_instructions?: string;
}

export interface HandoverFilters {
  status?: HandoverStatus;
  priority?: HandoverPriority;
  from_technician_id?: number;
  to_technician_id?: number;
  work_order_id?: number;
  my_incoming?: boolean;
  my_outgoing?: boolean;
}

// Method types
export const MethodType = {
  ANALYSIS: 'analysis',
  RELIABILITY: 'reliability',
} as const;
export type MethodType = typeof MethodType[keyof typeof MethodType];

export interface LaboratoryBrief {
  id: number;
  name: string;
  code: string;
}

export interface EquipmentBrief {
  id: number;
  name: string;
  code: string;
}

export interface SkillBrief {
  id: number;
  name: string;
  code: string;
  category: string;
}

export interface MethodSkillRequirement {
  id: number;
  method_id: number;
  skill_id: number;
  min_proficiency_level: string;
  requires_certification: boolean;
  created_at: string;
  skill?: SkillBrief;
}

export interface Method {
  id: number;
  name: string;
  code: string;
  method_type: MethodType;
  category?: string;
  description?: string;
  procedure_summary?: string;
  laboratory_id?: number;
  standard_cycle_hours?: number;
  min_cycle_hours?: number;
  max_cycle_hours?: number;
  requires_equipment: boolean;
  default_equipment_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  laboratory?: LaboratoryBrief;
  default_equipment?: EquipmentBrief;
  skill_requirements: MethodSkillRequirement[];
}

export interface MethodFormData {
  name: string;
  code: string;
  method_type: MethodType;
  category?: string;
  description?: string;
  procedure_summary?: string;
  laboratory_id?: number;
  standard_cycle_hours?: number;
  min_cycle_hours?: number;
  max_cycle_hours?: number;
  requires_equipment?: boolean;
  default_equipment_id?: number;
}

export interface MethodUpdateData {
  name?: string;
  category?: string;
  description?: string;
  procedure_summary?: string;
  laboratory_id?: number;
  standard_cycle_hours?: number;
  min_cycle_hours?: number;
  max_cycle_hours?: number;
  requires_equipment?: boolean;
  default_equipment_id?: number;
  is_active?: boolean;
}

export interface MethodFilters {
  method_type?: MethodType;
  category?: string;
  laboratory_id?: number;
  is_active?: boolean;
  search?: string;
}

export interface MethodSkillRequirementFormData {
  skill_id: number;
  min_proficiency_level?: string;
  requires_certification?: boolean;
}

// Client SLA types
export interface SourceCategoryBrief {
  id: number;
  name: string;
  code: string;
  color?: string;
}

export interface ClientSLA {
  id: number;
  client_id: number;
  laboratory_id?: number;
  method_type?: MethodType;
  source_category_id?: number;
  commitment_hours: number;
  max_hours?: number;
  priority_weight: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client?: ClientBrief;
  laboratory?: LaboratoryBrief;
  source_category?: SourceCategoryBrief;
}

export interface ClientSLAFormData {
  client_id: number;
  laboratory_id?: number;
  method_type?: MethodType;
  source_category_id?: number;
  commitment_hours: number;
  max_hours?: number;
  priority_weight?: number;
  description?: string;
}

export interface ClientSLAUpdateData {
  laboratory_id?: number;
  method_type?: MethodType;
  source_category_id?: number;
  commitment_hours?: number;
  max_hours?: number;
  priority_weight?: number;
  description?: string;
  is_active?: boolean;
}

export interface ClientSLAFilters {
  client_id?: number;
  laboratory_id?: number;
  method_type?: MethodType;
  source_category_id?: number;
  is_active?: boolean;
}

// Testing Source Category types
export interface TestingSourceCategory {
  id: number;
  name: string;
  code: string;
  priority_weight: number;
  display_order: number;
  description?: string;
  color?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestingSourceCategoryFormData {
  name: string;
  code: string;
  priority_weight?: number;
  display_order?: number;
  description?: string;
  color?: string;
  is_default?: boolean;
}

export interface TestingSourceCategoryUpdateData {
  name?: string;
  code?: string;
  priority_weight?: number;
  display_order?: number;
  description?: string;
  color?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface TestingSourceCategoryFilters {
  search?: string;
  is_active?: boolean;
}

// Brief types for nested responses
export interface ClientBrief {
  id: number;
  name: string;
  code: string;
}

// ============================================================================
// Product Management Types (产品管理)
// ============================================================================

// Brief types for nested product responses
export interface PackageFormOptionBrief {
  id: number;
  name: string;
  code: string;
}

export interface PackageTypeOptionBrief {
  id: number;
  name: string;
  code: string;
}

export interface ApplicationScenarioBrief {
  id: number;
  name: string;
  code: string;
  color?: string;
}

// Package Form Option (封装形式)
export interface PackageFormOption {
  id: number;
  name: string;
  code: string;
  display_order: number;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageFormOptionFormData {
  name: string;
  code: string;
  display_order?: number;
  description?: string;
  is_default?: boolean;
}

export interface PackageFormOptionUpdateData extends Partial<PackageFormOptionFormData> {
  is_active?: boolean;
}

// Package Type Option (封装产品类型)
export interface PackageTypeOption {
  id: number;
  name: string;
  code: string;
  display_order: number;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageTypeOptionFormData {
  name: string;
  code: string;
  display_order?: number;
  description?: string;
  is_default?: boolean;
}

export interface PackageTypeOptionUpdateData extends Partial<PackageTypeOptionFormData> {
  is_active?: boolean;
}

// Application Scenario (应用场景)
export interface ApplicationScenario {
  id: number;
  name: string;
  code: string;
  display_order: number;
  description?: string;
  color?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicationScenarioFormData {
  name: string;
  code: string;
  display_order?: number;
  description?: string;
  color?: string;
  is_default?: boolean;
}

export interface ApplicationScenarioUpdateData extends Partial<ApplicationScenarioFormData> {
  is_active?: boolean;
}

// Product (产品)
export interface Product {
  id: number;
  name: string;
  code?: string;
  client_id: number;
  package_form_id?: number;
  package_type_id?: number;
  custom_info?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client?: ClientBrief;
  package_form?: PackageFormOptionBrief;
  package_type?: PackageTypeOptionBrief;
  scenarios: ApplicationScenarioBrief[];
}

export interface ProductFormData {
  name: string;
  code?: string;
  client_id: number;
  package_form_id?: number;
  package_type_id?: number;
  custom_info?: string[];
  scenario_ids?: number[];
}

export interface ProductUpdateData extends Partial<ProductFormData> {
  is_active?: boolean;
}

export interface ProductFilters {
  client_id?: number;
  package_form_id?: number;
  package_type_id?: number;
  scenario_id?: number;
  search?: string;
  is_active?: boolean;
}

// Product Configuration (产品配置选项)
export interface ProductConfig {
  package_forms: PackageFormOption[];
  package_types: PackageTypeOption[];
  application_scenarios: ApplicationScenario[];
}

// Config option filters
export interface ConfigOptionFilters {
  search?: string;
  is_active?: boolean;
}
