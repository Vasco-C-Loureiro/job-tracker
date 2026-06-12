import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { RemoteType, JobType, SaveJobPayload } from "@job-tracker/shared";
import { parseSalary } from "@job-tracker/shared";

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

  if (b.action !== "archive") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const ids = b.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of strings" },
      { status: 400 },
    );
  }

  // Fetch current statuses so we can record them in activity_log
  const { data: jobs } = await supabase
    .from("job_applications")
    .select("id, status")
    .in("id", ids as string[])
    .eq("user_id", userId);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ archived: 0 });
  }

  const now = new Date().toISOString();
  const archivableIds = jobs.map((j) => j.id);

  await supabase
    .from("job_applications")
    .update({ is_archived: true, archived_at: now, updated_at: now })
    .in("id", archivableIds)
    .eq("user_id", userId);

  await supabase.from("activity_log").insert(
    jobs.map((j) => ({
      user_id: userId,
      job_application_id: j.id,
      event_type: "manual_bulk_archive",
      metadata: { status: j.status },
    })),
  );

  return NextResponse.json({ archived: archivableIds.length });
}

const VALID_REMOTE_TYPES: RemoteType[] = ["remote", "hybrid", "onsite"];
const VALID_JOB_TYPES: JobType[] = [
  "full-time", "part-time", "contract", "internship", "graduate", "fixed-term", "permanent",
];

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

  // Validate — all four payload fields are required non-empty strings
  const { company, title, sourceUrl, source } = body as Partial<SaveJobPayload>;

  if (
    typeof company !== "string" ||
    !company.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof sourceUrl !== "string" ||
    !sourceUrl.trim() ||
    typeof source !== "string" ||
    !source.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields: company, title, sourceUrl, source required",
      },
      { status: 400, headers: corsHeaders },
    );
  }

  // Optional fields — validate enums against allowlists, coerce bad values to undefined
  const { location, remoteType, jobType, salaryRaw, salaryMin, salaryMax, salaryCurrency, salaryRequested, description } =
    body as Partial<SaveJobPayload>;

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

  // camelCase → snake_case at the API boundary
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: userId,
      company: company.trim(),
      title: title.trim(),
      source_url: sourceUrl.trim(),
      source: source.trim(),
      status: "saved",
      location: safeLocation,
      remote_type: safeRemoteType,
      job_type: safeJobType,
      salary_raw: safeSalaryRaw,
      salary_min: derivedSalaryMin,
      salary_max: derivedSalaryMax,
      salary_currency: safeSalaryCurrency,
      salary_requested: safeSalaryRequested,
      description: safeDescription,
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

  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}
