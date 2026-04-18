import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://bloodlyn.app',
  'https://www.bloodlyn.app',
];

const isLovablePreview = (origin: string): boolean => {
  return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);
};

const isLocalhost = (origin: string): boolean => {
  return /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
         /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
};

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
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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

  const authCheck = await ensureAuthenticated(req, corsHeaders);
  if (authCheck) return authCheck;

  try {
    const { imageBase64, imageUrl } = await req.json();

    // -------- Validate provided image --------
    // We accept EITHER imageBase64 (legacy in-flight image) OR imageUrl pointing
    // to the user's own folder in the prescriptions bucket.
    if (imageUrl && typeof imageUrl === 'string') {
      // Re-derive userId from the JWT we just validated above.
      let userId: string | null = null;
      try {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          userId = payload?.sub ?? null;
        }
      } catch { /* ignore — we'll reject below */ }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The URL must reference the prescriptions bucket and the user's own folder.
      // Accept either signed/public URLs or storage paths.
      const okBucket = /\/storage\/v1\/object\/(public|sign)\/prescriptions\//.test(imageUrl)
        || imageUrl.startsWith('prescriptions/');
      const okFolder = imageUrl.includes(`/prescriptions/${userId}/`)
        || imageUrl.startsWith(`prescriptions/${userId}/`);

      if (!okBucket || !okFolder) {
        return new Response(
          JSON.stringify({ error: 'Image must be in your own folder of the prescriptions bucket' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // HEAD request to verify size + content-type.
      try {
        const head = await fetch(imageUrl, { method: 'HEAD' });
        if (!head.ok) {
          return new Response(
            JSON.stringify({ error: 'Could not access image' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const ct = head.headers.get('content-type') || '';
        const cl = parseInt(head.headers.get('content-length') || '0', 10);
        if (!/^image\/(jpeg|png)$/i.test(ct)) {
          return new Response(
            JSON.stringify({ error: 'Only JPEG or PNG images are accepted' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (cl > 5 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'Image too large. Maximum size is 5 MB.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Image validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_B64_BYTES = 7_000_000;
    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_B64_BYTES) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 5 MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^data:image\/(jpeg|png);/i.test(imageBase64)) {
      return new Response(
        JSON.stringify({ error: "Only JPEG or PNG images are accepted" }),
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

    const systemPrompt = `You are an expert medical prescription and lab test order analyzer with extensive knowledge of diagnostic tests across India.

Your task: Carefully read the prescription/lab order image and extract EVERY medical or diagnostic test mentioned.

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE prescription carefully - do not miss any test names
2. Look for handwritten AND printed text
3. Recognize common abbreviations and full forms
4. If handwriting is unclear, make your best interpretation and note it
5. Include ALL tests even if partially legible
6. Do NOT include medications, dosages, or instructions - ONLY diagnostic tests

COMMON TEST NAME MAPPINGS (use full names when possible):
- CBC / CBP → Complete Blood Count
- FBS / FBG → Fasting Blood Sugar
- PPBS / PPBG → Post Prandial Blood Sugar
- RBS → Random Blood Sugar
- HbA1c / A1C → Glycated Hemoglobin (HbA1c)
- TFT / Thyroid → Thyroid Function Test / Thyroid Profile
- TSH → Thyroid Stimulating Hormone
- T3, T4 → Triiodothyronine, Thyroxine
- LFT → Liver Function Test
- KFT / RFT → Kidney Function Test / Renal Function Test
- Lipid Profile → Lipid Profile
- TC / TG / HDL / LDL → Total Cholesterol, Triglycerides, HDL, LDL
- ESR → Erythrocyte Sedimentation Rate
- CRP → C-Reactive Protein
- Urine R/M / Urine RE → Urine Routine & Microscopy
- Vit D / 25 OH → Vitamin D (25-Hydroxy)
- Vit B12 → Vitamin B12
- Iron / Ferritin / TIBC → Iron Studies
- PT / INR → Prothrombin Time
- SGOT / AST → Aspartate Aminotransferase
- SGPT / ALT → Alanine Aminotransferase
- S. Creatinine → Serum Creatinine
- BUN → Blood Urea Nitrogen
- Uric Acid → Serum Uric Acid
- S. Calcium → Serum Calcium
- Electrolytes → Serum Electrolytes (Na+, K+, Cl-)
- PSA → Prostate Specific Antigen
- RA Factor / RF → Rheumatoid Factor
- ANA → Antinuclear Antibody
- Widal → Widal Test
- HBsAg → Hepatitis B Surface Antigen
- HIV → HIV 1 & 2 Antibody
- Dengue NS1 → Dengue NS1 Antigen
- MP → Malaria Parasite
- Blood Group → Blood Grouping & Rh Typing

Respond with a JSON object:
{
  "tests": [
    {
      "name": "Full standard test name",
      "shortName": "Common abbreviation",
      "category": "Blood/Thyroid/Liver/Kidney/Diabetes/Heart/Vitamin/Urine/Imaging/Infection/Hormone/Other"
    }
  ],
  "confidence": "high/medium/low",
  "notes": "Brief observations about prescription quality, doctor details if visible, any unclear text"
}

If no tests found:
{
  "tests": [],
  "confidence": "low",
  "notes": "Reason why no tests were identified"
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
                text: "Carefully analyze this medical prescription image. Extract every diagnostic/lab test name mentioned. Read handwritten text carefully. Use standard test names."
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
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

    let parsedResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
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