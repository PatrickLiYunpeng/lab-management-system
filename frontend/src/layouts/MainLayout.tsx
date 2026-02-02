import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Squares2X2Icon,
  UsersIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  InboxIcon,
  Cog6ToothIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOfficeIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  TagIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Tag } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { canAccessRoute } from '../utils/permissions';
import type { UserRole } from '../types';

// Role labels and colors for header display
const roleLabels: Record<string, string> = {
  admin: '管理员',
  manager: '经理',
  engineer: '工程师',
  technician: '技术员',
  viewer: '访客',
};

const roleColors: Record<string, 'error' | 'warning' | 'processing' | 'success' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  engineer: 'processing',
  technician: 'success',
  viewer: 'default',
};

// Menu item configuration with route for permission checking
interface MenuItemConfig {
  key: string;
  icon?: React.ElementType;
  label: string;
  route?: string;
  children?: MenuItemConfig[];
}

const allMenuItems: MenuItemConfig[] = [
  { key: '/work-orders', icon: DocumentTextIcon, label: '工单管理', route: '/work-orders' },
  {
    key: 'dashboard-group',
    icon: Squares2X2Icon,
    label: '仪表板',
    children: [
      { key: '/dashboard', label: '综合仪表板', route: '/dashboard' },
      { key: '/equipment-dashboard', label: '设备仪表板', route: '/equipment-dashboard' },
      { key: '/personnel-dashboard', label: '人员仪表板', route: '/personnel-dashboard' },
      { key: '/work-order-query', icon: MagnifyingGlassIcon, label: '工单查询', route: '/work-order-query' },
    ],
  },
  {
    key: 'location-group',
    icon: BuildingOfficeIcon,
    label: '地址管理',
    children: [
      { key: '/sites', icon: BuildingOfficeIcon, label: '站点管理', route: '/sites' },
      { key: '/laboratories', icon: BeakerIcon, label: '实验室管理', route: '/laboratories' },
    ],
  },
  {
    key: 'personnel-group',
    icon: UsersIcon,
    label: '人员管理',
    children: [
      { key: '/personnel', label: '人员列表', route: '/personnel' },
      { key: '/skills', label: '技能矩阵', route: '/skills' },
      { key: '/skills-config', label: '技能配置', route: '/skills-config' },
      { key: '/transfers', label: '借调管理', route: '/transfers' },
      { key: '/shifts', label: '班次管理', route: '/shifts' },
    ],
  },
  { key: '/equipment', icon: WrenchScrewdriverIcon, label: '设备管理', route: '/equipment' },
  { key: '/methods', icon: ClipboardDocumentListIcon, label: '分析/测试方法', route: '/methods' },
  { key: '/materials', icon: InboxIcon, label: '物料管理', route: '/materials' },
  {
    key: 'client-group',
    icon: UserGroupIcon,
    label: '客户与SLA',
    children: [
      { key: '/clients', label: '客户管理', route: '/clients' },
      { key: '/client-slas', icon: ClockIcon, label: 'SLA配置', route: '/client-slas' },
      { key: '/source-categories', icon: TagIcon, label: '来源类别', route: '/source-categories' },
    ],
  },
  { key: '/handovers', icon: ArrowsRightLeftIcon, label: '任务交接', route: '/handovers' },
  { key: '/audit-logs', icon: DocumentTextIcon, label: '审计日志', route: '/audit-logs' },
  { key: '/user-management', icon: UserGroupIcon, label: '用户管理', route: '/user-management' },
  { key: '/settings', icon: Cog6ToothIcon, label: '系统设置', route: '/settings' },
];

// Filter menu items based on user role permissions
function filterMenuByRole(items: MenuItemConfig[], role: UserRole | undefined): MenuItemConfig[] {
  if (!role) return [];
  
  return items
    .map(item => {
      if (item.route && !canAccessRoute(role, item.route)) {
        return null;
      }
      
      if (item.children) {
        const filteredChildren = item.children.filter(
          child => !child.route || canAccessRoute(role, child.route)
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      
      return item;
    })
    .filter(Boolean) as MenuItemConfig[];
}

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = useMemo(
    () => filterMenuByRole(allMenuItems, user?.role),
    [user?.role]
  );

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (key: string) => location.pathname === key;
  const isParentActive = (item: MenuItemConfig) =>
    item.children?.some(child => location.pathname === child.key);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-neutral-900 text-white transition-all duration-200 z-20 ${
          collapsed ? 'w-20' : 'w-52'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center gap-2 border-b border-neutral-700 px-2">
          <svg
            width={collapsed ? 28 : 32}
            height={collapsed ? 28 : 32}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <circle cx="20" cy="20" r="18" stroke="#3b82f6" strokeWidth="2" fill="#111827" />
            <path
              d="M16 10 L16 16 L12 26 Q11 29 14 30 L26 30 Q29 29 28 26 L24 16 L24 10"
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="14" y1="10" x2="26" y2="10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 23 Q13 27 15 28 L25 28 Q27 27 26 23 L23 18 L17 18 Z" fill="#3b82f6" opacity="0.6" />
            <circle cx="17" cy="24" r="1.5" fill="#fff" opacity="0.8" />
            <circle cx="22" cy="22" r="1" fill="#fff" opacity="0.6" />
          </svg>
          {!collapsed && (
            <span className="text-sm font-bold whitespace-nowrap">QAS实验室管理</span>
          )}
        </div>

        {/* Menu */}
        <nav className="overflow-y-auto h-[calc(100vh-64px)] py-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedKeys.includes(item.key);
            const active = isActive(item.key) || isParentActive(item);

            return (
              <div key={item.key}>
                <button
                  onClick={() => hasChildren ? toggleExpanded(item.key) : handleMenuClick(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {hasChildren && (
                        isExpanded
                          ? <ChevronDownIcon className="w-4 h-4" />
                          : <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
                {hasChildren && isExpanded && !collapsed && (
                  <div className="bg-neutral-950">
                    {item.children!.map(child => (
                      <button
                        key={child.key}
                        onClick={() => handleMenuClick(child.key)}
                        className={`w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm transition-colors ${
                          isActive(child.key)
                            ? 'bg-primary-600 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-52'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <Bars3Icon className="w-5 h-5 text-neutral-600" />
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 hover:bg-neutral-100 rounded-md px-3 py-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-neutral-600" />
              </div>
              <span className="text-sm text-neutral-700">{user?.full_name || user?.username}</span>
              <Tag color={roleColors[user?.role || 'viewer']} className="text-xs">
                {roleLabels[user?.role || 'viewer']}
              </Tag>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-neutral-200 py-1 z-20">
                  <button
                    onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <UserIcon className="w-4 h-4" />
                    个人资料
                  </button>
                  <div className="border-t border-neutral-200 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <div className="bg-white rounded-lg p-6 min-h-[280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
