import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmfqfswgnfpqeseqswhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnFmc3dnbmZwcWVzZXFzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTY2MjIsImV4cCI6MjA4MDc3MjYyMn0.p9c8cc3iJrJBPvTee3VWukA0P8LVEy2L5DyrXtVeKwQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBridge() {
  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: { status: "active", limit: "1" } },
  });
  console.log("Category example:", JSON.stringify(data?.categories?.[0], null, 2));
}

testBridge().catch(console.error);
