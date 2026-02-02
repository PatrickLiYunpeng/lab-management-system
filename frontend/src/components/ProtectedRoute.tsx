import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './ui';
import { useAuthStore } from '../stores/authStore';
import { canAccessRoute, getFirstAccessibleRoute } from '../utils/permissions';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if specified
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    const accessibleRoute = getFirstAccessibleRoute(user?.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-warning-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-neutral-800 mb-2">403</h1>
          <p className="text-neutral-500 mb-6">抱歉，您没有权限访问此页面。</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate(accessibleRoute)}>
              返回首页
            </Button>
            <Button onClick={() => { logout(); navigate('/login'); }}>
              退出登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check route-based permissions
  if (!canAccessRoute(user?.role, location.pathname)) {
    const accessibleRoute = getFirstAccessibleRoute(user?.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-warning-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">无权访问</h1>
          <p className="text-neutral-500 mb-6">您的角色没有权限访问此功能，请联系管理员。</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate(accessibleRoute)}>
              返回首页
            </Button>
            <Button onClick={() => { logout(); navigate('/login'); }}>
              退出登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
