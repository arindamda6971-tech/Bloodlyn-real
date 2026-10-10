import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmfqfswgnfpqeseqswhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnFmc3dnbmZwcWVzZXFzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTY2MjIsImV4cCI6MjA4MDc3MjYyMn0.p9c8cc3iJrJBPvTee3VWukA0P8LVEy2L5DyrXtVeKwQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTests() {
  console.log("Fetching all 20,000 tests...");
  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", limit: "20000" } },
  });

  if (error) {
    console.error("Failed to fetch", error);
    return;
  }

  const tests = data.tests || [];
  const categories = data.categories || [];
  
  console.log(`Total tests fetched: ${tests.length}`);
  console.log(`Total categories fetched: ${categories.length}`);

  const categorySlugs = new Set(categories.map(c => c.slug));
  let categorizedCount = 0;
  let uncategorizedCount = 0;
  let invalidCategoryCount = 0;

  for (const test of tests) {
    if (!test.category || test.category.trim() === '') {
      uncategorizedCount++;
    } else if (categorySlugs.has(test.category)) {
      categorizedCount++;
    } else {
      invalidCategoryCount++;
    }
  }

  console.log(`Tests correctly inside categories: ${categorizedCount}`);
  console.log(`Tests with NO category: ${uncategorizedCount}`);
  console.log(`Tests with INVALID/DELETED category: ${invalidCategoryCount}`);
}

checkTests().catch(console.error);
