import { eq, desc, gte } from "drizzle-orm";
import { pointInPolygon } from "@/lib/geo";
import {
  tasks,
  gpsZones,
  evidenceLinks,
  type evidence as evidenceTable,
} from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

interface EvidenceInput {
  latitude: number | null;
  longitude: number | null;
  capturedAt: Date | null;
  projectId: string;
}

export interface TaskSuggestion {
  taskId: string;
  taskName: string;
  confidence: number;
  reasons: string[];
}

export async function suggestTasks(
  db: DB,
  evidence: EvidenceInput
): Promise<TaskSuggestion[]> {
  const scores = new Map<string, { score: number; name: string; reasons: string[] }>();

  function addScore(taskId: string, taskName: string, points: number, reason: string) {
    const existing = scores.get(taskId) ?? { score: 0, name: taskName, reasons: [] };
    existing.score += points;
    existing.reasons.push(reason);
    scores.set(taskId, existing);
  }

  // 1. GPS match (max 50 points)
  if (evidence.latitude != null && evidence.longitude != null) {
    const zones = await db.query.gpsZones.findMany({
      where: eq(gpsZones.projectId, evidence.projectId),
      with: {
        defaultTask: { columns: { id: true, name: true } },
      },
    });

    const point: [number, number] = [evidence.longitude, evidence.latitude];

    for (const zone of zones) {
      const polygon = zone.polygon as { type: string; coordinates: number[][][] };
      if (pointInPolygon(point, polygon.coordinates)) {
        if (zone.defaultTask) {
          addScore(
            zone.defaultTask.id,
            zone.defaultTask.name,
            50,
            `GPS zone: ${zone.name}`
          );
        }
      }
    }
  }

  // 2. Time match (max 30 points)
  if (evidence.capturedAt) {
    const capturedDate = evidence.capturedAt.toISOString().split("T")[0];

    const projectTasks = await db.query.tasks.findMany({
      where: eq(tasks.projectId, evidence.projectId),
      columns: {
        id: true,
        name: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        actualEnd: true,
      },
    });

    for (const task of projectTasks) {
      // Prefer actual dates over planned dates
      const startDate = task.actualStart ?? task.plannedStart;
      const endDate = task.actualEnd ?? task.plannedEnd;

      if (startDate && endDate) {
        if (capturedDate >= startDate && capturedDate <= endDate) {
          const isActual = task.actualStart || task.actualEnd;
          addScore(task.id, task.name, 30, isActual ? "Active during capture (actual)" : "Active during capture date");
        }
      } else if (startDate && !endDate) {
        if (capturedDate >= startDate) {
          addScore(task.id, task.name, 15, "Started before capture date");
        }
      }
    }
  }

  // 3. Recency boost (max 20 points)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentLinks = await db.query.evidenceLinks.findMany({
    where: gte(evidenceLinks.createdAt, thirtyDaysAgo),
    with: {
      task: { columns: { id: true, name: true, projectId: true } },
    },
    orderBy: [desc(evidenceLinks.createdAt)],
  });

  // Group by task, find most recent link per task
  const taskLastLinked = new Map<string, Date>();
  for (const link of recentLinks) {
    if (link.task.projectId !== evidence.projectId) continue;
    if (!taskLastLinked.has(link.task.id)) {
      taskLastLinked.set(link.task.id, link.createdAt!);
    }
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  for (const [taskId, lastLinked] of taskLastLinked) {
    // Need task name — look it up from recentLinks
    const linkEntry = recentLinks.find((l) => l.task.id === taskId);
    if (!linkEntry) continue;

    let points = 0;
    if (lastLinked >= sevenDaysAgo) {
      points = 20;
    } else if (lastLinked >= fourteenDaysAgo) {
      points = 10;
    } else {
      points = 5;
    }
    addScore(taskId, linkEntry.task.name, points, "Recently linked evidence");
  }

  // Normalize, filter by minimum threshold, and sort
  const MIN_CONFIDENCE = 0.4;
  const suggestions: TaskSuggestion[] = [];
  for (const [taskId, data] of scores) {
    const confidence = Math.min(data.score / 100, 1.0);
    if (confidence >= MIN_CONFIDENCE) {
      suggestions.push({
        taskId,
        taskName: data.name,
        confidence,
        reasons: data.reasons,
      });
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions.slice(0, 5);
}
