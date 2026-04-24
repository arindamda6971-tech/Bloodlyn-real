import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CartItem {
  id: string;
  name: string;
  price: number;
  labId?: string;
  labName?: string;
  quantity: number;
  familyMemberId?: string;
}

export const useCartSync = (
  items: CartItem[],
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>
) => {
  const { user } = useAuth();
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);

  // Load cart from Supabase on mount
  const loadCartFromSupabase = useCallback(async () => {
    if (!user || isInitialized.current) return;
    
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading cart:", error);
        return;
      }

      if (data && data.length > 0) {
        const cartItems: CartItem[] = data.map((item) => ({
          id: item.test_id || item.package_id || item.id,
          name: item.test_name || "Unknown Test",
          price: item.price || 0,
          labId: item.lab_id || undefined,
          labName: item.lab_name || undefined,
          quantity: item.quantity || 1,
          familyMemberId: item.family_member_id || undefined,
        }));
        setItems(cartItems);
      }
      isInitialized.current = true;
    } catch (err) {
      console.error("Error loading cart:", err);
    }
  }, [user, setItems]);

  // Sync cart to Supabase when items change
  const syncCartToSupabase = useCallback(async () => {
    if (!user || !isInitialized.current || isSyncing.current) return;
    
    isSyncing.current = true;
    
    try {
      // Delete all existing cart items for this user
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      // Insert new items if any
      if (items.length > 0) {
        const cartItemsToInsert = items.map((item) => ({
          user_id: user.id,
          test_id: item.id.startsWith("ecg-") || item.id.startsWith("ai-") ? null : item.id,
          test_name: item.name,
          price: item.price,
          lab_id: item.labId || null,
          lab_name: item.labName || null,
          quantity: item.quantity,
          family_member_id: item.familyMemberId || null,
        }));

        const { error } = await supabase
          .from("cart_items")
          .insert(cartItemsToInsert);

        if (error) {
          console.error("Error syncing cart:", error);
        }
      }
    } catch (err) {
      console.error("Error syncing cart:", err);
    } finally {
      isSyncing.current = false;
    }
  }, [user, items]);

  // Load cart on mount when user is available (cleanup prevents stale writes after unmount)
  useEffect(() => {
    let isMounted = true;
    if (user && !isInitialized.current) {
      loadCartFromSupabase().then(() => {
        if (!isMounted) isInitialized.current = false;
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user, loadCartFromSupabase]);

  // Sync cart whenever items change (after initialization)
  useEffect(() => {
    let isMounted = true;
    if (isInitialized.current && user && isMounted) {
      syncCartToSupabase();
    }
    return () => {
      isMounted = false;
    };
  }, [items, syncCartToSupabase, user]);

  // Reset on user change
  useEffect(() => {
    if (!user) {
      isInitialized.current = false;
      isSyncing.current = false;
    }
  }, [user]);

  return { loadCartFromSupabase, syncCartToSupabase };
};
