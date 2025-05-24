import React from 'react';
import Image from 'next/image';
import { Globe } from '@phosphor-icons/react';

interface Source {
  name: string;
  users: number;
}

interface SourcesListProps {
  sources: Source[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  // Determine the favicon URL based on the source name
  const getFaviconUrl = (source: string) => {
    try {
      if (source === 'Direct' || !source) {
        return null;
      }
      
      // Extract the domain from the source
      let domain = source;
      if (source.includes('://')) {
        domain = source.split('://')[1];
      }
      
      domain = domain.split('/')[0];
      
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
      return null;
    }
  };
  
  return (
    <div className="overflow-hidden">
      <table className="min-w-full">
        <tbody>
          {sources.map((source, i) => {
            const faviconUrl = getFaviconUrl(source.name);
            return (
              <tr 
                key={i} 
                className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
              >
                <td className="py-3 px-3 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      {faviconUrl ? (
                        <div className="relative w-4 h-4">
                          <Image 
                            src={faviconUrl} 
                            alt=""
                            width={16}
                            height={16}
                            className="rounded"
                            onError={() => {
                              // Handle error by hiding the image
                            }}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <Globe size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="truncate max-w-[200px]" title={source.name}>
                      {source.name === 'Direct' ? 'Direct / Bookmarks' : source.name}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 whitespace-nowrap text-sm text-right">
                  {source.users}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {sources.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No source data available</p>
        </div>
      )}
    </div>
  );
}