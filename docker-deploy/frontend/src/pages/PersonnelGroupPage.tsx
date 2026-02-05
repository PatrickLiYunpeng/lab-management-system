import { useState } from 'react';
import { Tabs } from 'antd';
import {
  UserOutlined,
  TableOutlined,
  SettingOutlined,
  SwapOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import PersonnelPage from './PersonnelPage';
import SkillsMatrix from './SkillsMatrix';
import SkillsConfig from './SkillsConfig';
import Transfers from './Transfers';
import ShiftsPage from './ShiftsPage';

export default function PersonnelGroupPage() {
  const [activeKey, setActiveKey] = useState('personnel');

  const items = [
    {
      key: 'personnel',
      label: (
        <span>
          <UserOutlined />
          人员列表
        </span>
      ),
      children: <PersonnelPage />,
    },
    {
      key: 'skills-matrix',
      label: (
        <span>
          <TableOutlined />
          技能矩阵
        </span>
      ),
      children: <SkillsMatrix />,
    },
    {
      key: 'skills-config',
      label: (
        <span>
          <SettingOutlined />
          技能配置
        </span>
      ),
      children: <SkillsConfig />,
    },
    {
      key: 'transfers',
      label: (
        <span>
          <SwapOutlined />
          借调管理
        </span>
      ),
      children: <Transfers />,
    },
    {
      key: 'shifts',
      label: (
        <span>
          <ScheduleOutlined />
          班次管理
        </span>
      ),
      children: <ShiftsPage />,
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
