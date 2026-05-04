"use client";

import { ImageIcon } from "lucide-react";
import { EvidenceCard, type EvidenceItem } from "./evidence-card";

interface EvidenceGridProps {
  items: EvidenceItem[];
  onItemClick?: (item: EvidenceItem) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function EvidenceGrid({ items, onItemClick, selectedIds, onToggleSelect }: EvidenceGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ImageIcon className="mx-auto mb-3 h-8 w-8" />
        <p>No evidence yet.</p>
        <p className="text-sm mt-1">
          Click <span className="font-medium text-foreground">Upload</span> above
          to add photos or videos.
        </p>
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
          selected={selectedIds?.has(item.id)}
          onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
        />
      ))}
    </div>
  );
}
