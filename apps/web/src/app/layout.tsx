import type { ReactNode } from "react";

// The real root layout (with <html>) is app/[locale]/layout.tsx. This pass-through exists so
// non-localized routes (auth route handlers, root not-found) have a layout too.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
