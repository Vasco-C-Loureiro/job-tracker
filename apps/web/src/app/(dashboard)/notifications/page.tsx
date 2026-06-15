"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Zap, Trash2 } from "lucide-react";
import type { Notification, AffectedJob, NotificationEventType, NotificationLinkType } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";

const PILL_CONFIG: Record<NotificationEventType, { label: string; className: string }> = {
  auto_archived_inactive:  { label: "Auto-archived", className: "bg-amber-100 text-amber-700"   },
  auto_archived_rejected:  { label: "Auto-archived", className: "bg-amber-100 text-amber-700"   },
  status_changed:          { label: "Status",        className: "bg-blue-100 text-blue-700"     },
  unarchived:              { label: "Reactivated",   className: "bg-green-100 text-green-700"   },
  manual_bulk_archive:     { label: "Archived",      className: "bg-orange-100 text-orange-700" },
  job_deleted:             { label: "Deleted",       className: "bg-red-100 text-red-700"       },
  job_created:             { label: "Saved",         className: "bg-green-100 text-green-700"   },
  interview_round_added:   { label: "Interview",     className: "bg-purple-100 text-purple-700" },
  interview_round_updated: { label: "Interview",     className: "bg-purple-100 text-purple-700" },
  interview_round_deleted: { label: "Interview",     className: "bg-gray-100 text-gray-600"     },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNavPath(n: Notification): string | null {
  if (n.linkType === "none") return null;

  let highlightParam = "";
  if (n.affectedJobs && n.affectedJobs.length > 0) {
    highlightParam = `?highlight=${n.affectedJobs.map((j) => j.id).join(",")}`;
  } else if (n.jobApplicationId) {
    highlightParam = `?highlight=${n.jobApplicationId}`;
  }

  if (n.linkType === "archived_page") return `/archived${highlightParam}`;
  if (n.linkType === "interview_page") return `/interviews${highlightParam}`;
  if (n.linkType === "job_detail") return `/${highlightParam}`;
  return null;
}

async function getToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    const token = await getToken();
    if (!token) return;

    const [notifRes] = await Promise.all([
      fetch("/api/notifications?page=1", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true, silentOnly: true }),
      }),
    ]);

    if (notifRes.ok) {
      const data = await notifRes.json();
      setItems(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setLoading(false);
  }

  async function loadMore() {
    const token = await getToken();
    if (!token) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await fetch(`/api/notifications?page=${nextPage}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function deleteNotification(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const token = await getToken();
    if (!token) return;
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  async function acceptNotification(n: Notification) {
    const token = await getToken();
    if (!token) return;
    const updatedBody = `${n.body ? n.body + " " : ""}· Accepted — application remains archived.`;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [n.id], body: updatedBody }),
    });
    setItems((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, isRead: true, body: updatedBody } : item)),
    );
  }

  async function revertNotification(n: Notification) {
    const token = await getToken();
    if (!token) return;
    if (n.jobApplicationId) {
      await fetch(`/api/jobs/${n.jobApplicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isArchived: false }),
      });
    }
    const updatedBody = `${n.body ? n.body + " " : ""}· Reverted — application restored to dashboard.`;
    const updatedLinkType: NotificationLinkType = "job_detail";
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [n.id], link_type: updatedLinkType, body: updatedBody }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, isRead: true, linkType: updatedLinkType, body: updatedBody } : item,
      ),
    );
  }

  const loudUnreadItems = items.filter((n) => n.isLoud && !n.isRead);
  const activityItems = items.filter((n) => !n.isLoud || n.isRead);

  function renderRow(n: Notification) {
    const isExpanded = expandedId === n.id;
    const navPath = getNavPath(n);
    const isNone = n.linkType === "none";
    return (
      <div key={n.id} className="border-b border-gray-100 last:border-0 group">
        <button
          onClick={() => toggleExpand(n.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            {n.isLoud && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                <Zap className="w-2.5 h-2.5" />
                Auto
              </span>
            )}
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PILL_CONFIG[n.eventType].className}`}>
              {PILL_CONFIG[n.eventType].label}
            </span>
            <span className={`text-sm font-medium leading-snug truncate ${isNone ? "text-gray-400" : "text-gray-900"}`}>
              {n.title}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); void deleteNotification(n.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 cursor-pointer"
              aria-label="Delete notification"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 bg-gray-50 text-sm text-gray-600">
            {n.body && <p className="mb-2">{n.body}</p>}
            {n.affectedJobs && n.affectedJobs.length > 0 && (
              <ul className="mb-2 space-y-0.5">
                {n.affectedJobs.map((job: AffectedJob) => (
                  <li key={job.id} className="text-xs text-gray-500">
                    {job.company} - {job.title}
                  </li>
                ))}
              </ul>
            )}
            {navPath && (
              <Link
                href={navPath}
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              >
                View
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>

      {loading ? (
        <div className="max-w-2xl flex flex-col gap-0">
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-72 mb-4" />
          <div className="rounded-lg border border-gray-200 h-16 bg-gray-100 animate-pulse mb-8" />

          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-4 w-64 mb-3" />
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-3 w-14 ml-4" />
              </div>
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-700 font-medium">No notifications yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Activity from status changes, archives, and more will appear here.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl">
          <section className="mb-8">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
              <p className="text-xs text-gray-500">Automated events that need your attention</p>
            </div>
            {loudUnreadItems.length === 0 ? (
              <div className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                No notifications — your applications are on track.
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {loudUnreadItems.map((n) => (
                  <div key={n.id} className="p-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PILL_CONFIG[n.eventType].className}`}>
                            {PILL_CONFIG[n.eventType].label}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {n.jobApplicationId && (
                          <button
                            onClick={() => void revertNotification(n)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Revert
                          </button>
                        )}
                        <button
                          onClick={() => void acceptNotification(n)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900">Activity</h2>
              <p className="text-xs text-gray-500">A record of your recent actions</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Showing {activityItems.length} of {total - loudUnreadItems.length}
            </p>
            {activityItems.length === 0 ? (
              <div className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                No activity recorded yet.
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {activityItems.map((n) => renderRow(n))}
              </div>
            )}
            {hasMore && (
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 py-2 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
