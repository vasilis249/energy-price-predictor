/**
 * Cookie consent. Strictly necessary cookies (auth session, language, this consent record)
 * never need consent. Anything optional (analytics, added later) must check `analytics`.
 */
export const CONSENT_COOKIE = "cookie_consent";
const VERSION = 1;

export type Consent = { analytics: boolean };

export function serializeConsent(consent: Consent): string {
  return `v${VERSION}.analytics-${consent.analytics ? 1 : 0}`;
}

/** Returns null when there's no valid consent for the current version (ask again). */
export function parseConsent(raw: string | undefined | null): Consent | null {
  const match = raw?.match(/^v(\d+)\.analytics-([01])$/);
  if (!match || Number(match[1]) !== VERSION) return null;
  return { analytics: match[2] === "1" };
}
