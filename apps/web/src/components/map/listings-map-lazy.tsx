"use client";

import dynamic from "next/dynamic";

/** Client-only wrapper: Leaflet needs `window`, so the map is never server-rendered. */
export const ListingsMapLazy = dynamic(() => import("./listings-map").then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-lg border bg-muted" />,
});
