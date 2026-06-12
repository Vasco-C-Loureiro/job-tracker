import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { ApplicationStatus, RemoteType, JobType } from "@job-tracker/shared";
import { parseSalary } from "@job-tracker/shared";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data, error } = await supabase
    .from("job_applications")
    .select("id, description")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

function inferCurrency(salaryRaw: string | undefined): string | null {
  if (!salaryRaw) return null;
  if (salaryRaw.includes("£")) return "GBP";
  if (salaryRaw.includes("$")) return "USD";
  if (salaryRaw.includes("€")) return "EUR";
  if (/kr/i.test(salaryRaw)) return "SEK";
  return null;
}

type InterestLevel = "low" | "medium" | "high" | "very-high";

const VALID_STATUSES: ApplicationStatus[] = [
  "saved", "applied", "oa", "interview", "rejected", "offer", "ghosted",
];
const VALID_REMOTE_TYPES: RemoteType[] = ["remote", "hybrid", "onsite"];
const VALID_JOB_TYPES: JobType[] = [
  "full-time", "part-time", "contract", "internship", "graduate", "fixed-term", "permanent",
];
const VALID_INTEREST_LEVELS: InterestLevel[] = ["low", "medium", "high", "very-high"];

// Fields the client is never allowed to overwrite
const IMMUTABLE_FIELDS = ["id", "userId", "source", "savedAt"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  // Auth — same Bearer token pattern as POST /api/jobs
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

  const b = body as Record<string, unknown>;

  // Reject attempts to overwrite immutable fields
  for (const field of IMMUTABLE_FIELDS) {
    if (field in b) {
      return NextResponse.json(
        { error: `Field "${field}" cannot be updated` },
        { status: 400 },
      );
    }
  }

  // Build the snake_case update object — only include keys present in the body
  const update: Record<string, unknown> = {};
  const has = (key: string): boolean => key in b;

  if (has("title")) {
    if (typeof b.title !== "string" || !b.title.trim()) {
      return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    update.title = b.title.trim();
  }

  if (has("company")) {
    if (typeof b.company !== "string" || !b.company.trim()) {
      return NextResponse.json({ error: "company must be a non-empty string" }, { status: 400 });
    }
    update.company = b.company.trim();
  }

  if (has("location")) {
    update.location =
      typeof b.location === "string" && b.location.trim() ? b.location.trim() : null;
  }

  if (has("remoteType")) {
    if (b.remoteType !== null && !VALID_REMOTE_TYPES.includes(b.remoteType as RemoteType)) {
      return NextResponse.json({ error: "Invalid remoteType" }, { status: 400 });
    }
    update.remote_type = b.remoteType ?? null;
  }

  if (has("jobType")) {
    if (b.jobType !== null && !VALID_JOB_TYPES.includes(b.jobType as JobType)) {
      return NextResponse.json({ error: "Invalid jobType" }, { status: 400 });
    }
    update.job_type = b.jobType ?? null;
  }

  if (has("salaryRaw")) {
    update.salary_raw =
      typeof b.salaryRaw === "string" && (b.salaryRaw as string).trim()
        ? (b.salaryRaw as string).trim()
        : null;
  }

  if (has("salaryMin")) {
    update.salary_min = typeof b.salaryMin === "number" ? b.salaryMin : null;
  }

  if (has("salaryMax")) {
    update.salary_max = typeof b.salaryMax === "number" ? b.salaryMax : null;
  }

  if (has("salaryCurrency")) {
    update.salary_currency =
      typeof b.salaryCurrency === "string" && (b.salaryCurrency as string).trim()
        ? (b.salaryCurrency as string).trim()
        : null;
  }

  if (has("salaryRequested")) {
    update.salary_requested =
      typeof b.salaryRequested === "string" && (b.salaryRequested as string).trim()
        ? (b.salaryRequested as string).trim()
        : null;
  }

  if (has("description")) {
    update.description =
      typeof b.description === "string" && b.description.trim()
        ? b.description.trim()
        : null;
  }

  if (has("status")) {
    if (!VALID_STATUSES.includes(b.status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = b.status;
  }

  if (has("notes")) {
    update.notes =
      typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
  }

  if (has("appliedAt")) {
    update.applied_at = typeof b.appliedAt === "string" && b.appliedAt ? b.appliedAt : null;
  }

  if (has("interestLevel")) {
    if (
      b.interestLevel !== null &&
      !VALID_INTEREST_LEVELS.includes(b.interestLevel as InterestLevel)
    ) {
      return NextResponse.json({ error: "Invalid interestLevel" }, { status: 400 });
    }
    update.interest_level = b.interestLevel ?? null;
  }

  if (has("tags")) {
    if (b.tags !== null && !Array.isArray(b.tags)) {
      return NextResponse.json({ error: "tags must be an array" }, { status: 400 });
    }
    if (Array.isArray(b.tags) && !b.tags.every((t) => typeof t === "string")) {
      return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
    }
    update.tags = b.tags ?? [];
  }

  if (has("resumeSubmitted")) {
    if (b.resumeSubmitted !== null && typeof b.resumeSubmitted !== "boolean") {
      return NextResponse.json(
        { error: "resumeSubmitted must be a boolean" },
        { status: 400 },
      );
    }
    update.resume_submitted = b.resumeSubmitted ?? false;
  }

  if (has("coverLetterSubmitted")) {
    if (b.coverLetterSubmitted !== null && typeof b.coverLetterSubmitted !== "boolean") {
      return NextResponse.json(
        { error: "coverLetterSubmitted must be a boolean" },
        { status: 400 },
      );
    }
    update.cover_letter_submitted = b.coverLetterSubmitted ?? false;
  }

  if (has("companyApplicationUrl")) {
    update.company_application_url =
      typeof b.companyApplicationUrl === "string" && b.companyApplicationUrl.trim()
        ? b.companyApplicationUrl.trim()
        : null;
  }

  if (has("sourceUrl")) {
    update.source_url = typeof b.sourceUrl === "string" ? b.sourceUrl.trim() : "";
  }

  if (has("currentInterviewRound")) {
    if (
      b.currentInterviewRound !== null &&
      (typeof b.currentInterviewRound !== "number" ||
        !Number.isInteger(b.currentInterviewRound) ||
        b.currentInterviewRound < 1)
    ) {
      return NextResponse.json(
        { error: "currentInterviewRound must be a positive integer" },
        { status: 400 },
      );
    }
    update.current_interview_round = b.currentInterviewRound ?? null;
  }

  if (has("archivedAt")) {
    update.archived_at = typeof b.archivedAt === "string" && b.archivedAt ? b.archivedAt : null;
  }

  if (has("isArchived")) {
    if (typeof b.isArchived !== "boolean") {
      return NextResponse.json({ error: "isArchived must be a boolean" }, { status: 400 });
    }
    update.is_archived = b.isArchived;
    if (b.isArchived && !has("archivedAt")) {
      update.archived_at = new Date().toISOString();
    } else if (!b.isArchived) {
      update.archived_at = null;
    }
  }

  // Auto-derive salary_min/max from salary_raw when not explicitly provided
  if (!has("salaryMin") && !has("salaryMax") && has("salaryRaw") && update.salary_raw) {
    const parsed = parseSalary(update.salary_raw as string);
    if (parsed) {
      update.salary_min = parsed.min;
      update.salary_max = parsed.max;
    }
  }

  // Auto-infer currency from symbol in salary_raw when not explicitly provided
  if (!has("salaryCurrency") && has("salaryRaw") && update.salary_raw) {
    const inferred = inferCurrency(update.salary_raw as string);
    if (inferred) update.salary_currency = inferred;
  }

  let activityLogEntry: { event_type: string; metadata: Record<string, unknown> } | null = null;

  // "Still Active" unarchive: explicit isArchived:false with no status override
  if (has("isArchived") && b.isArchived === false && !has("status")) {
    const { data: lastEvent } = await supabase
      .from("activity_log")
      .select("event_type, metadata")
      .eq("job_application_id", id)
      .eq("user_id", userId)
      .in("event_type", ["auto_archived_inactive", "auto_archived_rejected", "manual_bulk_archive"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let restoredStatus: string | null = null;
    if (lastEvent?.event_type === "auto_archived_inactive") {
      const prevStatus = (lastEvent.metadata as Record<string, unknown> | null)
        ?.previous_status as string | undefined;
      if (prevStatus) {
        update.status = prevStatus;
        restoredStatus = prevStatus;
      }
    }
    activityLogEntry = {
      event_type: "unarchived",
      metadata: { trigger: "manual_still_active", restored_status: restoredStatus },
    };
  }

  // Pre-fetch current job state when status is changing (interview round auto-bump + auto-unarchive)
  if (has("status")) {
    const { data: existing } = await supabase
      .from("job_applications")
      .select("is_archived, current_interview_round")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (update.status === "interview" && !has("currentInterviewRound")) {
      if ((existing?.current_interview_round ?? 0) === 0) {
        update.current_interview_round = 1;
      }
    }

    if (
      !has("isArchived") &&
      !["rejected", "ghosted"].includes(update.status as string) &&
      existing?.is_archived === true
    ) {
      update.is_archived = false;
      update.archived_at = null;
      activityLogEntry = {
        event_type: "unarchived",
        metadata: { trigger: "status_change", new_status: update.status as string },
      };
    }
  }

  // When status is set to "applied" and applied_at wasn't explicitly provided,
  // auto-set it to today if it isn't already recorded.
  if (update.status === "applied" && !has("appliedAt")) {
    const { data: current } = await supabase
      .from("job_applications")
      .select("applied_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!current?.applied_at) {
      update.applied_at = new Date().toISOString().split("T")[0];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Always bump updated_at on any change
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("job_applications")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId) // never trust the client to scope by user
    .select()
    .single();

  if (error) {
    // PGRST116 = "exactly one row expected, 0 returned" — not found or wrong user
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    console.error("Supabase update error:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }

  if (activityLogEntry) {
    await supabase.from("activity_log").insert({
      user_id: userId,
      job_application_id: id,
      event_type: activityLogEntry.event_type,
      metadata: activityLogEntry.metadata,
    });
  }

  return NextResponse.json(data, { status: 200 });
}
