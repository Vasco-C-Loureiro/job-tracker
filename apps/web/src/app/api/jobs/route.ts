import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

  // Validate — all four fields are required non-empty strings
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

  // camelCase → snake_case at the API boundary
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: process.env.V01_USER_ID,
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
