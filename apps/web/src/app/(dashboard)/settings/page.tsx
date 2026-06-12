"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import SettingsColumnsPanel from "./SettingsColumnsPanel";

type ArchivePrefs = {
  autoArchiveInactiveEnabled: boolean;
  autoArchiveInactiveDays: number;
  autoArchiveRejectedEnabled: boolean;
  autoArchiveRejectedDays: number;
};

const ARCHIVE_DEFAULTS: ArchivePrefs = {
  autoArchiveInactiveEnabled: true,
  autoArchiveInactiveDays: 30,
  autoArchiveRejectedEnabled: true,
  autoArchiveRejectedDays: 7,
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<ArchivePrefs>(ARCHIVE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setLoading(false); return; }

      const res = await fetch("/api/preferences", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Partial<ArchivePrefs>;
        setPrefs({
          autoArchiveInactiveEnabled: data.autoArchiveInactiveEnabled ?? ARCHIVE_DEFAULTS.autoArchiveInactiveEnabled,
          autoArchiveInactiveDays: data.autoArchiveInactiveDays ?? ARCHIVE_DEFAULTS.autoArchiveInactiveDays,
          autoArchiveRejectedEnabled: data.autoArchiveRejectedEnabled ?? ARCHIVE_DEFAULTS.autoArchiveRejectedEnabled,
          autoArchiveRejectedDays: data.autoArchiveRejectedDays ?? ARCHIVE_DEFAULTS.autoArchiveRejectedDays,
        });
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setMessage({ type: "error", text: "Not authenticated. Please sign in again." });
      setSaving(false);
      return;
    }
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(prefs),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Saved." });
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setMessage({ type: "error", text: body.error ?? `Save failed (${res.status})` });
    }
    setSaving(false);
  }

  function set<K extends keyof ArchivePrefs>(key: K, value: ArchivePrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  const numInputCls =
    "w-20 border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <main className="p-8 font-sans max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Dashboard columns + Defaults (Unit 20) */}
      <SettingsColumnsPanel />

      {/* Archiving (Unit 21) */}
      <div className="mt-10">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Archiving
              </h2>

              {/* Auto-archive inactive */}
              <div className="mb-6">
                <label className="flex items-center gap-3 mb-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.autoArchiveInactiveEnabled}
                    onChange={(e) => set("autoArchiveInactiveEnabled", e.target.checked)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Auto-archive inactive applications
                  </span>
                </label>
                <div className="ml-7">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={prefs.autoArchiveInactiveDays}
                      disabled={!prefs.autoArchiveInactiveEnabled}
                      onChange={(e) => {
                        const v = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                        set("autoArchiveInactiveDays", v);
                      }}
                      className={numInputCls}
                    />
                    Days of inactivity before marking as ghosted and archiving
                  </label>
                </div>
              </div>

              {/* Auto-archive rejected/ghosted */}
              <div className="mb-6">
                <label className="flex items-center gap-3 mb-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.autoArchiveRejectedEnabled}
                    onChange={(e) => set("autoArchiveRejectedEnabled", e.target.checked)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Auto-archive rejected/ghosted applications
                  </span>
                </label>
                <div className="ml-7">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={prefs.autoArchiveRejectedDays}
                      disabled={!prefs.autoArchiveRejectedEnabled}
                      onChange={(e) => {
                        const v = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                        set("autoArchiveRejectedDays", v);
                      }}
                      className={numInputCls}
                    />
                    Days after rejection/ghosting before archiving
                  </label>
                </div>
              </div>
            </section>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {message && (
                <span
                  className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
