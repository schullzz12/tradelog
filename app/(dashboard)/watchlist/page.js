'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import WatchlistCard from '@/components/WatchlistCard';
import WatchlistForm from '@/components/WatchlistForm';

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchWatchlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('watchlist')
      .select('*, watchlist_checklist(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  async function handleDelete(id) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  async function handleToggleCheck(checkId, checked) {
    const { error } = await supabase
      .from('watchlist_checklist')
      .update({ checked })
      .eq('id', checkId);

    if (!error) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          watchlist_checklist: item.watchlist_checklist.map((c) =>
            c.id === checkId ? { ...c, checked } : c
          ),
        }))
      );
    }
  }

  function handleEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingItem(null);
  }

  async function handleFormSaved() {
    handleFormClose();
    await fetchWatchlist();
  }

  const readyCount = items.filter((i) => {
    const checks = i.watchlist_checklist || [];
    return checks.length > 0 && checks.every((c) => c.checked);
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm">Memuat watchlist...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-white">Watchlist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {items.length} saham dipantau{readyCount > 0 ? ` · ${readyCount} siap entry` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah saham
        </button>
      </div>

      {/* Watchlist cards */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
          <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-sm text-zinc-400 mb-1">Watchlist kosong</p>
          <p className="text-xs text-zinc-600 mb-4">Tambah saham yang mau kamu pantau</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            + Tambah saham pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onToggleCheck={handleToggleCheck}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchWatchlist}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <WatchlistForm
          item={editingItem}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
}
