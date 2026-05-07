import ExcelJS from "exceljs";

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Programme");
  ws.columns = [
    { header: "WBS", key: "wbs", width: 10 },
    { header: "Task Name", key: "name", width: 35 },
    { header: "Start Date", key: "start", width: 14 },
    { header: "End Date", key: "end", width: 14 },
    { header: "% Complete", key: "pct", width: 10 },
  ];
  ws.addRows([
    { wbs: "1", name: "Site preparation", start: "2026-05-01", end: "2026-05-14", pct: 100 },
    { wbs: "1.1", name: "Survey & marking", start: "2026-05-01", end: "2026-05-03", pct: 100 },
    { wbs: "1.2", name: "Hoarding install", start: "2026-05-04", end: "2026-05-07", pct: 100 },
    { wbs: "1.3", name: "Welfare setup", start: "2026-05-08", end: "2026-05-14", pct: 80 },
    { wbs: "2", name: "Substructure", start: "2026-05-15", end: "2026-06-12", pct: 35 },
    { wbs: "2.1", name: "Excavation", start: "2026-05-15", end: "2026-05-22", pct: 100 },
    { wbs: "2.2", name: "Foundations RC", start: "2026-05-23", end: "2026-06-05", pct: 60 },
    { wbs: "2.3", name: "Drainage runs", start: "2026-06-06", end: "2026-06-12", pct: 0 },
    { wbs: "3", name: "Superstructure", start: "2026-06-13", end: "2026-08-15", pct: 0 },
    { wbs: "3.1", name: "Steel frame erect", start: "2026-06-13", end: "2026-07-10", pct: 0 },
    { wbs: "3.2", name: "Floor slabs", start: "2026-07-11", end: "2026-08-15", pct: 0 },
  ]);
  await wb.xlsx.writeFile("/tmp/sample-programme.xlsx");
  console.log("wrote /tmp/sample-programme.xlsx");
}
main();
