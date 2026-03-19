"use client";

import { formatRupiah, formatPercent, getPnlColor } from "@/lib/utils";

const StatCard = ({ label, value, subValue, icon, delay }) => (
  <div
    className={`bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in stagger-${delay}`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#1c1c28] flex items-center justify-center text-zinc-500">
        {icon}
      </div>
    </div>
    <p className="text-2xl font-semibold text-white tracking-tight">{value}</p>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
  </div>
);

export default function StatsCards({ trades = [] }) {
  const closedTrades = trades.filter((t) => t.status === "closed");
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
  const winRate =
    closedTrades.length > 0
      ? (winTrades.length / closedTrades.length) * 100
      : 0;

  const avgWin =
    winTrades.length > 0
      ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length
      : 0;
  const lossTrades = closedTrades.filter((t) => (t.pnl || 0) < 0);
  const avgLoss =
    lossTrades.length > 0
      ? Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length)
      : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  const stats = [
    {
      label: "Total P&L",
      value: formatRupiah(totalPnl),
      subValue: `${closedTrades.length} trade selesai`,
      valueClass: getPnlColor(totalPnl),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subValue: `${winTrades.length}W / ${lossTrades.length}L`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "Profit Factor",
      value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
      subValue: `Avg Win: ${formatRupiah(avgWin)}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      label: "Total Trades",
      value: trades.length,
      subValue: `${trades.filter((t) => t.status === "open").length} masih open`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} {...stat} delay={i + 1} />
      ))}
    </div>
  );
}
