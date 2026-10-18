import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppOpeningAnimationProps {
  onComplete?: () => void;
  durationMs?: number;
}

/**
 * Premium native-feeling App Opening Animation.
 * Smoothly displays the brand emblem, heartbeat glow, and tagline,
 * then gently dissolves to reveal the app screen seamlessly.
 */
export const AppOpeningAnimation: React.FC<AppOpeningAnimationProps> = ({
  onComplete,
  durationMs = 1300,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    // Smooth, lightweight progress
    const progressTimer = setTimeout(() => {
      setProgress(100);
    }, 100);

    // Trigger smooth fade exit before complete
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
    }, durationMs - 350);

    // Call onComplete when fully dissolved
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, durationMs);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-opening-splash"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.02,
            transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } 
          }}
          style={{ willChange: "opacity, transform" }}
          className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-between py-16 px-6 w-full md:max-w-[430px] mx-auto select-none pointer-events-auto"
        >
          {/* Subtle Ambient Radial Glow (Pure CSS Gradient - 0 GPU blur penalty) */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 46%, rgba(2, 132, 199, 0.04) 0%, rgba(239, 68, 68, 0.02) 40%, rgba(255, 255, 255, 0) 70%)"
            }}
          />

          {/* Top spacer for optical balance */}
          <div className="w-full h-8" />

          {/* Central Official Brand Emblem & Typography */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            <div className="relative flex items-center justify-center mb-6">
              {/* Soft Ambient Light Bloom (Pure CSS radial gradient - zero filter lag) */}
              <div
                className="absolute w-44 h-44 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(239, 68, 68, 0.08) 50%, transparent 70%)"
                }}
              />

              {/* Seamless Transparent Brand Emblem */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.45, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                style={{ willChange: "transform, opacity" }}
                className="relative flex items-center justify-center"
              >
                <img
                  src="/logo.png"
                  alt="BloodLyn"
                  width={112}
                  height={112}
                  className="w-28 h-28 object-contain select-none"
                  style={{
                    filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))",
                    transform: "translateZ(0)"
                  }}
                />
              </motion.div>
            </div>

            {/* Brand Title: BloodLyn */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: 0.15, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              style={{ willChange: "transform, opacity" }}
              className="text-center"
            >
              <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none">
                Blood<span className="text-[#0284c7]">Lyn</span>
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: 0.25, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              style={{ willChange: "transform, opacity" }}
              className="mt-2"
            >
              <p className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">
                Diagnostics. Faster. Smarter.
              </p>
            </motion.div>
          </div>

          {/* Bottom Footer / Companion Info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Sleek minimal pulse loader */}
            <div className="w-28 h-[3px] bg-slate-100 rounded-full overflow-hidden relative mb-2.5">
              <motion.div
                className="h-full bg-gradient-to-r from-[#38bdf8] to-[#0284c7] rounded-full"
                initial={{ width: "15%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              NABL Certified Diagnostic Network
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppOpeningAnimation;
