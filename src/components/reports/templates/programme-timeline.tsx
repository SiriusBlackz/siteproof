import { PageFooter, type ReportMeta } from "./report-shell";

export interface TimelineTask {
  id: string;
  name: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progressPct: number;
  status: string;
  depth: number;
  evidenceDates: string[]; // ISO date strings when evidence was captured
}

export function ProgrammeTimeline({
  meta,
  tasks,
  periodStart,
  periodEnd,
}: {
  meta: ReportMeta;
  tasks: TimelineTask[];
  periodStart: string;
  periodEnd: string;
}) {
  // Calculate timeline bounds — use project period or task extremes
  const allDates = tasks.flatMap((t) =>
    [t.plannedStart, t.plannedEnd, t.actualStart, t.actualEnd].filter(Boolean) as string[]
  );
  const timelineStart = allDates.length > 0
    ? allDates.reduce((min, d) => (d < min ? d : min))
    : periodStart;
  const timelineEnd = allDates.length > 0
    ? allDates.reduce((max, d) => (d > max ? d : max))
    : periodEnd;

  const startMs = new Date(timelineStart + "T00:00:00").getTime();
  const endMs = new Date(timelineEnd + "T00:00:00").getTime();
  const rangeMs = endMs - startMs || 1;

  function dateToPercent(date: string): number {
    const ms = new Date(date + "T00:00:00").getTime();
    return Math.max(0, Math.min(100, ((ms - startMs) / rangeMs) * 100));
  }

  // Generate month markers
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(timelineStart + "T00:00:00");
  cursor.setDate(1);
  if (cursor.getTime() < startMs) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= endMs) {
    const iso = cursor.toISOString().split("T")[0];
    months.push({
      label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      pct: dateToPercent(iso),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const rowHeight = 28;
  const headerHeight = 28;
  const chartHeight = headerHeight + tasks.length * rowHeight + 10;

  return (
    <div className="page">
      <h2>Programme Timeline</h2>
      <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
        Gantt chart showing planned schedule with evidence capture markers
      </div>

      <div style={{ display: "flex", gap: 0, fontSize: 10, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        {/* Task name column */}
        <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #e2e8f0" }}>
          <div
            style={{
              height: headerHeight,
              background: "#f8fafc",
              borderBottom: "2px solid #e2e8f0",
              padding: "6px 10px",
              fontWeight: 600,
              color: "#475569",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Task
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                height: rowHeight,
                padding: "4px 10px",
                paddingLeft: 10 + task.depth * 12,
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: 9,
              }}
            >
              <span title={task.name}>{task.name}</span>
            </div>
          ))}
        </div>

        {/* Gantt chart area */}
        <div style={{ flex: 1, position: "relative", minHeight: chartHeight }}>
          {/* Month headers */}
          <div
            style={{
              height: headerHeight,
              background: "#f8fafc",
              borderBottom: "2px solid #e2e8f0",
              position: "relative",
            }}
          >
            {months.map((m, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${m.pct}%`,
                  top: 0,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 4,
                  fontSize: 8,
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Month gridlines */}
          {months.map((m, i) => (
            <div
              key={`grid-${i}`}
              style={{
                position: "absolute",
                left: `${m.pct}%`,
                top: headerHeight,
                bottom: 0,
                width: 1,
                background: "#f1f5f9",
              }}
            />
          ))}

          {/* Today line */}
          {(() => {
            const todayIso = new Date().toISOString().split("T")[0];
            const pct = dateToPercent(todayIso);
            if (pct > 0 && pct < 100) {
              return (
                <div
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: headerHeight,
                    bottom: 0,
                    width: 2,
                    background: "#ef4444",
                    opacity: 0.5,
                    zIndex: 2,
                  }}
                />
              );
            }
            return null;
          })()}

          {/* Task bars */}
          {tasks.map((task, idx) => {
            const top = headerHeight + idx * rowHeight;
            const barTop = top + 6;
            const barHeight = 14;

            return (
              <div key={task.id}>
                {/* Row stripe */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top,
                    height: rowHeight,
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "transparent" : "#fafbfc",
                  }}
                />

                {/* Planned bar */}
                {task.plannedStart && task.plannedEnd && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${dateToPercent(task.plannedStart)}%`,
                      width: `${Math.max(dateToPercent(task.plannedEnd) - dateToPercent(task.plannedStart), 0.5)}%`,
                      top: barTop,
                      height: barHeight,
                      background: "#bfdbfe",
                      borderRadius: 3,
                      border: "1px solid #93c5fd",
                      zIndex: 1,
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      style={{
                        height: "100%",
                        width: `${task.progressPct}%`,
                        background: statusColor(task.status),
                        borderRadius: "2px 0 0 2px",
                        opacity: 0.9,
                      }}
                    />
                  </div>
                )}

                {/* Evidence markers (amber dots) */}
                {task.evidenceDates.map((date, ei) => {
                  const pct = dateToPercent(date);
                  return (
                    <div
                      key={ei}
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: barTop - 2,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        border: "1.5px solid #fff",
                        marginLeft: -4,
                        zIndex: 3,
                      }}
                      title={`Evidence: ${date}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 12,
          fontSize: 9,
          color: "#64748b",
        }}
      >
        <span>
          <span style={{ display: "inline-block", width: 12, height: 8, background: "#bfdbfe", borderRadius: 2, marginRight: 4, verticalAlign: "middle", border: "1px solid #93c5fd" }} />
          Planned Duration
        </span>
        <span>
          <span style={{ display: "inline-block", width: 12, height: 8, background: "#10b981", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />
          Actual Progress
        </span>
        <span>
          <span style={{ display: "inline-block", width: 8, height: 8, background: "#f59e0b", borderRadius: "50%", marginRight: 4, verticalAlign: "middle" }} />
          Evidence Captured
        </span>
        <span>
          <span style={{ display: "inline-block", width: 2, height: 10, background: "#ef4444", marginRight: 4, verticalAlign: "middle", opacity: 0.5 }} />
          Today
        </span>
      </div>

      <PageFooter meta={meta} pageNum={3} />
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#10b981";
    case "in_progress":
      return "#3b82f6";
    case "delayed":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}
