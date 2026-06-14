"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Notification, AffectedJob } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";

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
  if (n.jobApplicationId === null) {
    if (n.linkType === "archived_page") return "/archived";
    if (n.linkType === "interview_page") return "/interviews";
    if (n.linkType === "job_detail") return "/";
    return null;
  }
  if (n.linkType === "archived_page") return `/archived?highlight=${n.jobApplicationId}`;
  if (n.linkType === "interview_page") return `/interviews?highlight=${n.jobApplicationId}`;
  if (n.linkType === "job_detail") return `/?highlight=${n.jobApplicationId}`;
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
        body: JSON.stringify({ all: true }),
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

  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>

      {loading ? (
        <div className="max-w-2xl flex flex-col gap-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3 px-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-14 ml-4" />
              </div>
            </div>
          ))}
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
          <p className="text-xs text-gray-400 mb-4">
            Showing {items.length} of {total}
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {items.map((n) => {
              const isExpanded = expandedId === n.id;
              const navPath = getNavPath(n);
              const isNone = n.linkType === "none";

              return (
                <div key={n.id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleExpand(n.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <span
                      className={`text-sm font-medium leading-snug ${
                        isNone ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {n.title}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
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
            })}
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
