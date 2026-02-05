import { Tag } from 'antd';

interface StatusTagProps {
  isActive: boolean;
}

export function StatusTag({ isActive }: StatusTagProps) {
  return (
    <Tag color={isActive ? 'success' : 'default'}>
      {isActive ? '启用' : '停用'}
    </Tag>
  );
}
