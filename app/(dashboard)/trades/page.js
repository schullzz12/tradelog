"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TradeTable from "@/components/TradeTable";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";

export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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

      if (!error && data) setTrades(data);
      setLoading(false);
    }
    fetchTrades();
  }, []);

  const filtered =
    filter === "all" ? trades : trades.filter((t) => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-white">Semua Trade</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {trades.length} trade tercatat
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton trades={filtered} />
          <Link
            href="/trades/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Trade Baru
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 animate-fade-in">
        {[
          { key: "all", label: "Semua" },
          { key: "open", label: "Open" },
          { key: "closed", label: "Closed" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f.key
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-[#16161f] border-[#2a2a3a] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-zinc-500">
              {f.key === "all"
                ? trades.length
                : trades.filter((t) => t.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
          Memuat...
        </div>
      ) : (
        <TradeTable trades={filtered} />
      )}
    </div>
  );
}
