import { useState } from 'react';
import {
  InboxOutlined,
  SendOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Tabs } from 'antd';
import { HandoverPanel } from '../components/handovers/HandoverPanel';

type TabKey = 'incoming' | 'outgoing' | 'all';

export default function HandoversPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('incoming');

  const tabItems = [
    {
      key: 'incoming',
      label: (
        <span>
          <InboxOutlined />
          待接收
        </span>
      ),
      children: <HandoverPanel mode="incoming" />,
    },
    {
      key: 'outgoing',
      label: (
        <span>
          <SendOutlined />
          我发起的
        </span>
      ),
      children: <HandoverPanel mode="outgoing" />,
    },
    {
      key: 'all',
      label: (
        <span>
          <UnorderedListOutlined />
          全部交接
        </span>
      ),
      children: <HandoverPanel mode="all" />,
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />
    </div>
  );
}
