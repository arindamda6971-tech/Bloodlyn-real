import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BannerGraphic from "@/components/BannerGraphic";

const defaultTaglines = [
  "Get your health checked today!",
  "Comprehensive checkup packages available",
  "Heart health matters — book now",
  "Accurate lab tests at your doorstep",
];

interface Props {
  categories: { name: string; slug: string; tests: number }[];
}

const DoctorAdCarousel = ({ categories }: Props) => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  // Build slides dynamically from categories so new categories auto-appear
  const slides = categories.length > 0
    ? categories.slice(0, 8).map((cat, i) => ({
        variant: i,
        title: cat.name,
        subtitle: `${cat.tests} tests available`,
        slug: cat.slug,
        tagline: defaultTaglines[i % defaultTaglines.length],
      }))
    : defaultTaglines.map((t, i) => ({
        variant: i,
        title: "Health Tests",
        subtitle: "Browse all categories",
        slug: "",
        tagline: t,
      }));

  const total = slides.length;

  const next = useCallback(() => setCurrent((p) => (p + 1) % total), [total]);

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(next, 2000);
    return () => clearInterval(id);
  }, [next, total]);

  const handleClick = (slug: string) => {
    if (slug) {
      navigate(`/category-tests?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(slides[current].title)}`);
    } else {
      navigate("/categories");
    }
  };

  return (
    <div
      className="relative w-full h-40 rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => handleClick(slides[current].slug)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <BannerGraphic
            variant={slides[current].variant}
            className="absolute inset-0 w-full h-full"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          {/* Text */}
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <span className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">
              Recommended
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">
              {slides[current].title}
            </h3>
            <p className="text-xs text-white/90 mt-1">{slides[current].tagline}</p>
            <span className="mt-2 text-[10px] bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full w-fit">
              {slides[current].subtitle} →
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "bg-white w-4" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorAdCarousel;
