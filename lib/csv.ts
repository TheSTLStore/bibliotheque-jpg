interface CsvRow {
  [key: string]: string | number | null | undefined;
}

export function generateCsv(rows: CsvRow[], columns: string[]): string {
  const BOM = "\uFEFF";
  const header = columns.join(";");

  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(";")
  );

  return BOM + header + "\n" + lines.join("\n");
}
