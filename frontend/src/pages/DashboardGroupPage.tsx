import { useState } from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  DesktopOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { DashboardPage } from './DashboardPage';
import { EquipmentDashboard } from './EquipmentDashboard';
import { PersonnelDashboard } from './PersonnelDashboard';
import WorkOrderQueryPage from './WorkOrderQueryPage';

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
    {
      key: 'query',
      label: (
        <span>
          <SearchOutlined />
          工单查询
        </span>
      ),
      children: <WorkOrderQueryPage />,
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
