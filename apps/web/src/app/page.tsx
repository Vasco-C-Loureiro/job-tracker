import type { JobApplication } from "@job-tracker/shared";
import { supabase } from "@/lib/supabase";

// Raw Postgres row shape (snake_case). Mirror of the JobApplication type.
type JobApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  source_url: string;
  source: string;
  status: JobApplication["status"];
  saved_at: string;
  updated_at: string;
};

function rowToJobApplication(row: JobApplicationRow): JobApplication {
  return {
    id: row.id,
    userId: row.user_id,
    company: row.company,
    title: row.title,
    sourceUrl: row.source_url,
    source: row.source,
    status: row.status,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
  };
}

export default async function Home() {
  const userId = process.env.V01_USER_ID!;

  const { data, error } = await supabase
    .from("job_applications")
    .select(
      "id, user_id, company, title, source_url, source, status, saved_at, updated_at",
    )
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .returns<JobApplicationRow[]>();

  if (error) {
    console.error("Supabase select error:", error);
    return (
      <main className="min-h-screen p-8 font-sans">
        <h1 className="text-3xl font-bold mb-6">Job Tracker</h1>
        <p className="text-red-700">Failed to load jobs.</p>
      </main>
    );
  }

  const jobs = (data ?? []).map(rowToJobApplication);

  return (
    <main className="min-h-screen p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Job Tracker</h1>

      {jobs.length === 0 ? (
        <p className="text-gray-600">
          No jobs saved yet. Use the extension to save a job.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left">
              <th className="py-2 pr-4 font-semibold">Title</th>
              <th className="py-2 pr-4 font-semibold">Company</th>
              <th className="py-2 pr-4 font-semibold">Source</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 pr-4 font-semibold">Saved at</th>
              <th className="py-2 font-semibold">URL</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-gray-200">
                <td className="py-2 pr-4">{job.title}</td>
                <td className="py-2 pr-4">{job.company}</td>
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
                  >
                    Link
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
