"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { INTERVIEW_TYPE_OPTIONS } from "@/lib/calendar/icons";
import type { JobApplicationRow, InterviewRoundRow } from "./InterviewKanban";

type RoundState = {
  id: string | null;
  roundNumber: number;
  type: string;
  date: string;
  time: string;
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
    time: r.time?.slice(0, 5) ?? "",
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

function getNextAvailableRoundNumber(
  existingRounds: RoundState[],
  maxRound: number,
): number {
  const usedNumbers = new Set(existingRounds.map((r) => r.roundNumber));
  for (let i = 1; i <= maxRound; i++) {
    if (!usedNumbers.has(i)) return i;
  }
  return maxRound;
}


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
  isAdvancing: boolean;
  isRejecting: boolean;
  onNextRound: (jobId: string) => void;
  onReject: (jobId: string) => void;
  isDraggable?: boolean;
  isBeingDragged?: boolean;
  className?: string;
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
  isAdvancing,
  isRejecting,
  onNextRound,
  onReject,
  isDraggable = true,
  isBeingDragged,
  className,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id, disabled: !isDraggable });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const [pillOpen, setPillOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [editingRoundIdx, setEditingRoundIdx] = useState<number | null>(null);
  const [localRounds, setLocalRounds] = useState<RoundState[]>(() =>
    initialRounds.map(rowToRoundState).sort((a, b) => a.roundNumber - b.roundNumber),
  );
  const [saveMessage, setSaveMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [roundPillOpen, setRoundPillOpen] = useState(false);
  const [roundPillPos, setRoundPillPos] = useState<{ top: number; left: number } | null>(null);

  const pillRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roundPillBtnRef = useRef<HTMLButtonElement>(null);
  const roundPillDropdownRef = useRef<HTMLDivElement>(null);

  // Always-current ref so the deselection effect can read the latest editingRoundIdx
  // without needing it in the effect's dependency array.
  const editingRoundIdxRef = useRef(editingRoundIdx);
  editingRoundIdxRef.current = editingRoundIdx;

  // Sync when parent rounds change (e.g. after add/delete elsewhere)
  useEffect(() => {
    setLocalRounds(
      initialRounds.map(rowToRoundState).sort((a, b) => a.roundNumber - b.roundNumber),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRounds.length]);

  // Auto-save open round form on every deselection path:
  // backdrop click, switching to another card, or drag start.
  useEffect(() => {
    if (!isSelected && editingRoundIdxRef.current !== null) {
      void saveLocalRound(editingRoundIdxRef.current).then(() => {
        setEditingRoundIdx(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  // Close round pill dropdown when editing round changes
  useEffect(() => {
    setRoundPillOpen(false);
    setRoundPillPos(null);
  }, [editingRoundIdx]);

  // Close main pill on outside click
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

  // Close main pill on scroll
  useEffect(() => {
    if (!pillOpen) return;
    function handleScroll() {
      setPillOpen(false);
      setDropdownPos(null);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [pillOpen]);

  // Close round number pill on outside click
  useEffect(() => {
    if (!roundPillOpen) return;
    function handleDown(e: MouseEvent) {
      if (
        !(roundPillBtnRef.current?.contains(e.target as Node)) &&
        !(roundPillDropdownRef.current?.contains(e.target as Node))
      ) {
        setRoundPillOpen(false);
        setRoundPillPos(null);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [roundPillOpen]);

  // Close round number pill on scroll
  useEffect(() => {
    if (!roundPillOpen) return;
    function handleScroll() {
      setRoundPillOpen(false);
      setRoundPillPos(null);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [roundPillOpen]);

  async function patchJob(payload: Record<string, unknown>): Promise<boolean> {
    const token = await getToken();
    if (!token) return false;
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.ok;
  }

  async function handleSelectRound(n: number) {
    setPillOpen(false);
    onRoundChange(job.id, n);
    await patchJob({ currentInterviewRound: n });
  }

  function handleNextRound() {
    setPillOpen(false);
    setDropdownPos(null);
    onNextRound(job.id);
  }

  function handleRejected() {
    setPillOpen(false);
    setDropdownPos(null);
    onReject(job.id);
  }

  // ── Round editing ────────────────────────────────────────────────

  function updateLocalRound<K extends keyof RoundState>(
    index: number,
    field: K,
    value: RoundState[K],
  ) {
    setLocalRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  async function handleAddRoundButton() {
    if (editingRoundIdx !== null) {
      await saveLocalRound(editingRoundIdx);
      setEditingRoundIdx(null);
    }
    const nextNum = getNextAvailableRoundNumber(localRounds, job.current_interview_round);
    // Position in the sorted array where the new round will land
    const insertIdx = localRounds.filter((r) => r.roundNumber < nextNum).length;
    setLocalRounds((prev) => {
      const newRound: RoundState = {
        id: null,
        roundNumber: nextNum,
        type: "screening",
        date: "",
        time: "",
        location: "",
        contactName: "",
        contactRole: "",
        done: false,
        followUpSent: false,
        notes: "",
        saving: false,
        deleting: false,
      };
      return [...prev, newRound].sort((a, b) => a.roundNumber - b.roundNumber);
    });
    setEditingRoundIdx(insertIdx);
  }

  function getAvailableRoundNumbers(currentIdx: number): number[] {
    const currentNum = localRounds[currentIdx].roundNumber;
    const usedNumbers = new Set(localRounds.map((r) => r.roundNumber));
    usedNumbers.delete(currentNum);
    const available: number[] = [];
    for (let i = 1; i <= job.current_interview_round; i++) {
      if (!usedNumbers.has(i)) available.push(i);
    }
    return available;
  }

  async function handleRoundNumberChange(currentIdx: number, newRoundNumber: number) {
    setRoundPillOpen(false);
    setRoundPillPos(null);
    const editedRound = { ...localRounds[currentIdx], roundNumber: newRoundNumber };
    const newList = localRounds
      .map((r, i) => (i === currentIdx ? editedRound : r))
      .sort((a, b) => a.roundNumber - b.roundNumber);
    const newIdx = newList.indexOf(editedRound);
    setLocalRounds(newList);
    setEditingRoundIdx(newIdx);
    if (editedRound.id) {
      const token = await getToken();
      if (!token) return;
      await fetch(`/api/interviews/${editedRound.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundNumber: newRoundNumber }),
      });
    }
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
      time: round.time || null,
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        time: r.time || null,
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
  const roundOptions = Array.from({ length: maxRoundColumn }, (_, i) => i + 1);

  const allRoundsFilled = (() => {
    const usedNumbers = new Set(localRounds.map((r) => r.roundNumber));
    for (let i = 1; i <= job.current_interview_round; i++) {
      if (!usedNumbers.has(i)) return false;
    }
    return true;
  })();

  const inputCls =
    "w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-gray-500 mb-1";

  return (
    <>
      <div
        ref={setNodeRef}
        style={dragStyle}
        {...listeners}
        {...attributes}
        className={`bg-white border rounded-lg overflow-hidden transition-all relative ${
          isSelected
            ? "z-20 border-blue-400 shadow-md"
            : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
        }${isAdvancing ? " animate-round-advance pointer-events-none" : ""}${isRejecting ? " animate-card-reject pointer-events-none" : ""}${isDragging || isBeingDragged ? " opacity-0" : ""}${className ? ` ${className}` : ""}`}
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
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {currentRound?.date && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(currentRound.date).toLocaleDateString("en-GB")}
                  {currentRound.time && ` · ${currentRound.time.slice(0, 5)}`}
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
          className={`grid ${
            isSelected && !isDragging
              ? "grid-rows-[1fr] transition-all duration-300 ease-out"
              : "grid-rows-[0fr]"
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
                    <span className="text-gray-900">{formatDate(job.applied_at)}</span>
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
                    <span className="text-xs text-gray-400 ml-1">{job.interest_level}</span>
                  )}
                </div>
              </div>

              {/* Section 2 — Interview rounds */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Interview Rounds
                </h4>

                <div className="space-y-1 mb-2">
                  {localRounds.length === 0 && (
                    <p className="text-xs text-gray-400">No rounds logged.</p>
                  )}
                  {localRounds.map((round, idx) =>
                    editingRoundIdx === idx ? (
                      <div
                        key={round.id ?? `new-${idx}`}
                        className="border border-gray-200 rounded-lg p-3 mb-1"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {/* Round number pill — opens dropdown to change the round number */}
                          <button
                            ref={roundPillBtnRef}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-700 bg-transparent hover:border-gray-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (roundPillOpen) {
                                setRoundPillOpen(false);
                                setRoundPillPos(null);
                              } else {
                                const rect = roundPillBtnRef.current?.getBoundingClientRect();
                                if (rect) {
                                  setRoundPillPos({ top: rect.bottom + 4, left: rect.left });
                                }
                                setRoundPillOpen(true);
                              }
                            }}
                          >
                            Round {round.roundNumber}
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 4l4 4 4-4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={async () => {
                                await deleteLocalRound(idx);
                                setEditingRoundIdx(null);
                              }}
                              disabled={round.deleting}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                            >
                              {round.deleting ? "Removing…" : "Remove"}
                            </button>
                            <button
                              onClick={async () => {
                                await saveLocalRound(idx);
                                setEditingRoundIdx(null);
                              }}
                              disabled={round.saving}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                            >
                              {round.saving ? "Saving…" : "done"}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Row 1: Type + Date */}
                          <div>
                            <label className={labelCls}>Type</label>
                            <select
                              className={inputCls}
                              value={round.type}
                              onChange={(e) => updateLocalRound(idx, "type", e.target.value)}
                            >
                              {INTERVIEW_TYPE_OPTIONS.map(({ value, label }) => (
                                <option key={value} className="text-gray-900 bg-white" value={value}>
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
                              onChange={(e) => updateLocalRound(idx, "date", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Time</label>
                            <input
                              type="time"
                              className={inputCls}
                              value={round.time}
                              onChange={(e) => updateLocalRound(idx, "time", e.target.value)}
                            />
                          </div>
                          {/* Row 2: Contact name + Contact role */}
                          <div>
                            <label className={labelCls}>Contact name</label>
                            <input
                              className={inputCls}
                              value={round.contactName}
                              onChange={(e) => updateLocalRound(idx, "contactName", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Contact role</label>
                            <input
                              className={inputCls}
                              value={round.contactRole}
                              onChange={(e) => updateLocalRound(idx, "contactRole", e.target.value)}
                            />
                          </div>
                          {/* Row 3: Location + checkboxes */}
                          <div>
                            <label className={labelCls}>Location</label>
                            <input
                              className={inputCls}
                              value={round.location}
                              onChange={(e) => updateLocalRound(idx, "location", e.target.value)}
                            />
                          </div>
                          <div className="flex gap-4 items-center pt-5">
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5"
                                checked={round.done}
                                onChange={(e) => updateLocalRound(idx, "done", e.target.checked)}
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
                              onChange={(e) => updateLocalRound(idx, "notes", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={round.id ?? `new-${idx}`}
                        className="text-xs text-gray-600 flex flex-wrap gap-1 items-center"
                      >
                        <span className="font-medium">Round {round.roundNumber}</span>
                        <span className="text-gray-300">·</span>
                        <span>{round.type}</span>
                        {round.date && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{formatDate(round.date)}{round.time && ` · ${round.time.slice(0, 5)}`}</span>
                          </>
                        )}
                        {round.contactName && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{round.contactName}</span>
                          </>
                        )}
                        {round.done && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-green-600">Done ✓</span>
                          </>
                        )}
                        <button
                          onClick={() => setEditingRoundIdx(idx)}
                          className="p-2 text-gray-400 hover:text-gray-700 transition-colors text-base"
                          title="Edit round"
                        >
                          ✏️
                        </button>
                      </div>
                    ),
                  )}
                </div>

                {!allRoundsFilled && (
                  <button
                    onClick={() => void handleAddRoundButton()}
                    className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded hover:bg-gray-50"
                  >
                    + Add round
                  </button>
                )}
              </div>

              {/* Section 3 — Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (editingRoundIdx !== null) {
                        await saveLocalRound(editingRoundIdx);
                        setEditingRoundIdx(null);
                      }
                      const ok = await patchJob({ notes: job.notes });
                      if (ok) {
                        setEditingRoundIdx(null);
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
                        saveMessage.type === "ok" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {saveMessage.text}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(null);
                      handleRejected();
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                  >
                    ✕ Rejected
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextRound();
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
      {pillOpen &&
        dropdownPos &&
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
                      job.current_interview_round === n ? "text-blue-600" : "text-gray-300"
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
                  handleNextRound();
                }}
              >
                → Next Round
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejected();
                }}
              >
                ✕ Rejected
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Round number pill dropdown — changes the round number label in the edit form */}
      {roundPillOpen &&
        roundPillPos &&
        editingRoundIdx !== null &&
        createPortal(
          <div
            ref={roundPillDropdownRef}
            style={{
              position: "fixed",
              top: roundPillPos.top,
              left: roundPillPos.left,
              zIndex: 9999,
            }}
            className="w-36 bg-white border border-gray-200 rounded-xl shadow-lg"
          >
            <div className="py-1">
              {getAvailableRoundNumbers(editingRoundIdx).map((n) => (
                <button
                  key={n}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRoundNumberChange(editingRoundIdx, n);
                  }}
                >
                  <span
                    className={
                      localRounds[editingRoundIdx].roundNumber === n
                        ? "text-blue-600"
                        : "text-gray-300"
                    }
                  >
                    {localRounds[editingRoundIdx].roundNumber === n ? "✓" : "○"}
                  </span>
                  Round {n}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
