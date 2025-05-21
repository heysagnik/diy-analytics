import React, { useState } from 'react';
import Image from 'next/image'; // Import next/image

interface FaviconProps {
  sourceName: string;
  sizeClass?: string;
  textClass?: string;
}

const Favicon: React.FC<FaviconProps> = ({ 
  sourceName, 
  sizeClass = "w-6 h-6 md:w-7 md:h-7", 
  textClass = "text-xs" 
}) => {
  const [error, setError] = useState(false);

  const lowerSourceName = sourceName.toLowerCase();
  const isKnownNonUrl = lowerSourceName === 'direct' || lowerSourceName === 'unknown';
  const isValidHttpUrl = sourceName.startsWith('http://') || sourceName.startsWith('https://');

  if (error || isKnownNonUrl || !isValidHttpUrl) {
    const fallbackLetter = sourceName.charAt(0).toUpperCase() || '?';
    const defaultBgColor = "#777777"; // Default gray for fallback

    return (
      <div 
        className={`${sizeClass} rounded-md flex items-center justify-center mr-2 md:mr-3 font-semibold text-white flex-shrink-0`}
        style={{ backgroundColor: defaultBgColor }}
        title={sourceName} // Add title to fallback for consistency
      >
        <span className={textClass}>{fallbackLetter}</span>
      </div>
    );
  }

  const faviconUrl = `http://favicon.splitbee.io/?url=${encodeURIComponent(sourceName)}`;

  return (
    <Image
      src={faviconUrl}
      alt="" // Alt text can be empty if the source name is displayed next to it
      title={sourceName} // Show full source name on hover
      className={`${sizeClass} rounded-md mr-2 md:mr-3 flex-shrink-0 object-contain`}
      onError={() => setError(true)}
      width={24} // Provide a base width (e.g., from w-6)
      height={24} // Provide a base height (e.g., from h-6)
      // unoptimized // Uncomment this if you don't want to configure the domain in next.config.js
    />
  );
};

export default Favicon;