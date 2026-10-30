import {
  Activity,
  Droplet,
  FlaskConical,
  HeartPulse,
  Pill,
  Sparkles,
  Thermometer,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface CategoryVisual {
  icon: LucideIcon;
  /** Soft background behind the icon and card header. */
  tint: string;
  /** Icon and accent text colour. */
  accent: string;
}

const VISUALS: Record<string, CategoryVisual> = {
  full_body: { icon: Activity, tint: "from-sky-100 to-blue-50", accent: "text-blue-600" },
  diabetes: { icon: Droplet, tint: "from-rose-100 to-pink-50", accent: "text-rose-600" },
  heart: { icon: HeartPulse, tint: "from-red-100 to-rose-50", accent: "text-red-600" },
  thyroid: { icon: Sparkles, tint: "from-violet-100 to-purple-50", accent: "text-violet-600" },
  women: { icon: UserRound, tint: "from-pink-100 to-fuchsia-50", accent: "text-pink-600" },
  men: { icon: User, tint: "from-cyan-100 to-sky-50", accent: "text-cyan-700" },
  senior: { icon: Users, tint: "from-amber-100 to-orange-50", accent: "text-amber-700" },
  vitamins: { icon: Pill, tint: "from-orange-100 to-amber-50", accent: "text-orange-600" },
  fever: { icon: Thermometer, tint: "from-teal-100 to-emerald-50", accent: "text-teal-700" },
  liver_kidney: { icon: FlaskConical, tint: "from-lime-100 to-green-50", accent: "text-green-700" },
};

const DEFAULT_VISUAL: CategoryVisual = { icon: FlaskConical, tint: "from-slate-100 to-slate-50", accent: "text-primary" };

/** Icon and colours for a package category, so each kind of checkup is recognisable at a glance. */
export const categoryVisual = (category: string | null): CategoryVisual =>
  (category && VISUALS[category]) || DEFAULT_VISUAL;
