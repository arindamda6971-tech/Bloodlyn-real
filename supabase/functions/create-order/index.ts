import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
  familyMemberId?: string;
  packageId?: string;
  category?: string;
  labId?: string;
  labName?: string;
  vendorId?: string;
}

interface CreateOrderRequest {
  cartItems: OrderItemInput[];
  addressId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  couponCode: string | null;
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  labId?: string | null;
  labName?: string | null;
  vendorId?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // ---------------- Zod validation ----------------
    // Items use one of: a UUID id (real test/package/product), OR a synthetic
    // prefixed id (ecg-, ai-, dc-, reorder-) for special flows.
    const SYNTHETIC_PREFIX = /^(ecg|ai|dc|reorder|pkg|bridge|lifecare|doc|physio|bp)-/i;
    const UUID = z.string().uuid();
    // Composite IDs like `{uuid}-{labSlug}` (used by PackageDetailScreen) start with a UUID.
    const UUID_PREFIXED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-.+)?$/i;
    const ItemIdSchema = z.string().min(1).max(120).refine(
      (v) => SYNTHETIC_PREFIX.test(v) || UUID.safeParse(v).success || UUID_PREFIXED.test(v),
      { message: "Item id must be a UUID or a recognized synthetic id" },
    );

    const CartItemSchema = z.object({
      id: ItemIdSchema,
      name: z.preprocess(
        (v) => (v == null || v === "" ? "Test" : v),
        z.string().trim().min(1).max(200),
      ),
      price: z.number().min(0).max(100_000),
      quantity: z.number().int().min(1).max(10),
      familyMemberId: z.string().uuid().nullable().optional(),
      packageId: z.string().uuid().nullable().optional(),
      category: z.string().max(50).nullable().optional(),
      labId: z.string().uuid().nullable().optional(),
      labName: z.string().max(200).nullable().optional(),
      vendorId: z.string().uuid().nullable().optional(),
    });

    const RequestSchema = z.object({
      cartItems: z.array(CartItemSchema).min(1).max(50),
      addressId: z.string().uuid().nullable().optional(),
      scheduledDate: z.string().max(40).nullable().optional(),
      scheduledTimeSlot: z.string().max(80).nullable().optional(),
      subtotal: z.number().min(0).max(1_000_000).optional(),
      discount: z.number().min(0).max(1_000_000).optional(),
      total: z.number().min(0).max(1_000_000).optional(),
      paymentMethod: z.enum(["cod", "upi", "card", "netbanking", "wallet", "online"]).nullable().optional(),
      couponCode: z.string().trim().max(30).nullable().optional(),
      patientName: z.string().trim().max(120).optional(),
      patientAge: z.union([z.number().int().min(0).max(120), z.string().max(4)]).nullable().optional(),
      patientGender: z.string().max(20).nullable().optional(),
      patientPhone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").nullable().optional(),
      labId: z.string().uuid().nullable().optional(),
      labName: z.string().max(200).nullable().optional(),
      vendorId: z.string().uuid().nullable().optional(),
    });

    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = parsed.data as CreateOrderRequest;
    const { cartItems, addressId, scheduledDate, scheduledTimeSlot, discount, paymentMethod, couponCode, patientName, patientAge, patientGender, patientPhone, labId, labName, vendorId } = body;

    // Server-side price validation: fetch actual prices from DB
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const idempotencyKey = req.headers.get("Idempotency-Key") ?? req.headers.get("idempotency-key");

    if (idempotencyKey) {
      const { data: existingAttempt } = await adminClient
        .from("subscription_purchase_attempts")
        .select("response")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .not("response", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAttempt?.response) {
        return new Response(JSON.stringify(existingAttempt.response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const regularItemIds = cartItems
      .filter((i) => !i.id.startsWith("ecg-") && !i.id.startsWith("ai-") && !i.id.startsWith("dc-") && !i.id.startsWith("reorder-") && !i.id.startsWith("doc-") && !i.id.startsWith("physio-") && !i.id.startsWith("bp-"))
      .map((i) => i.id);

    const priceMap: Record<string, number> = {};
    const knownTestIds = new Set<string>();
    const knownPackageIds = new Set<string>();
    const productTestIdMap: Record<string, string | null> = {};

    if (regularItemIds.length > 0) {
      const { data: tests } = await adminClient
        .from("tests")
        .select("id, price")
        .in("id", regularItemIds);

      if (tests) {
        for (const t of tests) {
          knownTestIds.add(t.id);
          priceMap[t.id] = Number(t.price);
        }
      }

      const { data: packages } = await adminClient
        .from("test_packages")
        .select("id, price")
        .in("id", regularItemIds);

      if (packages) {
        for (const p of packages) {
          knownPackageIds.add(p.id);
          priceMap[p.id] = Number(p.price);
        }
      }

      const unresolvedItemIds = regularItemIds.filter((id) => priceMap[id] === undefined);
      if (unresolvedItemIds.length > 0) {
        const { data: products } = await adminClient
          .from("products")
          .select("id, price, test_id")
          .in("id", unresolvedItemIds)
          .eq("availability", true);

        if (products) {
          for (const product of products) {
            priceMap[product.id] = Number(product.price);
            productTestIdMap[product.id] = product.test_id || null;
          }
        }
      }
    }

    // Server-side pricing for ECG items: look up from diagnostic_centers
    const ecgItems = cartItems.filter((i) => i.id.startsWith("ecg-"));
    if (ecgItems.length > 0) {
      // ECG item IDs follow pattern: ecg-{labId}-{doctorId} or ecg-{doctorId}
      const labIds = ecgItems
        .map((i) => {
          const parts = i.id.replace("ecg-", "").split("-");
          // If 2+ UUID-length parts, first is labId
          return parts.length >= 2 ? parts[0] : null;
        })
        .filter(Boolean) as string[];

      if (labIds.length > 0) {
        const { data: centers } = await adminClient
          .from("diagnostic_centers")
          .select("id, ecg_price")
          .in("id", labIds);

        if (centers) {
          for (const c of centers) {
            if (c.ecg_price != null) {
              // Map all ECG items from this lab to the lab's ecg_price
              for (const item of ecgItems) {
                if (item.id.includes(c.id)) {
                  priceMap[item.id] = Number(c.ecg_price);
                }
              }
            }
          }
        }
      }
    }

    // Server-side pricing for BP Home Check items (bp-{labId})
    const bpItems = cartItems.filter((i) => i.id.startsWith("bp-"));
    if (bpItems.length > 0) {
      const bpLabIds = [
        ...new Set(
          bpItems
            .map((i) => {
              const rest = i.id.replace(/^bp-/, "");
              // rest may be `{uuid}` or `{uuid}-suffix`
              const parts = rest.split("-");
              return parts.length >= 5 ? parts.slice(0, 5).join("-") : null;
            })
            .filter(Boolean),
        ),
      ] as string[];

      if (bpLabIds.length > 0) {
        const { data: bpCenters } = await adminClient
          .from("diagnostic_centers")
          .select("id, home_bp_price, offers_home_bp")
          .in("id", bpLabIds);

        if (bpCenters) {
          for (const c of bpCenters) {
            if (c.offers_home_bp !== true) continue;
            for (const item of bpItems) {
              if (item.id.includes(c.id) && c.home_bp_price != null) {
                priceMap[item.id] = Number(c.home_bp_price);
              }
            }
          }
        }
      }
    }

    // Server-side pricing for diagnostic center tests (dc-{labId}-{index})
    const dcItems = cartItems.filter((i) => i.id.startsWith("dc-"));
    if (dcItems.length > 0) {
      // Extract unique lab IDs from dc items
      const dcLabIds = [...new Set(dcItems.map((i) => {
        const parts = i.id.replace("dc-", "").split("-");
        // Format: dc-{uuid}-{index}, reconstruct the UUID (5 parts)
        if (parts.length >= 5) {
          return parts.slice(0, 5).join("-");
        }
        return null;
      }).filter(Boolean))] as string[];

      if (dcLabIds.length > 0) {
        const { data: dcCenters } = await adminClient
          .from("diagnostic_centers")
          .select("id, pricing")
          .in("id", dcLabIds);

        if (dcCenters) {
          for (const center of dcCenters) {
            const pricing = center.pricing as Record<string, number> | null;
            if (pricing) {
              // Map dc items from this center to their prices
              for (const item of dcItems) {
                if (item.id.includes(center.id)) {
                  // Look up price by test name
                  const testPrice = pricing[item.name];
                  if (testPrice != null) {
                    priceMap[item.id] = Number(testPrice);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Fallback pricing for persisted cart rows that lost synthetic IDs (e.g., dc-* IDs)
    const unresolvedLabItems = cartItems.filter((item) =>
      priceMap[item.id] === undefined &&
      !item.id.startsWith("ai-") &&
      !item.id.startsWith("ecg-") &&
      item.labId &&
      item.name
    );

    if (unresolvedLabItems.length > 0) {
      const unresolvedLabIds = [...new Set(unresolvedLabItems.map((item) => item.labId).filter(Boolean))] as string[];
      const { data: unresolvedCenters } = await adminClient
        .from("diagnostic_centers")
        .select("id, pricing")
        .in("id", unresolvedLabIds);

      if (unresolvedCenters) {
        for (const center of unresolvedCenters) {
          const pricing = center.pricing as Record<string, number> | null;
          if (!pricing) continue;

          for (const item of unresolvedLabItems) {
            if (item.labId === center.id) {
              const resolvedPrice = pricing[item.name];
              if (resolvedPrice != null) {
                priceMap[item.id] = Number(resolvedPrice);
              }
            }
          }
        }
      }
    }

    // Server-side pricing for AI-recommended tests (from prescription analysis)
    // These have fixed category-based pricing maintained server-side
    const AI_TEST_PRICES: Record<string, number> = {
      "Blood": 299, "Thyroid": 399, "Liver": 449, "Kidney": 499,
      "Diabetes": 199, "Heart": 599, "Vitamin": 549, "Urine": 149,
      "Imaging": 999, "Other": 399,
    };

    // Log received cart items for debugging
    console.log("Cart items received:", JSON.stringify(cartItems.map((i: OrderItemInput) => ({ id: i.id, name: i.name, price: i.price, labId: i.labId }))));
    console.log("Price map resolved:", JSON.stringify(priceMap));

    // Validate and compute server-side subtotal
    let serverSubtotal = 0;
    for (const item of cartItems) {
      const serverPrice = priceMap[item.id];
      if (serverPrice !== undefined) {
        serverSubtotal += serverPrice * item.quantity;
      } else if (item.id.startsWith("ai-")) {
        // AI-recommended tests: look up price by category, ignoring client-supplied price
        const category = item.category || "Other";
        const validCategory = AI_TEST_PRICES[category] !== undefined ? category : "Other";
        const aiPrice = AI_TEST_PRICES[validCategory];
        serverSubtotal += aiPrice * item.quantity;
      } else if (item.id.startsWith("dc-") || item.id.startsWith("doc-") || item.id.startsWith("physio-") || item.id.startsWith("bp-")) {
        // Service / DC item without server pricing: trust client price (validated by Zod max=100k)
        // For bp- items we prefer the lab's server-side home_bp_price when a lab is attached.
        console.warn(`Service/DC item ${item.id} (${item.name}) using client price: ${item.price}`);
        priceMap[item.id] = item.price;
        serverSubtotal += item.price * item.quantity;
      } else if (item.id.startsWith("ecg-") && priceMap[item.id] === undefined) {
        // ECG item with no lab price found - reject
        return new Response(
          JSON.stringify({ error: "Could not verify ECG test pricing. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (item.labId && item.name) {
        // Item with labId but not resolved - likely a diagnostic center test with non-dc prefix
        // Fall back to client price with warning
        console.warn(`Unresolved lab item ${item.id} (${item.name}) from lab ${item.labId}, using client price: ${item.price}`);
        priceMap[item.id] = item.price;
        serverSubtotal += item.price * item.quantity;
      } else {
        // Unknown item type - reject with details for debugging
        console.error(`Unknown item rejected: id=${item.id}, name=${item.name}, price=${item.price}, labId=${item.labId}`);
        return new Response(
          JSON.stringify({ error: `Unknown item in order: ${item.id}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate coupon server-side
    let serverDiscount = 0;
    if (couponCode && couponCode.toUpperCase() === "HEALTH100") {
      serverDiscount = 100;
    }

    const serverTotal = Math.max(0, serverSubtotal - serverDiscount);

    // Accept all payment methods from the client
    // In production, online methods would be verified via a payment gateway callback

    const paymentStatus = "completed";
    const orderStatus = "confirmed";

    // Fetch latest prescription URL for this user (if any)
    let prescriptionUrl: string | null = null;
    const { data: prescriptionData } = await adminClient
      .from("user_prescriptions")
      .select("image_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prescriptionData?.image_url) {
      prescriptionUrl = prescriptionData.image_url;
    }

    // Build special instructions
    let specialInstructions: string | null = null;
    const parts: string[] = [];
    if (patientName) {
      parts.push(`Patient: ${patientName} (Age: ${patientAge ?? "N/A"}${patientGender ? `, Gender: ${patientGender}` : ""}${patientPhone ? `, Phone: ${patientPhone}` : ""})`);
    }
    if (prescriptionUrl) {
      parts.push(`Prescription: ${prescriptionUrl}`);
    }
    if (parts.length > 0) {
      specialInstructions = parts.join(" | ");
    }

    // Extract vendor_id from cart items or request body
    // If a diagnostic center is selected, look up its vendor_id
    let orderVendorId = vendorId || null;
    const firstLabId = labId || cartItems[0]?.labId;
    
    // Only query diagnostic_centers if firstLabId is a valid UUID
    // "doctor-service", "physio-service" etc will cause a Postgres UUID casting error otherwise
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!orderVendorId && firstLabId && UUID_REGEX.test(firstLabId)) {
      const { data: centerData } = await adminClient
        .from("diagnostic_centers")
        .select("vendor_id")
        .eq("id", firstLabId)
        .single();
      
      if (centerData?.vendor_id) {
        orderVendorId = centerData.vendor_id;
      }
    }

    // ---------------- Server-side duplicate-order guard ----------------
    // Even if the client retries (network glitch, double-click, StrictMode,
    // a stray duplicate invocation), do not insert a second order row when
    // an identical booking already exists within the last 60 seconds.
    // This is independent of the idempotency key above and acts as a
    // belt-and-braces safeguard against duplicates like the ones seen in prod.
    try {
      const since = new Date(Date.now() - 60_000).toISOString();
      let dedupQuery = adminClient
        .from("orders")
        .select("id, order_number")
        .eq("user_id", userId)
        .eq("total", serverTotal)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);

      if (orderVendorId) dedupQuery = dedupQuery.eq("vendor_id", orderVendorId);
      if (scheduledDate) dedupQuery = dedupQuery.eq("scheduled_date", scheduledDate);
      if (scheduledTimeSlot) dedupQuery = dedupQuery.eq("scheduled_time_slot", scheduledTimeSlot);

      const { data: existingOrder } = await dedupQuery.maybeSingle();
      if (existingOrder?.id) {
        const dedupResponse = {
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          total: serverTotal,
          paymentStatus,
          status: orderStatus,
          deduplicated: true,
        };
        if (idempotencyKey) {
          await adminClient.from("subscription_purchase_attempts").insert({
            user_id: userId,
            idempotency_key: idempotencyKey,
            response: dedupResponse,
          });
        }
        return new Response(JSON.stringify(dedupResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (dedupErr) {
      // Never block a real order on the de-dup probe failing.
      console.warn("Duplicate-order probe failed (non-fatal):", dedupErr);
    }

    // Doctor visibility gate — before we ever create an order for a doctor
    // consultation, re-verify against the partner's approved+active directory.
    // Prevents booking against a doctor that admin has just deleted / suspended
    // even if the client had a stale list cached.
    try {
      const doctorItem = cartItems.find((i) =>
        /^doc-(video-|audio-)?[0-9a-zA-Z_-]+/.test(i.id)
      );
      if (doctorItem) {
        const raw = doctorItem.id.replace(/^doc-/, "");
        let doctorIdRaw = raw;
        if (raw.startsWith("video-")) doctorIdRaw = raw.slice(6);
        else if (raw.startsWith("audio-")) doctorIdRaw = raw.slice(6);

        const partnerSecret = Deno.env.get("DOCTOR_APPOINTMENT_WEBHOOK_SECRET");
        if (partnerSecret) {
          const dirRes = await fetch(
            `https://titjcfklrmytppvsoavv.supabase.co/functions/v1/doctor-directory?status=approved&is_active=true&vendor_type=doctor&doctor_id=${encodeURIComponent(doctorIdRaw)}`,
            { headers: { "x-webhook-secret": partnerSecret } },
          );
          if (dirRes.ok) {
            const body = await dirRes.json().catch(() => null);
            const list = Array.isArray(body)
              ? body
              : Array.isArray(body?.doctors) ? body.doctors : [];
            const match = list.find((d: any) =>
              String(d.id ?? d.doctor_id ?? d.user_id) === String(doctorIdRaw),
            );
            const status = String(match?.verification_status ?? match?.status ?? "").toLowerCase();
            const active = match?.is_active !== false && match?.active !== false;
            const approved = match && (status === "approved" || status === "verified" || status === "");
            if (!match || !approved || !active) {
              return new Response(
                JSON.stringify({
                  error: "This doctor is no longer available for booking.",
                  code: "vendor_not_approved",
                  doctor_id: doctorIdRaw,
                }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          } else if (dirRes.status === 403) {
            // Partner explicitly rejected — surface uniformly to the client.
            return new Response(
              JSON.stringify({
                error: "This doctor is no longer available for booking.",
                code: "vendor_not_approved",
                doctor_id: doctorIdRaw,
              }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          // If the directory call itself fails (network/upstream down), fall through
          // rather than blocking every booking — partner webhook will still re-check.
        }
      }
    } catch (verifyErr) {
      console.error("Doctor pre-booking verification error (non-fatal):", verifyErr);
    }

    // Create order using service role (bypasses RLS for insert).

    // The `client_idempotency_key` column has a partial UNIQUE index on
    // (user_id, client_idempotency_key) — if the same checkout retries
    // (double-tap, StrictMode, network retry), Postgres rejects the
    // duplicate with code 23505 and we return the existing order.
    const { data: orderData, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: userId,
        address_id: addressId || null,
        scheduled_date: scheduledDate || null,
        scheduled_time_slot: scheduledTimeSlot || null,
        subtotal: serverSubtotal,
        discount: serverDiscount,
        total: serverTotal,
        payment_method: paymentMethod || null,
        status: orderStatus,
        payment_status: paymentStatus,
        coupon_code: couponCode || null,
        special_instructions: specialInstructions,
        vendor_id: orderVendorId,
        lab_name: labName || cartItems[0]?.labName || null,
        test_name: cartItems.map(item => item.name).join(", "),
        client_idempotency_key: idempotencyKey || null,
      })
      .select()
      .single();

    if (orderError) {
      // Postgres unique-violation → another request with the same idempotency key
      // already created the order. Return that existing order instead of erroring.
      if ((orderError as { code?: string }).code === "23505" && idempotencyKey) {
        const { data: existing } = await adminClient
          .from("orders")
          .select("id, order_number, total, payment_status, status")
          .eq("user_id", userId)
          .eq("client_idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existing?.id) {
          return new Response(
            JSON.stringify({
              orderId: existing.id,
              orderNumber: existing.order_number,
              total: Number(existing.total),
              paymentStatus: existing.payment_status,
              status: existing.status,
              deduplicated: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items with server-validated prices
    const orderItems = cartItems.map((item) => {
      const isSpecialItem = item.id.startsWith("ecg-") || item.id.startsWith("ai-") || item.id.startsWith("dc-") || item.id.startsWith("reorder-") || item.id.startsWith("doc-") || item.id.startsWith("physio-") || item.id.startsWith("bp-");
      const isPackageItem = knownPackageIds.has(item.id);
      const mappedProductTestId = productTestIdMap[item.id];

      // Only set test_id if the ID actually exists in the tests table
      // mappedProductTestId comes from products.test_id but may reference a non-existent test
      const resolvedTestId = isSpecialItem
        ? null
        : (mappedProductTestId && knownTestIds.has(mappedProductTestId))
          ? mappedProductTestId
          : isPackageItem
            ? null
            : knownTestIds.has(item.id)
              ? item.id
              : null;

      // Also only set package_id if it exists in known packages
      const isKnownPackage = knownPackageIds.has(item.packageId || "") || knownPackageIds.has(item.id);

      const resolvedPackageId = isPackageItem
        ? (item.packageId || item.id)
        : (item.packageId || null);

      return {
        order_id: orderData.id,
        test_id: resolvedTestId,
        package_id: resolvedPackageId,
        quantity: item.quantity,
        price: priceMap[item.id] !== undefined
          ? priceMap[item.id]
          : item.id.startsWith("ai-")
            ? AI_TEST_PRICES[AI_TEST_PRICES[item.category || "Other"] !== undefined ? (item.category || "Other") : "Other"]
            : item.price,
        family_member_id: item.familyMemberId || null,
      };
    });

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // Cleanup: delete the order
      await adminClient.from("orders").delete().eq("id", orderData.id);
      return new Response(
        JSON.stringify({ error: "Failed to create order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify partner hub if vendor is assigned (replaces pg_net trigger)
    if (orderVendorId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const webhookPayload = {
          type: "INSERT",
          table: "orders",
          schema: "public",
          record: orderData,
          old_record: null,
        };
        // Fire-and-forget: don't block order response on webhook
        fetch(`${supabaseUrl}/functions/v1/partner-hub-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(webhookPayload),
        }).catch((e) => console.error("Partner webhook fire-and-forget error:", e));
      } catch (e) {
        console.error("Partner notification error (non-blocking):", e);
      }
    }

    // Doctor-consultation webhook — mirror booking to Partner project.
    // Detects cart items whose id matches doc-video-{doctorId}, doc-audio-{doctorId},
    // or doc-{doctorId}. Fire-and-forget; never blocks the order response.
    try {
      const doctorItem = cartItems.find((i) =>
        /^doc-(video-|audio-)?[0-9a-zA-Z_-]+/.test(i.id)
      );
      const doctorWebhookSecret = Deno.env.get("DOCTOR_APPOINTMENT_WEBHOOK_SECRET");

      if (doctorItem && doctorWebhookSecret) {
        const raw = doctorItem.id.replace(/^doc-/, "");
        let mode: "video" | "audio" | "in_clinic" = "in_clinic";
        let doctorIdRaw = raw;
        if (raw.startsWith("video-")) { mode = "video"; doctorIdRaw = raw.slice(6); }
        else if (raw.startsWith("audio-")) { mode = "audio"; doctorIdRaw = raw.slice(6); }

        let formattedTime = "10:00";
        if (scheduledTimeSlot) {
          const match = scheduledTimeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            let hour = parseInt(match[1], 10);
            const minute = match[2];
            const ampm = match[3].toUpperCase();
            if (ampm === "PM" && hour < 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
            formattedTime = `${hour.toString().padStart(2, "0")}:${minute}`;
          }
        }
        const scheduledAt = scheduledDate
          ? `${scheduledDate}T${formattedTime}:00+05:30`
          : null;

        // Fetch patient email for the webhook
        let patientEmail: string | null = null;
        try {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();
          patientEmail = profile?.email ?? null;
        } catch (_) { /* non-fatal */ }

        const payload = {
          external_booking_id: orderData.id,
          doctor_id: doctorIdRaw,
          patient_user_id: userId,
          patient_name: patientName ?? null,
          patient_phone: patientPhone ?? null,
          patient_email: patientEmail,
          patient_age: patientAge ?? null,
          patient_gender: patientGender ?? null,
          scheduled_at: scheduledAt,
          mode,
          fee: serverTotal,
          symptoms: specialInstructions,
        };

        fetch("https://titjcfklrmytppvsoavv.supabase.co/functions/v1/doctor-appointment-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": doctorWebhookSecret,
          },
          body: JSON.stringify(payload),
        }).catch((e) => console.error("Doctor appointment webhook error (non-blocking):", e));
      }
    } catch (e) {
      console.error("Doctor webhook dispatch error (non-blocking):", e);
    }


    const responsePayload = {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      total: serverTotal,
      paymentStatus,
      status: orderStatus,
    };

    if (idempotencyKey) {
      await adminClient.from("subscription_purchase_attempts").insert({
        user_id: userId,
        idempotency_key: idempotencyKey,
        response: responsePayload,
      });
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
