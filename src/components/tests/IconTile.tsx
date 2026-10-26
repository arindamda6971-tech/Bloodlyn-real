import type { LucideIcon } from "lucide-react";

/** Line icon on a faint brand-tinted square — the one icon style used across test screens. */
const IconTile = ({ icon: Icon, size = "md" }: { icon: LucideIcon; size?: "md" | "lg" }) => (
  <span
    className={`flex shrink-0 items-center justify-center bg-primary/[0.07] text-primary ${
      size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-lg"
    }`}
  >
    <Icon className={size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={1.75} />
  </span>
);

export default IconTile;
