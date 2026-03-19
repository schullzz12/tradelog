import TradeEntryForm from "@/components/TradeEntryForm";

export default function NewTradePage() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Trade Baru</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Catat trade terbaru kamu
        </p>
      </div>
      <TradeEntryForm />
    </div>
  );
}
