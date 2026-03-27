"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const ZoneMapEditor = dynamic(
  () =>
    import("@/components/zones/zone-map-editor").then(
      (mod) => mod.ZoneMapEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    ),
  }
);

const hasMapboxToken =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN &&
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN !== "PLACEHOLDER";

export default function ZonesPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!hasMapboxToken) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">GPS Zones</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapbox Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To use GPS zones, set your <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
              environment variable in <code>.env.local</code> and restart the
              dev server.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">GPS Zones</h2>
      <ZoneMapEditor projectId={projectId} />
    </div>
  );
}
