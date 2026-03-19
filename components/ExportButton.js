"use client";

import { useState } from "react";

export default function ExportButton({ trades = [] }) {
  const [showMenu, setShowMenu] = useState(false);

  function exportCSV() {
    if (trades.length === 0) return;

    const headers = [
      "Tanggal Entry",
      "Tanggal Exit",
      "Kode Saham",
      "Tipe",
      "Harga Entry",
      "Harga Exit",
      "Jumlah Lot",
      "Jumlah Lembar",
      "P&L (Rp)",
      "P&L (%)",
      "Status",
      "Setup",
      "Emosi",
      "Catatan",
    ];

    const rows = trades.map((t) => [
      t.entry_date || "",
      t.exit_date || "",
      t.ticker || "",
      t.type || "",
      t.entry_price || "",
      t.exit_price || "",
      t.shares ? t.shares / 100 : "",
      t.shares || "",
      t.pnl || "",
      t.pnl_percent ? t.pnl_percent.toFixed(2) : "",
      t.status || "",
      t.setup_tag || "",
      t.emotion_tag || "",
      (t.notes || "").replace(/[\n\r,]/g, " "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `tradelog-export-${formatFileDate()}.csv`);
    setShowMenu(false);
  }

  function exportExcel() {
    if (trades.length === 0) return;

    // Build simple XML-based Excel file (opens in Excel without dependencies)
    const headers = [
      "Tanggal Entry",
      "Tanggal Exit",
      "Kode Saham",
      "Tipe",
      "Harga Entry",
      "Harga Exit",
      "Jumlah Lot",
      "Jumlah Lembar",
      "P&L (Rp)",
      "P&L (%)",
      "Status",
      "Setup",
      "Emosi",
      "Catatan",
    ];

    const rows = trades.map((t) => [
      { v: t.entry_date || "", t: "String" },
      { v: t.exit_date || "", t: "String" },
      { v: t.ticker || "", t: "String" },
      { v: t.type || "", t: "String" },
      { v: t.entry_price || 0, t: "Number" },
      { v: t.exit_price || 0, t: "Number" },
      { v: t.shares ? t.shares / 100 : 0, t: "Number" },
      { v: t.shares || 0, t: "Number" },
      { v: t.pnl || 0, t: "Number" },
      { v: t.pnl_percent ? Number(t.pnl_percent.toFixed(2)) : 0, t: "Number" },
      { v: t.status || "", t: "String" },
      { v: t.setup_tag || "", t: "String" },
      { v: t.emotion_tag || "", t: "String" },
      { v: (t.notes || "").replace(/[\n\r]/g, " "), t: "String" },
    ]);

    const headerRow = headers
      .map(
        (h) =>
          `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
      )
      .join("");

    const dataRows = rows
      .map(
        (row) =>
          `<Row>${row
            .map(
              (cell) =>
                `<Cell><Data ss:Type="${cell.t}">${escapeXml(String(cell.v))}</Data></Cell>`
            )
            .join("")}</Row>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#16161f" ss:Pattern="Solid"/>
      <Font ss:Color="#22c55e" ss:Bold="1"/>
    </Style>
    <Style ss:ID="number">
      <NumberFormat ss:Format="#,##0"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="TradeLog">
    <Table>
      <Row ss:StyleID="header">${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    downloadBlob(blob, `tradelog-export-${formatFileDate()}.xls`);
    setShowMenu(false);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatFileDate() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  function escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={trades.length === 0}
        className="inline-flex items-center gap-2 px-3 py-2 bg-[#16161f] hover:bg-[#1c1c28] border border-[#2a2a3a] text-zinc-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#16161f] border border-[#2a2a3a] rounded-lg shadow-xl z-50 overflow-hidden">
            <button
              onClick={exportCSV}
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-[#1c1c28] hover:text-white transition-colors flex items-center gap-3"
            >
              <span className="text-xs font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                CSV
              </span>
              Export CSV
            </button>
            <button
              onClick={exportExcel}
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-[#1c1c28] hover:text-white transition-colors flex items-center gap-3"
            >
              <span className="text-xs font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                XLS
              </span>
              Export Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
