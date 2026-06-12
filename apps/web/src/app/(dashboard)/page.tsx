import type { JobApplicationListItem, JobType, RemoteType } from "@job-tracker/shared";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";

type JobApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  source_url: string;
  source: string;
  status: JobApplicationListItem["status"];
  saved_at: string;
  updated_at: string;
  location?: string | null;
  remote_type?: string | null;
  job_type?: string | null;
  salary_raw?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  interest_level?: string | null;
  tags?: string[] | null;
  resume_submitted?: boolean | null;
  cover_letter_submitted?: boolean | null;
  company_application_url?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
};

function rowToListItem(row: JobApplicationRow): JobApplicationListItem {
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
    location: row.location ?? undefined,
    remoteType: (row.remote_type as RemoteType) ?? undefined,
    jobType: (row.job_type as JobType) ?? undefined,
    salaryRaw: row.salary_raw ?? undefined,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salaryCurrency: row.salary_currency ?? undefined,
    notes: row.notes ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    interestLevel:
      (row.interest_level as JobApplicationListItem["interestLevel"]) ?? undefined,
    tags: row.tags ?? undefined,
    resumeSubmitted: row.resume_submitted ?? undefined,
    coverLetterSubmitted: row.cover_letter_submitted ?? undefined,
    companyApplicationUrl: row.company_application_url ?? undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at ?? undefined,
  };
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("job_applications")
    .select(
      "id, user_id, company, title, source_url, source, status, saved_at, updated_at, " +
        "location, remote_type, job_type, salary_raw, salary_min, salary_max, salary_currency, notes, applied_at, " +
        "interest_level, tags, resume_submitted, cover_letter_submitted, " +
        "company_application_url, is_archived, archived_at",
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("saved_at", { ascending: false })
    .returns<JobApplicationRow[]>();

  if (error) {
    console.error("Supabase select error:", error);
    return (
      <main className="p-8 font-sans">
        <h1 className="text-3xl font-bold mb-6">Job Tracker</h1>
        <p className="text-red-700">Failed to load jobs.</p>
      </main>
    );
  }

  const jobs = (data ?? []).map(rowToListItem);

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
      </div>
      <DashboardView initialJobs={jobs} />
    </main>
  );
}
