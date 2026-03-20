"use client";

import { useState } from "react";
import { formatRupiah, formatPercent, formatDate, getPnlColor } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TradeTable({ trades = [], limit }) {
  const [sortField, setSortField] = useState("entry_date");
  const [sortDir, setSortDir] = useState("desc");
  const router = useRouter();

  const sorted = [...trades].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (sortDir === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const displayed = limit ? sorted.slice(0, limit) : sorted;

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const SortHeader = ({ field, children, className = "" }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-emerald-400">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </th>
  );

  if (trades.length === 0) {
    return (
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-12 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-[#1c1c28] flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-zinc-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        </div>
        <p className="text-zinc-400 text-sm mb-1">Belum ada trade</p>
        <p className="text-zinc-600 text-xs mb-4">Mulai catat trade pertama kamu</p>
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Trade Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#111118]">
            <tr>
              <SortHeader field="entry_date">Tanggal</SortHeader>
              <SortHeader field="ticker">Saham</SortHeader>
              <SortHeader field="type">Tipe</SortHeader>
              <SortHeader field="entry_price">Entry</SortHeader>
              <SortHeader field="exit_price">Exit</SortHeader>
              <SortHeader field="shares">Lot</SortHeader>
              <SortHeader field="pnl">P&L</SortHeader>
              <SortHeader field="pnl_percent">%</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a3a]">
            {displayed.map((trade) => {
              // Use unrealized P&L for open trades if available
              const isOpen = trade.status === "open";
              const displayPnl = isOpen ? trade._unrealizedPnl : trade.pnl;
              const displayPct = isOpen ? trade._unrealizedPct : trade.pnl_percent;
              const displayExit = isOpen ? trade._lastPrice : trade.exit_price;

              return (
                <tr
                  key={trade.id}
                  onClick={() => router.push(`/trades/${trade.id}`)}
                  className="hover:bg-[#1c1c28] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">
                    {formatDate(trade.entry_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {trade.ticker}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        trade.type === "long"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {trade.type === "long" ? "Long" : "Short"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-zinc-300">
                    {trade.entry_price?.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-zinc-300">
                    {displayExit ? (
                      <span className="inline-flex items-center gap-1.5">
                        {displayExit.toLocaleString("id-ID")}
                        {isOpen && trade._lastPrice && (
                          <span className="text-[10px] text-zinc-600 font-normal">live</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-zinc-300">
                    {trade.shares ? (trade.shares / 100).toFixed(0) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono font-medium ${getPnlColor(displayPnl)}`}>
                    {displayPnl != null ? (
                      <span className="inline-flex items-center gap-1.5">
                        {formatRupiah(displayPnl)}
                        {isOpen && trade._unrealizedPnl != null && (
                          <span className="text-[10px] text-zinc-600 font-normal">unrl</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono font-medium ${getPnlColor(displayPct)}`}>
                    {displayPct != null ? (
                      <span className="inline-flex items-center gap-1.5">
                        {formatPercent(displayPct)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        trade.status === "open"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {trade.status === "open" ? "Open" : "Closed"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {limit && trades.length > limit && (
        <div className="p-4 border-t border-[#2a2a3a] text-center">
          <Link
            href="/trades"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Lihat semua {trades.length} trade →
          </Link>
        </div>
      )}
    </div>
  );
}
