'use client';

import { useState, useMemo } from 'react';

/**
 * RiskCalculator — Position sizing calculator for Indonesian stock traders
 * 
 * Calculates optimal lot size based on:
 * - Portfolio value (modal)
 * - Risk percentage per trade
 * - Entry price
 * - Stop loss price
 * - Optional: Take profit price (for R:R ratio)
 */
export default function RiskCalculator() {
  const [type, setType] = useState('long');
  const [modal, setModal] = useState('');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');

  const calc = useMemo(() => {
    const m = parseFloat(modal) || 0;
    const rp = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(slPrice) || 0;
    const tp = parseFloat(tpPrice) || 0;

    if (!m || !rp || !entry || !sl) {
      return null;
    }

    // Risk per share
    const riskPerShare = type === 'long' 
      ? entry - sl 
      : sl - entry;

    if (riskPerShare <= 0) {
      return { error: type === 'long' 
        ? 'Stop loss harus di bawah harga entry' 
        : 'Stop loss harus di atas harga entry' 
      };
    }

    // Max rupiah at risk
    const maxRiskRupiah = m * (rp / 100);

    // Max shares (rounded down to nearest 100 for lot)
    const maxSharesRaw = Math.floor(maxRiskRupiah / riskPerShare);
    const maxLot = Math.floor(maxSharesRaw / 100);
    const maxShares = maxLot * 100;

    // Actual risk with rounded lot
    const actualRisk = maxShares * riskPerShare;
    const actualRiskPercent = m > 0 ? (actualRisk / m) * 100 : 0;

    // Position value
    const positionValue = maxShares * entry;
    const positionPercent = m > 0 ? (positionValue / m) * 100 : 0;

    // Risk:Reward ratio
    let rrRatio = null;
    let rewardPerShare = 0;
    let potentialProfit = 0;
    if (tp > 0) {
      rewardPerShare = type === 'long' ? tp - entry : entry - tp;
      if (rewardPerShare > 0 && riskPerShare > 0) {
        rrRatio = rewardPerShare / riskPerShare;
        potentialProfit = maxShares * rewardPerShare;
      }
    }

    return {
      maxLot,
      maxShares,
      maxRiskRupiah,
      actualRisk,
      actualRiskPercent,
      riskPerShare,
      positionValue,
      positionPercent,
      rrRatio,
      rewardPerShare,
      potentialProfit,
    };
  }, [modal, riskPercent, entryPrice, slPrice, tpPrice, type]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Risk Calculator</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Hitung ukuran posisi optimal berdasarkan risk management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Input Panel ── */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Parameter
          </h3>

          {/* Type toggle */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Tipe Trade</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('long')}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  type === 'long'
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Long ↑
              </button>
              <button
                onClick={() => setType('short')}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  type === 'short'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                    : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Short ↓
              </button>
            </div>
          </div>

          {/* Modal */}
          <InputField
            label="Modal / Portfolio Value"
            prefix="Rp"
            value={modal}
            onChange={setModal}
            placeholder="100000000"
            hint="Total modal yang kamu alokasikan"
          />

          {/* Risk % */}
          <InputField
            label="Risk per Trade"
            suffix="%"
            value={riskPercent}
            onChange={setRiskPercent}
            placeholder="2"
            hint="Umumnya 1-3% dari modal"
          />

          {/* Entry Price */}
          <InputField
            label="Harga Entry"
            prefix="Rp"
            value={entryPrice}
            onChange={setEntryPrice}
            placeholder="5000"
          />

          {/* Stop Loss */}
          <InputField
            label="Harga Stop Loss"
            prefix="Rp"
            value={slPrice}
            onChange={setSlPrice}
            placeholder={type === 'long' ? '4750' : '5250'}
            hint={type === 'long' ? 'Di bawah harga entry' : 'Di atas harga entry'}
          />

          {/* Take Profit (optional) */}
          <InputField
            label="Harga Take Profit (opsional)"
            prefix="Rp"
            value={tpPrice}
            onChange={setTpPrice}
            placeholder={type === 'long' ? '5500' : '4500'}
            hint="Untuk hitung Risk:Reward ratio"
          />
        </div>

        {/* ── Result Panel ── */}
        <div className="space-y-4">
          {/* Main result card */}
          {calc && !calc.error ? (
            <>
              {/* Big number: Lot size */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center">
                <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">
                  Ukuran Posisi Optimal
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold font-mono text-emerald-400">
                    {calc.maxLot}
                  </span>
                  <span className="text-lg text-emerald-400/60">lot</span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  = {formatNumber(calc.maxShares)} lembar saham
                </p>
              </div>

              {/* Detail grid */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Detail Risiko</h4>
                
                <ResultRow
                  label="Max risk (Rp)"
                  value={formatRupiah(calc.maxRiskRupiah)}
                  sub={`${parseFloat(riskPercent)}% dari modal`}
                />
                <ResultRow
                  label="Actual risk"
                  value={formatRupiah(calc.actualRisk)}
                  sub={`${calc.actualRiskPercent.toFixed(2)}% dari modal`}
                  highlight={calc.actualRiskPercent > parseFloat(riskPercent) ? 'red' : undefined}
                />
                <ResultRow
                  label="Risk per lembar"
                  value={formatRupiah(calc.riskPerShare)}
                />
                
                <div className="border-t border-white/[0.04] my-2" />
                
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Detail Posisi</h4>
                
                <ResultRow
                  label="Nilai posisi"
                  value={formatRupiah(calc.positionValue)}
                  sub={`${calc.positionPercent.toFixed(1)}% dari modal`}
                />

                {calc.rrRatio !== null && (
                  <>
                    <div className="border-t border-white/[0.04] my-2" />
                    <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Risk : Reward</h4>
                    
                    <ResultRow
                      label="R:R Ratio"
                      value={`1 : ${calc.rrRatio.toFixed(2)}`}
                      highlight={calc.rrRatio >= 2 ? 'green' : calc.rrRatio >= 1 ? 'yellow' : 'red'}
                    />
                    <ResultRow
                      label="Potensi profit"
                      value={formatRupiah(calc.potentialProfit)}
                      sub={`Rp ${formatNumber(calc.rewardPerShare)} per lembar`}
                    />

                    {/* Visual R:R bar */}
                    <RiskRewardBar ratio={calc.rrRatio} risk={calc.actualRisk} reward={calc.potentialProfit} />
                  </>
                )}
              </div>

              {/* Warnings */}
              {calc.positionPercent > 50 && (
                <Warning text={`Posisi = ${calc.positionPercent.toFixed(0)}% dari modal. Pertimbangkan diversifikasi.`} />
              )}
              {calc.maxLot === 0 && (
                <Warning text="Risk terlalu kecil atau SL terlalu jauh — tidak cukup untuk 1 lot." />
              )}
            </>
          ) : calc?.error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5 text-center">
              <p className="text-sm text-red-400">{calc.error}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-zinc-600">
                Isi parameter di sebelah kiri untuk menghitung ukuran posisi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InputField({ label, prefix, suffix, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all font-mono ${
            prefix ? 'pl-9 pr-3' : suffix ? 'pl-3 pr-9' : 'px-3'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, sub, highlight }) {
  const colorMap = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-amber-400',
  };

  return (
    <div className="flex items-start justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono font-medium ${highlight ? colorMap[highlight] : 'text-white'}`}>
          {value}
        </span>
        {sub && <p className="text-[11px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

function RiskRewardBar({ ratio, risk, reward }) {
  const total = risk + reward;
  const riskWidth = total > 0 ? (risk / total) * 100 : 50;

  return (
    <div className="mt-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
        <div
          className="bg-red-500/40 transition-all duration-300"
          style={{ width: `${riskWidth}%` }}
        />
        <div
          className="bg-emerald-500/40 transition-all duration-300"
          style={{ width: `${100 - riskWidth}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-red-400/60">Risk</span>
        <span className="text-[10px] text-emerald-400/60">Reward</span>
      </div>
    </div>
  );
}

function Warning({ text }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5">
      <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-xs text-amber-400/80">{text}</p>
    </div>
  );
}

// ── Helpers ──

function formatRupiah(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumber(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}
