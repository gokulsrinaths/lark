import React, { useState, useEffect, useRef, useCallback } from "react";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

// ─── Widget metadata ─────────────────────────────────────

const propSchema = z.object({
  status: z.string(),
  greeting: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Lark AI Communication Suite — phone, music, messages, and more",
  props: propSchema,
  metadata: {
    autoResize: true,
    csp: {
      resourceDomains: [
        "https://*.dzcdn.net",
        "https://cdnt-preview.dzcdn.net",
      ],
    },
  },
};

type Props = z.infer<typeof propSchema>;
type ActiveTool = "phone" | "groupcall" | "music" | "video" | "messages" | "contacts" | null;

// ─── Shared styles ───────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "14px",
  fontWeight: 300,
  letterSpacing: "0.025em",
  border: "none",
  outline: "none",
  textAlign: "center",
  fontFamily: "inherit",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: "13px",
  lineHeight: 1.6,
  resize: "none",
};

const spinnerStyle: React.CSSProperties = {
  width: "14px",
  height: "14px",
  border: "2px solid rgba(255,255,255,0.3)",
  borderTop: "2px solid white",
  borderRadius: "50%",
  animation: "lark-spin 0.6s linear infinite",
};

function btnStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 0",
    borderRadius: "12px",
    background: color,
    color: "white",
    fontWeight: 500,
    fontSize: "13px",
    border: "none",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.2 : 1,
    pointerEvents: disabled ? "none" : "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  };
}

function resultStyle(color: string): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: "12px",
    background: `${color}14`,
    border: `1px solid ${color}1a`,
    textAlign: "center",
  };
}

// ─── SVG Icons ───────────────────────────────────────────

const icons = {
  phone: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
    </svg>
  ),
  groupcall: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  music: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.68 31.68 0 000 12a31.68 31.68 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.68 31.68 0 0024 12a31.68 31.68 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: "white" }}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
};

const apps: { id: ActiveTool; label: string; gradient: string; icon: React.ReactNode }[] = [
  { id: "phone", label: "Phone", gradient: "linear-gradient(to bottom, #62d84e, #2eb83a)", icon: icons.phone },
  { id: "groupcall", label: "Group Call", gradient: "linear-gradient(to bottom, #3b82f6, #1d4ed8)", icon: icons.groupcall },
  { id: "music", label: "Music", gradient: "linear-gradient(to bottom, #fc5c7d, #e6233b)", icon: icons.music },
  { id: "video", label: "YouTube", gradient: "linear-gradient(to bottom, #ff0000, #cc0000)", icon: icons.video },
  { id: "messages", label: "Messages", gradient: "linear-gradient(to bottom, #a855f7, #7c3aed)", icon: icons.messages },
  { id: "contacts", label: "Contacts", gradient: "linear-gradient(to bottom, #f59e0b, #d97706)", icon: icons.contacts },
];

// ─── Panels ──────────────────────────────────────────────

function PhonePanel() {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("Hello, this is a call from Lark.");
  const [status, setStatus] = useState<"idle" | "ringing" | "connected" | "ended" | "error">("idle");
  const [contactLabel, setContactLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { callTool } = useWidget<Props>();

  const execute = async () => {
    if (!number.trim()) return;
    setStatus("ringing");
    setContactLabel(number.trim());
    setErrorMsg("");
    try {
      const res = await callTool("make-call", { to: number, message });
      // Parse the result to extract the contact label
      let data: any;
      try { data = typeof res?.result === "object" ? res.result : JSON.parse(res?.result || "{}"); } catch { data = null; }
      if (data?.to) setContactLabel(data.to);
      else if (typeof res?.result === "string") {
        const match = res.result.match(/to\s+(.+?)\s+from/i);
        if (match) setContactLabel(match[1]);
      }
      setStatus("connected");
      // Simulate call duration then end
      timerRef.current = setTimeout(() => setStatus("ended"), 8000);
    } catch {
      setErrorMsg("Couldn\u2019t place the call. Please try again.");
      setStatus("error");
    }
  };

  const hangUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("ended");
  };

  const reset = () => {
    setStatus("idle");
    setContactLabel("");
    setErrorMsg("");
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Active call screen (ringing / connected / ended)
  if (status === "ringing" || status === "connected" || status === "ended") {
    const isRinging = status === "ringing";
    const isConnected = status === "connected";
    const isEnded = status === "ended";

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "8px 0" }}>
        {/* Avatar */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: isEnded ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #22c55e, #16a34a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isRinging ? "0 0 0 8px rgba(34,197,94,0.15), 0 0 0 16px rgba(34,197,94,0.06)" : "none",
          animation: isRinging ? "lark-pulse 1.5s ease-in-out infinite" : "none",
          transition: "all 0.3s ease",
        }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>
            {contactLabel.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Contact name */}
        <p style={{ color: "white", fontSize: "14px", fontWeight: 600, margin: 0, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {contactLabel}
        </p>

        {/* Status text */}
        <p style={{
          color: isEnded ? "rgba(255,255,255,0.3)" : isConnected ? "#4ade80" : "rgba(255,255,255,0.5)",
          fontSize: "11px", fontWeight: 500, margin: 0, letterSpacing: "0.03em",
        }}>
          {isRinging ? "Ringing\u2026" : isConnected ? "Connected" : "Call ended"}
        </p>

        {/* Duration / timer dots */}
        {isConnected && (
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", animation: "lark-pulse 1s ease-in-out infinite" }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 500 }}>Live</span>
          </div>
        )}

        {/* Message being spoken */}
        {(isRinging || isConnected) && (
          <div style={{ padding: "6px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", width: "100%" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: 500, margin: 0, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Speaking</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", margin: "3px 0 0", lineHeight: 1.4 }}>{message}</p>
          </div>
        )}

        {/* Action buttons */}
        {isEnded ? (
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button onClick={execute} style={{ ...btnStyle("#22c55e", false), flex: 1 }}>Call Again</button>
            <button onClick={reset} style={{ ...btnStyle("rgba(255,255,255,0.08)", false), flex: 1, color: "rgba(255,255,255,0.5)" }}>New Call</button>
          </div>
        ) : (
          <button onClick={hangUp} style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "#ef4444", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            transition: "transform 0.1s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.36C3.46 8.77 7.48 7 12 7s8.54 1.77 11.71 4.72c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.993.993 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "8px 0" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#f87171"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, textAlign: "center" }}>{errorMsg}</p>
        <button onClick={reset} style={btnStyle("rgba(255,255,255,0.08)", false)}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>Try Again</span>
        </button>
      </div>
    );
  }

  // Idle — input form
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && execute()}
        placeholder="+1 (555) 000-0000"
        style={inputStyle}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message to speak\u2026"
        rows={3}
        style={{ ...textareaStyle }}
      />
      <button onClick={execute} disabled={!number.trim()} style={btnStyle("#22c55e", !number.trim())}>
        Call
      </button>
    </div>
  );
}


function GroupCallPanel() {
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("Hello from Lark group call!");
  const [status, setStatus] = useState<"idle" | "loading" | "calling" | "done" | "error">("idle");
  const [callResults, setCallResults] = useState<{ label: string; ok: boolean }[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const { callTool } = useWidget<Props>();

  // Load contacts on mount
  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const res = await callTool("list-contacts", {});
        let data: any;
        try { data = typeof res?.result === "object" ? res.result : JSON.parse(res?.result || "{}"); } catch { data = null; }
        if (data?.contacts) {
          const list = Object.entries(data.contacts).map(([name, phone]) => ({ name, phone: phone as string }));
          setContacts(list);
        }
      } catch {}
      setStatus("idle");
    })();
  }, []);

  const toggleContact = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const callAll = async () => {
    if (selected.size === 0 || !message.trim()) return;
    setStatus("calling");
    setCallResults([]);
    setErrorMsg("");
    try {
      const names = Array.from(selected);
      const res = await callTool("group-call", { to: names, message });
      let data: any;
      try { data = typeof res?.result === "object" ? res.result : JSON.parse(res?.result || "{}"); } catch { data = null; }
      const results: { label: string; ok: boolean }[] = [];
      if (data?.calls) {
        for (const c of data.calls) results.push({ label: c.label || c.name || "Unknown", ok: true });
      }
      if (data?.errors) {
        for (const e of data.errors) results.push({ label: e.label || "Unknown", ok: false });
      }
      if (results.length === 0) {
        // Fallback: mark all selected as succeeded
        for (const n of names) results.push({ label: n, ok: true });
      }
      setCallResults(results);
      setStatus("done");
    } catch {
      setErrorMsg("Couldn\u2019t place the calls. Please try again.");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setSelected(new Set());
    setCallResults([]);
    setErrorMsg("");
  };

  if (status === "loading") {
    return <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}><div style={spinnerStyle} /></div>;
  }

  // Calling state — show ringing indicators
  if (status === "calling") {
    const names = Array.from(selected);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "8px 0" }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 500, margin: 0, letterSpacing: "0.03em" }}>
          Calling {names.length} {names.length === 1 ? "person" : "people"}\u2026
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          {names.map((n) => (
            <div key={n} style={{
              padding: "8px 10px", borderRadius: "10px",
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <div style={{ ...spinnerStyle, width: "12px", height: "12px", borderWidth: "1.5px", borderColor: "rgba(96,165,250,0.3)", borderTopColor: "#60a5fa" }} />
              <span style={{ color: "white", fontSize: "11px", fontWeight: 500 }}>{n}</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", marginLeft: "auto" }}>Ringing</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Done state — show per-contact results
  if (status === "done") {
    const succeeded = callResults.filter((r) => r.ok).length;
    const total = callResults.length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "8px 0" }}>
        {/* Summary icon */}
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          background: succeeded === total ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {succeeded === total ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#4ade80"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          )}
        </div>
        <p style={{ color: "white", fontSize: "13px", fontWeight: 600, margin: 0 }}>
          {succeeded === total ? "All calls placed" : `${succeeded}/${total} calls placed`}
        </p>

        {/* Per-contact status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
          {callResults.map((r, i) => (
            <div key={i} style={{
              padding: "7px 10px", borderRadius: "10px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {r.ok ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#4ade80"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f87171"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              )}
              <span style={{ color: "white", fontSize: "11px", fontWeight: 500, flex: 1 }}>{r.label}</span>
              <span style={{ color: r.ok ? "#4ade80" : "#f87171", fontSize: "9px", fontWeight: 600 }}>
                {r.ok ? "Connected" : "Failed"}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
          <button onClick={callAll} style={{ ...btnStyle("#3b82f6", false), flex: 1 }}>Call Again</button>
          <button onClick={reset} style={{ ...btnStyle("rgba(255,255,255,0.08)", false), flex: 1, color: "rgba(255,255,255,0.5)" }}>New Call</button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "8px 0" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#f87171"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, textAlign: "center" }}>{errorMsg}</p>
        <button onClick={reset} style={btnStyle("rgba(255,255,255,0.08)", false)}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>Try Again</span>
        </button>
      </div>
    );
  }

  // Idle — selection screen
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: 0, textAlign: "center" }}>
        Select contacts ({selected.size})
      </p>

      {contacts.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", textAlign: "center", padding: "8px 0" }}>No contacts saved yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "120px", overflowY: "auto" }}>
          {contacts.map((c) => (
            <button
              key={c.name}
              onClick={() => toggleContact(c.name)}
              style={{
                padding: "7px 10px", borderRadius: "10px",
                background: selected.has(c.name) ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                border: selected.has(c.name) ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: "8px",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                background: selected.has(c.name) ? "#3b82f6" : "rgba(255,255,255,0.08)",
                border: selected.has(c.name) ? "none" : "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}>
                {selected.has(c.name) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: "white", fontSize: "11px", fontWeight: 500, margin: 0 }}>{c.name}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", margin: 0 }}>{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message to speak\u2026"
        style={{ ...inputStyle, fontSize: "12px" }}
      />

      <button
        onClick={callAll}
        disabled={selected.size === 0 || !message.trim()}
        style={btnStyle("#3b82f6", selected.size === 0 || !message.trim())}
      >
        {`Call ${selected.size > 0 ? selected.size : ""} Selected`}
      </button>
    </div>
  );
}

interface TrackData {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audiusTrackId?: string;
  previewUrl?: string;
  duration: number;
  isFullTrack: boolean;
}

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}

function parseTrackResult(res: any): TrackData | null {
  let data: any;
  try { data = typeof res?.result === "object" ? res.result : JSON.parse(res?.result || "{}"); } catch { return null; }
  if (!data || (!data.audiusTrackId && !data.previewUrl)) return null;
  return data as TrackData;
}

// ─── Audio Visualizer ────────────────────────────────────

function Visualizer({ analyser, playing }: { analyser: AnalyserNode | null; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 252;
    const H = 130;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let freqData: Uint8Array<ArrayBuffer>;
    let waveData: Uint8Array<ArrayBuffer>;
    if (analyser) {
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      freqData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      waveData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    } else {
      freqData = new Uint8Array(256) as Uint8Array<ArrayBuffer>;
      waveData = new Uint8Array(256) as Uint8Array<ArrayBuffer>;
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      if (analyser && playing) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(waveData);
      }

      // Layer 1: Ambient glow orbs
      const bass = playing ? (freqData[2] + freqData[3] + freqData[4]) / 3 / 255 : 0.05;
      const mid = playing ? (freqData[20] + freqData[25] + freqData[30]) / 3 / 255 : 0.03;

      const grad1 = ctx.createRadialGradient(W * 0.25, H * 0.6, 0, W * 0.25, H * 0.6, 55 + bass * 35);
      grad1.addColorStop(0, `rgba(139, 92, 246, ${0.15 + bass * 0.25})`);
      grad1.addColorStop(0.5, `rgba(139, 92, 246, ${0.05 + bass * 0.1})`);
      grad1.addColorStop(1, "rgba(139, 92, 246, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, W, H);

      const grad2 = ctx.createRadialGradient(W * 0.75, H * 0.4, 0, W * 0.75, H * 0.4, 45 + mid * 30);
      grad2.addColorStop(0, `rgba(236, 72, 153, ${0.12 + mid * 0.2})`);
      grad2.addColorStop(0.5, `rgba(236, 72, 153, ${0.04 + mid * 0.08})`);
      grad2.addColorStop(1, "rgba(236, 72, 153, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, W, H);

      // Layer 2: Smooth waveform
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      const waveGrad = ctx.createLinearGradient(0, 0, W, 0);
      waveGrad.addColorStop(0, "rgba(139, 92, 246, 0.0)");
      waveGrad.addColorStop(0.15, "rgba(139, 92, 246, 0.5)");
      waveGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.7)");
      waveGrad.addColorStop(0.85, "rgba(236, 72, 153, 0.5)");
      waveGrad.addColorStop(1, "rgba(236, 72, 153, 0.0)");
      ctx.strokeStyle = waveGrad;

      const sliceW = W / waveData.length;
      for (let i = 0; i < waveData.length; i++) {
        const v = playing ? waveData[i] / 128.0 : 1 + Math.sin(t * 1.5 + i * 0.04) * 0.02;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sliceW, y);
      }
      ctx.stroke();

      // Waveform glow
      ctx.lineWidth = 4;
      ctx.strokeStyle = playing ? `rgba(168, 85, 247, ${0.08 + bass * 0.12})` : "rgba(168, 85, 247, 0.03)";
      ctx.beginPath();
      for (let i = 0; i < waveData.length; i++) {
        const v = playing ? waveData[i] / 128.0 : 1 + Math.sin(t * 1.5 + i * 0.04) * 0.02;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sliceW, y);
      }
      ctx.stroke();

      // Layer 3: Frequency bars
      const barCount = 36;
      const totalGap = (barCount - 1) * 2;
      const barW = (W - 20 - totalGap) / barCount;
      const startX = 10;
      const baseY = H - 10;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * freqData.length * 0.7);
        const raw = freqData[idx] / 255;
        const val = playing ? Math.pow(raw, 0.85) : 0.02 + Math.sin(t * 0.8 + i * 0.15) * 0.015;
        const barH = Math.max(2, val * (H * 0.65));
        const x = startX + i * (barW + 2);

        const barGrad = ctx.createLinearGradient(x, baseY, x, baseY - barH);
        const hue1 = 265 + (i / barCount) * 50;
        const hue2 = 275 + (i / barCount) * 50;
        barGrad.addColorStop(0, `hsla(${hue1}, 70%, 60%, ${playing ? 0.6 + val * 0.4 : 0.15})`);
        barGrad.addColorStop(0.5, `hsla(${hue2}, 75%, 65%, ${playing ? 0.5 + val * 0.5 : 0.1})`);
        barGrad.addColorStop(1, `hsla(${hue2 + 15}, 80%, 70%, ${playing ? 0.3 + val * 0.4 : 0.06})`);
        ctx.fillStyle = barGrad;

        const r = Math.min(barW / 2, 2);
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY - barH + r);
        ctx.quadraticCurveTo(x, baseY - barH, x + r, baseY - barH);
        ctx.lineTo(x + barW - r, baseY - barH);
        ctx.quadraticCurveTo(x + barW, baseY - barH, x + barW, baseY - barH + r);
        ctx.lineTo(x + barW, baseY);
        ctx.closePath();
        ctx.fill();

        // Cap
        if (playing && val > 0.1) {
          ctx.fillStyle = `hsla(${hue1}, 85%, 80%, ${0.6 + val * 0.4})`;
          ctx.beginPath();
          ctx.arc(x + barW / 2, baseY - barH, barW / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Reflection
        const reflGrad = ctx.createLinearGradient(x, baseY, x, baseY + barH * 0.3);
        reflGrad.addColorStop(0, `hsla(${hue1}, 70%, 60%, ${playing ? 0.08 + val * 0.06 : 0.02})`);
        reflGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = reflGrad;
        ctx.fillRect(x, baseY + 2, barW, barH * 0.25);
      }

      // Layer 4: Pulse line
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255, 255, 255, ${playing ? 0.06 + bass * 0.08 : 0.03})`;
      ctx.moveTo(0, baseY);
      ctx.lineTo(W, baseY);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, playing]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 130, display: "block", borderRadius: "12px 12px 0 0" }}
    />
  );
}

// ─── Shared Player Card (full music player UI) ──────────

function PlayerCard({ track, onBack }: { track: TrackData; onBack?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyserReady, setAnalyserReady] = useState(false);

  const initAnalyser = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || analyserRef.current) return;
    try {
      const actx = new AudioContext();
      const source = actx.createMediaElementSource(audio);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(actx.destination);
      ctxRef.current = actx;
      analyserRef.current = analyser;
      setAnalyserReady(true);
    } catch {}
  }, []);

  // Setup audio when track changes
  useEffect(() => {
    let audioUrl = "";
    if (track.audiusTrackId) {
      audioUrl = `${window.location.origin}/stream/${track.audiusTrackId}`;
    } else if (track.previewUrl) {
      audioUrl = track.previewUrl;
    }
    if (!audioUrl) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.volume = volume / 100;
    audio.preload = "auto";
    audio.src = audioUrl;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => { if (audio.duration && isFinite(audio.duration)) setDur(audio.duration); };
    const onEnd = () => setPlaying(false);
    const onError = () => {
      if (track.audiusTrackId && track.previewUrl && audio.src !== track.previewUrl) {
        audio.src = track.previewUrl;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);

    audio.play().then(() => setPlaying(true)).catch(() => {});
    if (track.duration) setDur(track.duration);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      audio.src = "";
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
      analyserRef.current = null;
      setAnalyserReady(false);
    };
  }, [track.audiusTrackId, track.previewUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!analyserRef.current) initAnalyser();
    if (playing) {
      audio.pause();
    } else {
      if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
      audio.play().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur;
  };

  const onVol = (val: number) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val / 100;
  };

  const onMute = () => {
    setMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  };

  const progress = dur > 0 ? (currentTime / dur) * 100 : 0;
  const coverSrc = track.coverUrl ? `${window.location.origin}/cover?url=${encodeURIComponent(track.coverUrl)}` : "";

  const ctrlBtn: React.CSSProperties = {
    width: "36px", height: "36px", borderRadius: "50%",
    background: "transparent", color: "rgba(255,255,255,0.7)",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit", transition: "color 0.15s, background 0.15s",
  };

  return (
    <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Blurred album art BG */}
      {coverSrc && (
        <img
          src={coverSrc} alt=""
          onLoad={() => setImgLoaded(true)}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover",
            filter: "blur(60px) saturate(1.8) brightness(0.25)",
            transform: "scale(1.3)",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 1.2s ease",
            pointerEvents: "none", zIndex: 0,
          }}
        />
      )}
      {/* Dark overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.6) 40%, rgba(10,10,15,0.92) 100%)",
        zIndex: 1, pointerEvents: "none",
      }} />

      {/* Visualizer */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <Visualizer analyser={analyserReady ? analyserRef.current : null} playing={playing} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Track info row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {coverSrc && (
            <img
              src={coverSrc} alt=""
              style={{
                width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover",
                boxShadow: "0 2px 12px rgba(0,0,0,0.4)", flexShrink: 0,
                opacity: imgLoaded ? 1 : 0, transition: "opacity 0.5s ease",
              }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: "#fff", fontSize: "12px", fontWeight: 650, margin: 0, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track.title}
            </p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", fontWeight: 420, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track.artist}{track.album ? ` \u00b7 ${track.album}` : ""}
            </p>
            <span style={{
              fontSize: "7px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
              padding: "1px 6px", borderRadius: "20px", display: "inline-block", marginTop: "3px",
              background: track.isFullTrack ? "rgba(34,197,94,0.15)" : "rgba(251,191,36,0.12)",
              color: track.isFullTrack ? "#4ade80" : "#fbbf24",
              border: `1px solid ${track.isFullTrack ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)"}`,
            }}>
              {track.isFullTrack ? "Full Track" : "Preview"}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            className="lark-progress"
            onClick={seek}
            style={{ position: "relative", width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", cursor: "pointer", overflow: "visible", transition: "height 0.15s ease" }}
          >
            <div style={{ position: "relative", height: "100%", borderRadius: "10px", background: "linear-gradient(90deg, #8b5cf6, #ec4899)", width: `${progress}%`, transition: "width 0.1s linear" }}>
              {/* Glow */}
              <div style={{ position: "absolute", right: 0, top: "-4px", width: "40px", height: "calc(100% + 8px)", background: "radial-gradient(ellipse at right, rgba(139,92,246,0.35), transparent)", pointerEvents: "none" }} />
              {/* Knob */}
              <div className="lark-knob" style={{
                position: "absolute", right: "-5px", top: "50%", transform: "translateY(-50%)",
                width: "12px", height: "12px", borderRadius: "50%", background: "#fff",
                boxShadow: "0 0 8px rgba(139,92,246,0.5), 0 2px 4px rgba(0,0,0,0.3)",
                opacity: 0, transition: "opacity 0.15s ease",
              }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>{fmtTime(currentTime)}</span>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>{dur > 0 ? fmtTime(dur) : "--:--"}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <button onClick={() => audioRef.current && (audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10))} style={ctrlBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button onClick={toggle} style={{
            width: "46px", height: "46px", borderRadius: "50%",
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            color: "#fff", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit",
            boxShadow: "0 4px 20px rgba(139,92,246,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset",
            transition: "transform 0.1s",
          }}>
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button onClick={() => audioRef.current && (audioRef.current.currentTime = Math.min(audioRef.current.duration || 30, audioRef.current.currentTime + 10))} style={ctrlBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 2px" }}>
          <button onClick={onMute} style={{ ...ctrlBtn, width: "28px", height: "28px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              {muted || volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              )}
            </svg>
          </button>
          <input
            type="range" className="lark-vol"
            min={0} max={100} value={volume}
            onChange={(e) => onVol(Number(e.target.value))}
          />
          <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.45)", minWidth: "28px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{volume}%</span>
        </div>

        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={{
            width: "100%", padding: "6px 0", borderRadius: "10px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s",
          }}>
            Back to search
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Music Panel (quick play → full player) ─────────────

function MusicPanel() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const { callTool } = useWidget<Props>();

  const play = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setErrorMsg("");
    try {
      const res = await callTool("music-play", { query });
      const data = parseTrackResult(res);
      if (!data) { setErrorMsg("No results found — try a different search"); setSearching(false); return; }
      setTrack(data);
    } catch {
      setErrorMsg("Couldn\u2019t find that song. Try a different search!");
    }
    setSearching(false);
  };

  if (track) {
    return <PlayerCard track={track} onBack={() => setTrack(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && play()} placeholder="Song, artist, or mood..." style={inputStyle} />
      <button onClick={play} disabled={!query.trim() || searching} style={btnStyle("#8b5cf6", !query.trim() || searching)}>
        {searching ? <div style={spinnerStyle} /> : "Play"}
      </button>
      {errorMsg && (
        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: 0 }}>{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

// ─── Video Panel (YouTube search → results → play) ──────

interface VideoResult {
  title: string;
  channel: string;
  duration: string;
  views: string;
  videoId: string;
}

function parseSearchResults(txt: string): VideoResult[] {
  const results: VideoResult[] = [];
  const blocks = txt.split(/\n\n/).filter(Boolean);
  for (const block of blocks) {
    const titleMatch = block.match(/^\d+\.\s*(.+)/);
    if (!titleMatch) continue;
    const channelMatch = block.match(/Channel:\s*(.+?)(?:\s*·|$)/);
    const durationMatch = block.match(/·\s*(\d+:\d+(?::\d+)?)\s*·/);
    const viewsMatch = block.match(/·\s*([\d.]+[KMB]?\s*views)/);
    const urlMatch = block.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      results.push({
        title: titleMatch[1].trim(),
        channel: channelMatch?.[1]?.trim() || "",
        duration: durationMatch?.[1] || "",
        views: viewsMatch?.[1] || "",
        videoId: urlMatch[1],
      });
    }
  }
  return results;
}

function VideoPanel() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [playing, setPlaying] = useState<VideoResult | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [queueMsg, setQueueMsg] = useState("");
  const { callTool } = useWidget<Props>();

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setErrorMsg("");
    setResults([]);
    setPlaying(null);
    try {
      const res = await callTool("video-yt__search", { query });
      const txt = typeof res?.result === "string" ? res.result : JSON.stringify(res?.result || "");
      const parsed = parseSearchResults(txt);
      if (parsed.length > 0) {
        setResults(parsed);
      } else {
        setErrorMsg("No results found");
      }
    } catch {
      setErrorMsg("Search failed — try again");
    }
    setSearching(false);
  };

  const playVideo = async (r: VideoResult, idx: number) => {
    setLoadingIdx(idx);
    try {
      await callTool("video-yt__play", { query: r.videoId });
      setPlaying(r);
    } catch {
      setErrorMsg("Couldn\u2019t play this video");
    }
    setLoadingIdx(null);
  };

  const addToQueue = async (r: VideoResult) => {
    setQueueMsg("");
    try {
      await callTool("video-yt__add-to-queue", { query: r.videoId });
      setQueueMsg(`Queued: ${r.title}`);
    } catch {
      setQueueMsg("Failed to queue");
    }
  };

  // Now playing view — embedded YouTube player
  if (playing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{
          position: "relative", borderRadius: "12px", overflow: "hidden",
          background: "#000", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${playing.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={playing.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{
              width: "100%",
              aspectRatio: "16/9",
              border: "none",
              display: "block",
            }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#fff", fontSize: "12px", fontWeight: 600, margin: 0 }}>{playing.title}</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", margin: "2px 0 0" }}>
            {playing.channel} {playing.duration ? `\u00b7 ${playing.duration}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => addToQueue(playing)} style={{ ...btnStyle("rgba(255,255,255,0.08)", false), flex: 1, fontSize: "10px", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            + Queue
          </button>
          <button onClick={() => setPlaying(null)} style={{ ...btnStyle("rgba(255,255,255,0.08)", false), flex: 1, fontSize: "10px", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Back
          </button>
        </div>
        {queueMsg && <div style={resultStyle("#dc2626")}><p style={{ color: "#f87171", fontSize: "10px", margin: 0 }}>{queueMsg}</p></div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search YouTube..." style={inputStyle} />
      <button onClick={search} disabled={!query.trim() || searching} style={btnStyle("#dc2626", !query.trim() || searching)}>
        {searching ? <div style={spinnerStyle} /> : "Search"}
      </button>

      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => playVideo(r, i)}
              disabled={loadingIdx !== null}
              style={{
                padding: "8px 10px", borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: "8px",
                cursor: loadingIdx !== null ? "default" : "pointer",
                opacity: loadingIdx !== null && loadingIdx !== i ? 0.4 : 1,
                fontFamily: "inherit", textAlign: "left",
                transition: "opacity 0.15s, background 0.15s",
              }}
            >
              <div style={{
                width: "40px", height: "28px", borderRadius: "4px", overflow: "hidden", flexShrink: 0,
                background: "#111",
              }}>
                <img src={`https://i.ytimg.com/vi/${r.videoId}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: "white", fontSize: "10px", fontWeight: 500, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.title}
                </p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "8px", margin: "1px 0 0" }}>
                  {r.channel} {r.duration ? `\u00b7 ${r.duration}` : ""} {r.views ? `\u00b7 ${r.views}` : ""}
                </p>
              </div>
              {loadingIdx === i && <div style={{ ...spinnerStyle, width: "10px", height: "10px", borderWidth: "1.5px", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: 0 }}>{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

function MessagesPanel() {
  const [agentName, setAgentName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [view, setView] = useState<"register" | "inbox" | "send" | "agents">("register");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ from: string; content: string }[]>([]);
  const { callTool } = useWidget<Props>();

  const register = async () => {
    if (!agentName.trim()) return;
    setStatus("calling");
    try {
      await callTool("agent-chat__register", { name: agentName, description: "Lark UI agent" });
      setRegistered(true);
      setView("agents");
      setStatus("done");
    } catch (err: any) {
      setResult(err?.message || "Registration failed");
      setStatus("error");
    }
  };

  const listAgents = async () => {
    setStatus("calling");
    try {
      const res = await callTool("agent-chat__list-agents", {});
      if (typeof res?.result === "string" && res.result.includes("\u2022")) {
        const names = res.result.split("\n").map((l: string) => l.replace(/^\u2022\s*/, "").split(" ")[0]).filter(Boolean);
        setAgents(names);
      }
      setView("agents");
      setStatus("done");
    } catch (err: any) {
      setResult(err?.message || "Failed to list agents");
      setStatus("error");
    }
  };

  const readInbox = async () => {
    setStatus("calling");
    try {
      const res = await callTool("agent-chat__read-inbox", { agent_name: agentName });
      const txt = typeof res?.result === "string" ? res.result : JSON.stringify(res?.result);
      const parsed: { from: string; content: string }[] = [];
      const matches = txt.matchAll(/From ([^\n:]+):\n\s*(.+)/g);
      for (const m of matches) {
        parsed.push({ from: m[1], content: m[2] });
      }
      setMessages(parsed);
      setView("inbox");
      setStatus("done");
    } catch (err: any) {
      setResult(err?.message || "Failed to read inbox");
      setStatus("error");
    }
  };

  const sendMessage = async () => {
    if (!to.trim() || !message.trim()) return;
    setStatus("calling");
    try {
      await callTool("agent-chat__send-message", { from: agentName, to, message });
      setResult(`Sent to ${to}`);
      setMessage("");
      setStatus("done");
    } catch (err: any) {
      setResult(err?.message || "Send failed");
      setStatus("error");
    }
  };

  if (!registered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && register()}
          placeholder="Your agent name…"
          style={inputStyle}
        />
        <button onClick={register} disabled={!agentName.trim() || status === "calling"} style={btnStyle("#a855f7", !agentName.trim() || status === "calling")}>
          {status === "calling" ? <div style={spinnerStyle} /> : "Register"}
        </button>
        {result && <div style={resultStyle("#ef4444")}><p style={{ color: "#f87171", fontSize: "11px", margin: 0 }}>{result}</p></div>}
      </div>
    );
  }

  const tabBtn = (label: string, v: typeof view, color: string) => (
    <button
      onClick={() => { setView(v); setResult(""); if (v === "agents") listAgents(); if (v === "inbox") readInbox(); }}
      style={{
        flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "10px", fontWeight: 600,
        background: view === v ? `${color}22` : "transparent",
        color: view === v ? color : "rgba(255,255,255,0.35)",
        border: view === v ? `1px solid ${color}33` : "1px solid transparent",
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {tabBtn("Agents", "agents", "#a855f7")}
        {tabBtn("Inbox", "inbox", "#3b82f6")}
        {tabBtn("Send", "send", "#10b981")}
      </div>

      {view === "agents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {status === "calling" ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}><div style={spinnerStyle} /></div>
          ) : agents.length > 0 ? (
            agents.map((a, i) => (
              <button
                key={i}
                onClick={() => { setTo(a); setView("send"); }}
                style={{
                  padding: "8px 10px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: "8px",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0,
                }}>{a.charAt(0).toUpperCase()}</div>
                <span style={{ color: "white", fontSize: "12px", fontWeight: 500 }}>{a}</span>
              </button>
            ))
          ) : (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center", padding: "8px 0" }}>No agents online yet</p>
          )}
        </div>
      )}

      {view === "inbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "150px", overflowY: "auto" }}>
          {status === "calling" ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}><div style={spinnerStyle} /></div>
          ) : messages.length > 0 ? (
            messages.map((m, i) => (
              <div key={i} style={{
                padding: "8px 10px", borderRadius: "10px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ color: "#a78bfa", fontSize: "10px", fontWeight: 600, margin: 0 }}>{m.from}</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", margin: "2px 0 0", lineHeight: 1.4 }}>{m.content}</p>
              </div>
            ))
          ) : (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center", padding: "8px 0" }}>No messages yet</p>
          )}
        </div>
      )}

      {view === "send" && (
        <>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To agent…" style={inputStyle} />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message…" rows={2} style={textareaStyle} />
          <button onClick={sendMessage} disabled={!to.trim() || !message.trim() || status === "calling"} style={btnStyle("#a855f7", !to.trim() || !message.trim() || status === "calling")}>
            {status === "calling" ? <div style={spinnerStyle} /> : "Send"}
          </button>
        </>
      )}

      {result && status !== "calling" && (
        <div style={resultStyle(status === "error" ? "#ef4444" : "#a855f7")}>
          <p style={{ color: status === "error" ? "#f87171" : "#c4b5fd", fontSize: "11px", margin: 0 }}>{result}</p>
        </div>
      )}
    </div>
  );
}

// ─── Contacts Panel ──────────────────────────────────────

function ContactsPanel() {
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "adding" | "removing">("idle");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"success" | "error">("success");
  const { callTool } = useWidget<Props>();

  const fetchContacts = async () => {
    setStatus("loading");
    try {
      const res = await callTool("list-contacts", {});
      let data: any;
      try { data = typeof res?.result === "object" ? res.result : JSON.parse(res?.result || "{}"); } catch { data = null; }
      if (data?.contacts) {
        const list = Object.entries(data.contacts).map(([name, phone]) => ({ name, phone: phone as string }));
        setContacts(list);
      } else {
        setContacts([]);
      }
    } catch {}
    setStatus("idle");
  };

  useEffect(() => { fetchContacts(); }, []);

  const addContact = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setStatus("adding");
    setResult("");
    try {
      await callTool("add-contact", { name: newName.trim(), phone: newPhone.trim() });
      setResult(`Added ${newName.trim()}`);
      setResultType("success");
      setNewName("");
      setNewPhone("");
      await fetchContacts();
    } catch (err: any) {
      setResult(err?.message || "Failed to add");
      setResultType("error");
    }
    setStatus("idle");
  };

  const removeContact = async (name: string) => {
    setStatus("removing");
    setResult("");
    try {
      await callTool("remove-contact", { name });
      setResult(`Removed ${name}`);
      setResultType("success");
      await fetchContacts();
    } catch (err: any) {
      setResult(err?.message || "Failed to remove");
      setResultType("error");
    }
    setStatus("idle");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: 0, textAlign: "center" }}>
        Contacts ({contacts.length})
      </p>

      {/* Contact list */}
      {status === "loading" && contacts.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}><div style={spinnerStyle} /></div>
      ) : contacts.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", textAlign: "center", padding: "4px 0" }}>No contacts yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "120px", overflowY: "auto" }}>
          {contacts.map((c) => (
            <div
              key={c.name}
              style={{
                padding: "7px 10px", borderRadius: "10px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0,
              }}>{c.name.charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: "white", fontSize: "11px", fontWeight: 500, margin: 0 }}>{c.name}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", margin: 0 }}>{c.phone}</p>
              </div>
              <button
                onClick={() => removeContact(c.name)}
                disabled={status === "removing"}
                style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "rgba(239,68,68,0.1)", border: "none",
                  color: "#f87171", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontFamily: "inherit", flexShrink: 0,
                  opacity: status === "removing" ? 0.3 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add contact */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name…"
          style={{ ...inputStyle, fontSize: "12px", padding: "8px 12px" }}
        />
        <input
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addContact()}
          placeholder="+1 (555) 000-0000"
          style={{ ...inputStyle, fontSize: "12px", padding: "8px 12px" }}
        />
        <button
          onClick={addContact}
          disabled={!newName.trim() || !newPhone.trim() || status === "adding"}
          style={btnStyle("#f59e0b", !newName.trim() || !newPhone.trim() || status === "adding")}
        >
          {status === "adding" ? <div style={spinnerStyle} /> : "Add Contact"}
        </button>
      </div>

      {result && (
        <div style={resultStyle(resultType === "error" ? "#ef4444" : "#f59e0b")}>
          <p style={{ color: resultType === "error" ? "#f87171" : "#fbbf24", fontSize: "11px", margin: 0 }}>{result}</p>
        </div>
      )}
    </div>
  );
}

// ─── App Ring ────────────────────────────────────────────

const RADIUS = 120;
const START_ANGLE = -90;
const STAGGER_MS = 80;
const ICONS_START = 400;

function AppRing({ onSelect, active }: { onSelect: (t: ActiveTool) => void; active: ActiveTool }) {
  const [booted, setBooted] = useState(false);
  const count = apps.length;
  const step = 360 / count;

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), ICONS_START + count * STAGGER_MS + 500);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {apps.map((app, i) => {
        const angle = START_ANGLE + i * step;
        const rad = (angle * Math.PI) / 180;
        const ringX = Math.cos(rad) * RADIUS;
        const ringY = Math.sin(rad) * RADIUS;

        const isSelected = active === app.id;
        const isOther = active !== null && !isSelected;

        let tx: number, ty: number, opacity: number, scale: number;
        if (!active) {
          tx = ringX; ty = ringY; opacity = 1; scale = 1;
        } else if (isSelected) {
          tx = 60; ty = 0; opacity = 1; scale = 1.5;
        } else {
          tx = 0; ty = 0; opacity = 0; scale = 0;
        }

        return (
          <div
            key={app.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              pointerEvents: isOther ? "none" : "auto",
              ...(booted
                ? {
                    opacity,
                    transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
                    transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease",
                  }
                : {
                    opacity: 0,
                    animation: `lark-orbit-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${ICONS_START + i * STAGGER_MS}ms forwards`,
                    // CSS custom properties for animation target
                    ["--tx" as any]: `calc(-50% + ${ringX}px)`,
                    ["--ty" as any]: `calc(-50% + ${ringY}px)`,
                  }),
            }}
          >
            <button
              onClick={() => onSelect(isSelected ? null : app.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  background: app.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  transition: "transform 0.1s ease-out",
                }}
              >
                {app.icon}
              </div>
              <span style={{
                fontSize: "9px",
                fontWeight: 500,
                color: isSelected ? "#ffffff" : "rgba(255,255,255,0.85)",
                transition: "color 0.3s",
              }}>
                {app.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Active Panel ────────────────────────────────────────

function ActivePanel({ tool }: { tool: ActiveTool }) {
  if (!tool) return null;

  const panelMap: Record<string, React.ReactNode> = {
    phone: <PhonePanel />,
    groupcall: <GroupCallPanel />,
    music: <MusicPanel />,
    video: <VideoPanel />,
    messages: <MessagesPanel />,
    contacts: <ContactsPanel />,
  };

  return (
    <div style={{
      position: "absolute",
      left: "calc(50% + 100px)",
      top: "50%",
      transform: "translateY(-50%)",
      width: "280px",
      padding: "16px",
      borderRadius: "20px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      backdropFilter: "blur(20px)",
      animation: "lark-panel-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
    }}>
      {panelMap[tool] || null}
    </div>
  );
}

// ─── Main Lark App ───────────────────────────────────────

function LarkApp() {
  const [active, setActive] = useState<ActiveTool>(null);
  const [showClock, setShowClock] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const handleLogoClick = () => {
    if (active) { setActive(null); return; }
    if (showClock) return;
    setShowClock(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowClock(false), 3000);
  };

  const handleSelect = (tool: ActiveTool) => {
    if (showClock) {
      setShowClock(false);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
    setActive(tool);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div style={{
      width: "100%",
      height: "460px",
      overflow: "hidden",
      background: "black",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "16px",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
      position: "relative",
    }}>
      <div style={{ position: "relative" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: active ? "translateX(-60px) scale(1.2)" : "translateX(0) scale(1)",
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button
            onClick={handleLogoClick}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* Bird emoji */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              opacity: showClock ? 0 : 1,
              transform: showClock ? "scale(0.8)" : "scale(1)",
              transition: "opacity 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              position: showClock ? "absolute" : "relative",
              pointerEvents: showClock ? "none" : "auto",
            }}>
              <span style={{ fontSize: "48px", lineHeight: 1 }}>🐥</span>
            </div>
            {/* Clock */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: showClock ? 1 : 0,
              transform: showClock ? "scale(1)" : "scale(0.9)",
              transition: "opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              position: showClock ? "relative" : "absolute",
              pointerEvents: "none",
            }}>
              <span style={{
                fontSize: "44px",
                fontWeight: 200,
                color: "white",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {time}
              </span>
              <span style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.25)",
                fontWeight: 300,
                letterSpacing: "0.1em",
                marginTop: "8px",
                textTransform: "uppercase",
              }}>
                {date}
              </span>
            </div>
          </button>
        </div>

        {/* Icon Ring */}
        <AppRing onSelect={handleSelect} active={active} />

        {/* Active Panel */}
        <ActivePanel tool={active} />
      </div>
    </div>
  );
}

// ─── CSS Animations ──────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @keyframes lark-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes lark-orbit-in {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0);
        }
        100% {
          opacity: 1;
          transform: translate(var(--tx), var(--ty)) scale(1);
        }
      }
      @keyframes lark-panel-in {
        0% {
          opacity: 0;
          transform: translateY(-50%) translateX(8px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(-50%) translateX(0) scale(1);
        }
      }
      @keyframes lark-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Placeholder color for dark inputs */
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.35) !important;
      }
      input:focus, textarea:focus {
        box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
      }
      /* Volume slider */
      input[type="range"].lark-vol {
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        outline: none;
        flex: 1;
        cursor: pointer;
      }
      input[type="range"].lark-vol::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #8b5cf6;
        box-shadow: 0 0 6px rgba(139,92,246,0.4);
        cursor: grab;
      }
      input[type="range"].lark-vol::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #8b5cf6;
        border: none;
        cursor: grab;
      }
      /* Progress bar hover knob */
      .lark-progress:hover .lark-knob {
        opacity: 1;
      }
      .lark-progress:hover {
        height: 6px !important;
      }
    `}</style>
  );
}

// ─── Widget Export ────────────────────────────────────────

export default function LarkWidget() {
  const { props, isPending } = useWidget<Props>();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <GlobalStyles />
        <div style={{
          width: "100%",
          height: "460px",
          background: "black",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
        }}>
          <span style={{ fontSize: "56px", lineHeight: 1, animation: "lark-pulse 1.5s ease-in-out infinite" }}>🐥</span>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: "16px", fontWeight: 400, letterSpacing: "0.05em" }}>
            Waking up Lark…
          </p>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <GlobalStyles />
      <LarkApp />
    </McpUseProvider>
  );
}
