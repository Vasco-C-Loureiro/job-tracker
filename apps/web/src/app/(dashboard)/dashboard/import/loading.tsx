import { Skeleton } from "@/components/ui/Skeleton";

export default function ImportLoading() {
  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold text-gray-900">Import from CSV</h1>
      <Skeleton className="h-4 w-80 mt-1 mb-8" />

      <div className="max-w-2xl mx-auto mb-12">
        <div className="border-2 border-dashed border-gray-200 rounded-xl h-64 bg-gray-100 animate-pulse" />
      </div>

      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-2.5 border-b border-gray-100 last:border-0">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
