import { describe, it, expect } from "vitest";
import { dataToCsv } from "./csvExport";

describe("dataToCsv", () => {
  const columns = [
    { key: "time", label: "Horário" },
    { key: "pessoas", label: "Pessoas" },
    { key: "tempInt", label: "Temp. interna" },
  ];

  it("monta header e linhas", () => {
    const rows = [
      { time: "10:00", pessoas: 10, tempInt: 22.5 },
      { time: "10:10", pessoas: 12, tempInt: 22.8 },
    ];
    const csv = dataToCsv(rows, columns);
    expect(csv).toBe(
      "Horário,Pessoas,Temp. interna\n10:00,10,22.5\n10:10,12,22.8"
    );
  });

  it("escapa vírgulas, aspas e quebras de linha", () => {
    const rows = [{ time: "10:00", pessoas: 'a,"b"\nc', tempInt: 22 }];
    const csv = dataToCsv(rows, columns);
    expect(csv).toContain('"a,""b""\nc"');
  });

  it("trata valores null/undefined como string vazia", () => {
    const rows = [{ time: "10:00", pessoas: null, tempInt: undefined }];
    const csv = dataToCsv(rows, columns);
    expect(csv).toBe("Horário,Pessoas,Temp. interna\n10:00,,");
  });
});
