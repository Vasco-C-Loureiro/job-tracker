import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase.server";

// Shared auth + ownership check used by both PATCH and DELETE
async function authorise(req: NextRequest, roundId: string) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false, status: 401, error: "Unauthorized" } as const;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" } as const;

  // Find the round and verify its parent job belongs to this user
  const { data: round } = await supabase
    .from("interview_rounds")
    .select("id, job_application_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) return { ok: false, status: 404, error: "Not found" } as const;

  const { data: job } = await supabase
    .from("job_applications")
    .select("id")
    .eq("id", round.job_application_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) return { ok: false, status: 404, error: "Not found" } as const;

  return { ok: true, supabase } as const;
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

  return NextResponse.json({ ok: true });
}
