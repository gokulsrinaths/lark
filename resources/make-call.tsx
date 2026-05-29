import { useState, useEffect } from "react";
import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

const propSchema = z.object({
  status: z.string(),
  callSid: z.string(),
  to: z.string(),
  from: z.string(),
  message: z.string(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display phone call status and details",
  props: propSchema,
};

type Props = z.infer<typeof propSchema>;

function PhoneIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function CheckIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SignalIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
    </svg>
  );
}

function CopyIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// Pending state — animated calling screen
function CallingView() {
  const theme = useWidgetTheme();
  const isDark = theme === "dark";

  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 32px",
      fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
      background: isDark
        ? "linear-gradient(160deg, #0a0f1a 0%, #0d1425 40%, #0f1a2e 100%)"
        : "linear-gradient(160deg, #f8fafc 0%, #f0f4ff 40%, #eef2ff 100%)",
      borderRadius: "20px",
      minWidth: "360px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes mc-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes mc-pulse-ring-delay {
          0% { transform: scale(1); opacity: 0; }
          25% { transform: scale(1); opacity: 0.4; }
          75% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes mc-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mc-wave-1 {
          0%, 100% { height: 8px; }
          50% { height: 20px; }
        }
        @keyframes mc-wave-2 {
          0%, 100% { height: 12px; }
          50% { height: 28px; }
        }
        @keyframes mc-wave-3 {
          0%, 100% { height: 6px; }
          50% { height: 16px; }
        }
      `}</style>

      {/* Animated pulse rings */}
      <div style={{ position: "relative", marginBottom: "28px" }}>
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          border: `2px solid ${isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(16, 185, 129, 0.25)"}`,
          animation: "mc-pulse-ring 2s ease-out infinite",
        }} />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          border: `2px solid ${isDark ? "rgba(52, 211, 153, 0.2)" : "rgba(16, 185, 129, 0.15)"}`,
          animation: "mc-pulse-ring-delay 2s ease-out infinite 0.6s",
        }} />

        <div style={{
          width: "88px",
          height: "88px",
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)"
            : "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDark
            ? "0 0 40px rgba(16, 185, 129, 0.35), 0 0 80px rgba(16, 185, 129, 0.15)"
            : "0 0 30px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1)",
          animation: "mc-bob 2.5s ease-in-out infinite",
          position: "relative",
          zIndex: 1,
        }}>
          <PhoneIcon size={36} color="white" />
        </div>
      </div>

      {/* Audio wave bars */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "20px",
        height: "32px",
      }}>
        {[1, 2, 3, 2, 1].map((_, i) => (
          <div key={i} style={{
            width: "3px",
            borderRadius: "2px",
            background: isDark
              ? "linear-gradient(to top, rgba(52, 211, 153, 0.4), rgba(52, 211, 153, 0.8))"
              : "linear-gradient(to top, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.7))",
            animation: `mc-wave-${(i % 3) + 1} 1.2s ease-in-out infinite ${i * 0.15}s`,
          }} />
        ))}
      </div>

      <p style={{
        fontSize: "18px",
        fontWeight: 600,
        color: isDark ? "#e2e8f0" : "#1e293b",
        margin: 0,
        letterSpacing: "-0.01em",
      }}>
        Placing call{".".repeat(dotCount)}
      </p>
      <p style={{
        fontSize: "13px",
        color: isDark ? "#64748b" : "#94a3b8",
        margin: "8px 0 0",
        fontWeight: 500,
      }}>
        Connecting via Twilio
      </p>
    </div>
  );
}

// Success state — call confirmed
function CallConfirmedView({ props }: { props: Props }) {
  const theme = useWidgetTheme();
  const isDark = theme === "dark";
  const [visible, setVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const bg = isDark
    ? "linear-gradient(160deg, #0a0f1a 0%, #0d1425 40%, #0f1a2e 100%)"
    : "linear-gradient(160deg, #f8fafc 0%, #f0f4ff 40%, #eef2ff 100%)";

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const labelColor = isDark ? "#64748b" : "#94a3b8";
  const valueColor = isDark ? "#e2e8f0" : "#1e293b";
  const dimColor = isDark ? "#475569" : "#cbd5e1";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "36px 28px 32px",
      fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
      background: bg,
      borderRadius: "20px",
      minWidth: "360px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
    }}>
      <style>{`
        @keyframes mc-check-draw {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes mc-scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mc-live-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Success icon */}
      <div style={{
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        background: isDark
          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
          : "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
        boxShadow: isDark
          ? "0 0 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "0 0 24px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
        animation: "mc-scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}>
        <CheckIcon size={28} color="white" />
      </div>

      <h2 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: valueColor,
        margin: "0 0 4px",
        letterSpacing: "-0.02em",
      }}>
        Call Initiated
      </h2>
      <p style={{
        fontSize: "13px",
        color: labelColor,
        margin: "0 0 24px",
        fontWeight: 500,
      }}>
        Your call is being connected
      </p>

      {/* Call details card */}
      <div style={{
        width: "100%",
        background: cardBg,
        borderRadius: "14px",
        border: `1px solid ${cardBorder}`,
        overflow: "hidden",
        marginBottom: "16px",
        backdropFilter: "blur(8px)",
      }}>
        {/* To */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
        }}>
          <span style={{ fontSize: "12px", color: labelColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Calling
          </span>
          <span style={{ fontSize: "15px", color: valueColor, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>
            {props.to}
          </span>
        </div>

        <div style={{ height: "1px", background: cardBorder, margin: "0 18px" }} />

        {/* From */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
        }}>
          <span style={{ fontSize: "12px", color: labelColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            From
          </span>
          <span style={{ fontSize: "15px", color: valueColor, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>
            {props.from}
          </span>
        </div>

        <div style={{ height: "1px", background: cardBorder, margin: "0 18px" }} />

        {/* Message */}
        <div style={{
          padding: "14px 18px",
        }}>
          <span style={{ fontSize: "12px", color: labelColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
            Message
          </span>
          <div style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: isDark ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.06)",
            border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.1)"}`,
          }}>
            <p style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.55,
              color: isDark ? "#d1fae5" : "#065f46",
              fontStyle: "italic",
            }}>
              "{props.message}"
            </p>
          </div>
        </div>
      </div>

      {/* Call SID */}
      <div
        onClick={() => handleCopy(props.callSid, "sid")}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderRadius: "10px",
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
          cursor: "pointer",
          transition: "background 0.15s ease",
          marginBottom: "20px",
        }}
      >
        <span style={{ fontSize: "11px", color: dimColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Call SID
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "11px",
            color: dimColor,
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {props.callSid}
          </span>
          {copiedField === "sid" ? (
            <CheckIcon size={12} color={isDark ? "#10b981" : "#059669"} />
          ) : (
            <CopyIcon size={12} color={dimColor} />
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 18px",
        borderRadius: "100px",
        background: isDark
          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
          : "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.06))",
        border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)"}`,
      }}>
        <div style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: "#10b981",
          animation: "mc-live-dot 2s ease-in-out infinite",
          boxShadow: "0 0 6px rgba(16, 185, 129, 0.5)",
        }} />
        <SignalIcon size={14} color={isDark ? "#34d399" : "#059669"} />
        <span style={{
          fontSize: "12px",
          color: isDark ? "#34d399" : "#059669",
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}>
          {props.status}
        </span>
      </div>
    </div>
  );
}

export default function MakeCall() {
  const { props, isPending } = useWidget<Props>();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <CallingView />
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <CallConfirmedView props={props} />
    </McpUseProvider>
  );
}
