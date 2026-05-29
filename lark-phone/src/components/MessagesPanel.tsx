import { useState } from "react";

type Status = "idle" | "calling" | "done";

export default function MessagesPanel() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");

  const execute = () => {
    if (!to.trim() || !message.trim()) return;
    setStatus("calling");
    setResult("");
    setTimeout(() => { setResult(`Sent to ${to}`); setStatus("done"); setMessage(""); }, 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Contact or number…"
        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[14px] font-light tracking-wide focus:outline-none focus:ring-1 focus:ring-white/10 transition text-center"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message…"
        rows={2}
        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[13px] font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/10 transition resize-none text-center"
      />
      <button
        onClick={execute}
        disabled={!to.trim() || !message.trim() || status === "calling"}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-medium text-[13px] transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {status === "calling" ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : "Send"}
      </button>
      {result && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10 text-center">
          <p className="text-emerald-400 text-[12px]">{result}</p>
        </div>
      )}
    </div>
  );
}
