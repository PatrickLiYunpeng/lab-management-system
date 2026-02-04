import { useState } from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  DesktopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { DashboardPage } from './DashboardPage';
import { EquipmentDashboard } from './EquipmentDashboard';
import { PersonnelDashboard } from './PersonnelDashboard';

export default function DashboardGroupPage() {
  const [activeKey, setActiveKey] = useState('dashboard');

  const items = [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          综合仪表板
        </span>
      ),
      children: <DashboardPage />,
    },
    {
      key: 'equipment',
      label: (
        <span>
          <DesktopOutlined />
          设备仪表板
        </span>
      ),
      children: <EquipmentDashboard />,
    },
    {
      key: 'personnel',
      label: (
        <span>
          <TeamOutlined />
          人员仪表板
        </span>
      ),
      children: <PersonnelDashboard />,
    },
  ];

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      items={items}
      size="large"
      style={{ marginTop: -16 }}
    />
  );
}
