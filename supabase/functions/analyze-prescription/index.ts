import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// List of allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://bloodlyn.app',
  'https://www.bloodlyn.app',
];

// Check if origin matches Lovable preview pattern
const isLovablePreview = (origin: string): boolean => {
  return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);
};

// Check if origin is localhost for development
const isLocalhost = (origin: string): boolean => {
  return /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
         /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
};

const getCorsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get('origin') || '';
  
  const isAllowed = 
    ALLOWED_ORIGINS.includes(origin) ||
    isLovablePreview(origin) ||
    isLocalhost(origin);
  
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0] || 'https://bloodlyn.app';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

// Simple runtime authentication: require Authorization header and validate the token
// against Supabase Auth to prevent anonymous access to the prescription analyzer.
const ensureAuthenticated = async (request: Request, corsHeaders: Record<string, string>) => {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  if (!SUPABASE_URL) {
    console.error('SUPABASE_URL is not configured');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate token using Supabase Auth's /user endpoint
  try {
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // token valid — return null to indicate OK
    return null;
  } catch (err) {
    console.error('Error validating auth token', err);
    return new Response(
      JSON.stringify({ error: 'Auth validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Enforce authentication at runtime (extra safety even if verify_jwt is enabled)
  const authCheck = await ensureAuthenticated(req, corsHeaders);
  if (authCheck) return authCheck;

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payload size and format
    const MAX_B64_BYTES = 7_000_000; // ~5 MB image in base64
    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_B64_BYTES) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 5 MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!imageBase64.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: "Invalid image format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a medical prescription analyzer. Analyze the prescription image and extract the names of medical tests that are recommended or prescribed.

IMPORTANT: Only extract actual medical/diagnostic test names. Do not include medications, dosages, or general instructions.

Common medical tests include:
- Blood tests: CBC, Hemoglobin, Blood Sugar, HbA1c, Lipid Profile, etc.
- Thyroid tests: T3, T4, TSH, Thyroid Profile
- Liver tests: LFT, SGOT, SGPT, Bilirubin
- Kidney tests: KFT, Creatinine, BUN, Uric Acid
- Diabetes tests: Fasting Blood Sugar, Post Prandial Blood Sugar, HbA1c
- Heart tests: ECG, Troponin, BNP
- Vitamin tests: Vitamin D, Vitamin B12, Iron, Ferritin
- Urine tests: Urine Routine, Urine Culture
- Other: X-Ray, Ultrasound, CT Scan, MRI, etc.

Respond with a JSON object in this exact format:
{
  "tests": [
    {
      "name": "Full test name",
      "shortName": "Abbreviation if any",
      "category": "Blood/Thyroid/Liver/Kidney/Diabetes/Heart/Vitamin/Urine/Imaging/Other"
    }
  ],
  "confidence": "high/medium/low",
  "notes": "Any relevant observations about the prescription"
}

If you cannot identify any tests or the image is not a valid prescription, respond with:
{
  "tests": [],
  "confidence": "low",
  "notes": "Explanation of why no tests were found"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this prescription image and extract all medical test names that are prescribed or recommended."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to analyze prescription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the AI response - try to extract JSON
    let parsedResult;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response");
      // Return a structured error with generic message
      parsedResult = {
        tests: [],
        confidence: "low",
        notes: "Could not parse prescription. Please ensure the image is clear and contains medical test recommendations."
      };
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-prescription:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze prescription. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
