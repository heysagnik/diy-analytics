import React from 'react';
import { Theme } from '../../types/settings';

interface ToggleSwitchProps { 
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
  theme: Theme;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  enabled, 
  onChange, 
  label, 
  description, 
  theme, 
  disabled = false 
}) => (
  <div className="flex items-start mb-4">
    <div className="flex-1">
      <span className="text-sm font-medium" style={{ color: theme.accent }}>{label}</span>
      {description && (
        <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>{description}</p>
      )}
    </div>
    <button
      type="button"
      className={`${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ outlineColor: theme.primary }}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);