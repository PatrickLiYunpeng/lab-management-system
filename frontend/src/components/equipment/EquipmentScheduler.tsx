import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import dayjs, { type Dayjs } from 'dayjs';
import { equipmentService } from '../../services/equipmentService';
import { laboratoryService } from '../../services/laboratoryService';
import type { EquipmentGanttItem, EquipmentSchedule } from '../../services/equipmentService';
import type { Laboratory } from '../../types';
import { Button, Select, Spin, Tag, Tooltip, DatePicker, useToast } from '../ui';

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#22c55e',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

const statusLabels: Record<string, string> = {
  scheduled: '已排程',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const equipmentTypeLabels: Record<string, string> = {
  autonomous: '自主运行',
  operator_dependent: '操作员依赖',
};

interface EquipmentSchedulerProps {
  laboratoryId?: number;
}

export function EquipmentScheduler({ laboratoryId: propLabId }: EquipmentSchedulerProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<EquipmentGanttItem[]>([]);
  const [laboratoryId, setLaboratoryId] = useState<number | undefined>(propLabId);
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
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        laboratory_id: laboratoryId,
      });
      setEquipment(data.equipment);
    } catch {
      toast.error('获取设备排程数据失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, laboratoryId, toast]);

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

  const handleLabChange = (value: string | number | (string | number)[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setLaboratoryId(v ? Number(v) : undefined);
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

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, Math.max(0.5, width))}%`,
      backgroundColor: statusColors[schedule.status] || '#3b82f6',
    };
  };

  const getScheduleTooltipContent = (schedule: EquipmentSchedule) => {
    const start = dayjs(schedule.start_time);
    const end = dayjs(schedule.end_time);
    return `${schedule.title || '排程'}\n开始: ${start.format('MM/DD HH:mm')}\n结束: ${end.format('MM/DD HH:mm')}\n状态: ${statusLabels[schedule.status] || schedule.status}${schedule.operator_name ? `\n操作员: ${schedule.operator_name}` : ''}`;
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <span className="font-medium text-neutral-900">设备排程甘特图</span>
        <Button
          variant="default"
          size="small"
          icon={<ArrowPathIcon className="w-4 h-4" />}
          onClick={fetchGanttData}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <div className="p-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="w-48">
            <Select
              placeholder="选择实验室"
              value={laboratoryId}
              onChange={handleLabChange}
              allowClear
              options={laboratories.map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={startDate}
              onChange={(date) => date && setStartDate(date)}
              placeholder="开始日期"
            />
            <span className="text-neutral-400">-</span>
            <DatePicker
              value={endDate}
              onChange={(date) => date && setEndDate(date)}
              placeholder="结束日期"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="small"
              icon={<ChevronLeftIcon className="w-4 h-4" />}
              onClick={handlePrevWeek}
            />
            <Button variant="default" size="small" onClick={handleToday}>
              今天
            </Button>
            <Button
              variant="default"
              size="small"
              icon={<ChevronRightIcon className="w-4 h-4" />}
              onClick={handleNextWeek}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : equipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>暂无设备数据</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Gantt Chart Container */}
            <div className="min-w-[800px]">
              {/* Header - Time slots */}
              <div className="flex border-b border-neutral-200">
                <div className="w-48 min-w-[12rem] px-3 py-2 font-medium text-neutral-700 bg-neutral-50 border-r border-neutral-200">
                  设备
                </div>
                <div className="flex-1 flex">
                  {timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 text-center px-1 py-2 text-xs border-r border-neutral-100 ${
                        slot.date.isSame(dayjs(), 'day') ? 'bg-primary-50' : 'bg-neutral-50'
                      }`}
                    >
                      {slot.label}
                      <div className="text-[10px] text-neutral-400">
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
                  className="flex border-b border-neutral-100 min-h-[50px]"
                >
                  {/* Equipment name */}
                  <div className="w-48 min-w-[12rem] px-3 py-2 border-r border-neutral-100 flex flex-col justify-center">
                    <div className="font-medium text-neutral-900 text-sm">{eq.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      {eq.code} · {equipmentTypeLabels[eq.equipment_type] || eq.equipment_type}
                    </div>
                  </div>

                  {/* Schedule bars */}
                  <div className="flex-1 relative bg-white">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 border-r border-neutral-50 ${
                            slot.date.isSame(dayjs(), 'day') ? 'bg-neutral-50/50' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Schedule bars */}
                    {eq.schedules.map((schedule) => (
                      <Tooltip key={schedule.id} title={getScheduleTooltipContent(schedule)}>
                        <div
                          className="absolute top-2 h-[calc(100%-16px)] min-h-[24px] rounded cursor-pointer flex items-center px-2 text-white text-[11px] overflow-hidden text-ellipsis whitespace-nowrap shadow-sm"
                          style={getScheduleStyle(schedule)}
                        >
                          {schedule.title || `#${schedule.task_id || schedule.id}`}
                        </div>
                      </Tooltip>
                    ))}

                    {/* Empty state indicator */}
                    {eq.schedules.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">
                        无排程
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 mt-4">
              <span className="text-xs text-neutral-500">状态:</span>
              {Object.entries(statusLabels).map(([status, label]) => (
                <Tag
                  key={status}
                  color={
                    status === 'scheduled' ? 'blue' :
                    status === 'in_progress' ? 'success' :
                    status === 'completed' ? 'default' : 'error'
                  }
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
