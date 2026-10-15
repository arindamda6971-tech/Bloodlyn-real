import React, { useState, useEffect, useRef } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  containerClassName?: string;
}

const loadedImageUrls = new Set<string>();

/**
 * A native-performance optimized image component.
 * 1. Tracks globally loaded image URLs to eliminate flash on re-mounts.
 * 2. Uses ref check for complete cached images to avoid state updates during transitions.
 * 3. Replaces Framer Motion with lightweight CSS placeholder.
 */
const OptimizedImage = ({
  src,
  alt,
  className = "",
  containerClassName = "",
  loading = "lazy",
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(() => Boolean(src && loadedImageUrls.has(src)));
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;
    if (loadedImageUrls.has(src)) {
      setIsLoaded(true);
      return;
    }
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      loadedImageUrls.add(src);
      setIsLoaded(true);
    }
  }, [src]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (src) {
      loadedImageUrls.add(src);
    }
    setIsLoaded(true);
    props.onLoad?.(e);
  };

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse pointer-events-none" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={handleLoad}
        className={`transition-opacity duration-300 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
