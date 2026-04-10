import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GitFork } from "lucide-react";
import { auth } from "@/lib/auth/auth";

export const metadata: Metadata = {
  title: "ARIA — Personal AI Operating System",
  description:
    "ARIA reads your email, watches your calendar, manages your tasks. When something needs doing, it acts. Open source, self-hosted, privacy-first.",
};

export default async function RootPage() {
  // Authenticated users go straight to the app
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) redirect("/chat");
  } catch {
    // DB unavailable or auth misconfigured — show landing page
  }

  return (
    <div
      style={{ fontFamily: "var(--font-body)" }}
      className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 border-b border-[var(--border)] bg-[var(--bg-primary)]"
        style={{ padding: "0 clamp(24px, 6vw, 80px)" }}
      >
        <span
          className="text-[var(--text-primary)] leading-none"
          style={{ fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "-0.01em" }}
        >
          ◆ ARIA
        </span>
        <a
          href="https://github.com/mmcken3/ARIA"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          GitHub
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="min-h-[100dvh] flex items-center"
        style={{ padding: "clamp(96px,12vh,140px) clamp(24px,6vw,80px) clamp(64px,8vh,100px)" }}
      >
        <div className="w-full max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-center gap-16 md:gap-12">

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[var(--accent)] mb-7 tracking-[0.18em] uppercase"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
            >
              Open source · Self-hosted · Privacy-first
            </p>
            <h1
              className="text-[var(--text-primary)] leading-[1.03] mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(46px, 7.5vw, 92px)",
                letterSpacing: "-0.025em",
              }}
            >
              Your work,<br />handled.
            </h1>
            <p
              className="text-[var(--text-secondary)] leading-relaxed mb-10 max-w-[480px]"
              style={{ fontSize: "clamp(16px, 1.8vw, 19px)" }}
            >
              ARIA reads your email, watches your calendar, manages your tasks.
              When something needs doing, it acts. Not a chatbot — an operating
              system for your work.
            </p>
            <a
              href="https://github.com/mmcken3/ARIA/blob/main/docs/setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-[11px] rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--accent)" }}
            >
              <GitFork size={15} strokeWidth={2} />
              Self-host ARIA
            </a>
            <p
              className="mt-5 text-[var(--text-muted)]"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.04em" }}
            >
              Open source · MIT license · Deploy in minutes
            </p>
          </div>

          {/* Chat preview — desktop */}
          <div className="hidden md:block shrink-0">
            <ChatPreview />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 clamp(24px,6vw,80px) clamp(80px,10vw,120px)" }}>
        <div className="max-w-[1100px] mx-auto border-t border-[var(--border)]">
          {[
            {
              num: "01",
              title: "Your AI, on your terms",
              body: "ARIA proactively manages your tasks, surfaces what matters across email and calendar, and takes action when you ask. Not a tool you operate — a system that works alongside you.",
            },
            {
              num: "02",
              title: "Privacy-first by design",
              body: "Your data lives in your infrastructure. ARIA doesn't phone home, doesn't aggregate your email, doesn't learn from your conversations to train models. What you host is yours.",
            },
            {
              num: "03",
              title: "Open source and extensible",
              body: "Not locked into a preset list of integrations. Fork it, add your own, ship what you need. Built to be extended — not just configured.",
            },
          ].map((f) => (
            <div
              key={f.num}
              className="flex flex-col md:flex-row gap-4 md:gap-16 py-10 border-b border-[var(--border)]"
            >
              <span
                className="text-[var(--text-muted)] shrink-0 md:pt-[3px]"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", minWidth: "28px" }}
              >
                {f.num}
              </span>
              <div>
                <h3
                  className="text-[var(--text-primary)] font-medium mb-3"
                  style={{ fontSize: "clamp(17px, 2vw, 22px)", letterSpacing: "-0.01em" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-[var(--text-secondary)] leading-relaxed max-w-[600px]"
                  style={{ fontSize: "15px" }}
                >
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="bg-[var(--bg-secondary)]"
        style={{ padding: "clamp(60px,8vw,100px) clamp(24px,6vw,80px)" }}
      >
        <div className="max-w-[1100px] mx-auto">
          <h2
            className="text-[var(--text-primary)] mb-14"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 3.5vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            Up and running in minutes.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
            {[
              {
                step: "01",
                title: "Fork the repo",
                body: "Clone or fork from GitHub. Everything you need is in the codebase.",
              },
              {
                step: "02",
                title: "Set your env vars",
                body: "Google OAuth, your Anthropic API key, and a Neon database. Fully documented.",
              },
              {
                step: "03",
                title: "Deploy to Vercel",
                body: "Connect your fork, add env vars, hit deploy. Under 5 minutes.",
              },
              {
                step: "04",
                title: "Sign in and start",
                body: "Google sign-in scoped to your email. Your data, your instance, your ARIA.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div
                  className="text-[var(--accent)] mb-5 font-medium"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em" }}
                >
                  {s.step}
                </div>
                <h4
                  className="text-[var(--text-primary)] font-medium mb-2"
                  style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
                >
                  {s.title}
                </h4>
                <p className="text-[var(--text-muted)] leading-relaxed" style={{ fontSize: "13px" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open source CTA ──────────────────────────────────────────────── */}
      <section
        className="bg-[var(--accent-subtle)]"
        style={{ padding: "clamp(60px,8vw,100px) clamp(24px,6vw,80px)" }}
      >
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-end gap-10 md:gap-16">
          <div className="flex-1">
            <h2
              className="text-[var(--text-primary)] mb-5 leading-[1.08]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(30px, 4.5vw, 52px)",
                letterSpacing: "-0.025em",
              }}
            >
              Fork it.<br />Extend it.<br />Make it yours.
            </h2>
            <p
              className="text-[var(--text-secondary)] leading-relaxed max-w-[420px]"
              style={{ fontSize: "15px" }}
            >
              ARIA is MIT licensed. The integration system is built to be
              extended — add Gmail today, build your own Slack integration
              tomorrow. The patterns are consistent and the architecture is
              documented.
            </p>
          </div>
          <a
            href="https://github.com/mmcken3/ARIA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-[11px] rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors shrink-0 self-start md:self-auto"
          >
            <GitFork size={15} strokeWidth={2} />
            View on GitHub
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="border-t border-[var(--border)]"
        style={{ padding: "28px clamp(24px,6vw,80px)" }}
      >
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <span
            className="text-[var(--text-muted)]"
            style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
          >
            ◆ ARIA
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/mmcken3/ARIA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              GitHub
            </a>
            <span
              className="text-[11px] text-[var(--text-muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Built with Anthropic Claude
            </span>
            <Link
              href="/login"
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Self-hosting? Sign in →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Chat preview ─────────────────────────────────────────────────────────────
// Static decorative component — shows ARIA in action without a real screenshot.

function ChatPreview() {
  return (
    <div
      style={{
        width: "316px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 32px 64px rgba(0,0,0,0.35), 0 0 0 1px var(--border)",
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          padding: "11px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          {["var(--border-strong)", "var(--border-strong)", "var(--border-strong)"].map((c, i) => (
            <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span
          style={{
            margin: "0 auto",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          ARIA · chat
        </span>
      </div>

      {/* Context strip */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "12px",
        }}
      >
        {[
          { label: "in progress", value: "3 tasks" },
          { label: "next meeting", value: "3pm standup" },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{ padding: "18px 14px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* User */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px 12px 3px 12px",
              padding: "8px 12px",
              fontSize: "13px",
              color: "var(--text-primary)",
              maxWidth: "200px",
              lineHeight: 1.5,
            }}
          >
            What should I focus on today?
          </div>
        </div>

        {/* ARIA */}
        <div style={{ display: "flex", gap: "7px", alignItems: "flex-start" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              color: "var(--accent)",
              flexShrink: 0,
              paddingTop: "8px",
            }}
          >
            ◆
          </span>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "3px 12px 12px 12px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--text-primary)",
              lineHeight: 1.6,
            }}
          >
            3 things. Project review due at 5pm — still in progress. Sarah replied to the contract email, wants revisions by Friday. Free 2-hour block at 10am.
            <br />
            <span style={{ color: "var(--accent)", fontSize: "12px", display: "block", marginTop: "8px" }}>
              Want me to block that 10am for the review?
            </span>
          </div>
        </div>
      </div>

      {/* Input */}
      <div
        style={{
          margin: "0 14px 14px",
          padding: "8px 10px 8px 12px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--text-muted)", flex: 1 }}>Yes, block it...</span>
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>↑</span>
        </div>
      </div>
    </div>
  );
}
