import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { Button, Select, Spin, Tag, Tooltip, DatePicker, App } from 'antd';
import { equipmentService } from '../../services/equipmentService';
import { laboratoryService } from '../../services/laboratoryService';
import type { EquipmentGanttItem, EquipmentSchedule } from '../../services/equipmentService';
import type { Laboratory, EquipmentCategory } from '../../types';

const statusLabels: Record<string, string> = {
  scheduled: '已排程',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

// 优先级颜色定义（按priority_level: 1=最高优先级，5=最低优先级）
const priorityColors: Record<number, string> = {
  1: '#ef4444',  // 紧急 - 红色
  2: '#f97316',  // 高优先级 - 橙色
  3: '#3b82f6',  // 正常 - 蓝色
  4: '#22c55e',  // 低优先级 - 绿色
  5: '#6b7280',  // 常规 - 灰色
};

const priorityLabels: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '正常',
  4: '低',
  5: '常规',
};

const equipmentTypeLabels: Record<string, string> = {
  autonomous: '自主运行',
  operator_dependent: '操作员依赖',
};

const categoryLabels: Record<EquipmentCategory, string> = {
  thermal: '热学设备',
  mechanical: '机械设备',
  electrical: '电学设备',
  optical: '光学设备',
  analytical: '分析设备',
  environmental: '环境设备',
  measurement: '测量设备',
  other: '其他',
};

interface EquipmentSchedulerProps {
  laboratoryId?: number;
}

export function EquipmentScheduler({ laboratoryId: propLabId }: EquipmentSchedulerProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<EquipmentGanttItem[]>([]);
  const [laboratoryId, setLaboratoryId] = useState<number | undefined>(propLabId);
  const [category, setCategory] = useState<EquipmentCategory | undefined>(undefined);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(7, 'day').endOf('day'));

  // Calculate time slots for the header
  const timeSlots = useMemo(() => {
    const slots: { date: Dayjs; label: string }[] = [];
    let current = startDate.startOf('day');
    const end = endDate.endOf('day');
    
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      slots.push({
        date: current,
        label: current.format('MM/DD'),
      });
      current = current.add(1, 'day');
    }
    return slots;
  }, [startDate, endDate]);

  const totalDays = timeSlots.length;
  const totalHours = totalDays * 24;

  const fetchLaboratories = useCallback(async () => {
    try {
      const response = await laboratoryService.getLaboratories({ page_size: 100 });
      setLaboratories(response.items);
    } catch {
      console.error('Failed to fetch laboratories');
    }
  }, []);

  const fetchGanttData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await equipmentService.getGanttData({
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        laboratory_id: laboratoryId,
        category: category,
      });
      setEquipment(data.equipment);
    } catch {
      message.error('获取设备排程数据失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, laboratoryId, category, message]);

  useEffect(() => {
    fetchLaboratories();
  }, [fetchLaboratories]);

  useEffect(() => {
    fetchGanttData();
  }, [fetchGanttData]);

  const handlePrevWeek = () => {
    setStartDate(startDate.subtract(7, 'day'));
    setEndDate(endDate.subtract(7, 'day'));
  };

  const handleNextWeek = () => {
    setStartDate(startDate.add(7, 'day'));
    setEndDate(endDate.add(7, 'day'));
  };

  const handleToday = () => {
    setStartDate(dayjs().startOf('day'));
    setEndDate(dayjs().add(7, 'day').endOf('day'));
  };

  const handleLabChange = (value: number | undefined) => {
    setLaboratoryId(value);
  };

  const handleCategoryChange = (value: EquipmentCategory | undefined) => {
    setCategory(value);
  };

  const handleScheduleClick = (schedule: EquipmentSchedule) => {
    if (schedule.work_order_id) {
      // 跳转到工单页面并展开对应工单的子任务
      navigate(`/work-orders?expand=${schedule.work_order_id}`);
    }
  };

  // Calculate position and width for a schedule bar
  const getScheduleStyle = (schedule: EquipmentSchedule) => {
    const start = dayjs(schedule.start_time);
    const end = dayjs(schedule.end_time);
    const rangeStart = startDate.startOf('day');
    const rangeEnd = endDate.endOf('day');

    // Clamp to visible range
    const visibleStart = start.isBefore(rangeStart) ? rangeStart : start;
    const visibleEnd = end.isAfter(rangeEnd) ? rangeEnd : end;

    const startHours = visibleStart.diff(rangeStart, 'hour', true);
    const durationHours = visibleEnd.diff(visibleStart, 'hour', true);

    const left = (startHours / totalHours) * 100;
    const width = (durationHours / totalHours) * 100;

    // 使用优先级颜色（priority_level 1-5，默认为3）
    const priorityLevel = schedule.priority_level || 3;
    const backgroundColor = priorityColors[priorityLevel] || priorityColors[3];

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, Math.max(0.5, width))}%`,
      backgroundColor,
    };
  };

  const getScheduleTooltipContent = (schedule: EquipmentSchedule) => {
    const start = dayjs(schedule.start_time);
    const end = dayjs(schedule.end_time);
    const priorityLevel = schedule.priority_level || 3;
    return `${schedule.title || '排程'}\n开始: ${start.format('MM/DD HH:mm')}\n结束: ${end.format('MM/DD HH:mm')}\n优先级: ${priorityLabels[priorityLevel] || '正常'}\n状态: ${statusLabels[schedule.status] || schedule.status}${schedule.operator_name ? `\n操作员: ${schedule.operator_name}` : ''}`;
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e5e5', background: '#fafafa' }}>
        <span style={{ fontWeight: 500, color: '#171717' }}>设备排程甘特图</span>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={fetchGanttData}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 192 }}>
            <Select
              placeholder="选择实验室"
              value={laboratoryId}
              onChange={handleLabChange}
              allowClear
              style={{ width: '100%' }}
              options={laboratories.map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />
          </div>
          <div style={{ width: 140 }}>
            <Select
              placeholder="设备类别"
              value={category}
              onChange={handleCategoryChange}
              allowClear
              style={{ width: '100%' }}
              options={Object.entries(categoryLabels).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DatePicker
              value={startDate}
              onChange={(date) => date && setStartDate(date)}
              placeholder="开始日期"
            />
            <span style={{ color: '#a3a3a3' }}>-</span>
            <DatePicker
              value={endDate}
              onChange={(date) => date && setEndDate(date)}
              placeholder="结束日期"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button
              size="small"
              icon={<LeftOutlined />}
              onClick={handlePrevWeek}
            />
            <Button size="small" onClick={handleToday}>
              今天
            </Button>
            <Button
              size="small"
              icon={<RightOutlined />}
              onClick={handleNextWeek}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spin size="large" />
          </div>
        ) : equipment.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#a3a3a3' }}>
            <svg style={{ width: 48, height: 48, marginBottom: 8 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>暂无设备数据</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Gantt Chart Container */}
            <div style={{ minWidth: 800 }}>
              {/* Header - Time slots */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
                <div style={{ width: 192, minWidth: 192, padding: '8px 12px', fontWeight: 500, color: '#404040', background: '#fafafa', borderRight: '1px solid #e5e5e5' }}>
                  设备
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px 4px',
                        fontSize: 12,
                        borderRight: '1px solid #f5f5f5',
                        background: slot.date.isSame(dayjs(), 'day') ? '#f0f5ff' : '#fafafa',
                      }}
                    >
                      {slot.label}
                      <div style={{ fontSize: 10, color: '#a3a3a3' }}>
                        {slot.date.format('ddd')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment rows */}
              {equipment.map((eq) => (
                <div
                  key={eq.id}
                  style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', minHeight: 50 }}
                >
                  {/* Equipment name */}
                  <div style={{ width: 192, minWidth: 192, padding: '8px 12px', borderRight: '1px solid #f5f5f5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 500, color: '#171717', fontSize: 14 }}>{eq.name}</div>
                    <div style={{ fontSize: 11, color: '#737373' }}>
                      {eq.code} · {equipmentTypeLabels[eq.equipment_type] || eq.equipment_type}
                    </div>
                  </div>

                  {/* Schedule bars */}
                  <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
                    {/* Grid lines */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      {timeSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            borderRight: '1px solid #fafafa',
                            background: slot.date.isSame(dayjs(), 'day') ? 'rgba(250,250,250,0.5)' : undefined,
                          }}
                        />
                      ))}
                    </div>

                    {/* Schedule bars */}
                    {eq.schedules.map((schedule) => (
                      <Tooltip key={schedule.id} title={getScheduleTooltipContent(schedule)}>
                        <div
                          onClick={() => handleScheduleClick(schedule)}
                          style={{
                            position: 'absolute',
                            top: 8,
                            height: 'calc(100% - 16px)',
                            minHeight: 24,
                            borderRadius: 4,
                            cursor: schedule.work_order_id ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            color: '#fff',
                            fontSize: 11,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            ...getScheduleStyle(schedule),
                          }}
                        >
                          {schedule.title || `#${schedule.task_id || schedule.id}`}
                        </div>
                      </Tooltip>
                    ))}

                    {/* Empty state indicator */}
                    {eq.schedules.length === 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4d4d4', fontSize: 12 }}>
                        无排程
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 16 }}>
              <span style={{ fontSize: 12, color: '#737373' }}>优先级:</span>
              {Object.entries(priorityLabels).map(([level, label]) => (
                <Tag
                  key={level}
                  style={{ 
                    backgroundColor: priorityColors[Number(level)], 
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  {label}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
