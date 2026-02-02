import { UserRole } from '../types';

// Permission definitions based on 权限矩阵 (Permission Matrix)
export const Permission = {
  // User management
  MANAGE_USERS: 'manage_users',
  MANAGE_SITES: 'manage_sites',
  MANAGE_LABORATORIES: 'manage_laboratories',
  MANAGE_LOCATIONS: 'manage_locations',
  
  // Client & SLA
  MANAGE_CLIENTS: 'manage_clients',
  MANAGE_CLIENT_SLA: 'manage_client_sla',
  MANAGE_SOURCE_CATEGORIES: 'manage_source_categories',
  
  // Skills
  MANAGE_SKILL_CATEGORIES: 'manage_skill_categories',
  MANAGE_SKILLS: 'manage_skills',
  ASSIGN_PERSONNEL_SKILLS: 'assign_personnel_skills',
  
  // Personnel
  INITIATE_BORROW: 'initiate_borrow',
  APPROVE_BORROW: 'approve_borrow',
  MANAGE_SHIFTS: 'manage_shifts',
  
  // Equipment & Methods
  MANAGE_EQUIPMENT: 'manage_equipment',
  MANAGE_METHODS: 'manage_methods',
  
  // Work Orders
  CREATE_WORK_ORDER: 'create_work_order',
  ASSIGN_LEAD_ENGINEER: 'assign_lead_engineer',
  CREATE_SUBTASK: 'create_subtask',
  ASSIGN_TECHNICIAN: 'assign_technician',
  EXECUTE_SUBTASK: 'execute_subtask',
  VERIFY_RESULTS: 'verify_results',
  VIEW_WORK_ORDER_QUERY: 'view_work_order_query', // Viewer-specific permission
  
  // Handover
  INITIATE_HANDOVER: 'initiate_handover',
  
  // Materials
  MANAGE_MATERIALS: 'manage_materials',
  ALLOCATE_MATERIALS: 'allocate_materials',
  HANDLE_MATERIAL_RETURN: 'handle_material_return',
  CONFIRM_MATERIAL_ALERTS: 'confirm_material_alerts',
  
  // Dashboards & Reports
  VIEW_LAB_DASHBOARD: 'view_lab_dashboard',
  VIEW_ALL_DASHBOARDS: 'view_all_dashboards',
  VIEW_CYCLE_TIME_REPORT: 'view_cycle_time_report',
  VIEW_SKILLS_MATRIX: 'view_skills_matrix',
  VIEW_REPORTS: 'view_reports',
  
  // Audit
  VIEW_AUDIT_LOGS: 'view_audit_logs',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

// Role to permissions mapping based on permission matrix
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: Object.values(Permission), // Admin has all permissions
  
  manager: [
    Permission.MANAGE_LOCATIONS,
    Permission.MANAGE_CLIENTS,
    Permission.MANAGE_CLIENT_SLA,
    Permission.MANAGE_SOURCE_CATEGORIES,
    Permission.MANAGE_SKILL_CATEGORIES,
    Permission.MANAGE_SKILLS,
    Permission.ASSIGN_PERSONNEL_SKILLS,
    Permission.INITIATE_BORROW,
    Permission.APPROVE_BORROW,
    Permission.MANAGE_SHIFTS,
    Permission.MANAGE_EQUIPMENT,
    Permission.MANAGE_METHODS,
    Permission.CREATE_WORK_ORDER,
    Permission.ASSIGN_LEAD_ENGINEER,
    Permission.CREATE_SUBTASK,
    Permission.ASSIGN_TECHNICIAN,
    Permission.EXECUTE_SUBTASK,
    Permission.VERIFY_RESULTS,
    Permission.VIEW_WORK_ORDER_QUERY,
    Permission.INITIATE_HANDOVER,
    Permission.MANAGE_MATERIALS,
    Permission.ALLOCATE_MATERIALS,
    Permission.HANDLE_MATERIAL_RETURN,
    Permission.CONFIRM_MATERIAL_ALERTS,
    Permission.VIEW_LAB_DASHBOARD,
    Permission.VIEW_ALL_DASHBOARDS,
    Permission.VIEW_CYCLE_TIME_REPORT,
    Permission.VIEW_SKILLS_MATRIX,
    Permission.VIEW_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  
  engineer: [
    Permission.ASSIGN_PERSONNEL_SKILLS,
    Permission.MANAGE_METHODS,
    Permission.CREATE_WORK_ORDER,
    Permission.CREATE_SUBTASK,
    Permission.ASSIGN_TECHNICIAN,
    Permission.EXECUTE_SUBTASK,
    Permission.VERIFY_RESULTS,
    Permission.VIEW_WORK_ORDER_QUERY,
    Permission.INITIATE_HANDOVER,
    Permission.ALLOCATE_MATERIALS,
    Permission.HANDLE_MATERIAL_RETURN,
    Permission.CONFIRM_MATERIAL_ALERTS,
    Permission.VIEW_LAB_DASHBOARD,
    Permission.VIEW_CYCLE_TIME_REPORT,
    Permission.VIEW_SKILLS_MATRIX,
    Permission.VIEW_REPORTS,
  ],
  
  technician: [
    Permission.EXECUTE_SUBTASK,
    Permission.VIEW_WORK_ORDER_QUERY,
    Permission.INITIATE_HANDOVER,
    Permission.HANDLE_MATERIAL_RETURN,
    Permission.CONFIRM_MATERIAL_ALERTS,
    Permission.VIEW_LAB_DASHBOARD,
    Permission.VIEW_CYCLE_TIME_REPORT,
    Permission.VIEW_SKILLS_MATRIX,
    Permission.VIEW_REPORTS,
  ],
  
  viewer: [
    Permission.VIEW_WORK_ORDER_QUERY, // Viewer can only access work order query
  ],
};

// Route to required permissions mapping
export const routePermissions: Record<string, Permission[]> = {
  '/dashboard': [Permission.VIEW_LAB_DASHBOARD],
  '/equipment-dashboard': [Permission.VIEW_LAB_DASHBOARD],
  '/personnel-dashboard': [Permission.VIEW_LAB_DASHBOARD],
  '/sites': [Permission.MANAGE_SITES],
  '/laboratories': [Permission.MANAGE_LABORATORIES],
  '/personnel': [Permission.VIEW_LAB_DASHBOARD], // All roles with dashboard access can view personnel
  '/skills': [Permission.VIEW_SKILLS_MATRIX],
  '/skills-config': [Permission.MANAGE_SKILLS],
  '/transfers': [Permission.INITIATE_BORROW],
  '/shifts': [Permission.MANAGE_SHIFTS],
  '/equipment': [Permission.MANAGE_EQUIPMENT],
  '/methods': [Permission.MANAGE_METHODS],
  '/materials': [Permission.MANAGE_MATERIALS],
  '/work-orders': [Permission.VIEW_LAB_DASHBOARD], // All can view, actions controlled separately
  '/work-order-query': [Permission.VIEW_WORK_ORDER_QUERY], // Viewer-accessible
  '/clients': [Permission.MANAGE_CLIENTS],
  '/client-slas': [Permission.MANAGE_CLIENT_SLA],
  '/source-categories': [Permission.MANAGE_SOURCE_CATEGORIES],
  '/handovers': [Permission.INITIATE_HANDOVER],
  '/audit-logs': [Permission.VIEW_AUDIT_LOGS],
  '/user-management': [Permission.MANAGE_USERS], // Admin only
  '/settings': [Permission.MANAGE_USERS], // 仅管理员可访问系统设置页面
};

// Check if user has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if user has any of the specified permissions
export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

// Check if user has all of the specified permissions
export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
}

// Check if user can access a specific route
export function canAccessRoute(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  
  // Admin can access everything
  if (role === 'admin') return true;
  
  // Get required permissions for the route
  const requiredPermissions = routePermissions[route];
  
  // If no permissions defined, allow access
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  
  // Check if user has any of the required permissions
  return hasAnyPermission(role, requiredPermissions);
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole | undefined): Permission[] {
  if (!role) return [];
  return rolePermissions[role] || [];
}

// Get readable permission names (Chinese)
export const permissionLabels: Record<Permission, string> = {
  [Permission.MANAGE_USERS]: '管理用户',
  [Permission.MANAGE_SITES]: '管理站点',
  [Permission.MANAGE_LABORATORIES]: '管理实验室',
  [Permission.MANAGE_LOCATIONS]: '管理位置',
  [Permission.MANAGE_CLIENTS]: '管理客户',
  [Permission.MANAGE_CLIENT_SLA]: '管理客户SLA',
  [Permission.MANAGE_SOURCE_CATEGORIES]: '管理测试来源类别',
  [Permission.MANAGE_SKILL_CATEGORIES]: '管理技能分类',
  [Permission.MANAGE_SKILLS]: '管理技能',
  [Permission.ASSIGN_PERSONNEL_SKILLS]: '分配人员技能',
  [Permission.INITIATE_BORROW]: '发起人员借调',
  [Permission.APPROVE_BORROW]: '审批人员借调',
  [Permission.MANAGE_SHIFTS]: '管理班次',
  [Permission.MANAGE_EQUIPMENT]: '管理设备',
  [Permission.MANAGE_METHODS]: '管理分析/测试方法',
  [Permission.CREATE_WORK_ORDER]: '创建工单',
  [Permission.ASSIGN_LEAD_ENGINEER]: '指派主管工程师',
  [Permission.CREATE_SUBTASK]: '创建子任务',
  [Permission.ASSIGN_TECHNICIAN]: '分配技术员',
  [Permission.EXECUTE_SUBTASK]: '执行子任务',
  [Permission.VERIFY_RESULTS]: '验收签核结果',
  [Permission.VIEW_WORK_ORDER_QUERY]: '查看工单查询',
  [Permission.INITIATE_HANDOVER]: '发起交接',
  [Permission.MANAGE_MATERIALS]: '管理材料',
  [Permission.ALLOCATE_MATERIALS]: '分配材料到任务',
  [Permission.HANDLE_MATERIAL_RETURN]: '处理材料归还/报废',
  [Permission.CONFIRM_MATERIAL_ALERTS]: '确认材料提醒',
  [Permission.VIEW_LAB_DASHBOARD]: '查看本实验室仪表板',
  [Permission.VIEW_ALL_DASHBOARDS]: '查看所有实验室仪表板',
  [Permission.VIEW_CYCLE_TIME_REPORT]: '查看周期时间报告',
  [Permission.VIEW_SKILLS_MATRIX]: '查看技能矩阵',
  [Permission.VIEW_REPORTS]: '查看报表',
  [Permission.VIEW_AUDIT_LOGS]: '查看审计日志',
};

// Permission categories for display
export const permissionCategories: Record<string, { label: string; permissions: Permission[] }> = {
  system: {
    label: '系统管理',
    permissions: [
      Permission.MANAGE_USERS,
      Permission.MANAGE_SITES,
      Permission.MANAGE_LABORATORIES,
      Permission.MANAGE_LOCATIONS,
    ],
  },
  clients: {
    label: '客户与SLA',
    permissions: [
      Permission.MANAGE_CLIENTS,
      Permission.MANAGE_CLIENT_SLA,
      Permission.MANAGE_SOURCE_CATEGORIES,
    ],
  },
  skills: {
    label: '技能管理',
    permissions: [
      Permission.MANAGE_SKILL_CATEGORIES,
      Permission.MANAGE_SKILLS,
      Permission.ASSIGN_PERSONNEL_SKILLS,
    ],
  },
  personnel: {
    label: '人员管理',
    permissions: [
      Permission.INITIATE_BORROW,
      Permission.APPROVE_BORROW,
      Permission.MANAGE_SHIFTS,
    ],
  },
  equipment: {
    label: '设备与方法',
    permissions: [
      Permission.MANAGE_EQUIPMENT,
      Permission.MANAGE_METHODS,
    ],
  },
  workOrders: {
    label: '工单管理',
    permissions: [
      Permission.CREATE_WORK_ORDER,
      Permission.ASSIGN_LEAD_ENGINEER,
      Permission.CREATE_SUBTASK,
      Permission.ASSIGN_TECHNICIAN,
      Permission.EXECUTE_SUBTASK,
      Permission.VERIFY_RESULTS,
      Permission.VIEW_WORK_ORDER_QUERY,
      Permission.INITIATE_HANDOVER,
    ],
  },
  materials: {
    label: '材料管理',
    permissions: [
      Permission.MANAGE_MATERIALS,
      Permission.ALLOCATE_MATERIALS,
      Permission.HANDLE_MATERIAL_RETURN,
      Permission.CONFIRM_MATERIAL_ALERTS,
    ],
  },
  reports: {
    label: '仪表板与报表',
    permissions: [
      Permission.VIEW_LAB_DASHBOARD,
      Permission.VIEW_ALL_DASHBOARDS,
      Permission.VIEW_CYCLE_TIME_REPORT,
      Permission.VIEW_SKILLS_MATRIX,
      Permission.VIEW_REPORTS,
      Permission.VIEW_AUDIT_LOGS,
    ],
  },
};

// 角色默认首页映射
// Default home page for each role based on their primary permissions
const roleHomePages: Record<UserRole, string> = {
  admin: '/dashboard',           // 管理员 - 仪表板
  manager: '/dashboard',         // 经理 - 仪表板
  engineer: '/dashboard',        // 工程师 - 仪表板
  technician: '/dashboard',      // 技术员 - 仪表板
  viewer: '/work-order-query',   // 查看者 - 工单查询 (唯一可访问页面)
};

// 获取角色对应的首页路径
// Get the appropriate home page for a user role
export function getRoleHomePage(role: UserRole | undefined): string {
  if (!role) return '/login';
  return roleHomePages[role] || '/work-order-query';
}

// 获取用户第一个可访问的路由 (用于403页面导航)
// Get the first accessible route for a user (for 403 page navigation)
export function getFirstAccessibleRoute(role: UserRole | undefined): string {
  if (!role) return '/login';
  
  // 首先尝试返回角色默认首页
  const homePage = roleHomePages[role];
  if (canAccessRoute(role, homePage)) {
    return homePage;
  }
  
  // 如果默认首页不可访问，查找第一个可访问的路由
  const routeOrder = [
    '/work-order-query',
    '/dashboard',
    '/work-orders',
    '/personnel',
    '/equipment',
    '/materials',
    '/settings',
  ];
  
  for (const route of routeOrder) {
    if (canAccessRoute(role, route)) {
      return route;
    }
  }
  
  return '/login';
}
