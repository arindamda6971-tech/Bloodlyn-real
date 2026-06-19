// Curated dictionary of common diagnostic tests with synonyms/abbreviations.
// Used for fuzzy-matching AI OCR output to standardized test names.

export interface MedicalTestEntry {
  canonical: string;
  aliases: string[];
  category: string;
}

export const MEDICAL_TEST_DICTIONARY: MedicalTestEntry[] = [
  { canonical: "Complete Blood Count", aliases: ["cbc", "cbp", "complete blood count", "blood count", "hemogram", "haemogram"], category: "Blood" },
  { canonical: "HbA1c (Glycated Hemoglobin)", aliases: ["hba1c", "a1c", "glycated hb", "glycated hemoglobin", "glycosylated hb"], category: "Diabetes" },
  { canonical: "Fasting Blood Sugar", aliases: ["fbs", "fbg", "fasting sugar", "fasting glucose", "fasting blood sugar"], category: "Diabetes" },
  { canonical: "Post Prandial Blood Sugar", aliases: ["ppbs", "ppbg", "pp sugar", "post prandial sugar"], category: "Diabetes" },
  { canonical: "Random Blood Sugar", aliases: ["rbs", "random sugar", "random blood sugar"], category: "Diabetes" },
  { canonical: "Lipid Profile", aliases: ["lipid", "lipid profile", "cholesterol", "cholesterol profile", "tc", "hdl", "ldl", "tg"], category: "Heart" },
  { canonical: "Thyroid Function Test", aliases: ["tft", "thyroid profile", "thyroid function", "t3 t4 tsh"], category: "Thyroid" },
  { canonical: "TSH (Thyroid Stimulating Hormone)", aliases: ["tsh", "t5h", "thyroid stimulating hormone"], category: "Thyroid" },
  { canonical: "T3 & T4", aliases: ["t3", "t4", "t3 t4", "triiodothyronine", "thyroxine"], category: "Thyroid" },
  { canonical: "Liver Function Test", aliases: ["lft", "liver function", "liver profile"], category: "Liver" },
  { canonical: "Kidney Function Test", aliases: ["kft", "rft", "renal function", "renal profile", "kidney function"], category: "Kidney" },
  { canonical: "Serum Creatinine", aliases: ["creatinine", "s creatinine", "s. creat", "s creat"], category: "Kidney" },
  { canonical: "Blood Urea Nitrogen", aliases: ["bun", "urea", "blood urea"], category: "Kidney" },
  { canonical: "Serum Uric Acid", aliases: ["uric acid", "s uric acid", "ua"], category: "Kidney" },
  { canonical: "ESR (Erythrocyte Sedimentation Rate)", aliases: ["esr", "sed rate", "erythrocyte sedimentation rate"], category: "Infection" },
  { canonical: "CRP (C-Reactive Protein)", aliases: ["crp", "c reactive protein", "c-reactive protein"], category: "Infection" },
  { canonical: "Urine Routine & Microscopy", aliases: ["urine r/m", "urine re", "urine routine", "urine exam", "urine routine microscopy"], category: "Urine" },
  { canonical: "Vitamin D 25-Hydroxy", aliases: ["vit d", "vitamin d", "25 oh vit d", "25-oh vit d", "vitamin d3"], category: "Vitamin" },
  { canonical: "Vitamin B12", aliases: ["vit b12", "b12", "vitamin b12", "cobalamin"], category: "Vitamin" },
  { canonical: "Iron Studies", aliases: ["iron", "ferritin", "iron studies", "iron profile"], category: "Blood" },
  { canonical: "Serum Calcium", aliases: ["calcium", "s calcium", "ca++", "s. ca"], category: "Bone" },
  { canonical: "Serum Electrolytes", aliases: ["electrolytes", "na k cl", "serum electrolytes", "na+ k+ cl-"], category: "Blood" },
  { canonical: "PSA (Prostate Specific Antigen)", aliases: ["psa", "prostate specific antigen"], category: "Cancer" },
  { canonical: "RA Factor", aliases: ["ra factor", "rheumatoid factor", "rf"], category: "Autoimmune" },
  { canonical: "ANA (Antinuclear Antibody)", aliases: ["ana", "antinuclear antibody"], category: "Autoimmune" },
  { canonical: "Widal Test", aliases: ["widal", "typhoid test"], category: "Infection" },
  { canonical: "HBsAg (Hepatitis B Surface Antigen)", aliases: ["hbsag", "hepatitis b", "hep b"], category: "Infection" },
  { canonical: "HIV 1 & 2 Antibody", aliases: ["hiv", "hiv 1 2", "hiv antibody"], category: "Infection" },
  { canonical: "Dengue Profile", aliases: ["dengue", "ns1", "dengue ns1", "dengue igg igm"], category: "Infection" },
  { canonical: "Malaria Parasite", aliases: ["mp", "malaria", "malaria parasite"], category: "Infection" },
  { canonical: "Blood Grouping & Rh Typing", aliases: ["blood group", "blood grouping", "rh typing", "abo"], category: "Blood" },
  { canonical: "Electrocardiogram", aliases: ["ecg", "ekg", "electrocardiogram"], category: "Heart" },
];

// Levenshtein distance — used for fuzzy matching typos.
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export interface DictionaryMatch {
  canonical: string;
  category: string;
  score: number; // 0..1 — 1 is perfect
  matchedAlias: string;
}

/**
 * Fuzzy-match a noisy OCR test name against the curated dictionary.
 * Returns the best canonical match (and confidence) or null if nothing close.
 */
export function matchToDictionary(raw: string, threshold = 0.55): DictionaryMatch | null {
  const q = normalize(raw);
  if (!q) return null;

  let best: DictionaryMatch | null = null;

  for (const entry of MEDICAL_TEST_DICTIONARY) {
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      if (!a) continue;

      // Exact / substring boosts
      let score = 0;
      if (a === q) score = 1;
      else if (q.includes(a) || a.includes(q)) score = 0.9;
      else {
        const dist = levenshtein(a, q);
        const maxLen = Math.max(a.length, q.length);
        score = 1 - dist / maxLen;
      }

      if (!best || score > best.score) {
        best = { canonical: entry.canonical, category: entry.category, score, matchedAlias: alias };
      }
    }
  }

  if (best && best.score >= threshold) return best;
  return null;
}
