import SidebarNav from "@/components/ui/sidebar-nav";
import Topbar from "@/components/ui/topbar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-[var(--bg-primary)] overflow-hidden h-[100dvh]">
      <SidebarNav />

      {/* Main column: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        {/* pb-16 on mobile reserves space above the fixed bottom nav */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
