import React from 'react';
import { ArrowUpRight, ArrowDownRight } from '@phosphor-icons/react';
import Tooltip from '../common/Tooltip';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  previousValue?: string | number;
  isInverted?: boolean;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  previousValue,
  isInverted = false
}: StatsCardProps) {
  const isPositiveChange = isInverted ? change && change < 0 : change && change > 0;
  const changeText = change ? `${change > 0 ? '+' : ''}${change}%` : '--';
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        
        {change !== undefined && (
          <Tooltip 
            text={`Previous: ${previousValue || '0'}`}
            position="top"
          >
            <div className={`flex items-center text-sm ${
              isPositiveChange ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositiveChange ? (
                <ArrowUpRight size={16} weight="bold" />
              ) : (
                <ArrowDownRight size={16} weight="bold" />
              )}
              <span>{changeText}</span>
            </div>
          </Tooltip>
        )}
      </div>
      
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}