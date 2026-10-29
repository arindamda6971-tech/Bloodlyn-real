import { describe, it, expect } from "vitest";
import { understandQuery, rankTests, sanitizeServerTerm, intelligentSearch } from "@/utils/search-intelligence";

// Real names from the bridge catalogue (including the noise it returns).
const CATALOGUE = [
  "Canine - Glucose Fasting, Fluoride Plasma",
  "Disorders of Glucose and Insulin Homeostasis",
  "Glucose - 120 min, Fluoride Plasma",
  "Glucose Fasting, Fluoride Plasma",
  "Glucose Post Prandial, Fluoride Plasma",
  "Glucose Random, Fluoride Plasma",
  "GLUCOSE SUGAR URINE",
  "Glucose, CSF",
  "Urine Sugar Fasting",
  "Urine sugar, random",
  "HbA1c- Glycated Haemoglobin, EDTA Blood",
  "Diabetes Profile - Mini",
  "Canine - SGPT (ALT), Serum",
  "SGPT (ALT), Serum",
  "SGOT (AST), Serum",
  "Cobalt, Serum",
  "Alternaria alternata IgG Antibody, Serum",
  "LFT (Liver Function Test) 1 - Maxi",
  "LFT (Liver Function Test) 2 - Mini",
  "Autoimmune Liver Disease Profile - 1",
  "Cancer Marker Profile - Liver 1",
  "Bilirubin Total, Direct, Indirect, Serum",
  "Gamma GT (GGTP), Serum",
  "RFT ((Renal /Kidney) Function Tests) Profile - Mini",
  "Adrenal Gland Antibodies, Serum**",
  "Creatinine, Serum",
  "Creatinine, Body Fluid",
  "Uric Acid, Serum",
  "CBC Haemogram, EDTA Blood",
  "Haemogram Advanced Profile - 1 (CBC & ESR)",
  "Hemoglobin, EDTA Blood",
  "Thyroid Profile - 1",
  "Thyroid Profile - 2",
  "Cancer Marker Profile - Thyroid-DTC",
  "Hyperparathyroidism Panel",
  "TSH (Thyroid Stimulating Hormone) - Ultrasensitive, Serum",
  "FT4 (Free Thyroxine), Serum",
  "Lipid Profile - 2 (Mini : Fasting), Serum",
  "Cholesterol Total, Serum",
  "Cholesterol Total, Body Fluid",
  "APA  Phospholipid - IgA antibody, Serum",
  "Vitamin D Total - 25 Hydroxy (OH) , Serum",
  "Vitamin B12 (Cyanocobalamin), Serum",
  "Drug Allergen - Cobalamin (Vitamin B12), Serum",
  "Fever Profile - Mini",
  "Widal Test for Typhoid, Serum",
  "Dengue NS1 Antigen, Serum",
  "Dengue RNA Detection by RT-PCR, CSF",
  "Routine Examination Profile - Urine (Automated)",
  "Dexamethasone Suppression test for Cortisol - Low dose",
  "ASO Titre - Quantitative, Serum",
  "(ALDH3A2) Gene Panel by NGS, EDTA Blood**",
].map((test_name, i) => ({ id: String(i), test_name }));

const top = (query: string, n = 3) => rankTests(CATALOGUE, understandQuery(query)).slice(0, n).map((t) => t.test_name);
const all = (query: string) => rankTests(CATALOGUE, understandQuery(query)).map((t) => t.test_name);

describe("search intelligence — understanding what the user means", () => {
  it("'sugar' finds blood glucose tests first, not urine sugar", () => {
    expect(top("sugar")).toEqual([
      "Glucose Fasting, Fluoride Plasma",
      "Glucose Post Prandial, Fluoride Plasma",
      "Glucose Random, Fluoride Plasma",
    ]);
    const results = all("sugar");
    expect(results.indexOf("Urine Sugar Fasting")).toBeGreaterThan(results.indexOf("HbA1c- Glycated Haemoglobin, EDTA Blood"));
  });

  it("'sgpt' finds SGPT first and never the canine version", () => {
    expect(top("sgpt", 1)).toEqual(["SGPT (ALT), Serum"]);
    expect(all("sgpt")).not.toContain("Canine - SGPT (ALT), Serum");
  });

  it("'liver function test' finds LFT panels and SGPT/SGOT", () => {
    const results = all("liver function test");
    expect(results.slice(0, 2)).toEqual(["LFT (Liver Function Test) 2 - Mini", "LFT (Liver Function Test) 1 - Maxi"]);
    expect(results.slice(0, 5)).toEqual(expect.arrayContaining(["SGPT (ALT), Serum", "SGOT (AST), Serum"]));
  });

  it("'liver' puts the everyday liver tests above rare liver panels", () => {
    const results = all("liver");
    expect(results.indexOf("SGPT (ALT), Serum")).toBeLessThan(results.indexOf("Autoimmune Liver Disease Profile - 1"));
  });

  it("'alt' means SGPT, not Cobalt", () => {
    expect(top("alt", 1)).toEqual(["SGPT (ALT), Serum"]);
    expect(all("alt")).not.toContain("Cobalt, Serum");
  });

  it("'kidney' finds RFT and creatinine, not adrenal tests", () => {
    expect(top("kidney", 2)).toEqual(["RFT ((Renal /Kidney) Function Tests) Profile - Mini", "Creatinine, Serum"]);
    expect(all("kidney")).not.toContain("Adrenal Gland Antibodies, Serum**");
  });

  it("'complete blood count' and 'hemogram' find the CBC despite 'Haemogram' spelling", () => {
    expect(top("complete blood count", 1)).toEqual(["CBC Haemogram, EDTA Blood"]);
    expect(top("hemogram", 1)).toEqual(["CBC Haemogram, EDTA Blood"]);
  });

  it("fixes typos", () => {
    expect(understandQuery("thyorid").correctedFrom).toBe("thyorid");
    expect(top("thyorid", 1)).toEqual(["Thyroid Profile - 1"]);
    expect(top("cholestrol", 2)).toEqual(expect.arrayContaining(["Lipid Profile - 2 (Mini : Fasting), Serum", "Cholesterol Total, Serum"]));
    expect(top("liver funtion test", 1)).toEqual(["LFT (Liver Function Test) 2 - Mini"]);
  });

  it("understands half-typed words", () => {
    expect(top("thyr", 1)).toEqual(["Thyroid Profile - 1"]);
    expect(top("glucos", 1)).toEqual(["Glucose Fasting, Fluoride Plasma"]);
  });

  it("maps symptoms and everyday words", () => {
    expect(top("fever", 1)).toEqual(["Fever Profile - Mini"]);
    expect(top("bukhar", 1)).toEqual(["Fever Profile - Mini"]);
    expect(top("jaundice", 1)).toEqual(["Bilirubin Total, Direct, Indirect, Serum"]);
    expect(top("diabetes", 3)).toEqual(expect.arrayContaining(["HbA1c- Glycated Haemoglobin, EDTA Blood", "Glucose Fasting, Fluoride Plasma"]));
  });

  it("understands Bengali and Hindi script", () => {
    expect(top("সুগার", 1)).toEqual(["Glucose Fasting, Fluoride Plasma"]);
    expect(top("থাইরয়েড", 1)).toEqual(["Thyroid Profile - 1"]);
    expect(top("शुगर", 1)).toEqual(["Glucose Fasting, Fluoride Plasma"]);
  });

  it("ignores filler words like 'test' and 'price'", () => {
    expect(top("sugar test price", 1)).toEqual(["Glucose Fasting, Fluoride Plasma"]);
  });

  it("still finds exact catalogue names", () => {
    expect(top("Uric Acid, Serum", 1)).toEqual(["Uric Acid, Serum"]);
    expect(top("widal", 1)).toEqual(["Widal Test for Typhoid, Serum"]);
  });

  it("drops substring noise and demotes rare specimens and genetic tests", () => {
    expect(all("aso")).toEqual(["ASO Titre - Quantitative, Serum"]);
    const vitB12 = all("b12");
    expect(vitB12[0]).toBe("Vitamin B12 (Cyanocobalamin), Serum");
    const creat = all("creatinine");
    expect(creat.indexOf("Creatinine, Serum")).toBeLessThan(creat.indexOf("Creatinine, Body Fluid"));
  });

  it("asks the server for the concept's catalogue terms", () => {
    const u = understandQuery("sugar");
    expect(u.concepts[0].concept.id).toBe("glucose");
    expect(u.serverTerms).toEqual(expect.arrayContaining(["sugar", "glucose fasting", "hba1c"]));
    expect(understandQuery("liver function test").serverTerms).toEqual(expect.arrayContaining(["sgpt", "lft"]));
  });

  it("returns nothing for empty queries and keeps server terms safe", () => {
    expect(understandQuery("  ").serverTerms).toEqual([]);
    expect(rankTests(CATALOGUE, understandQuery(""))).toEqual([]);
    expect(sanitizeServerTerm("sgpt (alt), serum")).toBe("sgpt alt serum");
  });

  it("intelligentSearch ranks an in-memory list the same way", () => {
    const results = intelligentSearch("sugar", CATALOGUE.map((t) => ({ ...t, price: 100 })), 2);
    expect(results.map((r) => r.name)).toEqual(["Glucose Fasting, Fluoride Plasma", "Glucose Post Prandial, Fluoride Plasma"]);
  });
});
