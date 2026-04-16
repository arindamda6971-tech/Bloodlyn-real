import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Parse request body
    const body: CreateOrderRequest = await req.json();
    const { cartItems, addressId, scheduledDate, scheduledTimeSlot, discount, paymentMethod, couponCode, patientName, patientAge, patientGender, patientPhone, labId, labName, vendorId } = body;

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items in order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side price validation: fetch actual prices from DB
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const regularItemIds = cartItems
      .filter((i) => !i.id.startsWith("ecg-") && !i.id.startsWith("ai-") && !i.id.startsWith("dc-") && !i.id.startsWith("reorder-"))
      .map((i) => i.id);

    let priceMap: Record<string, number> = {};
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
      } else if (item.id.startsWith("dc-")) {
        // DC item without price found in database - use client price but log warning
        console.warn(`DC item ${item.id} (${item.name}) not found in pricing, using client price: ${item.price}`);
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
    
    if (!orderVendorId && firstLabId) {
      const { data: centerData } = await adminClient
        .from("diagnostic_centers")
        .select("vendor_id")
        .eq("id", firstLabId)
        .single();
      
      if (centerData?.vendor_id) {
        orderVendorId = centerData.vendor_id;
      }
    }

    // Create order using service role (bypasses RLS for insert)
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
        test_name: cartItems.length === 1 ? cartItems[0].name : `${cartItems.length} tests`,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items with server-validated prices
    const orderItems = cartItems.map((item) => {
      const isSpecialItem = item.id.startsWith("ecg-") || item.id.startsWith("ai-") || item.id.startsWith("dc-");
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

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        total: serverTotal,
        paymentStatus,
        status: orderStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
