"use client";

import { useState } from "react";
import type { JobApplicationListItem } from "@job-tracker/shared";
import { JobTable } from "@/components/JobTable";
import { AddJobModal } from "@/components/AddJobModal";

type Props = { initialJobs: JobApplicationListItem[] };

export function DashboardView({ initialJobs }: Props) {
  const [jobs, setJobs]         = useState<JobApplicationListItem[]>(initialJobs);
  const [modalOpen, setModalOpen] = useState(false);
  const [newJobId, setNewJobId]   = useState<string | undefined>(undefined);

  function handleJobAdded(job: JobApplicationListItem) {
    setJobs((prev) => [job, ...prev]);
    setNewJobId(job.id);
  }

  return (
    <>
      <JobTable
        jobs={jobs}
        newJobId={newJobId}
        onAddJob={() => setModalOpen(true)}
      />
      <AddJobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onJobAdded={handleJobAdded}
      />
    </>
  );
}
