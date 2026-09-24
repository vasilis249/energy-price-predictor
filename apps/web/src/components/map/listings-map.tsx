"use client";

import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { publicEnv } from "@/lib/env";

export type MapPoint = { id: string; lat: number; lon: number; title: string; subtitle: string; href: string };

type Props = {
  origin: { lat: number; lon: number; label: string } | null;
  points: MapPoint[];
  label: string;
  /** Draw an approximate-area circle (metres) instead of a pin, for a single listing. */
  areaRadius?: number;
  className?: string;
};

/**
 * Read-only map of listings. Points are approximate (grid-cell centres), never exact sites.
 * Popup contents are built with textContent, so titles can't inject HTML.
 */
export function ListingsMap({ origin, points, label, areaRadius, className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const data = useRef({ origin, points, areaRadius });

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !container.current) return;
      const { origin: o, points: pts, areaRadius: radius } = data.current;
      map = L.map(container.current, { center: [38.6, 23.4], zoom: 6, minZoom: 5 });
      L.tileLayer(publicEnv.NEXT_PUBLIC_MAP_TILE_URL, {
        attribution: publicEnv.NEXT_PUBLIC_MAP_ATTRIBUTION,
        maxZoom: 16,
      }).addTo(map);

      const bounds: [number, number][] = [];
      if (o) {
        L.circleMarker([o.lat, o.lon], {
          radius: 8,
          color: "#1e293b",
          weight: 3,
          fillColor: "#334155",
          fillOpacity: 0.9,
        })
          .bindTooltip(o.label)
          .addTo(map);
        bounds.push([o.lat, o.lon]);
      }
      for (const p of pts) {
        const content = document.createElement("div");
        const link = document.createElement("a");
        link.href = p.href;
        link.textContent = p.title;
        link.style.fontWeight = "600";
        const sub = document.createElement("div");
        sub.textContent = p.subtitle;
        content.append(link, sub);
        const shape = radius
          ? L.circle([p.lat, p.lon], { radius, color: "#0f766e", weight: 2, fillColor: "#14b8a6", fillOpacity: 0.25 })
          : L.circleMarker([p.lat, p.lon], {
              radius: 9,
              color: "#0f766e",
              weight: 3,
              fillColor: "#14b8a6",
              fillOpacity: 0.7,
            });
        shape.bindPopup(content).addTo(map);
        bounds.push([p.lat, p.lon]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      else if (bounds.length === 1) map.setView(bounds[0], radius ? 11 : 10);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className={className ?? "z-0 h-80 w-full overflow-hidden rounded-lg border"}
    />
  );
}
