import { SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import type { PersonnelSkill, ProficiencyLevel } from '../../types';

interface SkillBadgeProps {
  personnelSkill: PersonnelSkill;
  compact?: boolean;
}

const proficiencyColors: Record<ProficiencyLevel, 'default' | 'processing' | 'success' | 'warning'> = {
  beginner: 'default',
  intermediate: 'processing',
  advanced: 'success',
  expert: 'warning',
};

const proficiencyLabels: Record<ProficiencyLevel, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家',
};

function isCertificationExpiring(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry <= thirtyDaysFromNow && expiry > now;
}

function isCertificationExpired(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

export function SkillBadge({ personnelSkill, compact = false }: SkillBadgeProps) {
  const { skill, proficiency_level, is_certified, certification_expiry, certificate_number } =
    personnelSkill;

  if (!skill) return null;

  const isExpired = isCertificationExpired(certification_expiry);
  const isExpiring = isCertificationExpiring(certification_expiry);

  const tooltipContent = (
    <div style={{ fontSize: 14 }}>
      <div style={{ fontWeight: 600 }}>{skill.name}</div>
      <div>代码: {skill.code}</div>
      <div>熟练度: {proficiencyLabels[proficiency_level]}</div>
      {is_certified && (
        <>
          <div>
            认证状态:{' '}
            {isExpired ? (
              <span style={{ color: '#ff4d4f' }}>已过期</span>
            ) : isExpiring ? (
              <span style={{ color: '#faad14' }}>即将过期</span>
            ) : (
              <span style={{ color: '#52c41a' }}>有效</span>
            )}
          </div>
          {certification_expiry && <div>有效期至: {certification_expiry}</div>}
          {certificate_number && <div>证书编号: {certificate_number}</div>}
        </>
      )}
    </div>
  );

  const tagColor = isExpired ? 'error' : proficiencyColors[proficiency_level];

  if (compact) {
    return (
      <Tooltip title={tooltipContent}>
        <span>
          <Tag color={tagColor} style={{ marginBottom: 4, cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {skill.code}
              {is_certified && !isExpired && (
                <SafetyCertificateOutlined style={{ fontSize: 12 }} />
              )}
              {isExpired && <WarningOutlined style={{ fontSize: 12 }} />}
            </span>
          </Tag>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipContent}>
      <span>
        <Tag color={tagColor} style={{ marginBottom: 4, cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {skill.name}
            <span style={{ opacity: 0.7 }}>({proficiencyLabels[proficiency_level]})</span>
            {is_certified && !isExpired && (
              <SafetyCertificateOutlined style={{ fontSize: 12, color: '#52c41a' }} />
            )}
            {isExpiring && !isExpired && (
              <WarningOutlined style={{ fontSize: 12, color: '#faad14' }} />
            )}
            {isExpired && <WarningOutlined style={{ fontSize: 12 }} />}
          </span>
        </Tag>
      </span>
    </Tooltip>
  );
}
