import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/utils/haptics";
import { toast } from "sonner";

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
}

interface PendingItem {
  item: Omit<CartItem, "quantity">;
  existingLabName: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateFamilyMember: (id: string, familyMemberId: string | undefined) => void;
  updateLabForItems: (labId: string, labName: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  currentLabId: string | null;
  currentLabName: string | null;
  pendingItem: PendingItem | null;
  confirmReplace: () => void;
  cancelReplace: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);

  // Load cart from Supabase
  const loadCartFromSupabase = useCallback(async () => {
    if (!user) {
      // For non-logged-in users, start with empty cart (no sessionStorage restore)
      setItems([]);
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
        setItems([]);
      } else if (data && data.length > 0) {
        const cartItems: CartItem[] = data
          .filter((item) => item.test_name && item.test_name.trim() !== "" && (Number(item.price) || 0) > 0)
          .map((item) => ({
            id: item.test_id || item.package_id || item.id,
            name: item.test_name!,
            price: Number(item.price) || 0,
            labId: item.lab_id || undefined,
            labName: item.lab_name || undefined,
            vendorId: (item as any).vendor_id || undefined,
            quantity: item.quantity || 1,
            familyMemberId: item.family_member_id || undefined,
          }));
        setItems(cartItems);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Error loading cart:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
      isInitialized.current = true;
    }
  }, [user]);

  // Sync items to Supabase
  const syncItemsToSupabase = async (cartItems: CartItem[], userId: string) => {
    try {
      // Delete all existing cart items for this user
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      // Insert new items if any
      if (cartItems.length > 0) {
        const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const cartItemsToInsert = cartItems.map((item) => ({
          user_id: userId,
          // Always null test_id to avoid FK constraint issues with bridge/external test IDs
          test_id: null,
          test_name: item.name,
          price: item.price,
          lab_id: item.labId && isUuid(item.labId) ? item.labId : null,
          lab_name: item.labName || null,
          quantity: item.quantity,
          family_member_id: item.familyMemberId || null,
        } as any));

        const { error } = await supabase
          .from("cart_items")
          .insert(cartItemsToInsert);

        if (error) {
          console.error("Error syncing cart:", error);
        }
      }
    } catch (err) {
      console.error("Error syncing cart:", err);
    }
  };

  // Sync cart to Supabase when items change
  const syncCartToSupabase = useCallback(async (newItems: CartItem[]) => {
    if (!user || !isInitialized.current || isSyncing.current) return;

    isSyncing.current = true;
    await syncItemsToSupabase(newItems, user.id);
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

  const addToCart = (item: Omit<CartItem, "quantity">): boolean => {
    if (import.meta.env.DEV) console.log("CartContext.addToCart called with:", item);
    triggerHaptic('light');

    // Prevent duplicate adds — same test cannot be added twice
    if (items.some((i) => i.id === item.id)) {
      toast.error("This test is already in your cart.");
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
      if (prev.some((i) => i.id === item.id)) return prev;
      const updated = [...prev, { ...item, quantity: 1 }];
      syncCartToSupabase(updated);
      return updated;
    });
    return true;
  };

  const confirmReplace = () => {
    if (pendingItem) {
      const newItems = [{ ...pendingItem.item, quantity: 1 }];
      setItems(newItems);
      syncCartToSupabase(newItems);
      setPendingItem(null);
    }
  };

  const cancelReplace = () => {
    setPendingItem(null);
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      syncCartToSupabase(updated);
      return updated;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      );
      syncCartToSupabase(updated);
      return updated;
    });
  };

  const updateFamilyMember = (id: string, familyMemberId: string | undefined) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, familyMemberId }
          : item
      );
      syncCartToSupabase(updated);
      return updated;
    });
  };

  const updateLabForItems = (labId: string, labName: string) => {
    setItems((prev) => {
      const updated = prev.map((item) => ({
        ...item,
        labId,
        labName,
      }));
      syncCartToSupabase(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    syncCartToSupabase([]);
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ 
        items, 
        addToCart, 
        removeFromCart, 
        updateQuantity, 
        updateFamilyMember, 
        updateLabForItems,
        clearCart, 
        itemCount, 
        subtotal,
        currentLabId,
        currentLabName,
        pendingItem,
        confirmReplace,
        cancelReplace,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
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
      itemCount: 0,
      subtotal: 0,
      currentLabId: null,
      currentLabName: null,
      pendingItem: null,
      confirmReplace: () => {},
      cancelReplace: () => {},
      isLoading: false,
    } as CartContextType;
  }
  return context;
};
