/**
 * On-device test search for the Admin catalogue.
 *
 * Catalogue names are lab names ("Glucose Fasting, Fluoride Plasma"), while people
 * search the way they speak ("blood sugar", "jor", "thyriod"). This module bridges
 * the two without a network call per keystroke:
 *
 *  1. Typos are corrected against the catalogue's own vocabulary.
 *  2. Health concepts are detected ("sugar" → glucose, HbA1c, GTT, insulin …),
 *     including common Hinglish and Bengali/Hindi words.
 *  3. Every test is scored against the concepts plus any remaining words, then ranked.
 *
 * The index is built once per catalogue (cached by array identity), so a search is a
 * few milliseconds even across the full catalogue.
 */

export interface SearchableTest {
  id: string;
  test_name: string;
  category?: string | null;
  display_name?: string | null;
}

interface Term {
  /** Normalized phrase matched on word boundaries in the test name. */
  t: string;
  /** 0..1 — how central this test is to the concept. */
  w: number;
}

interface Concept {
  id: string;
  label: string;
  triggers: string[];
  terms: Term[];
}

const term = (t: string, w: number): Term => ({ t, w });

// Ordered loosely by how often people search for them.
const CONCEPTS: Concept[] = [
  {
    id: "fasting-sugar",
    label: "Fasting blood sugar",
    triggers: ["fbs", "fbg", "fasting sugar", "fasting glucose", "fasting blood sugar", "khali pet sugar"],
    terms: [term("glucose fasting", 1), term("fasting glucose", 1), term("insulin fasting", 0.6)],
  },
  {
    id: "pp-sugar",
    label: "Post-meal blood sugar",
    triggers: ["ppbs", "ppbg", "pp sugar", "post prandial", "postprandial", "after food sugar", "after meal sugar"],
    terms: [term("glucose post prandial", 1), term("post prandial", 0.85), term("glucose 120 min", 0.6)],
  },
  {
    id: "random-sugar",
    label: "Random blood sugar",
    triggers: ["rbs", "random sugar", "random blood sugar", "random glucose"],
    terms: [term("glucose random", 1)],
  },
  {
    id: "hba1c",
    label: "HbA1c (3-month sugar)",
    triggers: ["hba1c", "hb a1c", "a1c", "glycated", "glycosylated", "3 month sugar", "three month sugar", "average sugar"],
    terms: [term("hba1c", 1), term("glycated", 0.95), term("glycosylated hemoglobin", 0.9), term("fructosamine", 0.5)],
  },
  {
    id: "sugar",
    label: "Blood sugar & diabetes",
    triggers: [
      "sugar", "blood sugar", "sugar test", "diabetes", "diabetic", "diabetis", "diabities", "diabitis", "daibetes",
      "sugur", "suger", "glucose", "madhumeh", "madhumeha", "glycemic", "সুগার", "ডায়াবেটিস", "শুগার", "शुगर", "मधुमेह", "डायबिटीज",
    ],
    terms: [
      term("glucose fasting", 1), term("glucose random", 0.97), term("glucose post prandial", 0.96), term("hba1c", 0.95),
      term("glucose", 0.85), term("gtt", 0.8), term("glucose tolerance", 0.8), term("glycated", 0.85), term("insulin", 0.6),
      term("c peptide", 0.55), term("fructosamine", 0.6), term("diabetes", 0.7), term("diabetic", 0.7), term("microalbumin", 0.45),
    ],
  },
  {
    id: "thyroid",
    label: "Thyroid",
    triggers: [
      "thyroid", "thyroid profile", "thyroid function", "thyroid test", "tft", "thyroied", "thairoid", "thyriod", "goitre",
      "goiter", "hypothyroid", "hyperthyroid", "hypothyroidism", "hyperthyroidism", "থাইরয়েড", "थायराइड",
    ],
    terms: [
      term("thyroid profile", 1), term("tsh", 0.95), term("t3", 0.85), term("t4", 0.85), term("ft3", 0.85), term("ft4", 0.85),
      term("thyroid", 0.8), term("thyroxine", 0.8), term("triiodothyronine", 0.8), term("tri iodothyronine", 0.8),
      term("anti tpo", 0.6), term("tpo", 0.6), term("thyroglobulin", 0.5),
    ],
  },
  {
    id: "cbc",
    label: "Complete blood count",
    triggers: [
      "cbc", "cbp", "fbc", "blood count", "complete blood count", "full blood count", "hemogram", "blood test", "routine blood",
      "blood routine", "রক্ত পরীক্ষা", "खून की जांच",
    ],
    terms: [
      term("cbc", 1), term("complete blood count", 1), term("hemogram", 0.95), term("hemoglobin", 0.6),
      term("platelet count", 0.6), term("esr", 0.45),
    ],
  },
  {
    id: "anemia",
    label: "Hemoglobin & anemia",
    triggers: [
      "hemoglobin", "heamoglobin", "hemoglobine", "hb", "anemia", "anaemic", "anemic", "low hb", "khoon ki kami", "blood loss",
      "রক্তাল্পতা", "খুন", "खून",
    ],
    terms: [
      term("hemoglobin", 1), term("cbc", 0.85), term("hemogram", 0.85), term("ferritin", 0.7), term("iron", 0.7),
      term("tibc", 0.6), term("vitamin b12", 0.6), term("folate", 0.5), term("folic acid", 0.5), term("reticulocyte", 0.5),
      term("peripheral smear", 0.5),
    ],
  },
  {
    id: "iron",
    label: "Iron studies",
    triggers: ["iron", "ferritin", "iron profile", "iron studies", "tibc"],
    terms: [term("iron", 1), term("ferritin", 0.95), term("tibc", 0.8), term("transferrin", 0.7)],
  },
  {
    id: "lipid",
    label: "Cholesterol & lipids",
    triggers: [
      "cholesterol", "cholestrol", "colestrol", "lipid", "lipid profile", "lipids", "ldl", "hdl", "vldl", "triglyceride",
      "triglycerides", "tg", "fat test", "কোলেস্টেরল", "कोलेस्ट्रॉल",
    ],
    terms: [
      term("lipid profile", 1), term("lipid", 0.9), term("cholesterol", 0.9), term("hdl", 0.8), term("ldl", 0.8),
      term("triglycerides", 0.8), term("triglyceride", 0.8), term("vldl", 0.7), term("lipoprotein", 0.5), term("apolipoprotein", 0.5),
    ],
  },
  {
    id: "heart",
    label: "Heart health",
    triggers: ["heart", "cardiac", "heart attack", "chest pain", "cardio", "heart checkup", "হার্ট", "दिल"],
    terms: [
      term("troponin", 0.9), term("cardiac", 0.9), term("lipid profile", 0.85), term("ck mb", 0.8), term("nt probnp", 0.8),
      term("bnp", 0.7), term("hs crp", 0.7), term("hscrp", 0.7), term("homocysteine", 0.6), term("cpk", 0.6),
      term("cholesterol", 0.6), term("lipoprotein", 0.5),
    ],
  },
  {
    id: "liver",
    label: "Liver function",
    triggers: [
      "liver", "lft", "liver function", "liver test", "liver profile", "jaundice", "jondis", "hepatic", "sgpt", "sgot",
      "fatty liver", "লিভার", "জন্ডিস", "लिवर", "पीलिया",
    ],
    terms: [
      term("liver function", 1), term("lft", 1), term("liver", 0.85), term("bilirubin", 0.85), term("sgpt", 0.8),
      term("sgot", 0.8), term("alt", 0.7), term("ast", 0.7), term("alkaline phosphatase", 0.7), term("ggt", 0.7),
      term("gamma gt", 0.7), term("albumin", 0.5), term("total protein", 0.5), term("hepatitis", 0.5),
    ],
  },
  {
    id: "kidney",
    label: "Kidney function",
    triggers: [
      "kidney", "kidny", "kft", "rft", "renal", "kidney function", "kidney test", "kidney stone", "creatinine", "urea",
      "কিডনি", "किडनी",
    ],
    terms: [
      term("kidney function", 1), term("kft", 1), term("rft", 1), term("renal", 0.85), term("kidney", 0.85),
      term("creatinine", 0.85), term("urea", 0.8), term("bun", 0.8), term("uric acid", 0.7), term("egfr", 0.7),
      term("electrolytes", 0.6), term("microalbumin", 0.6), term("cystatin", 0.6),
    ],
  },
  {
    id: "vitamin-d",
    label: "Vitamin D",
    triggers: ["vitamin d", "vit d", "vitamin d3", "vit d3", "d3", "25 oh", "25 oh vitamin d", "ভিটামিন ডি", "विटामिन डी"],
    terms: [term("vitamin d", 1), term("25 hydroxy", 0.9), term("calcidiol", 0.6)],
  },
  {
    id: "b12",
    label: "Vitamin B12",
    triggers: ["b12", "vitamin b12", "vit b12", "cobalamin", "vitamin b 12", "vit b 12"],
    terms: [term("vitamin b12", 1), term("b12", 1), term("cobalamin", 0.8), term("holo transcobalamin", 0.6), term("folate", 0.4)],
  },
  {
    id: "vitamins",
    label: "Vitamins & nutrition",
    triggers: ["vitamin", "vitamins", "vitamine", "vit", "nutrition", "deficiency", "ভিটামিন", "विटामिन"],
    terms: [
      term("vitamin", 1), term("folate", 0.6), term("folic acid", 0.6), term("zinc", 0.5), term("magnesium", 0.5),
      term("ferritin", 0.4), term("iron", 0.4), term("calcium", 0.4),
    ],
  },
  {
    id: "fever",
    label: "Fever",
    triggers: ["fever", "bukhar", "jor", "jwar", "viral fever", "high fever", "জ্বর", "বুখার", "बुखार"],
    terms: [
      term("typhoid", 0.9), term("widal", 0.9), term("dengue", 0.9), term("malaria", 0.9), term("fever", 0.9),
      term("cbc", 0.8), term("hemogram", 0.8), term("chikungunya", 0.8), term("crp", 0.7), term("esr", 0.7),
      term("blood culture", 0.6), term("urine culture", 0.5), term("procalcitonin", 0.5),
    ],
  },
  {
    id: "dengue",
    label: "Dengue",
    triggers: ["dengue", "dengu", "ns1", "platelet", "platelets", "ডেঙ্গু", "डेंगू"],
    terms: [term("dengue", 1), term("ns1", 0.95), term("platelet count", 0.6), term("platelet", 0.5)],
  },
  {
    id: "typhoid",
    label: "Typhoid",
    triggers: ["typhoid", "taifoid", "widal", "enteric fever", "typhi", "টাইফয়েড", "टाइफाइड"],
    terms: [term("typhoid", 1), term("widal", 1), term("typhidot", 0.9), term("typhi", 0.8), term("salmonella", 0.6)],
  },
  {
    id: "malaria",
    label: "Malaria",
    triggers: ["malaria", "mp", "malarial parasite", "ম্যালেরিয়া", "मलेरिया"],
    terms: [term("malaria", 1), term("malarial", 0.9), term("plasmodium", 0.7)],
  },
  {
    id: "urine",
    label: "Urine tests",
    triggers: [
      "urine", "urine test", "urine routine", "urine re", "urine rm", "urine infection", "uti", "peshab", "pesab",
      "প্রস্রাব", "पेशाब",
    ],
    terms: [term("urine routine", 1), term("urine", 0.85), term("urine culture", 0.8), term("microalbumin", 0.4)],
  },
  {
    id: "stool",
    label: "Stool tests",
    triggers: ["stool", "stool test", "potty", "motion test", "পায়খানা", "मल"],
    terms: [term("stool", 1), term("occult blood", 0.6), term("calprotectin", 0.6)],
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    triggers: ["pregnancy", "pregnant", "pregnancy test", "hcg", "beta hcg", "garbh", "গর্ভাবস্থা", "प्रेगनेंसी"],
    terms: [
      term("beta hcg", 1), term("hcg", 0.95), term("pregnancy", 0.9), term("double marker", 0.6),
      term("triple marker", 0.6), term("quadruple marker", 0.6),
    ],
  },
  {
    id: "womens-health",
    label: "PCOS & women's hormones",
    triggers: [
      "pcod", "pcos", "periods", "irregular periods", "period problem", "women health", "womens health", "female hormone",
      "female hormones", "infertility", "fertility", "amh",
    ],
    terms: [
      term("amh", 0.9), term("anti mullerian", 0.9), term("pcos", 0.9), term("pcod", 0.9), term("lh", 0.8), term("fsh", 0.8),
      term("prolactin", 0.8), term("testosterone", 0.7), term("estradiol", 0.7), term("progesterone", 0.6), term("dhea", 0.6),
      term("insulin", 0.5),
    ],
  },
  {
    id: "mens-health",
    label: "Men's health",
    triggers: ["testosterone", "male hormone", "men health", "mens health", "sperm", "semen"],
    terms: [term("testosterone", 1), term("semen", 0.9), term("psa", 0.6), term("lh", 0.4)],
  },
  {
    id: "prostate",
    label: "Prostate",
    triggers: ["prostate", "psa"],
    terms: [term("psa", 1), term("prostate", 0.9)],
  },
  {
    id: "cancer",
    label: "Cancer markers",
    triggers: ["cancer", "tumor", "tumour", "tumor marker", "tumour marker", "tumor markers", "tumour markers", "ক্যান্সার", "कैंसर"],
    terms: [
      term("tumor marker", 1), term("tumour marker", 1), term("cancer", 0.9), term("psa", 0.7), term("cea", 0.7),
      term("ca 125", 0.7), term("ca 19 9", 0.7), term("ca 15 3", 0.7), term("afp", 0.7), term("alpha fetoprotein", 0.7),
    ],
  },
  {
    id: "allergy",
    label: "Allergy",
    triggers: ["allergy", "allergies", "allergic", "alergy", "ige", "itching", "sneezing", "এলার্জি", "एलर्जी"],
    terms: [term("allergy", 1), term("ige", 0.8), term("allergen", 0.7)],
  },
  {
    id: "joints",
    label: "Arthritis & joint pain",
    triggers: ["arthritis", "joint pain", "joints", "joint", "rheumatoid", "ra factor", "gout", "uric", "bater byatha", "বাত"],
    terms: [
      term("ra factor", 0.9), term("rheumatoid", 0.9), term("anti ccp", 0.9), term("uric acid", 0.8), term("hla b27", 0.7),
      term("crp", 0.6), term("ana", 0.6), term("esr", 0.5),
    ],
  },
  {
    id: "bone",
    label: "Bone health",
    triggers: ["bone", "bones", "calcium", "osteoporosis", "haddi", "হাড়", "हड्डी"],
    terms: [
      term("calcium", 1), term("vitamin d", 0.85), term("phosphorus", 0.7), term("alkaline phosphatase", 0.6), term("pth", 0.6),
      term("parathyroid", 0.6),
    ],
  },
  {
    id: "hiv",
    label: "HIV",
    triggers: ["hiv", "aids"],
    terms: [term("hiv", 1)],
  },
  {
    id: "hepatitis",
    label: "Hepatitis",
    triggers: ["hepatitis", "hbsag", "hep b", "hep c", "hepatitis b", "hepatitis c", "hcv", "hbv"],
    terms: [term("hepatitis", 1), term("hbsag", 1), term("hcv", 0.9), term("hbv", 0.9), term("hav", 0.8), term("hev", 0.8)],
  },
  {
    id: "std",
    label: "Sexual health (STD)",
    triggers: ["std", "sti", "vdrl", "syphilis", "sexual health", "herpes"],
    terms: [
      term("vdrl", 1), term("syphilis", 1), term("herpes", 0.8), term("hsv", 0.8), term("chlamydia", 0.8),
      term("gonorrhea", 0.8), term("hiv", 0.7),
    ],
  },
  {
    id: "tb",
    label: "Tuberculosis (TB)",
    triggers: ["tb", "tuberculosis", "mantoux", "quantiferon", "যক্ষ্মা", "टीबी"],
    terms: [
      term("tuberculosis", 1), term("quantiferon", 0.9), term("mantoux", 0.9), term("tb", 0.9), term("afb", 0.8),
      term("mycobacterium", 0.8),
    ],
  },
  {
    id: "covid",
    label: "COVID-19",
    triggers: ["covid", "corona", "coronavirus", "covid 19", "sars"],
    terms: [term("covid", 1), term("sars cov", 0.9)],
  },
  {
    id: "full-body",
    label: "Full body checkup",
    triggers: [
      "full body", "full body checkup", "full body test", "whole body", "health checkup", "health check", "master checkup",
      "complete checkup", "routine checkup", "annual checkup", "wellness", "body checkup",
    ],
    terms: [
      term("full body", 1), term("health checkup", 1), term("truhealth", 0.9), term("wellness", 0.9), term("master", 0.8),
      term("health package", 0.8),
    ],
  },
  {
    id: "lungs",
    label: "Lungs & breathing",
    triggers: ["lung", "lungs", "asthma", "breathing", "respiratory", "copd", "cough", "শ্বাসকষ্ট", "फेफड़े"],
    terms: [
      term("respiratory", 0.9), term("lung", 0.9), term("asthma", 0.8), term("blood gas", 0.6), term("abg", 0.6),
      term("tuberculosis", 0.5), term("ige", 0.5),
    ],
  },
  {
    id: "electrolytes",
    label: "Electrolytes",
    triggers: ["electrolytes", "electrolyte", "sodium", "potassium", "chloride", "na k"],
    terms: [term("electrolytes", 1), term("sodium", 0.9), term("potassium", 0.9), term("chloride", 0.8)],
  },
  {
    id: "blood-group",
    label: "Blood group",
    triggers: ["blood group", "blood grouping", "abo", "rh typing", "rh factor"],
    terms: [term("blood group", 1), term("abo", 0.9), term("rh", 0.7)],
  },
  {
    id: "clotting",
    label: "Clotting & bleeding",
    triggers: ["pt inr", "inr", "clotting", "bleeding", "blood thinner", "coagulation", "d dimer", "aptt"],
    terms: [
      term("prothrombin", 1), term("inr", 1), term("aptt", 0.9), term("ptt", 0.8), term("d dimer", 0.8),
      term("fibrinogen", 0.7), term("coagulation", 0.8), term("bleeding time", 0.8), term("clotting time", 0.8),
    ],
  },
  {
    id: "stress",
    label: "Stress hormones",
    triggers: ["stress", "cortisol"],
    terms: [term("cortisol", 1)],
  },
  {
    id: "hair",
    label: "Hair fall",
    triggers: ["hair fall", "hair loss", "hairfall", "chul pora", "baal jhadna"],
    terms: [
      term("ferritin", 0.8), term("thyroid profile", 0.8), term("iron", 0.7), term("tsh", 0.7), term("vitamin d", 0.7),
      term("vitamin b12", 0.6), term("zinc", 0.6), term("testosterone", 0.5), term("dhea", 0.5),
    ],
  },
  {
    id: "fatigue",
    label: "Weakness & fatigue",
    triggers: ["weakness", "fatigue", "tiredness", "tired", "kamzori", "durbolota", "দুর্বলতা", "कमजोरी"],
    terms: [
      term("cbc", 0.8), term("hemoglobin", 0.8), term("vitamin d", 0.8), term("vitamin b12", 0.8), term("thyroid profile", 0.7),
      term("tsh", 0.7), term("iron", 0.6), term("ferritin", 0.6), term("glucose fasting", 0.5),
    ],
  },
  {
    id: "weight",
    label: "Weight & metabolism",
    triggers: ["weight gain", "weight loss", "obesity", "obese", "metabolism", "overweight"],
    terms: [
      term("thyroid profile", 0.8), term("lipid profile", 0.7), term("tsh", 0.7), term("glucose fasting", 0.6),
      term("insulin", 0.6), term("hba1c", 0.6), term("cortisol", 0.5),
    ],
  },
];

/** Words that carry no meaning on their own in a test search. */
const QUERY_STOPWORDS = new Set([
  "test", "tests", "check", "checkup", "level", "levels", "report", "reports", "lab", "the", "for", "of", "and", "in",
  "my", "please", "home", "ka", "ki", "ke", "er", "pariksha", "porikkha", "jaanch", "jach",
]);

/** Words that only refine ranking: "glucose blood" should not hide plasma glucose tests. */
const SOFT_WORDS = new Set(["blood", "serum", "plasma"]);

const VET_PREFIX = /^(canine|feline|equine|bovine|avian)\b/;
const VET_QUERY = /\b(canine|feline|dog|cat|pet|vet|veterinary|animal)\b/;
// Samples collected in hospital, not at home: rank them after blood/urine versions.
const RARE_SPECIMEN = / (csf|synovial|body fluid|amniotic|pleural|peritoneal|ascitic|pericardial|bal) /;

/**
 * Lowercase, fold British spellings (haemoglobin → hemoglobin, oestradiol → estradiol)
 * and keep letters/digits of any script so Bengali and Hindi words survive.
 * The same function runs on names and queries, so every fold is symmetric.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/aem/g, "em")
    .replace(/oe/g, "e")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

const isLatinWord = (w: string) => /^[a-z0-9]+$/.test(w);

// Optimal-string-alignment distance with an early exit once `max` is exceeded.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// Normalized triggers, longest first, so "fasting sugar" wins over "sugar".
const TRIGGERS: { phrase: string; concept: Concept }[] = CONCEPTS.flatMap((concept) =>
  concept.triggers.map((t) => ({ phrase: normalizeSearchText(t), concept })),
).sort((a, b) => b.phrase.length - a.phrase.length);

const NORMALIZED_TERMS = new Map<Concept, (Term & { single: boolean })[]>(
  CONCEPTS.map((c) => [
    c,
    c.terms.map((x) => {
      const t = normalizeSearchText(x.t);
      return { t, w: x.w, single: !t.includes(" ") };
    }),
  ]),
);

const TRIGGER_WORDS = new Set(
  TRIGGERS.flatMap(({ phrase }) => phrase.split(" ")).filter((w) => isLatinWord(w) && w.length >= 3),
);

interface IndexedTest<T> {
  test: T;
  /** " word word … " — padded so phrases match on word boundaries. */
  padded: string;
  /** Padded display name only, for "starts with" ranking. */
  paddedDisplay: string;
  words: string[];
  wordSet: Set<string>;
  isVet: boolean;
  isRareSpecimen: boolean;
  length: number;
}

export interface TestSearchIndex<T extends SearchableTest> {
  items: IndexedTest<T>[];
  vocab: Map<string, number>;
  vocabList: string[];
  /** Per-concept scores for every item, filled on first use. */
  conceptScores: Map<Concept, Float32Array>;
}

const indexCache = new WeakMap<object, TestSearchIndex<SearchableTest>>();

function indexTest<T extends SearchableTest>(test: T, vocab: Map<string, number>): IndexedTest<T> {
  const display = normalizeSearchText(test.display_name || test.test_name || "");
  const full = normalizeSearchText(test.test_name || "");
  const text = full && full !== display ? `${display} ${full}` : display;
  const words = text.split(" ").filter(Boolean);
  const wordSet = new Set(words);
  for (const w of wordSet) {
    if (w.length >= 3 && isLatinWord(w)) vocab.set(w, (vocab.get(w) ?? 0) + 1);
  }
  return {
    test,
    padded: ` ${text} `,
    paddedDisplay: ` ${display} `,
    words,
    wordSet,
    isVet: VET_PREFIX.test(display),
    isRareSpecimen: RARE_SPECIMEN.test(` ${display} `),
    length: display.length,
  };
}

function finishIndex<T extends SearchableTest>(tests: T[], items: IndexedTest<T>[], vocab: Map<string, number>) {
  const index: TestSearchIndex<T> = { items, vocab, vocabList: [...vocab.keys()], conceptScores: new Map() };
  indexCache.set(tests, index as unknown as TestSearchIndex<SearchableTest>);
  return index;
}

/** Builds (or returns the cached) index in one go. */
export function buildTestSearchIndex<T extends SearchableTest>(tests: T[]): TestSearchIndex<T> {
  const cached = indexCache.get(tests);
  if (cached) return cached as unknown as TestSearchIndex<T>;
  const vocab = new Map<string, number>();
  return finishIndex(tests, tests.map((t) => indexTest(t, vocab)), vocab);
}

export function getCachedTestSearchIndex<T extends SearchableTest>(tests: T[]): TestSearchIndex<T> | null {
  return (indexCache.get(tests) as unknown as TestSearchIndex<T>) ?? null;
}

const pendingBuilds = new WeakMap<object, Promise<TestSearchIndex<SearchableTest>>>();

/**
 * Builds the index in small slices, yielding to the browser between them, so no single
 * task is long enough to drop frames or delay a tap — even on low-end Android (each
 * slice is ~1 ms on desktop, a few ms on a budget phone). Slices run back to back
 * rather than waiting for idle time, so a search typed right away is not kept waiting.
 */
export function buildTestSearchIndexInBackground<T extends SearchableTest>(
  tests: T[],
  sliceSize = 250,
): Promise<TestSearchIndex<T>> {
  const cached = getCachedTestSearchIndex(tests);
  if (cached) return Promise.resolve(cached);
  const pending = pendingBuilds.get(tests);
  if (pending) return pending as unknown as Promise<TestSearchIndex<T>>;

  const schedule = (cb: () => void) => setTimeout(cb, 0);

  const promise = new Promise<TestSearchIndex<T>>((resolve) => {
    const vocab = new Map<string, number>();
    const items: IndexedTest<T>[] = [];
    let next = 0;
    const step = () => {
      const end = Math.min(next + sliceSize, tests.length);
      for (; next < end; next++) items.push(indexTest(tests[next], vocab));
      if (next < tests.length) schedule(step);
      else resolve(getCachedTestSearchIndex(tests) ?? finishIndex(tests, items, vocab));
    };
    schedule(step);
  });
  pendingBuilds.set(tests, promise as unknown as Promise<TestSearchIndex<SearchableTest>>);
  return promise;
}

export interface TestSearchCorrection {
  from: string;
  to: string;
}

export interface TestSearchResult<T> {
  results: T[];
  /** Health concepts the query was understood as, e.g. "Blood sugar & diabetes". */
  concepts: string[];
  /** Typos that were corrected before searching. */
  corrections: TestSearchCorrection[];
}

function correctWord<T extends SearchableTest>(word: string, index: TestSearchIndex<T>): string | null {
  if (!isLatinWord(word) || word.length < 4) return null;
  if (index.vocab.has(word) || TRIGGER_WORDS.has(word)) return null;
  // Still typing: a known word starts with it, so leave it to prefix matching.
  for (const v of index.vocabList) if (v.startsWith(word)) return null;
  for (const v of TRIGGER_WORDS) if (v.startsWith(word)) return null;

  const max = word.length >= 7 ? 2 : 1;
  let best: string | null = null;
  let bestDistance = max + 1;
  let bestWeight = -1;
  const consider = (candidate: string, weight: number) => {
    const d = editDistance(word, candidate, max);
    if (d < bestDistance || (d === bestDistance && weight > bestWeight)) {
      best = candidate;
      bestDistance = d;
      bestWeight = weight;
    }
  };
  // Concept words outrank catalogue words at the same distance ("thyriod" → thyroid).
  for (const v of TRIGGER_WORDS) consider(v, Number.MAX_SAFE_INTEGER);
  for (const [v, count] of index.vocab) consider(v, count);
  return bestDistance <= max ? best : null;
}

/**
 * How well every test fits one concept, computed on first use and cached on the index.
 * Typing "blood sugar" letter by letter then re-scores only the extra words.
 */
function getConceptScores<T extends SearchableTest>(index: TestSearchIndex<T>, concept: Concept): Float32Array {
  const cached = index.conceptScores.get(concept);
  if (cached) return cached;
  const terms = NORMALIZED_TERMS.get(concept)!;
  const scores = new Float32Array(index.items.length);
  for (let i = 0; i < index.items.length; i++) {
    const item = index.items[i];
    let best = 0;
    for (const { t, w, single } of terms) {
      const hit = single ? item.wordSet.has(t) : item.padded.includes(` ${t} `);
      if (!hit) continue;
      const s = w * 100 + (item.paddedDisplay.startsWith(` ${t} `) ? 8 : 0);
      if (s > best) best = s;
    }
    scores[i] = best;
  }
  index.conceptScores.set(concept, scores);
  return scores;
}

function wordScore(words: string[], q: string): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return 3;
    if (q.length >= 2 && w.startsWith(q)) best = 2;
  }
  return best;
}

/**
 * Rank tests for a free-text query. `category` limits the search to one category slug.
 */
export function searchTests<T extends SearchableTest>(
  index: TestSearchIndex<T>,
  rawQuery: string,
  options: { category?: string } = {},
): TestSearchResult<T> {
  const normalized = normalizeSearchText(rawQuery);
  if (!normalized) return { results: [], concepts: [], corrections: [] };

  // 1. Typo correction against the catalogue vocabulary and concept words.
  const corrections: TestSearchCorrection[] = [];
  const words = normalized.split(" ").map((w) => {
    const fixed = correctWord(w, index);
    if (fixed && fixed !== w) {
      corrections.push({ from: w, to: fixed });
      return fixed;
    }
    return w;
  });

  // 2. Concept detection, longest trigger first; matched words are consumed.
  let remaining = ` ${words.join(" ")} `;
  const concepts: Concept[] = [];
  for (const { phrase, concept } of TRIGGERS) {
    const needle = ` ${phrase} `;
    if (remaining.includes(needle)) {
      if (!concepts.includes(concept)) concepts.push(concept);
      remaining = remaining.split(needle).join(" ");
    }
  }

  const residual = remaining.split(" ").filter((w) => w && !QUERY_STOPWORDS.has(w));
  let required = residual.filter((w) => !SOFT_WORDS.has(w));
  const soft = residual.filter((w) => SOFT_WORDS.has(w));
  if (!concepts.length && !required.length) required = residual.length ? residual : words;

  const phrase = ` ${words.join(" ")}`;
  const wantsVet = VET_QUERY.test(normalized);
  const wantsRareSpecimen = RARE_SPECIMEN.test(` ${normalized} `);
  const scored: { test: T; score: number; length: number }[] = [];
  const conceptScores = concepts.map((concept) => getConceptScores(index, concept));

  for (let i = 0; i < index.items.length; i++) {
    const item = index.items[i];
    if (options.category && item.test.category !== options.category) continue;

    let residualHits = 0;
    let residualOk = true;
    for (const q of required) {
      const s = wordScore(item.words, q);
      if (!s) {
        residualOk = false;
        break;
      }
      residualHits += s;
    }

    let score = 0;
    if (concepts.length) {
      let best = 0;
      let matchedConcepts = 0;
      for (const scores of conceptScores) {
        const conceptBest = scores[i];
        if (conceptBest > 0) matchedConcepts++;
        if (conceptBest > best) best = conceptBest;
      }
      if (best === 0) continue;
      score = best + (matchedConcepts - 1) * 15;
      // Extra words refine the concept ("sugar urine" → urine glucose first).
      if (required.length) score = residualOk ? score + 25 + residualHits * 3 : score * 0.6;
    } else {
      if (!residualOk) continue;
      score = 50 + residualHits * 4;
      if (item.paddedDisplay.startsWith(phrase)) score += 40;
      else if (item.padded.includes(`${phrase} `)) score += 20;
    }

    for (const w of soft) if (item.words.includes(w)) score += 2;
    if (item.isVet && !wantsVet) score *= 0.3;
    if (item.isRareSpecimen && !wantsRareSpecimen) score -= 15;
    score -= Math.min(10, item.length / 15);

    scored.push({ test: item.test, score, length: item.length });
  }

  scored.sort((a, b) => b.score - a.score || a.length - b.length);
  return {
    results: scored.map((s) => s.test),
    concepts: concepts.map((c) => c.label),
    corrections,
  };
}
