// Quick test of the simplifier against real test names

const SPECIMEN_SUFFIXES = [
  "in Serum or Plasma from Fetus", "in Serum or Plasma", "in Cerebral spinal fluid",
  "in Cerebrospinal Fluid", "in Interstitial fluid", "in Amniotic fluid",
  "in Red Blood Cells", "in Body fluid", "in 24 hour Urine", "in Synovial fluid",
  "in Platelet rich plasma", "in Peritoneal fluid", "in Pleural fluid",
  "in Whole blood", "in Blood", "in Serum", "in Plasma", "in Urine", "in Saliva",
  "in Stool", "in Hair", "in DBS", "in Fibroblast",
];
const METHOD_SUFFIXES = [
  "by IFCC protocol", "by LC/MS/MS", "by Immunoassay", "by HPLC",
  "by Flow cytometry", "by Electrophoresis", "by calculation",
  "by Automated count", "by Manual count",
];
const BRACKET_REGEX = /\s*\[[^\]]*\]\s*/g;

function simplifyTestName(rawName) {
  if (!rawName) return rawName;
  let name = rawName.trim();
  if (name.startsWith("Deprecated ")) name = name.slice("Deprecated ".length);
  let qualifier = "";
  const dashQualifier = name.match(/\s*--(\w+)/);
  if (dashQualifier) {
    qualifier = dashQualifier[1].charAt(0).toUpperCase() + dashQualifier[1].slice(1).toLowerCase();
    name = name.replace(dashQualifier[0], "");
  }
  name = name.replace(BRACKET_REGEX, " ");
  for (const suffix of SPECIMEN_SUFFIXES) { const idx = name.lastIndexOf(suffix); if (idx > 0) { name = name.slice(0, idx); break; } }
  for (const method of METHOD_SUFFIXES) { const idx = name.lastIndexOf(method); if (idx > 0) { name = name.slice(0, idx); break; } }
  if (name.includes("/")) { const parts = name.split("/"); if (parts[0].trim().length >= 6) name = parts[0].trim(); }
  name = name.replace(/\s*during Reporting Period/i, "").replace(/\s*summary panel/i, "").replace(/\s*summary report Document/i, "");
  name = name.replace(/\s{2,}/g, " ").replace(/[\s,;.]+$/, "").trim();
  if (qualifier) name = `${name} (${qualifier})`;
  if (name.length < 3) return rawName.trim();
  return name;
}

// Test against real names from the database
const realNames = [
  "1-deoxymethylsphinganine [Mass/volume] in Serum by LC/MS/MS",
  "Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol",
  "Glucose [Mass/volume] in Serum or Plasma --fasting",
  "Deprecated Cholesterol in HDL [Mass/volume] in Serum or Plasma",
  "1-Methylhistidine [Moles/volume] in Cerebrospinal Fluid",
  "Average glucose [Mass/volume] in Interstitial fluid during Reporting Period",
  "Continuous glucose monitoring summary panel - Reporting Period",
  "Deprecated Maple sugar IgE Ab RAST class [Presence] in Serum",
  "Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay",
  "Deprecated Sugar Beet Seed (Beta vulgaris seed) IgE Ab RAST class [Presence] in Serum",
  "1,1-Dimethoxy-(9Z)octadecene (DMA 18:1) [Mass/volume] in DBS",
  "Hemoglobin A1c [Mass/volume] in Blood",
];

console.log("=== SIMPLIFICATION RESULTS ===\n");
for (const name of realNames) {
  const simple = simplifyTestName(name);
  console.log(`ORIGINAL: ${name}`);
  console.log(`DISPLAY:  ${simple}`);
  console.log("");
}
