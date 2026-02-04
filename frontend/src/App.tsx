import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import { getRoleHomePage } from './utils/permissions';

dayjs.locale('zh-cn');

// Lazy-loaded page components for code splitting
// Group pages (Tab-based navigation)
const DashboardGroupPage = lazy(() => import('./pages/DashboardGroupPage'));
const LocationGroupPage = lazy(() => import('./pages/LocationGroupPage'));
const PersonnelGroupPage = lazy(() => import('./pages/PersonnelGroupPage'));
const ClientGroupPage = lazy(() => import('./pages/ClientGroupPage'));
const ProductGroupPage = lazy(() => import('./pages/ProductGroupPage'));

// Individual pages (not grouped)
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrdersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const HandoversPage = lazy(() => import('./pages/HandoversPage'));
const MethodsPage = lazy(() => import('./pages/MethodsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const WorkOrderQueryPage = lazy(() => import('./pages/WorkOrderQueryPage'));

// Loading fallback component
const PageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
    <Spin size="large" />
  </div>
);

// Smart redirect component: redirects to role-appropriate home page
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const homePage = getRoleHomePage(user?.role);
  return <Navigate to={homePage} replace />;
}

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* Group pages with Tab navigation */}
                <Route path="/dashboard" element={<Suspense fallback={<PageLoading />}><DashboardGroupPage /></Suspense>} />
                <Route path="/locations" element={<Suspense fallback={<PageLoading />}><LocationGroupPage /></Suspense>} />
                <Route path="/personnel" element={<Suspense fallback={<PageLoading />}><PersonnelGroupPage /></Suspense>} />
                <Route path="/clients" element={<Suspense fallback={<PageLoading />}><ClientGroupPage /></Suspense>} />
                <Route path="/products" element={<Suspense fallback={<PageLoading />}><ProductGroupPage /></Suspense>} />
                
                {/* Individual pages */}
                <Route path="/work-orders" element={<Suspense fallback={<PageLoading />}><WorkOrdersPage /></Suspense>} />
                <Route path="/work-order-query" element={<Suspense fallback={<PageLoading />}><WorkOrderQueryPage /></Suspense>} />
                <Route path="/equipment" element={<Suspense fallback={<PageLoading />}><EquipmentPage /></Suspense>} />
                <Route path="/materials" element={<Suspense fallback={<PageLoading />}><MaterialsPage /></Suspense>} />
                <Route path="/methods" element={<Suspense fallback={<PageLoading />}><MethodsPage /></Suspense>} />
                <Route path="/handovers" element={<Suspense fallback={<PageLoading />}><HandoversPage /></Suspense>} />
                <Route path="/audit-logs" element={<Suspense fallback={<PageLoading />}><AuditLogsPage /></Suspense>} />
                <Route path="/user-management" element={<Suspense fallback={<PageLoading />}><UserManagementPage /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<PageLoading />}><SettingsPage /></Suspense>} />
                <Route path="/" element={<RoleBasedRedirect />} />
              </Route>
            </Route>
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
