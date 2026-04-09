"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn.social({ provider: "google", callbackURL: "/chat" });
    // loading stays true — page will navigate away
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        paddingTop: "clamp(4rem, 12vh, 8rem)",
        paddingBottom: "clamp(4rem, 12vh, 8rem)",
        width: "100%",
        maxWidth: "420px",
        padding: "clamp(2rem, 8vw, 4rem)",
        animation: "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* Wordmark */}
      <div className="flex flex-col items-center mb-12">
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(3.5rem, 8vw, 5rem)",
            fontStyle: "italic",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "1rem",
          }}
        >
          ARIA
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          Your personal AI operating system
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          width: "32px",
          height: "1px",
          background: "var(--border-strong)",
          marginBottom: "3rem",
        }}
      />

      {/* Sign in button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1.5rem",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          fontSize: "0.9375rem",
          fontWeight: 500,
          fontFamily: "var(--font-dm-sans)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "background 150ms ease, border-color 150ms ease, opacity 150ms ease",
          width: "100%",
          justifyContent: "center",
          letterSpacing: "-0.01em",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-secondary)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-muted)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
        }}
      >
        {loading ? (
          <span
            style={{
              width: "18px",
              height: "18px",
              border: "2px solid var(--border-strong)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
        ) : (
          <GoogleLogo />
        )}
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      {/* Footer note */}
      <p
        className="text-center"
        style={{
          marginTop: "2.5rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          maxWidth: "280px",
        }}
      >
        Self-hosted. Your data stays yours.
      </p>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
