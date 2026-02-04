import { useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Tag, Avatar, Button, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  TeamOutlined,
  ToolOutlined,
  FileTextOutlined,
  InboxOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  SwapOutlined,
  SolutionOutlined,
  UsergroupAddOutlined,
  ShoppingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { canAccessRoute } from '../utils/permissions';
import type { UserRole } from '../types';

const { Header, Sider, Content } = Layout;

// Role labels and colors for header display
const roleLabels: Record<string, string> = {
  admin: '管理员',
  manager: '经理',
  engineer: '工程师',
  technician: '技术员',
  viewer: '访客',
};

const roleColors: Record<string, string> = {
  admin: 'red',
  manager: 'orange',
  engineer: 'blue',
  technician: 'green',
  viewer: 'default',
};

// Menu item configuration with route for permission checking
interface MenuItemConfig {
  key: string;
  icon?: React.ReactNode;
  label: string;
  route?: string;
  children?: MenuItemConfig[];
}

const allMenuItems: MenuItemConfig[] = [
  { key: '/work-orders', icon: <FileTextOutlined />, label: '工单管理', route: '/work-orders' },
  { key: '/work-order-query', icon: <SearchOutlined />, label: '工单查询', route: '/work-order-query' },
  { key: '/dashboard', icon: <AppstoreOutlined />, label: '仪表板', route: '/dashboard' },
  { key: '/locations', icon: <BankOutlined />, label: '地址管理', route: '/locations' },
  { key: '/personnel', icon: <TeamOutlined />, label: '人员管理', route: '/personnel' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备管理', route: '/equipment' },
  { key: '/methods', icon: <SolutionOutlined />, label: '分析/测试方法', route: '/methods' },
  { key: '/materials', icon: <InboxOutlined />, label: '物料管理', route: '/materials' },
  { key: '/clients', icon: <UsergroupAddOutlined />, label: '客户与SLA', route: '/clients' },
  { key: '/products', icon: <ShoppingOutlined />, label: '产品管理', route: '/products' },
  { key: '/handovers', icon: <SwapOutlined />, label: '任务交接', route: '/handovers' },
  { key: '/audit-logs', icon: <FileTextOutlined />, label: '审计日志', route: '/audit-logs' },
  { key: '/user-management', icon: <UsergroupAddOutlined />, label: '用户管理', route: '/user-management' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', route: '/settings' },
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

// Convert MenuItemConfig to antd MenuProps items
function convertToMenuItems(items: MenuItemConfig[]): MenuProps['items'] {
  return items.map(item => {
    if (item.children) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: convertToMenuItems(item.children),
      };
    }
    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };
  });
}

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();

  const menuItems = useMemo(
    () => filterMenuByRole(allMenuItems, user?.role),
    [user?.role]
  );

  const antdMenuItems = useMemo(
    () => convertToMenuItems(menuItems),
    [menuItems]
  );

  // Find selected keys and open keys based on current path
  const selectedKeys = [location.pathname];
  const defaultOpenKeys = useMemo(() => {
    const openKeys: string[] = [];
    menuItems.forEach(item => {
      if (item.children?.some(child => child.key === location.pathname)) {
        openKeys.push(item.key);
      }
    });
    return openKeys;
  }, [menuItems, location.pathname]);

  const handleMenuClick: MenuProps['onClick'] = useCallback(({ key }: { key: string }) => {
    navigate(key);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={208}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 8px',
        }}>
          <svg
            width={collapsed ? 28 : 32}
            height={collapsed ? 28 : 32}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
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
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              QAS实验室管理
            </span>
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={defaultOpenKeys}
          items={antdMenuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 208, transition: 'margin-left 0.2s' }}>
        {/* Header */}
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          {/* User dropdown */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
            }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#f0f0f0', color: '#595959' }} />
              <span style={{ color: '#434343' }}>{user?.full_name || user?.username}</span>
              <Tag color={roleColors[user?.role || 'viewer']}>
                {roleLabels[user?.role || 'viewer']}
              </Tag>
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{ margin: 24 }}>
          <div style={{
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
