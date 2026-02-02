/**
 * 权限守卫组件
 * 
 * 用于根据用户权限条件性渲染UI元素
 */
import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission, permissionLabels } from '../utils/permissions';

interface PermissionGuardProps {
  /** 需要的单个权限 */
  permission?: Permission;
  /** 多个权限 - 用户需要拥有任一权限 */
  anyOf?: Permission[];
  /** 多个权限 - 用户需要拥有全部权限 */
  allOf?: Permission[];
  /** 有权限时渲染的内容 */
  children: ReactNode;
  /** 无权限时渲染的备选内容（可选） */
  fallback?: ReactNode;
  /** 如果为true，显示禁用状态和提示而不是隐藏 */
  showDisabled?: boolean;
  /** 禁用时的自定义提示文本 */
  disabledTooltip?: string;
}

/**
 * 权限守卫组件 - 用于功能级权限控制
 * 
 * @example
 * // 单个权限检查
 * <PermissionGuard permission={Permission.CREATE_WORK_ORDER}>
 *   <Button>创建工单</Button>
 * </PermissionGuard>
 * 
 * @example
 * // 多个权限检查（满足任一即可）
 * <PermissionGuard anyOf={[Permission.MANAGE_EQUIPMENT, Permission.VIEW_LAB_DASHBOARD]}>
 *   <EquipmentPanel />
 * </PermissionGuard>
 * 
 * @example
 * // 显示禁用状态和提示
 * <PermissionGuard permission={Permission.MANAGE_USERS} showDisabled>
 *   <Button>管理用户</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  showDisabled = false,
  disabledTooltip,
}: PermissionGuardProps) {
  const { user } = useAuthStore();
  const role = user?.role;

  // 根据props检查权限
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(role, permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(role, anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAllPermissions(role, allOf);
  } else {
    // 未指定权限，允许访问
    hasAccess = true;
  }

  // 有权限则渲染children
  if (hasAccess) {
    return <>{children}</>;
  }

  // 显示禁用状态和提示
  if (showDisabled) {
    const requiredPermission = permission || (anyOf?.[0]) || (allOf?.[0]);
    const tooltipText = disabledTooltip || (requiredPermission
      ? `需要权限: ${permissionLabels[requiredPermission]}`
      : '您没有权限执行此操作');

    return (
      <Tooltip title={tooltipText}>
        <span style={{ cursor: 'not-allowed', opacity: 0.5 }}>
          {children}
        </span>
      </Tooltip>
    );
  }

  // 返回备选内容（默认为null）
  return <>{fallback}</>;
}
