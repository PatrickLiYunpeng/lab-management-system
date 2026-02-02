import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin, ToastProvider } from './components/ui';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import { getRoleHomePage } from './utils/permissions';

// Lazy-loaded page components for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const EquipmentDashboard = lazy(() => import('./pages/EquipmentDashboard').then(m => ({ default: m.EquipmentDashboard })));
const PersonnelDashboard = lazy(() => import('./pages/PersonnelDashboard').then(m => ({ default: m.PersonnelDashboard })));
const SitesPage = lazy(() => import('./pages/SitesPage'));
const LaboratoriesPage = lazy(() => import('./pages/LaboratoriesPage'));
const PersonnelPage = lazy(() => import('./pages/PersonnelPage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrdersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SkillsMatrix = lazy(() => import('./pages/SkillsMatrix'));
const SkillsConfig = lazy(() => import('./pages/SkillsConfig'));
const Transfers = lazy(() => import('./pages/Transfers'));
const ShiftsPage = lazy(() => import('./pages/ShiftsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientSLAsPage = lazy(() => import('./pages/ClientSLAsPage'));
const TestingSourceCategoriesPage = lazy(() => import('./pages/TestingSourceCategoriesPage'));
const HandoversPage = lazy(() => import('./pages/HandoversPage'));
const MethodsPage = lazy(() => import('./pages/MethodsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const WorkOrderQueryPage = lazy(() => import('./pages/WorkOrderQueryPage'));

// Loading fallback component
const PageLoading = () => (
  <div className="flex justify-center items-center h-full min-h-[200px]">
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
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Suspense fallback={<PageLoading />}><DashboardPage /></Suspense>} />
              <Route path="/equipment-dashboard" element={<Suspense fallback={<PageLoading />}><EquipmentDashboard /></Suspense>} />
              <Route path="/personnel-dashboard" element={<Suspense fallback={<PageLoading />}><PersonnelDashboard /></Suspense>} />
              <Route path="/sites" element={<Suspense fallback={<PageLoading />}><SitesPage /></Suspense>} />
              <Route path="/laboratories" element={<Suspense fallback={<PageLoading />}><LaboratoriesPage /></Suspense>} />
              <Route path="/personnel" element={<Suspense fallback={<PageLoading />}><PersonnelPage /></Suspense>} />
              <Route path="/skills" element={<Suspense fallback={<PageLoading />}><SkillsMatrix /></Suspense>} />
              <Route path="/skills-config" element={<Suspense fallback={<PageLoading />}><SkillsConfig /></Suspense>} />
              <Route path="/transfers" element={<Suspense fallback={<PageLoading />}><Transfers /></Suspense>} />
              <Route path="/shifts" element={<Suspense fallback={<PageLoading />}><ShiftsPage /></Suspense>} />
              <Route path="/equipment" element={<Suspense fallback={<PageLoading />}><EquipmentPage /></Suspense>} />
              <Route path="/materials" element={<Suspense fallback={<PageLoading />}><MaterialsPage /></Suspense>} />
              <Route path="/work-orders" element={<Suspense fallback={<PageLoading />}><WorkOrdersPage /></Suspense>} />
              <Route path="/work-order-query" element={<Suspense fallback={<PageLoading />}><WorkOrderQueryPage /></Suspense>} />
              <Route path="/clients" element={<Suspense fallback={<PageLoading />}><ClientsPage /></Suspense>} />
              <Route path="/client-slas" element={<Suspense fallback={<PageLoading />}><ClientSLAsPage /></Suspense>} />
              <Route path="/source-categories" element={<Suspense fallback={<PageLoading />}><TestingSourceCategoriesPage /></Suspense>} />
              <Route path="/handovers" element={<Suspense fallback={<PageLoading />}><HandoversPage /></Suspense>} />
              <Route path="/methods" element={<Suspense fallback={<PageLoading />}><MethodsPage /></Suspense>} />
              <Route path="/audit-logs" element={<Suspense fallback={<PageLoading />}><AuditLogsPage /></Suspense>} />
              <Route path="/user-management" element={<Suspense fallback={<PageLoading />}><UserManagementPage /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoading />}><SettingsPage /></Suspense>} />
              <Route path="/" element={<RoleBasedRedirect />} />
            </Route>
          </Route>
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
