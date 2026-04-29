import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
}

/**
 * Lightweight SEO helper — sets <title>, meta description, and canonical
 * without adding a dependency. Restores prior values on unmount.
 */
export function useSEO({ title, description, canonical }: SEOProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title.length > 60 ? title.slice(0, 57) + "..." : title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      return () => {
        if (prev !== null) el!.setAttribute("content", prev);
      };
    };

    const setCanonical = (href: string) => {
      let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("href");
      el.setAttribute("href", href);
      return () => {
        if (prev !== null) el!.setAttribute("href", prev);
      };
    };

    const restorers: Array<() => void> = [];
    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
      restorers.push(setMeta("description", desc));
    }
    if (canonical) {
      restorers.push(setCanonical(canonical));
    } else if (typeof window !== "undefined") {
      restorers.push(setCanonical(window.location.origin + window.location.pathname));
    }

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, canonical]);
}
