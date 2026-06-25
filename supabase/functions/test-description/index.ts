import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://bloodlyn.app',
  'https://www.bloodlyn.app',
];

const isLovablePreview = (origin: string): boolean =>
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);

const isLocalhost = (origin: string): boolean =>
  /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

const getCorsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || isLovablePreview(origin) || isLocalhost(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0] || 'https://bloodlyn.app';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { testName } = await req.json();
    if (!testName || typeof testName !== 'string') {
      return new Response(JSON.stringify({ error: 'testName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ description: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Give a concise 2-sentence patient-friendly description of the medical lab test "${testName}". Explain what it measures and why a doctor would order it. Plain language, no markdown, no headings, no disclaimers. Maximum 45 words.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a medical writer producing concise, accurate, plain-language descriptions of clinical lab tests for patients.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error('AI gateway error', aiRes.status, text);
      return new Response(JSON.stringify({ description: '', error: 'ai_unavailable' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const description = (data?.choices?.[0]?.message?.content || '').trim();
    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('test-description error', err);
    return new Response(JSON.stringify({ description: '' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
