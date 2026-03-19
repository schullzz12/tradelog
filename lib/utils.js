import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount) {
  if (amount == null) return "Rp 0";
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID").format(abs);
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${sign}Rp ${formatted}`;
}

export function formatPercent(value) {
  if (value == null) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function getPnlColor(value) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-400";
}

export function getPnlBg(value) {
  if (value > 0) return "bg-emerald-500/10 border-emerald-500/20";
  if (value < 0) return "bg-red-500/10 border-red-500/20";
  return "bg-zinc-500/10 border-zinc-500/20";
}

export function calculatePnl(entryPrice, exitPrice, shares, type = "long") {
  if (!entryPrice || !exitPrice || !shares) return 0;
  if (type === "long") return (exitPrice - entryPrice) * shares;
  return (entryPrice - exitPrice) * shares;
}

export function calculatePnlPercent(entryPrice, exitPrice, type = "long") {
  if (!entryPrice || !exitPrice) return 0;
  if (type === "long") return ((exitPrice - entryPrice) / entryPrice) * 100;
  return ((entryPrice - exitPrice) / entryPrice) * 100;
}
