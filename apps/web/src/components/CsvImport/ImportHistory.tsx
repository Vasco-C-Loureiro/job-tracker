"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ImportSession = {
  id: string;
  filename: string;
  inserted: number;
  skipped: number;
  imported_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function ImportHistory() {
  const [sessions, setSessions] = useState<ImportSession[] | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("import_sessions")
        .select("*")
        .order("imported_at", { ascending: false })
        .limit(10);
      setSessions((data as ImportSession[]) ?? []);
    }
    void load();
  }, []);

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Import history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">File</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Jobs imported</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Skipped</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Date</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 text-gray-700 max-w-[240px]">
                  <span className="block truncate" title={s.filename}>
                    {s.filename}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={s.inserted > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                    {s.inserted}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {s.skipped > 0 ? (
                    <span className="text-amber-600">{s.skipped}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                  {formatDate(s.imported_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
