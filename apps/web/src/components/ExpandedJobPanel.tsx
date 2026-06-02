"use client";

import { useState, useEffect } from "react";
import type {
  JobApplicationListItem,
  ApplicationStatus,
  RemoteType,
  JobType,
  InterviewType,
} from "@job-tracker/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundRow = {
  id: string;
  job_application_id: string;
  round_number: number;
  type: string;
  date?: string | null;
  done: boolean;
  follow_up_sent: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type Round = {
  id: string;
  jobApplicationId: string;
  roundNumber: number;
  type: InterviewType;
  date: string;
  done: boolean;
  followUpSent: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Props = {
  job: JobApplicationListItem;
  getToken: () => Promise<string>;
  onJobPatched: (id: string, patch: Record<string, unknown>) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVIEW_TYPES: { value: InterviewType; label: string }[] = [
  { value: "screening",           label: "Screening" },
  { value: "technical-phone",     label: "Technical Phone" },
  { value: "take-home",           label: "Take-home" },
  { value: "coding",              label: "Coding" },
  { value: "pair-programming",    label: "Pair Programming" },
  { value: "technical-deep-dive", label: "Technical Deep-dive" },
  { value: "system-design",       label: "System Design" },
  { value: "behavioral",          label: "Behavioral" },
  { value: "panel",               label: "Panel" },
  { value: "final",               label: "Final" },
  { value: "other",               label: "Other" },
];

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved",     label: "Saved"     },
  { value: "applied",   label: "Applied"   },
  { value: "oa",        label: "OA"        },
  { value: "interview", label: "Interview" },
  { value: "offer",     label: "Offer"     },
  { value: "rejected",  label: "Rejected"  },
  { value: "ghosted",   label: "Ghosted"   },
];

// ─── RoundCard ────────────────────────────────────────────────────────────────

function RoundCard({
  round,
  onPatch,
  onDelete,
}: {
  round: Round;
  onPatch: (patch: Partial<Round>) => void;
  onDelete: () => void;
}) {
  const fc =
    "w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:border-blue-400 bg-white";

  return (
    <div className="flex-shrink-0 w-48 bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative">
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-base leading-none"
        aria-label="Delete round"
      >
        ×
      </button>
      <p className="text-xs font-semibold text-gray-900 mb-2">Round {round.roundNumber}</p>
      <div className="flex flex-col gap-2">
        <select
          className={fc}
          value={round.type}
          onChange={(e) => onPatch({ type: e.target.value as InterviewType })}
        >
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="date"
          className={fc}
          value={round.date}
          onChange={(e) => onPatch({ date: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={round.done}
            onChange={(e) => onPatch({ done: e.target.checked })}
            className="w-3.5 h-3.5"
          />
          Done
        </label>
      </div>
    </div>
  );
}

// ─── ExpandedJobPanel ─────────────────────────────────────────────────────────

export function ExpandedJobPanel({ job, getToken, onJobPatched }: Props) {
  const [description, setDescription] = useState<string | null | undefined>(undefined);
  const [rounds, setRounds]           = useState<Round[] | null>(null);

  // Local editable values — initialised from job prop on mount
  const [notes, setNotes]                       = useState(job.notes ?? "");
  const [location, setLocation]                 = useState(job.location ?? "");
  const [remoteType, setRemoteType]             = useState<RemoteType | "">(job.remoteType ?? "");
  const [jobType, setJobType]                   = useState<JobType | "">(job.jobType ?? "");
  const [interestLevel, setInterestLevel]       = useState(job.interestLevel ?? "");
  const [tags, setTags]                         = useState((job.tags ?? []).join(", "));
  const [appliedAt, setAppliedAt]               = useState(job.appliedAt?.slice(0, 10) ?? "");
  const [salaryRaw, setSalaryRaw]               = useState(job.salaryRaw ?? "");
  const [sourceUrl, setSourceUrl]               = useState(job.sourceUrl ?? "");
  const [companyUrl, setCompanyUrl]             = useState(job.companyApplicationUrl ?? "");
  const [status, setStatus]                     = useState<ApplicationStatus>(job.status);

  // Fetch description + interview rounds on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const [descRes, roundsRes] = await Promise.all([
          fetch(`/api/jobs/${job.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/jobs/${job.id}/interviews`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (cancelled) return;

        setDescription(
          descRes.ok
            ? ((await descRes.json()) as { description?: string | null }).description ?? null
            : null,
        );

        if (roundsRes.ok) {
          const rows = (await roundsRes.json()) as RoundRow[];
          setRounds(
            rows.map((r) => ({
              id: r.id,
              jobApplicationId: r.job_application_id,
              roundNumber: r.round_number,
              type: r.type as InterviewType,
              date: r.date ?? "",
              done: r.done,
              followUpSent: r.follow_up_sent,
              notes: r.notes ?? "",
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            })),
          );
        } else {
          setRounds([]);
        }
      } catch {
        if (!cancelled) { setDescription(null); setRounds([]); }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function saveField(
    apiField: string,
    value: unknown,
    parentField?: string,
  ) {
    try {
      const token = await getToken();
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [apiField]: value }),
      });
      if (!res.ok) return;
      if (parentField !== undefined) {
        onJobPatched(job.id, { [parentField]: value });
      }
    } catch { /* silent */ }
  }

  async function addRound() {
    try {
      const token = await getToken();
      const roundNumber = (rounds?.length ?? 0) + 1;
      const res = await fetch(`/api/jobs/${job.id}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundNumber, type: "screening", done: false, followUpSent: false }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };
      setRounds((prev) => [
        ...(prev ?? []),
        {
          id: data.id,
          jobApplicationId: job.id,
          roundNumber,
          type: "screening",
          date: "",
          done: false,
          followUpSent: false,
          notes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } catch { /* silent */ }
  }

  async function patchRound(roundId: string, patch: Partial<Round>) {
    const prev = rounds?.find((r) => r.id === roundId);
    if (!prev) return;
    const updated = { ...prev, ...patch };
    setRounds((rs) => rs?.map((r) => r.id === roundId ? updated : r) ?? null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/interviews/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roundNumber: updated.roundNumber,
          type: updated.type,
          date: updated.date || null,
          done: updated.done,
          followUpSent: updated.followUpSent,
          notes: updated.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRounds((rs) => rs?.map((r) => r.id === roundId ? prev : r) ?? null);
    }
  }

  async function deleteRound(roundId: string) {
    const prev = rounds;
    setRounds((rs) => rs?.filter((r) => r.id !== roundId) ?? null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/interviews/${roundId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
    } catch {
      setRounds(prev);
    }
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const fc = "w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white";
  const lc = "block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="px-5 bg-gray-100">

      {/* Description (read-only) */}
      {description ? (
        <div className="pt-4 mb-4">
          <p className={lc}>Description</p>
          <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white border border-gray-200 rounded p-3 max-h-[200px] overflow-y-auto">
            {description}
          </div>
        </div>
      ) : null}

      {/* Notes */}
      <div className={`mb-4${!description ? " pt-4" : ""}`}>
        <label className={lc}>Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveField("notes", notes || null, "notes")}
          className={`${fc} resize-none`}
        />
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 mb-5">

        <div>
          <label className={lc}>Status</label>
          <select
            className={fc}
            value={status}
            onChange={(e) => {
              const v = e.target.value as ApplicationStatus;
              setStatus(v);
              void saveField("status", v, "status");
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={lc}>Location</label>
          <input
            type="text"
            className={fc}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => void saveField("location", location || null, "location")}
          />
        </div>

        <div>
          <label className={lc}>Remote type</label>
          <select
            className={fc}
            value={remoteType}
            onChange={(e) => {
              const v = e.target.value as RemoteType | "";
              setRemoteType(v);
              void saveField("remoteType", v || null, "remoteType");
            }}
          >
            <option value="">—</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>

        <div>
          <label className={lc}>Job type</label>
          <select
            className={fc}
            value={jobType}
            onChange={(e) => {
              const v = e.target.value as JobType | "";
              setJobType(v);
              void saveField("jobType", v || null, "jobType");
            }}
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

        <div>
          <label className={lc}>Interest</label>
          <select
            className={fc}
            value={interestLevel}
            onChange={(e) => {
              const v = e.target.value;
              setInterestLevel(v);
              void saveField("interestLevel", v || null, "interestLevel");
            }}
          >
            <option value="">—</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="very-high">Very High</option>
          </select>
        </div>

        <div>
          <label className={lc}>Applied at</label>
          <input
            type="date"
            className={fc}
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
            onBlur={() => void saveField("appliedAt", appliedAt || null, "appliedAt")}
          />
        </div>

        <div>
          <label className={lc}>Salary</label>
          <input
            type="text"
            className={fc}
            value={salaryRaw}
            onChange={(e) => setSalaryRaw(e.target.value)}
            onBlur={() => void saveField("salaryRaw", salaryRaw || null, "salaryRaw")}
          />
        </div>

        <div>
          <label className={lc}>Tags</label>
          <input
            type="text"
            placeholder="comma separated"
            className={fc}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={() => {
              const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
              void saveField("tags", tagList, "tags");
            }}
          />
        </div>

        <div className="col-span-2">
          <label className={lc}>Source URL</label>
          <input
            type="text"
            className={fc}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onBlur={() => void saveField("sourceUrl", sourceUrl, "sourceUrl")}
          />
        </div>

        <div className="col-span-2">
          <label className={lc}>Company URL</label>
          <input
            type="text"
            className={fc}
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            onBlur={() => void saveField("companyApplicationUrl", companyUrl || null, "companyApplicationUrl")}
          />
        </div>

      </div>

      {/* Interview Rounds */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Interview Rounds
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {rounds === null ? (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-48 h-28 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pb-1 items-start">
            {rounds.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                onPatch={(patch) => void patchRound(round.id, patch)}
                onDelete={() => void deleteRound(round.id)}
              />
            ))}
            <button
              onClick={() => void addRound()}
              className="flex-shrink-0 w-48 h-28 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center justify-center gap-1"
            >
              <span className="text-xl leading-none">+</span>
              <span>Add round</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
