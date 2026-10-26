import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import type { CatalogueTest } from "@/hooks/useTestCatalogue";
import { useLabPicker } from "./useLabPicker";

/**
 * Open / add handlers shared by every test list, stable across renders.
 * "Add" goes through the same "Select a Lab" sheet as the test page: a test only
 * enters the cart with a lab that offers it, at that lab's price.
 * Render `labSheet` once in the screen.
 */
export function useTestListActions() {
  const navigate = useNavigate();
  const { hasItem } = useCart();
  const labPicker = useLabPicker();
  const openLabPicker = labPicker.open;

  const onOpen = useCallback(
    (test: CatalogueTest) => navigate(`/test/${test.id}`, { state: { bridgeTest: test } }),
    [navigate],
  );

  const onAdd = useCallback(
    (test: CatalogueTest) =>
      openLabPicker({
        id: test.id,
        name: test.test_name,
        price: test.price > 0 ? test.price : test.collection_fee || 0,
        category: test.category,
      }),
    [openLabPicker],
  );

  const onOpenCart = useCallback(() => navigate("/cart"), [navigate]);

  const isInCart = useCallback((test: CatalogueTest) => hasItem(test.id, test.test_name), [hasItem]);

  return { onOpen, onAdd, onOpenCart, isInCart, labSheet: labPicker.sheet };
}
