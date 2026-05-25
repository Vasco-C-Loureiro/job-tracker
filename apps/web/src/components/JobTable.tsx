"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { JobApplicationListItem, ApplicationStatus } from "@job-tracker/shared";

type SortColumn = "company" | "title" | "status" | "location" | "salary" | "savedAt";
type SortDirection = "asc" | "desc";

type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  saved: 0,
  applied: 1,
  oa: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
  ghosted: 6,
};

function parseSalary(salary: string | undefined): number | null {
  if (!salary) return null;
  const cleaned = salary.replace(/[£$€,\s]/g, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)(k)?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2]?.toLowerCase() === "k" ? value * 1000 : value;
}

type Props = { jobs: JobApplicationListItem[] };

export function JobTable({ jobs }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ column: "savedAt", direction: "desc" });

  const handleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column
          ? prev.direction === "asc"
            ? "desc"
            : "asc"
          : "asc",
    }));
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let cmp = 0;
      const { column, direction } = sort;

      if (column === "company") {
        cmp = a.company.localeCompare(b.company);
      } else if (column === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (column === "status") {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      } else if (column === "location") {
        cmp = (a.location ?? "").localeCompare(b.location ?? "");
      } else if (column === "salary") {
        const aVal = parseSalary(a.salary);
        const bVal = parseSalary(b.salary);
        if (aVal === null && bVal === null) cmp = 0;
        else if (aVal === null) cmp = 1;
        else if (bVal === null) cmp = -1;
        else cmp = aVal - bVal;
      } else if (column === "savedAt") {
        cmp = a.savedAt.localeCompare(b.savedAt);
      }

      return direction === "asc" ? cmp : -cmp;
    });
  }, [jobs, sort]);

  function SortHeader({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) {
    return (
      <th
        className="py-2 pr-4 font-semibold cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
        onClick={() => handleSort(column)}
      >
        {children}
        <span className="ml-1 text-xs text-gray-400">
          {sort.column === column ? (sort.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </th>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-gray-600">
        No jobs saved yet. Use the extension to save a job.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-gray-300 text-left">
          <SortHeader column="title">Title</SortHeader>
          <SortHeader column="company">Company</SortHeader>
          <SortHeader column="location">Location</SortHeader>
          <th className="py-2 pr-4 font-semibold">Remote</th>
          <SortHeader column="salary">Salary</SortHeader>
          <th className="py-2 pr-4 font-semibold">Source</th>
          <SortHeader column="status">Status</SortHeader>
          <SortHeader column="savedAt">Saved at</SortHeader>
          <th className="py-2 font-semibold">URL</th>
        </tr>
      </thead>
      <tbody>
        {sortedJobs.map((job) => (
          <tr
            key={job.id}
            className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <td className="py-2 pr-4 text-blue-700">{job.title}</td>
            <td className="py-2 pr-4">{job.company}</td>
            <td className="py-2 pr-4">{job.location ?? "—"}</td>
            <td className="py-2 pr-4">{job.remoteType ?? "—"}</td>
            <td className="py-2 pr-4">{job.salary ?? "—"}</td>
            <td className="py-2 pr-4">{job.source}</td>
            <td className="py-2 pr-4">{job.status}</td>
            <td className="py-2 pr-4">
              {new Date(job.savedAt).toLocaleString("en-GB")}
            </td>
            <td className="py-2">
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Link
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
