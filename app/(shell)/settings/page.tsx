"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Mail, Calendar, Brain, Palette, Plug, CheckCircle2, Loader2 } from "lucide-react";

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

type FeatureStatus = {
  feature: string;
  displayName: string;
  hasScope: boolean;
};

type ProviderConnection = {
  provider: string;
  displayName: string;
  connected: boolean;
  lastSyncedAt: string | null;
  features: FeatureStatus[];
};

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

function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  google: GoogleIcon,
};

const FEATURE_ICONS: Record<string, React.ElementType> = {
  gcal: Calendar,
  gmail: Mail,
};

function IntegrationsSection() {
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/integrations/status");
    const data = await res.json();
    console.log("[integrations] status response:", res.status, data);
    setConnections(data.connections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Detect ?connected=provider after returning from OAuth — no useSearchParams needed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      setJustConnected(connected);
      const t = setTimeout(() => setJustConnected(null), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  async function handleDisconnect(provider: string) {
    setDisconnecting(provider);
    await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    await fetchStatus();
    setDisconnecting(null);
  }

  if (loading) {
    return (
      <div
        style={{
          height: "96px",
          borderRadius: "8px",
          background: "var(--bg-surface)",
          animation: "shimmer 1.4s ease-in-out infinite",
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {connections.map(({ provider, displayName, connected, lastSyncedAt, features }) => {
        const isJustConnected = justConnected === provider;
        const isDisconnecting = disconnecting === provider;

        return (
          <div
            key={provider}
            style={{
              borderRadius: "8px",
              border: `1px solid ${connected ? "var(--accent)" : "var(--border)"}`,
              background: "var(--bg-secondary)",
              overflow: "hidden",
              transition: "border-color 300ms",
              opacity: isDisconnecting ? 0.6 : 1,
            }}
          >
            {/* Provider header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "13px 16px",
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
                {(() => { const PIcon = PROVIDER_ICONS[provider] ?? Plug; return <PIcon size={14} />; })()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {displayName}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {connected && lastSyncedAt
                    ? `Last synced ${relativeTime(lastSyncedAt)}`
                    : "Calendar and Gmail"}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {isJustConnected ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      color: "var(--success)",
                      padding: "3px 8px",
                      borderRadius: "100px",
                      border: "1px solid var(--success)",
                    }}
                  >
                    <CheckCircle2 size={11} strokeWidth={2} />
                    Connected
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      color: connected ? "var(--accent)" : "var(--text-muted)",
                      padding: "3px 8px",
                      borderRadius: "100px",
                      border: `1px solid ${connected ? "var(--accent)" : "var(--border)"}`,
                      background: "var(--bg-surface)",
                      transition: "color 300ms, border-color 300ms",
                    }}
                  >
                    {connected ? "Connected" : "Not connected"}
                  </span>
                )}

                {connected ? (
                  <button
                    onClick={() => handleDisconnect(provider)}
                    disabled={isDisconnecting}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--danger)",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--danger)",
                      background: "transparent",
                      cursor: isDisconnecting ? "not-allowed" : "pointer",
                      opacity: isDisconnecting ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "opacity 150ms",
                    }}
                  >
                    {isDisconnecting && <Loader2 size={11} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
                    Disconnect
                  </button>
                ) : (
                  <a
                    href={`/api/integrations/connect?provider=${provider}`}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--accent)",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--accent)",
                      background: "transparent",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>

            {/* Feature sub-rows */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "8px 16px",
                display: "flex",
                gap: "16px",
              }}
            >
              {features.map(({ feature, displayName: featureLabel, hasScope }) => {
                const FIcon = FEATURE_ICONS[feature] ?? Plug;
                return (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FIcon
                      size={12}
                      strokeWidth={1.75}
                      style={{ color: hasScope ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        color: hasScope ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      {featureLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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
