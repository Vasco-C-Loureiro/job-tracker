import { createSupabaseServerClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { ArchivedView } from "@/components/ArchivedView";
import type { ArchivedJobRow } from "@/components/ArchivedView";

export default async function ArchivedPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("job_applications")
    .select("id, company, title, status, archived_at")
    .eq("user_id", user.id)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false })
    .returns<ArchivedJobRow[]>();

  if (error) {
    console.error("Supabase select error:", error);
    return (
      <main className="p-8 font-sans">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Archived</h1>
        </div>
        <p className="text-red-700">Failed to load archived applications.</p>
      </main>
    );
  }

  return <ArchivedView jobs={data ?? []} />;
}
