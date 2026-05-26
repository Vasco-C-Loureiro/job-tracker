"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobApplication, InterviewRound, InterviewType } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type FormState = {
  title: string;
  company: string;
  location: string;
  remoteType: string;
  jobType: string;
  salaryRaw: string;
  salaryRequested: string;
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
    salaryRaw: job.salaryRaw ?? "",
    salaryRequested: job.salaryRequested ?? "",
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

// ─── Interview rounds ─────────────────────────────────────────────────────────

type RoundState = {
  id: string | null; // null = not yet saved to DB
  roundNumber: number;
  type: string;
  date: string;
  location: string;
  contactName: string;
  contactRole: string;
  done: boolean;
  followUpSent: boolean;
  notes: string;
  saving: boolean;
  deleting: boolean;
};

function roundToState(r: InterviewRound): RoundState {
  return {
    id: r.id,
    roundNumber: r.roundNumber,
    type: r.type,
    date: r.date ? r.date.slice(0, 10) : "",
    location: r.location ?? "",
    contactName: r.contactName ?? "",
    contactRole: r.contactRole ?? "",
    done: r.done,
    followUpSent: r.followUpSent,
    notes: r.notes ?? "",
    saving: false,
    deleting: false,
  };
}

const INTERVIEW_TYPES: { value: InterviewType; label: string }[] = [
  { value: "screening",           label: "Screening"           },
  { value: "technical-phone",     label: "Technical phone"     },
  { value: "take-home",           label: "Take-home"           },
  { value: "coding",              label: "Coding"              },
  { value: "pair-programming",    label: "Pair programming"    },
  { value: "technical-deep-dive", label: "Technical deep-dive" },
  { value: "system-design",       label: "System design"       },
  { value: "behavioral",          label: "Behavioral"          },
  { value: "panel",               label: "Panel"               },
  { value: "final",               label: "Final"               },
  { value: "other",               label: "Other"               },
];

export default function JobEditForm({
  job,
  initialRounds,
}: {
  job: JobApplication;
  initialRounds: InterviewRound[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => jobToFormState(job));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  // Interview rounds state
  const [rounds, setRounds] = useState<RoundState[]>(() =>
    initialRounds.map(roundToState),
  );

  // Shared token helper (avoids repeating supabase session logic)
  async function getToken(): Promise<string | null> {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  function updateRound<K extends keyof RoundState>(
    index: number,
    field: K,
    value: RoundState[K],
  ) {
    setRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addRound() {
    const nextNum =
      rounds.length > 0
        ? Math.max(...rounds.map((r) => r.roundNumber)) + 1
        : 1;
    setRounds((prev) => [
      ...prev,
      {
        id: null,
        roundNumber: nextNum,
        type: "screening",
        date: "",
        location: "",
        contactName: "",
        contactRole: "",
        done: false,
        followUpSent: false,
        notes: "",
        saving: false,
        deleting: false,
      },
    ]);
  }

  async function saveRound(index: number) {
    const round = rounds[index];
    setRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, saving: true } : r)),
    );
    const token = await getToken();
    if (!token) {
      setRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
      );
      return;
    }
    const payload = {
      roundNumber: round.roundNumber,
      type: round.type,
      date: round.date || null,
      location: round.location || null,
      contactName: round.contactName || null,
      contactRole: round.contactRole || null,
      done: round.done,
      followUpSent: round.followUpSent,
      notes: round.notes || null,
    };
    if (round.id === null) {
      const res = await fetch(`/api/jobs/${job.id}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = (await res.json()) as { id: string };
        setRounds((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, id: created.id, saving: false } : r,
          ),
        );
      } else {
        setRounds((prev) =>
          prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
        );
      }
    } else {
      await fetch(`/api/interviews/${round.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
      );
    }
  }

  async function deleteRound(index: number) {
    const round = rounds[index];
    if (round.id === null) {
      setRounds((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, deleting: true } : r)),
    );
    const token = await getToken();
    if (!token) {
      setRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
      return;
    }
    const res = await fetch(`/api/interviews/${round.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRounds((prev) => prev.filter((_, i) => i !== index));
    } else {
      setRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const token = await getToken();

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
        salaryRaw: form.salaryRaw || null,
        salaryRequested: form.salaryRequested || null,
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
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-700 hover:underline mb-6 block"
      >
        ← Back
      </button>

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
              value={form.salaryRaw}
              onChange={(e) => set("salaryRaw", e.target.value)}
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
          <label className={labelCls}>Salary Requested</label>
          <input
            className={inputCls}
            value={form.salaryRequested}
            placeholder="What you told them you were expecting"
            onChange={(e) => set("salaryRequested", e.target.value)}
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
      <div className="flex items-center gap-4 mb-12">
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

      {/* ── Interview rounds ─────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Interview rounds
        </h2>

        {rounds.length === 0 && (
          <p className="text-sm text-gray-500 mb-4">No interview rounds yet.</p>
        )}

        {rounds.map((round, idx) => (
          <div
            key={round.id ?? `new-${idx}`}
            className="border border-gray-200 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Round {round.roundNumber}
              </span>
              <button
                onClick={() => deleteRound(idx)}
                disabled={round.deleting}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                {round.deleting ? "Removing…" : "Remove"}
              </button>
            </div>

            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className={labelCls}>Type</label>
                <select
                  className={inputCls}
                  value={round.type}
                  onChange={(e) => updateRound(idx, "type", e.target.value)}
                >
                  {INTERVIEW_TYPES.map(({ value, label }) => (
                    <option key={value} className="text-gray-900 bg-white" value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={round.date}
                  onChange={(e) => updateRound(idx, "date", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className={labelCls}>Contact name</label>
                <input
                  className={inputCls}
                  value={round.contactName}
                  onChange={(e) => updateRound(idx, "contactName", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Contact role</label>
                <input
                  className={inputCls}
                  value={round.contactRole}
                  onChange={(e) => updateRound(idx, "contactRole", e.target.value)}
                />
              </div>
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>Location</label>
              <input
                className={inputCls}
                value={round.location}
                onChange={(e) => updateRound(idx, "location", e.target.value)}
              />
            </div>

            <div className="flex gap-6 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={round.done}
                  onChange={(e) => updateRound(idx, "done", e.target.checked)}
                />
                Done
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={round.followUpSent}
                  onChange={(e) => updateRound(idx, "followUpSent", e.target.checked)}
                />
                Follow-up sent
              </label>
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} resize-y`}
                rows={3}
                value={round.notes}
                onChange={(e) => updateRound(idx, "notes", e.target.value)}
              />
            </div>

            <button
              onClick={() => saveRound(idx)}
              disabled={round.saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {round.saving ? "Saving…" : round.id ? "Save round" : "Add round"}
            </button>
          </div>
        ))}

        <button
          onClick={addRound}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50"
        >
          + Add round
        </button>
      </section>
    </div>
  );
}
