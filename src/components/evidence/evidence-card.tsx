"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Film, Check } from "lucide-react";

interface LinkedTask {
  taskId: string;
  taskName: string;
}

export interface EvidenceItem {
  id: string;
  publicUrl: string;
  originalFilename: string | null;
  mimeType: string | null;
  capturedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  linkedTasks: LinkedTask[];
}

interface EvidenceCardProps {
  item: EvidenceItem;
  onClick?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function EvidenceCard({ item, onClick, selected, onToggleSelect }: EvidenceCardProps) {
  const isVideo = item.type === "video";
  const hasGps = item.latitude != null && item.longitude != null;
  const capturedDate = item.capturedAt
    ? new Date(item.capturedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-all group ${
        selected
          ? "ring-2 ring-primary"
          : "hover:ring-2 hover:ring-primary/20"
      }`}
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted">
        {isVideo ? (
          <div className="flex h-full items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={item.publicUrl}
            alt={item.originalFilename ?? "Evidence photo"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={`absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/70 bg-black/30 text-transparent hover:border-white"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {hasGps && (
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="secondary" className="gap-1 text-xs bg-background/80 backdrop-blur-sm">
              <MapPin className="h-3 w-3" />
            </Badge>
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium truncate">
          {item.originalFilename ?? "Untitled"}
        </p>
        {capturedDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {capturedDate}
          </div>
        )}
        {item.linkedTasks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.linkedTasks.map((t) => (
              <Badge key={t.taskId} variant="outline" className="text-[10px] px-1 py-0">
                {t.taskName}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
