// components/DateRangePicker.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  label?: string;
  range: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

interface DayInfo {
  day: number;
  isCurrentMonth: boolean;
  date: Date;
}

interface LocalRange {
  start: Date | null;
  end: Date | null;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  label = "Date range",
  range,
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [localRange, setLocalRange] = useState<LocalRange>({
    start: range.from || null,
    end: range.to || null
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    setLocalRange({
      start: range.from || null,
      end: range.to || null
    });
  }, [range.from, range.to]);

  const monthNames: readonly string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ] as const;

  const daysOfWeek: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  const getDaysInMonth = (date: Date): DayInfo[] => {
    const year: number = date.getFullYear();
    const month: number = date.getMonth();
    const firstDay: Date = new Date(year, month, 1);
    const lastDay: Date = new Date(year, month + 1, 0);
    const daysInMonth: number = lastDay.getDate();
    const startingDayOfWeek: number = (firstDay.getDay() + 6) % 7;

    const days: DayInfo[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay: Date = new Date(year, month, 1 - (startingDayOfWeek - i));
      days.push({
        day: prevMonthDay.getDate(),
        isCurrentMonth: false,
        date: prevMonthDay
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      });
    }

    const totalCells: number = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    for (let i = days.length; i < totalCells; i++) {
      const nextMonthDate: Date = new Date(year, month + 1, nextMonthDay);
      days.push({
        day: nextMonthDay,
        isCurrentMonth: false,
        date: nextMonthDate
      });
      nextMonthDay++;
    }

    return days;
  };

  const navigateMonth = (direction: number): void => {
    const newDate: Date = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const selectDate = (date: Date): void => {
    if (!localRange.start || (localRange.start && localRange.end)) {
      setLocalRange({ start: date, end: null });
    } else if (localRange.start && !localRange.end) {
      if (date < localRange.start) {
        setLocalRange({ start: date, end: localRange.start });
      } else {
        setLocalRange({ start: localRange.start, end: date });
      }
    }
  };

  const handleApply = (): void => {
    const newRange: DateRange = {
      from: localRange.start || undefined,
      to: localRange.end || undefined
    };
    onChange(newRange);
    setIsOpen(false);
  };

  const clearRange = (): void => {
    setLocalRange({ start: null, end: null });
  };

  const isDateInRange = (date: Date): boolean => {
    if (!localRange.start) return false;
    if (!localRange.end && !hoverDate) return date.getTime() === localRange.start.getTime();
    
    const endDate: Date | null = localRange.end || hoverDate;
    if (!endDate) return false;
    
    const startTime: number = localRange.start.getTime();
    const endTime: number = endDate.getTime();
    const dateTime: number = date.getTime();
    
    return dateTime >= Math.min(startTime, endTime) && dateTime <= Math.max(startTime, endTime);
  };

  const isRangeStart = (date: Date): boolean => {
    return localRange.start !== null && date.getTime() === localRange.start.getTime();
  };

  const isRangeEnd = (date: Date): boolean => {
    return localRange.end !== null && date.getTime() === localRange.end.getTime();
  };

  const getDayClassName = (dayInfo: DayInfo): string => {
    if (!dayInfo.isCurrentMonth) {
      return 'text-slate-400 cursor-default';
    }

    const inRange: boolean = isDateInRange(dayInfo.date);
    const isStart: boolean = isRangeStart(dayInfo.date);
    const isEnd: boolean = isRangeEnd(dayInfo.date);
    
    let className = 'text-slate-900 cursor-pointer transition-all duration-200 ';
    
    if (isStart || isEnd) {
      className += 'bg-[#00156B] text-white shadow-lg z-10 relative ';
    } else if (inRange) {
      className += 'bg-[#00156B] bg-opacity-10 ';
    } else {
      className += 'hover:bg-slate-100 hover:scale-105 ';
    }
    
    return className;
  };

  const formatRangeDisplay = (): string => {
    if (!range.from) return 'Select a date range';
    if (!range.to) return range.from.toLocaleDateString('en-US');
    if (range.from.getTime() === range.to.getTime()) {
      return range.from.toLocaleDateString('en-US');
    }
    return `${range.from.toLocaleDateString('en-US')} - ${range.to.toLocaleDateString('en-US')}`;
  };

  const days: DayInfo[] = getDaysInMonth(currentDate);

  return (
    <div className={className}>
      <label className="block text-xs text-gray-600">{label}</label>
      
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-left shadow-sm flex items-center justify-between"
        style={{ borderColor: '#00156B20', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}
      >
        <span className="truncate text-sm">
          {formatRangeDisplay()}
        </span>
        <Calendar className="size-4 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed inset-0 flex items-start justify-center overflow-y-auto z-50 p-4 pt-24 sm:pt-32 pointer-events-none">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                
                <h2 className="text-slate-900 text-lg font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                
                <button 
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  type="button"
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="mb-4 min-h-[1.5rem]">
                {localRange.start && (
                  <div className="text-center text-sm text-slate-600">
                    {localRange.end ? (
                      <>
                        <span className="font-medium">{localRange.start.toLocaleDateString('en-US')}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">{localRange.end.toLocaleDateString('en-US')}</span>
                      </>
                    ) : (
                      <span className="text-[#00156B]">Select end date</span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day: string, index: number) => (
                  <div key={index} className="text-center text-sm text-slate-500 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-6">
                {days.map((dayInfo: DayInfo, index: number) => (
                  <button
                    key={index}
                    onClick={() => dayInfo.isCurrentMonth && selectDate(dayInfo.date)}
                    onMouseEnter={() => dayInfo.isCurrentMonth && setHoverDate(dayInfo.date)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`
                      h-10 w-10 rounded-lg text-sm font-medium
                      ${getDayClassName(dayInfo)}
                    `}
                    disabled={!dayInfo.isCurrentMonth}
                    type="button"
                  >
                    {dayInfo.day}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearRange}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!localRange.start}
                  type="button"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  disabled={!localRange.start}
                  className="flex-1 bg-[#00156B] hover:bg-[#00156B]/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  type="button"
                >
                  Apply
                  <div className="w-4 h-4 bg-white bg-opacity-20 rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 border-r border-b border-white transform rotate-45 -translate-x-0.5 -translate-y-0.5"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;