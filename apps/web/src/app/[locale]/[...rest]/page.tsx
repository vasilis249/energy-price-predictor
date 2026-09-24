import { notFound } from "next/navigation";

// Unknown localized paths render app/[locale]/not-found.tsx inside the localized layout.
export default function CatchAll() {
  notFound();
}
