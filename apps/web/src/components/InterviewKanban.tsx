"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { Modifier } from "@dnd-kit/core";
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
const COLUMN_WIDTH = 388;
const ESTIMATED_CARD_HEIGHT = 90;

const snapOverlayCenterToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  overlayNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  const event = activatorEvent as PointerEvent;

  const offsetX = event.clientX - draggingNodeRect.left;
  const offsetY = event.clientY - draggingNodeRect.top;

  const overlayW = overlayNodeRect?.width ?? 388;
  const overlayH = overlayNodeRect?.height ?? 90;

  return {
    ...transform,
    x: transform.x + offsetX - overlayW / 2,
    y: transform.y + offsetY - overlayH / 2,
  };
};

function DroppableColumn({
  id,
  children,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`transition-colors duration-150 rounded-lg ${
        isOver ? "bg-blue-950/40 ring-1 ring-blue-500" : ""
      }`}
    >
      {children}
    </div>
  );
}

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
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const dragWasExpanded = useRef(false);

  // Single scroll container for both kanban and rejected section (Fix 4)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

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

  // Scroll the selected card's column to the centre of the viewport on selection
  useEffect(() => {
    if (!selectedJobId || !scrollContainerRef.current) return;

    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    if (!selectedJob) return;

    const colKey =
      selectedJob.status === "offer"
        ? "offer"
        : `round-${selectedJob.current_interview_round}`;

    const colEl = columnRefs.current.get(colKey);
    if (!colEl || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const targetScrollLeft =
      colEl.offsetLeft - container.clientWidth / 2 + colEl.offsetWidth / 2;
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId]);

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
    if (draggingJobId) return "w-[388px]";
    const hasSelected = getCardsForColumn(col).some(
      (j) => j.id === selectedJobId,
    );
    return hasSelected ? "w-[775px]" : "w-[388px]";
  }

  // Minimum height for droppable zones — tallest column + 1 slot (Fix 3)
  const allKanbanColumns = [...roundColumns, OFFER_COLUMN];
  const maxCardsInAnyColumn = Math.max(
    1,
    ...allKanbanColumns.map((col) => getCardsForColumn(col).length),
  );
  const droppableMinHeight = (maxCardsInAnyColumn + 1) * ESTIMATED_CARD_HEIGHT;

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

    // Smooth-scroll the kanban one column to the left while the card pulses
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        left: container.scrollLeft + COLUMN_WIDTH,
        behavior: "smooth",
      });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    setAdvancingJobId(null);

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

  // Fire-and-forget PATCH for notes — used when drag starts on an expanded card
  function saveJobSilently(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    void getToken().then((token) => {
      if (!token) return;
      void fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: job.notes }),
      });
    });
  }

  function handleCardSelect(jobId: string | null) {
    if (selectedJobId && selectedJobId !== jobId) {
      saveJobSilently(selectedJobId);
    }
    setSelectedJobId(jobId);
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

  function handleDragStart(event: DragStartEvent) {
    const jobId = event.active.id as string;

    // Capture BEFORE selectedJobId is cleared — this info is lost after setSelectedJobId(null)
    dragWasExpanded.current = selectedJobId === jobId;

    if (selectedJobId) {
      saveJobSilently(selectedJobId);
      setSelectedJobId(null);
    }
    setDraggingJobId(jobId);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumnId(event.over ? (event.over.id as string) : null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    dragWasExpanded.current = false;
    const { active, over } = event;
    setDraggingJobId(null);
    setOverColumnId(null);

    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    const job = jobs.find(
      (j) => j.id === jobId && (j.status === "interview" || j.status === "offer"),
    );
    if (!job) return;

    if (overId === "offer") {
      if (job.status === "offer") return;
      handleStatusChange(jobId, "offer");
      const token = await getToken();
      if (!token) return;
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "offer" }),
      });
    } else if (overId.startsWith("round-")) {
      const targetRound = parseInt(overId.replace("round-", ""), 10);
      if (job.current_interview_round === targetRound && job.status === "interview") return;
      handleRoundChange(jobId, targetRound);
      const token = await getToken();
      if (!token) return;
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentInterviewRound: targetRound }),
      });
    }
  }

  const activeCount = jobs.filter(
    (j) => j.status === "interview" || j.status === "offer",
  ).length;

  const anyRejected = jobs.some((j) => j.status === "rejected");

  const draggingJob = draggingJobId
    ? jobs.find(
        (j) =>
          j.id === draggingJobId &&
          (j.status === "interview" || j.status === "offer"),
      )
    : null;
  const draggingJobRounds = draggingJob
    ? rounds.filter((r) => r.job_application_id === draggingJob.id)
    : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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

      {/* Single scroll container for both kanban and rejected section (Fix 4) */}
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div className="relative min-w-max">

          {/* Main kanban — all columns sit above the backdrop (z-[11]); selected column gets z-20 */}
          <div className="flex gap-4 pb-4 items-stretch">
            {/* Round columns */}
            {roundColumns.map((col) => {
              const columnId = `round-${col.roundNumber}`;
              const isOver = overColumnId === columnId;
              const isSelectedCol = getCardsForColumn(col).some(
                (j) => j.id === selectedJobId,
              );
              return (
                <div
                  key={col.roundNumber}
                  ref={(el) => {
                    if (el) columnRefs.current.set(columnId, el);
                    else columnRefs.current.delete(columnId);
                  }}
                  className={`flex-shrink-0 ${getColumnWidth(col)} transition-[width] duration-150 ease-in-out relative${isSelectedCol ? " z-20" : " z-[11]"}`}
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
                  <DroppableColumn id={columnId} isOver={isOver}>
                    <div className="space-y-2" style={{ minHeight: droppableMinHeight }}>
                      {getCardsForColumn(col).map((job) => (
                        <InterviewCard
                          key={job.id}
                          job={job}
                          rounds={rounds.filter(
                            (r) => r.job_application_id === job.id,
                          )}
                          isSelected={selectedJobId === job.id}
                          onSelect={handleCardSelect}
                          onRoundChange={handleRoundChange}
                          onStatusChange={handleStatusChange}
                          maxRoundColumn={maxRoundColumn}
                          getToken={getToken}
                          onRoundsChange={handleRoundsChange}
                          isAdvancing={advancingJobId === job.id}
                          isRejecting={rejectingJobId === job.id}
                          onNextRound={handleNextRoundAnimated}
                          onReject={handleRejectAnimated}
                          isDraggable={true}
                          isBeingDragged={draggingJobId === job.id}
                        />
                      ))}
                    </div>
                  </DroppableColumn>
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
                  className="w-12 h-12 rounded-full border-2 border-dashed border-gray-900 hover:border-blue-500 flex items-center justify-center text-gray-900 hover:text-blue-500 text-2xl transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-gray-900 text-center">Add round</span>
              </div>
            </div>

            {/* Offer column */}
            <div
              ref={(el) => {
                if (el) columnRefs.current.set("offer", el);
                else columnRefs.current.delete("offer");
              }}
              className={`flex-shrink-0 w-[388px] relative${getCardsForColumn(OFFER_COLUMN).some((j) => j.id === selectedJobId) ? " z-20" : " z-[11]"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                Offer
                <span className="bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
                  {getCardsForColumn(OFFER_COLUMN).length}
                </span>
              </h3>
              <DroppableColumn id="offer" isOver={overColumnId === "offer"}>
                <div className="space-y-2" style={{ minHeight: droppableMinHeight }}>
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
                      isDraggable={true}
                      isBeingDragged={draggingJobId === job.id}
                    />
                  ))}
                </div>
              </DroppableColumn>
            </div>
          </div>

          {/* Rejected section — inside same scroll wrapper so it syncs (Fix 4) */}
          {anyRejected && (
            <div className="mt-36">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">
                Rejected from interview{" "}
                <span className="text-lg font-normal text-gray-500">
                  ({jobs.filter((j) => j.status === "rejected").length})
                </span>
              </h2>
              <div className="flex gap-4 pb-4">
                {roundColumns.map((col) => (
                  <div key={col.roundNumber} className="flex-shrink-0 w-[388px] bg-white/5 rounded-lg p-2">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                      {col.label}
                      <span className="bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
                        {getRejectedCardsForColumn(col).length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {getRejectedCardsForColumn(col).map((job) => (
                        <div
                          key={job.id}
                          className="bg-gray-100 border border-gray-200 rounded-lg py-2 px-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-600 truncate">
                              {job.title}
                            </p>
                            <span className="text-xs text-gray-400 font-medium shrink-0">Rejected</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-gray-400 truncate">
                              {job.company}
                            </p>
                            <button
                              onClick={() => void handleUnreject(job.id)}
                              className="text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                              title="Undo rejection"
                            >
                              ↩
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <DragOverlay modifiers={[snapOverlayCenterToCursor]}>
        {draggingJob && (
          <div className="w-[388px]">
            <InterviewCard
              job={draggingJob}
              rounds={draggingJobRounds}
              isSelected={false}
              isDraggable={false}
              onSelect={() => {}}
              onRoundChange={() => {}}
              onStatusChange={() => {}}
              maxRoundColumn={maxRoundColumn}
              getToken={() => Promise.resolve(null)}
              onRoundsChange={() => {}}
              isAdvancing={false}
              isRejecting={false}
              onNextRound={() => {}}
              onReject={() => {}}
              className={`shadow-2xl rotate-1${dragWasExpanded.current ? " animate-drag-lift" : ""}`}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
