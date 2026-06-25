"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Notification } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownItems, setDropdownItems] = useState<Notification[]>([]);
  // Snapshot shown while the dropdown is open — persists until dropdown closes.
  const [displayedItems, setDisplayedItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    async function fetchUnread() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/notifications/unread", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(data.unreadCount);
        // Only update pending items when the dropdown is closed so we don't
        // overwrite the snapshot the user is currently reading.
        if (!openRef.current) {
          setDropdownItems(data.items);
        }
      } catch {}
    }
    void fetchUnread();
    const onFocus = () => { void fetchUnread(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function handleBellClick() {
    if (open) {
      setOpen(false);
      setDisplayedItems([]);
      return;
    }

    // Snapshot current pending items for display; retain loud ones for next open.
    const snapshot = [...dropdownItems];
    setOpen(true);
    setDisplayedItems(snapshot);
    setDropdownItems((prev) => prev.filter((n) => n.isLoud));

    if (snapshot.length > 0) {
      const nonLoudIds = snapshot.filter((n) => !n.isLoud).map((n) => n.id);

      setUnreadCount((prev) => Math.max(0, prev - nonLoudIds.length));

      if (nonLoudIds.length > 0) {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ids: nonLoudIds }),
          });
        }
      }
    }
  }

  function handleClose() {
    setOpen(false);
    setDisplayedItems([]);
  }

  return (
    <div className="relative">
      <button onClick={() => void handleBellClick()} className="relative p-2">
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside overlay */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Notifications</span>
            </div>

            {displayedItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No new notifications
              </div>
            ) : (
              displayedItems.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/notifications");
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm text-gray-900 font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
