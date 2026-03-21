"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatPercent, getPnlColor } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Helpers ──────────────────────────────────────────────────────────

function groupByTicker(trades) {
  const map = {};
  trades.forEach((t) => {
    const key = t.ticker.toUpperCase();
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });

  return Object.entries(map)
    .map(([ticker, positions]) => {
      const totalShares = positions.reduce((s, p) => s + (p.shares || 0), 0);
      const totalCost = positions.reduce(
        (s, p) => s + (p.entry_price || 0) * (p.shares || 0),
        0
      );
      const avgEntry = totalShares > 0 ? totalCost / totalShares : 0;

      // Use enriched _lastPrice from any position (same ticker = same price)
      const lastPrice = positions.find((p) => p._lastPrice)?._lastPrice || null;

      const totalUnrealizedPnl = positions.reduce((s, p) => {
        if (p._unrealizedPnl != null) return s + p._unrealizedPnl;
        if (lastPrice && p.entry_price && p.shares) {
          const isLong = p.type === "long";
          return s + (isLong
            ? (lastPrice - p.entry_price) * p.shares
            : (p.entry_price - lastPrice) * p.shares);
        }
        return s;
      }, 0);

      const totalUnrealizedPct =
        totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0;

      const currentValue = lastPrice
        ? totalShares * lastPrice
        : totalCost;

      return {
        ticker,
        positions,
        totalShares,
        totalLots: Math.round(totalShares / 100),
        avgEntry: Math.round(avgEntry * 100) / 100,
        lastPrice,
        totalCost: Math.round(totalCost),
        currentValue: Math.round(currentValue),
        unrealizedPnl: Math.round(totalUnrealizedPnl),
        unrealizedPct: Math.round(totalUnrealizedPct * 100) / 100,
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue); // Sort by largest position
}

// ── Pie chart (canvas) ──────────────────────────────────────────────

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4",
];

function AllocationChart({ holdings }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || holdings.length === 0) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const total = holdings.reduce((s, h) => s + h.currentValue, 0);
    if (total <= 0) return;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = 80;
    const innerR = 55;
    let startAngle = -Math.PI / 2;

    holdings.forEach((h, i) => {
      const slice = (h.currentValue / total) * 2 * Math.PI;
      const endAngle = startAngle + slice;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 14px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${holdings.length}`, cx, cy - 8);
    ctx.fillStyle = "#71717a";
    ctx.font = "400 11px 'DM Sans', sans-serif";
    ctx.fillText("saham", cx, cy + 10);
  }, [holdings]);

  return <canvas ref={canvasRef} />;
}

// ── Main ────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [trades, setTrades] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicker, setExpandedTicker] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("entry_date", { ascending: false });

      if (!error && data) {
        const enriched = await enrichOpenTrades(data);
        setTrades(enriched);
        setHoldings(groupByTicker(enriched));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Totals
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalUnrealizedPnl = holdings.reduce((s, h) => s + h.unrealizedPnl, 0);
  const totalUnrealizedPct =
    totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat portfolio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Portfolio</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ringkasan posisi saham yang sedang kamu hold
        </p>
      </div>

      {holdings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
            <SummaryCard
              label="Nilai Portfolio"
              value={formatRupiah(totalCurrentValue).replace("+", "")}
              subValue={`Modal: ${formatRupiah(totalCost).replace("+", "")}`}
              icon={<WalletIcon />}
              delay={1}
            />
            <SummaryCard
              label="Unrealized P&L"
              value={formatRupiah(totalUnrealizedPnl)}
              subValue={formatPercent(totalUnrealizedPct)}
              valueClass={getPnlColor(totalUnrealizedPnl)}
              icon={<TrendingIcon />}
              delay={2}
            />
            <SummaryCard
              label="Posisi Aktif"
              value={holdings.length}
              subValue={`${trades.length} transaksi open`}
              icon={<LayersIcon />}
              delay={3}
            />
            <SummaryCard
              label="Terbesar"
              value={holdings[0]?.ticker || "—"}
              subValue={
                holdings[0]
                  ? `${((holdings[0].currentValue / totalCurrentValue) * 100).toFixed(1)}% dari portfolio`
                  : ""
              }
              icon={<StarIcon />}
              delay={4}
            />
          </div>

          {/* Allocation + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Pie chart */}
            <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
              <h3 className="text-sm font-medium text-white mb-4">Alokasi</h3>
              <div className="flex justify-center mb-4">
                <AllocationChart holdings={holdings} />
              </div>
              <div className="space-y-2">
                {holdings.map((h, i) => {
                  const pct =
                    totalCurrentValue > 0
                      ? ((h.currentValue / totalCurrentValue) * 100).toFixed(1)
                      : 0;
                  return (
                    <div key={h.ticker} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="font-mono font-semibold text-zinc-300">
                          {h.ticker}
                        </span>
                      </div>
                      <span className="text-zinc-500">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Holdings table */}
            <div className="lg:col-span-3 bg-[#16161f] border border-[#2a2a3a] rounded-xl overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#111118]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Saham
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Lot
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Avg Entry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Harga Skrg
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Nilai
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        P&L
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        %
                      </th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a3a]">
                    {holdings.map((h, i) => (
                      <HoldingRow
                        key={h.ticker}
                        holding={h}
                        index={i}
                        expanded={expandedTicker === h.ticker}
                        onToggle={() =>
                          setExpandedTicker(
                            expandedTicker === h.ticker ? null : h.ticker
                          )
                        }
                        router={router}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Holding row with expand ─────────────────────────────────────────

function HoldingRow({ holding, index, expanded, onToggle, router }) {
  const h = holding;
  return (
    <>
      <tr
        onClick={onToggle}
        className="hover:bg-[#1c1c28] transition-colors cursor-pointer group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm font-mono font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {h.ticker}
            </span>
            {h.positions.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {h.positions.length} posisi
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-mono text-zinc-300">
          {h.totalLots.toLocaleString("id-ID")}
        </td>
        <td className="px-4 py-3 text-sm font-mono text-zinc-300">
          {h.avgEntry.toLocaleString("id-ID")}
        </td>
        <td className="px-4 py-3 text-sm font-mono text-zinc-300">
          {h.lastPrice ? (
            <span className="inline-flex items-center gap-1.5">
              {h.lastPrice.toLocaleString("id-ID")}
              <span className="text-[10px] text-zinc-600">live</span>
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-3 text-sm font-mono text-zinc-300">
          {formatRupiah(h.currentValue).replace("+", "")}
        </td>
        <td className={`px-4 py-3 text-sm font-mono font-medium ${getPnlColor(h.unrealizedPnl)}`}>
          {formatRupiah(h.unrealizedPnl)}
        </td>
        <td className={`px-4 py-3 text-sm font-mono font-medium ${getPnlColor(h.unrealizedPct)}`}>
          {formatPercent(h.unrealizedPct)}
        </td>
        <td className="px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-zinc-600 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </td>
      </tr>

      {/* Expanded detail rows */}
      {expanded &&
        h.positions.map((pos) => {
          const isLong = pos.type === "long";
          const pnl = pos._unrealizedPnl;
          const pct = pos._unrealizedPct;
          return (
            <tr
              key={pos.id}
              onClick={() => router.push(`/trades/${pos.id}`)}
              className="bg-[#111118] hover:bg-[#1a1a26] transition-colors cursor-pointer"
            >
              <td className="px-4 py-2.5 pl-10">
                <span className="text-xs text-zinc-500">
                  {new Date(pos.entry_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">
                {pos.shares ? (pos.shares / 100).toLocaleString("id-ID") : "—"}
              </td>
              <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">
                {pos.entry_price?.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">
                {pos._lastPrice?.toLocaleString("id-ID") || "—"}
              </td>
              <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">
                {pos._lastPrice && pos.shares
                  ? formatRupiah(pos._lastPrice * pos.shares).replace("+", "")
                  : "—"}
              </td>
              <td className={`px-4 py-2.5 text-xs font-mono font-medium ${getPnlColor(pnl)}`}>
                {pnl != null ? formatRupiah(pnl) : "—"}
              </td>
              <td className={`px-4 py-2.5 text-xs font-mono font-medium ${getPnlColor(pct)}`}>
                {pct != null ? formatPercent(pct) : "—"}
              </td>
              <td className="px-4 py-2.5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-700"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </td>
            </tr>
          );
        })}
    </>
  );
}

// ── Empty state ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-[#1c1c28] flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-zinc-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <p className="text-zinc-400 text-sm mb-1">Belum ada posisi open</p>
      <p className="text-zinc-600 text-xs mb-4">
        Tambah trade baru untuk mulai tracking portfolio kamu
      </p>
      <Link
        href="/trades/new"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        + Trade Baru
      </Link>
    </div>
  );
}

// ── Summary card ────────────────────────────────────────────────────

function SummaryCard({ label, value, subValue, icon, delay, valueClass }) {
  return (
    <div className={`bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in stagger-${delay}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-[#1c1c28] flex items-center justify-center text-zinc-500">
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${valueClass || "text-white"}`}>
        {value}
      </p>
      {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ── Enrich open trades (same logic as dashboard) ────────────────────

async function enrichOpenTrades(trades) {
  const openTrades = trades.filter((t) => t.status === "open");
  if (openTrades.length === 0) return trades;

  const uniqueTickers = [
    ...new Set(openTrades.map((t) => t.ticker.toUpperCase())),
  ];

  const priceMap = {};
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 24 * 60 * 60;

  await Promise.all(
    uniqueTickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `/api/chart-data?ticker=${ticker}.JK&period1=${weekAgo}&period2=${now}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) {
          priceMap[ticker] = data[data.length - 1].close;
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${ticker}:`, err);
      }
    })
  );

  return trades.map((trade) => {
    if (trade.status !== "open") return trade;

    const lastPrice = priceMap[trade.ticker.toUpperCase()];
    if (!lastPrice || !trade.entry_price || !trade.shares) return trade;

    const isLong = trade.type === "long";
    const unrealizedPnl = isLong
      ? (lastPrice - trade.entry_price) * trade.shares
      : (trade.entry_price - lastPrice) * trade.shares;
    const unrealizedPct = isLong
      ? ((lastPrice - trade.entry_price) / trade.entry_price) * 100
      : ((trade.entry_price - lastPrice) / trade.entry_price) * 100;

    return {
      ...trade,
      _lastPrice: lastPrice,
      _unrealizedPnl: Math.round(unrealizedPnl),
      _unrealizedPct: Math.round(unrealizedPct * 100) / 100,
    };
  });
}
