import { useState, useRef, useEffect } from 'react';
import { Calendar, CaretRight, CaretLeft} from '@phosphor-icons/react';
import type { DateRange } from '@/types/analytics';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const predefinedRanges: DateRange[] = [
  "Last Hour",
  "Last 24 hours", 
  "Last 7 days",
  "Last 30 days",
  "Last 6 months",
  "Last 12 months"
];

// interface CustomRange {
//   startDate: Date;
//   endDate: Date;
// }

export default function DateRangePicker({ 
  dateRange, 
  onDateRangeChange,
  className
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCalendar(false);
        resetSelection();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const resetSelection = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setIsSelectingRange(false);
  };

  const handleRangeSelect = (range: DateRange | "Custom Range") => {
    if (range === "Custom Range") {
      setShowCalendar(true);
      setIsSelectingRange(true);
      setIsOpen(false);
    } else {
      onDateRangeChange(range);
      setIsOpen(false);
      resetSelection();
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert to Monday = 0
    
    const days = [];
    
    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      });
    }
    
    // Add next month's leading days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day)
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Don't allow future dates
    if (date > today) return;
    
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      if (date < selectedStart) {
        setSelectedStart(date);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(date);
      }
    }
  };

  const applyCustomRange = () => {
    if (selectedStart && selectedEnd) {
      // Format the custom range for display
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      };
      
      const customRangeLabel = `${formatDate(selectedStart)} - ${formatDate(selectedEnd)}` as DateRange;
      onDateRangeChange(customRangeLabel);
      setShowCalendar(false);
      setIsSelectingRange(false);
    }
  };

  const cancelCustomRange = () => {
    setShowCalendar(false);
    setIsSelectingRange(false);
    resetSelection();
  };

  const isDateBetween = (date: Date) => {
    if (!selectedStart || !selectedEnd) return false;
    return date > selectedStart && date < selectedEnd;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth.getMonth() === now.getMonth() && 
           currentMonth.getFullYear() === now.getFullYear();
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex bg-white rounded-lg md:shadow relative">
        {/* Calendar Button */}
        <button 
          className={`hover:bg-gray-100 text-gray-500 focus:text-gray-600 hover:text-gray-600 focus:outline-none text-sm px-2.5 flex items-center font-semibold rounded-l-lg transition-colors ${
            showCalendar ? 'bg-gray-50 !text-gray-600' : ''
          }`}
          style={{ height: '36px' }}
          onClick={() => handleRangeSelect("Custom Range" as DateRange)}
        >
          <Calendar size={17} className="-mt-px" />
        </button>

        {/* Range Picker Button */}
        <button
          className={`hover:bg-gray-100 text-gray-500 hover:text-gray-600 focus:text-gray-600 focus:outline-none text-sm pr-1.5 pl-2 flex items-center justify-center font-semibold rounded-r-lg relative overflow-hidden border-l border-gray-200 transition-colors ${
            className || ''
          }`}
          style={{ height: '36px' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-gray-900 mx-1 truncate max-w-32">{dateRange}</span>
          <CaretRight size={19} className="transform rotate-90 mr-1 mt-px flex-shrink-0" />
        </button>
      </div>

      {/* Calendar Popup - Positioned more to the left */}
      {showCalendar && (
        <div 
          className="absolute top-full mt-2 bg-white shadow-xl rounded-lg border border-gray-200 z-50 animate-in slide-in-from-top-2 duration-200"
          ref={calendarRef}
          style={{ 
            width: '320px',
            left: '-120px' // Move the calendar 120px to the left
          }}
        >
          <div className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                onClick={() => navigateMonth('prev')}
              >
                <CaretLeft size={16} />
              </button>
              
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={goToCurrentMonth}
                >
                  {formatMonthYear(currentMonth)}
                </button>
                {!isCurrentMonth() && (
                  <button
                    className="w-2 h-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                    onClick={goToCurrentMonth}
                    title="Go to current month"
                  />
                )}
              </div>
              
              <button 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                onClick={() => navigateMonth('next')}
              >
                <CaretRight size={16} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-xs text-center text-gray-500 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((dayObj, index) => {
                  const isSelected = selectedStart && dayObj.date.getTime() === selectedStart.getTime();
                  const isEndSelected = selectedEnd && dayObj.date.getTime() === selectedEnd.getTime();
                  const isInRange = isDateBetween(dayObj.date);
                  const isCurrentDay = isToday(dayObj.date);
                  const isFuture = dayObj.date > new Date();
                  
                  return (
                    <button
                      key={index}
                      className={`
                        relative h-8 w-8 text-sm rounded-md transition-all duration-150 font-medium
                        ${!dayObj.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                        ${isFuture ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                        ${isEndSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                        ${isInRange ? 'bg-blue-100 text-blue-700' : ''}
                        ${isCurrentDay && !isSelected && !isEndSelected ? 'ring-2 ring-blue-200' : ''}
                      `}
                      onClick={() => handleDateClick(dayObj.date)}
                      disabled={isFuture}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Range Selection Status */}
            {isSelectingRange && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700">
                  {!selectedStart && "Select start date"}
                  {selectedStart && !selectedEnd && "Select end date"}
                  {selectedStart && selectedEnd && (
                    <div className="space-y-2">
                      <div>
                        <strong>Range:</strong> {selectedStart.toLocaleDateString()} - {selectedEnd.toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={applyCustomRange}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Apply Range
                        </button>
                        <button
                          onClick={cancelCustomRange}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {!isSelectingRange && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsSelectingRange(true);
                    resetSelection();
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Select Custom Range
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 bg-white shadow-xl rounded-lg border border-gray-200 py-1 z-50 animate-in slide-in-from-top-2 duration-200"
          style={{ minWidth: '160px' }}
        >
          {predefinedRanges.map((range) => (
            <button
              key={range}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                dateRange === range ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
              onClick={() => handleRangeSelect(range)}
            >
              {range}
            </button>
          ))}
          <hr className="my-1 border-gray-200" />
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => handleRangeSelect("Custom Range" as DateRange)}
          >
            Custom Range
          </button>
        </div>
      )}
    </div>
  );
}