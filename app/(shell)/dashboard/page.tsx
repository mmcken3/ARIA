"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Task } from "@/lib/api/tasks/schema";

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  attendeeCount: number;
  status: string;
}

interface EmailMessage {
  id: string;
  fromName: string | null;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  isRead: boolean;
  relevanceScore: number;
  receivedAt: string;
}

interface DashboardData {
  calendar: { connected: boolean; events: CalendarEvent[] };
  email:    { connected: boolean; messages: EmailMessage[] };
}

// ─── Time utilities ────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtEventDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - todayMidnight.getTime()) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface EventCountdown {
  label: string;
  color: string;
  scale: "xl" | "lg" | "md"; // drives font size
}

function getEventCountdown(startIso: string, endIso: string): EventCountdown {
  const now   = Date.now();
  const start = new Date(startIso).getTime();
  const end   = new Date(endIso).getTime();

  if (now >= start && now <= end) {
    return { label: "Now", color: "var(--accent)", scale: "xl" };
  }

  const diffMs  = start - now;
  const diffMin = Math.ceil(diffMs / 60000);

  if (diffMin <= 15)  return { label: `${diffMin}m`,                             color: "var(--danger)",  scale: "xl" };
  if (diffMin <= 60)  return { label: `${diffMin}m`,                             color: "var(--warning)", scale: "xl" };
  if (diffMin <= 240) {
    const h = Math.floor(diffMin / 60), m = diffMin % 60;
    return { label: m > 0 ? `${h}h ${m}m` : `${h}h`,                            color: "var(--text-muted)", scale: "lg" };
  }

  const dateLabel = fmtEventDateLabel(startIso);
  return {
    label: dateLabel === "Today" ? fmtTime(startIso) : dateLabel,
    color: "var(--text-muted)",
    scale: "md",
  };
}

function fmtEmailAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1)  return "1d";
  if (d < 7)    return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDueLabel(iso: string | null): { label: string; urgent: boolean } | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d late`, urgent: true };
  if (diff === 0) return { label: "today",    urgent: true  };
  if (diff === 1) return { label: "tomorrow", urgent: false };
  return { label: `${diff}d`, urgent: false };
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--danger)",
  high:   "var(--warning)",
  medium: "var(--text-muted)",
  low:    "var(--border-strong)",
};

// ─── Zone label — barely-there identifier ────────────────────────────────────

function ZoneLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily:    "var(--font-mono)",
      fontSize:      "9px",
      fontWeight:    700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color:         "var(--text-muted)",
      opacity:       0.45,
      marginBottom:  "12px",
    }}>
      {children}
    </div>
  );
}

// ─── Next event hero ──────────────────────────────────────────────────────────
// The countdown is the largest element on the page.
// Scale encodes urgency: xl (< 1h or now) > lg (< 4h) > md (today/future).

function NextEventHero({ event }: { event: CalendarEvent }) {
  const [cd, setCd] = useState<EventCountdown>(() =>
    getEventCountdown(event.startAt, event.endAt)
  );

  useEffect(() => {
    const t = setInterval(() => setCd(getEventCountdown(event.startAt, event.endAt)), 30000);
    return () => clearInterval(t);
  }, [event.startAt, event.endAt]);

  const countdownSize =
    cd.scale === "xl" ? "clamp(28px, 5vw, 38px)" :
    cd.scale === "lg" ? "clamp(22px, 4vw, 30px)" :
                        "clamp(18px, 3vw, 24px)";

  return (
    <div style={{ paddingBottom: "16px" }}>
      {/* Countdown — hero element */}
      <div style={{
        fontFamily:    "var(--font-mono)",
        fontSize:      countdownSize,
        fontWeight:    500,
        color:         cd.color,
        letterSpacing: "-0.02em",
        lineHeight:    1,
        marginBottom:  "8px",
        transition:    "color 0.5s ease, font-size 0.3s ease",
      }}>
        {cd.label}
      </div>

      {/* Event title — display serif, below the number */}
      <div style={{
        fontFamily:    "var(--font-display)",
        fontSize:      "clamp(16px, 2.5vw, 20px)",
        fontWeight:    400,
        color:         "var(--text-primary)",
        lineHeight:    1.25,
        marginBottom:  "7px",
        letterSpacing: "-0.005em",
      }}>
        {event.title}
      </div>

      {/* Meta — time + people + location */}
      <div style={{
        display:    "flex",
        flexWrap:   "wrap",
        columnGap:  "4px",
        rowGap:     "2px",
        fontFamily: "var(--font-mono)",
        fontSize:   "11.5px",
        color:      "var(--text-muted)",
      }}>
        {!event.isAllDay && (
          <span>{fmtTime(event.startAt)} – {fmtTime(event.endAt)}</span>
        )}
        {event.attendeeCount > 0 && (
          <>
            <span style={{ opacity: 0.35, padding: "0 3px" }}>·</span>
            <span>{event.attendeeCount} {event.attendeeCount === 1 ? "person" : "people"}</span>
          </>
        )}
        {event.location && (
          <>
            <span style={{ opacity: 0.35, padding: "0 3px" }}>·</span>
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px",
            }}>
              {event.location}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Compact strip for remaining events — dimmer, smaller, just the facts
function EventStrip({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
      {events.map((e, i) => {
        const dateLabel = fmtEventDateLabel(e.startAt);
        const timeStr   = dateLabel === "Today" ? fmtTime(e.startAt) : dateLabel;
        return (
          <div key={e.id} style={{
            display:       "flex",
            alignItems:    "baseline",
            gap:           "14px",
            padding:       "5px 0",
            borderBottom:  i < events.length - 1 ? "1px solid var(--border)" : "none",
            opacity:       0.6,
          }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize:   "10.5px",
              color:      "var(--text-muted)",
              flexShrink: 0,
              minWidth:   "64px",
            }}>
              {timeStr}
            </span>
            <span style={{
              fontSize:     "12.5px",
              color:        "var(--text-secondary)",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}>
              {e.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Task row — left-border system ────────────────────────────────────────────
// "attention" (amber 2px) → "active" (teal 2px) → "queue" (transparent, dimmed)

type TaskVariant = "attention" | "active" | "queue";

function TaskRow({ task, variant }: { task: Task; variant: TaskVariant }) {
  const [hovered, setHovered] = useState(false);
  const due = getDueLabel(task.dueAt);

  const leftColor =
    variant === "attention" ? "var(--warning)" :
    variant === "active"    ? "var(--accent)"  :
    "transparent";

  const bg =
    hovered && variant === "attention" ? "color-mix(in srgb, var(--warning) 7%, var(--bg-primary))" :
    hovered                             ? "var(--bg-secondary)" :
    variant === "attention"             ? "color-mix(in srgb, var(--warning) 3%, var(--bg-primary))" :
    "transparent";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "flex",
        alignItems:   "baseline",
        gap:          "12px",
        padding:      "9px 12px 9px 12px",
        margin:       "0 -12px",
        borderLeft:   `2px solid ${leftColor}`,
        borderBottom: "1px solid var(--border)",
        background:   bg,
        transition:   "background 100ms",
        opacity:      variant === "queue" ? 0.72 : 1,
      }}
    >
      <span style={{
        flex:         1,
        fontSize:     "13.5px",
        color:        "var(--text-primary)",
        lineHeight:   1.35,
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap",
        fontWeight:   variant === "attention" ? 500 : 400,
      }}>
        {task.title}
      </span>

      {due && (
        <span style={{
          fontSize:   "11px",
          fontFamily: "var(--font-mono)",
          color:      due.urgent ? "var(--warning)" : "var(--text-muted)",
          flexShrink: 0,
        }}>
          {due.label}
        </span>
      )}

      <span style={{
        fontSize:      "9.5px",
        fontFamily:    "var(--font-mono)",
        fontWeight:    700,
        letterSpacing: "0.06em",
        color:         PRIORITY_COLOR[task.priority] ?? "var(--text-muted)",
        flexShrink:    0,
        minWidth:      "26px",
        textAlign:     "right",
      }}>
        {task.priority === "urgent" ? "URG" :
         task.priority === "high"   ? "HI"  :
         task.priority === "medium" ? "MED" : "LO"}
      </span>
    </div>
  );
}

// ─── Email row — two-line, Superhuman-style ───────────────────────────────────

function EmailRow({ message, index }: { message: EmailMessage; index: number }) {
  const [hovered, setHovered] = useState(false);
  const sender = message.fromName ?? message.fromAddress.split("@")[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: -3 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: 0.3 + index * 0.05, ease: EASE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "grid",
        gridTemplate: '"dot sender age" auto "dot subject subject" auto / 12px 1fr auto',
        columnGap:    "6px",
        rowGap:       "2px",
        padding:      "9px 12px 9px 0",
        margin:       "0 -12px 0 0",
        borderBottom: "1px solid var(--border)",
        background:   hovered ? "var(--bg-secondary)" : "transparent",
        transition:   "background 100ms",
      }}
    >
      {/* Unread dot */}
      <div style={{
        gridArea:   "dot",
        display:    "flex",
        alignItems: "center",
        paddingTop: "2px",
      }}>
        <span style={{
          display:      "block",
          width:        "5px",
          height:       "5px",
          borderRadius: "50%",
          background:   message.isRead ? "transparent" : "var(--accent)",
          flexShrink:   0,
        }} />
      </div>

      {/* Sender */}
      <span style={{
        gridArea:     "sender",
        fontSize:     "13px",
        fontWeight:   message.isRead ? 400 : 600,
        color:        "var(--text-primary)",
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap",
        lineHeight:   1.35,
      }}>
        {sender}
      </span>

      {/* Age */}
      <span style={{
        gridArea:   "age",
        fontSize:   "11px",
        fontFamily: "var(--font-mono)",
        color:      "var(--text-muted)",
        opacity:    0.65,
        whiteSpace: "nowrap",
        lineHeight: 1.35,
        alignSelf:  "center",
      }}>
        {fmtEmailAge(message.receivedAt)}
      </span>

      {/* Subject */}
      <span style={{
        gridArea:     "subject",
        fontSize:     "12px",
        color:        "var(--text-muted)",
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap",
        lineHeight:   1.3,
        opacity:      message.isRead ? 0.65 : 0.9,
      }}>
        {message.subject}
      </span>
    </motion.div>
  );
}

// ─── Backlog summary — single line, doesn't compete ───────────────────────────

function BacklogSummary({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;
  const counts = {
    urgent: tasks.filter(t => t.priority === "urgent").length,
    high:   tasks.filter(t => t.priority === "high").length,
    medium: tasks.filter(t => t.priority === "medium").length,
    low:    tasks.filter(t => t.priority === "low").length,
  };
  const entries = (["urgent", "high", "medium", "low"] as const).filter(p => counts[p] > 0);

  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      flexWrap:   "wrap",
      gap:        "4px",
      fontSize:   "12px",
      fontFamily: "var(--font-mono)",
      color:      "var(--text-muted)",
    }}>
      <span style={{ opacity: 0.55 }}>Backlog</span>
      {entries.map(p => (
        <span key={p} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ opacity: 0.28 }}>·</span>
          <span style={{ color: PRIORITY_COLOR[p] }}>
            {counts[p]} {p}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: "40px 40px 80px" }}>
      {/* Date */}
      <div style={{ height: "10px", width: "100px", borderRadius: "2px", background: "var(--bg-secondary)", marginBottom: "12px", animation: "shimmer 1.4s ease-in-out infinite" }} />
      {/* Headline */}
      <div style={{ height: "28px", width: "260px", borderRadius: "3px", background: "var(--bg-secondary)", marginBottom: "8px", animation: "shimmer 1.4s ease-in-out infinite", animationDelay: "0.07s" }} />
      {/* Subline */}
      <div style={{ height: "12px", width: "160px", borderRadius: "2px", background: "var(--bg-secondary)", marginBottom: "44px", animation: "shimmer 1.4s ease-in-out infinite", animationDelay: "0.12s" }} />
      {/* Calendar hero */}
      <div style={{ height: "36px", width: "72px", borderRadius: "2px", background: "var(--bg-secondary)", marginBottom: "8px", animation: "shimmer 1.4s ease-in-out infinite", animationDelay: "0.17s" }} />
      <div style={{ height: "20px", width: "220px", borderRadius: "2px", background: "var(--bg-secondary)", marginBottom: "36px", animation: "shimmer 1.4s ease-in-out infinite", animationDelay: "0.22s" }} />
      {/* Task rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: "40px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div style={{ height: "11px", width: `${52 + ((i * 23) % 32)}%`, borderRadius: "2px", background: "var(--bg-secondary)", animation: "shimmer 1.4s ease-in-out infinite", animationDelay: `${0.27 + i * 0.06}s` }} />
        </div>
      ))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.35}50%{opacity:.72}}`}</style>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [today, setToday]         = useState("");

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    }));
    Promise.all([
      fetch("/api/tasks?limit=100").then(r => r.json()),
      fetch("/api/dashboard").then(r => r.json()),
    ]).then(([t, d]) => {
      setTasks(t.tasks ?? []);
      setDashboard(d);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  // ── Data shaping ──────────────────────────────────────────────────────────

  const now      = new Date();
  const inFlight = tasks.filter(t => t.status === "in_progress");
  const upNext   = tasks.filter(t => t.status === "up_next");
  const backlog  = tasks.filter(t => t.status === "backlog");
  const overdue  = tasks.filter(t => t.status !== "done" && t.dueAt && new Date(t.dueAt) < now);
  const urgentNotInFlight = tasks.filter(
    t => t.status !== "done" && t.status !== "in_progress" && t.priority === "urgent"
  );

  // Attention = overdue + urgent (deduped), capped at 4
  const attentionSet = new Set<string>();
  const attention: Task[] = [];
  for (const t of [...overdue, ...urgentNotInFlight]) {
    if (!attentionSet.has(t.id) && attention.length < 4) {
      attentionSet.add(t.id);
      attention.push(t);
    }
  }

  // In-flight tasks not already in attention
  const activeRows = inFlight.filter(t => !attentionSet.has(t.id));

  // Up next: fill remaining slots up to 8 total
  const totalShown    = attention.length + activeRows.length;
  const upNextSlice   = upNext.slice(0, Math.max(0, 8 - totalShown));
  const upNextOverflow = upNext.length - upNextSlice.length;

  const calConnected   = dashboard?.calendar.connected ?? false;
  const gmailConnected = dashboard?.email.connected ?? false;
  const calEvents      = dashboard?.calendar.events ?? [];
  const emails         = dashboard?.email.messages ?? [];
  const [nextEvent, ...restEvents] = calEvents;

  const hasCalendarZone = calConnected && !!nextEvent;
  const hasEmailZone    = gmailConnected && emails.length > 0;
  const hasTaskZone     = attention.length > 0 || activeRows.length > 0 || upNextSlice.length > 0;
  const nothingConnected = !calConnected && !gmailConnected;

  // Situation headline
  let situation: string;
  if (tasks.length === 0)     situation = "Nothing yet.";
  else if (overdue.length > 0 || inFlight.length > 0) {
    const parts = [];
    if (inFlight.length > 0) parts.push(`${inFlight.length} in flight`);
    if (overdue.length > 0)  parts.push(`${overdue.length} overdue`);
    situation = parts.join(" · ") + ".";
  } else {
    situation = "All clear.";
  }

  return (
    <div style={{ maxWidth: "680px", padding: "40px 40px 80px" }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        style={{ marginBottom: "44px" }}
      >
        <p style={{
          fontSize:      "11px",
          fontFamily:    "var(--font-mono)",
          color:         "var(--text-muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          opacity:       0.55,
          marginBottom:  "10px",
        }}>
          {today}
        </p>

        <h1 style={{
          fontFamily:    "var(--font-display)",
          fontSize:      "clamp(22px, 3vw, 28px)",
          fontWeight:    400,
          color:         "var(--text-primary)",
          lineHeight:    1.2,
          letterSpacing: "-0.01em",
          marginBottom:  tasks.length > 0 ? "9px" : 0,
        }}>
          {situation}
        </h1>

        {tasks.length > 0 && (
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.4, opacity: 0.75 }}>
            {[
              inFlight.length > 0 && `${inFlight.length} in progress`,
              upNext.length   > 0 && `${upNext.length} up next`,
              backlog.length  > 0 && `${backlog.length} in backlog`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
      </motion.div>

      {/* ── Calendar zone ─────────────────────────────────────────────────────
          The next event sits here as the largest element on the page.
          Countdown size encodes urgency — no label needed.
      ─────────────────────────────────────────────────────────────────────── */}
      {hasCalendarZone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.26, delay: 0.06, ease: EASE }}
          style={{
            marginBottom: "40px",
            borderTop:    "1px solid var(--border)",
            paddingTop:   "20px",
          }}
        >
          <ZoneLabel>Calendar</ZoneLabel>
          <NextEventHero event={nextEvent} />
          <EventStrip events={restEvents.slice(0, 3)} />
        </motion.div>
      )}

      {/* ── Task zone ─────────────────────────────────────────────────────────
          Left border color = category:
            amber  → needs attention (overdue / urgent)
            teal   → in progress
            none   → up next (dimmed)
      ─────────────────────────────────────────────────────────────────────── */}
      {hasTaskZone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.1, ease: EASE }}
          style={{ marginBottom: "36px" }}
        >
          {/* Only label the task zone when other zones are present */}
          {(hasCalendarZone || hasEmailZone) && <ZoneLabel>Tasks</ZoneLabel>}

          {attention.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.17, delay: 0.14 + i * 0.04, ease: EASE }}
            >
              <TaskRow task={t} variant="attention" />
            </motion.div>
          ))}

          {activeRows.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.17, delay: 0.17 + i * 0.04, ease: EASE }}
            >
              <TaskRow task={t} variant="active" />
            </motion.div>
          ))}

          {upNextSlice.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.17, delay: 0.21 + i * 0.04, ease: EASE }}
            >
              <TaskRow task={t} variant="queue" />
            </motion.div>
          ))}

          {upNextOverflow > 0 && (
            <Link href="/tasks" style={{
              display:    "block",
              paddingTop: "10px",
              fontSize:   "12px",
              color:      "var(--text-muted)",
              textDecoration: "none",
              opacity:    0.55,
              transition: "opacity 150ms",
            }}>
              +{upNextOverflow} more →
            </Link>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!hasTaskZone && tasks.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.12, ease: EASE }}
          style={{ fontSize: "13px", color: "var(--text-muted)", opacity: 0.55, marginBottom: "36px" }}
        >
          No active tasks.{" "}
          <Link href="/tasks" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            Browse backlog →
          </Link>
        </motion.p>
      )}

      {/* ── Email zone ────────────────────────────────────────────────────────
          Two-line rows: sender prominent, subject secondary.
          Unread dot in teal. Age in mono.
      ─────────────────────────────────────────────────────────────────────── */}
      {hasEmailZone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.26, ease: EASE }}
          style={{
            marginBottom: "40px",
            borderTop:    "1px solid var(--border)",
            paddingTop:   "20px",
          }}
        >
          <ZoneLabel>Inbox</ZoneLabel>
          {emails.map((m, i) => (
            <EmailRow key={m.id} message={m} index={i} />
          ))}
        </motion.div>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────────
          Backlog summary + connect nudge. Never louder than secondary info.
      ─────────────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.38, ease: EASE }}
        style={{
          paddingTop:     "20px",
          borderTop:      "1px solid var(--border)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            "20px",
          flexWrap:       "wrap",
        }}
      >
        <BacklogSummary tasks={backlog} />

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
          {nothingConnected ? (
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", opacity: 0.5, lineHeight: 1.5 }}>
              Calendar · Gmail not connected.{" "}
              <Link href="/settings" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
                Settings →
              </Link>
            </p>
          ) : (!calConnected || !gmailConnected) ? (
            <Link href="/settings" style={{ fontSize: "11.5px", color: "var(--text-muted)", textDecoration: "none", opacity: 0.45, transition: "opacity 150ms" }}>
              {[!calConnected && "Calendar", !gmailConnected && "Gmail"].filter(Boolean).join(" · ")} →
            </Link>
          ) : (
            <Link href="/tasks" style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "none", opacity: 0.45, transition: "opacity 150ms" }}>
              All tasks →
            </Link>
          )}
        </div>
      </motion.div>

    </div>
  );
}
