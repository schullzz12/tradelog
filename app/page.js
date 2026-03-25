"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex items-center gap-3 text-zinc-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e4e4ed] overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="border-b border-[#1a1a2a] sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-50">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-base font-semibold text-white tracking-tight">TradeLog</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#kenapa" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">Kenapa Journaling?</a>
            <a href="#harga" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">Harga</a>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-20 pb-12 text-center">
        <div className="max-w-[1100px] mx-auto px-6">
          {/* Shocking stat badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-7 animate-fade-in">
            <span className="text-xs font-semibold text-red-400">82% trader Indonesia rugi.</span>
            <span className="text-xs text-zinc-500">Kamu salah satunya?</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-6 max-w-[750px] mx-auto animate-fade-in stagger-1">
            Bukan strategi kamu yang salah.
            <br />
            <span className="text-zinc-500">Kamu cuma gak pernah evaluasi.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-[560px] mx-auto mb-5 leading-relaxed animate-fade-in stagger-2">
            Selama ini kamu trading tanpa tracking — gak tau seberapa efektif strategi kamu, dan sebesar apa peran emosi mempengaruhi keputusan trading kamu.
          </p>

          <p className="text-sm text-zinc-600 max-w-[500px] mx-auto mb-9 leading-relaxed animate-fade-in stagger-3">
            TradeLog bantu kamu sadar pattern, kontrol emosi, dan tingkatkan win rate — dengan data, bukan feeling.
          </p>

          <div className="mb-4 animate-fade-in stagger-4">
            <Link href="/register" className="inline-flex px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-semibold transition-colors">
              Mulai Evaluasi Trading Kamu →
            </Link>
          </div>
          <p className="text-xs text-zinc-700 animate-fade-in stagger-4">Gratis. Tanpa kartu kredit. Setup 30 detik.</p>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="py-12" id="kenapa">
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-center text-xs font-medium text-zinc-600 uppercase tracking-widest mb-8">Pernah ngerasa gini?</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: "😤", title: '"Kok rugi lagi?"', desc: "Kamu ngulangin kesalahan yang sama berulang kali — tapi gak sadar karena gak pernah review.", color: "bg-red-500" },
              { emoji: "🎰", title: '"Trading kok kayak gambling?"', desc: "Gak ada data, gak ada sistem. Entry karena FOMO, exit karena panik. Ujung-ujungnya gak konsisten.", color: "bg-amber-500" },
              { emoji: "📉", title: '"Win rate tinggi tapi tetap minus"', desc: "Profit kecil-kecil, loss gede sekali. Tanpa tracking R:R ratio, kamu gak akan tau masalahnya di mana.", color: "bg-violet-500" },
            ].map((item, i) => (
              <div key={i} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-7 relative overflow-hidden group hover:border-[#3a3a4f] transition-colors">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${item.color} opacity-50`} />
                <span className="text-3xl block mb-3">{item.emoji}</span>
                <p className="text-[15px] text-white font-medium mb-2">{item.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA PROOF ── */}
      <section className="py-12">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500" />

            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-6">Riset dari 25.000+ trader & 4 juta transaksi</p>

            <div className="grid grid-cols-3 gap-6 mb-7">
              {[
                { num: "82%", color: "text-red-400", desc: "trader tetap rugi meski\nwin rate di atas 50%" },
                { num: "35%", color: "text-amber-400", desc: "win rate saat trading\ndalam kondisi cemas" },
                { num: "70%", color: "text-emerald-400", desc: "win rate saat trading\ndalam kondisi tenang" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className={`text-3xl sm:text-4xl font-bold font-mono ${s.color}`}>{s.num}</p>
                  <p className="text-xs text-zinc-500 mt-1 whitespace-pre-line">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#111118] rounded-xl p-4 border border-[#2a2a3a]">
              <p className="text-sm text-zinc-400 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Insight:</span> Masalah terbesar trader bukan strategi — tapi{" "}
                <span className="text-white font-medium">gak sadar kapan emosi menguasai keputusan</span>. Trader yang journaling bisa identifikasi pattern ini dan menghindarinya.
              </p>
            </div>

            <p className="text-[11px] text-zinc-700 mt-4">
              Sumber: &quot;The Winning Trade&quot; (Cohen, Makov, Schwartz, 2023) · Tradeciety Research · The Trader&apos;s Space
            </p>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section className="py-12">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Dari nebak jadi ngerti</h2>
          <p className="text-center text-sm text-zinc-600 mb-9">Ini yang terjadi kalau kamu mulai journaling dengan serius</p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 items-start">
            {/* Before */}
            <div className="bg-[#16161f] border border-red-500/20 rounded-xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-400">Tanpa Journal</span>
              </div>
              {[
                '"Kayaknya bulan ini profit deh" — tapi pas dihitung ternyata minus',
                "Revenge trading setelah loss — win rate turun ke 25%",
                "Gak tau setup mana yang profitable dan mana yang buang duit",
                'Trading berdasarkan "perasaan", bukan data',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-3.5 last:mb-0">
                  <span className="text-red-400 text-sm mt-0.5 flex-shrink-0">✕</span>
                  <p className="text-sm text-zinc-400 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-center justify-center px-4 self-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>

            {/* Mobile arrow */}
            <div className="flex lg:hidden items-center justify-center py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center rotate-90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>

            {/* After */}
            <div className="bg-[#16161f] border border-emerald-500/20 rounded-xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-400">Dengan TradeLog</span>
              </div>
              {[
                { month: "Bulan 1:", text: "Sadar kalau FOMO trading bikin kamu rugi 40%" },
                { month: "Bulan 3:", text: "Win rate naik dari 45% ke 62% karena hindari bad setup" },
                { month: "Bulan 6:", text: "Tau persis jam, setup, dan kondisi emosi terbaik kamu" },
                { month: "Bulan 12:", text: "Trading dengan confidence — data proves it works" },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-3.5 last:mb-0">
                  <span className="text-emerald-400 text-sm mt-0.5 flex-shrink-0">✓</span>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    <span className="text-white font-medium">{t.month}</span> {t.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section className="py-8">
        <div className="max-w-[700px] mx-auto px-6">
          <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-8 text-center">
            <p className="text-base text-zinc-400 leading-relaxed italic mb-4">
              &quot;Trading journal bukan opsional kalau kamu serius mau profit. Ini pembeda antara menebak dan mengerti, antara mengulangi kesalahan dan belajar darinya.&quot;
            </p>
            <p className="text-xs text-zinc-600">— Berdasarkan konsensus profesional trader & research</p>
          </div>
        </div>
      </section>

      {/* ── 3 STEPS ── */}
      <section className="py-12">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Simpel. Cuma 3 langkah.</h2>
          <p className="text-center text-sm text-zinc-600 mb-10">Gak perlu ribet. Mulai journal hari ini, lihat hasilnya bulan depan.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { num: "1", color: "emerald", title: "Catat setiap trade", desc: "Masukkan entry, exit, setup, dan emosi kamu. Kurang dari 30 detik per trade." },
              { num: "2", color: "blue", title: "TradeLog analisis otomatis", desc: "Dashboard, rapot bulanan, korelasi emosi, performa vs IHSG — semua dihitung otomatis." },
              { num: "3", color: "amber", title: "Improve & profit", desc: "Lihat pattern kamu, hilangkan kebiasaan buruk, dan buat keputusan berdasarkan data." },
            ].map((step, i) => {
              const colors = {
                emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
              };
              return (
                <div key={i} className="text-center p-7">
                  <div className={`w-12 h-12 rounded-xl border ${colors[step.color]} flex items-center justify-center mx-auto mb-4 text-lg font-bold font-mono`}>
                    {step.num}
                  </div>
                  <p className="text-[15px] font-semibold text-white mb-1.5">{step.title}</p>
                  <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── APP PREVIEW ── */}
      <section className="py-8 pb-12">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="max-w-[900px] mx-auto rounded-2xl border border-[#2a2a3a] bg-[#111118] overflow-hidden shadow-2xl shadow-black/40">
            {/* Browser bar */}
            <div className="px-4 py-3 bg-[#0d0d14] border-b border-[#2a2a3a] flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <div className="flex-1 ml-3 h-6 rounded-md bg-[#16161f] flex items-center px-3">
                <span className="text-[11px] text-zinc-600 font-mono">tradelog.co.id/dashboard</span>
              </div>
            </div>
            {/* Dashboard mock */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total P&L", value: "+Rp 53.7M", color: "text-emerald-400" },
                  { label: "Win Rate", value: "75.0%", color: "text-white" },
                  { label: "Grade", value: "A+", color: "text-amber-400" },
                  { label: "vs IHSG", value: "OUTPERFORM", color: "text-emerald-400 text-sm" },
                ].map((card, i) => (
                  <div key={i} className="bg-[#16161f] border border-[#2a2a3a] rounded-lg p-3">
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{card.label}</div>
                    <div className={`text-base font-semibold font-mono ${card.color}`}>{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16161f] border border-[#2a2a3a] rounded-lg p-4">
                <div className="text-[10px] text-zinc-600 mb-2">Equity Curve</div>
                <svg viewBox="0 0 800 100" className="w-full h-[60px]">
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,85 L80,82 L160,78 L240,75 L320,70 L400,55 L480,48 L560,35 L640,25 L720,18 L800,8" fill="none" stroke="#10b981" strokeWidth="2" />
                  <path d="M0,85 L80,82 L160,78 L240,75 L320,70 L400,55 L480,48 L560,35 L640,25 L720,18 L800,8 L800,100 L0,100Z" fill="url(#eqGrad)" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-12" id="harga">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Investasi terkecil untuk trading yang lebih baik</h2>
          <p className="text-center text-sm text-zinc-600 mb-10">Mulai gratis. Satu loss yang kamu hindari sudah balik modal.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[700px] mx-auto">
            {/* Free */}
            <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-8">
              <div className="text-sm text-zinc-500 font-medium mb-1">Free</div>
              <div className="text-4xl font-bold text-white mb-0.5">Rp 0</div>
              <div className="text-xs text-zinc-600 mb-6">Selamanya gratis</div>
              <Link href="/register" className="block text-center py-3 rounded-lg border border-[#2a2a3a] text-sm text-zinc-400 font-medium hover:bg-[#1c1c28] transition-colors mb-6">
                Mulai Sekarang
              </Link>
              <div className="text-sm text-zinc-500 space-y-2.5">
                <p>50 trades / bulan</p>
                <p>Dashboard & statistik</p>
                <p>P&L calendar</p>
                <p>Equity curve</p>
                <p>Export CSV</p>
              </div>
            </div>

            {/* Pro */}
            <div className="bg-[#16161f] border-2 border-emerald-500 rounded-xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-emerald-500 text-[11px] font-semibold text-white">
                Serius Profit
              </div>
              <div className="text-sm text-emerald-400 font-medium mb-1">Pro</div>
              <div className="text-4xl font-bold text-white mb-0.5">Rp 99K</div>
              <div className="text-xs text-zinc-600 mb-6">/ bulan · lebih murah dari 1x loss</div>
              <Link href="/register" className="block text-center py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-semibold transition-colors mb-6">
                Upgrade ke Pro
              </Link>
              <div className="text-sm text-zinc-300 space-y-2.5">
                <p>Unlimited trades</p>
                <p>Rapot bulanan + grade</p>
                <p>Emosi vs win rate analysis</p>
                <p>Performa vs IHSG</p>
                <p>AI Analysis per saham</p>
                <p>Portfolio tracker</p>
                <p>Top 5 saham bulanan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-12 pb-16">
        <div className="max-w-[700px] mx-auto px-6">
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-10 sm:p-12 text-center">
            <p className="text-sm text-zinc-600 mb-3">Masih mau trading tanpa evaluasi?</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Mulai tau <span className="text-emerald-400">kenapa</span> kamu profit.
              <br />
              Mulai tau <span className="text-red-400">kenapa</span> kamu rugi.
            </h2>
            <p className="text-sm text-zinc-500 mb-7">Satu keputusan. 30 detik signup. Trading yang lebih baik dimulai dari sini.</p>
            <Link href="/register" className="inline-flex px-9 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-semibold transition-colors">
              Daftar Gratis Sekarang →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t border-[#1a1a2a]">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-sm text-zinc-600">TradeLog © 2026</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
