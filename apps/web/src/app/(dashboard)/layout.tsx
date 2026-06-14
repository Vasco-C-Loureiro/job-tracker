import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto min-w-0 bg-white">
        <header className="sticky top-0 z-30 h-14 border-b border-gray-100 bg-white flex items-center justify-end px-4 shrink-0">
          <NotificationBell />
        </header>
        {children}
      </div>
    </div>
  );
}
