"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatsCards from "@/components/StatsCards";
import TradeTable from "@/components/TradeTable";
import PnLCalendar from "@/components/PnLCalendar";
import StockChart from "@/components/StockChart";
import RecentActivity from "@/components/RecentActivity";

export default function DashboardPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      if (!error && data) {
        // Enrich open trades with unrealized P&L
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
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ringkasan performa trading kamu
        </p>
      </div>

      {/* Stats */}
      <StatsCards trades={trades} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StockChart trades={trades} />
        </div>
        <div>
          <RecentActivity trades={trades} />
        </div>
      </div>

      {/* Calendar + Recent Trades */}
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

// ── Fetch last close price for open trades & calculate unrealized P&L ──
async function enrichOpenTrades(trades) {
  const openTrades = trades.filter((t) => t.status === "open");
  if (openTrades.length === 0) return trades;

  // Get unique tickers from open trades
  const uniqueTickers = [...new Set(openTrades.map((t) => t.ticker.toUpperCase()))];

  // Fetch last close price for each ticker
  const priceMap = {};
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 24 * 60 * 60; // 7 days back to ensure we get at least 1 trading day

  await Promise.all(
    uniqueTickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `/api/chart-data?ticker=${ticker}.JK&period1=${weekAgo}&period2=${now}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) {
          // Last element = most recent trading day close
          priceMap[ticker] = data[data.length - 1].close;
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${ticker}:`, err);
      }
    })
  );

  // Enrich trades with unrealized P&L
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
