"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function StillActiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ isArchived: false, archivedAt: null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? "…" : "Still Active"}
    </button>
  );
}
