import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import type { JobApplication, JobType, RemoteType, InterviewRound, InterviewType } from "@job-tracker/shared";
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
  salary_raw?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_requested?: string | null;
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
    salaryRaw: row.salary_raw ?? undefined,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salaryCurrency: row.salary_currency ?? undefined,
    salaryRequested: row.salary_requested ?? undefined,
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

type InterviewRoundRow = {
  id: string;
  job_application_id: string;
  round_number: number;
  type: string;
  date?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  done: boolean;
  follow_up_sent: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

function rowToInterviewRound(row: InterviewRoundRow): InterviewRound {
  return {
    id: row.id,
    jobApplicationId: row.job_application_id,
    roundNumber: row.round_number,
    type: row.type as InterviewType,
    date: row.date ?? undefined,
    location: row.location ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactRole: row.contact_role ?? undefined,
    done: row.done,
    followUpSent: row.follow_up_sent,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
        "location, remote_type, job_type, salary_raw, salary_min, salary_max, salary_currency, salary_requested, description, " +
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

  const { data: roundsData } = await supabase
    .from("interview_rounds")
    .select(
      "id, job_application_id, round_number, type, date, location, " +
      "contact_name, contact_role, done, follow_up_sent, notes, created_at, updated_at",
    )
    .eq("job_application_id", id)
    .order("round_number", { ascending: true })
    .returns<InterviewRoundRow[]>();

  const rounds = (roundsData ?? []).map(rowToInterviewRound);

  return (
    <main className="min-h-screen p-8 font-sans max-w-2xl mx-auto">
      <JobEditForm job={job} initialRounds={rounds} />
    </main>
  );
}
