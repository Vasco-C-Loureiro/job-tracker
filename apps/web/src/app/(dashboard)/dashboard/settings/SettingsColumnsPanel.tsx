"use client";

import { Lock } from "lucide-react";

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

type Props = {
  loading: boolean;
  localColumns: Set<string>;
  defaultResume: boolean;
  defaultCoverLetter: boolean;
  onColumnsChange: (cols: Set<string>) => void;
  onDefaultResumeChange: (v: boolean) => void;
  onDefaultCoverLetterChange: (v: boolean) => void;
};

export default function SettingsColumnsPanel({
  loading,
  localColumns,
  defaultResume,
  defaultCoverLetter,
  onColumnsChange,
  onDefaultResumeChange,
  onDefaultCoverLetterChange,
}: Props) {
  function toggle(key: string) {
    const next = new Set(localColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onColumnsChange(next);
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
            <ToggleSwitch checked={defaultResume} onChange={onDefaultResumeChange} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white">
            <div>
              <p className="text-sm font-medium text-gray-800">Cover letter submitted by default</p>
              <p className="text-xs text-gray-500 mt-0.5">Pre-check the CL checkbox for new jobs</p>
            </div>
            <ToggleSwitch checked={defaultCoverLetter} onChange={onDefaultCoverLetterChange} />
          </div>
        </div>
      </section>

    </div>
  );
}
