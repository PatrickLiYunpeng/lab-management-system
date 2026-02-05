import { useState } from 'react';
import { Tabs } from 'antd';
import {
  UsergroupAddOutlined,
  FileProtectOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import ClientsPage from './ClientsPage';
import ClientSLAsPage from './ClientSLAsPage';
import TestingSourceCategoriesPage from './TestingSourceCategoriesPage';

export default function ClientGroupPage() {
  const [activeKey, setActiveKey] = useState('clients');

  const items = [
    {
      key: 'clients',
      label: (
        <span>
          <UsergroupAddOutlined />
          客户管理
        </span>
      ),
      children: <ClientsPage />,
    },
    {
      key: 'sla',
      label: (
        <span>
          <FileProtectOutlined />
          SLA配置
        </span>
      ),
      children: <ClientSLAsPage />,
    },
    {
      key: 'source-categories',
      label: (
        <span>
          <TagsOutlined />
          来源类别
        </span>
      ),
      children: <TestingSourceCategoriesPage />,
    },
  ];

  return (
    <div data-testid="client-group-page">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
        size="large"
        style={{ marginTop: -16 }}
        data-testid="client-group-tabs"
      />
    </div>
  );
}
