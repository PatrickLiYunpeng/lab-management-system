/**
 * 权限相关的React Hooks
 * 
 * 提供组件内检查用户权限的功能
 */
import { useAuthStore } from '../stores/authStore';
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from '../utils/permissions';

/**
 * 检查单个权限的Hook
 * 
 * @param permission 需要检查的权限
 * @returns 用户是否拥有该权限
 * 
 * @example
 * const canCreateWorkOrder = usePermission(Permission.CREATE_WORK_ORDER);
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuthStore();
  return hasPermission(user?.role, permission);
}

/**
 * 检查多个权限（满足任一即可）的Hook
 * 
 * @param permissions 需要检查的权限列表
 * @returns 用户是否拥有任一权限
 * 
 * @example
 * const canManage = useAnyPermission([Permission.MANAGE_EQUIPMENT, Permission.MANAGE_USERS]);
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuthStore();
  return hasAnyPermission(user?.role, permissions);
}

/**
 * 检查多个权限（需全部满足）的Hook
 * 
 * @param permissions 需要检查的权限列表
 * @returns 用户是否拥有全部权限
 * 
 * @example
 * const canFullManage = useAllPermissions([Permission.MANAGE_EQUIPMENT, Permission.DELETE_EQUIPMENT]);
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuthStore();
  return hasAllPermissions(user?.role, permissions);
}

export { Permission } from '../utils/permissions';
