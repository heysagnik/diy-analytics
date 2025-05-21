import React, { useState, useRef, useEffect } from 'react';
import { Calendar, CaretDown } from '@phosphor-icons/react';
import type { DateRange } from '../../types/analytics';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onDateRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateRanges: DateRange[] = [
    'Last 7 days',
    'Last 30 days',
    'Last 3 months'
  ];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (range: DateRange) => {
    onDateRangeChange(range);
    setIsOpen(false);
  };
  
  return (
    <div className="relative date-picker-container" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm"
      >
        <Calendar size={16} weight="regular" className="text-gray-500" />
        <span>{dateRange}</span>
        <CaretDown size={12} weight="bold" className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white shadow-lg rounded-lg border border-gray-200 z-10 py-1 overflow-hidden">
          {dateRanges.map((range) => (
            <button
              key={range}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${dateRange === range ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
              onClick={() => handleSelect(range)}
            >
              {range}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 