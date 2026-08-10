import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: { icon?: ReactNode; title: string; description?: string };
}

export function DataTable<T>({ columns, data, rowKey, loading, skeletonRows = 3, empty }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="py-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11.5px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={rowKey(row)} className={i < data.length - 1 ? 'border-b border-gray-50' : ''}>
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3.5', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
