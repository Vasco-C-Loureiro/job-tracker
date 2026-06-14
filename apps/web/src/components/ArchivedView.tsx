"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ApplicationStatus } from "@job-tracker/shared";
import { StillActiveButton } from "@/components/StillActiveButton";

export type ArchivedJobRow = {
  id: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  archived_at: string | null;
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  saved:     "bg-gray-100 text-gray-600",
  applied:   "bg-blue-100 text-blue-700",
  oa:        "bg-violet-100 text-violet-700",
  interview: "bg-amber-100 text-amber-700",
  offer:     "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  ghosted:   "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved:     "Saved",
  applied:   "Applied",
  oa:        "OA",
  interview: "Interview",
  offer:     "Offer",
  rejected:  "Rejected",
  ghosted:   "Ghosted",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ArchivedView({ jobs }: { jobs: ArchivedJobRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("highlight");
    if (id) {
      setHighlightId(id);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`job-row-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Archived</h1>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-600">No archived applications.</p>
      ) : (
        <div className="overflow-x-auto w-full max-w-4xl">
          <table className="w-full text-sm text-gray-900 border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                <th className="py-2 pb-3 pr-4 w-28 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="py-2 pb-3 pr-4 w-44 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Company
                </th>
                <th className="py-2 pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Title
                </th>
                <th className="py-2 pb-3 pr-4 w-36 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Archived
                </th>
                <th className="py-2 pb-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr
                  key={job.id}
                  id={`job-row-${job.id}`}
                  className={`${i > 0 ? "border-t border-gray-100" : ""}${highlightId === job.id ? " highlight-pulse" : ""}`}
                  onClick={() => { if (highlightId === job.id) setHighlightId(null); }}
                >
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-normal break-words leading-snug">
                    {job.company}
                  </td>
                  <td className="py-3 pr-4 whitespace-normal break-words leading-snug text-blue-700">
                    {job.title}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{formatDate(job.archived_at)}</td>
                  <td className="py-3">
                    <StillActiveButton id={job.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
