import { CalendarIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from '@/types/analytics';

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
        <Button type="button" variant="ghost" size="icon-xs" onClick={goPrev} aria-label="Previous month">
          <CaretLeftIcon size={12} weight="bold" />
        </Button>
        <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
        <Button type="button" variant="ghost" size="icon-xs" onClick={goNext} aria-label="Next month">
          <CaretRightIcon size={12} weight="bold" />
        </Button>
      </div>

      <div className="grid gap-y-0.5 text-center" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="label-eyebrow py-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, idx) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed month grid, position is the only stable identity (day can be null/repeated)
          if (day === null) return <span key={`empty-${idx}`} />;
          const iso = toISODate(viewYear, viewMonth, day);
          const isSelected = value === iso;
          const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
          const receivesInitialFocus =
            isSelected || (!parseISODate(value) && isToday) || (day === 1 && !isSelected && !isToday);

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
  return (
    <Field className="relative gap-1" data-invalid={!!error}>
      <FieldLabel htmlFor={buttonId}>{label}</FieldLabel>
      <button
        id={buttonId}
        type="button"
        ref={buttonRef}
        onClick={onToggle}
        aria-expanded={isActive}
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
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  customRange,
  onCustomRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState(customRange?.startDate || '');
  const [endDate, setEndDate] = useState(customRange?.endDate || '');
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const endButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStartDate(customRange?.startDate || '');
      setEndDate(customRange?.endDate || '');
      setErrors({});
    });
    return () => cancelAnimationFrame(raf);
  }, [customRange?.startDate, customRange?.endDate]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShowCustomPicker(false);
      setActiveField(null);
    }
  };

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

  const displayText = customRange ? `${customRange.startDate} - ${customRange.endDate}` : dateRange;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button size="sm" variant="outline" aria-expanded={isOpen} />}>
        <span>{displayText}</span>
        <CaretDownIcon
          size={12}
          className={`transition-transform duration-150 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 max-w-[calc(100vw-2rem)] p-1 text-xs font-body">
        {!showCustomPicker ? (
          <>
            {DATE_RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                variant="ghost"
                onClick={() => handleSelectOption(option)}
                className={`w-full justify-between px-2.5 py-1.5 text-left font-medium ${
                  dateRange === option && !customRange
                    ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                    : 'text-foreground'
                }`}
              >
                <span>{option}</span>
                {dateRange === option && !customRange && <CheckIcon size={14} />}
              </Button>
            ))}
            {onCustomRangeChange && (
              <div className="border-t border-border pt-1 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCustomPicker(true)}
                  className="w-full justify-start px-2.5 py-1.5 text-foreground font-medium"
                >
                  Custom Range...
                </Button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleApplyCustomRange} className="p-1.5 flex flex-col gap-2.5">
            <div className="font-medium text-foreground border-b border-border pb-1.5 text-sm">Select Custom Dates</div>

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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCustomPicker(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button size="sm" type="submit" className="flex-1">
                Apply
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
