import { useState } from 'react';
import { Tabs } from 'antd';
import {
  ShoppingOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ProductsPage from './ProductsPage';
import ProductConfigPage from './ProductConfigPage';

export default function ProductGroupPage() {
  const [activeKey, setActiveKey] = useState('products');

  const items = [
    {
      key: 'products',
      label: (
        <span>
          <ShoppingOutlined />
          产品清单管理
        </span>
      ),
      children: <ProductsPage />,
    },
    {
      key: 'config',
      label: (
        <span>
          <SettingOutlined />
          产品属性配置
        </span>
      ),
      children: <ProductConfigPage />,
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
