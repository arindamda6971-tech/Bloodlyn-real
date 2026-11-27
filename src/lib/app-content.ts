/**
 * Text pages (terms, privacy, …) and FAQ questions the BloodLyn team edits in Admin, read
 * from Admin's public bridge-content function. Plain text only, shown as text.
 *
 * Kept cheap: the answer is saved on the device for 30 minutes. When Admin has nothing
 * for a page, or can't be reached, the app shows its own built-in text for it.
 */
import { ADMIN_FUNCTIONS_URL, type AppAudience } from "./app-announcements";

export const CONTENT_CACHE_MS = 30 * 60 * 1000;

export interface AppPage {
  slug: string;
  title: string;
  content: string;
  updated_at: string | null;
}

export interface AppFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface AppContent {
  pages: AppPage[];
  faqs: AppFaq[];
}

const cacheKey = (app: AppAudience) => `bloodlyn.content.${app}`;

const isPage = (v: unknown): v is AppPage => {
  const p = v as Partial<AppPage> | null;
  return !!p && typeof p.slug === "string" && typeof p.title === "string" && typeof p.content === "string" && p.content.trim() !== "";
};

const isFaq = (v: unknown): v is AppFaq => {
  const f = v as Partial<AppFaq> | null;
  return !!f && typeof f.id === "string" && typeof f.question === "string" && typeof f.answer === "string";
};

const clean = (body: { pages?: unknown; faqs?: unknown } | null): AppContent => ({
  pages: Array.isArray(body?.pages) ? body.pages.filter(isPage) : [],
  faqs: Array.isArray(body?.faqs) ? body.faqs.filter(isFaq).map((f) => ({ ...f, category: typeof f.category === "string" ? f.category : "General" })) : [],
});

/** This app's pages and questions, from the device for 30 minutes, then from Admin. */
export async function fetchAppContent(
  app: AppAudience,
  { storage = localStorage, now = Date.now(), fetcher = fetch }: { storage?: Storage; now?: number; fetcher?: typeof fetch } = {},
): Promise<AppContent> {
  try {
    const saved = JSON.parse(storage.getItem(cacheKey(app)) ?? "null") as { at?: number; content?: AppContent } | null;
    if (saved && typeof saved.at === "number" && now - saved.at <= CONTENT_CACHE_MS && saved.content) return clean(saved.content);
  } catch {
    // An unreadable saved copy is just asked for again.
  }
  const res = await fetcher(`${ADMIN_FUNCTIONS_URL}/bridge-content?app=${app}`);
  if (!res.ok) throw new Error(`App content request failed (${res.status})`);
  const content = clean(await res.json());
  try {
    storage.setItem(cacheKey(app), JSON.stringify({ at: now, content }));
  } catch {
    // A full or blocked store only means the next open asks again.
  }
  return content;
}

/** The built-in page each Admin page replaces, where their names differ. */
export const ADMIN_SLUG_FOR: Record<string, string> = {
  "user-terms": "terms-and-conditions",
};

/** Admin's page for a built-in page id (or an Admin-only page's own slug), if it has one. */
export function appPageFor(content: AppContent | null | undefined, id: string): AppPage | undefined {
  const slug = ADMIN_SLUG_FOR[id] ?? id;
  return content?.pages.find((p) => p.slug === slug);
}

/** FAQ questions matching what the person typed (all of them when nothing is typed). */
export function matchingFaqs(faqs: AppFaq[], search: string): AppFaq[] {
  const term = search.trim().toLowerCase();
  if (!term) return faqs;
  return faqs.filter((f) => f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term));
}
