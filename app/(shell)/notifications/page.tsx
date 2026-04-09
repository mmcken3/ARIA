import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "12px",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={18} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
      </div>
      <div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.2,
            marginBottom: "6px",
          }}
        >
          Notifications
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "280px", lineHeight: 1.5 }}>
          Proactive alerts from ARIA — morning briefs, email signals, task nudges. Coming with integrations.
        </p>
      </div>
    </div>
  );
}
