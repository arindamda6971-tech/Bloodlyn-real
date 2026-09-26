import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/utils/haptics";
import { useHaptics } from "@/hooks/useHaptics";
import { toast } from "sonner";
import { Analytics } from "@/lib/analytics";
import { getCommonSpecializedDays, normalizeAvailabilityType, normalizeAvailableDays } from "@/lib/test-availability";

interface CartItem {
  id: string;
  name: string;
  price: number;
  labId?: string;
  labName?: string;
  vendorId?: string;
  quantity: number;
  familyMemberId?: string;
  category?: string;
  kind?: "test" | "package";
  availabilityType?: "GENERAL" | "SPECIALIZED";
  availableDays?: string[];
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingRequired?: boolean;
  fastingInstruction?: string;
  reportType?: string;
}


interface PendingItem {
  item: Omit<CartItem, "quantity">;
  existingLabName: string;
}

// Temporary type to bypass missing schema definitions safely
type CartItemDBRow = {
  id: string;
  user_id: string;
  test_id: string | null;
  package_id: string | null;
  test_name: string | null;
  price: number | null;
  lab_id: string | null;
  lab_name: string | null;
  vendor_id?: string | null;
  quantity: number | null;
  family_member_id: string | null;
  created_at?: string;
  availability_type?: string | null;
  available_days?: string[] | null;
  sample_type?: string | null;
  preparation_required?: boolean | null;
  preparation_instruction?: string | null;
  fasting_required?: boolean | null;
  fasting_instruction?: string | null;
  report_type?: string | null;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateFamilyMember: (id: string, familyMemberId: string | undefined) => void;
  updateLabForItems: (labId: string, labName: string, itemPrices?: Record<string, number>) => void;
  clearCart: () => void;
  replaceCart: (newItems: Omit<CartItem, "quantity">[]) => void;
  itemCount: number;
  subtotal: number;
  currentLabId: string | null;
  currentLabName: string | null;
  pendingItem: PendingItem | null;
  confirmReplace: (callback?: () => void) => void;
  cancelReplace: () => void;
  isLoading: boolean;
  validateFamilyMember: (activeMemberIds: string[]) => void;
  hasItem: (testId: string, testName?: string) => boolean;
}

const LOCAL_STORAGE_KEY = "BloodLyn_cart_items";

const getLocalCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const setLocalCart = (cartItems: CartItem[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    // Ignore storage write failures
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { impactMedium, notificationSuccess, impactLight } = useHaptics();
  const [items, setItems] = useState<CartItem[]>(getLocalCart);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);
  const pendingSyncItems = useRef<CartItem[] | null>(null);

  // Load cart from Supabase or fallback to localStorage
  const loadCartFromSupabase = useCallback(async () => {
    if (!user) {
      // For non-logged-in users, keep existing localStorage items
      const local = getLocalCart();
      setItems(local);
      setIsLoading(false);
      isInitialized.current = true;
      return;
    }

    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading cart:", error);
        toast.error("Failed to load your cart. Please try refreshing.");
      } else if (data && data.length > 0) {
        // Filter out stale items older than 24 hours to prevent unwanted items
        const now = Date.now();
        const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
        const freshData = data.filter((item: CartItemDBRow) => {
          if (item.created_at) {
            const age = now - new Date(item.created_at).getTime();
            return age < MAX_AGE_MS;
          }
          return true; // keep items without created_at for safety
        });

        // Delete stale items from DB
        const staleIds = data.filter(d => !freshData.includes(d)).map(d => d.id);
        if (staleIds.length > 0) {
          await supabase.from("cart_items").delete().in("id", staleIds);
        }

        const cartItems: CartItem[] = freshData
          .filter((item: CartItemDBRow) => item.test_name && item.test_name.trim() !== "" && (Number(item.price) || 0) > 0)
          .map((item: CartItemDBRow) => ({
            id: item.package_id || item.test_id || item.id,
            name: item.test_name!,
            price: Number(item.price) || 0,
            labId: item.lab_id || undefined,
            labName: item.lab_name || undefined,
            vendorId: item.vendor_id || undefined,
            quantity: item.quantity || 1,
            familyMemberId: item.family_member_id || undefined,
            kind: item.package_id ? "package" : item.test_id ? "test" : undefined,
            availabilityType: normalizeAvailabilityType(item.availability_type),
            availableDays: item.available_days || undefined,
            sampleType: item.sample_type || undefined,
            preparationRequired: item.preparation_required || undefined,
            preparationInstruction: item.preparation_instruction || undefined,
            fastingRequired: item.fasting_required || undefined,
            fastingInstruction: item.fasting_instruction || undefined,
            reportType: item.report_type || undefined,
          }));
        setItems(cartItems);
        setLocalCart(cartItems);
      } else {
        // DB has no items — if local storage has items, sync them to DB instead of wiping them
        const local = getLocalCart();
        if (local.length > 0) {
          setItems(local);
          syncItemsToSupabase(local, user.id).catch(console.error);
        } else {
          setItems([]);
          setLocalCart([]);
        }
      }
    } catch (err) {
      console.error("Error loading cart:", err);
      toast.error("Network error while loading cart.");
    } finally {
      setIsLoading(false);
      isInitialized.current = true;
    }
  }, [user]);

  // Sync items to Supabase safely (Delete first, then insert)
  const syncItemsToSupabase = async (cartItems: CartItem[], userId: string) => {
    try {
      // Always delete all existing cart items for user first
      await supabase.from("cart_items").delete().eq("user_id", userId);

      if (cartItems.length === 0) {
        return; // Cart cleared, nothing to insert
      }

      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      let cartItemsToInsert = cartItems.map((item): Omit<CartItemDBRow, "id" | "created_at"> => ({
        user_id: userId,
        test_id: item.kind === "test" && isUuid(item.id) ? item.id : null,
        package_id: item.kind === "package" && isUuid(item.id) ? item.id : null,
        test_name: item.name,
        price: item.price,
        lab_id: item.labId && isUuid(item.labId) ? item.labId : null,
        lab_name: item.labName || null,
        quantity: item.quantity,
        availability_type: item.availabilityType || null,
        available_days: item.availableDays || null,
        sample_type: item.sampleType || null,
        preparation_required: item.preparationRequired ?? null,
        preparation_instruction: item.preparationInstruction || null,
        fasting_required: item.fastingRequired ?? null,
        fasting_instruction: item.fastingInstruction || null,
        report_type: item.reportType || null,
      } as any));

      let { error } = await supabase
        .from("cart_items")
        .insert(cartItemsToInsert);

      // Handle mock data foreign key violations
      if (error && error.message?.includes("cart_items_test_id_fkey")) {
        cartItemsToInsert = cartItemsToInsert.map(item => ({ ...item, test_id: null }));
        const retry = await supabase.from("cart_items").insert(cartItemsToInsert);
        error = retry.error;
      }
      if (error && error.message?.includes("cart_items_package_id_fkey")) {
        cartItemsToInsert = cartItemsToInsert.map(item => ({ ...item, package_id: null }));
        const retry = await supabase.from("cart_items").insert(cartItemsToInsert);
        error = retry.error;
      }
      if (error && error.message?.includes("cart_items_lab_id_fkey")) {
        cartItemsToInsert = cartItemsToInsert.map(item => ({ ...item, lab_id: null }));
        const retry = await supabase.from("cart_items").insert(cartItemsToInsert);
        error = retry.error;
      }

      if (error) {
        console.error("Error syncing cart (insert failed):", error);
        toast.error(`Failed to save items: ${error.message || error.details || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error syncing cart:", err);
      toast.error("Network error while syncing cart.");
    }
  };

  // Sync cart to Supabase when items change with queueing
  const syncCartToSupabase = useCallback(async (newItems: CartItem[]) => {
    if (!user || !isInitialized.current) return;

    if (isSyncing.current) {
      pendingSyncItems.current = newItems;
      return;
    }

    isSyncing.current = true;
    let itemsToSync: CartItem[] | null = newItems;
    
    while (itemsToSync) {
      pendingSyncItems.current = null;
      await syncItemsToSupabase(itemsToSync, user.id);
      itemsToSync = pendingSyncItems.current;
    }

    isSyncing.current = false;
  }, [user]);

  // Load cart on mount when user changes (guarded against unmount to prevent leaks/crashes)
  useEffect(() => {
    let isMounted = true;
    isInitialized.current = false;

    const run = async () => {
      await loadCartFromSupabase();
      if (!isMounted) {
        // Component unmounted before load finished — skip state updates
        isInitialized.current = false;
      }
    };
    run();

    return () => {
      isMounted = false;
      isSyncing.current = false;
    };
  }, [user, loadCartFromSupabase]);

  // Get current lab from cart items
  const currentLabId = items.length > 0 ? items[0].labId || null : null;
  const currentLabName = items.length > 0 ? items[0].labName || null : null;

  const hasItem = useCallback((testId: string, testName?: string) => {
    return items.some((i) => i.id === testId || (testName && i.name === testName));
  }, [items]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">): boolean => {
    if (import.meta.env.DEV) console.log("CartContext.addToCart called with:", item);

    // Prevent duplicate adds — same test cannot be added twice
    if (hasItem(item.id, item.name)) {
      toast.error("This test is already in your cart.");
      return false;
    }

    if (item.kind === "test") {
      const incomingType = normalizeAvailabilityType(item.availabilityType);
      if (incomingType === "SPECIALIZED" && normalizeAvailableDays(item.availableDays).length === 0) {
        toast.error("This specialized test has no valid booking days. Please contact the lab.");
        return false;
      }

      const existingTests = items.filter((existing) => existing.kind === "test");
      const existingTypes = existingTests.map((existing) => normalizeAvailabilityType(existing.availabilityType));
      if (existingTypes.some((type) => type !== incomingType)) {
        toast.error("General and Specialized tests cannot be booked together. Please create a separate booking.");
        return false;
      }

      if (incomingType === "SPECIALIZED") {
        const commonDays = getCommonSpecializedDays([...existingTests, item]);
        if (commonDays?.length === 0) {
          toast.error("These specialized tests do not have a common available day. Please book them separately.");
          return false;
        }
      }
    }

    const isServiceItem = (i: { id: string; labId?: string; name: string }) =>
      i.id.startsWith("doc-") || i.id.startsWith("physio-") || i.id.startsWith("ecg-") ||
      i.labId === "ecg-service" || i.labId === "physio-service" || i.labId === "doctor-service" ||
      i.name.includes(" with ");

    // If the cart already has items, and the user is trying to add an ECG, Doctor, or Physio service,
    // OR if the cart already has an ECG, Doctor, or Physio service and the user is trying to add anything else:
    if (items.length > 0 && (isServiceItem(item as any) || items.some((i) => isServiceItem(i as any)))) {
      setPendingItem({ item, existingLabName: items[0].name });
      return false;
    }

    // If there are items in cart and the existing cart is tied to a specific lab,
    // prevent adding an item from a different lab (or an item without labId)
    if (items.length > 0 && currentLabId && item.labId !== currentLabId) {
      setPendingItem({ item, existingLabName: currentLabName || "another lab" });
      return false;
    }

    setItems((prev) => {
      // Defensive guard inside setter as well (handles race conditions)
      if (prev.some((i) => i.id === item.id || (item.name && i.name === item.name))) return prev;
      const updated = [...prev, { ...item, quantity: 1 }];
      setLocalCart(updated);
      syncCartToSupabase(updated);
      impactMedium();
      return updated;
    });

    Analytics.trackAddToCart({ id: item.id, name: item.name, price: item.price, kind: item.kind });
    triggerHaptic('success');
    toast.success("Added to cart");
    return true;
  }, [items, currentLabId, currentLabName, hasItem, syncCartToSupabase]);

  const confirmReplace = useCallback((callback?: () => void) => {
    if (pendingItem) {
      const newItems = [{ ...pendingItem.item, quantity: 1 }];
      setItems(newItems);
      setLocalCart(newItems);
      syncCartToSupabase(newItems);
      setPendingItem(null);
      if (callback) callback();
    }
  }, [pendingItem, syncCartToSupabase]);

  const cancelReplace = useCallback(() => {
    setPendingItem(null);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      setLocalCart(updated);
      syncCartToSupabase(updated);
      impactLight();
      return updated;
    });
  }, [syncCartToSupabase, impactLight]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      );
      setLocalCart(updated);
      syncCartToSupabase(updated);
      return updated;
    });
  }, [syncCartToSupabase]);

  const updateFamilyMember = useCallback((id: string, familyMemberId: string | undefined) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, familyMemberId }
          : item
      );
      setLocalCart(updated);
      syncCartToSupabase(updated);
      return updated;
    });
  }, [syncCartToSupabase]);

  const updateLabForItems = useCallback((labId: string, labName: string, itemPrices?: Record<string, number>) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        const key = item.id;
        const newPrice = itemPrices && itemPrices[key] !== undefined ? itemPrices[key] : item.price;
        return {
          ...item,
          labId,
          labName,
          price: newPrice,
        };
      });
      setLocalCart(updated);
      syncCartToSupabase(updated);
      return updated;
    });
  }, [syncCartToSupabase]);

  const clearCart = useCallback(() => {
    setItems([]);
    setLocalCart([]);
    syncCartToSupabase([]);
  }, [syncCartToSupabase]);

  const replaceCart = useCallback((newItems: Omit<CartItem, "quantity">[]) => {
    const updated = newItems.map((item) => ({ ...item, quantity: 1 }));
    setItems(updated);
    setLocalCart(updated);
    // wait for next tick to bypass any isSyncing locks from previous clearCart if any
    setTimeout(() => {
      syncCartToSupabase(updated);
    }, 50);
  }, [syncCartToSupabase]);

  const validateFamilyMember = useCallback((activeMemberIds: string[]) => {
    setItems((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        if (item.familyMemberId && !activeMemberIds.includes(item.familyMemberId)) {
          changed = true;
          return { ...item, familyMemberId: undefined };
        }
        return item;
      });
      if (changed) {
        syncCartToSupabase(updated);
        return updated;
      }
      return prev;
    });
  }, [syncCartToSupabase]);

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    }),
    [items]
  );

  // Stable context value: consumers only re-render when cart state actually
  // changes, not when an ancestor provider (theme/auth) re-renders.
  const value = useMemo<CartContextType>(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateFamilyMember,
      updateLabForItems,
      clearCart,
      replaceCart,
      itemCount,
      subtotal,
      currentLabId,
      currentLabName,
      pendingItem,
      confirmReplace,
      cancelReplace,
      isLoading,
      validateFamilyMember,
      hasItem,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, itemCount, subtotal, currentLabId, currentLabName, pendingItem, isLoading, validateFamilyMember, hasItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    // Provide safe defaults when CartProvider is not present (useful for isolated tests)
    return {
      items: [],
      addToCart: () => false,
      removeFromCart: () => {},
      updateQuantity: () => {},
      updateFamilyMember: () => {},
      updateLabForItems: () => {},
      clearCart: () => {},
      replaceCart: () => {},
      itemCount: 0,
      subtotal: 0,
      currentLabId: null,
      currentLabName: null,
      pendingItem: null,
      confirmReplace: () => {},
      cancelReplace: () => {},
      isLoading: false,
      validateFamilyMember: () => {},
      hasItem: () => false,
    } as CartContextType;
  }
  return context;
};
