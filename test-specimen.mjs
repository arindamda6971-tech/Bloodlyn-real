// Testing
const SPECIMEN_MAP = [
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

const METHOD_SUFFIXES = [
  "by IFCC protocol", "by LC/MS/MS", "by Immunoassay", "by HPLC",
  "by Flow cytometry", "by Electrophoresis", "by calculation",
  "by Automated count", "by Manual count", "by Direct assay",
];

const BRACKET_REGEX = /\s*\[[^\]]*\]\s*/g;

function simplify(rawName) {
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

  let specimenLabel = "";
  for (const { suffix, label } of SPECIMEN_MAP) {
    const idx = name.lastIndexOf(suffix);
    if (idx > 0) {
      specimenLabel = label;
      name = name.slice(0, idx);
      break;
    }
  }

  for (const method of METHOD_SUFFIXES) {
    const idx = name.lastIndexOf(method);
    if (idx > 0) {
      name = name.slice(0, idx);
      break;
    }
  }

  if (name.includes("/")) {
    const parts = name.split("/");
    const firstPart = parts[0].trim();
    if (firstPart.length >= 6) {
      name = firstPart;
    }
  }

  name = name.replace(/\s*during Reporting Period/i, "").replace(/\s*summary panel/i, "").replace(/\s*summary report Document/i, "");
  name = name.replace(/\s{2,}/g, " ").replace(/[\s,;.]+$/, "").trim();

  const tags = [];
  if (specimenLabel) tags.push(specimenLabel);
  if (qualifier) tags.push(qualifier);

  if (tags.length > 0) {
    name = `${name} — ${tags.join(", ")}`;
  }

  if (name.length < 3) return rawName.trim();
  return name;
}

const tests = [
  "Carboxyhemoglobin [Mass/volume] in Blood",
  "Carboxyhemoglobin [Moles/volume] in Serum",
  "Carboxyhemoglobin [Presence] in Urine",
  "Glucose [Mass/volume] in Serum or Plasma --fasting",
  "Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol"
];

for (const t of tests) {
  console.log(`Original: ${t}`);
  console.log(`New:      ${simplify(t)}`);
  console.log("---");
}
