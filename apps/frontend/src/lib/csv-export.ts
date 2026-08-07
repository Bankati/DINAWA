export interface CsvColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// Export CSV 100% côté client à partir des données déjà chargées dans la
// page — aucun endpoint d'export PDF/XLSX n'existe côté backend (voir
// progress-tracker.md, unité 23), mais un CSV des lignes affichées est
// entièrement réalisable sans backend.
export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(";");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.value(row))).join(";"),
  );
  // BOM UTF-8 — nécessaire pour qu'Excel affiche correctement les accents
  const csv = "﻿" + [header, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
