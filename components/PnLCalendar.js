"use client";

import { useState, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  return { startDayOfWeek, daysInMonth };
}

export default function PnLCalendar({ trades = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Aggregate PnL per day
  const dailyPnl = useMemo(() => {
    const map = {};
    trades
      .filter((t) => t.status === "closed" && t.exit_date)
      .forEach((t) => {
        const dateKey = t.exit_date.split("T")[0];
        map[dateKey] = (map[dateKey] || 0) + (t.pnl || 0);
      });
    return map;
  }, [trades]);

  const { startDayOfWeek, daysInMonth } = getMonthData(year, month);

  const maxAbsPnl = useMemo(() => {
    const vals = Object.values(dailyPnl).map(Math.abs);
    return Math.max(...vals, 1);
  }, [dailyPnl]);

  function getColorForPnl(pnl) {
    if (pnl == null || pnl === 0) return "bg-[#1c1c28]";
    const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
    if (pnl > 0) {
      if (intensity > 0.6) return "bg-emerald-500/60";
      if (intensity > 0.3) return "bg-emerald-500/30";
      return "bg-emerald-500/15";
    }
    if (intensity > 0.6) return "bg-red-500/60";
    if (intensity > 0.3) return "bg-red-500/30";
    return "bg-red-500/15";
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const cells = [];
  // Empty cells before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const pnl = dailyPnl[dateKey] || null;
    const color = getColorForPnl(pnl);
    const isToday =
      new Date().toISOString().split("T")[0] === dateKey;

    cells.push(
      <div
        key={dateKey}
        className={`aspect-square rounded-md ${color} flex flex-col items-center justify-center relative group cursor-default transition-colors ${
          isToday ? "ring-1 ring-emerald-500/40" : ""
        }`}
      >
        <span className="text-xs text-zinc-400">{day}</span>
        {pnl != null && pnl !== 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#111118] border border-[#2a2a3a] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
            <p className="text-xs text-zinc-400">{dateKey}</p>
            <p
              className={`text-sm font-mono font-semibold ${
                pnl > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatRupiah(pnl)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Kalender P&L</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md hover:bg-[#1c1c28] text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm text-zinc-300 font-medium min-w-[100px] text-center">
            {MONTHS_ID[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-[#1c1c28] text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAYS_ID.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-zinc-600 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">{cells}</div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/40" />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1c1c28]" />
          <span>No trade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/40" />
          <span>Profit</span>
        </div>
      </div>
    </div>
  );
}
