"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import InterviewCard from "./InterviewCard";

export type JobApplicationRow = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  remote_type: string | null;
  job_type: string | null;
  salary_raw: string | null;
  applied_at: string | null;
  saved_at: string;
  notes: string | null;
  status: string;
  interest_level: string | null;
  current_interview_round: number;
  cover_letter_submitted?: boolean | null;
  resume_submitted?: boolean | null;
  source_url?: string | null;
  source?: string | null;
};

export type InterviewRoundRow = {
  id: string;
  job_application_id: string;
  round_number: number;
  type: string;
  date?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  done: boolean;
  follow_up_sent: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type KanbanColumn = {
  roundNumber: number;
  label: string;
  isOffer: boolean;
};

type Props = {
  interviewJobs: JobApplicationRow[];
  offerJobs: JobApplicationRow[];
  rejectedJobs: JobApplicationRow[];
  allRounds: InterviewRoundRow[];
};

const DEFAULT_ROUND_COLUMNS: KanbanColumn[] = [
  { roundNumber: 1, label: "Round 1", isOffer: false },
  { roundNumber: 2, label: "Round 2", isOffer: false },
  { roundNumber: 3, label: "Round 3", isOffer: false },
];
const OFFER_COLUMN: KanbanColumn = { roundNumber: 0, label: "Offer", isOffer: true };
const EXTRA_ROUNDS_KEY = "job-tracker-kanban-extra-rounds";

export default function InterviewKanban({
  interviewJobs,
  offerJobs,
  rejectedJobs,
  allRounds: initialRounds,
}: Props) {
  const [jobs, setJobs] = useState<JobApplicationRow[]>([
    ...interviewJobs,
    ...offerJobs,
    ...rejectedJobs,
  ]);
  const [rounds, setRounds] = useState<InterviewRoundRow[]>(initialRounds);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [extraRounds, setExtraRounds] = useState<number[]>([]);
  const [advancingJobId, setAdvancingJobId] = useState<string | null>(null);
  const [isKanbanSliding, setIsKanbanSliding] = useState(false);
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(EXTRA_ROUNDS_KEY) ?? "[]",
      ) as unknown;
      if (
        Array.isArray(stored) &&
        stored.every((n) => typeof n === "number")
      ) {
        setExtraRounds(stored as number[]);
      }
    } catch {}

    return () => {
      setExtraRounds((prev) => {
        const nonEmpty = prev.filter((n) =>
          jobs.some(
            (j) => j.status === "interview" && j.current_interview_round === n,
          ),
        );
        localStorage.setItem(EXTRA_ROUNDS_KEY, JSON.stringify(nonEmpty));
        return nonEmpty;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roundColumns: KanbanColumn[] = [
    ...DEFAULT_ROUND_COLUMNS,
    ...extraRounds
      .slice()
      .sort((a, b) => a - b)
      .map((n) => ({ roundNumber: n, label: `Round ${n}`, isOffer: false })),
  ];
  const maxRoundColumn = Math.max(...roundColumns.map((c) => c.roundNumber));

  function getCardsForColumn(col: KanbanColumn): JobApplicationRow[] {
    if (col.isOffer) return jobs.filter((j) => j.status === "offer");
    return jobs.filter(
      (j) =>
        j.status === "interview" && j.current_interview_round === col.roundNumber,
    );
  }

  function getRejectedCardsForColumn(col: KanbanColumn): JobApplicationRow[] {
    return jobs.filter(
      (j) =>
        j.status === "rejected" &&
        j.current_interview_round === col.roundNumber,
    );
  }

  function getColumnWidth(col: KanbanColumn): string {
    const hasSelected = getCardsForColumn(col).some(
      (j) => j.id === selectedJobId,
    );
    return hasSelected ? "w-[620px]" : "w-[310px]";
  }

  const handleRoundChange = useCallback(
    (jobId: string, newRound: number) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, current_interview_round: newRound, status: "interview" }
            : j,
        ),
      );
      if (newRound > maxRoundColumn && !extraRounds.includes(newRound)) {
        const updated = [...extraRounds, newRound].sort((a, b) => a - b);
        setExtraRounds(updated);
        localStorage.setItem(EXTRA_ROUNDS_KEY, JSON.stringify(updated));
      }
    },
    [extraRounds, maxRoundColumn],
  );

  const handleStatusChange = useCallback(
    (jobId: string, newStatus: string) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
      );
    },
    [],
  );

  function handleAddRound() {
    const newRound = maxRoundColumn + 1;
    const updated = [...extraRounds, newRound];
    setExtraRounds(updated);
    localStorage.setItem(EXTRA_ROUNDS_KEY, JSON.stringify(updated));
  }

  async function handleNextRoundAnimated(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    setAdvancingJobId(jobId);
    setIsKanbanSliding(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    setAdvancingJobId(null);
    setIsKanbanSliding(false);

    const next = (job.current_interview_round ?? 0) + 1;
    const token = await getToken();
    if (!token) return;

    if (next > maxRoundColumn) {
      handleStatusChange(jobId, "offer");
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "offer" }),
      });
    } else {
      handleRoundChange(jobId, next);
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentInterviewRound: next }),
      });
    }
  }

  async function handleRejectAnimated(jobId: string) {
    setRejectingJobId(jobId);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    setRejectingJobId(null);

    const token = await getToken();
    if (!token) return;

    handleStatusChange(jobId, "rejected");
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "rejected" }),
    });
  }

  function isColumnEmpty(col: KanbanColumn): boolean {
    return !jobs.some((j) => j.current_interview_round === col.roundNumber);
  }

  function handleDeleteColumn(roundNumber: number) {
    const updated = extraRounds.filter((n) => n !== roundNumber);
    setExtraRounds(updated);
    localStorage.setItem(EXTRA_ROUNDS_KEY, JSON.stringify(updated));
  }

  async function getToken(): Promise<string | null> {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  const handleRoundsChange = useCallback(
    (jobId: string, newRounds: InterviewRoundRow[]) => {
      setRounds((prev) => [
        ...prev.filter((r) => r.job_application_id !== jobId),
        ...newRounds,
      ]);
    },
    [],
  );

  async function handleSaveAndClose() {
    const job = jobs.find((j) => j.id === selectedJobId);
    setSelectedJobId(null);
    if (!job) return;
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes: job.notes }),
    });
  }

  async function handleUnreject(jobId: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: "interview" } : j)),
    );
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "interview" }),
    });
  }

  const activeCount = jobs.filter(
    (j) => j.status === "interview" || j.status === "offer",
  ).length;

  const anyRejected = jobs.some((j) => j.status === "rejected");

  return (
    <>
      {/* Full-viewport backdrop — onMouseDown so it fires before any click handlers */}
      {selectedJobId && (
        <div
          className="fixed inset-0 z-10"
          onMouseDown={() => void handleSaveAndClose()}
        />
      )}
      <p className="text-base font-semibold text-gray-400 mb-6">
        {activeCount} active application{activeCount !== 1 ? "s" : ""}
      </p>

      {/* Main kanban — each column gets z-20 only when it holds the selected card */}
      <div className="min-w-[75vw]">
      <div className={`flex gap-4 overflow-x-auto pb-4 items-stretch${isKanbanSliding ? " animate-kanban-slide" : ""}`}>
        {/* Round columns */}
        {roundColumns.map((col) => {
          const isSelectedCol = getCardsForColumn(col).some(
            (j) => j.id === selectedJobId,
          );
          return (
            <div
              key={col.roundNumber}
              className={`flex-shrink-0 ${getColumnWidth(col)} transition-[width] duration-300 ease-in-out${isSelectedCol ? " relative z-20" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                {col.label}
                <span className="bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
                  {getCardsForColumn(col).length}
                </span>
                {col.roundNumber >= 4 && isColumnEmpty(col) && (
                  <button
                    onClick={() => handleDeleteColumn(col.roundNumber)}
                    className="ml-1.5 p-1 text-base text-gray-500 hover:text-red-400 transition-colors leading-none"
                    title="Remove column"
                  >
                    ✕
                  </button>
                )}
              </h3>
              <div className="space-y-2">
                {getCardsForColumn(col).map((job) => (
                  <InterviewCard
                    key={job.id}
                    job={job}
                    rounds={rounds.filter(
                      (r) => r.job_application_id === job.id,
                    )}
                    isSelected={selectedJobId === job.id}
                    onSelect={setSelectedJobId}
                    onRoundChange={handleRoundChange}
                    onStatusChange={handleStatusChange}
                    maxRoundColumn={maxRoundColumn}
                    getToken={getToken}
                    onRoundsChange={handleRoundsChange}
                    isAdvancing={advancingJobId === job.id}
                    isRejecting={rejectingJobId === job.id}
                    onNextRound={handleNextRoundAnimated}
                    onReject={handleRejectAnimated}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Add round button */}
        <div
          className="flex flex-col items-center justify-center flex-shrink-0 w-16 border-l border-r border-dashed border-gray-600"
          style={{ paddingLeft: "8px", paddingRight: "8px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAddRound}
              title={`Add Round ${maxRoundColumn + 1} column`}
              className="w-12 h-12 rounded-full border-2 border-dashed border-gray-500 hover:border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-300 text-2xl transition-colors"
            >
              +
            </button>
            <span className="text-xs text-gray-900 text-center">Add round</span>
          </div>
        </div>

        {/* Offer column */}
        <div
          className={`flex-shrink-0 w-[310px]${getCardsForColumn(OFFER_COLUMN).some((j) => j.id === selectedJobId) ? " relative z-20" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            Offer
            <span className="bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
              {getCardsForColumn(OFFER_COLUMN).length}
            </span>
          </h3>
          <div className="space-y-2">
            {getCardsForColumn(OFFER_COLUMN).map((job) => (
              <InterviewCard
                key={job.id}
                job={job}
                rounds={rounds.filter((r) => r.job_application_id === job.id)}
                isSelected={selectedJobId === job.id}
                onSelect={setSelectedJobId}
                onRoundChange={handleRoundChange}
                onStatusChange={handleStatusChange}
                maxRoundColumn={maxRoundColumn}
                getToken={getToken}
                onRoundsChange={handleRoundsChange}
                isAdvancing={advancingJobId === job.id}
                isRejecting={rejectingJobId === job.id}
                onNextRound={handleNextRoundAnimated}
                onReject={handleRejectAnimated}
              />
            ))}
          </div>
        </div>
      </div>
      </div>{/* end min-w-[75vw] */}

      {/* Rejected section — mirrors the exact same column structure as the main kanban */}
      {anyRejected && (
        <div className="mt-36">
          <h2 className="text-2xl font-bold text-gray-300 mb-4">
            Rejected
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {roundColumns.map((col) => (
              <div key={col.roundNumber} className="flex-shrink-0 w-[310px]">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  {col.label}
                  <span className="bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
                    {getRejectedCardsForColumn(col).length}
                  </span>
                  {col.roundNumber >= 4 && isColumnEmpty(col) && (
                    <button
                      onClick={() => handleDeleteColumn(col.roundNumber)}
                      className="ml-2 text-gray-500 hover:text-red-400 transition-colors text-sm leading-none"
                      title="Remove column"
                    >
                      ×
                    </button>
                  )}
                </h3>
                <div className="space-y-2">
                  {getRejectedCardsForColumn(col).map((job) => (
                    <div
                      key={job.id}
                      className="relative bg-gray-100 border border-gray-200 rounded-lg p-3 max-h-16 overflow-hidden"
                    >
                      <p className="text-sm font-semibold text-gray-600 truncate pr-6">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {job.company}
                      </p>
                      <button
                        onClick={() => void handleUnreject(job.id)}
                        className="absolute top-2 right-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
                        title="Undo rejection"
                      >
                        ↩
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
