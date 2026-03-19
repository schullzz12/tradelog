"use client";

import { formatRupiah, formatDateShort, getPnlColor } from "@/lib/utils";

export default function RecentActivity({ trades = [] }) {
  const recent = [...trades]
    .sort((a, b) => new Date(b.created_at || b.entry_date) - new Date(a.created_at || a.entry_date))
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-medium text-white mb-4">Aktivitas Terbaru</h3>
      <div className="space-y-3">
        {recent.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                  trade.type === "long"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {trade.type === "long" ? "↑" : "↓"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-mono font-medium text-white truncate">
                  {trade.ticker}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {formatDateShort(trade.entry_date)}{" "}
                  <span
                    className={`inline-flex px-1.5 py-0 rounded text-[10px] ${
                      trade.status === "open"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {trade.status === "open" ? "Open" : "Closed"}
                  </span>
                </p>
              </div>
            </div>
            {trade.pnl != null && (
              <span
                className={`text-sm font-mono font-medium shrink-0 ${getPnlColor(
                  trade.pnl
                )}`}
              >
                {formatRupiah(trade.pnl)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
