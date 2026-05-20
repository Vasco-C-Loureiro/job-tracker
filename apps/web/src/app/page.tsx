import type { JobApplication, ApplicationStatus } from "@job-tracker/shared";

const mockJob: JobApplication = {
  id: "demo-1",
  userId: "demo-user",
  company: "Acme Corp",
  title: "Junior Full Stack Engineer",
  sourceUrl: "https://example.com/job/1",
  source: "example",
  status: "saved",
  savedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const statuses: ApplicationStatus[] = [
  "saved",
  "applied",
  "oa",
  "interview",
  "rejected",
  "offer",
  "ghosted",
];

export default function Home() {
  return (
    <main className="min-h-screen p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Job Tracker — v0.1 skeleton</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Sample job (typed)</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(mockJob, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Application statuses</h2>
        <ul className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <li
              key={s}
              className="px-3 py-1 bg-blue-100 text-blue-900 rounded text-sm"
            >
              {s}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
