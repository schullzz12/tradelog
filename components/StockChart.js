"use client";

import { useMemo, useRef, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

export default function StockChart({ trades = [] }) {
  const canvasRef = useRef(null);

  const equityData = useMemo(() => {
    const closed = trades
      .filter((t) => t.status === "closed" && t.exit_date && t.pnl != null)
      .sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date));

    if (closed.length === 0) return [];

    let cumPnl = 0;
    const data = [{ date: closed[0].entry_date, value: 0, label: "Start" }];
    closed.forEach((t) => {
      cumPnl += t.pnl;
      data.push({
        date: t.exit_date.split("T")[0],
        value: cumPnl,
        ticker: t.ticker,
        pnl: t.pnl,
      });
    });
    return data;
  }, [trades]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || equityData.length < 2) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padTop = 20;
    const padBottom = 30;
    const padLeft = 10;
    const padRight = 10;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const values = equityData.map((d) => d.value);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(0, ...values);
    const range = maxVal - minVal || 1;

    function xPos(i) {
      return padLeft + (i / (equityData.length - 1)) * chartW;
    }
    function yPos(val) {
      return padTop + chartH - ((val - minVal) / range) * chartH;
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Zero line
    const zeroY = yPos(0);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, zeroY);
    ctx.lineTo(w - padRight, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gradient fill
    const lastVal = equityData[equityData.length - 1].value;
    const isPositive = lastVal >= 0;
    const gradColor = isPositive ? "34, 197, 94" : "239, 68, 68";

    const gradient = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
    gradient.addColorStop(0, `rgba(${gradColor}, ${isPositive ? 0.15 : 0.02})`);
    gradient.addColorStop(1, `rgba(${gradColor}, ${isPositive ? 0.02 : 0.15})`);

    // Fill area
    ctx.beginPath();
    ctx.moveTo(xPos(0), zeroY);
    equityData.forEach((d, i) => {
      ctx.lineTo(xPos(i), yPos(d.value));
    });
    ctx.lineTo(xPos(equityData.length - 1), zeroY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    equityData.forEach((d, i) => {
      if (i === 0) ctx.moveTo(xPos(i), yPos(d.value));
      else ctx.lineTo(xPos(i), yPos(d.value));
    });
    ctx.strokeStyle = isPositive
      ? "rgba(34, 197, 94, 0.8)"
      : "rgba(239, 68, 68, 0.8)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    const lastX = xPos(equityData.length - 1);
    const lastY = yPos(lastVal);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isPositive
      ? "rgba(34, 197, 94, 1)"
      : "rgba(239, 68, 68, 1)";
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isPositive
      ? "rgba(34, 197, 94, 0.2)"
      : "rgba(239, 68, 68, 0.2)";
    ctx.fill();
  }, [equityData]);

  if (equityData.length < 2) {
    return (
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
        <h3 className="text-sm font-medium text-white mb-4">Equity Curve</h3>
        <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
          Butuh minimal 2 closed trade untuk menampilkan chart
        </div>
      </div>
    );
  }

  const currentEquity = equityData[equityData.length - 1].value;
  const peakEquity = Math.max(...equityData.map((d) => d.value));
  const drawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white">Equity Curve</h3>
          <p
            className={`text-xl font-mono font-semibold mt-1 ${
              currentEquity >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatRupiah(currentEquity)}
          </p>
        </div>
        {drawdown > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Max Drawdown
            </p>
            <p className="text-sm font-mono text-red-400">
              -{drawdown.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: "100%", height: "192px" }}
      />
    </div>
  );
}
