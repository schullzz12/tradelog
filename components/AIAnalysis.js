'use client';

import { useState } from 'react';

export default function AIAnalysis({ ticker }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchAnalysis() {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok) throw new Error('Gagal fetch analisis AI');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Not loaded yet — show CTA button
  if (!analysis && !loading && !error) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <p className="text-sm text-white font-medium mb-1">AI Analysis</p>
        <p className="text-xs text-zinc-500 mb-4">
          Analisis {ticker.toUpperCase()} dengan AI — berita, sentiment, laporan keuangan
        </p>
        <button
          onClick={fetchAnalysis}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all"
        >
          Analisis dengan AI ✨
        </button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">
            AI sedang menganalisis {ticker.toUpperCase()}...
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/4 mx-auto" />
          <div className="h-3 bg-white/[0.04] rounded animate-pulse w-1/2 mx-auto" />
          <div className="h-3 bg-white/[0.04] rounded animate-pulse w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="mt-3 px-4 py-2 rounded-lg text-xs text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  // Results
  const sentimentColors = {
    Bullish: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    Bearish: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    Neutral: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  };
  const sc = sentimentColors[analysis.sentiment] || sentimentColors.Neutral;

  return (
    <div className="space-y-4">
      {/* Header: Sentiment + Summary */}
      <div className={`rounded-xl border ${sc.border} ${sc.bg} p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white">
                {analysis.company_name || analysis.ticker}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${sc.text} ${sc.bg} border ${sc.border}`}>
                {analysis.sentiment}
              </span>
            </div>
            <SentimentMeter score={analysis.sentiment_score} />
          </div>
          <button
            onClick={fetchAnalysis}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Refresh analisis"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* News */}
        {analysis.news && analysis.news.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Berita Terbaru</h4>
            <div className="space-y-3">
              {analysis.news.map((n, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    n.impact === 'Positive' ? 'bg-emerald-500' :
                    n.impact === 'Negative' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{n.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financials */}
        {analysis.financials && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Laporan Keuangan</h4>
            <div className="space-y-2">
              {analysis.financials.revenue && (
                <FinRow label="Revenue" value={analysis.financials.revenue} />
              )}
              {analysis.financials.net_profit && (
                <FinRow label="Net Profit" value={analysis.financials.net_profit} />
              )}
              {analysis.financials.eps && (
                <FinRow label="EPS" value={analysis.financials.eps} />
              )}
              {analysis.financials.per && (
                <FinRow label="PER" value={analysis.financials.per} />
              )}
              {analysis.financials.pbv && (
                <FinRow label="PBV" value={analysis.financials.pbv} />
              )}
              {analysis.financials.summary && (
                <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-white/[0.04]">
                  {analysis.financials.summary}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Risks */}
        {analysis.risks && analysis.risks.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Risiko</h4>
            <div className="space-y-2">
              {analysis.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-400 text-xs mt-0.5">●</span>
                  <p className="text-sm text-zinc-300">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalysts */}
        {analysis.catalysts && analysis.catalysts.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Katalis Potensial</h4>
            <div className="space-y-2">
              {analysis.catalysts.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 text-xs mt-0.5">●</span>
                  <p className="text-sm text-zinc-300">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key insight */}
      {analysis.key_insight && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <h4 className="text-xs text-blue-400/60 uppercase tracking-wider mb-1">Key Insight</h4>
              <p className="text-sm text-blue-300">{analysis.key_insight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sources */}
      {analysis.sources && analysis.sources.length > 0 && (
        <div className="px-1">
          <p className="text-[10px] text-zinc-600 mb-1">Sumber:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {analysis.sources.map((s, i) => (
              <a
                key={i}
                href={s.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-500 hover:text-zinc-300 truncate max-w-xs transition-colors"
              >
                {s.title || s.uri}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-zinc-700 text-center">
        Analisis AI bukan rekomendasi investasi. Selalu lakukan riset mandiri sebelum trading.
      </p>
    </div>
  );
}

// ── Sub-components ──

function SentimentMeter({ score }) {
  const normalizedScore = Math.max(1, Math.min(10, score || 5));
  const percentage = ((normalizedScore - 1) / 9) * 100;

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] text-red-400">Bearish</span>
      <div className="w-32 h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, #ef4444, #f59e0b, #22c55e)`,
          }}
        />
      </div>
      <span className="text-[10px] text-emerald-400">Bullish</span>
      <span className="text-xs font-mono text-zinc-400 ml-1">{normalizedScore}/10</span>
    </div>
  );
}

function FinRow({ label, value }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm text-white font-mono text-right max-w-[60%]">{value}</span>
    </div>
  );
}
