import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { SaveJobPayload } from "@job-tracker/shared";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  // Validate — all four payload fields are required non-empty strings
  const { company, title, sourceUrl, source } = body as Partial<SaveJobPayload>;
  const { userId: bodyUserId } = body as { userId?: string };

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

  // TODO(unit 8): replace EXTENSION_USER_ID fallback with real
  // extension session token validation
  const userId =
    typeof bodyUserId === "string" && bodyUserId.trim()
      ? bodyUserId.trim()
      : process.env.EXTENSION_USER_ID;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  // camelCase → snake_case at the API boundary
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: userId,
      company: company.trim(),
      title: title.trim(),
      source_url: sourceUrl.trim(),
      source: source.trim(),
      status: "saved",
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
