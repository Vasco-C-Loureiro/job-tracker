import type { CalendarFeedEvent } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export async function fetchCalendarFeed(): Promise<CalendarFeedEvent[]> {
  const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
  const token = session?.access_token;
  if (!token) return [];

  const res = await fetch("/api/calendar-feed", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const { events } = (await res.json()) as { events?: CalendarFeedEvent[] };
  return events ?? [];
}
