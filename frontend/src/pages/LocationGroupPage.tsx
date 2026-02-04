import { useState } from 'react';
import { Tabs } from 'antd';
import {
  BankOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import SitesPage from './SitesPage';
import LaboratoriesPage from './LaboratoriesPage';

export default function LocationGroupPage() {
  const [activeKey, setActiveKey] = useState('sites');

  const items = [
    {
      key: 'sites',
      label: (
        <span>
          <BankOutlined />
          站点管理
        </span>
      ),
      children: <SitesPage />,
    },
    {
      key: 'laboratories',
      label: (
        <span>
          <ExperimentOutlined />
          实验室管理
        </span>
      ),
      children: <LaboratoriesPage />,
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
