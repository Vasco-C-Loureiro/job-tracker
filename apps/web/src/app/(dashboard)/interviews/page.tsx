import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import Link from "next/link";

type InterviewJob = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  applied_at: string | null;
  saved_at: string;
  notes: string | null;
};

export default async function InterviewsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jobs, error } = await supabase
    .from("job_applications")
    .select("id, company, title, location, applied_at, saved_at, notes")
    .eq("user_id", user.id)
    .eq("status", "interview")
    .eq("is_archived", false)
    .order("saved_at", { ascending: false })
    .returns<InterviewJob[]>();

  if (error) {
    console.error("Interviews query error:", error);
    return (
      <main className="p-8 font-sans">
        <h1 className="text-2xl font-bold mb-4">Interviews</h1>
        <p className="text-red-600">Failed to load interviews.</p>
      </main>
    );
  }

  const interviewJobs = jobs ?? [];

  // Fetch round counts per job. If the interview_rounds table doesn't exist yet
  // (migration not applied), this will return an empty result — handled gracefully.
  const jobIds = interviewJobs.map((j) => j.id);
  const roundCounts: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: rounds } = await supabase
      .from("interview_rounds")
      .select("job_application_id")
      .in("job_application_id", jobIds);

    (rounds ?? []).forEach((r) => {
      roundCounts[r.job_application_id] =
        (roundCounts[r.job_application_id] ?? 0) + 1;
    });
  }

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          {interviewJobs.length} application
          {interviewJobs.length !== 1 ? "s" : ""} at interview stage
        </p>
      </div>

      {interviewJobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base font-medium mb-1">No interviews yet</p>
          <p className="text-sm">
            Applications appear here when their status is set to
            &ldquo;Interview&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid gap-3 max-w-3xl">
          {interviewJobs.map((job) => {
            const rounds = roundCounts[job.id] ?? 0;
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {job.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
                    {job.location && (
                      <p className="text-xs text-gray-400 mt-1">{job.location}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        rounds > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rounds === 0
                        ? "No rounds logged"
                        : `${rounds} round${rounds !== 1 ? "s" : ""} logged`}
                    </span>
                    {job.applied_at && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Applied{" "}
                        {new Date(job.applied_at).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
                {job.notes && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    {job.notes}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
