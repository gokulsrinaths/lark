import { useState } from "react";

type Status = "idle" | "calling" | "done" | "error";
type View = "register" | "agents" | "inbox" | "send";

export default function ChatPanel() {
  const [agentName, setAgentName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [view, setView] = useState<View>("register");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");

  const register = () => {
    if (!agentName.trim()) return;
    setStatus("calling");
    setTimeout(() => { setRegistered(true); setView("agents"); setStatus("done"); }, 1200);
  };

  const sendMsg = () => {
    if (!to.trim() || !message.trim()) return;
    setStatus("calling");
    setResult("");
    setTimeout(() => { setResult(`Sent to ${to}`); setMessage(""); setStatus("done"); }, 1200);
  };

  if (!registered) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && register()}
          placeholder="Your agent name…"
          className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[14px] font-light tracking-wide focus:outline-none focus:ring-1 focus:ring-white/10 transition text-center"
        />
        <button
          onClick={register}
          disabled={!agentName.trim() || status === "calling"}
          className="w-full py-2.5 rounded-xl bg-purple-500 text-white font-medium text-[13px] transition hover:bg-purple-400 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {status === "calling" ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : "Register"}
        </button>
      </div>
    );
  }

  const tabClass = (v: View) =>
    `flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition ${
      view === v
        ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
        : "text-white/35 border border-transparent"
    }`;

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex gap-1">
        <button onClick={() => setView("agents")} className={tabClass("agents")}>Agents</button>
        <button onClick={() => setView("inbox")} className={tabClass("inbox")}>Inbox</button>
        <button onClick={() => setView("send")} className={tabClass("send")}>Send</button>
      </div>

      {view === "agents" && (
        <p className="text-white/30 text-[11px] text-center py-2">
          Tap an agent to message them
        </p>
      )}

      {view === "inbox" && (
        <p className="text-white/30 text-[11px] text-center py-2">
          No new messages
        </p>
      )}

      {view === "send" && (
        <>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To agent…"
            className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[14px] font-light tracking-wide focus:outline-none focus:ring-1 focus:ring-white/10 transition text-center"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message…"
            rows={2}
            className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[13px] font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/10 transition resize-none text-center"
          />
          <button
            onClick={sendMsg}
            disabled={!to.trim() || !message.trim() || status === "calling"}
            className="w-full py-2.5 rounded-xl bg-purple-500 text-white font-medium text-[13px] transition hover:bg-purple-400 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {status === "calling" ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "Send"}
          </button>
        </>
      )}

      {result && (
        <div className="px-3 py-2 rounded-xl bg-purple-500/[0.08] border border-purple-500/10 text-center">
          <p className="text-purple-400 text-[12px]">{result}</p>
        </div>
      )}
    </div>
  );
}
