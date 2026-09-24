"use client";

import NextError from "next/error";

// Requests that never reach a locale segment (should be rare: the proxy localizes all pages).
export default function GlobalNotFound() {
  return (
    <html lang="el">
      <body>
        <NextError statusCode={404} />
      </body>
    </html>
  );
}
