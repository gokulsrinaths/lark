import { useState } from "react";

type Status = "idle" | "calling" | "done";

export default function NotesPanel() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");

  const execute = () => {
    if (!text.trim()) return;
    setStatus("calling");
    setResult("");
    setTimeout(() => { setResult("Note saved"); setStatus("done"); setText(""); }, 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write something…"
        rows={3}
        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[13px] font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/10 transition resize-none text-center"
      />
      <button
        onClick={execute}
        disabled={!text.trim() || status === "calling"}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-medium text-[13px] transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {status === "calling" ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : "Save"}
      </button>
      {result && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/10 text-center">
          <p className="text-amber-400 text-[12px]">{result}</p>
        </div>
      )}
    </div>
  );
}
