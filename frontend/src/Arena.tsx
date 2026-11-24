import { useEffect, useRef } from "react";
import type { Seat, Venue } from "./venue";

interface Props {
  venue: Venue;
  active: Seat;
  selected: Seat[];
  inspect: (seat: Seat) => void;
}
export function Arena({ venue, active, selected, inspect }: Props) {
  const base = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const { width, height } = venue.map;
  useEffect(() => {
    const ctx = base.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const section of venue.sections)
      for (const row of section.rows)
        for (const seat of row.seats) {
          ctx.fillStyle = seat.status === "available" ? "#75e5c0" : "#677e89";
          ctx.beginPath();
          ctx.arc(seat.x, seat.y, 3.2, 0, 2 * Math.PI);
          ctx.fill();
        }
  }, [venue, width, height]);
  useEffect(() => {
    const ctx = overlay.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const seat of selected) {
      ctx.fillStyle = "#ffb867";
      ctx.beginPath();
      ctx.arc(seat.x, seat.y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(active.x, active.y, 12, 0, 2 * Math.PI);
    ctx.stroke();
  }, [active, selected, width, height]);
  return (
    <div className="arena">
      <span className="floor" aria-hidden="true">
        Arena floor
      </span>
      <canvas aria-hidden="true" ref={base} width={width} height={height} />
      <canvas
        aria-hidden="true"
        ref={overlay}
        width={width}
        height={height}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) * width) / rect.width;
          const y = ((e.clientY - rect.top) * height) / rect.height;
          let nearest: Seat | undefined;
          let distance = ((10 * width) / rect.width) ** 2;
          for (const section of venue.sections)
            for (const row of section.rows)
              for (const seat of row.seats) {
                const d = (seat.x - x) ** 2 + (seat.y - y) ** 2;
                if (d < distance) {
                  nearest = seat;
                  distance = d;
                }
              }
          if (nearest) inspect(nearest);
        }}
      />
    </div>
  );
}
