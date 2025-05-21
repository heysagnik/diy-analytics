import React from 'react';
import { Theme } from '../../types/settings';

interface InputFieldProps { 
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  theme: Theme;
  hint?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  disabled, 
  readOnly, 
  theme,
  hint
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1" style={{ color: theme.textLight }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || readOnly}
      readOnly={readOnly}
      className="w-full px-3 py-2 rounded-md border focus:ring-2 transition-colors"
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