import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { RemoteType, JobType, ApplicationStatus, SaveJobPayload } from "@job-tracker/shared";
import { parseSalary, normalizeUrl } from "@job-tracker/shared";
import { logEvent, logBulkEvent, buildBulkTitle, buildBulkBody } from "@/lib/activity";

type JobRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  source_url: string;
  source: string;
  status: string;
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
  is_archived: boolean;
  archived_at?: string | null;
  current_interview_round?: number | null;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  const archived = request.nextUrl.searchParams.get("archived");
  const showArchived = archived === "true";

  const { data, error } = await supabase
    .from("job_applications")
    .select(
      "id, user_id, company, title, source_url, source, status, " +
        "location, remote_type, job_type, salary_raw, salary_min, salary_max, " +
        "salary_currency, salary_requested, description, notes, applied_at, " +
        "interest_level, tags, resume_submitted, cover_letter_submitted, " +
        "company_application_url, is_archived, archived_at, " +
        "current_interview_round, saved_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("is_archived", showArchived)
    .order("saved_at", { ascending: false })
    .returns<JobRow[]>();

  if (error) {
    console.error("Supabase select error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }

  const jobs = (data ?? []).map((row) => ({
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
    interestLevel: row.interest_level ?? undefined,
    tags: row.tags ?? undefined,
    resumeSubmitted: row.resume_submitted ?? undefined,
    coverLetterSubmitted: row.cover_letter_submitted ?? undefined,
    companyApplicationUrl: row.company_application_url ?? undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at ?? undefined,
    currentInterviewRound: row.current_interview_round ?? undefined,
  }));

  return NextResponse.json(jobs);
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (b.action !== "archive" && b.action !== "status") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const ids = b.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of strings" },
      { status: 400 },
    );
  }

  if (b.action === "status") {
    const newStatus = b.status as string;
    const validStatuses = ["saved", "applied", "oa", "interview", "rejected", "offer", "ghosted"];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: jobs } = await supabase
      .from("job_applications")
      .select("id, company, title, status")
      .in("id", ids as string[])
      .eq("user_id", userId);

    const jobsToUpdate = (jobs ?? []).filter((j) => j.status !== newStatus);

    if (jobsToUpdate.length === 0) {
      return NextResponse.json({ success: true });
    }

    await supabase
      .from("job_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in("id", jobsToUpdate.map((j) => j.id))
      .eq("user_id", userId);

    const affectedJobs = jobsToUpdate.map((j) => ({ id: j.id, company: j.company, title: j.title }));
    const previousStatusById = new Map(jobsToUpdate.map((j) => [j.id, j.status]));

    await logBulkEvent({
      supabase,
      userId,
      eventType: "status_changed",
      affectedJobs,
      getMetadata: (job) => ({ previous_status: previousStatusById.get(job.id) ?? null, new_status: newStatus }),
      notificationTitle: buildBulkTitle(affectedJobs, `status changed to ${newStatus}`),
      notificationBody: buildBulkBody(affectedJobs, `changed to ${newStatus}`),
    });

    return NextResponse.json({ success: true });
  }

  // Fetch jobs to archive (company + title needed for notification text)
  const { data: jobsToArchive } = await supabase
    .from("job_applications")
    .select("id, company, title, status")
    .in("id", ids as string[])
    .eq("user_id", userId);

  if (!jobsToArchive || jobsToArchive.length === 0) {
    return NextResponse.json({ archived: 0 });
  }

  const now = new Date().toISOString();
  const archivableIds = jobsToArchive.map((j) => j.id);

  await supabase
    .from("job_applications")
    .update({ is_archived: true, archived_at: now, updated_at: now })
    .in("id", archivableIds)
    .eq("user_id", userId);

  const statusById = new Map(jobsToArchive.map((j) => [j.id, j.status]));
  const affectedJobs = jobsToArchive.map((j) => ({ id: j.id, company: j.company, title: j.title }));

  await logBulkEvent({
    supabase,
    userId,
    eventType: "manual_bulk_archive",
    affectedJobs,
    getMetadata: (job) => ({ status: statusById.get(job.id) ?? null }),
    notificationTitle: buildBulkTitle(affectedJobs, "archived"),
    notificationBody: buildBulkBody(affectedJobs, "archived"),
  });

  return NextResponse.json({ archived: archivableIds.length });
}

const VALID_REMOTE_TYPES: RemoteType[] = ["remote", "hybrid", "onsite"];
const VALID_JOB_TYPES: JobType[] = [
  "full-time", "part-time", "contract", "internship", "graduate", "fixed-term", "permanent",
];
const VALID_STATUSES: ApplicationStatus[] = [
  "saved", "applied", "oa", "interview", "offer", "rejected", "ghosted",
];
const VALID_INTEREST_LEVELS = ["low", "medium", "high", "very-high"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function inferCurrency(salaryRaw: string | undefined): string | null {
  if (!salaryRaw) return null;
  if (salaryRaw.includes("£")) return "GBP";
  if (salaryRaw.includes("$")) return "USD";
  if (salaryRaw.includes("€")) return "EUR";
  if (/kr/i.test(salaryRaw)) return "SEK";
  return null;
}

// Handle CORS preflight — Chrome extension triggers this before POST
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  // Validate Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } =
    await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }
  const userId = userData.user.id;

  // Fetch user's doc submission defaults (fall back to hardcoded defaults on error)
  let defaultResumeSubmitted = true;
  let defaultCoverLetterSubmitted = false;
  {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("default_resume_submitted, default_cover_letter_submitted")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefs) {
      defaultResumeSubmitted = prefs.default_resume_submitted ?? true;
      defaultCoverLetterSubmitted = prefs.default_cover_letter_submitted ?? false;
    }
  }

  // Validate — company, title, source required; sourceUrl may be empty string
  const b = body as Record<string, unknown>;
  const { company, title, sourceUrl, source } = b as Partial<SaveJobPayload>;

  if (
    typeof company !== "string" ||
    !company.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof source !== "string" ||
    !source.trim()
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields: company, title, source required" },
      { status: 400, headers: corsHeaders },
    );
  }

  // Optional fields — validate enums against allowlists, coerce bad values to undefined
  const { location, remoteType, jobType, salaryRaw, salaryMin, salaryMax, salaryCurrency, salaryRequested, description } =
    b as Partial<SaveJobPayload>;

  const safeLocation =
    typeof location === "string" && location.trim() ? location.trim() : undefined;
  const safeRemoteType =
    typeof remoteType === "string" && VALID_REMOTE_TYPES.includes(remoteType as RemoteType)
      ? (remoteType as RemoteType)
      : undefined;
  const safeJobType =
    typeof jobType === "string" && VALID_JOB_TYPES.includes(jobType as JobType)
      ? (jobType as JobType)
      : undefined;
  const safeSalaryRaw =
    typeof salaryRaw === "string" && salaryRaw.trim() ? salaryRaw.trim() : undefined;
  const safeDescription =
    typeof description === "string" && description.trim()
      ? description.trim()
      : undefined;
  const safeSalaryRequested =
    typeof salaryRequested === "string" && salaryRequested.trim()
      ? salaryRequested.trim()
      : undefined;

  // Auto-derive salary_min and salary_max from salary_raw if not explicitly provided
  let derivedSalaryMin: number | null =
    typeof salaryMin === "number" ? salaryMin : null;
  let derivedSalaryMax: number | null =
    typeof salaryMax === "number" ? salaryMax : null;
  if ((derivedSalaryMin === null || derivedSalaryMax === null) && safeSalaryRaw) {
    const parsed = parseSalary(safeSalaryRaw);
    if (parsed) {
      if (derivedSalaryMin === null) derivedSalaryMin = parsed.min;
      if (derivedSalaryMax === null) derivedSalaryMax = parsed.max;
    }
  }

  // Currency: use provided code or infer from symbol in salary_raw
  const safeSalaryCurrency =
    typeof salaryCurrency === "string" && salaryCurrency.trim()
      ? salaryCurrency.trim()
      : inferCurrency(safeSalaryRaw);

  // Additional fields accepted from manual "Add job" form
  const safeStatus: ApplicationStatus =
    typeof b.status === "string" && VALID_STATUSES.includes(b.status as ApplicationStatus)
      ? (b.status as ApplicationStatus)
      : "saved";
  const safeNotes =
    typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : undefined;
  const safeAppliedAt =
    typeof b.appliedAt === "string" && b.appliedAt.trim() ? b.appliedAt.trim() : undefined;
  const safeInterestLevel =
    typeof b.interestLevel === "string" && VALID_INTEREST_LEVELS.includes(b.interestLevel)
      ? b.interestLevel
      : undefined;
  const safeTags =
    Array.isArray(b.tags) && (b.tags as unknown[]).every((t) => typeof t === "string")
      ? (b.tags as string[]).filter(Boolean)
      : undefined;

  // camelCase → snake_case at the API boundary
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: userId,
      company: company.trim(),
      title: title.trim(),
      source_url: typeof sourceUrl === "string" ? sourceUrl.trim() : "",
      source_url_normalized: normalizeUrl(typeof sourceUrl === "string" ? sourceUrl.trim() : ""),
      source: source.trim(),
      status: safeStatus,
      location: safeLocation,
      remote_type: safeRemoteType,
      job_type: safeJobType,
      salary_raw: safeSalaryRaw,
      salary_min: derivedSalaryMin,
      salary_max: derivedSalaryMax,
      salary_currency: safeSalaryCurrency,
      salary_requested: safeSalaryRequested,
      description: safeDescription,
      notes: safeNotes,
      applied_at: safeAppliedAt,
      interest_level: safeInterestLevel,
      tags: safeTags,
      resume_submitted: defaultResumeSubmitted,
      cover_letter_submitted: defaultCoverLetterSubmitted,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500, headers: corsHeaders },
    );
  }

  await logEvent({
    supabase,
    userId,
    jobApplicationId: data.id,
    eventType: "job_created",
    metadata: {},
    notificationTitle: `${data.company} - ${data.title} added`,
    notificationBody: "Saved to your tracker.",
  });

  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    !Array.isArray(b.ids) ||
    b.ids.length === 0 ||
    !b.ids.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of strings" },
      { status: 400 },
    );
  }
  const ids = b.ids as string[];

  const { data: jobsToDelete } = await supabase
    .from("job_applications")
    .select("id, company, title")
    .in("id", ids)
    .eq("user_id", userId);

  const { error, count } = await supabase
    .from("job_applications")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase delete error:", error);
    return NextResponse.json({ error: "Failed to delete jobs" }, { status: 500 });
  }

  await logBulkEvent({
    supabase,
    userId,
    eventType: "job_deleted",
    affectedJobs: jobsToDelete ?? [],
    getMetadata: () => ({}),
    notificationTitle: buildBulkTitle(jobsToDelete ?? [], "deleted"),
    notificationBody: buildBulkBody(jobsToDelete ?? [], "deleted"),
  });

  return NextResponse.json({ deleted: count ?? ids.length });
}
