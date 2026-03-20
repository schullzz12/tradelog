"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import TradeEntryForm from "@/components/TradeEntryForm";
import TradeChart from "@/components/TradeChart";

export default function EditTradePage() {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    async function fetchTrade() {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setTrade(data);
      }
      setLoading(false);
    }
    if (params.id) fetchTrade();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Memuat data trade...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 mb-4">Trade tidak ditemukan</p>
        <button
          onClick={() => router.push("/trades")}
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Kembali ke daftar trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Edit Trade</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {trade.ticker} — Entry {new Date(trade.entry_date).toLocaleDateString("id-ID")}
        </p>
      </div>

      {/* TradingView Chart with BUY/SELL markers */}
      <TradeChart
        ticker={trade.ticker}
        entryDate={trade.entry_date}
        exitDate={trade.exit_date}
        entryPrice={trade.entry_price}
        exitPrice={trade.exit_price}
        type={trade.type}
        status={trade.status}
      />

      <TradeEntryForm trade={trade} />
    </div>
  );
}
