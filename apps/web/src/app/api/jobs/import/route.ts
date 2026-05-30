import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";

const VALID_STATUSES = ["saved", "applied", "oa", "interview", "rejected", "offer", "ghosted"] as const;
const VALID_REMOTE_TYPES = ["remote", "hybrid", "onsite"] as const;
const VALID_JOB_TYPES = ["full-time", "part-time", "contract", "internship", "graduate", "fixed-term", "permanent"] as const;
const VALID_INTEREST_LEVELS = ["low", "medium", "high", "very-high"] as const;

type ImportRow = {
  company: string;
  title: string;
  location?: string;
  remoteType?: string;
  jobType?: string;
  salaryRaw?: string;
  sourceUrl?: string;
  source?: string;
  status?: string;
  notes?: string;
  appliedAt?: string;
  interestLevel?: string;
  tags?: string[] | string;
};

type ImportRequestBody = {
  rows: ImportRow[];
  filename: string;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || typeof body.filename !== "string") {
    return NextResponse.json({ error: "Invalid request body: rows and filename required" }, { status: 400 });
  }

  const validRows: ImportRow[] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowNum = i + 1;

    if (!row.company?.trim()) {
      rowErrors.push(`Row ${rowNum}: missing company`);
      continue;
    }
    if (!row.title?.trim()) {
      rowErrors.push(`Row ${rowNum}: missing title`);
      continue;
    }

    validRows.push(row);
  }

  const skippedCount = body.rows.length - validRows.length;

  if (validRows.length === 0) {
    await supabase.from("import_sessions").insert({
      user_id: user.id,
      filename: body.filename,
      inserted: 0,
      skipped: skippedCount,
    });
    return NextResponse.json({ inserted: 0, skipped: skippedCount, errors: rowErrors });
  }

  const { error: insertError } = await supabase.from("job_applications").insert(
    validRows.map((row) => {
      const status = VALID_STATUSES.includes(row.status as typeof VALID_STATUSES[number])
        ? (row.status as typeof VALID_STATUSES[number])
        : "saved";

      const remoteType = VALID_REMOTE_TYPES.includes(row.remoteType as typeof VALID_REMOTE_TYPES[number])
        ? (row.remoteType as typeof VALID_REMOTE_TYPES[number])
        : null;

      const jobType = VALID_JOB_TYPES.includes(row.jobType as typeof VALID_JOB_TYPES[number])
        ? (row.jobType as typeof VALID_JOB_TYPES[number])
        : null;

      const interestLevel = VALID_INTEREST_LEVELS.includes(row.interestLevel as typeof VALID_INTEREST_LEVELS[number])
        ? (row.interestLevel as typeof VALID_INTEREST_LEVELS[number])
        : null;

      let appliedAt: string | null = null;
      if (row.appliedAt) {
        const d = new Date(row.appliedAt);
        if (!isNaN(d.getTime())) appliedAt = d.toISOString();
      }

      let tags: string[] | null = null;
      if (Array.isArray(row.tags)) {
        tags = row.tags;
      } else if (typeof row.tags === "string" && row.tags.trim()) {
        tags = row.tags.split(",").map((t) => t.trim()).filter(Boolean);
      }

      return {
        user_id: user.id,
        company: row.company.trim(),
        title: row.title.trim(),
        location: row.location ?? null,
        remote_type: remoteType,
        job_type: jobType,
        salary_raw: row.salaryRaw ?? null,
        source_url: row.sourceUrl ?? "",
        source: row.source ?? "csv",
        status,
        notes: row.notes ?? null,
        applied_at: appliedAt,
        interest_level: interestLevel,
        tags,
        resume_submitted: false,
        cover_letter_submitted: false,
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
  );

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from("import_sessions").insert({
    user_id: user.id,
    filename: body.filename,
    inserted: validRows.length,
    skipped: skippedCount,
  });

  return NextResponse.json({ inserted: validRows.length, skipped: skippedCount, errors: rowErrors });
}
