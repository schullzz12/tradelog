'use client';

import { useState, useMemo, useEffect } from 'react';

export default function RiskCalculatorModal({ isOpen, onClose }) {
  const [type, setType] = useState('long');
  const [modal, setModal] = useState('');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const calc = useMemo(() => {
    const m = parseFloat(modal) || 0;
    const rp = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(slPrice) || 0;
    const tp = parseFloat(tpPrice) || 0;

    if (!m || !rp || !entry || !sl) return null;

    const riskPerShare = type === 'long' ? entry - sl : sl - entry;

    if (riskPerShare <= 0) {
      return {
        error: type === 'long'
          ? 'Stop loss harus di bawah harga entry'
          : 'Stop loss harus di atas harga entry',
      };
    }

    const maxRiskRupiah = m * (rp / 100);
    const maxSharesRaw = Math.floor(maxRiskRupiah / riskPerShare);
    const maxLot = Math.floor(maxSharesRaw / 100);
    const maxShares = maxLot * 100;
    const actualRisk = maxShares * riskPerShare;
    const actualRiskPercent = m > 0 ? (actualRisk / m) * 100 : 0;
    const positionValue = maxShares * entry;
    const positionPercent = m > 0 ? (positionValue / m) * 100 : 0;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111118] border-b border-[#2a2a3a] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="10" y2="10" />
                <line x1="14" y1="10" x2="16" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Risk Calculator</h2>
              <p className="text-[11px] text-zinc-500">Hitung posisi optimal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-[#1c1c28] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input */}
            <div className="space-y-3.5">
              {/* Type toggle */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tipe Trade</label>
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

              <InputField label="Modal" prefix="Rp" value={modal} onChange={setModal} placeholder="100000000" />
              <InputField label="Risk per Trade" suffix="%" value={riskPercent} onChange={setRiskPercent} placeholder="2" />
              <InputField label="Harga Entry" prefix="Rp" value={entryPrice} onChange={setEntryPrice} placeholder="5000" />
              <InputField
                label="Harga Stop Loss"
                prefix="Rp"
                value={slPrice}
                onChange={setSlPrice}
                placeholder={type === 'long' ? '4750' : '5250'}
              />
              <InputField
                label="Take Profit (opsional)"
                prefix="Rp"
                value={tpPrice}
                onChange={setTpPrice}
                placeholder={type === 'long' ? '5500' : '4500'}
              />
            </div>

            {/* Result */}
            <div className="space-y-3.5">
              {calc && !calc.error ? (
                <>
                  {/* Big number */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-center">
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-0.5">
                      Posisi Optimal
                    </p>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-3xl font-bold font-mono text-emerald-400">
                        {calc.maxLot}
                      </span>
                      <span className="text-sm text-emerald-400/60">lot</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      = {formatNumber(calc.maxShares)} lembar
                    </p>
                  </div>

                  {/* Details */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2.5">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Detail Risiko</p>
                    <ResultRow label="Max risk" value={formatRupiah(calc.maxRiskRupiah)} sub={`${parseFloat(riskPercent)}% modal`} />
                    <ResultRow label="Actual risk" value={formatRupiah(calc.actualRisk)} sub={`${calc.actualRiskPercent.toFixed(2)}%`} />
                    <ResultRow label="Risk/lembar" value={formatRupiah(calc.riskPerShare)} />

                    <div className="border-t border-white/[0.04] my-1" />
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Posisi</p>
                    <ResultRow label="Nilai posisi" value={formatRupiah(calc.positionValue)} sub={`${calc.positionPercent.toFixed(1)}% modal`} />

                    {calc.rrRatio !== null && (
                      <>
                        <div className="border-t border-white/[0.04] my-1" />
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Risk : Reward</p>
                        <ResultRow
                          label="R:R"
                          value={`1 : ${calc.rrRatio.toFixed(2)}`}
                          highlight={calc.rrRatio >= 2 ? 'green' : calc.rrRatio >= 1 ? 'yellow' : 'red'}
                        />
                        <ResultRow label="Potensi profit" value={formatRupiah(calc.potentialProfit)} />

                        {/* R:R bar */}
                        <div className="mt-1">
                          <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.04]">
                            <div
                              className="bg-red-500/40 transition-all"
                              style={{ width: `${(calc.actualRisk / (calc.actualRisk + calc.potentialProfit)) * 100}%` }}
                            />
                            <div
                              className="bg-emerald-500/40 transition-all"
                              style={{ width: `${(calc.potentialProfit / (calc.actualRisk + calc.potentialProfit)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] text-red-400/60">Risk</span>
                            <span className="text-[9px] text-emerald-400/60">Reward</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Warnings */}
                  {calc.positionPercent > 50 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
                      <span className="text-amber-400 text-xs mt-0.5">!</span>
                      <p className="text-[11px] text-amber-400">
                        Posisi = {calc.positionPercent.toFixed(0)}% dari modal
                      </p>
                    </div>
                  )}
                  {calc.maxLot === 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
                      <span className="text-amber-400 text-xs mt-0.5">!</span>
                      <p className="text-[11px] text-amber-400">
                        Risk terlalu kecil atau SL terlalu jauh untuk 1 lot
                      </p>
                    </div>
                  )}
                </>
              ) : calc?.error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 text-center">
                  <p className="text-sm text-red-400">{calc.error}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <svg className="w-8 h-8 text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-zinc-500">Isi parameter untuk mulai hitung</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InputField({ label, prefix, suffix, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono ${
            prefix ? 'pl-9 pr-3' : suffix ? 'pl-3 pr-9' : 'px-3'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, sub, highlight }) {
  const colorMap = { green: 'text-emerald-400', red: 'text-red-400', yellow: 'text-amber-400' };
  return (
    <div className="flex items-start justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono font-medium ${highlight ? colorMap[highlight] : 'text-white'}`}>{value}</span>
        {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

function formatRupiah(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatNumber(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}
