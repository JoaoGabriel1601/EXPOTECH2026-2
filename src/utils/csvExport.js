export function dataToCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          if (val == null) return "";
          const str = String(val);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

const UTF8_BOM = "﻿";

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([UTF8_BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SENSOR_DATA_COLUMNS = [
  { key: "time", label: "Horário" },
  { key: "pessoas", label: "Pessoas" },
  { key: "tempInt", label: "Temp. interna (°C)" },
  { key: "tempExt", label: "Temp. externa (°C)" },
  { key: "tempAlvo", label: "Temp. alvo (°C)" },
  { key: "umidInt", label: "Umidade interna (%)" },
  { key: "umidExt", label: "Umidade externa (%)" },
];
