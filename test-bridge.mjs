import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmfqfswgnfpqeseqswhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnFmc3dnbmZwcWVzZXFzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTY2MjIsImV4cCI6MjA4MDc3MjYyMn0.p9c8cc3iJrJBPvTee3VWukA0P8LVEy2L5DyrXtVeKwQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBridge() {
  console.log("Testing limit=5");
  const { data: data1, error: err1 } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", limit: "5" } },
  });
  console.log("Limit 5 tests count:", data1?.tests?.length);
  console.log("Categories length:", data1?.categories?.length);

  console.log("Testing search=blood");
  const { data: data2, error: err2 } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", search: "blood", limit: "5" } },
  });
  console.log("Search tests count:", data2?.tests?.length);
  if (data2?.tests?.length > 0) console.log("First test:", data2.tests[0].test_name);

  console.log("Testing q=blood");
  const { data: data3, error: err3 } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", q: "blood", limit: "5" } },
  });
  console.log("Q tests count:", data3?.tests?.length);
  if (data3?.tests?.length > 0) console.log("First test:", data3.tests[0].test_name);
  
  console.log("Testing limit=0");
  const { data: data4, error: err4 } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", limit: "0" } },
  });
  console.log("Limit 0 tests count:", data4?.tests?.length);
  console.log("Categories length:", data4?.categories?.length);
}

testBridge().catch(console.error);
