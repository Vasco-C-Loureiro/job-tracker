import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { RemoteType, JobType, SaveJobPayload } from "@job-tracker/shared";
import { parseSalary } from "@job-tracker/shared";

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

  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}
