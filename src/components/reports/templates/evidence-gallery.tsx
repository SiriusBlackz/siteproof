import { PageFooter, type ReportMeta } from "./report-shell";

export interface GalleryTask {
  id: string;
  name: string;
  evidence: GalleryEvidence[];
}

export interface GalleryEvidence {
  id: string;
  publicUrl: string;
  originalFilename: string | null;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  uploaderName: string | null;
  uploaderRole: string | null;
  note: string | null;
}

export function EvidenceGalleryPage({
  meta,
  tasks,
  startPage,
}: {
  meta: ReportMeta;
  tasks: GalleryTask[];
  startPage: number;
}) {
  // Group into pages — roughly 4 photos per page section
  const pages: { tasks: GalleryTask[]; pageNum: number }[] = [];
  let currentPage: GalleryTask[] = [];
  let photoCount = 0;
  let pageNum = startPage;

  for (const task of tasks) {
    if (photoCount + task.evidence.length > 6 && currentPage.length > 0) {
      pages.push({ tasks: currentPage, pageNum });
      currentPage = [];
      photoCount = 0;
      pageNum++;
    }
    currentPage.push(task);
    photoCount += task.evidence.length;
  }
  if (currentPage.length > 0) {
    pages.push({ tasks: currentPage, pageNum });
  }

  if (pages.length === 0) {
    return null;
  }

  return (
    <>
      {pages.map((page, pi) => (
        <div className="page" key={pi}>
          {pi === 0 && <h2>Evidence Gallery</h2>}
          {pi === 0 && (
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Photos grouped by linked task, with capture metadata
            </div>
          )}

          {page.tasks.map((task) => (
            <div key={task.id} style={{ marginBottom: 20 }}>
              <h3 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                {task.name}
                <span className="text-xs text-muted" style={{ marginLeft: 8, fontWeight: 400 }}>
                  ({task.evidence.length} item{task.evidence.length !== 1 ? "s" : ""})
                </span>
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                {task.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="evidence-card"
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={ev.publicUrl}
                      alt={ev.originalFilename ?? "Evidence"}
                      data-evidence="true"
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        display: "block",
                        background: "#f1f5f9",
                      }}
                    />
                    <div style={{ padding: "8px 10px", fontSize: 9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {ev.originalFilename ?? "Photo"}
                        </span>
                        {ev.capturedAt && (
                          <span className="text-muted">
                            {formatDateTime(ev.capturedAt)}
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#64748b", lineHeight: 1.6 }}>
                        {ev.latitude != null && ev.longitude != null && (
                          <div>
                            GPS: {ev.latitude.toFixed(6)}, {ev.longitude.toFixed(6)}
                          </div>
                        )}
                        {ev.uploaderName && (
                          <div>
                            Uploaded by: {ev.uploaderName}
                            {ev.uploaderRole ? ` (${ev.uploaderRole})` : ""}
                          </div>
                        )}
                        {ev.note && (
                          <div style={{ fontStyle: "italic", marginTop: 2, wordBreak: "break-word", maxHeight: 36, overflow: "hidden" }}>
                            "{ev.note.length > 200 ? ev.note.slice(0, 200) + "..." : ev.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <PageFooter meta={meta} pageNum={page.pageNum} />
        </div>
      ))}
    </>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
