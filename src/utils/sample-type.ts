/**
 * Which sample a test is clearly done on, from its name. The Partner Portal
 * uses the same rules (partner-pro `src/lib/labTestDisplay.ts`) to warn a lab
 * that picks a sample that can't be right, like "Urine" for a blood count.
 */
export type SampleKind = "Blood" | "Urine" | "Stool" | "Swab" | "Sputum";

// Tests on tissue, fluids or marrow: no guess, the lab knows best.
const NO_GUESS = /\b(biops\w*|histopatholog\w*|immunohistochemistry|ihc|cytology|tissue|fnac|csf|cerebrospinal|fluid|semen|seminal|sperm|pus|bone marrow|marrow)\b/i;

// Checked in this order, so "Stool for occult blood" is a stool test.
const NAMED_SAMPLES: [SampleKind, RegExp][] = [
  ["Stool", /\b(stool|faecal|fecal|faeces|feces|motion)\b/i],
  ["Urine", /\b(urine|urinary|urinalysis)\b/i],
  ["Sputum", /\bsputum\b/i],
  ["Swab", /\b(swab|nasopharyngeal|throat)\b/i],
  // Tests that can only be done on blood. Plain "blood" or "serum" isn't enough:
  // a catalogue name ending "…, EDTA Blood" can still be run on saliva.
  [
    "Blood",
    /\b(complete blood count|blood count|cbc|ha?emogram|ha?emoglobin|hb|esr|erythrocyte sedimentation|platelets?|pcv|ha?ematocrit|reticulocytes?|blood group|abo|hba1c|glycated|glycosylated|lipid|cholesterol|triglycerides?|hdl|ldl|vldl|tsh|thyroid|t3|t4|ft3|ft4|liver function|lft|kidney function|kft|renal function|rft|bilirubin|sgot|sgpt|ggt|alkaline phosphatase|ferritin|vitamin|crp|c-reactive|widal|dengue|malaria|typhoid|hiv|hbsag|hcv|vdrl|psa|troponin|d-dimer|prothrombin|inr|aptt|tc|dc|dlc|tlc|blood sugar|blood glucose|fbs|ppbs|rbs|gtt|fasting glucose|glucose fasting|glucose pp|glucose random)\b/i,
  ],
];

/**
 * "Complete Blood Count" is blood, "Urine R/E" is urine. Null when the name
 * doesn't say for sure (Creatinine can be blood or urine).
 */
export function sampleFromTestName(name: string | null | undefined): SampleKind | null {
  const text = (name ?? "").replace(/[_*]+/g, " ");
  if (!text.trim() || NO_GUESS.test(text)) return null;
  for (const [kind, words] of NAMED_SAMPLES) {
    if (words.test(text)) return kind;
  }
  return null;
}

/** What a lab's saved sample means: "Serum" and "EDTA Blood" are blood. Null for "Other" or anything unknown. */
export function sampleKindOf(sample: string | null | undefined): SampleKind | null {
  const text = (sample ?? "").toLowerCase();
  if (/blood|serum|plasma|edta/.test(text)) return "Blood";
  if (/urine/.test(text)) return "Urine";
  if (/stool|faec|fec/.test(text)) return "Stool";
  if (/swab/.test(text)) return "Swab";
  if (/sputum/.test(text)) return "Sputum";
  return null;
}
