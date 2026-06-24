"use client";

import { useState, useEffect } from "react";
import type {
  JobApplicationListItem,
  ApplicationStatus,
  RemoteType,
  JobType,
} from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

// Raw Supabase row returned by POST /api/jobs
type JobRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  source_url: string;
  source: string;
  status: ApplicationStatus;
  saved_at: string;
  updated_at: string;
  location?: string | null;
  remote_type?: string | null;
  job_type?: string | null;
  salary_raw?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  interest_level?: string | null;
  tags?: string[] | null;
  resume_submitted?: boolean | null;
  cover_letter_submitted?: boolean | null;
  company_application_url?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
};

function rowToListItem(row: JobRow): JobApplicationListItem {
  return {
    id: row.id,
    userId: row.user_id,
    company: row.company,
    title: row.title,
    sourceUrl: row.source_url,
    source: row.source,
    status: row.status,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
    location: row.location ?? undefined,
    remoteType: (row.remote_type as RemoteType) ?? undefined,
    jobType: (row.job_type as JobType) ?? undefined,
    salaryRaw: row.salary_raw ?? undefined,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salaryCurrency: row.salary_currency ?? undefined,
    notes: row.notes ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    interestLevel:
      (row.interest_level as JobApplicationListItem["interestLevel"]) ?? undefined,
    tags: row.tags ?? undefined,
    resumeSubmitted: row.resume_submitted ?? undefined,
    coverLetterSubmitted: row.cover_letter_submitted ?? undefined,
    companyApplicationUrl: row.company_application_url ?? undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at ?? undefined,
  };
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved",     label: "Saved"     },
  { value: "applied",   label: "Applied"   },
  { value: "oa",        label: "OA"        },
  { value: "interview", label: "Interview" },
  { value: "offer",     label: "Offer"     },
  { value: "rejected",  label: "Rejected"  },
  { value: "ghosted",   label: "Ghosted"   },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: (job: JobApplicationListItem) => void;
};

export function AddJobModal({ isOpen, onClose, onJobAdded }: Props) {
  const [company, setCompany]             = useState("");
  const [title, setTitle]                 = useState("");
  const [location, setLocation]           = useState("");
  const [remoteType, setRemoteType]       = useState<RemoteType | "">("");
  const [jobType, setJobType]             = useState<JobType | "">("");
  const [salary, setSalary]               = useState("");
  const [status, setStatus]               = useState<ApplicationStatus>("saved");
  const [sourceUrl, setSourceUrl]         = useState("");
  const [appliedAt, setAppliedAt]         = useState("");
  const [closingDate, setClosingDate]     = useState("");
  const [interestLevel, setInterestLevel] = useState("");
  const [tags, setTags]                   = useState("");
  const [notes, setNotes]                 = useState("");

  const [errors, setErrors]       = useState<{ company?: string; title?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing]       = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCompany(""); setTitle(""); setLocation(""); setRemoteType(""); setJobType("");
    setSalary(""); setStatus("saved"); setSourceUrl(""); setAppliedAt("");
    setClosingDate(""); setInterestLevel(""); setTags(""); setNotes("");
    setErrors({}); setClosing(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!company.trim()) newErrors.company = "Company is required";
    if (!title.trim())   newErrors.title   = "Title is required";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

      const body: Record<string, unknown> = {
        company: company.trim(),
        title: title.trim(),
        sourceUrl: sourceUrl.trim(),
        source: "manual",
        status,
      };
      if (location.trim())    body.location      = location.trim();
      if (remoteType)         body.remoteType     = remoteType;
      if (jobType)            body.jobType        = jobType;
      if (salary.trim())      body.salaryRaw      = salary.trim();
      if (appliedAt)          body.appliedAt      = appliedAt;
      if (closingDate)        body.closingDate    = closingDate;
      if (interestLevel)      body.interestLevel  = interestLevel;
      if (tagList.length > 0) body.tags           = tagList;
      if (notes.trim())       body.notes          = notes.trim();

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to save job");
      }

      const row = (await res.json()) as JobRow;
      const newJob = rowToListItem(row);

      // Collapse animation, then notify parent
      setClosing(true);
      setTimeout(() => {
        onJobAdded(newJob);
        onClose();
      }, 200);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        style={{
          transform: closing ? "scaleY(0)" : "scaleY(1)",
          transition: "transform 200ms ease-in",
          transformOrigin: "top",
        }}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Add job</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 ${
                  errors.company ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.company && (
                <p className="text-xs text-red-600 mt-1">{errors.company}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 ${
                  errors.title ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Remote type + Job type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remote type</label>
                <select
                  value={remoteType}
                  onChange={(e) => setRemoteType(e.target.value as RemoteType | "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">—</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as JobType | "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">—</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="graduate">Graduate</option>
                  <option value="fixed-term">Fixed-term</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input
                type="text"
                placeholder="e.g. £40,000–£50,000"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Source URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Applied at */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applied at</label>
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Closing date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing date</label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Interest level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest level</label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very-high">Very High</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                placeholder="comma separated"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {submitting ? "Saving…" : "Add job"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
