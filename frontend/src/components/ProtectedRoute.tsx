import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Result, Button, Space } from 'antd';
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          extra={
            <Space>
              <Button type="primary" onClick={() => navigate(accessibleRoute)}>
                返回首页
              </Button>
              <Button onClick={() => { logout(); navigate('/login'); }}>
                退出登录
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  // Check route-based permissions
  if (!canAccessRoute(user?.role, location.pathname)) {
    const accessibleRoute = getFirstAccessibleRoute(user?.role);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <Result
          status="403"
          title="无权访问"
          subTitle="您的角色没有权限访问此功能，请联系管理员。"
          extra={
            <Space>
              <Button type="primary" onClick={() => navigate(accessibleRoute)}>
                返回首页
              </Button>
              <Button onClick={() => { logout(); navigate('/login'); }}>
                退出登录
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return <Outlet />;
}
