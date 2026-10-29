// What people type → which catalogue tests they mean.
//
// The catalogue uses lab names ("SGPT (ALT), Serum", "Glucose Fasting, Fluoride
// Plasma", "RFT ((Renal /Kidney) Function Tests) Profile - Mini") while people
// search the way they talk ("sugar", "liver test", "kidney", "bukhar"). Each
// concept below bridges the two:
//
//   triggers — words/phrases a user may type: lay terms, abbreviations,
//              conditions/symptoms, Hinglish/Banglish and Bengali/Hindi script.
//              Typos are handled by the search engine, not listed here.
//   searches — literal fragments of real catalogue names, sent to the server
//              (its search is a plain substring match, so these must exist in
//              the names as written — e.g. "haemogram", not "hemogram").
//   prefer   — name fragments, best first; a test whose name starts a word with
//              the first fragment ranks above one matching the second, etc.
//
// Keep `searches` short (each one is a network request) and `prefer` focused on
// the tests a doctor would order first.

export interface TestConcept {
  id: string;
  /** Shown to the user as "Best matches for <label>". */
  label: string;
  triggers: string[];
  searches: string[];
  prefer: string[];
  /** The concept is about urine/stool samples, so don't demote them. */
  sampleTests?: boolean;
}

export const TEST_CONCEPTS: TestConcept[] = [
  // ── Diabetes / sugar ─────────────────────────────────────────────────────
  {
    id: "glucose",
    label: "Blood Sugar (Glucose)",
    triggers: ["sugar", "blood sugar", "glucose", "sugar test", "sugar level", "glucometer", "chini", "suger",
      "সুগার", "শুগার", "রক্তে শর্করা", "শুগার টেস্ট", "शुगर", "ब्लड शुगर"],
    searches: ["glucose fasting", "glucose post prandial", "glucose random", "hba1c"],
    prefer: ["glucose fasting", "glucose post prandial", "glucose random", "hba1c", "diabetes profile mini", "gtt"],
  },
  {
    id: "glucose-fasting",
    label: "Fasting Blood Sugar",
    triggers: ["fbs", "fbg", "fasting sugar", "fasting blood sugar", "fasting glucose", "glucose fasting", "empty stomach sugar"],
    searches: ["glucose fasting", "hba1c"],
    prefer: ["glucose fasting", "glucose post prandial", "hba1c"],
  },
  {
    id: "glucose-pp",
    label: "Post Meal Blood Sugar (PP)",
    triggers: ["ppbs", "ppbg", "pp sugar", "pp", "post prandial", "postprandial", "after food sugar", "after meal sugar",
      "glucose pp", "pp glucose", "glucose post prandial"],
    searches: ["glucose post prandial", "glucose fasting"],
    prefer: ["glucose post prandial", "glucose fasting", "hba1c"],
  },
  {
    id: "glucose-random",
    label: "Random Blood Sugar",
    triggers: ["rbs", "random sugar", "random blood sugar", "random glucose", "glucose random"],
    searches: ["glucose random", "hba1c"],
    prefer: ["glucose random", "glucose fasting", "hba1c"],
  },
  {
    id: "hba1c",
    label: "HbA1c (3-month sugar average)",
    triggers: ["hba1c", "a1c", "hb a1c", "glycated", "glycosylated", "glycated hemoglobin", "glycosylated hemoglobin",
      "average sugar", "3 month sugar", "three month sugar"],
    searches: ["hba1c", "glucose fasting"],
    prefer: ["hba1c", "glucose fasting", "diabetes profile mini"],
  },
  {
    id: "diabetes",
    label: "Diabetes",
    triggers: ["diabetes", "diabetic", "diabetes test", "diabetes checkup", "madhumeh", "sugar patient",
      "ডায়াবেটিস", "ডায়াবেটিস", "मधुमेह", "डायबिटीज"],
    searches: ["hba1c", "glucose fasting", "glucose post prandial", "diabetes"],
    prefer: ["hba1c", "glucose fasting", "glucose post prandial", "diabetes profile mini", "diabetes profile maxi",
      "glucose random", "insulin fasting", "microalbumin creatinine ratio", "diabetes"],
  },
  {
    id: "gtt",
    label: "Glucose Tolerance Test (GTT)",
    triggers: ["gtt", "ogtt", "glucose tolerance", "glucose tolerance test", "pregnancy sugar", "gestational diabetes"],
    searches: ["gtt", "tolerance", "gestational"],
    prefer: ["gtt", "glucose tolerance", "gestational diabetes"],
  },
  {
    id: "insulin",
    label: "Insulin",
    triggers: ["insulin", "insulin resistance", "homa", "homa ir", "c peptide", "cpeptide"],
    searches: ["insulin", "homa", "c-peptide"],
    prefer: ["insulin fasting", "homa index", "c peptide fasting", "insulin post prandial"],
  },

  // ── Liver ────────────────────────────────────────────────────────────────
  {
    id: "lft",
    label: "Liver Function (LFT)",
    triggers: ["liver", "liver function", "liver function test", "liver test", "liver profile", "liver panel", "lft",
      "liver checkup", "liver enzymes", "লিভার", "লিভার টেস্ট", "लिवर", "लीवर"],
    searches: ["lft", "sgpt", "sgot", "bilirubin", "gamma gt"],
    prefer: ["lft liver function test 2", "lft liver function test 1", "lft", "sgpt", "sgot", "bilirubin total direct",
      "bilirubin total", "alkaline phosphatase serum", "gamma gt", "albumin serum", "fatty liver profile"],
  },
  {
    id: "sgpt",
    label: "SGPT (ALT) — liver enzyme",
    triggers: ["sgpt", "alt", "alanine", "alanine aminotransferase", "alanine transaminase", "sgpt alt"],
    searches: ["sgpt", "lft"],
    prefer: ["sgpt", "lft liver function test 2", "lft", "sgot"],
  },
  {
    id: "sgot",
    label: "SGOT (AST) — liver enzyme",
    triggers: ["sgot", "ast", "aspartate", "aspartate aminotransferase", "aspartate transaminase", "sgot ast"],
    searches: ["sgot", "lft"],
    prefer: ["sgot", "lft liver function test 2", "lft", "sgpt"],
  },
  {
    id: "jaundice",
    label: "Jaundice (Bilirubin)",
    triggers: ["jaundice", "jondis", "jondish", "piliya", "peeliya", "yellow eyes", "bilirubin", "জন্ডিস", "पीलिया"],
    searches: ["bilirubin", "lft", "sgpt"],
    prefer: ["bilirubin total direct", "bilirubin total", "bilirubin direct", "lft liver function test 2", "lft", "sgpt", "sgot"],
  },
  {
    id: "fatty-liver",
    label: "Fatty Liver",
    triggers: ["fatty liver", "fatty liver test", "nafld", "steatosis"],
    searches: ["fatty liver", "lft", "steatohepatitis"],
    prefer: ["fatty liver profile", "lft", "sgpt", "steatohepatitis", "lipid profile"],
  },
  {
    id: "alp",
    label: "Alkaline Phosphatase (ALP)",
    triggers: ["alp", "alkaline phosphatase", "alk phos"],
    searches: ["alkaline phosphatase"],
    prefer: ["alkaline phosphatase serum", "alkaline phosphatase", "lft"],
  },
  {
    id: "ggt",
    label: "Gamma GT (GGT)",
    triggers: ["ggt", "ggtp", "gamma gt", "gamma glutamyl", "gamma glutamyl transferase"],
    searches: ["gamma gt"],
    prefer: ["gamma gt", "lft"],
  },
  {
    id: "hepatitis",
    label: "Hepatitis",
    triggers: ["hepatitis", "hepatitis test", "liver infection", "viral hepatitis", "hep"],
    searches: ["hbsag", "hcv", "hav"],
    prefer: ["hbsag screening", "hcv hepatitis c virus total antibody", "hav hepatitis a virus igm", "hbsag", "hcv", "hav"],
  },
  {
    id: "hep-b",
    label: "Hepatitis B (HBsAg)",
    triggers: ["hbsag", "hepatitis b", "hep b", "hepb", "australia antigen", "hbv"],
    searches: ["hbsag", "hbv"],
    prefer: ["hbsag screening", "hbsag", "hbv"],
  },
  {
    id: "hep-c",
    label: "Hepatitis C (HCV)",
    triggers: ["hcv", "hepatitis c", "hep c", "hepc", "anti hcv"],
    searches: ["hcv"],
    prefer: ["hcv hepatitis c virus total antibody", "hcv hepatitis c virus igm", "hcv"],
  },

  // ── Kidney ───────────────────────────────────────────────────────────────
  {
    id: "kidney",
    label: "Kidney Function (KFT / RFT)",
    triggers: ["kidney", "kidney function", "kidney function test", "kidney test", "kidney profile", "kft", "rft",
      "renal", "renal function", "renal function test", "renal profile", "kidney checkup",
      "কিডনি", "কিডনি টেস্ট", "किडनी"],
    searches: ["rft", "creatinine", "urea", "uric acid"],
    prefer: ["rft", "creatinine serum", "urea serum", "uric acid serum", "gfr with creatinine above", "electrolytes serum"],
  },
  {
    id: "creatinine",
    label: "Creatinine",
    triggers: ["creatinine", "creat", "s creatinine", "serum creatinine", "egfr", "gfr"],
    searches: ["creatinine", "rft"],
    prefer: ["creatinine serum", "gfr with creatinine above", "rft", "microalbumin creatinine ratio"],
  },
  {
    id: "urea",
    label: "Urea / BUN",
    triggers: ["urea", "bun", "blood urea", "blood urea nitrogen", "serum urea"],
    searches: ["urea", "rft"],
    prefer: ["urea serum", "rft", "creatinine serum"],
  },
  {
    id: "uric-acid",
    label: "Uric Acid",
    triggers: ["uric acid", "uric", "gout", "gaut", "urate"],
    searches: ["uric acid"],
    prefer: ["uric acid serum", "uric acid", "rft"],
  },
  {
    id: "kidney-stone",
    label: "Kidney Stone",
    triggers: ["kidney stone", "stone", "stones", "pathri", "pathari", "renal stone", "calculi"],
    searches: ["uric acid", "calcium", "rft", "routine examination"],
    prefer: ["uric acid serum", "calcium serum", "rft", "routine examination profile urine", "phosphorus serum"],
  },
  {
    id: "electrolytes",
    label: "Electrolytes (Sodium, Potassium)",
    triggers: ["electrolytes", "electrolyte", "lytes", "sodium", "potassium", "chloride", "na k", "na k cl",
      "dehydration", "serum electrolytes"],
    searches: ["electrolytes", "sodium", "potassium", "chloride"],
    prefer: ["electrolytes serum", "sodium serum", "potassium serum", "chloride serum"],
  },

  // ── Blood counts / anaemia ───────────────────────────────────────────────
  {
    id: "cbc",
    label: "Complete Blood Count (CBC)",
    triggers: ["cbc", "complete blood count", "complete blood", "blood count", "cbp", "hemogram", "haemogram",
      "full blood count", "fbc", "blood test", "routine blood test", "rbc", "wbc", "tlc", "dlc", "wbc count",
      "rokto", "rakt", "khoon", "রক্ত", "রক্ত পরীক্ষা", "খুন", "खून", "खून की जांच"],
    searches: ["cbc", "haemogram", "esr"],
    prefer: ["cbc hemogram", "hemogram advanced profile 1", "hemogram advanced profile", "esr", "hemoglobin edta blood", "platelet count"],
  },
  {
    id: "hemoglobin",
    label: "Hemoglobin (Hb)",
    triggers: ["hb", "hgb", "hemoglobin", "haemoglobin", "hemoglobin test", "hb test", "low hb"],
    searches: ["hemoglobin", "cbc"],
    prefer: ["hemoglobin edta blood", "cbc hemogram", "hemogram advanced profile 1", "iron studies"],
  },
  {
    id: "anaemia",
    label: "Anaemia",
    triggers: ["anemia", "anaemia", "anemic", "blood loss", "low blood", "khoon ki kami", "rokto kom", "iron deficiency"],
    searches: ["cbc", "iron studies", "ferritin", "vitamin b12"],
    prefer: ["cbc hemogram", "hemoglobin edta blood", "iron studies", "ferritin serum", "vitamin b12 cyanocobalamin", "folic acid serum"],
  },
  {
    id: "platelets",
    label: "Platelet Count",
    triggers: ["platelet", "platelets", "platelet count", "plt", "low platelets"],
    searches: ["platelet", "cbc"],
    prefer: ["platelet count", "cbc hemogram", "dengue ns1"],
  },
  {
    id: "esr",
    label: "ESR",
    triggers: ["esr", "sed rate", "sedimentation", "erythrocyte sedimentation rate"],
    searches: ["esr"],
    prefer: ["esr erythrocyte", "hemogram advanced profile 1", "crp c reactive protein"],
  },
  {
    id: "crp",
    label: "CRP (Inflammation)",
    triggers: ["crp", "c reactive protein", "hscrp", "hs crp", "inflammation", "infection marker"],
    searches: ["crp"],
    prefer: ["crp c reactive protein", "hscrp", "esr erythrocyte"],
  },
  {
    id: "iron",
    label: "Iron & Ferritin",
    triggers: ["iron", "iron test", "iron studies", "iron profile", "ferritin", "tibc", "transferrin", "serum iron"],
    searches: ["iron", "ferritin"],
    prefer: ["iron studies", "ferritin serum", "iron serum", "cbc hemogram"],
  },
  {
    id: "blood-group",
    label: "Blood Group",
    triggers: ["blood group", "blood grouping", "blood type", "abo", "rh", "rh typing", "blood group test"],
    searches: ["blood group"],
    prefer: ["blood group abo rh typing", "blood group"],
  },
  {
    id: "coagulation",
    label: "Clotting (PT/INR)",
    triggers: ["pt", "inr", "pt inr", "prothrombin", "prothrombin time", "clotting", "blood thinner", "aptt",
      "bleeding time", "clotting time", "d dimer", "ddimer"],
    searches: ["prothrombin", "aptt", "bleeding", "dimer"],
    prefer: ["pt prothrombin time", "aptt", "bleeding clotting time", "d dimer"],
  },

  // ── Thyroid ──────────────────────────────────────────────────────────────
  {
    id: "thyroid",
    label: "Thyroid",
    triggers: ["thyroid", "thyroid test", "thyroid profile", "thyroid function", "thyroid function test", "tft",
      "t3 t4 tsh", "goiter", "goitre", "hypothyroid", "hyperthyroid", "hypothyroidism", "hyperthyroidism",
      "থাইরয়েড", "থাইরয়েড", "থাইরয়েড টেস্ট", "थायराइड"],
    searches: ["thyroid profile", "tsh", "t3", "t4"],
    prefer: ["thyroid profile 1", "thyroid profile 2", "tsh thyroid stimulating hormone ultrasensitive", "ft4", "ft3",
      "t3 total", "t4 total", "thyroid profile", "microsomal tpo antibody titre serum"],
  },
  {
    id: "tsh",
    label: "TSH",
    triggers: ["tsh", "thyroid stimulating hormone", "tsh test"],
    searches: ["tsh", "thyroid profile"],
    prefer: ["tsh thyroid stimulating hormone ultrasensitive", "thyroid profile 1", "thyroid profile"],
  },
  {
    id: "t3t4",
    label: "T3 / T4",
    triggers: ["t3", "t4", "ft3", "ft4", "free t3", "free t4", "t3 t4", "thyroxine", "triiodothyronine", "tri iodothyronine"],
    searches: ["t3", "t4", "thyroid profile"],
    prefer: ["ft4", "ft3", "t3 total", "t4 total", "thyroid profile 1"],
  },
  {
    id: "thyroid-antibody",
    label: "Thyroid Antibodies (Anti-TPO)",
    triggers: ["tpo", "anti tpo", "antitpo", "thyroid antibody", "thyroid antibodies", "hashimoto"],
    searches: ["tpo", "thyroid antibodies"],
    prefer: ["microsomal tpo antibody titre serum", "thyroid antibodies serum", "thyroid profile 1"],
  },

  // ── Heart / cholesterol ──────────────────────────────────────────────────
  {
    id: "lipid",
    label: "Cholesterol (Lipid Profile)",
    triggers: ["lipid", "lipids", "lipid profile", "lipid test", "lipid panel", "cholesterol", "cholesterol test",
      "fat test", "blood fat", "কোলেস্টেরল", "কোলেস্টরল", "कोलेस्ट्रॉल", "कोलेस्ट्रोल"],
    searches: ["lipid profile", "cholesterol", "triglycerides"],
    prefer: ["lipid profile 2 mini fasting", "lipid profile 1 maxi fasting", "lipid profile", "cholesterol total serum",
      "hdl cholesterol", "ldl cholesterol", "triglycerides serum"],
  },
  {
    id: "triglycerides",
    label: "Triglycerides",
    triggers: ["triglyceride", "triglycerides", "tg", "trigs"],
    searches: ["triglycerides", "lipid profile"],
    prefer: ["triglycerides serum", "lipid profile"],
  },
  {
    id: "hdl-ldl",
    label: "HDL / LDL Cholesterol",
    triggers: ["hdl", "ldl", "vldl", "good cholesterol", "bad cholesterol"],
    searches: ["hdl", "ldl", "lipid profile"],
    prefer: ["hdl cholesterol", "ldl cholesterol", "lipid profile"],
  },
  {
    id: "heart",
    label: "Heart Health",
    triggers: ["heart", "cardiac", "heart test", "heart checkup", "cardiac profile", "chest pain", "heart attack",
      "heart disease", "cardio", "হার্ট", "হৃদয়", "दिल", "हार्ट"],
    searches: ["lipid profile", "cardiac", "troponin", "crp"],
    prefer: ["lipid profile 2 mini fasting", "lipid profile 1 maxi fasting", "cardiac risk profile", "cardiac screen profile",
      "troponin i", "hscrp", "cpk mb", "lipid profile", "nt pro bnp", "homocysteine serum"],
  },
  {
    id: "troponin",
    label: "Troponin",
    triggers: ["troponin", "trop i", "trop t", "troponin i", "troponin t"],
    searches: ["troponin"],
    prefer: ["troponin i", "troponin t", "cardiac injury profile"],
  },
  {
    id: "cpk",
    label: "CPK / CK-MB",
    triggers: ["cpk", "ck", "ckmb", "ck mb", "cpk mb", "creatine kinase"],
    searches: ["cpk"],
    prefer: ["cpk total", "cpk mb", "cpk"],
  },
  {
    id: "bnp",
    label: "BNP (Heart failure)",
    triggers: ["bnp", "nt pro bnp", "ntprobnp", "heart failure"],
    searches: ["bnp", "heart failure"],
    prefer: ["nt pro bnp", "bnp", "heart failure profile"],
  },

  // ── Vitamins & minerals ──────────────────────────────────────────────────
  {
    id: "vitamin-d",
    label: "Vitamin D",
    triggers: ["vitamin d", "vit d", "vitd", "vitamin d3", "vit d3", "d3", "25 oh", "25 hydroxy", "sunshine vitamin"],
    searches: ["vitamin d"],
    prefer: ["vitamin d total 25 hydroxy", "vitamin d plus profile", "vitamin d gold profile", "vitamin d"],
  },
  {
    id: "vitamin-b12",
    label: "Vitamin B12",
    triggers: ["b12", "vitamin b12", "vit b12", "vitb12", "cobalamin", "cyanocobalamin"],
    searches: ["vitamin b12"],
    prefer: ["vitamin b12 cyanocobalamin", "vitamin b12 active", "homocysteine reflex b12"],
  },
  {
    id: "vitamins",
    label: "Vitamins",
    triggers: ["vitamin", "vitamins", "vitamin test", "vitamin deficiency", "multivitamin", "vit",
      "ভিটামিন", "विटामिन"],
    searches: ["vitamin d", "vitamin b12", "vitamin"],
    prefer: ["vitamin d total 25 hydroxy", "vitamin b12 cyanocobalamin", "vitamin b complex profile", "folic acid serum",
      "vitamin d plus profile", "vitamin"],
  },
  {
    id: "folate",
    label: "Folic Acid",
    triggers: ["folic", "folic acid", "folate", "b9", "vitamin b9"],
    searches: ["folic"],
    prefer: ["folic acid serum", "homocysteine reflex b12 folate"],
  },
  {
    id: "calcium",
    label: "Calcium",
    triggers: ["calcium", "calcium test", "serum calcium", "ionised calcium", "ionized calcium"],
    searches: ["calcium"],
    prefer: ["calcium serum", "calcium ionised serum", "calcium profile", "vitamin d total 25 hydroxy"],
  },
  {
    id: "bones",
    label: "Bone Health",
    triggers: ["bone", "bones", "bone health", "bone test", "osteoporosis", "back pain", "weak bones",
      "হাড়", "हड्डी"],
    searches: ["calcium", "vitamin d", "phosphorus", "alkaline phosphatase"],
    prefer: ["calcium serum", "vitamin d total 25 hydroxy", "phosphorus serum", "alkaline phosphatase serum", "calcium profile",
      "vitamin b12 cyanocobalamin"],
  },
  {
    id: "joints",
    label: "Joint Pain / Arthritis",
    triggers: ["joint pain", "joints", "arthritis", "knee pain", "rheumatoid", "ra factor", "ra", "rf", "gathiya",
      "gathia", "anti ccp", "ccp", "বাত", "গাঁটে ব্যথা", "गठिया"],
    searches: ["arthritis", "uric acid", "ccp", "crp"],
    prefer: ["ra rheumatoid arthritis factor serum", "uric acid serum", "ccp antibody", "crp c reactive protein",
      "arthritis profile", "rheumatoid arthritis profile 1", "esr erythrocyte", "ana anti nuclear antibody"],
  },
  {
    id: "magnesium-zinc",
    label: "Magnesium / Zinc",
    triggers: ["magnesium", "zinc", "phosphorus", "phosphate", "minerals"],
    searches: ["magnesium", "zinc", "phosphorus"],
    prefer: ["magnesium serum", "zinc serum", "phosphorus serum"],
  },

  // ── Fever & infections ───────────────────────────────────────────────────
  {
    id: "fever",
    label: "Fever",
    triggers: ["fever", "fever test", "viral fever", "high fever", "temperature", "bukhar", "bukhaar", "jor", "jwar", "jwor",
      "জ্বর", "বুখার", "बुखार"],
    searches: ["fever profile", "cbc", "widal", "dengue", "malaria"],
    prefer: ["fever profile mini", "fever profile maxi", "cbc hemogram", "widal test", "dengue ns1 antigen",
      "malaria parasite detection", "malarial antigen", "crp c reactive protein", "fever profile"],
  },
  {
    id: "dengue",
    label: "Dengue",
    triggers: ["dengue", "dengu", "ns1", "dengue test", "dengue ns1", "ডেঙ্গু", "डेंगू"],
    searches: ["dengue", "platelet"],
    prefer: ["dengue ns1 antigen", "dengue profile 1", "dengue igm", "dengue igg", "dengue profile", "platelet count", "cbc hemogram"],
  },
  {
    id: "malaria",
    label: "Malaria",
    triggers: ["malaria", "mp", "malaria test", "malarial", "malaria parasite", "ম্যালেরিয়া", "मलेरिया"],
    searches: ["malaria"],
    prefer: ["malaria parasite detection", "malarial antigen", "malaria profile", "cbc hemogram"],
  },
  {
    id: "typhoid",
    label: "Typhoid",
    triggers: ["typhoid", "widal", "enteric fever", "typhoid test", "typhidot", "টাইফয়েড", "टाइफाइड"],
    searches: ["typhoid", "widal"],
    prefer: ["widal test for typhoid", "typhoid profile", "cbc hemogram"],
  },
  {
    id: "chikungunya",
    label: "Chikungunya",
    triggers: ["chikungunya", "chikungunia", "chikun"],
    searches: ["chikungunya"],
    prefer: ["chikungunya igm", "chikungunya"],
  },
  {
    id: "covid",
    label: "COVID-19",
    triggers: ["covid", "covid 19", "covid19", "corona", "coronavirus", "rtpcr", "rt pcr", "sars cov 2"],
    searches: ["covid"],
    prefer: ["sars cov 2 covid 19 rna detection by rt pcr", "covid"],
  },
  {
    id: "tb",
    label: "Tuberculosis (TB)",
    triggers: ["tb", "tuberculosis", "mantoux", "afb", "koch", "tb test"],
    searches: ["mantoux", "afb smear", "tuberculosis"],
    prefer: ["mantoux tuberculin skin test", "afb smear examination", "tuberculosis"],
  },
  {
    id: "hiv",
    label: "HIV",
    triggers: ["hiv", "aids", "hiv test", "hiv 1 2"],
    searches: ["hiv"],
    prefer: ["hiv 1 2 antibody", "h3 hiv hbv hcv", "hiv"],
  },
  {
    id: "std",
    label: "Sexual Health (STD)",
    triggers: ["std", "sti", "sexual health", "vdrl", "syphilis", "rpr"],
    searches: ["vdrl", "hiv", "hbsag", "hcv"],
    prefer: ["vdrl rpr serum", "hiv 1 2 antibody", "hbsag screening", "hcv hepatitis c virus total antibody", "vdrl"],
  },
  {
    id: "h-pylori",
    label: "H. Pylori (Stomach)",
    triggers: ["h pylori", "pylori", "hpylori", "acidity", "gastritis", "stomach ulcer", "ulcer"],
    searches: ["pylori"],
    prefer: ["helicobacter pylori antigen detection stool", "helicobacter pylori igg", "helicobacter pylori"],
  },
  {
    id: "pancreas",
    label: "Pancreas (Amylase, Lipase)",
    triggers: ["amylase", "lipase", "pancreas", "pancreatitis", "pancreatic"],
    searches: ["amylase", "lipase"],
    prefer: ["amylase serum", "lipase serum"],
  },
  {
    id: "allergy",
    label: "Allergy",
    triggers: ["allergy", "allergies", "allergic", "ige", "itching", "sneezing", "rash", "eczema", "food allergy"],
    searches: ["ige total", "allergy panel", "allergy screening"],
    prefer: ["ige total antibody serum", "allergy screening panel", "allergy panel adult screening 1", "allergy panel common food", "allergy panel"],
  },
  {
    id: "lungs",
    label: "Lungs & Breathing",
    triggers: ["lung", "lungs", "breathing", "breathlessness", "asthma", "cough", "respiratory", "chest infection", "pneumonia"],
    searches: ["cbc", "crp", "asthma", "respiratory virus", "mantoux"],
    prefer: ["cbc hemogram", "crp c reactive protein", "allergy panel asthma rhinitis", "ige total antibody serum",
      "flu respiratory virus panel", "mantoux tuberculin skin test", "afb smear examination"],
  },

  // ── Urine / stool ────────────────────────────────────────────────────────
  {
    id: "urine",
    label: "Urine Test",
    triggers: ["urine", "urine test", "urine routine", "urine re", "urine rm", "urine r m", "urine examination", "urine exam",
      "uti", "urine infection", "peshab", "pesab", "prosrab", "প্রস্রাব", "ইউরিন", "पेशाब", "यूरिन"],
    searches: ["routine examination", "urine", "microalbumin"],
    prefer: ["routine examination profile urine automated", "routine examination profile urine", "culture sensitivity aerobic bacteria urine",
      "microalbumin creatinine ratio urine", "urine sugar"],
    sampleTests: true,
  },
  {
    id: "urine-culture",
    label: "Urine Culture",
    triggers: ["urine culture", "culture urine", "urine c s", "urine cs"],
    searches: ["aerobic bacteria"],
    prefer: ["culture sensitivity aerobic bacteria urine", "routine examination profile urine"],
    sampleTests: true,
  },
  {
    id: "stool",
    label: "Stool Test",
    triggers: ["stool", "stool test", "stool routine", "motion test", "potty test", "stool examination", "occult blood",
      "পায়খানা", "मल"],
    searches: ["routine examination", "occult"],
    prefer: ["routine examination profile stool", "occult blood stool", "helicobacter pylori antigen detection stool"],
    sampleTests: true,
  },

  // ── Hormones / women's & men's health ────────────────────────────────────
  {
    id: "pregnancy",
    label: "Pregnancy (Beta HCG)",
    triggers: ["pregnancy", "pregnant", "pregnancy test", "beta hcg", "bhcg", "b hcg", "hcg", "upt", "pregnency"],
    searches: ["hcg beta", "pregnancy test"],
    prefer: ["hcg beta subunit serum", "pregnancy test urine", "free beta hcg"],
  },
  {
    id: "pcos",
    label: "PCOS / PCOD",
    triggers: ["pcos", "pcod", "irregular periods", "periods", "period problem", "polycystic", "hormone test for women",
      "female hormone", "female hormones"],
    searches: ["pcos", "fsh", "prolactin", "amh"],
    prefer: ["pcos profile 1", "pcos profile", "fsh lh prolactin profile", "lh fsh ratio", "amh", "testosterone total",
      "prolactin serum", "thyroid profile 1", "insulin fasting"],
  },
  {
    id: "fertility-female",
    label: "Fertility (AMH, FSH, LH)",
    triggers: ["amh", "fertility", "infertility", "ovarian reserve", "egg reserve", "egg count", "conceive", "fsh", "lh",
      "estradiol", "e2", "progesterone"],
    searches: ["amh", "fsh", "lh", "estradiol"],
    prefer: ["amh mullerian inhibiting", "fsh follicle stimulating hormone", "lh luteinizing hormone", "fsh lh prolactin profile",
      "e2 estradiol", "progesterone serum", "prolactin serum"],
  },
  {
    id: "prolactin",
    label: "Prolactin",
    triggers: ["prolactin", "prl"],
    searches: ["prolactin"],
    prefer: ["prolactin serum", "fsh lh prolactin profile"],
  },
  {
    id: "male-health",
    label: "Testosterone",
    triggers: ["testosterone", "low t", "male hormone", "male hormones", "libido"],
    searches: ["testosterone"],
    prefer: ["total testosterone by eclia", "free testosterone", "testosterone profile", "testosterone"],
  },
  {
    id: "semen",
    label: "Semen Analysis",
    triggers: ["semen", "sperm", "sperm count", "semen analysis", "semen test", "male fertility", "male infertility"],
    searches: ["semen"],
    prefer: ["semen analysis", "sperm dna fragmentation"],
    sampleTests: true,
  },
  {
    id: "cortisol",
    label: "Cortisol (Stress hormone)",
    triggers: ["cortisol", "stress hormone", "stress"],
    searches: ["cortisol"],
    prefer: ["cortisol 8am", "cortisol random", "cortisol"],
  },

  // ── Cancer markers ───────────────────────────────────────────────────────
  {
    id: "cancer",
    label: "Cancer Screening (Tumour Markers)",
    triggers: ["cancer", "tumor", "tumour", "tumor marker", "tumour marker", "cancer marker", "cancer screening", "cancer test",
      "ক্যান্সার", "कैंसर"],
    searches: ["cancer marker", "psa", "cea", "ca 125", "afp"],
    prefer: ["total psa", "cea carcino embryonic antigen serum", "ca 125", "afp alpha feto protein serum", "cancer marker profile"],
  },
  {
    id: "psa",
    label: "PSA (Prostate)",
    triggers: ["psa", "prostate", "prostate specific antigen", "prostate test"],
    searches: ["psa"],
    prefer: ["total psa", "free psa", "psa"],
  },
  {
    id: "ca125",
    label: "CA 125",
    triggers: ["ca 125", "ca125", "ovarian cancer"],
    searches: ["ca 125"],
    prefer: ["ca 125"],
  },

  // ── Checkups ─────────────────────────────────────────────────────────────
  {
    id: "full-body",
    label: "Full Body Checkup",
    triggers: ["full body", "full body checkup", "full body test", "full checkup", "complete checkup", "whole body",
      "whole body checkup", "health checkup", "body checkup", "routine checkup", "annual checkup", "general checkup",
      "master health checkup", "preventive checkup", "health package", "package", "packages",
      "ফুল বডি", "ফুল বডি চেকআপ", "फुल बॉडी"],
    // The catalogue's packages are mostly corporate (employer/bank) bundles, so the
    // core checkup tests lead and packages follow.
    searches: ["cbc", "lft", "rft", "lipid profile", "thyroid profile", "package"],
    prefer: ["cbc hemogram", "lft liver function test 2", "rft", "lipid profile 2 mini fasting", "thyroid profile 1",
      "hba1c", "glucose fasting", "vitamin d total 25 hydroxy", "vitamin b12 cyanocobalamin", "health package", "package"],
  },
  {
    id: "weakness",
    label: "Weakness & Fatigue",
    triggers: ["weakness", "fatigue", "tired", "tiredness", "low energy", "dizziness", "giddiness", "durbolota", "kamzori",
      "দুর্বলতা", "कमजोरी"],
    searches: ["cbc", "vitamin d", "vitamin b12", "thyroid profile", "iron studies"],
    prefer: ["cbc hemogram", "vitamin d total 25 hydroxy", "vitamin b12 cyanocobalamin", "thyroid profile 1", "iron studies",
      "ferritin serum", "glucose fasting", "hba1c"],
  },
  {
    id: "hair-fall",
    label: "Hair Fall",
    triggers: ["hair fall", "hairfall", "hair loss", "hair", "baldness", "chul pora", "চুল পড়া"],
    searches: ["thyroid profile", "vitamin d", "ferritin", "vitamin b12"],
    prefer: ["thyroid profile 1", "vitamin d total 25 hydroxy", "ferritin serum", "iron studies", "vitamin b12 cyanocobalamin",
      "cbc hemogram", "zinc serum"],
  },
  {
    id: "weight",
    label: "Weight Gain / Obesity",
    triggers: ["weight gain", "weight loss", "obesity", "obese", "overweight", "weight"],
    searches: ["thyroid profile", "lipid profile", "hba1c", "insulin"],
    prefer: ["thyroid profile 1", "lipid profile 2 mini fasting", "hba1c", "insulin fasting", "cortisol 8am", "vitamin d total 25 hydroxy"],
  },
];

/** Catalogue words worth correcting typos towards, beyond the trigger words. */
export const CATALOGUE_VOCABULARY: string[] = [
  "glucose", "hemoglobin", "cholesterol", "creatinine", "bilirubin", "thyroid", "vitamin", "calcium", "ferritin",
  "platelet", "triglycerides", "prolactin", "testosterone", "estradiol", "progesterone", "cortisol", "insulin",
  "magnesium", "potassium", "sodium", "chloride", "phosphorus", "albumin", "amylase", "lipase", "troponin",
  "homocysteine", "electrolytes", "dengue", "malaria", "typhoid", "widal", "culture", "urine", "stool", "semen",
  "allergy", "hepatitis", "antibody", "antigen", "profile", "fasting", "random", "prandial", "serum", "plasma",
  "zinc", "iron", "lipid", "liver", "kidney", "function", "hormone", "sugar", "fever", "blood", "count",
  "protein", "cancer", "marker", "screening", "pregnancy", "arthritis", "rheumatoid", "uric", "acid", "urea",
  "sensitivity", "examination", "routine", "panel", "complete", "checkup", "package",
];
