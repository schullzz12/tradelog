"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatsCards from "@/components/StatsCards";
import TradeTable from "@/components/TradeTable";
import PnLCalendar from "@/components/PnLCalendar";
import StockChart from "@/components/StockChart";
import RecentActivity from "@/components/RecentActivity";
import Link from "next/link";

export default function DashboardPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function fetchTrades() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserName(user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Trader");

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      if (!error && data) {
        const enriched = await enrichOpenTrades(data);
        setTrades(enriched);
      }
      setLoading(false);
    }

    fetchTrades();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat data...</span>
        </div>
      </div>
    );
  }

  // ── ONBOARDING: Show welcome screen if no trades ──
  if (trades.length === 0) {
    return <WelcomeScreen userName={userName} />;
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ringkasan performa trading kamu
        </p>
      </div>

      <StatsCards trades={trades} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StockChart trades={trades} />
        </div>
        <div>
          <RecentActivity trades={trades} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <PnLCalendar trades={trades} />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Trade Terakhir</h3>
          </div>
          <TradeTable trades={trades} limit={5} />
        </div>
      </div>
    </div>
  );
}

// ── Welcome / Onboarding Screen ─────────────────────────────────────

function WelcomeScreen({ userName }) {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="text-center pt-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Selamat datang, {userName}! 👋
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          TradeLog siap bantu kamu jadi trader yang lebih disiplin dan profitable. 
          Mulai dengan mencatat trade pertama kamu.
        </p>
      </div>

      {/* CTA — Add first trade */}
      <div className="bg-[#16161f] border border-emerald-500/20 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Catat trade pertama kamu</h2>
        <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
          Butuh kurang dari 30 detik. Masukkan saham, harga entry, dan jumlah lot.
        </p>
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Trade Pertama →
        </Link>
      </div>

      {/* 3 steps guide */}
      <div>
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4 text-center">Cara kerja TradeLog</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              num: "1",
              title: "Catat trade kamu",
              desc: "Input saham, harga entry/exit, lot, dan emosi saat trading.",
              color: "emerald",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ),
            },
            {
              num: "2",
              title: "Lihat analytics",
              desc: "Dashboard otomatis hitung win rate, P&L, profit factor, dan lainnya.",
              color: "blue",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              ),
            },
            {
              num: "3",
              title: "Improve & profit",
              desc: "Identifikasi pattern, hilangkan kebiasaan buruk, naikkan win rate.",
              color: "amber",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              ),
            },
          ].map((step, i) => {
            const colors = {
              emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
              amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
            };
            return (
              <div key={i} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
                <div className={`w-9 h-9 rounded-lg border ${colors[step.color]} flex items-center justify-center mb-3`}>
                  {step.icon}
                </div>
                <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature highlights */}
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-6">
        <p className="text-sm font-medium text-white mb-4">Yang bisa kamu lakukan di TradeLog:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "📊", text: "Dashboard — P&L, win rate, equity curve" },
            { icon: "📈", text: "Portfolio — tracking posisi open real-time" },
            { icon: "📋", text: "Rapot Bulanan — grade A+ sampai D" },
            { icon: "🤖", text: "AI Analysis — analisis saham otomatis" },
            { icon: "😤", text: "Emotion Tracking — korelasi emosi vs profit" },
            { icon: "📉", text: "Performa vs IHSG — tau kamu outperform atau tidak" },
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111118]">
              <span className="text-lg flex-shrink-0">{feat.icon}</span>
              <span className="text-xs text-zinc-400">{feat.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Link
          href="/trades/new"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Trade Baru
        </Link>
        <Link
          href="/watchlist"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#16161f] text-zinc-400 border border-[#2a2a3a] hover:bg-[#1c1c28] transition-colors text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Watchlist
        </Link>
        <Link
          href="/performance"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#16161f] text-zinc-400 border border-[#2a2a3a] hover:bg-[#1c1c28] transition-colors text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          Insights
        </Link>
      </div>
    </div>
  );
}

// ── Fetch last close price for open trades & calculate unrealized P&L ──
async function enrichOpenTrades(trades) {
  const openTrades = trades.filter((t) => t.status === "open");
  if (openTrades.length === 0) return trades;

  const uniqueTickers = [...new Set(openTrades.map((t) => t.ticker.toUpperCase()))];

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
