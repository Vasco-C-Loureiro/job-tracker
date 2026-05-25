import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import type { JobApplication, JobType, RemoteType } from "@job-tracker/shared";
import JobEditForm from "./JobEditForm";

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
  location?: string | null;
  remote_type?: string | null;
  job_type?: string | null;
  salary?: string | null;
  description?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  interest_level?: string | null;
  tags?: string[] | null;
  resume_submitted?: boolean | null;
  cover_letter_submitted?: boolean | null;
  company_application_url?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
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
    location: row.location ?? undefined,
    remoteType: (row.remote_type as RemoteType) ?? undefined,
    jobType: (row.job_type as JobType) ?? undefined,
    salary: row.salary ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    interestLevel:
      (row.interest_level as JobApplication["interestLevel"]) ?? undefined,
    tags: row.tags ?? undefined,
    resumeSubmitted: row.resume_submitted ?? undefined,
    coverLetterSubmitted: row.cover_letter_submitted ?? undefined,
    companyApplicationUrl: row.company_application_url ?? undefined,
    isArchived: row.is_archived ?? false,
    archivedAt: row.archived_at ?? undefined,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("job_applications")
    .select(
      "id, user_id, company, title, source_url, source, status, saved_at, updated_at, " +
        "location, remote_type, job_type, salary, description, " +
        "notes, applied_at, interest_level, tags, resume_submitted, cover_letter_submitted, company_application_url",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .returns<JobApplicationRow[]>()
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const job = rowToJobApplication(data);

  return (
    <main className="min-h-screen p-8 font-sans max-w-2xl mx-auto">
      <JobEditForm job={job} />
    </main>
  );
}
