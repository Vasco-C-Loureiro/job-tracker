import { Skeleton } from "@/components/ui/Skeleton";

function SkeletonRow() {
  return (
    <>
      <tr className="[&>td]:bg-gray-100">
        <td className="py-4 pl-3 pr-3">
          <Skeleton className="w-4 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-20 h-5 rounded-full" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-32 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-44 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-24 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-12 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-16 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-20 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-14 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-12 h-4" />
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-24 h-4" />
        </td>
        <td className="py-4 pr-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
          </div>
        </td>
        <td className="py-4 pr-3">
          <Skeleton className="w-4 h-4" />
        </td>
      </tr>
      <tr aria-hidden="true">
        <td colSpan={13} className="h-1 p-0 bg-transparent border-0" />
      </tr>
    </>
  );
}

export default function DashboardLoading() {
  return (
    <main className="p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 flex flex-col gap-2">
        {/* Controls row */}
        <div className="h-24 flex flex-col gap-2">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-md" />
            <div className="flex-1" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                <th className="py-2 pb-3 pl-3 pr-3 w-10" />
                <th className="py-2 pb-3 pr-4 w-24">
                  <Skeleton className="h-3 w-10" />
                </th>
                <th className="py-2 pb-3 pr-4 w-44">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="py-2 pb-3 pr-4 min-w-[208px]">
                  <Skeleton className="h-3 w-10" />
                </th>
                <th className="py-2 pb-3 pr-4 w-32">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="py-2 pb-3 pr-4 w-20">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="py-2 pb-3 pr-4 w-24">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="py-2 pb-3 pr-4 w-28">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="py-2 pb-3 pr-4 w-24">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="py-2 pb-3 pr-4 w-20">
                  <Skeleton className="h-3 w-14" />
                </th>
                <th className="py-2 pb-3 pr-4 w-28">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="py-2 pb-3 pr-4 w-20">
                  <Skeleton className="h-3 w-8" />
                </th>
                <th className="py-2 pb-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
