"use client";

import type { CircleMarker, LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { publicEnv } from "@/lib/env";

const GREECE_CENTER: [number, number] = [38.6, 23.4];
const GREECE_BOUNDS: [[number, number], [number, number]] = [
  [34, 19],
  [42.5, 30],
];

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  label: string;
};

/**
 * Tap/click to set a point. Leaflet is loaded in the browser only (it needs `window`).
 * A circle marker avoids Leaflet's default marker images, which break under bundlers.
 */
export function LocationPicker({ latitude, longitude, onChange, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  // Latest point, so a value typed while Leaflet is still loading is drawn once the map exists.
  const latest = useRef({ latitude, longitude });

  useEffect(() => {
    onChangeRef.current = onChange;
    latest.current = { latitude, longitude };
  }, [onChange, latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !container.current || map.current) return;
      const instance = L.map(container.current, {
        center: GREECE_CENTER,
        zoom: 6,
        maxBounds: GREECE_BOUNDS,
        maxBoundsViscosity: 0.8,
        minZoom: 5,
      });
      L.tileLayer(publicEnv.NEXT_PUBLIC_MAP_TILE_URL, {
        attribution: publicEnv.NEXT_PUBLIC_MAP_ATTRIBUTION,
        maxZoom: 18,
      }).addTo(instance);
      instance.on("click", (event: LeafletMouseEvent) => {
        const lat = Math.round(event.latlng.lat * 1e5) / 1e5;
        const lng = Math.round(event.latlng.lng * 1e5) / 1e5;
        onChangeRef.current(lat, lng);
      });
      marker.current = L.circleMarker(GREECE_CENTER, {
        radius: 9,
        color: "#0f766e",
        weight: 3,
        fillColor: "#14b8a6",
        fillOpacity: 0.6,
      });
      map.current = instance;
      const { latitude: lat, longitude: lng } = latest.current;
      if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        marker.current.setLatLng([lat, lng]).addTo(instance);
        instance.setView([lat, lng], 13);
      }
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !marker.current) return;
    if (latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      marker.current.remove();
      return;
    }
    marker.current.setLatLng([latitude, longitude]).addTo(instance);
    if (!instance.getBounds().contains([latitude, longitude]) || instance.getZoom() < 10) {
      instance.setView([latitude, longitude], Math.max(instance.getZoom(), 13));
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={container}
      role="application"
      aria-label={label}
      className="z-0 h-72 w-full overflow-hidden rounded-lg border sm:h-96"
    />
  );
}
