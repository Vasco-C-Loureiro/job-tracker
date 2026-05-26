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
    return hasSelected ? "w-[520px]" : "w-64";
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

  const anyRejected = jobs.some((j) => j.status === "rejected");

  return (
    <div onClick={() => setSelectedJobId(null)}>
      {/* Main kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
        {/* Round columns */}
        {roundColumns.map((col) => (
          <div
            key={col.roundNumber}
            className={`flex-shrink-0 ${getColumnWidth(col)} transition-[width] duration-300 ease-in-out`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              {col.label}
              <span className="font-normal text-gray-300">
                ({getCardsForColumn(col).length})
              </span>
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
                />
              ))}
            </div>
          </div>
        ))}

        {/* Add round button */}
        <div
          className="flex-shrink-0 w-10 flex flex-col items-center pt-5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleAddRound}
            title={`Add Round ${maxRoundColumn + 1} column`}
            className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center text-lg font-light transition-colors"
          >
            +
          </button>
        </div>

        {/* Offer column */}
        <div
          className="flex-shrink-0 w-64"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            Offer
            <span className="font-normal text-gray-300">
              ({getCardsForColumn(OFFER_COLUMN).length})
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
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rejected section */}
      {anyRejected && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Rejected
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {roundColumns
              .filter((col) => getRejectedCardsForColumn(col).length > 0)
              .map((col) => (
                <div key={col.roundNumber} className="flex-shrink-0 w-64">
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3">
                    {col.label}
                  </h3>
                  <div className="space-y-2">
                    {getRejectedCardsForColumn(col).map((job) => (
                      <div
                        key={job.id}
                        className="bg-gray-100 border border-gray-200 rounded-lg p-3 max-h-16 overflow-hidden"
                      >
                        <p className="text-sm font-semibold text-gray-600 truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {job.company}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
