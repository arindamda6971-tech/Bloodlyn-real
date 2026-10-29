import { TEST_CONCEPTS, CATALOGUE_VOCABULARY, type TestConcept } from "@/lib/test-knowledge";

/**
 * Search intelligence for the test catalogue.
 *
 * 1. understandQuery() reads what the user typed: fixes typos ("thyorid" →
 *    "thyroid"), completes half-typed words ("thyr" → thyroid) and maps lay
 *    terms to medical concepts ("sugar" → Glucose, "liver function test" → LFT,
 *    SGPT, SGOT…). It also lists the catalogue searches to send to the server.
 * 2. rankTests() orders whatever the server returned: the tests a doctor would
 *    order for that concept first, literal name matches next, and veterinary,
 *    rare-specimen and genetic tests pushed down or dropped.
 */

// ── Text normalisation ──────────────────────────────────────────────────────

/** Lower-case, unify spelling and punctuation so "Haemogram" ≈ "hemogram", "B 12" ≈ "b12". */
export function normalizeText(s: string): string {
  return (s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/haem/g, "hem")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/\b([a-z]) (\d{1,2})\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

// Words that carry no test meaning in a query ("sugar test", "price of lft").
const FILLER = new Set([
  "test", "tests", "testing", "check", "level", "levels", "report", "reports", "lab", "labs", "home", "collection",
  "price", "cost", "rate", "near", "me", "for", "of", "the", "my", "a", "an", "and", "in", "at", "to", "please",
  "karvana", "karwana", "karna", "koto", "dam", "kitna", "ka", "ki", "ke", "er", "টেস্ট", "পরীক্ষা", "जांच", "टेस्ट",
]);

const isLatin = (s: string) => /^[a-z0-9]+$/.test(s);

/** Optimal string alignment distance (Levenshtein + adjacent swaps, so "thyorid" is 1 away). */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const allowedTypos = (len: number) => (len >= 9 ? 3 : len >= 6 ? 2 : len >= 4 ? 1 : 0);

// ── Compiled knowledge ──────────────────────────────────────────────────────

interface CompiledConcept {
  concept: TestConcept;
  triggers: string[];
  prefer: string[];
  searches: string[];
}

const COMPILED: CompiledConcept[] = TEST_CONCEPTS.map((concept) => ({
  concept,
  triggers: [...new Set(concept.triggers.map(normalizeText).filter(Boolean))],
  prefer: concept.prefer.map(normalizeText),
  searches: concept.searches.map(normalizeText),
}));

// Every word typos can be corrected towards, most useful first.
const VOCABULARY: string[] = (() => {
  const words = new Set<string>();
  for (const c of COMPILED) for (const t of c.triggers) for (const w of t.split(" ")) if (w.length >= 4 && isLatin(w)) words.add(w);
  for (const w of CATALOGUE_VOCABULARY) words.add(normalizeText(w));
  return [...words];
})();
const VOCABULARY_SET = new Set(VOCABULARY);

function correctWord(word: string): string {
  if (word.length < 4 || !isLatin(word) || VOCABULARY_SET.has(word) || FILLER.has(word)) return word;
  // A half-typed word ("thyro") is completed by the prefix rules, not "corrected".
  if (VOCABULARY.some((v) => v.startsWith(word))) return word;
  const max = allowedTypos(word.length);
  let best = word;
  let bestDist = max + 1;
  for (const v of VOCABULARY) {
    if (Math.abs(v.length - word.length) > max) continue;
    const dist = editDistance(word, v, max);
    // A changed first letter is a different word more often than a typo.
    const penalised = v[0] === word[0] ? dist : dist + 1;
    if (penalised < bestDist) {
      best = v;
      bestDist = penalised;
    }
  }
  return bestDist <= max ? best : word;
}

// ── Query understanding ─────────────────────────────────────────────────────

export interface ConceptMatch {
  concept: TestConcept;
  /** 0..1 — how sure we are the user means this concept. */
  score: number;
  trigger: string;
}

export interface QueryUnderstanding {
  /** What the user typed, trimmed. */
  raw: string;
  /** Normalised query with typos fixed. */
  text: string;
  /** `text` without filler words ("test", "price", …) — used for name matching. */
  core: string;
  tokens: string[];
  /** Tokens exactly as typed (before typo fixes), so rare names that look like typos still match. */
  typedTokens: string[];
  /** Set when a typo was fixed, e.g. "thyorid" → "thyroid". */
  correctedFrom?: string;
  concepts: ConceptMatch[];
  /** Catalogue searches to run on the server, most important first. */
  serverTerms: string[];
}

const MAX_CONCEPTS = 3;
const MAX_SERVER_TERMS = 7;

function scoreTrigger(trigger: string, text: string, core: string): number {
  const short = trigger.length <= 3 && isLatin(trigger.replace(/ /g, ""));
  if (trigger === text || trigger === core) return 1;
  const qTokens = (core || text).split(" ").length;
  const tTokens = trigger.split(" ").length;
  if (` ${text} `.includes(` ${trigger} `)) {
    return Math.min(0.95, 0.7 + 0.25 * (tTokens / Math.max(qTokens, tTokens)));
  }
  if (short) return 0;
  // Type-ahead: "thyr" → "thyroid", "liver fun" → "liver function".
  const typed = core || text;
  if (typed.length >= 3 && trigger.startsWith(typed)) {
    return 0.45 + 0.4 * (typed.length / trigger.length);
  }
  return 0;
}

export function understandQuery(query: string): QueryUnderstanding {
  const raw = (query || "").trim();
  const normalized = normalizeText(raw);
  const words = normalized ? normalized.split(" ") : [];
  const corrected = words.map((w, i) => {
    // Leave the word still being typed alone unless it is clearly a typo of a whole word.
    const fixed = correctWord(w);
    return i === words.length - 1 && fixed !== w && w.length < 5 ? w : fixed;
  });
  const text = corrected.join(" ");
  const tokens = corrected.filter((w) => !FILLER.has(w));
  const core = tokens.join(" ");

  const concepts: ConceptMatch[] = [];
  if (text) {
    for (const c of COMPILED) {
      let best = 0;
      let bestTrigger = "";
      for (const t of c.triggers) {
        const s = scoreTrigger(t, text, core);
        if (s > best || (s === best && s > 0 && t.length > bestTrigger.length)) {
          best = s;
          bestTrigger = t;
        }
      }
      if (best >= 0.5) concepts.push({ concept: c.concept, score: best, trigger: bestTrigger });
    }
    // Strongest first; between equals, the one whose trigger covers more of the query.
    concepts.sort((a, b) => b.score - a.score || b.trigger.length - a.trigger.length);
  }
  const top = concepts.slice(0, MAX_CONCEPTS).filter((c, i) => i === 0 || c.score >= 0.6);

  const serverTerms: string[] = [];
  const addTerm = (t: string) => {
    const term = sanitizeServerTerm(t);
    if (term.length >= 2 && /[a-z0-9]/i.test(term) && !serverTerms.some((s) => s.toLowerCase() === term.toLowerCase())) {
      serverTerms.push(term);
    }
  };
  if (raw && tokens.length) addTerm(raw);
  if (core && core !== normalized) addTerm(core);
  top.forEach((match, i) => {
    const searches = match.concept.searches.slice(0, i === 0 ? undefined : i === 1 ? 2 : 1);
    searches.forEach(addTerm);
  });

  return {
    raw,
    text,
    core,
    tokens,
    typedTokens: words.filter((w) => !FILLER.has(w)),
    correctedFrom: text !== normalized ? normalized : undefined,
    concepts: top,
    serverTerms: serverTerms.slice(0, MAX_SERVER_TERMS),
  };
}

/** The bridge search is a plain substring match that errors on commas/brackets — keep terms simple. */
export function sanitizeServerTerm(term: string): string {
  return (term || "").replace(/[,()[\]{}*%_\\'"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

// ── Ranking ─────────────────────────────────────────────────────────────────

// Unusual samples and methods: correct tests, but rarely what someone searching means.
const DEMOTED_WORDS: { re: RegExp; penalty: number }[] = [
  { re: /\b(csf|amniotic|ascitic|pleural|pericardial|peritoneal|synovial|dialysis|bal|vtm|ffpe|tissue|biopsy|pus|sputum|swab|saliva|marrow)\b/, penalty: 30 },
  { re: /\bbody fluids?\b|\bdried blood spot\b|\bneonatal\b|\bpure culture\b/, penalty: 30 },
  { re: /\b(ngs|gene|genes|mutation|mutations|sequencing|genotyping|deletion|karyotyping|multiplex|antibiogram|histopathological|ihc|isoenzymes|electrophoresis)\b/, penalty: 25 },
  { re: /\b(pcr|rt pcr|icpms|lc ms|lcms|ms ms)\b/, penalty: 12 },
  { re: /^disorders of\b/, penalty: 20 },
  { re: /\b(stimulation|suppression) test\b/, penalty: 15 },
  { re: /\b24 ?hrs?\b/, penalty: 8 },
  { re: /\b(drug allergen)\b/, penalty: 20 },
  // Toxicology / heavy-metal screens crowd generic words like "urine" and "blood".
  { re: /\b(arsenic|barium|cadmium|cobalt|chromium|lead|mercury|nickel|thallium|aluminium|aluminum|copper|selenium|manganese|beryllium|antimony)\b/, penalty: 20 },
];
const ANIMAL = /\b(canine|feline|veterinary|vet|dog|cat)\b/;
const SAMPLE_WORDS = /\b(urine|stool)\b/;

type NamedTest = { test_name?: string; name?: string };

const nameOf = (t: NamedTest) => t.test_name || t.name || "";

function textScore(name: string, padded: string, u: QueryUnderstanding): number {
  const typed = u.correctedFrom ? phraseScore(name, padded, u.typedTokens) : 0;
  return Math.max(typed, phraseScore(name, padded, u.tokens));
}

function phraseScore(name: string, padded: string, tokens: string[]): number {
  const phrase = tokens.join(" ");
  if (!phrase) return 0;
  if (name === phrase) return 95;
  if (name.startsWith(`${phrase} `)) return 88;
  if (padded.includes(` ${phrase} `)) return 78;

  const words = name.split(" ");
  let sum = 0;
  let all = true;
  for (const token of tokens) {
    let best = 0;
    for (const w of words) {
      if (w === token) { best = 1; break; }
      if (w.startsWith(token) && token.length >= 2) best = Math.max(best, 0.75);
      else if (token.length >= 4 && isLatin(token) && Math.abs(w.length - token.length) <= 2 && editDistance(token, w, 2) <= allowedTypos(token.length)) {
        best = Math.max(best, 0.6);
      } else if (token.length >= 5 && w.includes(token)) best = Math.max(best, 0.35);
    }
    if (best === 0) all = false;
    sum += best;
  }
  return (all ? 70 : 35) * (sum / tokens.length);
}

function conceptScore(padded: string, u: QueryUnderstanding): number {
  let best = 0;
  u.concepts.forEach((match, i) => {
    const compiled = COMPILED.find((c) => c.concept === match.concept)!;
    const weight = match.score * (i === 0 ? 1 : i === 1 ? 0.75 : 0.55);
    const idx = compiled.prefer.findIndex((p) => padded.includes(` ${p}`));
    let s = 0;
    if (idx >= 0) s = 100 - 5 * Math.min(idx, 10);
    else if (compiled.searches.some((term) => padded.includes(` ${term}`))) s = 35;
    best = Math.max(best, s * weight);
  });
  return best;
}

/** Relevance of one test to the query; 0 means "don't show it". */
export function scoreTest(test: NamedTest, u: QueryUnderstanding): number {
  const rawName = nameOf(test);
  const name = normalizeText(rawName);
  if (!name) return 0;
  const padded = ` ${name} `;
  const query = ` ${u.text} `;

  if (ANIMAL.test(name) && !ANIMAL.test(u.text)) return 0;

  const byConcept = conceptScore(padded, u);
  const byText = textScore(name, padded, u);
  let score = Math.max(byConcept, byText) + 0.25 * Math.min(byConcept, byText);
  if (score <= 0) return 0;

  for (const { re, penalty } of DEMOTED_WORDS) {
    const m = name.match(re);
    if (m && !query.includes(` ${m[0]} `)) score -= penalty;
  }
  const wantsSamples = SAMPLE_WORDS.test(u.text) || u.concepts.some((c) => c.concept.sampleTests);
  if (!wantsSamples && SAMPLE_WORDS.test(name)) score -= 18;
  if (rawName.includes("**")) score -= 5; // specialised send-out tests
  score -= Math.min(8, name.length / 15); // shorter names are usually the common test

  return score >= 20 ? score : 0;
}

/** Order tests by relevance to the query, dropping ones that don't fit. Duplicates (same id) are merged. */
export function rankTests<T extends NamedTest & { id: string }>(tests: T[], u: QueryUnderstanding): T[] {
  if (!u.text) return [];
  const seen = new Set<string>();
  const scored: { test: T; score: number; len: number }[] = [];
  for (const test of tests) {
    if (!test || seen.has(test.id)) continue;
    seen.add(test.id);
    const score = scoreTest(test, u);
    if (score > 0) scored.push({ test, score, len: nameOf(test).length });
  }
  scored.sort((a, b) => b.score - a.score || a.len - b.len);
  return scored.map((s) => s.test);
}

/** Words to highlight in a result name: what the user typed plus the concept's own words. */
export function highlightTerms(u: QueryUnderstanding): string[] {
  const terms = new Set<string>();
  for (const t of u.tokens) if (t.length >= 2) terms.add(t);
  const top = u.concepts[0];
  if (top) for (const s of COMPILED.find((c) => c.concept === top.concept)!.searches) for (const w of s.split(" ")) if (w.length >= 3) terms.add(w);
  return [...terms];
}

/** One-line explanation for the results, e.g. 'Showing results for "thyroid"'. */
export function searchHint(u: QueryUnderstanding): string | null {
  if (u.correctedFrom) return `Showing results for "${u.core || u.text}"`;
  const top = u.concepts[0];
  if (top) return `Best matches for ${top.concept.label}`;
  return null;
}

// ── Local (already-fetched) search ──────────────────────────────────────────

export interface SearchResult {
  id: string;
  name: string;
  price: number;
  discount_percent?: number;
  matchScore: number;
  isDictionaryMatch: boolean;
}

/** Search a list of tests already in memory (e.g. one category) with the same intelligence. */
export function intelligentSearch(
  query: string,
  testPool: any[],
  limit = 5
): SearchResult[] {
  const u = understandQuery(query);
  if (!u.text) return [];
  return rankTests(testPool.filter((t) => t?.id), u)
    .slice(0, limit)
    .map((test) => ({
      id: test.id,
      name: nameOf(test),
      price: test.price,
      discount_percent: test.discount_percent,
      matchScore: Math.round(scoreTest(test, u)),
      isDictionaryMatch: u.concepts.length > 0,
    }));
}
