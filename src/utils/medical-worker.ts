import { MEDICAL_TEST_DICTIONARY, levenshtein, DictionaryMatch } from "@/lib/medical-dictionary";

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const STOPWORDS = new Set(["test", "serum", "s", "blood", "profile", "panel", "level", "report"]);
const stripStop = (s: string) =>
  normalize(s).split(" ").filter((w) => !STOPWORDS.has(w)).join(" ").trim() || normalize(s);

const isAbbrev = (s: string) => s.length <= 6 && /^[a-z0-9]+$/.test(s);

self.onmessage = (e: MessageEvent) => {
  const { raw, threshold = 0.55 } = e.data;

  const qRaw = normalize(raw);
  if (!qRaw) {
    self.postMessage(null);
    return;
  }

  const q = stripStop(qRaw);
  const qTokens = new Set(qRaw.split(" "));
  let best: DictionaryMatch | null = null;

  for (const entry of MEDICAL_TEST_DICTIONARY) {
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      if (!a) continue;
      const aStripped = stripStop(a);

      let score = 0;
      let matchType: DictionaryMatch["matchType"] = "fuzzy";

      if (a === qRaw || aStripped === q) {
        score = 1;
        matchType = "exact";
      } else if (isAbbrev(a)) {
        if (qTokens.has(a)) {
          score = 0.95;
          matchType = "abbreviation";
        } else if (isAbbrev(qRaw) && Math.abs(qRaw.length - a.length) <= 1) {
          const d = levenshtein(qRaw, a);
          if (d <= 1) {
            score = 0.9;
            matchType = "abbreviation";
          }
        }
      }

      if (score < 0.88 && (qRaw.includes(a) || a.includes(qRaw))) {
        score = Math.max(score, 0.88);
        matchType = score === 0.88 ? "substring" : matchType;
      }

      if (score < 0.85) {
        const dist = levenshtein(aStripped, q);
        const maxLen = Math.max(aStripped.length, q.length) || 1;
        const fuzzy = 1 - dist / maxLen;
        if (fuzzy > score) {
          score = fuzzy;
          matchType = "fuzzy";
        }
      }

      if (!best || score > best.score) {
        best = {
          canonical: entry.canonical,
          category: entry.category,
          score,
          confidencePct: Math.round(score * 100),
          matchedAlias: alias,
          matchType,
        };
      }
    }
  }

  if (best && best.score >= threshold) {
    self.postMessage(best);
  } else {
    self.postMessage(null);
  }
};
