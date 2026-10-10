import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmfqfswgnfpqeseqswhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnFmc3dnbmZwcWVzZXFzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTY2MjIsImV4cCI6MjA4MDc3MjYyMn0.p9c8cc3iJrJBPvTee3VWukA0P8LVEy2L5DyrXtVeKwQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sampleNames() {
  const { data } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", limit: "30" } },
  });

  const tests = data?.tests || [];
  console.log("=== SAMPLE TEST NAMES FROM YOUR DATABASE ===\n");
  tests.forEach((t, i) => {
    console.log(`${i+1}. ${t.test_name}`);
  });
  
  console.log("\n=== HOW TATA 1MG WOULD DISPLAY THESE ===\n");
  const examples = [
    { yours: "Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol", theirs: "HbA1c (Glycated Hemoglobin)" },
    { yours: "Glucose [Mass/volume] in Serum or Plasma --fasting", theirs: "Fasting Blood Sugar (FBS)" },
    { yours: "Cholesterol in HDL [Mass/volume] in Serum or Plasma", theirs: "HDL Cholesterol" },
    { yours: "Deprecated Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol", theirs: "HbA1c Test" },
  ];
  examples.forEach(e => {
    console.log(`YOUR DB:  ${e.yours}`);
    console.log(`TATA 1MG: ${e.theirs}`);
    console.log("");
  });
}

sampleNames().catch(console.error);
