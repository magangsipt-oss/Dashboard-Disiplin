export const REPORT_STORAGE_KEY = "lapor-satgas-reports-v1";

export function normalizeTrackingCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function readStoredReports() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredReport(report) {
  if (typeof window === "undefined") return null;

  const normalizedReport = {
    ...report,
    kodePelacakan: normalizeTrackingCode(report?.kodePelacakan),
    status: report?.status ?? "Diterima",
    createdAt: report?.createdAt ?? new Date().toISOString(),
  };

  const reports = readStoredReports();
  const nextReports = [
    normalizedReport,
    ...reports.filter((item) => normalizeTrackingCode(item?.kodePelacakan) !== normalizedReport.kodePelacakan),
  ];

  window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(nextReports));
  return normalizedReport;
}

export function findStoredReportByCode(code) {
  const normalizedCode = normalizeTrackingCode(code);
  if (!normalizedCode) return null;

  return readStoredReports().find(
    (report) => normalizeTrackingCode(report?.kodePelacakan) === normalizedCode,
  ) ?? null;
}
