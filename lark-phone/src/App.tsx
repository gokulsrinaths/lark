import { useState, useEffect, useRef } from "react";
import AppRing from "./components/AppRing";

export type ActiveTool = "phone" | "facetime" | "music" | "video" | "camera" | "messages" | "chat" | null;

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const ICONS_START = 500;

export default function App() {
  const [active, setActive] = useState<ActiveTool>(null);
  const [showClock, setShowClock] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useLiveClock();

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
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      <div className="relative">
        {/* ── Logo ── */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            transform: active ? "translateX(-70px) scale(1.3)" : "translateX(0) scale(1)",
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button
            onClick={handleLogoClick}
            className="focus:outline-none active:scale-95 transition-transform duration-100 relative z-10"
          >
            <div
              className="flex flex-col items-center gap-2"
              style={{
                opacity: showClock ? 0 : 1,
                transform: showClock ? "scale(0.8)" : "scale(1)",
                transition: "opacity 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                position: showClock ? "absolute" : "relative",
                left: showClock ? "50%" : undefined,
                top: showClock ? "50%" : undefined,
                marginLeft: showClock ? "-28px" : undefined,
                marginTop: showClock ? "-44px" : undefined,
                pointerEvents: showClock ? "none" : "auto",
              }}
            >
              <span className="text-[56px] leading-none">🐦</span>
            </div>
            <div
              className="flex flex-col items-center"
              style={{
                opacity: showClock ? 1 : 0,
                transform: showClock ? "scale(1)" : "scale(0.9)",
                transition: "opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                position: showClock ? "relative" : "absolute",
                pointerEvents: "none",
              }}
            >
              <h1 className="text-[48px] font-extralight text-white tracking-tight leading-none tabular-nums">
                {time}
              </h1>
              <p className="text-[13px] text-white/25 font-light tracking-widest mt-2 uppercase">{date}</p>
            </div>
          </button>
        </div>

        {/* ── Icon ring ── */}
        <AppRing onSelect={handleSelect} active={active} iconsStartMs={ICONS_START} />
      </div>
    </div>
  );
}
