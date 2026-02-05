import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Tabs, Spin, Tooltip, Alert, App } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { equipmentService } from '../../services/equipmentService';
import type { EquipmentGanttItem, EquipmentSchedule, EquipmentByNameResponse } from '../../services/equipmentService';
import type { Equipment } from '../../types';

// 优先级颜色定义
const priorityColors: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#3b82f6',
  4: '#22c55e',
  5: '#6b7280',
};

const priorityLabels: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '正常',
  4: '低',
  5: '常规',
};

const statusLabels: Record<string, string> = {
  scheduled: '已排程',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

interface TimeSelection {
  equipmentId: number;
  equipmentCode: string;
  startTime: Dayjs;
  endTime: Dayjs;
}

interface CriticalEquipmentSchedulerProps {
  equipmentNameId: number;
  siteId: number;
  onTimeSelected?: (selection: TimeSelection | null) => void;
  initialSelection?: {
    equipmentId: number;
    startTime: string;
    endTime: string;
  };
}

export function CriticalEquipmentScheduler({
  equipmentNameId,
  siteId,
  onTimeSelected,
  initialSelection,
}: CriticalEquipmentSchedulerProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentName, setEquipmentName] = useState<string>('');
  const [ganttData, setGanttData] = useState<EquipmentGanttItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('day'));
  
  // 时间选择状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ hour: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ hour: number } | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSelection | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 7天显示，每小时一格
  const endDate = useMemo(() => startDate.add(6, 'day').endOf('day'), [startDate]);
  const totalDays = 7;
  const totalHours = totalDays * 24;

  // 生成时间槽（每天）
  const timeSlots = useMemo(() => {
    const slots: { date: Dayjs; label: string }[] = [];
    let current = startDate.startOf('day');
    for (let i = 0; i < totalDays; i++) {
      slots.push({
        date: current,
        label: current.format('MM/DD'),
      });
      current = current.add(1, 'day');
    }
    return slots;
  }, [startDate]);

  // 生成小时刻度（每6小时显示）
  const hourMarkers = useMemo(() => {
    const markers: { hour: number; label: string }[] = [];
    for (let day = 0; day < totalDays; day++) {
      for (let hour = 0; hour < 24; hour += 6) {
        markers.push({
          hour: day * 24 + hour,
          label: `${hour}:00`,
        });
      }
    }
    return markers;
  }, []);

  // 获取设备列表和甘特图数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 获取设备名下的所有设备
      const response: EquipmentByNameResponse = await equipmentService.getEquipmentByName(equipmentNameId, siteId);
      setEquipmentList(response.items);
      setEquipmentName(response.equipment_name);
      
      if (response.items.length > 0) {
        // 设置初始tab
        const initialEquipment = initialSelection
          ? response.items.find(e => e.id === initialSelection.equipmentId) || response.items[0]
          : response.items[0];
        setActiveTab(String(initialEquipment.id));
        
        // 获取甘特图数据
        const equipmentIds = response.items.map(e => e.id);
        const gantt = await equipmentService.getGanttData({
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          equipment_ids: equipmentIds,
        });
        setGanttData(gantt.equipment);
        
        // 如果有初始选择，恢复它
        if (initialSelection) {
          setSelectedTime({
            equipmentId: initialSelection.equipmentId,
            equipmentCode: initialEquipment.code,
            startTime: dayjs(initialSelection.startTime),
            endTime: dayjs(initialSelection.endTime),
          });
        }
      }
    } catch (error) {
      message.error('获取设备数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [equipmentNameId, siteId, startDate, endDate, message, initialSelection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 获取当前选中设备的排程
  const currentEquipmentSchedules = useMemo(() => {
    const equipmentId = Number(activeTab);
    const equipment = ganttData.find(e => e.id === equipmentId);
    return equipment?.schedules || [];
  }, [activeTab, ganttData]);

  // 检查时间段是否有冲突
  const checkConflict = useCallback((startHour: number, endHour: number): boolean => {
    const selStart = startDate.add(startHour, 'hour');
    const selEnd = startDate.add(endHour, 'hour');
    
    for (const schedule of currentEquipmentSchedules) {
      const schStart = dayjs(schedule.start_time);
      const schEnd = dayjs(schedule.end_time);
      
      // 检查重叠
      if (selStart.isBefore(schEnd) && selEnd.isAfter(schStart)) {
        return true;
      }
    }
    return false;
  }, [currentEquipmentSchedules, startDate]);

  // 处理鼠标按下 - 开始选择
  const handleMouseDown = (hourIndex: number) => {
    setIsSelecting(true);
    setSelectionStart({ hour: hourIndex });
    setSelectionEnd({ hour: hourIndex });
    setConflictError(null);
  };

  // 处理鼠标移动 - 更新选择范围
  const handleMouseMove = (hourIndex: number) => {
    if (!isSelecting || !selectionStart) return;
    setSelectionEnd({ hour: hourIndex });
  };

  // 处理鼠标抬起 - 完成选择
  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      return;
    }

    const start = Math.min(selectionStart.hour, selectionEnd.hour);
    const end = Math.max(selectionStart.hour, selectionEnd.hour) + 1; // +1 因为是结束位置

    // 检查冲突
    if (checkConflict(start, end)) {
      setConflictError('所选时间段与已有排程冲突，请选择其他时间');
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // 获取当前设备信息
    const currentEquipment = equipmentList.find(e => e.id === Number(activeTab));
    if (!currentEquipment) {
      setIsSelecting(false);
      return;
    }

    const selection: TimeSelection = {
      equipmentId: currentEquipment.id,
      equipmentCode: currentEquipment.code,
      startTime: startDate.add(start, 'hour'),
      endTime: startDate.add(end, 'hour'),
    };

    setSelectedTime(selection);
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setConflictError(null);
    
    onTimeSelected?.(selection);
  };

  // 处理鼠标离开区域
  const handleMouseLeave = () => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedTime(null);
    onTimeSelected?.(null);
  };

  // 计算排程条的样式
  const getScheduleStyle = (schedule: EquipmentSchedule) => {
    const start = dayjs(schedule.start_time);
    const end = dayjs(schedule.end_time);
    const rangeStart = startDate.startOf('day');
    const rangeEnd = endDate.endOf('day');

    const visibleStart = start.isBefore(rangeStart) ? rangeStart : start;
    const visibleEnd = end.isAfter(rangeEnd) ? rangeEnd : end;

    const startHours = visibleStart.diff(rangeStart, 'hour', true);
    const durationHours = visibleEnd.diff(visibleStart, 'hour', true);

    const left = (startHours / totalHours) * 100;
    const width = (durationHours / totalHours) * 100;

    const priorityLevel = schedule.priority_level || 3;
    const backgroundColor = priorityColors[priorityLevel] || priorityColors[3];

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, Math.max(0.5, width))}%`,
      backgroundColor,
    };
  };

  // 计算选择区域的样式
  const getSelectionStyle = () => {
    if (!selectionStart || !selectionEnd) return null;
    
    const start = Math.min(selectionStart.hour, selectionEnd.hour);
    const end = Math.max(selectionStart.hour, selectionEnd.hour) + 1;
    
    const left = (start / totalHours) * 100;
    const width = ((end - start) / totalHours) * 100;
    
    const hasConflict = checkConflict(start, end);
    
    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: hasConflict ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
      border: hasConflict ? '2px dashed #ef4444' : '2px dashed #3b82f6',
    };
  };

  // 计算已选择时间的样式
  const getSelectedTimeStyle = () => {
    if (!selectedTime || Number(activeTab) !== selectedTime.equipmentId) return null;
    
    const startHours = selectedTime.startTime.diff(startDate, 'hour', true);
    const durationHours = selectedTime.endTime.diff(selectedTime.startTime, 'hour', true);
    
    const left = (startHours / totalHours) * 100;
    const width = (durationHours / totalHours) * 100;
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100, width)}%`,
      backgroundColor: 'rgba(34, 197, 94, 0.4)',
      border: '2px solid #22c55e',
    };
  };

  // 导航按钮
  const handlePrevWeek = () => setStartDate(startDate.subtract(7, 'day'));
  const handleNextWeek = () => setStartDate(startDate.add(7, 'day'));
  const handleToday = () => setStartDate(dayjs().startOf('day'));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (equipmentList.length === 0) {
    return (
      <Alert
        type="warning"
        message="该站点下没有可用的同名设备"
        description="请联系管理员添加设备或选择其他设备名"
      />
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5' }}>
      {/* 头部 */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e5e5', 
        background: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontWeight: 500, color: '#171717' }}>
            关键设备调度 - {equipmentName}
          </span>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#737373' }}>
            ({equipmentList.length} 台设备)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePrevWeek}
            style={{ 
              border: '1px solid #d4d4d4', 
              borderRadius: 4, 
              padding: '4px 8px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <LeftOutlined />
          </button>
          <button
            onClick={handleToday}
            style={{ 
              border: '1px solid #d4d4d4', 
              borderRadius: 4, 
              padding: '4px 8px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            本周
          </button>
          <button
            onClick={handleNextWeek}
            style={{ 
              border: '1px solid #d4d4d4', 
              borderRadius: 4, 
              padding: '4px 8px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <RightOutlined />
          </button>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#737373' }}>
            {startDate.format('YYYY/MM/DD')} - {endDate.format('MM/DD')}
          </span>
        </div>
      </div>

      {/* 设备标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ padding: '0 16px' }}
        items={equipmentList.map(eq => ({
          key: String(eq.id),
          label: (
            <span>
              {eq.code}
              {selectedTime?.equipmentId === eq.id && (
                <span style={{ marginLeft: 4, color: '#22c55e' }}>*</span>
              )}
            </span>
          ),
        }))}
      />

      {/* 冲突提示 */}
      {conflictError && (
        <Alert
          type="error"
          message={conflictError}
          showIcon
          closable
          onClose={() => setConflictError(null)}
          style={{ margin: '0 16px 16px' }}
        />
      )}

      {/* 已选择时间显示 */}
      {selectedTime && (
        <Alert
          type="success"
          message={
            <span>
              已选择时间: {selectedTime.startTime.format('MM/DD HH:mm')} - {selectedTime.endTime.format('MM/DD HH:mm')}
              (设备 {selectedTime.equipmentCode})
              <a 
                onClick={handleClearSelection}
                style={{ marginLeft: 16, color: '#ef4444' }}
              >
                清除选择
              </a>
            </span>
          }
          showIcon
          style={{ margin: '0 16px 16px' }}
        />
      )}

      {/* 甘特图 */}
      <div 
        ref={containerRef}
        style={{ padding: '0 16px 16px', overflowX: 'auto' }}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ minWidth: 1200 }}>
          {/* 日期头部 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ 
              width: 60, 
              minWidth: 60, 
              padding: '8px 4px', 
              background: '#fafafa',
              borderRight: '1px solid #e5e5e5',
              textAlign: 'center',
              fontSize: 11,
              color: '#737373'
            }}>
              时间
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              {timeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '4px',
                    fontSize: 12,
                    borderRight: '1px solid #f5f5f5',
                    background: slot.date.isSame(dayjs(), 'day') ? '#f0f5ff' : '#fafafa',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{slot.label}</div>
                  <div style={{ fontSize: 10, color: '#a3a3a3' }}>
                    {slot.date.format('ddd')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 小时刻度 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ 
              width: 60, 
              minWidth: 60, 
              background: '#fafafa',
              borderRight: '1px solid #e5e5e5'
            }} />
            <div style={{ flex: 1, display: 'flex', position: 'relative', height: 20 }}>
              {hourMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: `${(marker.hour / totalHours) * 100}%`,
                    fontSize: 9,
                    color: '#a3a3a3',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          </div>

          {/* 排程区域 */}
          <div 
            style={{ 
              display: 'flex', 
              minHeight: 80,
              userSelect: 'none',
            }}
          >
            <div style={{ 
              width: 60, 
              minWidth: 60, 
              background: '#fafafa',
              borderRight: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#737373'
            }}>
              排程
            </div>
            <div 
              style={{ 
                flex: 1, 
                position: 'relative', 
                background: '#fff',
                cursor: 'crosshair'
              }}
              onMouseUp={handleMouseUp}
            >
              {/* 网格线 */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                {timeSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      borderRight: '1px solid #f5f5f5',
                      background: slot.date.isSame(dayjs(), 'day') ? 'rgba(240,245,255,0.3)' : undefined,
                    }}
                  />
                ))}
              </div>

              {/* 小时格子（用于交互） */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                {Array.from({ length: totalHours }).map((_, hourIdx) => (
                  <div
                    key={hourIdx}
                    style={{
                      flex: 1,
                      borderRight: hourIdx % 24 === 23 ? '1px solid #e5e5e5' : '1px solid #fafafa',
                    }}
                    onMouseDown={() => handleMouseDown(hourIdx)}
                    onMouseMove={() => handleMouseMove(hourIdx)}
                  />
                ))}
              </div>

              {/* 已有排程 */}
              {currentEquipmentSchedules.map((schedule) => (
                <Tooltip
                  key={schedule.id}
                  title={
                    <div>
                      <div>{schedule.title || '排程'}</div>
                      <div>开始: {dayjs(schedule.start_time).format('MM/DD HH:mm')}</div>
                      <div>结束: {dayjs(schedule.end_time).format('MM/DD HH:mm')}</div>
                      <div>优先级: {priorityLabels[schedule.priority_level || 3]}</div>
                      <div>状态: {statusLabels[schedule.status]}</div>
                      {schedule.operator_name && <div>操作员: {schedule.operator_name}</div>}
                    </div>
                  }
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      height: 'calc(100% - 24px)',
                      minHeight: 32,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      color: '#fff',
                      fontSize: 11,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      pointerEvents: 'none',
                      ...getScheduleStyle(schedule),
                    }}
                  >
                    {schedule.title || `#${schedule.task_id || schedule.id}`}
                  </div>
                </Tooltip>
              ))}

              {/* 正在选择的区域 */}
              {isSelecting && selectionStart && selectionEnd && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    height: 'calc(100% - 16px)',
                    borderRadius: 4,
                    zIndex: 20,
                    pointerEvents: 'none',
                    ...getSelectionStyle(),
                  }}
                />
              )}

              {/* 已选择的时间 */}
              {getSelectedTimeStyle() && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    height: 'calc(100% - 16px)',
                    borderRadius: 4,
                    zIndex: 15,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#166534',
                    fontSize: 11,
                    fontWeight: 500,
                    ...getSelectedTimeStyle(),
                  }}
                >
                  已选择
                </div>
              )}

              {/* 空状态 */}
              {currentEquipmentSchedules.length === 0 && !selectedTime && !isSelecting && (
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#d4d4d4', 
                  fontSize: 12,
                  pointerEvents: 'none'
                }}>
                  拖动选择时间段
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div style={{ 
        padding: '8px 16px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#737373'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>操作提示: 拖动鼠标选择时间段</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>图例:</span>
          {Object.entries(priorityLabels).map(([level, label]) => (
            <span
              key={level}
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 3,
                backgroundColor: priorityColors[Number(level)],
                color: '#fff',
                fontSize: 10,
              }}
            >
              {label}
            </span>
          ))}
          <span
            style={{
              display: 'inline-block',
              padding: '2px 6px',
              borderRadius: 3,
              backgroundColor: 'rgba(34, 197, 94, 0.4)',
              border: '1px solid #22c55e',
              color: '#166534',
              fontSize: 10,
            }}
          >
            已选择
          </span>
        </div>
      </div>
    </div>
  );
}
