import React from 'react';

interface Column<T = unknown> { // Changed any to unknown
  key: string;
  label: string;
  renderCell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T = unknown> { // Changed any to unknown
  title: string;
  columns: Column<T>[];
  data: T[];
  filterComponent?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

const DataTable = <T extends Record<string, unknown>>({ // Changed any to unknown
  title,
  columns,
  data = [],
  filterComponent,
  onRowClick
}: DataTableProps<T>) => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-medium text-base">{title}</h2>
        {filterComponent}
      </div>
      
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, idx) => (
                  <th 
                    key={idx} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length > 0 ? (
                data.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column, colIdx) => (
                      <td 
                        key={colIdx} 
                        className="px-6 py-3 whitespace-nowrap"
                      >
                        {column.renderCell ? (
                          column.renderCell(item)
                        ) : (
                          <div className="text-sm text-gray-900">
                            {typeof item[column.key] !== 'undefined' ? String(item[column.key]) : '—'}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className="px-6 py-5 text-center text-sm text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;