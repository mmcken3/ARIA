import SidebarNav from "@/components/ui/sidebar-nav";
import Topbar from "@/components/ui/topbar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      <SidebarNav />

      {/* Main column: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
