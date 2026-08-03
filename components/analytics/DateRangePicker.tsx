import React, { useState, useRef, useEffect, useId } from 'react';
import { DateRange } from '@/types/analytics';
import { CalendarIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  customRange?: CustomDateRange | null;
  onCustomRangeChange?: (range: CustomDateRange | null) => void;
}

const DATE_RANGE_OPTIONS: DateRange[] = [
  'Last Hour',
  'Last 24 hours',
  'Last 7 days',
  'Last 30 days',
  'Last 6 months',
  'Last 12 months',
  'All Time',
];

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const parseISODate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};

const toISODate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

interface MiniCalendarProps {
  value: string;
  onChange: (date: string) => void;
}

function MiniCalendar({ value, onChange }: MiniCalendarProps) {
  const today = new Date();
  const initial = (value && parseISODate(value)) || today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const initialDayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    initialDayRef.current?.focus();
  }, []);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="w-64 rounded-xl bg-surface border border-border shadow-xl p-2.5 text-xs transition-[opacity,transform] duration-150 ease-out starting:opacity-0 starting:scale-95">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-1.5 before:content-['']"
        >
          <CaretLeftIcon size={12} weight="bold" />
        </button>
        <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-1.5 before:content-['']"
        >
          <CaretRightIcon size={12} weight="bold" />
        </button>
      </div>

      <div
        className="grid gap-y-0.5 text-center"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="label-eyebrow py-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <span key={`empty-${idx}`} />;
          const iso = toISODate(viewYear, viewMonth, day);
          const isSelected = value === iso;
          const isToday =
            today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
          const receivesInitialFocus = isSelected || (!parseISODate(value) && isToday) || (day === 1 && !isSelected && !isToday);

          return (
            <button
              key={day}
              type="button"
              ref={receivesInitialFocus ? initialDayRef : undefined}
              aria-label={new Date(viewYear, viewMonth, day).toLocaleDateString(undefined, {
                dateStyle: 'long',
              })}
              onClick={() => onChange(iso)}
              className={`mx-auto flex size-7 items-center justify-center rounded-full tabular-nums transition-colors duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : isToday
                  ? 'font-semibold text-accent ring-1 ring-inset ring-accent/40 hover:bg-surface-secondary'
                  : 'text-foreground hover:bg-surface-secondary'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  isActive: boolean;
  onToggle: () => void;
  onChange: (date: string) => void;
  error?: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

function DateField({ label, value, isActive, onToggle, onChange, error, buttonRef }: DateFieldProps) {
  const id = useId();
  const buttonId = `${id}-button`;
  const errorId = `${id}-error`;
  return (
    <div className="relative flex flex-col gap-1">
      <Label htmlFor={buttonId}>{label}</Label>
      <button
        id={buttonId}
        type="button"
        ref={buttonRef}
        onClick={onToggle}
        aria-expanded={isActive}
        aria-describedby={error ? errorId : undefined}
        className="h-8 w-full flex items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground transition-colors outline-none hover:bg-surface-secondary/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value || 'Select date'}</span>
        <CalendarIcon size={14} className="text-muted-foreground" />
      </button>
      {isActive && (
        <div className="absolute left-0 top-full z-10 mt-1">
          <MiniCalendar value={value} onChange={onChange} />
        </div>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  customRange,
  onCustomRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState(customRange?.startDate || '');
  const [endDate, setEndDate] = useState(customRange?.endDate || '');
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const endButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStartDate(customRange?.startDate || '');
      setEndDate(customRange?.endDate || '');
      setErrors({});
    });
    return () => cancelAnimationFrame(raf);
  }, [customRange?.startDate, customRange?.endDate]);

  useEffect(() => {
    if (isOpen) {
      let enterRaf = 0;
      const mountRaf = requestAnimationFrame(() => {
        setIsMounted(true);
        enterRaf = requestAnimationFrame(() => setIsEntered(true));
      });
      const focusRaf = requestAnimationFrame(() => {
        if (showCustomPicker) startButtonRef.current?.focus();
        else dropdownRef.current?.querySelector<HTMLButtonElement>('[data-date-range-option]')?.focus();
      });
      wasOpen.current = true;
      return () => {
        cancelAnimationFrame(mountRaf);
        cancelAnimationFrame(enterRaf);
        cancelAnimationFrame(focusRaf);
      };
    }
    const closeRaf = requestAnimationFrame(() => {
      setIsEntered(false);
      setActiveField(null);
      if (wasOpen.current) {
        triggerRef.current?.focus();
        wasOpen.current = false;
      }
    });
    return () => cancelAnimationFrame(closeRaf);
  }, [isOpen, showCustomPicker]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (option: DateRange) => {
    onDateRangeChange(option);
    if (onCustomRangeChange) onCustomRangeChange(null);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseISODate(startDate);
    const end = parseISODate(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextErrors: { start?: string; end?: string } = {};
    if (!start) nextErrors.start = 'Enter a valid date in YYYY-MM-DD format.';
    if (!end) nextErrors.end = 'Enter a valid date in YYYY-MM-DD format.';
    if (start && end && start > end) {
      nextErrors.start = 'Start date must be on or before the end date.';
      nextErrors.end = 'End date must be on or after the start date.';
    }
    if (end && end > today) nextErrors.end = 'End date cannot be in the future.';
    setErrors(nextErrors);

    if (nextErrors.start || nextErrors.end) {
      requestAnimationFrame(() => {
        (nextErrors.start ? startButtonRef : endButtonRef).current?.focus();
      });
    } else if (onCustomRangeChange) {
      onCustomRangeChange({ startDate, endDate });
      setIsOpen(false);
      setShowCustomPicker(false);
    }
  };

  const displayText = customRange
    ? `${customRange.startDate} - ${customRange.endDate}`
    : dateRange;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setShowCustomPicker(false);
    }
  };

  return (
    <div className="relative font-body" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <Button
        ref={triggerRef}
        size="sm"
        variant="outline"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <CalendarIcon size={14} />
        <span>{displayText}</span>
        <CaretDownIcon
          size={12}
          className={`transition-transform duration-150 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </Button>

      {isMounted && (
        <div
          onTransitionEnd={() => { if (!isOpen) setIsMounted(false); }}
          className={`absolute left-0 right-auto origin-top-left md:left-auto md:right-0 md:origin-top-right mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-xl z-50 p-2 text-xs transition-[opacity,transform] duration-150 ease-out ${
            isEntered ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
          }`}
        >
          {!showCustomPicker ? (
            <>
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-date-range-option
                  onClick={() => handleSelectOption(option)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xs text-left font-medium transition-colors duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    dateRange === option && !customRange
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-surface-secondary text-foreground'
                  }`}
                >
                  <span>{option}</span>
                  {dateRange === option && !customRange && <CheckIcon size={14} />}
                </button>
              ))}
              {onCustomRangeChange && (
                <div className="border-t border-border pt-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCustomPicker(true)}
                    className="w-full text-left px-3.5 py-2 rounded-xs text-foreground font-medium hover:bg-surface-secondary transition-colors duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Custom Range...
                  </button>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleApplyCustomRange} className="p-2 space-y-3">
              <div className="font-medium text-foreground border-b border-border pb-2 text-sm">
                Select Custom Dates
              </div>

              <DateField
                label="Start Date"
                value={startDate}
                isActive={activeField === 'start'}
                onToggle={() => setActiveField((f) => (f === 'start' ? null : 'start'))}
                buttonRef={startButtonRef}
                error={errors.start}
                onChange={(date) => {
                  setStartDate(date);
                  setErrors((current) => ({ ...current, start: undefined }));
                  setActiveField(null);
                  requestAnimationFrame(() => endButtonRef.current?.focus());
                }}
              />

              <DateField
                label="End Date"
                value={endDate}
                isActive={activeField === 'end'}
                onToggle={() => setActiveField((f) => (f === 'end' ? null : 'end'))}
                buttonRef={endButtonRef}
                error={errors.end}
                onChange={(date) => {
                  setEndDate(date);
                  setErrors((current) => ({ ...current, end: undefined }));
                  setActiveField(null);
                  requestAnimationFrame(() => endButtonRef.current?.focus());
                }}
              />

              <div className="flex gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomPicker(false)} className="flex-1">
                  Back
                </Button>
                <Button size="sm" type="submit" className="flex-1">
                  Apply
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
