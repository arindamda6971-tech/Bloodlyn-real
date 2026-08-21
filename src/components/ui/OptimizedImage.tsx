import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  containerClassName?: string;
}

/**
 * A native-performance optimized image component.
 * 1. Uses async decoding to prevent main-thread jank.
 * 2. Implements a smooth "blur-up" or fade-in transition.
 * 3. Supports lazy loading by default.
 */
const OptimizedImage = ({
  src,
  alt,
  className = "",
  containerClassName = "",
  loading = "lazy",
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-muted animate-pulse"
          />
        )}
      </AnimatePresence>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-500 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
