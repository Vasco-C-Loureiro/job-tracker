import { Skeleton } from "@/components/ui/Skeleton";

function ArchivedSkeletonRow() {
  return (
    <>
      <tr>
        <td className="py-3 pr-4">
          <Skeleton className="h-6 w-20 rounded-full" />
        </td>
        <td className="py-3 pr-4">
          <Skeleton className="h-4 w-32" />
        </td>
        <td className="py-3 pr-4">
          <Skeleton className="h-4 w-64" />
        </td>
        <td className="py-3 pr-4">
          <Skeleton className="h-4 w-24" />
        </td>
        <td className="py-3">
          <div className="flex justify-end">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </td>
      </tr>
      <tr aria-hidden="true">
        <td colSpan={5} className="h-1 p-0 bg-transparent border-0" />
      </tr>
    </>
  );
}

export default function ArchivedLoading() {
  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Archived</h1>
      </div>

      <div className="overflow-x-auto w-full max-w-4xl">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="py-2 pb-3 pr-4 w-28">
                <Skeleton className="h-3 w-12" />
              </th>
              <th className="py-2 pb-3 pr-4 w-44">
                <Skeleton className="h-3 w-16" />
              </th>
              <th className="py-2 pb-3 pr-4">
                <Skeleton className="h-3 w-10" />
              </th>
              <th className="py-2 pb-3 pr-4 w-36">
                <Skeleton className="h-3 w-16" />
              </th>
              <th className="py-2 pb-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <ArchivedSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
