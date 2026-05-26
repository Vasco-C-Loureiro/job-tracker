"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { JobApplicationRow, InterviewRoundRow } from "./InterviewKanban";

type RoundState = {
  id: string | null;
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

function rowToRoundState(r: InterviewRoundRow): RoundState {
  return {
    id: r.id,
    roundNumber: r.round_number,
    type: r.type,
    date: r.date ? r.date.slice(0, 10) : "",
    location: r.location ?? "",
    contactName: r.contact_name ?? "",
    contactRole: r.contact_role ?? "",
    done: r.done,
    followUpSent: r.follow_up_sent,
    notes: r.notes ?? "",
    saving: false,
    deleting: false,
  };
}

const INTERVIEW_TYPES: { value: string; label: string }[] = [
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

const STATUS_BADGE: Record<string, string> = {
  saved:      "bg-gray-100 text-gray-600",
  applied:    "bg-blue-100 text-blue-700",
  oa:         "bg-purple-100 text-purple-700",
  interview:  "bg-amber-100 text-amber-700",
  rejected:   "bg-red-100 text-red-600",
  offer:      "bg-green-100 text-green-700",
  ghosted:    "bg-gray-100 text-gray-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  job: JobApplicationRow;
  rounds: InterviewRoundRow[];
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onRoundChange: (jobId: string, newRound: number) => void;
  onStatusChange: (jobId: string, newStatus: string) => void;
  maxRoundColumn: number;
  getToken: () => Promise<string | null>;
  onRoundsChange: (jobId: string, newRounds: InterviewRoundRow[]) => void;
};

export default function InterviewCard({
  job,
  rounds: initialRounds,
  isSelected,
  onSelect,
  onRoundChange,
  onStatusChange,
  maxRoundColumn,
  getToken,
  onRoundsChange,
}: Props) {
  const [pillOpen, setPillOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [roundsEditMode, setRoundsEditMode] = useState(false);
  const [localRounds, setLocalRounds] = useState<RoundState[]>(() =>
    initialRounds.map(rowToRoundState),
  );
  const [saveMessage, setSaveMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const pillRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync when parent rounds change (e.g. after add/delete elsewhere)
  useEffect(() => {
    setLocalRounds(initialRounds.map(rowToRoundState));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRounds.length]);

  // Close pill on outside click
  useEffect(() => {
    if (!pillOpen) return;
    function handleDown(e: MouseEvent) {
      if (
        !(pillRef.current?.contains(e.target as Node)) &&
        !(dropdownRef.current?.contains(e.target as Node))
      ) {
        setPillOpen(false);
        setDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [pillOpen]);

  // Close pill on scroll
  useEffect(() => {
    if (!pillOpen) return;
    function handleScroll() {
      setPillOpen(false);
      setDropdownPos(null);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [pillOpen]);

  async function patchJob(payload: Record<string, unknown>): Promise<boolean> {
    const token = await getToken();
    if (!token) return false;
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  }

  async function handleSelectRound(n: number) {
    setPillOpen(false);
    onRoundChange(job.id, n);
    await patchJob({ currentInterviewRound: n });
  }

  async function handleNextRound() {
    setPillOpen(false);
    const next = (job.current_interview_round ?? 0) + 1;
    if (next > maxRoundColumn) {
      onStatusChange(job.id, "offer");
      await patchJob({ status: "offer" });
    } else {
      onRoundChange(job.id, next);
      await patchJob({ currentInterviewRound: next });
    }
  }

  async function handleRejected() {
    setPillOpen(false);
    onStatusChange(job.id, "rejected");
    await patchJob({ status: "rejected" });
  }

  // ── Round editing (mirrors JobEditForm) ──────────────────────────

  function updateLocalRound<K extends keyof RoundState>(
    index: number,
    field: K,
    value: RoundState[K],
  ) {
    setLocalRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addLocalRound() {
    const nextNum =
      localRounds.length > 0
        ? Math.max(...localRounds.map((r) => r.roundNumber)) + 1
        : 1;
    setLocalRounds((prev) => [
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

  async function saveLocalRound(index: number) {
    const round = localRounds[index];
    setLocalRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, saving: true } : r)),
    );
    const token = await getToken();
    if (!token) {
      setLocalRounds((prev) =>
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = (await res.json()) as { id: string };
        setLocalRounds((prev) => {
          const updated = prev.map((r, i) =>
            i === index ? { ...r, id: created.id, saving: false } : r,
          );
          notifyRoundsChange(updated);
          return updated;
        });
      } else {
        setLocalRounds((prev) =>
          prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
        );
      }
    } else {
      await fetch(`/api/interviews/${round.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      setLocalRounds((prev) => {
        const updated = prev.map((r, i) =>
          i === index ? { ...r, saving: false } : r,
        );
        notifyRoundsChange(updated);
        return updated;
      });
    }
  }

  async function deleteLocalRound(index: number) {
    const round = localRounds[index];
    if (round.id === null) {
      setLocalRounds((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        notifyRoundsChange(updated);
        return updated;
      });
      return;
    }
    setLocalRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, deleting: true } : r)),
    );
    const token = await getToken();
    if (!token) {
      setLocalRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
      return;
    }
    const res = await fetch(`/api/interviews/${round.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setLocalRounds((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        notifyRoundsChange(updated);
        return updated;
      });
    } else {
      setLocalRounds((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
    }
  }

  function notifyRoundsChange(updated: RoundState[]) {
    const asRows: InterviewRoundRow[] = updated
      .filter((r) => r.id !== null)
      .map((r) => ({
        id: r.id!,
        job_application_id: job.id,
        round_number: r.roundNumber,
        type: r.type,
        date: r.date || null,
        location: r.location || null,
        contact_name: r.contactName || null,
        contact_role: r.contactRole || null,
        done: r.done,
        follow_up_sent: r.followUpSent,
        notes: r.notes || null,
        created_at: "",
        updated_at: "",
      }));
    onRoundsChange(job.id, asRows);
  }

  // Derived from the prop (InterviewRoundRow) for collapsed-face display;
  // localRounds drives the edit form.
  const currentRound = initialRounds.find(
    (r) => r.round_number === job.current_interview_round,
  );
  const roundOptions = Array.from(
    { length: maxRoundColumn },
    (_, i) => i + 1,
  );

  const inputCls =
    "w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-gray-500 mb-1";

  return (
    <>
      <div
        className={`bg-white border rounded-lg overflow-hidden transition-all relative ${
          isSelected
            ? "z-20 border-blue-400 shadow-md"
            : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isSelected ? null : job.id);
        }}
      >
        {/* ── Card face ──────────────────────────────────────────────── */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                {job.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {job.company}
              </p>
              {job.location && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {job.location}
                </p>
              )}
            </div>

            {/* Round pill + round date/location */}
            <div
              className="shrink-0 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-block">
                <button
                  ref={pillRef}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pillOpen) {
                      setPillOpen(false);
                      setDropdownPos(null);
                    } else {
                      const rect = pillRef.current?.getBoundingClientRect();
                      if (rect) {
                        setDropdownPos({ top: rect.bottom + 4, left: rect.right });
                      }
                      setPillOpen(true);
                    }
                  }}
                >
                  {job.status === "offer"
                    ? "Offer"
                    : `Round ${job.current_interview_round}`}
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {currentRound?.date && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(currentRound.date).toLocaleDateString("en-GB")}
                </p>
              )}
              {currentRound?.location && (
                <p className="text-xs text-gray-400">{currentRound.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Expandable section ─────────────────────────────────────── */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            isSelected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="border-t border-gray-100 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Section 1 — Read-only job details */}
              <div className="mb-5 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Title</span>
                  <span className="text-gray-900 font-medium">{job.title}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Company</span>
                  <span className="text-gray-900">{job.company}</span>
                </div>
                {job.location && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Location</span>
                    <span className="text-gray-900">
                      {job.location}
                      {job.remote_type ? ` · ${job.remote_type}` : ""}
                    </span>
                  </div>
                )}
                {job.job_type && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Job type</span>
                    <span className="text-gray-900">{job.job_type}</span>
                  </div>
                )}
                {job.salary_raw && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Salary</span>
                    <span className="text-gray-900">{job.salary_raw}</span>
                  </div>
                )}
                {job.applied_at && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Applied</span>
                    <span className="text-gray-900">
                      {formatDate(job.applied_at)}
                    </span>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 w-20 shrink-0">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.interest_level && (
                    <span className="text-xs text-gray-400 ml-1">
                      {job.interest_level}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 2 — Interview rounds */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Interview Rounds
                  </h4>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setRoundsEditMode((m) => !m)}
                  >
                    {roundsEditMode ? "done" : "✏ edit"}
                  </button>
                </div>

                {!roundsEditMode ? (
                  localRounds.length === 0 ? (
                    <p className="text-xs text-gray-400">No rounds logged.</p>
                  ) : (
                    <div className="space-y-1">
                      {localRounds.map((r) => (
                        <div
                          key={r.id ?? `new-${r.roundNumber}`}
                          className="text-xs text-gray-600 flex flex-wrap gap-1 items-center"
                        >
                          <span className="font-medium">
                            Round {r.roundNumber}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span>{r.type}</span>
                          {r.date && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span>{formatDate(r.date)}</span>
                            </>
                          )}
                          {r.contactName && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span>{r.contactName}</span>
                            </>
                          )}
                          {r.done && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-green-600">Done ✓</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div>
                    {localRounds.map((round, idx) => (
                      <div
                        key={round.id ?? `new-${idx}`}
                        className="border border-gray-200 rounded-lg p-3 mb-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-400">
                            Round {round.roundNumber}
                          </span>
                          <button
                            onClick={() => void deleteLocalRound(idx)}
                            disabled={round.deleting}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                          >
                            {round.deleting ? "Removing…" : "Remove"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {/* Row 1: Type + Date */}
                          <div>
                            <label className={labelCls}>Type</label>
                            <select
                              className={inputCls}
                              value={round.type}
                              onChange={(e) =>
                                updateLocalRound(idx, "type", e.target.value)
                              }
                            >
                              {INTERVIEW_TYPES.map(({ value, label }) => (
                                <option
                                  key={value}
                                  className="text-gray-900 bg-white"
                                  value={value}
                                >
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Date</label>
                            <input
                              type="date"
                              className={inputCls}
                              value={round.date}
                              onChange={(e) =>
                                updateLocalRound(idx, "date", e.target.value)
                              }
                            />
                          </div>
                          {/* Row 2: Contact name + Contact role */}
                          <div>
                            <label className={labelCls}>Contact name</label>
                            <input
                              className={inputCls}
                              value={round.contactName}
                              onChange={(e) =>
                                updateLocalRound(idx, "contactName", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Contact role</label>
                            <input
                              className={inputCls}
                              value={round.contactRole}
                              onChange={(e) =>
                                updateLocalRound(idx, "contactRole", e.target.value)
                              }
                            />
                          </div>
                          {/* Row 3: Location + checkboxes */}
                          <div>
                            <label className={labelCls}>Location</label>
                            <input
                              className={inputCls}
                              value={round.location}
                              onChange={(e) =>
                                updateLocalRound(idx, "location", e.target.value)
                              }
                            />
                          </div>
                          <div className="flex gap-4 items-center pt-5">
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={round.done}
                                onChange={(e) =>
                                  updateLocalRound(idx, "done", e.target.checked)
                                }
                              />
                              Done
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={round.followUpSent}
                                onChange={(e) =>
                                  updateLocalRound(idx, "followUpSent", e.target.checked)
                                }
                              />
                              Follow-up sent
                            </label>
                          </div>
                          {/* Row 4: Notes (full width) */}
                          <div className="col-span-2">
                            <label className={labelCls}>Notes</label>
                            <textarea
                              className={`${inputCls} resize-y`}
                              rows={2}
                              value={round.notes}
                              onChange={(e) =>
                                updateLocalRound(idx, "notes", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => void saveLocalRound(idx)}
                          disabled={round.saving}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {round.saving
                            ? "Saving…"
                            : round.id
                              ? "Save round"
                              : "Add round"}
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addLocalRound}
                      className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded hover:bg-gray-50"
                    >
                      + Add round
                    </button>
                  </div>
                )}
              </div>

              {/* Section 3 — Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await patchJob({ notes: job.notes });
                      if (ok) {
                        onSelect(null);
                      } else {
                        setSaveMessage({ type: "err", text: "Save failed" });
                        setTimeout(() => setSaveMessage(null), 2000);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                  >
                    Save changes
                  </button>
                  {saveMessage && (
                    <span
                      className={`text-xs ${
                        saveMessage.type === "ok"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {saveMessage.text}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleRejected();
                      onSelect(null);
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                  >
                    ✕ Rejected
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleNextRound();
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700"
                  >
                    → Next Round
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Round pill dropdown — rendered via portal to escape overflow/stacking context */}
      {pillOpen && dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              transform: "translateX(-100%)",
              zIndex: 9999,
            }}
            className="w-44 bg-white border border-gray-200 rounded-xl shadow-lg"
          >
            <div className="py-1">
              {roundOptions.map((n) => (
                <button
                  key={n}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSelectRound(n);
                  }}
                >
                  <span
                    className={
                      job.current_interview_round === n
                        ? "text-blue-600"
                        : "text-gray-300"
                    }
                  >
                    {job.current_interview_round === n ? "✓" : "○"}
                  </span>
                  Round {n}
                </button>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleNextRound();
                }}
              >
                → Next Round
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRejected();
                }}
              >
                ✕ Rejected
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
