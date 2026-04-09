"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  LayoutDashboard,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/lib/auth/client";

const mainNav: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/chat",          icon: MessageSquare,    label: "Chat" },
  { href: "/dashboard",     icon: LayoutDashboard,  label: "Dashboard" },
  { href: "/tasks",         icon: CheckSquare,      label: "Tasks" },
  { href: "/notifications", icon: Bell,             label: "Notifications" },
];

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm transition-colors duration-150 select-none",
        isActive
          ? "text-[var(--accent)] font-medium"
          : "text-[var(--text-muted)] font-normal hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
      )}
    >
      {/* Animated active pill — glides between nav items */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-lg bg-[var(--accent-subtle)]"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <Icon size={16} strokeWidth={isActive ? 2 : 1.75} className="relative z-10 shrink-0" />
      <span className="relative z-10 tracking-[-0.01em]">{label}</span>
    </Link>
  );
}

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-[220px] shrink-0 h-screen flex flex-col bg-[var(--bg-secondary)] overflow-hidden">

      {/* Logotype */}
      <div className="px-5 pt-5 pb-4">
        <span className="font-display text-[17px] text-[var(--text-primary)] leading-none tracking-tight">
          ◆ ARIA
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 pt-1 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavItem key={item.href} {...item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Bottom section: settings + user */}
      <div className="px-3 pb-4">
        {/* Thin separator */}
        <div className="h-px bg-[var(--border)] mx-1 mb-3" />

        <NavItem
          href="/settings"
          icon={Settings}
          label="Settings"
          isActive={isActive("/settings")}
        />

        {/* User row + sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-left transition-colors duration-150 hover:bg-[var(--bg-surface)] group"
        >
          <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] leading-none">
              M
            </span>
          </div>
          <span className="text-[13px] text-[var(--text-muted)] truncate leading-none flex-1">
            Mitchell
          </span>
          <LogOut
            size={13}
            strokeWidth={1.75}
            className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
          />
        </button>
      </div>
    </aside>
  );
}
