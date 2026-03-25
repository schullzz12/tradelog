"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    function handleError(event) {
      console.error("Caught error:", event.error);
      setHasError(true);
      setErrorMsg(event.error?.message || "Terjadi kesalahan");
    }

    function handleRejection(event) {
      console.error("Unhandled rejection:", event.reason);
      setHasError(true);
      setErrorMsg(event.reason?.message || "Terjadi kesalahan");
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Oops, ada yang salah
          </h2>
          <p className="text-sm text-zinc-500 mb-2">
            Terjadi error yang tidak terduga. Coba refresh halaman atau kembali ke dashboard.
          </p>
          {errorMsg && (
            <p className="text-xs text-zinc-700 mb-5 font-mono bg-[#111118] rounded-lg p-3 border border-[#2a2a3a]">
              {errorMsg}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setHasError(false);
                setErrorMsg("");
                window.location.reload();
              }}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              Refresh Halaman
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-lg border border-[#2a2a3a] text-sm text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition-colors"
            >
              Ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
