"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/chat":          "Chat",
  "/board":         "Board",
  "/dashboard":     "Dashboard",
  "/tasks":         "Tasks",
  "/notifications": "Notifications",
  "/settings":      "Settings",
};

function getTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Prefix match for nested routes
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="h-[52px] flex items-center justify-between px-6 border-b border-[var(--border)] shrink-0">
      {/* Mobile: ARIA logotype (sidebar hidden). Desktop: page title. */}
      <div>
        <span className="md:hidden font-display text-[17px] text-[var(--text-primary)] leading-none tracking-tight">
          ◆ ARIA
        </span>
        <span className="hidden md:block text-sm font-medium text-[var(--text-secondary)] tracking-[-0.01em]">
          {title}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Sync status — placeholder until jobs are wired */}
        <span className="font-mono text-[11px] text-[var(--text-placeholder)] tracking-wide hidden sm:block">
          No integrations
        </span>

        <div className="h-4 w-px bg-[var(--border)]" />

        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>

        {/* User avatar */}
        <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] leading-none">
            M
          </span>
        </div>
      </div>
    </header>
  );
}
