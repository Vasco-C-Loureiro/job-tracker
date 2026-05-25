"use client";

import { useRouter } from "next/navigation";
import type { JobApplicationListItem } from "@job-tracker/shared";

type Props = { jobs: JobApplicationListItem[] };

export function JobTable({ jobs }: Props) {
  const router = useRouter();

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
          <th className="py-2 pr-4 font-semibold">Title</th>
          <th className="py-2 pr-4 font-semibold">Company</th>
          <th className="py-2 pr-4 font-semibold">Location</th>
          <th className="py-2 pr-4 font-semibold">Remote</th>
          <th className="py-2 pr-4 font-semibold">Salary</th>
          <th className="py-2 pr-4 font-semibold">Source</th>
          <th className="py-2 pr-4 font-semibold">Status</th>
          <th className="py-2 pr-4 font-semibold">Saved at</th>
          <th className="py-2 font-semibold">URL</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
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
