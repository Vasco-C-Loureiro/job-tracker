import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import { logEvent } from "@/lib/activity";

// Shared auth + ownership check used by both PATCH and DELETE
async function authorise(req: NextRequest, roundId: string) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false, status: 401, error: "Unauthorized" } as const;

  const supabase = createSupabaseServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" } as const;

  // Find the round and verify its parent job belongs to this user
  const { data: round } = await supabase
    .from("interview_rounds")
    .select("id, job_application_id, round_number, type")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) return { ok: false, status: 404, error: "Not found" } as const;

  const { data: job } = await supabase
    .from("job_applications")
    .select("id, company, title")
    .eq("id", round.job_application_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) return { ok: false, status: 404, error: "Not found" } as const;

  return {
    ok: true,
    supabase,
    jobApplicationId: round.job_application_id,
    userId: user.id,
    round: { roundNumber: round.round_number, type: round.type },
    parentJob: { company: job.company, title: job.title },
  } as const;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const { roundId } = await params;
  const auth = await authorise(req, roundId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const { error } = await auth.supabase
    .from("interview_rounds")
    .update({
      round_number: body.roundNumber,
      type: body.type,
      date: body.date ?? null,
      location: body.location ?? null,
      contact_name: body.contactName ?? null,
      contact_role: body.contactRole ?? null,
      done: body.done ?? false,
      follow_up_sent: body.followUpSent ?? false,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) {
    console.error("Interview round update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await auth.supabase
    .from("job_applications")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", auth.jobApplicationId)
    .eq("user_id", auth.userId);

  await logEvent({
    supabase: auth.supabase,
    userId: auth.userId,
    jobApplicationId: auth.jobApplicationId,
    eventType: "interview_round_updated",
    metadata: { round_number: body.roundNumber, type: body.type },
    notificationTitle: `${auth.parentJob.company} - ${auth.parentJob.title} interview updated`,
    notificationBody: "An interview round was updated.",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const { roundId } = await params;
  const auth = await authorise(req, roundId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.supabase
    .from("interview_rounds")
    .delete()
    .eq("id", roundId);

  if (error) {
    console.error("Interview round delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  await logEvent({
    supabase: auth.supabase,
    userId: auth.userId,
    jobApplicationId: auth.jobApplicationId,
    eventType: "interview_round_deleted",
    metadata: { round_number: auth.round.roundNumber, type: auth.round.type },
    notificationTitle: `${auth.parentJob.company} - ${auth.parentJob.title} interview updated`,
    notificationBody: `Interview round ${auth.round.roundNumber} (${auth.round.type}) was removed.`,
  });

  return NextResponse.json({ ok: true });
}
