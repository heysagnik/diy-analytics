import React from 'react';
import { defaultTheme } from '../../utils/theme'; // Changed import

export default function EventsCard() {
  const t = defaultTheme; // Changed to use defaultTheme

  return (
    <div className="rounded-xl shadow-sm p-4 md:p-6" style={{ background: t.cardBg, borderColor: t.cardBorder, borderWidth: '1px' }}>
      <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-5" style={{ color: t.accent }}>Events</h2>
      
      <div className="flex flex-col items-center justify-center h-32 sm:h-40" style={{ color: t.accent }}>
        <p className="text-xs sm:text-sm opacity-50 mb-3">No events tracked yet</p>
        <button 
          className="text-xs sm:text-sm px-3 py-2 rounded-lg transition-all hover:shadow-sm"
          style={{ background: t.primary, color: 'white' }}
          onClick={() => alert("This would open the event tracking setup wizard")}
        >
          Set up event tracking
        </button>
      </div>
    </div>
  );
}