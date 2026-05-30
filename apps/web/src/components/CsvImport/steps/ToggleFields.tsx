"use client";

import React from "react";
import { Lock } from "lucide-react";
import type { ImportWizardState, FieldKey } from "../types";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

const FIELD_META: { key: FieldKey; label: string; description: string }[] = [
  { key: "location",      label: "Location",       description: "City, region or country"       },
  { key: "remoteType",    label: "Remote type",     description: "Remote / hybrid / on-site"     },
  { key: "jobType",       label: "Job type",        description: "Full-time, contract, etc."     },
  { key: "salaryRaw",     label: "Salary",          description: "Raw salary string"             },
  { key: "sourceUrl",     label: "Job URL",         description: "Link to the original listing"  },
  { key: "source",        label: "Source",          description: "Site the job came from"        },
  { key: "status",        label: "Status",          description: "Application stage"             },
  { key: "notes",         label: "Notes",           description: "Your personal notes"           },
  { key: "appliedAt",     label: "Date applied",    description: "When you submitted"            },
  { key: "interestLevel", label: "Interest level",  description: "How keen you are"              },
  { key: "tags",          label: "Tags",            description: "Comma-separated labels"        },
];

export function ToggleFields({ state, onUpdate }: Props) {
  function toggle(key: FieldKey) {
    onUpdate((s) => {
      const next = new Set(s.enabledFields);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...s, enabledFields: next };
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Choose your fields
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Select which fields to import. Company and Title are always included.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Always-included locked cards */}
        {(["Company", "Title"] as const).map((label) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-75 select-none"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">Always included</p>
            </div>
            <Lock size={16} className="text-gray-400 mt-0.5 shrink-0" />
          </div>
        ))}

        {/* Toggleable field cards */}
        {FIELD_META.map(({ key, label, description }) => {
          const enabled = state.enabledFields.has(key);
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => toggle(key)}
              onKeyDown={(e) => e.key === "Enter" || e.key === " " ? toggle(key) : null}
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
              {/* Visual-only toggle switch — card click handles the toggle */}
              <div
                role="switch"
                aria-checked={enabled}
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
    </div>
  );
}
