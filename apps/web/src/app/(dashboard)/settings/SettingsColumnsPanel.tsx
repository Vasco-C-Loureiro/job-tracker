"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { DEFAULT_VISIBLE_COLUMNS } from "@/lib/column-preferences";

type Prefs = {
  visible_columns: string[];
  default_resume_submitted: boolean;
  default_cover_letter_submitted: boolean;
};

type ColumnMeta = { key: string; label: string; description: string; locked?: boolean };

const COLUMN_META: ColumnMeta[] = [
  { key: "company",          label: "Company",       description: "Employer name",              locked: true },
  { key: "title",            label: "Title",         description: "Job title",                  locked: true },
  { key: "status",           label: "Status",        description: "Application stage",          locked: true },
  { key: "jobType",          label: "Job Type",      description: "Full-time, contract, etc."              },
  { key: "remoteType",       label: "Remote Type",   description: "Remote / hybrid / on-site"              },
  { key: "location",         label: "Location",      description: "City, region or country"                },
  { key: "salaryRaw",        label: "Salary",        description: "Raw salary string"                      },
  { key: "interestLevel",    label: "Interest",      description: "How keen you are"                       },
  { key: "appliedAt",        label: "Applied Date",  description: "When you submitted"                     },
  { key: "resumeCoverLetter",label: "Docs",          description: "Resume & cover letter"                  },
  { key: "sourceUrl",        label: "URL",           description: "Link to the original listing"           },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsColumnsPanel() {
  const [loading, setLoading] = useState(true);
  const [localColumns, setLocalColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMNS),
  );
  const [defaultResume, setDefaultResume] = useState(true);
  const [defaultCoverLetter, setDefaultCoverLetter] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/preferences", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const prefs = (await res.json()) as Prefs;
        setLocalColumns(new Set(prefs.visible_columns));
        setDefaultResume(prefs.default_resume_submitted);
        setDefaultCoverLetter(prefs.default_cover_letter_submitted);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function toggle(key: string) {
    setLocalColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          visible_columns: Array.from(localColumns),
          default_resume_submitted: defaultResume,
          default_cover_letter_submitted: defaultCoverLetter,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-5 bg-gray-200 rounded w-24" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded-lg" />
          <div className="h-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Dashboard columns */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Dashboard columns</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose which columns appear in the Applications table.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {COLUMN_META.map(({ key, label, description, locked }) => {
            const enabled = localColumns.has(key);
            if (locked) {
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-75 select-none"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Always shown</p>
                  </div>
                  <Lock size={14} className="text-gray-400 mt-0.5 shrink-0" />
                </div>
              );
            }
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => toggle(key)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(key)}
                className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors select-none ${
                  enabled
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <div
                  aria-hidden
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 pointer-events-none ${
                    enabled ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Defaults */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Defaults</h2>
        <p className="text-sm text-gray-500 mb-4">
          Applied when saving new jobs via the extension.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white">
            <div>
              <p className="text-sm font-medium text-gray-800">Resume submitted by default</p>
              <p className="text-xs text-gray-500 mt-0.5">Pre-check the R checkbox for new jobs</p>
            </div>
            <ToggleSwitch checked={defaultResume} onChange={setDefaultResume} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white">
            <div>
              <p className="text-sm font-medium text-gray-800">Cover letter submitted by default</p>
              <p className="text-xs text-gray-500 mt-0.5">Pre-check the CL checkbox for new jobs</p>
            </div>
            <ToggleSwitch checked={defaultCoverLetter} onChange={setDefaultCoverLetter} />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => void handleSave()}
          disabled={saveState === "saving"}
          className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>
        {saveState === "saved" && (
          <span className="text-sm text-green-600 font-medium">Saved ✓</span>
        )}
        {saveState === "error" && (
          <span className="text-sm text-red-600">Failed to save. Try again.</span>
        )}
      </div>
    </div>
  );
}
