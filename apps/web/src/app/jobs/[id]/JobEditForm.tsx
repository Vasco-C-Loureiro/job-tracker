"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { JobApplication } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type FormState = {
  title: string;
  company: string;
  location: string;
  remoteType: string;
  jobType: string;
  salary: string;
  description: string;
  status: string;
  interestLevel: string;
  appliedAt: string;
  companyApplicationUrl: string;
  resumeSubmitted: boolean;
  coverLetterSubmitted: boolean;
  tags: string;
  notes: string;
};

function jobToFormState(job: JobApplication): FormState {
  return {
    title: job.title,
    company: job.company,
    location: job.location ?? "",
    remoteType: job.remoteType ?? "",
    jobType: job.jobType ?? "",
    salary: job.salary ?? "",
    description: job.description ?? "",
    status: job.status,
    interestLevel: job.interestLevel ?? "",
    // date input needs YYYY-MM-DD; ISO timestamps have time after the T
    appliedAt: job.appliedAt ? job.appliedAt.slice(0, 10) : "",
    companyApplicationUrl: job.companyApplicationUrl ?? "",
    resumeSubmitted: job.resumeSubmitted ?? false,
    coverLetterSubmitted: job.coverLetterSubmitted ?? false,
    tags: (job.tags ?? []).join(", "),
    notes: job.notes ?? "",
  };
}

export default function JobEditForm({ job }: { job: JobApplication }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => jobToFormState(job));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      setMessage({ type: "error", text: "Not authenticated. Please sign in again." });
      setSaving(false);
      return;
    }

    const tagsArray = form.tags
      ? form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const response = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: form.title,
        company: form.company,
        location: form.location || null,
        remoteType: form.remoteType || null,
        jobType: form.jobType || null,
        salary: form.salary || null,
        description: form.description || null,
        status: form.status,
        interestLevel: form.interestLevel || null,
        appliedAt: form.appliedAt || null,
        companyApplicationUrl: form.companyApplicationUrl || null,
        resumeSubmitted: form.resumeSubmitted,
        coverLetterSubmitted: form.coverLetterSubmitted,
        tags: tagsArray,
        notes: form.notes || null,
      }),
    });

    if (response.ok) {
      setMessage({ type: "success", text: "Saved." });
      setTimeout(() => router.push("/"), 500);
    } else {
      const body = await response.json().catch(() => ({})) as { error?: string };
      setMessage({
        type: "error",
        text: body.error ?? `Save failed (${response.status})`,
      });
    }

    setSaving(false);
  };

  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";
  const fieldCls = "mb-4";

  return (
    <div>
      <Link href="/" className="text-sm text-blue-700 hover:underline mb-6 block">
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-1">{job.title}</h1>
      <p className="text-gray-500 text-sm mb-6">{job.company} · {job.source} · saved {new Date(job.savedAt).toLocaleDateString("en-GB")}</p>

      {/* ── Extracted fields ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Extracted fields
        </h2>

        <div className={fieldCls}>
          <label className={labelCls}>Title</label>
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Company</label>
          <input
            className={inputCls}
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={labelCls}>Location</label>
            <input
              className={inputCls}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Remote</label>
            <select
              className={inputCls}
              value={form.remoteType}
              onChange={(e) => set("remoteType", e.target.value)}
            >
              <option className="text-gray-900 bg-white" value="">—</option>
              <option className="text-gray-900 bg-white" value="remote">remote</option>
              <option className="text-gray-900 bg-white" value="hybrid">hybrid</option>
              <option className="text-gray-900 bg-white" value="onsite">onsite</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={labelCls}>Job Type</label>
            <select
              className={inputCls}
              value={form.jobType}
              onChange={(e) => set("jobType", e.target.value)}
            >
              <option className="text-gray-900 bg-white" value="">—</option>
              <option className="text-gray-900 bg-white" value="full-time">full-time</option>
              <option className="text-gray-900 bg-white" value="part-time">part-time</option>
              <option className="text-gray-900 bg-white" value="contract">contract</option>
              <option className="text-gray-900 bg-white" value="internship">internship</option>
              <option className="text-gray-900 bg-white" value="graduate">graduate</option>
              <option className="text-gray-900 bg-white" value="fixed-term">fixed-term</option>
              <option className="text-gray-900 bg-white" value="permanent">permanent</option>
            </select>
          </div>
          <div className="flex-1">
            <label className={labelCls}>Salary</label>
            <input
              className={inputCls}
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
            />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} resize-y`}
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </section>

      {/* ── Application details ───────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Application details
        </h2>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={labelCls}>Status</label>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option className="text-gray-900 bg-white" value="saved">saved</option>
              <option className="text-gray-900 bg-white" value="applied">applied</option>
              <option className="text-gray-900 bg-white" value="oa">oa</option>
              <option className="text-gray-900 bg-white" value="interview">interview</option>
              <option className="text-gray-900 bg-white" value="rejected">rejected</option>
              <option className="text-gray-900 bg-white" value="offer">offer</option>
              <option className="text-gray-900 bg-white" value="ghosted">ghosted</option>
            </select>
          </div>
          <div className="flex-1">
            <label className={labelCls}>Interest level</label>
            <select
              className={inputCls}
              value={form.interestLevel}
              onChange={(e) => set("interestLevel", e.target.value)}
            >
              <option className="text-gray-900 bg-white" value="">—</option>
              <option className="text-gray-900 bg-white" value="low">low</option>
              <option className="text-gray-900 bg-white" value="medium">medium</option>
              <option className="text-gray-900 bg-white" value="high">high</option>
              <option className="text-gray-900 bg-white" value="very-high">very-high</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={labelCls}>Applied at</label>
            <input
              type="date"
              className={inputCls}
              value={form.appliedAt}
              onChange={(e) => set("appliedAt", e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Company application URL</label>
            <input
              type="url"
              className={inputCls}
              value={form.companyApplicationUrl}
              onChange={(e) => set("companyApplicationUrl", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.resumeSubmitted}
              onChange={(e) => set("resumeSubmitted", e.target.checked)}
              className="w-4 h-4"
            />
            Resume submitted
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.coverLetterSubmitted}
              onChange={(e) => set("coverLetterSubmitted", e.target.checked)}
              className="w-4 h-4"
            />
            Cover letter submitted
          </label>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Tags (comma-separated)</label>
          <input
            className={inputCls}
            value={form.tags}
            placeholder="e.g. fintech, senior, remote-friendly"
            onChange={(e) => set("tags", e.target.value)}
          />
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Notes</label>
          <textarea
            className={`${inputCls} resize-y`}
            rows={4}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </section>

      {/* ── Save ─────────────────────────────────────────────────── */}
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
    </div>
  );
}
