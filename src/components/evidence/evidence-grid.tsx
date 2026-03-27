"use client";

import { EvidenceCard, type EvidenceItem } from "./evidence-card";

interface EvidenceGridProps {
  items: EvidenceItem[];
  onItemClick?: (item: EvidenceItem) => void;
}

export function EvidenceGrid({ items, onItemClick }: EvidenceGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No evidence found. Upload photos or videos to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <EvidenceCard
          key={item.id}
          item={item}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}
