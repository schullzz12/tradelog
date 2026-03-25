"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { calculatePnl, calculatePnlPercent } from "@/lib/utils";

const POPULAR_TICKERS = [
  "BBCA", "BBRI", "BMRI", "TLKM", "ASII", "UNVR", "HMSP", "GGRM",
  "ICBP", "INDF", "KLBF", "MDKA", "PGAS", "SMGR", "ANTM", "PTBA",
];

export default function TradeEntryForm({ trade = null }) {
  const isEdit = !!trade;
  const router = useRouter();

  const [form, setForm] = useState({
    ticker: trade?.ticker || "",
    type: trade?.type || "long",
    entry_price: trade?.entry_price || "",
    exit_price: trade?.exit_price || "",
    shares: trade?.shares ? trade.shares / 100 : "",
    entry_date: trade?.entry_date?.split("T")[0] || new Date().toISOString().split("T")[0],
    exit_date: trade?.exit_date?.split("T")[0] || "",
    status: trade?.status || "open",
    notes: trade?.notes || "",
    setup_tag: trade?.setup_tag || "",
    emotion_tag: trade?.emotion_tag || "",
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "exit_price" || field === "exit_date") {
        if (next.exit_price && next.exit_date) {
          next.status = "closed";
        } else {
          next.status = "open";
        }
      }
      return next;
    });
  }

  const sharesNum = form.shares ? Number(form.shares) * 100 : 0;
  const entryNum = Number(form.entry_price) || 0;
  const exitNum = Number(form.exit_price) || 0;
  const previewPnl =
    entryNum && exitNum && sharesNum
      ? calculatePnl(entryNum, exitNum, sharesNum, form.type)
      : null;
  const previewPnlPct =
    entryNum && exitNum
      ? calculatePnlPercent(entryNum, exitNum, form.type)
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // ── Input Validation ──
    const ticker = form.ticker.toUpperCase().trim();
    const entryPrice = Number(form.entry_price);
    const exitPrice = form.exit_price ? Number(form.exit_price) : null;
    const lots = Number(form.shares);
    const shares = lots * 100;

    if (!ticker || ticker.length === 0) {
      setError("Ticker saham wajib diisi");
      setLoading(false);
      return;
    }
    if (ticker.length > 10) {
      setError("Ticker terlalu panjang");
      setLoading(false);
      return;
    }
    if (!entryPrice || entryPrice <= 0) {
      setError("Harga entry harus lebih dari 0");
      setLoading(false);
      return;
    }
    if (entryPrice > 100000000) {
      setError("Harga entry tidak valid");
      setLoading(false);
      return;
    }
    if (exitPrice !== null && (exitPrice <= 0 || exitPrice > 100000000)) {
      setError("Harga exit tidak valid");
      setLoading(false);
      return;
    }
    if (!lots || lots <= 0) {
      setError("Jumlah lot harus lebih dari 0");
      setLoading(false);
      return;
    }
    if (!Number.isInteger(lots)) {
      setError("Jumlah lot harus bilangan bulat");
      setLoading(false);
      return;
    }
    if (!form.entry_date) {
      setError("Tanggal entry wajib diisi");
      setLoading(false);
      return;
    }
    const entryDate = new Date(form.entry_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (entryDate > today) {
      setError("Tanggal entry tidak boleh di masa depan");
      setLoading(false);
      return;
    }
    if (form.exit_date) {
      const exitDate = new Date(form.exit_date);
      if (exitDate > today) {
        setError("Tanggal exit tidak boleh di masa depan");
        setLoading(false);
        return;
      }
      if (exitDate < entryDate) {
        setError("Tanggal exit harus setelah tanggal entry");
        setLoading(false);
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      ticker: ticker,
      type: form.type,
      entry_price: entryPrice,
      exit_price: exitPrice,
      shares: shares,
      entry_date: form.entry_date,
      exit_date: form.exit_date || null,
      status: form.status,
      notes: form.notes?.slice(0, 5000) || null,
      setup_tag: form.setup_tag || null,
      emotion_tag: form.emotion_tag || null,
      pnl: previewPnl,
      pnl_percent: previewPnlPct,
    };

    let result;
    if (isEdit) {
      result = await supabase
        .from("trades")
        .update(payload)
        .eq("id", trade.id);
    } else {
      result = await supabase.from("trades").insert([payload]);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      router.push("/trades");
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", trade.id);

    if (error) {
      setError(error.message);
      setDeleting(false);
    } else {
      router.push("/trades");
      router.refresh();
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 bg-[#111118] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors";
  const labelClass = "block text-sm text-zinc-400 mb-1.5";

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit Trade" : "Catat Trade Baru"}
          </h2>
          {isEdit && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
            >
              Hapus Trade
            </button>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-400 mb-3">
              Yakin mau hapus trade <strong>{trade.ticker}</strong>? Aksi ini tidak bisa di-undo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm bg-[#111118] hover:bg-[#1c1c28] border border-[#2a2a3a] text-zinc-300 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticker + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kode Saham</label>
              <input
                type="text"
                value={form.ticker}
                onChange={(e) => updateField("ticker", e.target.value.toUpperCase())}
                className={`${inputClass} font-mono`}
                placeholder="BBCA"
                list="ticker-list"
                required
              />
              <datalist id="ticker-list">
                {POPULAR_TICKERS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>Tipe</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField("type", "long")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    form.type === "long"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#111118] border-[#2a2a3a] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Long ↑
                </button>
                <button
                  type="button"
                  onClick={() => updateField("type", "short")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    form.type === "short"
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-[#111118] border-[#2a2a3a] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Short ↓
                </button>
              </div>
            </div>
          </div>

          {/* Entry Price + Exit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Harga Entry</label>
              <input
                type="number"
                value={form.entry_price}
                onChange={(e) => updateField("entry_price", e.target.value)}
                className={`${inputClass} font-mono`}
                placeholder="4250"
                min="0"
                step="1"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                Harga Exit{" "}
                <span className="text-zinc-600">(kosongkan jika open)</span>
              </label>
              <input
                type="number"
                value={form.exit_price}
                onChange={(e) => updateField("exit_price", e.target.value)}
                className={`${inputClass} font-mono`}
                placeholder="4500"
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Shares + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Jumlah Lot</label>
              <input
                type="number"
                value={form.shares}
                onChange={(e) => updateField("shares", e.target.value)}
                className={`${inputClass} font-mono`}
                placeholder="10"
                min="1"
                step="1"
                required
              />
              <p className="text-[10px] text-zinc-600 mt-1">1 lot = 100 lembar</p>
            </div>
            <div>
              <label className={labelClass}>Tanggal Entry</label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => updateField("entry_date", e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Tanggal Exit</label>
              <input
                type="date"
                value={form.exit_date}
                onChange={(e) => updateField("exit_date", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Setup / Strategi</label>
              <select
                value={form.setup_tag}
                onChange={(e) => updateField("setup_tag", e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih setup...</option>
                <option value="breakout">Breakout</option>
                <option value="pullback">Pullback / Retracement</option>
                <option value="momentum">Momentum</option>
                <option value="support_bounce">Support Bounce</option>
                <option value="gap_play">Gap Play</option>
                <option value="scalping">Scalping</option>
                <option value="swing">Swing Trade</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Emosi Saat Entry</label>
              <select
                value={form.emotion_tag}
                onChange={(e) => updateField("emotion_tag", e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih emosi...</option>
                <option value="confident">Confident 😎</option>
                <option value="neutral">Netral 😐</option>
                <option value="fomo">FOMO 😰</option>
                <option value="revenge">Revenge Trade 😡</option>
                <option value="fearful">Takut 😨</option>
                <option value="greedy">Serakah 🤑</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Catatan</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="Alasan entry, analisis, lesson learned..."
              rows={3}
            />
          </div>

          {/* PnL Preview */}
          {previewPnl != null && (
            <div
              className={`p-4 rounded-lg border ${
                previewPnl >= 0
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-red-500/5 border-red-500/20"
              }`}
            >
              <p className="text-xs text-zinc-500 mb-1">Preview P&L</p>
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-xl font-mono font-semibold ${
                    previewPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {previewPnl >= 0 ? "+" : ""}
                  Rp {Math.abs(previewPnl).toLocaleString("id-ID")}
                </span>
                <span
                  className={`text-sm font-mono ${
                    previewPnlPct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ({previewPnlPct >= 0 ? "+" : ""}
                  {previewPnlPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading
                ? "Menyimpan..."
                : isEdit
                ? "Update Trade"
                : "Simpan Trade"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-[#111118] hover:bg-[#1c1c28] border border-[#2a2a3a] text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
