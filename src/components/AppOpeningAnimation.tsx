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
  durationMs = 1800,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth progress animation from 15% to 100%
    const progressTimer = setTimeout(() => {
      setProgress(100);
    }, 150);

    // Trigger exit transition before complete
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
    }, durationMs - 400);

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
            scale: 1.04,
            filter: "blur(4px)",
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } 
          }}
          className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-between py-16 px-6 w-full md:max-w-[430px] mx-auto select-none pointer-events-auto"
        >
          {/* Subtle Ambient Radial Glow */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 46%, rgba(2, 132, 199, 0.05) 0%, rgba(239, 68, 68, 0.03) 35%, rgba(255, 255, 255, 0) 70%)"
            }}
          />

          {/* Top spacer for optical balance */}
          <div className="w-full h-8" />

          {/* Central Official Brand Emblem & Typography */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            <div className="relative flex items-center justify-center mb-7">
              {/* Soft Ambient Light Bloom behind the transparent emblem */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ 
                  scale: [0.95, 1.1, 0.95],
                  opacity: [0.45, 0.25, 0.45] 
                }}
                transition={{ 
                  duration: 2.4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-[#38bdf8]/20 via-[#ef4444]/15 to-transparent blur-2xl pointer-events-none"
              />

              {/* Seamless Transparent Brand Emblem */}
              <motion.div
                initial={{ scale: 0.75, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.65, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                className="relative flex items-center justify-center"
              >
                <motion.img
                  src="/logo.png"
                  alt="BloodLyn"
                  className="w-32 h-32 object-contain select-none"
                  style={{
                    filter: "drop-shadow(0 14px 28px rgba(220, 38, 38, 0.12)) drop-shadow(0 4px 10px rgba(2, 132, 199, 0.08))"
                  }}
                  animate={{ 
                    scale: [1, 1.025, 1] 
                  }}
                  transition={{ 
                    duration: 2.2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: 0.4 
                  }}
                />
              </motion.div>
            </div>

            {/* Brand Title: BloodLyn */}
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 0.55, 
                delay: 0.25, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="text-center"
            >
              <h1 className="text-[34px] font-black text-slate-900 tracking-tight leading-none">
                Blood<span className="text-[#0284c7]">Lyn</span>
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 0.55, 
                delay: 0.38, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="mt-2.5"
            >
              <p className="text-[12px] font-semibold text-slate-400 tracking-[0.2em] uppercase">
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
