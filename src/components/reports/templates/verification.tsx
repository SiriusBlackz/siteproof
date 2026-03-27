import { PageFooter, type ReportMeta } from "./report-shell";

export interface VerificationStats {
  totalEvidence: number;
  withExifData: number;
  withGpsCoords: number;
  gpsVerifiedByZone: number;
  averageUploadDelay: string; // human-readable, e.g. "2h 15m"
  maxUploadDelay: string;
  evidenceByType: { type: string; count: number }[];
  auditTrailSummary: AuditEntry[];
}

export interface AuditEntry {
  date: string;
  user: string;
  action: string;
  entity: string;
}

export function VerificationPage({
  meta,
  stats,
  startPage,
}: {
  meta: ReportMeta;
  stats: VerificationStats;
  startPage: number;
}) {
  const exifRate =
    stats.totalEvidence > 0
      ? Math.round((stats.withExifData / stats.totalEvidence) * 100)
      : 0;
  const gpsRate =
    stats.totalEvidence > 0
      ? Math.round((stats.withGpsCoords / stats.totalEvidence) * 100)
      : 0;
  const zoneRate =
    stats.withGpsCoords > 0
      ? Math.round((stats.gpsVerifiedByZone / stats.withGpsCoords) * 100)
      : 0;

  return (
    <div className="page">
      <h2>Verification & Metadata</h2>
      <div className="text-sm text-muted" style={{ marginBottom: 20 }}>
        Data integrity analysis for evidence submitted during the reporting period
      </div>

      {/* Integrity metrics */}
      <h3>Data Integrity</h3>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <IntegrityCard
          label="EXIF Preserved"
          value={`${exifRate}%`}
          detail={`${stats.withExifData} of ${stats.totalEvidence} items`}
          color={exifRate >= 80 ? "#10b981" : exifRate >= 50 ? "#f59e0b" : "#ef4444"}
        />
        <IntegrityCard
          label="GPS Coordinates"
          value={`${gpsRate}%`}
          detail={`${stats.withGpsCoords} of ${stats.totalEvidence} items`}
          color={gpsRate >= 80 ? "#10b981" : gpsRate >= 50 ? "#f59e0b" : "#ef4444"}
        />
        <IntegrityCard
          label="Zone Verified"
          value={`${zoneRate}%`}
          detail={`${stats.gpsVerifiedByZone} of ${stats.withGpsCoords} GPS items`}
          color={zoneRate >= 80 ? "#10b981" : zoneRate >= 50 ? "#f59e0b" : "#ef4444"}
        />
      </div>

      {/* Upload timing analysis */}
      <h3>Upload vs Capture Timing</h3>
      <table style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Average delay (capture → upload)</td>
            <td>{stats.averageUploadDelay}</td>
          </tr>
          <tr>
            <td>Maximum delay</td>
            <td>{stats.maxUploadDelay}</td>
          </tr>
        </tbody>
      </table>

      {/* Evidence by type */}
      <h3>Evidence Breakdown</h3>
      <table style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Type</th>
            <th style={{ textAlign: "right" }}>Count</th>
            <th style={{ textAlign: "right" }}>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {stats.evidenceByType.map((item) => (
            <tr key={item.type}>
              <td style={{ textTransform: "capitalize" }}>{item.type}</td>
              <td style={{ textAlign: "right" }}>{item.count}</td>
              <td style={{ textAlign: "right" }}>
                {stats.totalEvidence > 0
                  ? Math.round((item.count / stats.totalEvidence) * 100)
                  : 0}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Audit trail */}
      {stats.auditTrailSummary.length > 0 && (
        <>
          <h3>Audit Trail Summary</h3>
          <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
            Recent activity during reporting period (most recent first)
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {stats.auditTrailSummary.slice(0, 20).map((entry, i) => (
                <tr key={i}>
                  <td className="text-muted">{formatDateTime(entry.date)}</td>
                  <td>{entry.user}</td>
                  <td>
                    <span className={`badge ${actionBadge(entry.action)}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td>{entry.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <PageFooter meta={meta} pageNum={startPage} />
    </div>
  );
}

function IntegrityCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "14px 16px",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: "#94a3b8" }}>{detail}</div>
    </div>
  );
}

function actionBadge(action: string): string {
  switch (action) {
    case "create":
      return "badge-green";
    case "update":
      return "badge-blue";
    case "delete":
      return "badge-red";
    default:
      return "badge-gray";
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
