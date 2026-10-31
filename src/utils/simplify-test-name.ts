/**
 * simplifyTestName — Pure UI-layer utility
 * 
 * Converts LOINC-standard laboratory test names into short, consumer-friendly
 * display names. The original scientific name is never altered in the database
 * or in any data object — this function is used ONLY at the rendering boundary.
 *
 * Keeps the specimen type as a short tag to differentiate tests with the same
 * base name (e.g. "Carboxyhemoglobin" in Blood vs Serum vs Urine).
 *
 * Examples:
 *   "Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol"
 *       → "Hemoglobin A1c — Blood"
 *
 *   "Glucose [Mass/volume] in Serum or Plasma --fasting"
 *       → "Glucose — Serum or Plasma (Fasting)"
 *
 *   "Carboxyhemoglobin [Mass/volume] in Blood"
 *       → "Carboxyhemoglobin — Blood"
 *
 *   "Carboxyhemoglobin [Moles/volume] in Serum"
 *       → "Carboxyhemoglobin — Serum"
 *
 *   "3-Methyl Histidine - Quantitative, EDTA Plasma**"
 *       → "3-Methyl Histidine - Quantitative — EDTA Plasma"
 */

// Specimen lookup: maps full "in ..." phrase → short display label
const SPECIMEN_MAP: { suffix: string; label: string }[] = [
  { suffix: "in Serum or Plasma from Fetus", label: "Fetal Serum" },
  { suffix: "in Serum or Plasma", label: "Serum/Plasma" },
  { suffix: "in Cerebral spinal fluid", label: "CSF" },
  { suffix: "in Cerebrospinal Fluid", label: "CSF" },
  { suffix: "in Interstitial fluid", label: "Interstitial Fluid" },
  { suffix: "in Amniotic fluid", label: "Amniotic Fluid" },
  { suffix: "in Red Blood Cells", label: "RBC" },
  { suffix: "in Body fluid", label: "Body Fluid" },
  { suffix: "in 24 hour Urine", label: "24h Urine" },
  { suffix: "in Synovial fluid", label: "Synovial Fluid" },
  { suffix: "in Platelet rich plasma", label: "PRP" },
  { suffix: "in Peritoneal fluid", label: "Peritoneal Fluid" },
  { suffix: "in Pleural fluid", label: "Pleural Fluid" },
  { suffix: "in Whole blood", label: "Whole Blood" },
  { suffix: "in Blood", label: "Blood" },
  { suffix: "in Serum", label: "Serum" },
  { suffix: "in Plasma", label: "Plasma" },
  { suffix: "in Urine", label: "Urine" },
  { suffix: "in Saliva", label: "Saliva" },
  { suffix: "in Stool", label: "Stool" },
  { suffix: "in Hair", label: "Hair" },
  { suffix: "in DBS", label: "DBS" },
  { suffix: "in Fibroblast", label: "Fibroblast" },
];

// Method suffixes to strip
const METHOD_SUFFIXES = [
  "by IFCC protocol",
  "by LC/MS/MS",
  "by Immunoassay",
  "by HPLC",
  "by Flow cytometry",
  "by Electrophoresis",
  "by calculation",
  "by Automated count",
  "by Manual count",
  "by Direct assay",
];

// Measurement unit brackets like [Mass/volume], [Moles/time], [Presence], etc.
// A lab's own words in brackets, like [Complete Blood Count], are left alone.
const BRACKET_REGEX = /\s*\[[^\]]*(?:\/|#|presence|ratio|fraction|titer|mass|moles|units|entitic|interpretation)[^\]]*\]\s*/gi;

// Lab catalogue names: "SGPT (ALT), Serum"
const COMMA_SPECIMEN_REGEX = /,\s*((?:EDTA |Fluoride |Citrate |Heparin )?(?:Whole Blood|Blood|Serum|Plasma|Urine|Stool|Tissue|Saliva|Sputum))$/i;

// Lab catalogue markers: trailing asterisks and order codes like "(E9X9V)*"
const CATALOGUE_MARKS_REGEX = /(?:\s*\((?=[A-Z0-9]*\d)[A-Z0-9]{4,6}\))?[\s*]*\*+\s*$/;

interface TestNameParts {
  /** What the test is, to show as its name. */
  title: string;
  /** The sample it's run on, when the name says. */
  specimen: string;
  /** "Fasting", "Random" and the like. */
  qualifier: string;
}

// In-memory cache to eliminate repeated regex and string operations on 60/120fps scroll ticks
const partsCache = new Map<string, TestNameParts>();

function parseTestName(rawName: string): TestNameParts {
  const cached = partsCache.get(rawName);
  if (cached) return cached;

  let name = rawName.trim();

  // 1. Strip "Deprecated " prefix
  if (name.startsWith("Deprecated ")) {
    name = name.slice("Deprecated ".length);
  }

  name = name.replace(CATALOGUE_MARKS_REGEX, "").replace(/\*+/g, "").trim();

  // 2. Extract fasting/random qualifiers from "--fasting", "--random", etc.
  let qualifier = "";
  const dashQualifier = name.match(/\s*--(\w+)/);
  if (dashQualifier) {
    qualifier = dashQualifier[1].charAt(0).toUpperCase() + dashQualifier[1].slice(1).toLowerCase();
    name = name.replace(dashQualifier[0], "");
  }

  // 3. Remove all bracket units like [Mass/volume], [Presence], [Molar ratio]
  name = name.replace(BRACKET_REGEX, " ");

  // 4. Extract specimen type BEFORE removing it (keep as a short label)
  let specimenLabel = "";
  for (const { suffix, label } of SPECIMEN_MAP) {
    const idx = name.lastIndexOf(suffix);
    if (idx > 0) {
      specimenLabel = label;
      name = name.slice(0, idx);
      break;
    }
  }
  if (!specimenLabel) {
    const commaSpecimen = name.match(COMMA_SPECIMEN_REGEX);
    if (commaSpecimen) {
      specimenLabel = commaSpecimen[1];
      name = name.slice(0, commaSpecimen.index);
    }
  }

  // 5. Remove method suffixes ("by IFCC protocol", "by LC/MS/MS", etc.)
  for (const method of METHOD_SUFFIXES) {
    const idx = name.lastIndexOf(method);
    if (idx > 0) {
      name = name.slice(0, idx);
      break;
    }
  }

  // 6. "Hemoglobin A1c/Hemoglobin.total" is one test, so take the common name.
  //    Other "/" names are different tests: "Albumin/Globulin" isn't "Albumin".
  if (/\/[^/]*\.total\b/i.test(name)) {
    name = name.split("/")[0].trim();
  }

  // 7. Remove "during Reporting Period", "summary panel", "summary report Document"
  name = name
    .replace(/\s*during Reporting Period/i, "")
    .replace(/\s*summary panel/i, "")
    .replace(/\s*summary report Document/i, "");

  // 8. Clean up multiple spaces, trailing punctuation, trim
  name = name.replace(/\s{2,}/g, " ").replace(/[\s,;.]+$/, "").trim();

  // 9. If the simplified name is too short or empty, fall back to original
  const parts = name.length < 3
    ? { title: rawName.trim(), specimen: "", qualifier: "" }
    : { title: name, specimen: specimenLabel, qualifier };
  partsCache.set(rawName, parts);
  return parts;
}

/** One line, for lists of test names: "Glucose — Serum/Plasma, Fasting". */
export function simplifyTestName(rawName: string): string {
  if (!rawName) return rawName;
  const { title, specimen, qualifier } = parseTestName(rawName);
  const tags = [specimen, qualifier].filter(Boolean);
  return tags.length > 0 ? `${title} — ${tags.join(", ")}` : title;
}

const lettersOnly = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** False when the clinical name differs only in punctuation, so showing it would repeat the name. */
export function clinicalNameAddsDetail(rawName: string): boolean {
  return lettersOnly(simplifyTestName(rawName)) !== lettersOnly(rawName);
}

/**
 * The sample to show on a card. The name can narrow the lab's "Blood" down to
 * "Serum", but the lab decides what's collected, so a different sample stands.
 */
export function testSample(rawName: string, labSample?: string | null): string | undefined {
  const { specimen } = testNameParts(rawName);
  const isBloodSample = /blood|serum|plasma/i;
  if (!labSample?.trim()) return specimen || undefined;
  return specimen && isBloodSample.test(labSample) && isBloodSample.test(specimen) ? specimen : labSample;
}

/** Name and sample apart, for a card that shows the sample among the test's details. */
export function testNameParts(rawName: string): { title: string; specimen: string } {
  if (!rawName) return { title: rawName, specimen: "" };
  const { title, specimen, qualifier } = parseTestName(rawName);
  return { title: qualifier ? `${title} (${qualifier})` : title, specimen };
}
