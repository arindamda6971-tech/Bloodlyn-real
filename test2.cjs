const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = env.match(/VITE_SUPABASE_URL="(.*)"/);
const supabaseKeyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const supabase = createClient(supabaseUrlMatch[1], supabaseKeyMatch[1]);
async function run() {
  const { data, error } = await supabase.from('diagnostic_centers').select('id, name, vendor_id, available_tests').limit(5);
  console.log('Diagnostic Centers:', JSON.stringify(data, null, 2));
}
run();
