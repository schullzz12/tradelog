'use client';

import { useState, useEffect } from 'react';

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
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/20"
        >
          Analisis dengan AI ✨
        </button>
      </div>
    );
  }

  // Loading with progress steps
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
        <LoadingSteps ticker={ticker.toUpperCase()} />
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

  // ── Results (redesigned) ──
  const sentimentConfig = {
    Bullish: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', barColor: '#22c55e' },
    Bearish: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', barColor: '#ef4444' },
    Neutral: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', barColor: '#f59e0b' },
  };
  const sc = sentimentConfig[analysis.sentiment] || sentimentConfig.Neutral;

  return (
    <div className="space-y-4">
      {/* Header: Sentiment + Summary — redesigned with prominent score */}
      <div className={`rounded-xl border ${sc.border} ${sc.bg} p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base font-semibold text-white">
                {analysis.company_name || analysis.ticker}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${sc.text} ${sc.bg} border ${sc.border}`}>
                {analysis.sentiment}
              </span>
            </div>
            <SentimentMeter score={analysis.sentiment_score} config={sc} />
          </div>
          <div className="flex items-center gap-3 ml-4">
            {/* Big score number */}
            <div className="flex items-baseline gap-0.5">
              <span className={`text-3xl font-mono font-bold ${sc.text}`}>
                {Math.max(1, Math.min(10, analysis.sentiment_score || 5))}
              </span>
              <span className="text-sm text-zinc-600 font-mono">/10</span>
            </div>
            <button
              onClick={fetchAnalysis}
              className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/[0.04]"
              title="Refresh analisis"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* News — redesigned with date + impact badges */}
        {analysis.news && analysis.news.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-blue-500" />
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Berita Terbaru</h4>
            </div>
            <div className="space-y-3.5">
              {analysis.news.map((n, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    n.impact === 'Positive' ? 'bg-emerald-500' :
                    n.impact === 'Negative' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{n.summary}</p>
                    {/* Impact badge */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        n.impact === 'Positive' ? 'bg-emerald-500/10 text-emerald-400' :
                        n.impact === 'Negative' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {n.impact || 'Neutral'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financials — redesigned with striped rows + highlighted valuation */}
        {analysis.financials && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-purple-500" />
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Laporan Keuangan</h4>
            </div>
            <div className="space-y-1.5">
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
                <FinRow label="PER" value={analysis.financials.per} highlight />
              )}
              {analysis.financials.pbv && (
                <FinRow label="PBV" value={analysis.financials.pbv} highlight />
              )}
              {analysis.financials.summary && (
                <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-white/[0.04] leading-relaxed">
                  {analysis.financials.summary}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Risks — redesigned with red-tinted cards */}
        {analysis.risks && analysis.risks.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-red-500" />
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Risiko</h4>
            </div>
            <div className="space-y-2">
              {analysis.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/[0.08]">
                  <span className="text-red-400 text-xs mt-0.5 shrink-0">!</span>
                  <p className="text-sm text-zinc-300 leading-snug">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalysts — redesigned with green-tinted cards */}
        {analysis.catalysts && analysis.catalysts.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-emerald-500" />
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Katalis Potensial</h4>
            </div>
            <div className="space-y-2">
              {analysis.catalysts.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
                  <span className="text-emerald-400 text-xs mt-0.5 shrink-0">▲</span>
                  <p className="text-sm text-zinc-300 leading-snug">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key insight */}
      {analysis.key_insight && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <h4 className="text-xs text-blue-400/60 uppercase tracking-wider mb-1">Key Insight</h4>
              <p className="text-sm text-blue-300 leading-relaxed">{analysis.key_insight}</p>
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

// ── Redesigned sentiment meter with wider bar ──
function SentimentMeter({ score, config }) {
  const normalizedScore = Math.max(1, Math.min(10, score || 5));
  const percentage = ((normalizedScore - 1) / 9) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-red-400 shrink-0">Bearish</span>
      <div className="w-28 h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
          }}
        />
      </div>
      <span className="text-[10px] text-emerald-400 shrink-0">Bullish</span>
    </div>
  );
}

// ── Redesigned financial row with striped bg + valuation highlight ──
function FinRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
      highlight ? 'bg-amber-500/[0.04]' : 'bg-white/[0.02]'
    }`}>
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm font-mono text-right max-w-[60%] ${
        highlight ? 'text-amber-400' : 'text-white'
      }`}>
        {value}
      </span>
    </div>
  );
}

// ── Loading progress steps ──
function LoadingSteps({ ticker }) {
  const [step, setStep] = useState(0);

  const steps = [
    { label: `Mencari berita terbaru ${ticker}...`, icon: '🔍' },
    { label: 'Menganalisis sentimen pasar...', icon: '📊' },
    { label: 'Menyusun laporan keuangan...', icon: '📋' },
    { label: 'Merangkum insight...', icon: '💡' },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2000),
      setTimeout(() => setStep(2), 5000),
      setTimeout(() => setStep(3), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 transition-all duration-300 ${
            i <= step ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {i < step ? (
            <span className="text-emerald-400 text-sm">✓</span>
          ) : i === step ? (
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className={`text-sm ${
            i < step ? 'text-zinc-500' : i === step ? 'text-zinc-300' : 'text-zinc-600'
          }`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
