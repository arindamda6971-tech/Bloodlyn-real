import { describe, it, expect, beforeEach, vi } from "vitest";
import { CONTENT_CACHE_MS, appPageFor, fetchAppContent, matchingFaqs, type AppContent } from "./app-content";

const reply = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response);

const content: AppContent = {
  pages: [
    { slug: "terms-and-conditions", title: "Terms", content: "Our terms", updated_at: "2026-11-27T00:00:00Z" },
    { slug: "about-us", title: "About us", content: "Who we are", updated_at: null },
  ],
  faqs: [
    { id: "1", question: "How long do reports take?", answer: "Most in a day.", category: "General" },
    { id: "2", question: "Can I change my address?", answer: "Yes, before collection.", category: "Account" },
  ],
};

describe("app content from Admin", () => {
  beforeEach(() => localStorage.clear());

  it("asks Admin once, keeps the answer for 30 minutes, and drops anything malformed", async () => {
    const fetcher = reply({ ...content, pages: [...content.pages, { slug: "empty", title: "Empty", content: "  " }, { slug: 1 }], faqs: [...content.faqs, { id: 3 }] });
    const now = Date.parse("2026-11-27T10:00:00Z");
    const first = await fetchAppContent("user_app", { now, fetcher });
    expect(first.pages.map((p) => p.slug)).toEqual(["terms-and-conditions", "about-us"]);
    expect(first.faqs).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("bridge-content?app=user_app"));

    await fetchAppContent("user_app", { now: now + CONTENT_CACHE_MS - 1000, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fetchAppContent("user_app", { now: now + CONTENT_CACHE_MS + 1000, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails without saving anything when Admin can't answer", async () => {
    await expect(fetchAppContent("user_app", { fetcher: reply({}, false) })).rejects.toThrow();
    expect(localStorage.length).toBe(0);
  });

  it("finds Admin's page for a built-in page, under its Admin name too", () => {
    expect(appPageFor(content, "user-terms")?.content).toBe("Our terms");
    expect(appPageFor(content, "about-us")?.title).toBe("About us");
    expect(appPageFor(content, "privacy-policy")).toBeUndefined();
    expect(appPageFor(null, "user-terms")).toBeUndefined();
  });

  it("narrows the questions by what was typed", () => {
    expect(matchingFaqs(content.faqs, "")).toHaveLength(2);
    expect(matchingFaqs(content.faqs, "ADDRESS").map((f) => f.id)).toEqual(["2"]);
    expect(matchingFaqs(content.faqs, "a day").map((f) => f.id)).toEqual(["1"]);
  });
});
