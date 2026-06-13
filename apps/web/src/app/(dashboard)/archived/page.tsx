import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import type { ApplicationStatus } from "@job-tracker/shared";
import { StillActiveButton } from "@/components/StillActiveButton";

type ArchivedJobRow = {
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

export default async function ArchivedPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("job_applications")
    .select("id, company, title, status, archived_at")
    .eq("user_id", user.id)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false })
    .returns<ArchivedJobRow[]>();

  if (error) {
    console.error("Supabase select error:", error);
    return (
      <main className="p-8 font-sans">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Archived</h1>
        </div>
        <p className="text-red-700">Failed to load archived applications.</p>
      </main>
    );
  }

  const jobs = data ?? [];

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
                  className={i > 0 ? "border-t border-gray-100" : ""}
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
