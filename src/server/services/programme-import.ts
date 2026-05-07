import { XMLParser } from "fast-xml-parser";

export interface ParsedTask {
  sourceRef: string;
  name: string;
  parentSourceRef: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressPct: number;
  sortOrder: number;
}

export type ProgrammeFormat = "msproject" | "p6" | "xlsx";

export interface ParseResult {
  format: ProgrammeFormat;
  tasks: ParsedTask[];
}

function toDateString(val: unknown): string | null {
  if (!val) return null;
  const str = String(val);
  // Handle ISO datetime or date-only
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Parse MS Project XML format.
 * Structure: <Project><Tasks><Task>...</Task></Tasks></Project>
 */
export function parseMSProjectXML(xml: string): ParsedTask[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    isArray: (name) => name === "Task",
  });
  const doc = parser.parse(xml);
  const project = doc.Project;
  if (!project?.Tasks?.Task) {
    throw new Error("No tasks found in MS Project XML");
  }

  const rawTasks = toArray(project.Tasks.Task);
  const result: ParsedTask[] = [];

  // Track parent stack by outline level
  const parentStack: { uid: string; level: number }[] = [];

  for (let i = 0; i < rawTasks.length; i++) {
    const t = rawTasks[i];
    const uid = String(t.UID ?? i);
    const name = String(t.Name ?? "Unnamed Task");
    const level = Number(t.OutlineLevel ?? 0);
    const pct = Number(t.PercentComplete ?? 0);

    // Skip the project summary task (OutlineLevel 0)
    if (level === 0) continue;

    // Find parent: pop stack until we find a task at level - 1
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
      parentStack.pop();
    }
    const parentRef = parentStack.length > 0 ? parentStack[parentStack.length - 1].uid : null;

    parentStack.push({ uid, level });

    result.push({
      sourceRef: uid,
      name,
      parentSourceRef: parentRef,
      plannedStart: toDateString(t.Start),
      plannedEnd: toDateString(t.Finish),
      progressPct: Math.min(Math.max(pct, 0), 100),
      sortOrder: result.length,
    });
  }

  return result;
}

/**
 * Parse Primavera P6 XML format.
 * Look for <Activity> elements under various possible root structures.
 */
export function parseP6XML(xml: string): ParsedTask[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    isArray: (name) => name === "Activity" || name === "WBS",
  });
  const doc = parser.parse(xml);

  // Navigate to activities - P6 XML has varying structures
  let activities: Record<string, unknown>[] = [];

  // Try common P6 structures
  const root = doc.APIBusinessObjects ?? doc.Project ?? doc;
  if (root.Activity) {
    activities = toArray(root.Activity);
  } else if (root.ProjectData?.Activity) {
    activities = toArray(root.ProjectData.Activity);
  } else if (root.Project?.Activity) {
    activities = toArray(root.Project.Activity);
  }

  if (activities.length === 0) {
    throw new Error("No activities found in P6 XML");
  }

  return activities.map((a, i) => ({
    sourceRef: String(a.Id ?? a.ObjectId ?? a.ActivityId ?? i),
    name: String(a.Name ?? a.ActivityName ?? "Unnamed Activity"),
    parentSourceRef: a.ParentObjectId ? String(a.ParentObjectId) : null,
    plannedStart: toDateString(a.PlannedStartDate ?? a.StartDate),
    plannedEnd: toDateString(a.PlannedFinishDate ?? a.FinishDate),
    progressPct: Math.min(Math.max(Number(a.PercentComplete ?? a.PhysicalPercentComplete ?? 0), 0), 100),
    sortOrder: i,
  }));
}

/**
 * Auto-detect format and parse.
 */
export function detectAndParse(xml: string): ParseResult {
  // Quick heuristic: check for MS Project markers
  if (xml.includes("<Project") && xml.includes("<Tasks>")) {
    return { format: "msproject", tasks: parseMSProjectXML(xml) };
  }

  if (xml.includes("<Activity") || xml.includes("Primavera")) {
    return { format: "p6", tasks: parseP6XML(xml) };
  }

  // Try MS Project first as fallback
  try {
    const tasks = parseMSProjectXML(xml);
    if (tasks.length > 0) return { format: "msproject", tasks };
  } catch {
    // ignore
  }

  try {
    const tasks = parseP6XML(xml);
    if (tasks.length > 0) return { format: "p6", tasks };
  } catch {
    // ignore
  }

  throw new Error(
    "Unrecognized XML format. Please upload an MS Project XML or Primavera P6 XML file."
  );
}
