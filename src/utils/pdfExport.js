import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const SENSOR_DATA_COLUMNS = [
  { key: "time", label: "Horário" },
  { key: "pessoas", label: "Pessoas" },
  { key: "tempInt", label: "Temp. int. (°C)" },
  { key: "tempExt", label: "Temp. ext. (°C)" },
  { key: "tempAlvo", label: "Temp. alvo (°C)" },
  { key: "umidInt", label: "Umid. int. (%)" },
  { key: "umidExt", label: "Umid. ext. (%)" },
];

const BRAND = {
  accent: "#3b82f6",
  faded: "#64748b",
  text: "#0b1117",
  textMuted: "#475569",
  surface: "#0f1923",
  border: "#e2e8f0",
  zebra: "#f4f5f7",
  headerBg: "#0f1923",
  headerText: "#e8e6e1",
};

function downsample(rows, max) {
  if (rows.length <= max) return rows;
  const step = (rows.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(rows[Math.round(i * step)]);
  return out;
}

function formatCell(value) {
  if (value == null) return "";
  return String(value);
}

function drawHeader(doc, { periodLabel, generatedAt, rowCount, totalCount }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  doc.setFillColor(BRAND.headerBg);
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(BRAND.accent);
  const climaText = "clima";
  doc.text(climaText, marginX, 17);
  const climaWidth = doc.getTextWidth(climaText);
  doc.setTextColor(BRAND.headerText);
  doc.text("control", marginX + climaWidth, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.headerText);
  doc.text("Sistema de climatização autônoma", marginX, 22.5);

  doc.setFontSize(9);
  doc.setTextColor(BRAND.headerText);
  const rightLine1 = `Período: ${periodLabel}`;
  const rightLine2 = `Gerado em: ${generatedAt}`;
  const rightLine3 =
    rowCount < totalCount
      ? `Amostra: ${rowCount} de ${totalCount} registros`
      : `Registros: ${rowCount}`;
  doc.text(rightLine1, pageWidth - marginX, 11, { align: "right" });
  doc.text(rightLine2, pageWidth - marginX, 16, { align: "right" });
  doc.text(rightLine3, pageWidth - marginX, 21, { align: "right" });

  doc.setDrawColor(BRAND.accent);
  doc.setLineWidth(0.6);
  doc.line(marginX, 30, pageWidth - marginX, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(BRAND.text);
  doc.text("Log do sistema", marginX, 38);
}

function drawFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  doc.setDrawColor(BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(BRAND.textMuted);
  doc.text(
    "ESP32 + Firebase + React — relatório de climatização",
    marginX,
    pageHeight - 8
  );
  doc.text(
    "climacontrol",
    pageWidth - marginX,
    pageHeight - 8,
    { align: "right" }
  );
}

export function downloadSensorPdf({
  filename,
  rows,
  periodLabel,
  columns = SENSOR_DATA_COLUMNS,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const tableTop = 42;

  const totalCount = rows.length;
  const TIERS = [
    { maxRows: 30, fontSize: 9, cellPadding: 1.2 },
    { maxRows: 36, fontSize: 8, cellPadding: 1.0 },
    { maxRows: 42, fontSize: 7, cellPadding: 0.8 },
  ];
  const cap = TIERS[TIERS.length - 1].maxRows;
  const sampledRows = downsample(rows, cap);
  const tier =
    TIERS.find((t) => sampledRows.length <= t.maxRows) ?? TIERS[TIERS.length - 1];

  const generatedAt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  drawHeader(doc, {
    periodLabel,
    generatedAt,
    rowCount: sampledRows.length,
    totalCount,
  });

  if (sampledRows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(BRAND.textMuted);
    doc.text(
      "Nenhum dado disponível para o período selecionado.",
      marginX,
      tableTop + 8
    );
    drawFooter(doc);
    doc.save(filename);
    return;
  }

  const head = [columns.map((c) => c.label)];
  const body = sampledRows.map((r) => columns.map((c) => formatCell(r[c.key])));

  const usableWidth = pageWidth - marginX * 2;

  autoTable(doc, {
    head,
    body,
    startY: tableTop,
    margin: { left: marginX, right: marginX, bottom: 18 },
    tableWidth: usableWidth,
    styles: {
      font: "helvetica",
      fontSize: tier.fontSize,
      cellPadding: tier.cellPadding,
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.1,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND.accent,
      textColor: "#ffffff",
      fontStyle: "bold",
      halign: "center",
      lineColor: BRAND.accent,
    },
    alternateRowStyles: {
      fillColor: BRAND.zebra,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", textColor: BRAND.surface },
    },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      drawFooter(doc);
    },
  });

  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  doc.save(filename);
}
