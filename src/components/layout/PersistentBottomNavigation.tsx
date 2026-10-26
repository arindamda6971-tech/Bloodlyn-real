import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import { getTransitionDuration, hasPersistentBottomNav } from "@/lib/navigation-transition";

// Page layers sit at z 1 (outgoing on push / incoming on pop) and z 10 (the top one).
const ABOVE_PAGES = 50;
const BETWEEN_PAGES = 5;

/**
 * The one bottom bar for the whole app, rendered outside the sliding page layers.
 *
 * Between two screens that both have the bar it stays on top and never moves.
 * When only one side has it, it sits between the two layers for the length of the
 * slide, so the screen without a bar slides over it (push) or off it (pop), exactly
 * like a native tab bar, and then settles on top or disappears.
 */
const PersistentBottomNavigation = () => {
  const { pathname, key } = useLocation();
  const wanted = hasPersistentBottomNav(pathname);
  const [settled, setSettled] = useState({ key, wanted });

  useEffect(() => {
    if (settled.key === key) return;
    const timer = setTimeout(() => setSettled({ key, wanted }), getTransitionDuration() + 40);
    return () => clearTimeout(timer);
  }, [key, wanted, settled.key]);

  if (!wanted && !settled.wanted) return null;

  return <BottomNavigation zIndex={wanted && settled.wanted ? ABOVE_PAGES : BETWEEN_PAGES} />;
};

export default PersistentBottomNavigation;
