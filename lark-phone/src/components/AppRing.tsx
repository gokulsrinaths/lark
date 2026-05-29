import { useState, useEffect } from "react";
import type { ActiveTool } from "../App";

interface Props {
  onSelect: (tool: ActiveTool) => void;
  active: ActiveTool;
  iconsStartMs?: number;
}

export const apps: { id: ActiveTool; label: string; gradient: string; icon: JSX.Element }[] = [
  {
    id: "phone",
    label: "Phone",
    gradient: "from-[#62d84e] to-[#2eb83a]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
      </svg>
    ),
  },
  {
    id: "facetime",
    label: "FaceTime",
    gradient: "from-[#62d84e] to-[#2eb83a]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
      </svg>
    ),
  },
  {
    id: "music",
    label: "Music",
    gradient: "from-[#fc5c7d] to-[#e6233b]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
      </svg>
    ),
  },
  {
    id: "camera",
    label: "Camera",
    gradient: "from-[#6b7280] to-[#374151]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: "video",
    label: "YouTube",
    gradient: "from-[#ff0000] to-[#cc0000]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.68 31.68 0 000 12a31.68 31.68 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.68 31.68 0 0024 12a31.68 31.68 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    gradient: "from-[#34d399] to-[#059669]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Agent Chat",
    gradient: "from-[#a855f7] to-[#7c3aed]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
];

const RADIUS = 140;
const START_ANGLE = -90;
const STAGGER_MS = 80;
const SELECTED_X = 70;
const SELECTED_Y = 0;

export default function AppRing({ onSelect, active, iconsStartMs = 0 }: Props) {
  const [booted, setBooted] = useState(false);
  const count = apps.length;
  const step = 360 / count;

  const totalBootTime = iconsStartMs + count * STAGGER_MS + 500;
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), totalBootTime);
    return () => clearTimeout(t);
  }, [totalBootTime]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {apps.map((app, i) => {
        const angle = START_ANGLE + i * step;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * RADIUS;
        const y = Math.sin(rad) * RADIUS;

        const isSelected = active === app.id;
        const isOther = active !== null && !isSelected;

        const ringX = x;
        const ringY = y;

        let tx: number, ty: number, opacity: number, scale: number;

        if (!active) {
          tx = ringX; ty = ringY; opacity = 1; scale = 1;
        } else if (isSelected) {
          tx = SELECTED_X; ty = SELECTED_Y; opacity = 1; scale = 1.6;
        } else {
          tx = 0; ty = 0; opacity = 0; scale = 0;
        }

        return (
          <div
            key={app.id}
            className="absolute"
            style={{
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
                    "--tx": `calc(-50% + ${ringX}px)`,
                    "--ty": `calc(-50% + ${ringY}px)`,
                    opacity: 0,
                    animation: `orbit-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${iconsStartMs + i * STAGGER_MS}ms forwards`,
                  } as React.CSSProperties),
            }}
          >
            <button
              onClick={() => onSelect(isSelected ? null : app.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`
                  w-[50px] h-[50px] rounded-full bg-gradient-to-b ${app.gradient}
                  flex items-center justify-center
                  group-hover:scale-110 group-active:scale-90
                  transition-transform duration-100 ease-out
                `}
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
              >
                {app.icon}
              </div>
              <span className={`text-[9px] font-medium transition-colors duration-300 ${isSelected ? "text-white/60" : "text-white/25"}`}>{app.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
