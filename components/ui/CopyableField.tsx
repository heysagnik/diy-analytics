import React, { useState } from 'react';
import { Theme } from '../../types/settings';
import { CheckCircleIcon, CopyIcon } from '@phosphor-icons/react';

interface CopyableFieldProps { 
  label: string;
  value: string;
  theme: Theme;
  type?: string;
  hint?: string;
}

export const CopyableField: React.FC<CopyableFieldProps> = ({ 
  label, 
  value, 
  theme, 
  type = "text", 
  hint 
}) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error("Failed to copy:", err));
  };
  
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1" style={{ color: theme.textLight }}>{label}</label>
      <div className="flex items-center">
        <input
          type={type}
          value={value}
          readOnly
          className="w-full px-3 py-2 rounded-l-md border focus:ring-2 transition-colors"
          style={{ 
            borderColor: theme.cardBorder, 
            background: theme.lightAccent, 
            color: theme.accent,
            outlineColor: theme.primary
          }}
        />
        <button
          onClick={copyToClipboard}
          className="px-3 py-2 rounded-r-md border border-l-0 hover:opacity-80 transition-colors flex items-center justify-center"
          style={{ 
            borderColor: theme.cardBorder, 
            background: theme.cardBg, 
            color: copied ? 'green' : theme.primary 
          }}
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? <CheckCircleIcon size={20} /> : <CopyIcon size={20} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs" style={{ color: theme.textLight }}>{hint}</p>}
    </div>
  );
};