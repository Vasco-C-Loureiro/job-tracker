import { Skeleton } from "@/components/ui/Skeleton";

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-1" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="shrink-0">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function InterviewsLoading() {
  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
      </div>

      <div className="animate-pulse">
        <Skeleton className="h-4 w-48 mb-6" />

        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4">
            {Array.from({ length: 3 }).map((_, colIdx) => (
              <div key={colIdx} className="flex-shrink-0 w-[388px]">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
