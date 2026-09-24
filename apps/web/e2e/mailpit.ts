import { expect } from "@playwright/test";

// Supabase local exposes Mailpit on 54324 (config.toml [inbucket]).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type Summary = { ID: string; Subject: string; To: { Address: string }[] };

/** Wait for the newest email to `to` whose subject matches, and return the first link to `pathPrefix`. */
export async function waitForEmailLink(to: string, subject: RegExp, pathPrefix: string, after = new Date(0)) {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
        if (!res.ok) return false;
        const { messages } = (await res.json()) as { messages: (Summary & { Created: string })[] };
        const message = messages.find((m) => subject.test(m.Subject) && new Date(m.Created) >= after);
        if (!message) return false;
        const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as { HTML: string };
        const hrefs = [...full.HTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
        link = hrefs.find((h) => new URL(h).pathname.startsWith(pathPrefix));
        return Boolean(link);
      },
      { timeout: 20_000, message: `email "${subject}" to ${to}` },
    )
    .toBe(true);
  return link!;
}
