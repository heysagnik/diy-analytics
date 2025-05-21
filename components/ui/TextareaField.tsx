import React from 'react';
import { Theme } from '../../types/settings';

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  theme: Theme;
  hint?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  rows = 3,
  theme,
  hint
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1" style={{ color: theme.textLight }}>{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || readOnly}
      readOnly={readOnly}
      rows={rows}
      className="w-full px-3 py-2 rounded-md border focus:ring-2 transition-colors resize-y"
      style={{
        borderColor: theme.cardBorder,
        background: disabled || readOnly ? theme.lightAccent : theme.cardBg,
        color: theme.accent,
        outlineColor: theme.primary
      }}
    />
    {hint && <p className="mt-1 text-xs" style={{ color: theme.textLight }}>{hint}</p>}
  </div>
);