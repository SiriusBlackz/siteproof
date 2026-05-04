"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectBreadcrumb } from "@/components/layout/breadcrumb";
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
        <ProjectBreadcrumb items={[{ label: "GPS Zones" }]} />
        <h2 className="text-2xl font-bold tracking-tight">GPS Zones</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapbox Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              GPS zones use Mapbox to draw polygons on a satellite map. To
              enable, set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
              <code>.env.local</code> and restart the dev server.
            </p>
            <p>
              Free Mapbox tokens are available at{" "}
              <a
                href="https://account.mapbox.com/auth/signup/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                account.mapbox.com
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProjectBreadcrumb items={[{ label: "GPS Zones" }]} />
      <h2 className="text-2xl font-bold tracking-tight">GPS Zones</h2>
      <ZoneMapEditor projectId={projectId} />
    </div>
  );
}
