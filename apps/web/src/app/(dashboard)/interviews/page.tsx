import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import InterviewKanban from "@/components/InterviewKanban";
import type { JobApplicationRow, InterviewRoundRow } from "@/components/InterviewKanban";

type RawInterviewRoundRow = {
  id: string;
  job_application_id: string;
  round_number: number;
  type: string;
  date?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  done: boolean;
  follow_up_sent: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export default async function InterviewsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [interviewResult, offerResult, rejectedResult] = await Promise.all([
    supabase
      .from("job_applications")
      .select(
        "id, company, title, location, remote_type, job_type, salary_raw, " +
          "applied_at, saved_at, notes, status, interest_level, current_interview_round, " +
          "cover_letter_submitted, resume_submitted, source_url, source",
      )
      .eq("user_id", user.id)
      .eq("status", "interview")
      .gte("current_interview_round", 1)
      .eq("is_archived", false)
      .order("saved_at", { ascending: false })
      .returns<JobApplicationRow[]>(),

    supabase
      .from("job_applications")
      .select(
        "id, company, title, location, remote_type, job_type, salary_raw, " +
          "applied_at, saved_at, notes, status, interest_level, current_interview_round",
      )
      .eq("user_id", user.id)
      .eq("status", "offer")
      .eq("is_archived", false)
      .order("saved_at", { ascending: false })
      .returns<JobApplicationRow[]>(),

    supabase
      .from("job_applications")
      .select(
        "id, company, title, location, remote_type, job_type, salary_raw, " +
          "applied_at, saved_at, notes, status, interest_level, current_interview_round",
      )
      .eq("user_id", user.id)
      .eq("status", "rejected")
      .gte("current_interview_round", 1)
      .eq("is_archived", false)
      .order("saved_at", { ascending: false })
      .returns<JobApplicationRow[]>(),
  ]);

  const interviewJobs = interviewResult.data ?? [];
  const offerJobs = offerResult.data ?? [];
  const rejectedJobs = rejectedResult.data ?? [];

  const allJobIds = [...interviewJobs, ...offerJobs, ...rejectedJobs].map(
    (j) => j.id,
  );

  let allRounds: InterviewRoundRow[] = [];
  if (allJobIds.length > 0) {
    const { data: rounds } = await supabase
      .from("interview_rounds")
      .select(
        "id, job_application_id, round_number, type, date, location, " +
          "contact_name, contact_role, done, follow_up_sent, notes, created_at, updated_at",
      )
      .in("job_application_id", allJobIds)
      .order("round_number", { ascending: true })
      .returns<RawInterviewRoundRow[]>();

    allRounds = (rounds ?? []) as InterviewRoundRow[];
  }

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
      </div>

      {interviewJobs.length + offerJobs.length === 0 && rejectedJobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base font-medium mb-1">No interviews yet</p>
          <p className="text-sm">
            Applications appear here when their status is set to
            &ldquo;Interview&rdquo;
          </p>
        </div>
      ) : (
        <InterviewKanban
          interviewJobs={interviewJobs}
          offerJobs={offerJobs}
          rejectedJobs={rejectedJobs}
          allRounds={allRounds}
        />
      )}
    </main>
  );
}
