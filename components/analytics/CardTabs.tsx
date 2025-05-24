import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface CardTabsProps {
  tabs: Tab[];
}

export default function CardTabs({ tabs }: CardTabsProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || '');
  
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  
  return (
    <div>
      <div className="border-b border-gray-100">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab.id === activeTabId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-4">
        {activeTab.content}
      </div>
    </div>
  );
}