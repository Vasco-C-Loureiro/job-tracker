import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { CalendarApp } from "@/components/calendar/CalendarApp";

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CalendarApp />;
}
