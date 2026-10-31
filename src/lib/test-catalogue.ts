import { supabase } from "@/integrations/supabase/client";
import type { BridgeTest } from "@/hooks/useBridgeTests";

/**
 * The whole catalogue on the device, so search doesn't wait on a server for each
 * term. It's a few thousand rows, so filtering takes about a millisecond where a
 * server search took seconds. Saved in IndexedDB for a day: localStorage would
 * block navigation on phones, and one download a day is far fewer calls.
 */
export type CatalogueTest = Pick<BridgeTest, "id" | "test_name" | "category" | "price" | "collection_fee" | "report_delivery_time" | "status"> & {
  loinc_code?: string | null;
};

export const CATALOGUE_QUERY_KEY = ["bridge-tests-catalogue"];
export const CATALOGUE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DB_NAME = "BloodLynCatalogue";
const STORE_NAME = "catalogue";
const RECORD_KEY = "tests";
// Matches the bridge's search, whose results this replaces.
const PER_TERM_LIMIT = 40;

interface SavedCatalogue {
  savedAt: number;
  tests: CatalogueTest[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSaved(): Promise<SavedCatalogue | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve((request.result as SavedCatalogue) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function save(tests: CatalogueTest[]) {
  const db = await openDb();
  db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({ savedAt: Date.now(), tests }, RECORD_KEY);
}

async function downloadCatalogue(): Promise<CatalogueTest[]> {
  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", all: "true" } },
  });
  if (error) throw new Error(error.message || "Failed to fetch tests");
  if (!data?.success) throw new Error("Bridge API returned unsuccessful response");
  return (data.tests as (CatalogueTest & Record<string, unknown>)[]).map(
    ({ id, test_name, category, price, collection_fee, report_delivery_time, status, loinc_code }) =>
      ({ id, test_name, category, price, collection_fee, report_delivery_time, status, loinc_code }),
  );
}

/** Today's saved catalogue, or a fresh one. An older copy beats nothing if the download fails. */
export async function fetchCatalogue(): Promise<CatalogueTest[]> {
  const saved = await readSaved().catch(() => null);
  if (saved && Date.now() - saved.savedAt < CATALOGUE_MAX_AGE_MS) return saved.tests;
  try {
    const tests = await downloadCatalogue();
    save(tests).catch(() => {});
    return tests;
  } catch (error) {
    if (saved) return saved.tests;
    throw error;
  }
}

/** Tests matching one search term, as the bridge's search finds them. */
export function searchCatalogue(tests: CatalogueTest[], term: string, category?: string): CatalogueTest[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const matches: CatalogueTest[] = [];
  for (const test of tests) {
    if (category && test.category !== category) continue;
    if (test.test_name.toLowerCase().includes(needle) || test.loinc_code?.toLowerCase().includes(needle)) {
      matches.push(test);
      if (matches.length === PER_TERM_LIMIT) break;
    }
  }
  return matches;
}
