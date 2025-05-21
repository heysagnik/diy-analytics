import React from 'react';
import { Theme } from '../../types/settings';

interface SettingsCardProps { 
  title: string;
  description?: string;
  children: React.ReactNode;
  theme: Theme;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ 
  title, 
  description, 
  children, 
  theme 
}) => (
  <div className="rounded-lg shadow-sm border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
    <div className="p-5 md:p-6">
      <h2 className="text-xl font-semibold mb-1" style={{ color: theme.accent }}>{title}</h2>
      {description && (
        <p className="text-sm mb-4" style={{ color: theme.textLight }}>{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  </div>
);