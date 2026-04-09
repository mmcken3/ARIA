"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Mail, Calendar, Brain, Palette, Plug } from "lucide-react";

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MemoryEntry = { id: string; content: string; createdAt: string };

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MemorySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {[80, 60, 72].map((w, i) => (
        <div
          key={i}
          style={{
            padding: "13px 0",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              height: "13px",
              width: `${w}%`,
              borderRadius: "4px",
              background: "var(--bg-surface)",
              animation: "shimmer 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: "11px",
              width: "40px",
              borderRadius: "4px",
              background: "var(--bg-surface)",
              flexShrink: 0,
              animation: "shimmer 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  index,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        paddingBottom: "36px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "36px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "24px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: "var(--accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          <Icon size={15} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              marginBottom: "3px",
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.4 }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

// ─── Memory section ───────────────────────────────────────────────────────────

function MemorySection() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((d) => setEntries(d.memory ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setEntries((prev) => prev.filter((e) => e.id !== id)); // optimistic
    await fetch(`/api/memory/${id}`, { method: "DELETE" }).catch(() => {
      // on error, refetch to restore
      fetch("/api/memory")
        .then((r) => r.json())
        .then((d) => setEntries(d.memory ?? []));
    });
    setDeletingId(null);
  }

  if (loading) return <MemorySkeleton />;

  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: "28px 20px",
          textAlign: "center",
          border: "1px dashed var(--border)",
          borderRadius: "8px",
        }}
      >
        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Nothing remembered yet.
          <br />
          ARIA will learn as you chat.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <AnimatePresence initial={false}>
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              padding: "11px 0",
              borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none",
              opacity: deletingId === entry.id ? 0.4 : 1,
              transition: "opacity 150ms",
            }}
          >
            {/* Bullet */}
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--accent)",
                flexShrink: 0,
                marginTop: "5px",
                opacity: 0.6,
              }}
            />

            {/* Content */}
            <span
              style={{
                flex: 1,
                fontSize: "13.5px",
                color: "var(--text-primary)",
                lineHeight: 1.5,
              }}
            >
              {entry.content}
            </span>

            {/* Timestamp */}
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
              }}
            >
              {relativeTime(entry.createdAt)}
            </span>

            {/* Delete */}
            <button
              onClick={() => handleDelete(entry.id)}
              disabled={deletingId === entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                border: "none",
                background: hoveredId === entry.id ? "var(--bg-surface)" : "transparent",
                color: hoveredId === entry.id ? "var(--danger)" : "transparent",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 120ms, color 120ms",
              }}
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <p
        style={{
          fontSize: "11.5px",
          color: "var(--text-muted)",
          marginTop: "14px",
          opacity: 0.7,
        }}
      >
        {entries.length} {entries.length === 1 ? "entry" : "entries"} · ARIA manages this automatically
      </p>
    </div>
  );
}

// ─── Integrations section ─────────────────────────────────────────────────────

const INTEGRATIONS = [
  { id: "gmail", label: "Gmail", icon: Mail, description: "Read and send email with full context" },
  { id: "gcal", label: "Google Calendar", icon: Calendar, description: "Events, reminders, and scheduling context" },
];

function IntegrationsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {INTEGRATIONS.map(({ id, label, icon: Icon, description }) => (
        <div
          key={id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "13px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={14} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
              {label}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{description}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                padding: "3px 8px",
                borderRadius: "100px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              Not connected
            </span>
            <button
              disabled
              title="Coming soon"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "transparent",
                cursor: "not-allowed",
                opacity: 0.5,
              }}
            >
              Connect
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("aria-theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("aria-theme", next ? "dark" : "light");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 16px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}
    >
      <div>
        <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
          Dark mode
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
          Deep blue-slate theme
        </p>
      </div>

      {/* Toggle switch */}
      <button
        onClick={toggle}
        role="switch"
        aria-checked={dark}
        style={{
          width: "40px",
          height: "22px",
          borderRadius: "100px",
          border: "none",
          background: dark ? "var(--accent)" : "var(--bg-surface)",
          cursor: "pointer",
          position: "relative",
          transition: "background 200ms",
          flexShrink: 0,
          outline: "none",
          boxShadow: `0 0 0 1px var(--border)`,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: dark ? "21px" : "3px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "white",
            transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "40px 32px 80px",
      }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "40px" }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.1,
            marginBottom: "6px",
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
          Preferences, integrations, and what ARIA knows about you.
        </p>
      </motion.div>

      <Section icon={Brain} title="Memory" subtitle="What ARIA has learned about you" index={0}>
        <MemorySection />
      </Section>

      <Section icon={Plug} title="Integrations" subtitle="Connect your tools for full context" index={1}>
        <IntegrationsSection />
      </Section>

      <Section icon={Palette} title="Appearance" subtitle="Interface theme" index={2}>
        <AppearanceSection />
      </Section>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
