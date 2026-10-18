import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Không có dữ liệu hiển thị.',
  emptyIcon: EmptyIcon,
  pageSize = 10,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = data.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #D9D5CB',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#7D8E82',
          fontSize: '13.5px',
        }}
      >
        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #EEF4E4', borderTopColor: '#166B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '12px' }}>Đang nạp dữ liệu vận hành...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #D9D5CB',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        {EmptyIcon && (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#EEF4E4',
              display: 'grid',
              placeItems: 'center',
              color: '#166B4A',
            }}
          >
            <EmptyIcon size={24} />
          </div>
        )}
        <span style={{ fontSize: '13.5px', color: '#526458', fontWeight: '600' }}>
          {emptyMessage}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #D9D5CB',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(25, 59, 44, 0.02)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr
              style={{
                background: '#EEF4E4',
                borderBottom: '1px solid #D9D5CB',
                color: '#193B2C',
                fontWeight: '700',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '13px 18px',
                    width: col.width,
                    textAlign: col.align || 'left',
                    letterSpacing: '0.02em',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                style={{
                  borderBottom: '1px solid #edf4ef',
                  transition: 'background 0.1s ease',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '13px 18px',
                      textAlign: col.align || 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render(item, startIndex + idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid #D9D5CB',
            background: '#FAF8F4',
            fontSize: '12.5px',
            color: '#526458',
          }}
        >
          <span>
            Hiển thị {startIndex + 1} - {Math.min(startIndex + pageSize, data.length)} trên tổng {data.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #D9D5CB',
                background: '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
                fontWeight: '600',
              }}
            >
              Trước
            </button>
            <span style={{ padding: '4px 8px', fontWeight: '700', color: '#193B2C' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #D9D5CB',
                background: '#fff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
                fontWeight: '600',
              }}
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
