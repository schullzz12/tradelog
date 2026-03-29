'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STRATEGY_TAGS = ['Swing', 'Breakout', 'Akumulasi', 'Scalping', 'Dividen', 'Momentum'];

export default function WatchlistForm({ item, onClose, onSaved }) {
  const isEditing = !!item;

  const [ticker, setTicker] = useState(item?.ticker || '');
  const [strategyTag, setStrategyTag] = useState(item?.strategy_tag || '');
  const [entryPrice, setEntryPrice] = useState(item?.entry_price?.toString() || '');
  const [slPrice, setSlPrice] = useState(item?.sl_price?.toString() || '');
  const [tpPrice, setTpPrice] = useState(item?.tp_price?.toString() || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [reasoning, setReasoning] = useState(item?.reasoning || '');
  const [alertEnabled, setAlertEnabled] = useState(item?.alert_enabled || false);
  const [checklist, setChecklist] = useState(
    item?.watchlist_checklist?.sort((a, b) => a.sort_order - b.sort_order).map((c) => c.label) || []
  );
  const [newCheckItem, setNewCheckItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  function addCheckItem() {
    const val = newCheckItem.trim();
    if (!val) return;
    setChecklist((prev) => [...prev, val]);
    setNewCheckItem('');
  }

  function removeCheckItem(index) {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!ticker.trim()) { setError('Ticker harus diisi'); return; }
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        ticker: ticker.trim().toUpperCase(),
        strategy_tag: strategyTag || null,
        entry_price: entryPrice ? parseFloat(entryPrice) : null,
        sl_price: slPrice ? parseFloat(slPrice) : null,
        tp_price: tpPrice ? parseFloat(tpPrice) : null,
        notes: notes.trim() || null,
        reasoning: reasoning.trim() || null,
        alert_enabled: alertEnabled,
        updated_at: new Date().toISOString(),
      };

      let watchlistId;

      if (isEditing) {
        const { error: updateErr } = await supabase.from('watchlist').update(payload).eq('id', item.id);
        if (updateErr) throw updateErr;
        watchlistId = item.id;
        await supabase.from('watchlist_checklist').delete().eq('watchlist_id', item.id);
      } else {
        const { data, error: insertErr } = await supabase.from('watchlist').insert(payload).select().single();
        if (insertErr) throw insertErr;
        watchlistId = data.id;
      }

      if (checklist.length > 0) {
        const checkItems = checklist.map((label, i) => ({ watchlist_id: watchlistId, label, checked: false, sort_order: i }));
        const { error: checkErr } = await supabase.from('watchlist_checklist').insert(checkItems);
        if (checkErr) throw checkErr;
      }

      onSaved();
    } catch (err) {
      console.error('Save watchlist error:', err);
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  // R:R calculator
  const rr = entryPrice && tpPrice && slPrice
    ? (Math.abs(parseFloat(tpPrice) - parseFloat(entryPrice)) / Math.abs(parseFloat(entryPrice) - parseFloat(slPrice))).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111118] border-b border-[#2a2a3a] px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? `Edit ${item.ticker}` : 'Tambah ke Watchlist'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-[#1c1c28] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ticker */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Ticker</label>
            <input
              type="text" value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isEditing) handleSubmit(); }}
              placeholder="Ketik ticker lalu Enter... (BBRI, NCKL)"
              disabled={isEditing} autoFocus={!isEditing}
              className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono uppercase disabled:opacity-50"
            />
          </div>

          {/* Strategy tag */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Strategi <span className="text-zinc-600">(opsional)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGY_TAGS.map((tag) => (
                <button key={tag} onClick={() => setStrategyTag(strategyTag === tag ? '' : tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${strategyTag === tag ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'bg-[#1c1c28] text-zinc-500 hover:text-zinc-300'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Plan + Alert — shown in both add and edit mode */}
          {true && (
            <>
              {/* Trade Plan */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Trade Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Entry</div>
                    <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="5000"
                      className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono" />
                  </div>
                  <div>
                    <div className="text-[10px] text-red-400 mb-1">Stop Loss</div>
                    <input type="number" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} placeholder="4750"
                      className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 px-3 text-sm text-red-400 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 font-mono" />
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400 mb-1">Take Profit</div>
                    <input type="number" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} placeholder="5500"
                      className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 px-3 text-sm text-emerald-400 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono" />
                  </div>
                </div>
                {rr && (
                  <div className="mt-2 text-[11px] text-zinc-500">
                    Risk/Reward: <span className={parseFloat(rr) >= 2 ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>1 : {rr}</span>
                    {parseFloat(rr) < 1 && <span className="text-red-400 ml-2">⚠ R:R kurang ideal</span>}
                  </div>
                )}
              </div>

              {/* ── Price Alert ── */}
              <div className="bg-[#0f0f17] border border-[#2a2a3a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-300">Price Alert</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">Kirim email saat harga mendekati Entry, TP, atau SL</div>
                  </div>
                  <button onClick={() => setAlertEnabled(!alertEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${alertEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${alertEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {alertEnabled && (
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Reasoning — kenapa mau entry di sini?</label>
                    <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)}
                      placeholder="Support kuat di area ini, RSI oversold, volume mulai naik..."
                      rows={2}
                      className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 px-3 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none" />
                    {!entryPrice && (
                      <p className="text-[10px] text-amber-400 mt-1.5">⚠ Isi Entry price dulu biar alert bisa jalan</p>
                    )}
                  </div>
                )}
              </div>

              {/* Entry Checklist */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Entry Checklist</label>
                <div className="space-y-1.5 mb-2">
                  {checklist.map((label, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#1c1c28] rounded-lg px-3 py-2">
                      <span className="text-emerald-400 text-xs">○</span>
                      <span className="text-sm text-zinc-300 flex-1">{label}</span>
                      <button onClick={() => removeCheckItem(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                    placeholder="Tambah kondisi... (Enter)"
                    className="flex-1 bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
                  <button onClick={addCheckItem} className="px-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-sm">+</button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan thesis, alasan, timing..." rows={3}
                  className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-lg py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none" />
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/[0.04] border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-3 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
            {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah ke Watchlist'}
          </button>

          {!isEditing && (
            <p className="text-[11px] text-zinc-600 text-center">Entry, SL, TP, checklist bisa diisi nanti lewat tombol edit</p>
          )}
        </div>
      </div>
    </div>
  );
}