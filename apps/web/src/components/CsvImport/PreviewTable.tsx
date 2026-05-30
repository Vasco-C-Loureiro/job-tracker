"use client";

type PreviewTableProps = {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  totalRows: number;
};

const SKELETON_WIDTHS = [
  ["w-24", "w-32", "w-20", "w-28", "w-16"],
  ["w-20", "w-28", "w-24", "w-20", "w-32"],
  ["w-28", "w-20", "w-32", "w-24", "w-20"],
];

function truncate(s: string, max = 40): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function PreviewTable({ columns, rows, totalRows }: PreviewTableProps) {
  const showSkeleton = rows.length === 0;
  const displayCount = showSkeleton ? 0 : Math.min(rows.length, 2);

  if (columns.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Preview
        </span>
        <span className="text-xs text-gray-400">
          Showing {displayCount} of {totalRows} rows
        </span>
      </div>

      <div className="overflow-x-auto max-h-40">
        <table className="text-sm w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-2 py-1 text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? SKELETON_WIDTHS.map((widths, ri) => (
                  <tr key={ri}>
                    {columns.map((col, ci) => (
                      <td key={col.key} className="px-2 py-2">
                        <div
                          className={`bg-gray-200 animate-pulse rounded h-4 ${
                            widths[ci % widths.length]
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.slice(0, 2).map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 last:border-0">
                    {columns.map((col) => {
                      const val = row[col.key] ?? "";
                      return (
                        <td
                          key={col.key}
                          className="px-2 py-1.5 text-gray-700 whitespace-nowrap"
                          title={val.length > 40 ? val : undefined}
                        >
                          {truncate(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
