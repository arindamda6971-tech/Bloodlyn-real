import { createContext } from "react";

/**
 * Pins the path a screen belongs to. Home stays mounted outside <Routes>, so its
 * useLocation() follows whatever screen is on top; this keeps it reading "/home".
 */
export const ScreenPathContext = createContext<string | null>(null);
