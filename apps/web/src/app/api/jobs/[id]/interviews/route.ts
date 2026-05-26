import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the job belongs to this user before inserting a round under it
  const { data: job } = await supabase
    .from("job_applications")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    roundNumber: number;
    type: string;
    date?: string | null;
    location?: string | null;
    contactName?: string | null;
    contactRole?: string | null;
    done?: boolean;
    followUpSent?: boolean;
    notes?: string | null;
  };

  const { data, error } = await supabase
    .from("interview_rounds")
    .insert({
      job_application_id: jobId,
      round_number: body.roundNumber,
      type: body.type,
      date: body.date ?? null,
      location: body.location ?? null,
      contact_name: body.contactName ?? null,
      contact_role: body.contactRole ?? null,
      done: body.done ?? false,
      follow_up_sent: body.followUpSent ?? false,
      notes: body.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Interview round insert error:", error);
    return NextResponse.json(
      { error: "Failed to create interview round" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
