"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatPercent, getPnlColor } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ── Helpers ──────────────────────────────────────────────────────────

function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day of month
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    label: start.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    shortLabel: start.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
  };
}

function filterTradesByMonth(trades, startDate, endDate) {
  return trades.filter((t) => {
    if (t.status === "closed" && t.exit_date) {
      return t.exit_date >= startDate && t.exit_date <= endDate;
    }
    return t.entry_date >= startDate && t.entry_date <= endDate;
  });
}

function computeStats(trades) {
  const closed = trades.filter((t) => t.status === "closed");
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = closed.filter((t) => (t.pnl || 0) > 0);
  const losses = closed.filter((t) => (t.pnl || 0) < 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const bestTrade = closed.length > 0 ? closed.reduce((a, b) => ((a.pnl || 0) > (b.pnl || 0) ? a : b)) : null;
  const worstTrade = closed.length > 0 ? closed.reduce((a, b) => ((a.pnl || 0) < (b.pnl || 0) ? a : b)) : null;

  // Top 3 best
  const top3 = [...closed].sort((a, b) => (b.pnl || 0) - (a.pnl || 0)).slice(0, 3);
  // Worst 3
  const worst3 = [...closed].sort((a, b) => (a.pnl || 0) - (b.pnl || 0)).slice(0, 3);

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    totalPnl,
    winRate,
    wins: wins.length,
    losses: losses.length,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade,
    worstTrade,
    top3,
    worst3,
  };
}

function calculateGrade(stats) {
  // Grade based on: win rate (40%), profit factor (30%), consistency (30%)
  let score = 0;

  // Win rate score (0-40)
  if (stats.winRate >= 70) score += 40;
  else if (stats.winRate >= 60) score += 32;
  else if (stats.winRate >= 50) score += 24;
  else if (stats.winRate >= 40) score += 16;
  else score += 8;

  // Profit factor score (0-30)
  const pf = stats.profitFactor === Infinity ? 5 : stats.profitFactor;
  if (pf >= 3) score += 30;
  else if (pf >= 2) score += 24;
  else if (pf >= 1.5) score += 18;
  else if (pf >= 1) score += 12;
  else score += 4;

  // Consistency: positive P&L = 30, break even = 15, negative = 5
  if (stats.totalPnl > 0) score += 30;
  else if (stats.totalPnl === 0) score += 15;
  else score += 5;

  if (score >= 85) return { grade: "A+", label: "Luar Biasa", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", emoji: "🏆" };
  if (score >= 75) return { grade: "A", label: "Sangat Bagus", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", emoji: "⭐" };
  if (score >= 65) return { grade: "B+", label: "Bagus", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", emoji: "👍" };
  if (score >= 55) return { grade: "B", label: "Cukup Bagus", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", emoji: "📈" };
  if (score >= 45) return { grade: "C+", label: "Cukup", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", emoji: "📊" };
  if (score >= 35) return { grade: "C", label: "Perlu Perbaikan", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", emoji: "💪" };
  return { grade: "D", label: "Evaluasi Serius", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", emoji: "🔍" };
}

// ── Mini bar chart (canvas) ─────────────────────────────────────────

function DailyPnlChart({ trades }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const closed = trades.filter((t) => t.status === "closed" && t.exit_date);
    if (closed.length === 0) return;

    // Group by exit_date
    const dailyMap = {};
    closed.forEach((t) => {
      const d = t.exit_date;
      dailyMap[d] = (dailyMap[d] || 0) + (t.pnl || 0);
    });

    const days = Object.keys(dailyMap).sort();
    const values = days.map((d) => dailyMap[d]);
    const maxAbs = Math.max(...values.map(Math.abs), 1);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const midY = h / 2;
    const barWidth = Math.max(4, Math.min(20, (w - 20) / days.length - 2));
    const gap = 2;
    const totalWidth = days.length * (barWidth + gap);
    const startX = (w - totalWidth) / 2;

    // Zero line
    ctx.strokeStyle = "#2a2a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    values.forEach((val, i) => {
      const x = startX + i * (barWidth + gap);
      const barH = (Math.abs(val) / maxAbs) * (h / 2 - 8);
      const y = val >= 0 ? midY - barH : midY;

      ctx.fillStyle = val >= 0 ? "#10b981" : "#ef4444";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    });
  }, [trades]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: "120px" }}
    />
  );
}

// ── Gauge / Score Ring ──────────────────────────────────────────────

function ScoreRing({ grade, gradeInfo }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = 140;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 58;
    const lineWidth = 8;

    // Map grade to fill percentage
    const gradeMap = { "A+": 0.95, A: 0.85, "B+": 0.75, B: 0.65, "C+": 0.55, C: 0.45, D: 0.25 };
    const fill = gradeMap[grade] || 0.5;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#2a2a3a";
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Colored ring
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + fill * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    const colorMap = {
      "text-emerald-400": "#34d399",
      "text-blue-400": "#60a5fa",
      "text-amber-400": "#fbbf24",
      "text-red-400": "#f87171",
    };
    ctx.strokeStyle = colorMap[gradeInfo.color] || "#34d399";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }, [grade, gradeInfo]);

  return <canvas ref={canvasRef} />;
}

// ── Main ────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [topStocks, setTopStocks] = useState(null);
  const [topStocksLoading, setTopStocksLoading] = useState(false);
  const [topStocksError, setTopStocksError] = useState(null);
  const [ihsgData, setIhsgData] = useState(null);
  const router = useRouter();

  async function fetchTopStocks() {
    setTopStocksLoading(true);
    setTopStocksError(null);
    try {
      const res = await fetch("/api/top-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth + 1, year: selectedYear }),
      });
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setTopStocks(data);
    } catch (err) {
      setTopStocksError(err.message);
    }
    setTopStocksLoading(false);
  }

  // Reset top stocks and IHSG when month changes
  useEffect(() => {
    setTopStocks(null);
    setTopStocksError(null);
    setIhsgData(null);
  }, [selectedMonth, selectedYear]);

  // Fetch IHSG monthly return
  useEffect(() => {
    async function fetchIHSG() {
      try {
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const now = new Date();
        const end = monthEnd > now ? now : monthEnd;

        const period1 = Math.floor(monthStart.getTime() / 1000) - 86400; // 1 day before to get prev close
        const period2 = Math.floor(end.getTime() / 1000) + 86400;

        const res = await fetch(
          `/api/chart-data?ticker=%5EJKSE&period1=${period1}&period2=${period2}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length >= 2) {
          const startClose = data[0].close;
          const endClose = data[data.length - 1].close;
          const returnPct = ((endClose - startClose) / startClose) * 100;
          setIhsgData({
            startPrice: startClose,
            endPrice: endClose,
            returnPct: Math.round(returnPct * 100) / 100,
          });
        }
      } catch (err) {
        console.error("Failed to fetch IHSG:", err);
      }
    }
    fetchIHSG();
  }, [selectedMonth, selectedYear]);

  // Check if current month — if today is before end of month, show last month by default
  useEffect(() => {
    const now = new Date();
    // Default to previous month if we're in first 5 days
    if (now.getDate() <= 5 && now.getMonth() > 0) {
      setSelectedMonth(now.getMonth() - 1);
    } else if (now.getDate() <= 5 && now.getMonth() === 0) {
      setSelectedMonth(11);
      setSelectedYear(now.getFullYear() - 1);
    }
  }, []);

  useEffect(() => {
    async function fetchTrades() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      if (!error && data) setAllTrades(data);
      setLoading(false);
    }
    fetchTrades();
  }, []);

  const current = getMonthRange(selectedYear, selectedMonth);
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prev = getMonthRange(prevYear, prevMonth);

  const currentTrades = filterTradesByMonth(allTrades, current.start, current.end);
  const prevTrades = filterTradesByMonth(allTrades, prev.start, prev.end);

  const stats = computeStats(currentTrades);
  const prevStats = computeStats(prevTrades);
  const gradeInfo = calculateGrade(stats);

  // Navigation
  function goToPrev() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }
  function goToNext() {
    const now = new Date();
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    // Don't go beyond current month
    if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth())) return;
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  }

  const isCurrentMonth =
    selectedYear === new Date().getFullYear() &&
    selectedMonth === new Date().getMonth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat rapot...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header with month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-white">Rapot Bulanan</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Evaluasi performa trading kamu setiap bulan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            className="p-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-medium text-white min-w-[140px] text-center">
            {current.label}
          </span>
          <button
            onClick={goToNext}
            disabled={isCurrentMonth}
            className={`p-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] transition-colors ${
              isCurrentMonth
                ? "text-zinc-700 cursor-not-allowed"
                : "text-zinc-400 hover:text-white hover:bg-[#1c1c28]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {stats.closedTrades === 0 && currentTrades.length === 0 ? (
        <EmptyMonth label={current.label} />
      ) : (
        <>
          {/* Grade Card + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Grade */}
            <div className={`bg-[#16161f] border rounded-xl p-6 flex flex-col items-center justify-center ${gradeInfo.bg}`}>
              <ScoreRing grade={gradeInfo.grade} gradeInfo={gradeInfo} />
              <div className="text-center mt-3">
                <span className="text-3xl font-bold mr-2">{gradeInfo.emoji}</span>
                <span className={`text-4xl font-bold ${gradeInfo.color}`}>
                  {gradeInfo.grade}
                </span>
              </div>
              <p className={`text-sm mt-1 ${gradeInfo.color}`}>{gradeInfo.label}</p>
              <p className="text-xs text-zinc-600 mt-2 text-center">
                Berdasarkan win rate, profit factor &amp; konsistensi
              </p>
            </div>

            {/* Summary Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MiniStat
                label="Total P&L"
                value={formatRupiah(stats.totalPnl)}
                valueClass={getPnlColor(stats.totalPnl)}
                change={stats.totalPnl - prevStats.totalPnl}
                prevLabel={prev.shortLabel}
              />
              <MiniStat
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                change={stats.winRate - prevStats.winRate}
                changeFormat="pct"
                prevLabel={prev.shortLabel}
              />
              <MiniStat
                label="Profit Factor"
                value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                change={
                  stats.profitFactor === Infinity || prevStats.profitFactor === Infinity
                    ? null
                    : stats.profitFactor - prevStats.profitFactor
                }
                changeFormat="decimal"
                prevLabel={prev.shortLabel}
              />
              <MiniStat
                label="Total Trade"
                value={stats.closedTrades}
                change={stats.closedTrades - prevStats.closedTrades}
                changeFormat="num"
                prevLabel={prev.shortLabel}
              />
              <MiniStat
                label="Win / Loss"
                value={`${stats.wins}W / ${stats.losses}L`}
              />
              <MiniStat
                label="Avg Win"
                value={formatRupiah(stats.avgWin)}
                valueClass="text-emerald-400"
              />
            </div>
          </div>

          {/* Daily P&L chart */}
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
            <h3 className="text-sm font-medium text-white mb-3">P&L Harian</h3>
            {stats.closedTrades > 0 ? (
              <DailyPnlChart trades={currentTrades} />
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">Belum ada trade yang di-close bulan ini</p>
            )}
          </div>

          {/* Portfolio vs IHSG */}
          <PortfolioVsIHSG
            stats={stats}
            ihsgData={ihsgData}
            monthLabel={current.label}
          />

          {/* Top & Worst Trades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 3 */}
            <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏆</span>
                <h3 className="text-sm font-medium text-white">Top Trades</h3>
              </div>
              {stats.top3.length > 0 ? (
                <div className="space-y-3">
                  {stats.top3.map((trade, i) => (
                    <TradeRow
                      key={trade.id}
                      trade={trade}
                      rank={i + 1}
                      type="win"
                      onClick={() => router.push(`/trades/${trade.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 text-center py-6">Belum ada winning trade</p>
              )}
            </div>

            {/* Worst 3 */}
            <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📉</span>
                <h3 className="text-sm font-medium text-white">Worst Trades</h3>
              </div>
              {stats.worst3.length > 0 && stats.worst3[0]?.pnl < 0 ? (
                <div className="space-y-3">
                  {stats.worst3
                    .filter((t) => (t.pnl || 0) < 0)
                    .map((trade, i) => (
                      <TradeRow
                        key={trade.id}
                        trade={trade}
                        rank={i + 1}
                        type="loss"
                        onClick={() => router.push(`/trades/${trade.id}`)}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="text-2xl">🎉</span>
                  <p className="text-xs text-zinc-500 mt-2">Tidak ada losing trade!</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Saham Bulan Ini */}
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <div>
                  <h3 className="text-sm font-medium text-white">
                    Top 5 Saham {current.label}
                  </h3>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Saham IDX dengan kenaikan terbesar bulan ini
                  </p>
                </div>
              </div>
              {!topStocks && !topStocksLoading && (
                <button
                  onClick={fetchTopStocks}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  Lihat Top Saham
                </button>
              )}
            </div>

            {topStocksLoading && (
              <TopStocksSkeleton />
            )}

            {topStocksError && (
              <div className="text-center py-6">
                <p className="text-xs text-red-400 mb-2">{topStocksError}</p>
                <button
                  onClick={fetchTopStocks}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {topStocks && topStocks.stocks && topStocks.stocks.length > 0 && (
              <div className="space-y-3">
                {topStocks.stocks.map((stock, i) => (
                  <div
                    key={stock.ticker}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#111118] hover:bg-[#1c1c28] transition-colors"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-400">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-semibold text-white">
                          {stock.ticker}
                        </span>
                        <span className="text-emerald-400 text-xs font-mono font-medium">
                          +{stock.change_percent?.toFixed(1)}%
                        </span>
                        {stock.price_start && stock.price_end && (
                          <span className="text-[10px] text-zinc-600">
                            Rp {stock.price_start?.toLocaleString("id-ID")} → Rp{" "}
                            {stock.price_end?.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        <span className="text-zinc-400">{stock.company_name}</span>
                        {" — "}
                        {stock.reason}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Sources */}
                {topStocks.sources && topStocks.sources.length > 0 && (
                  <div className="pt-3 border-t border-[#2a2a3a]">
                    <p className="text-[10px] text-zinc-700 mb-1">Sumber:</p>
                    <div className="flex flex-wrap gap-2">
                      {topStocks.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors truncate max-w-[200px]"
                        >
                          {src.title || src.uri}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {topStocks && (!topStocks.stocks || topStocks.stocks.length === 0) && (
              <p className="text-xs text-zinc-600 text-center py-6">
                Data top saham belum tersedia untuk bulan ini
              </p>
            )}
          </div>

          {/* Motivational footer */}
          <MotivationalCard stats={stats} gradeInfo={gradeInfo} monthLabel={current.label} />
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function MiniStat({ label, value, valueClass, change, changeFormat, prevLabel }) {
  let changeText = null;
  if (change != null && !isNaN(change)) {
    const sign = change > 0 ? "+" : "";
    if (changeFormat === "pct") {
      changeText = `${sign}${change.toFixed(1)}%`;
    } else if (changeFormat === "decimal") {
      changeText = `${sign}${change.toFixed(2)}`;
    } else if (changeFormat === "num") {
      changeText = `${sign}${change}`;
    } else {
      changeText = `${sign}${formatRupiah(change).replace("+", "")}`;
      if (change > 0) changeText = "+" + changeText;
    }
  }

  return (
    <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4">
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-lg font-semibold tracking-tight ${valueClass || "text-white"}`}>
        {value}
      </p>
      {changeText && (
        <p className={`text-[11px] mt-1 ${change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-zinc-600"}`}>
          {changeText}
          {prevLabel && <span className="text-zinc-600"> vs {prevLabel}</span>}
        </p>
      )}
    </div>
  );
}

function TradeRow({ trade, rank, type, onClick }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg bg-[#111118] hover:bg-[#1c1c28] cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-base">{medals[rank - 1] || `#${rank}`}</span>
        <div>
          <span className="text-sm font-mono font-semibold text-white group-hover:text-emerald-400 transition-colors">
            {trade.ticker}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-600">
              {new Date(trade.exit_date || trade.entry_date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {trade.setup_tag && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {trade.setup_tag}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-mono font-medium ${type === "win" ? "text-emerald-400" : "text-red-400"}`}>
          {formatRupiah(trade.pnl)}
        </p>
        <p className={`text-[11px] font-mono ${type === "win" ? "text-emerald-500/60" : "text-red-500/60"}`}>
          {formatPercent(trade.pnl_percent)}
        </p>
      </div>
    </div>
  );
}

function MotivationalCard({ stats, gradeInfo, monthLabel }) {
  let message = "";
  let tip = "";

  if (stats.winRate >= 60 && stats.totalPnl > 0) {
    message = `Bulan yang solid! Win rate ${stats.winRate.toFixed(0)}% menunjukkan kamu konsisten memilih setup yang tepat.`;
    tip = "Pertahankan disiplin dan jangan overtrade karena merasa overconfident.";
  } else if (stats.winRate >= 50 && stats.totalPnl > 0) {
    message = `Profitable meskipun win rate pas-pasan. Ini artinya risk management kamu sudah baik — average win > average loss.`;
    tip = "Coba tingkatkan selektivitas entry untuk push win rate ke atas 60%.";
  } else if (stats.totalPnl > 0) {
    message = `Masih profit meski win rate di bawah 50%. Kamu punya kemampuan cut loss cepat.`;
    tip = "Fokus pada kualitas setup — kurangi jumlah trade, naikkan conviction.";
  } else if (stats.totalPnl === 0) {
    message = `Break even bulan ini. Tidak rugi, tapi belum profit.`;
    tip = "Review trade journal kamu — cari pattern kapan kamu entry terlalu cepat atau hold terlalu lama.";
  } else if (stats.closedTrades > 0) {
    message = `Bulan yang tough. Tapi kerugian adalah bagian dari trading — yang penting evaluasi dan improve.`;
    tip = "Identifikasi 1-2 kebiasaan buruk yang paling sering muncul dan fokus perbaiki itu saja bulan depan.";
  } else {
    message = `Belum ada trade yang di-close bulan ini.`;
    tip = "Pastikan kamu tetap aktif journaling setiap trade untuk tracking performa.";
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{gradeInfo.emoji}</span>
        <div>
          <h3 className="text-sm font-medium text-white mb-1">
            Ringkasan {monthLabel}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
          <div className="mt-3 p-3 rounded-lg bg-[#111118] border border-[#2a2a3a]">
            <p className="text-xs text-zinc-500">
              <span className="text-amber-400 font-medium">💡 Tips:</span>{" "}
              {tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyMonth({ label }) {
  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-[#1c1c28] flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-zinc-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <p className="text-zinc-400 text-sm mb-1">Tidak ada trade di {label}</p>
      <p className="text-zinc-600 text-xs">Pilih bulan lain atau mulai trading!</p>
    </div>
  );
}

function PortfolioVsIHSG({ stats, ihsgData, monthLabel }) {
  // Calculate portfolio return from closed trades this month
  // We'll use total P&L vs total cost basis as a rough % return
  const closed = stats;
  const portfolioReturn = closed.totalPnl;

  // Portfolio % — use avgWin/avgLoss to estimate, or compute from trades
  // Simple approach: if we have total cost from trades, compute %
  // For now use a weighted estimate
  const portfolioPct = closed.closedTrades > 0
    ? (closed.winRate / 100) * (closed.avgWin || 0) - ((100 - closed.winRate) / 100) * (closed.avgLoss || 0)
    : 0;

  // We'll just show the IHSG return alongside the portfolio P&L
  const ihsgReturn = ihsgData?.returnPct ?? null;
  const alpha = ihsgReturn != null ? (ihsgReturn != null ? null : null) : null;

  // Determine outperform/underperform
  // Since we can't easily compute exact portfolio % return without knowing total capital,
  // we show both values and let user compare
  const isOutperform = portfolioReturn > 0 && (ihsgReturn == null || ihsgReturn < 0 || portfolioReturn > 0);

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <div>
          <h3 className="text-sm font-medium text-white">Portfolio vs IHSG</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Perbandingan performa kamu dengan benchmark {monthLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Portfolio */}
        <div className="p-4 rounded-xl bg-[#111118] border border-[#2a2a3a]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
            Portfolio Kamu
          </p>
          <p className={`text-xl font-semibold font-mono ${getPnlColor(portfolioReturn)}`}>
            {formatRupiah(portfolioReturn)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {closed.wins}W / {closed.losses}L · WR {closed.winRate.toFixed(0)}%
          </p>
        </div>

        {/* IHSG */}
        <div className="p-4 rounded-xl bg-[#111118] border border-[#2a2a3a]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
            IHSG
          </p>
          {ihsgReturn != null ? (
            <>
              <p className={`text-xl font-semibold font-mono ${getPnlColor(ihsgReturn)}`}>
                {ihsgReturn > 0 ? "+" : ""}{ihsgReturn.toFixed(2)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {ihsgData.startPrice?.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                {" → "}
                {ihsgData.endPrice?.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-3 w-3 text-zinc-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-zinc-600">Memuat...</span>
            </div>
          )}
        </div>

        {/* Verdict */}
        <div className="p-4 rounded-xl bg-[#111118] border border-[#2a2a3a] flex flex-col justify-center">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
            Verdict
          </p>
          {ihsgReturn != null ? (
            <>
              {portfolioReturn > 0 && ihsgReturn < portfolioReturn ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-sm">🏆</span>
                    <span className="text-xs font-medium text-emerald-400">OUTPERFORM</span>
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    Portfolio kamu profit sementara IHSG{" "}
                    {ihsgReturn >= 0 ? `hanya naik ${ihsgReturn.toFixed(1)}%` : `turun ${Math.abs(ihsgReturn).toFixed(1)}%`}
                  </p>
                </div>
              ) : portfolioReturn > 0 ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-sm">📈</span>
                    <span className="text-xs font-medium text-blue-400">PROFIT</span>
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    Kamu profit bulan ini, nice!
                  </p>
                </div>
              ) : portfolioReturn === 0 ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
                    <span className="text-sm">⚖️</span>
                    <span className="text-xs font-medium text-zinc-400">BREAK EVEN</span>
                  </span>
                </div>
              ) : (
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-sm">📉</span>
                    <span className="text-xs font-medium text-red-400">UNDERPERFORM</span>
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    {ihsgReturn >= 0
                      ? `IHSG naik ${ihsgReturn.toFixed(1)}% tapi portfolio kamu rugi`
                      : `Sama-sama turun, tapi tetap evaluasi risk management`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-zinc-600">Menunggu data IHSG...</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TopStocksSkeleton() {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = [
    "Mencari data top gainers...",
    "Menganalisis pergerakan harga...",
    "Menyusun ranking saham...",
    "Hampir selesai...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
        </div>
        <span className="text-xs text-emerald-400/80 transition-all duration-300">
          {messages[msgIdx]}
        </span>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-lg bg-[#111118]"
          style={{ opacity: 1 - (i - 1) * 0.15 }}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1c1c28] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-14 rounded bg-[#1c1c28] animate-pulse" />
              <div className="h-3 w-10 rounded bg-[#1c1c28] animate-pulse" />
              <div className="h-3 w-24 rounded bg-[#1c1c28] animate-pulse" />
            </div>
            <div className="h-3 rounded bg-[#1c1c28] animate-pulse" style={{ maxWidth: `${85 - i * 8}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
