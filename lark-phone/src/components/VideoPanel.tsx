import { useState } from "react";

type Status = "idle" | "calling" | "done";

export default function VideoPanel() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");
  const [playing, setPlaying] = useState<{ title: string; videoId: string } | null>(null);

  const search = () => {
    if (!query.trim()) return;
    setStatus("calling");
    setResult("");
    setPlaying(null);
    setTimeout(() => {
      setPlaying({ title: query, videoId: "dQw4w9WgXcQ" });
      setResult(`Playing: "${query}"`);
      setStatus("done");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
        placeholder="Search YouTube…"
        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.05] text-white placeholder:text-white/15 text-[14px] font-light tracking-wide focus:outline-none focus:ring-1 focus:ring-white/10 transition text-center"
      />
      <button
        onClick={search}
        disabled={!query.trim() || status === "calling"}
        className="w-full py-2.5 rounded-xl bg-red-600 text-white font-medium text-[13px] transition hover:bg-red-500 active:scale-[0.98] disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {status === "calling" ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : "Search"}
      </button>

      {playing && (
        <div className="rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06]">
          <div className="relative">
            <img
              src={`https://i.ytimg.com/vi/${playing.videoId}/hqdefault.jpg`}
              alt=""
              className="w-full aspect-video object-cover opacity-85"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-white text-[11px] font-medium truncate">{playing.title}</p>
          </div>
        </div>
      )}

      {result && !playing && (
        <div className="px-3 py-2 rounded-xl bg-red-500/[0.08] border border-red-500/10 text-center">
          <p className="text-red-400 text-[12px]">{result}</p>
        </div>
      )}
    </div>
  );
}
